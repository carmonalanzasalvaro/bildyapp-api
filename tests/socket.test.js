import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import request from 'supertest';
import { io as createSocketClient } from 'socket.io-client';

jest.setTimeout(30000);

const storageServiceMock = {
  uploadBuffer: jest.fn(),
  getFileUrl: jest.fn(),
  getSignedUrl: jest.fn()
};

await jest.unstable_mockModule('../src/services/storage.service.js', () => ({
  storageService: storageServiceMock,
  default: storageServiceMock
}));

let startServer;
let stopServer;
let User;
let mailService;
let resetMailTransport;
let signatureImageBuffer;

let server;
let baseUrl;

const buildClientPayload = (overrides = {}) => ({
  name: 'ACME Corp',
  cif: 'B12345678',
  email: 'contacto@acme.test',
  phone: '600123123',
  address: {
    street: 'Gran Vía',
    number: '10',
    postal: '28013',
    city: 'Madrid',
    province: 'Madrid'
  },
  ...overrides
});

const buildProjectPayload = (clientId, overrides = {}) => ({
  client: clientId,
  name: 'Reforma integral',
  projectCode: 'PRJ-001',
  address: {
    street: 'Alcalá',
    number: '25',
    postal: '28014',
    city: 'Madrid',
    province: 'Madrid'
  },
  email: 'obra@acme.test',
  notes: 'Notas del proyecto',
  active: true,
  ...overrides
});

const buildDeliveryNotePayload = (clientId, projectId, overrides = {}) => ({
  client: clientId,
  project: projectId,
  format: 'material',
  description: 'Entrega de ladrillos',
  workDate: '2025-04-10T00:00:00.000Z',
  material: 'Ladrillo',
  quantity: 120,
  unit: 'uds',
  ...overrides
});

const waitForSocketEvent = (socket, eventName) => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    socket.off(eventName, handleEvent);
    reject(new Error(`Timed out waiting for '${eventName}'`));
  }, 2000);

  const handleEvent = (payload) => {
    clearTimeout(timeout);
    resolve(payload);
  };

  socket.once(eventName, handleEvent);
});

const expectNoSocketEvent = (socket, eventName, waitMs = 300) => new Promise((resolve, reject) => {
  const handleEvent = (payload) => {
    clearTimeout(timeout);
    reject(new Error(`Unexpected '${eventName}' event: ${JSON.stringify(payload)}`));
  };

  const timeout = setTimeout(() => {
    socket.off(eventName, handleEvent);
    resolve();
  }, waitMs);

  socket.once(eventName, handleEvent);
});

const connectSocket = (token) => new Promise((resolve, reject) => {
  const socket = createSocketClient(baseUrl, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    auth: token ? { token } : undefined
  });

  socket.once('connect', () => resolve(socket));
  socket.once('connect_error', (error) => {
    socket.close();
    reject(error);
  });
});

const createAuthenticatedCompanyUser = async ({
  email,
  companyName,
  companyCif,
  companyAddress
}) => {
  jest.spyOn(mailService, 'sendVerificationEmail').mockResolvedValue({ messageId: 'mocked-message' });

  const password = 'secreta123';
  const api = request(server);

  const registerResponse = await api
    .post('/api/user/register')
    .send({ email, password });

  expect(registerResponse.statusCode).toBe(201);

  const createdUser = await User.findOne({ email }).select('+password');

  const validationResponse = await api
    .put('/api/user/validation')
    .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
    .send({ code: createdUser.verification.code });

  expect(validationResponse.statusCode).toBe(200);

  const loginResponse = await api
    .post('/api/user/login')
    .send({ email, password });

  expect(loginResponse.statusCode).toBe(200);

  const profileResponse = await api
    .put('/api/user/register')
    .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
    .send({
      name: 'Ada',
      lastName: 'Lovelace',
      nif: `${companyCif}Z`,
      address: 'Calle Principal 1'
    });

  expect(profileResponse.statusCode).toBe(200);

  const companyResponse = await api
    .patch('/api/user/company')
    .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
    .send({
      name: companyName,
      cif: companyCif,
      address: companyAddress,
      isFreelance: false
    });

  expect(companyResponse.statusCode).toBe(200);

  return {
    token: loginResponse.body.accessToken,
    user: companyResponse.body.user
  };
};

beforeAll(async () => {
  process.env.MONGODB_URI = mongoose.connection.client?.s?.url || process.env.MONGODB_URI;

  const indexModule = await import('../src/index.js');
  const userModule = await import('../src/models/User.js');
  const mailModule = await import('../src/services/mail.service.js');
  const sharpModule = await import('sharp');

  startServer = indexModule.startServer;
  stopServer = indexModule.stopServer;
  User = userModule.default;
  mailService = mailModule.mailService;
  resetMailTransport = mailModule.resetMailTransport;
  signatureImageBuffer = await sharpModule.default({
    create: {
      width: 64,
      height: 24,
      channels: 4,
      background: {
        r: 10,
        g: 10,
        b: 10,
        alpha: 1
      }
    }
  }).png().toBuffer();

  server = await startServer({ port: 0 });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

afterEach(() => {
  jest.restoreAllMocks();
  resetMailTransport();
  storageServiceMock.uploadBuffer.mockReset();
  storageServiceMock.getFileUrl.mockReset();
  storageServiceMock.getSignedUrl.mockReset();
});

afterAll(async () => {
  await stopServer();
});

describe('Socket.IO company events', () => {
  test('rejects socket without token', async () => {
    await expect(connectSocket()).rejects.toMatchObject({
      message: 'Token no proporcionado',
      data: {
        code: 'NO_TOKEN',
        statusCode: 401
      }
    });
  });

  test('joins company room and only same company receives domain events', async () => {
    const ownerA = await createAuthenticatedCompanyUser({
      email: 'socket-owner-a@example.com',
      companyName: 'Socket Company A',
      companyCif: 'A52345678',
      companyAddress: 'Calle Empresa A'
    });

    const ownerB = await createAuthenticatedCompanyUser({
      email: 'socket-owner-b@example.com',
      companyName: 'Socket Company B',
      companyCif: 'A52345679',
      companyAddress: 'Calle Empresa B'
    });

    const socketA = await connectSocket(ownerA.token);
    const socketB = await connectSocket(ownerB.token);
    const api = request(server);

    try {
      const nextClientEvent = waitForSocketEvent(socketA, 'client:new');
      const noClientEventForOtherCompany = expectNoSocketEvent(socketB, 'client:new');

      const clientResponse = await api
        .post('/api/client')
        .set('Authorization', `Bearer ${ownerA.token}`)
        .send(buildClientPayload());

      expect(clientResponse.statusCode).toBe(201);

      const clientEvent = await nextClientEvent;
      await noClientEventForOtherCompany;

      expect(clientEvent).toMatchObject({
        id: clientResponse.body.client._id,
        company: ownerA.user.company._id,
        createdAt: clientResponse.body.client.createdAt,
        name: clientResponse.body.client.name
      });

      const nextProjectEvent = waitForSocketEvent(socketA, 'project:new');
      const noProjectEventForOtherCompany = expectNoSocketEvent(socketB, 'project:new');

      const projectResponse = await api
        .post('/api/project')
        .set('Authorization', `Bearer ${ownerA.token}`)
        .send(buildProjectPayload(clientResponse.body.client._id));

      expect(projectResponse.statusCode).toBe(201);

      const projectEvent = await nextProjectEvent;
      await noProjectEventForOtherCompany;

      expect(projectEvent).toMatchObject({
        id: projectResponse.body.project._id,
        company: ownerA.user.company._id,
        createdAt: projectResponse.body.project.createdAt,
        name: projectResponse.body.project.name,
        projectCode: projectResponse.body.project.projectCode
      });

      const nextDeliveryNoteEvent = waitForSocketEvent(socketA, 'deliverynote:new');
      const noDeliveryNoteEventForOtherCompany = expectNoSocketEvent(socketB, 'deliverynote:new');

      const deliveryNoteResponse = await api
        .post('/api/deliverynote')
        .set('Authorization', `Bearer ${ownerA.token}`)
        .send(buildDeliveryNotePayload(clientResponse.body.client._id, projectResponse.body.project._id));

      expect(deliveryNoteResponse.statusCode).toBe(201);

      const deliveryNoteEvent = await nextDeliveryNoteEvent;
      await noDeliveryNoteEventForOtherCompany;

      expect(deliveryNoteEvent).toMatchObject({
        id: deliveryNoteResponse.body.deliveryNote._id,
        company: ownerA.user.company._id,
        createdAt: deliveryNoteResponse.body.deliveryNote.createdAt,
        format: deliveryNoteResponse.body.deliveryNote.format,
        signed: false
      });

      storageServiceMock.uploadBuffer
        .mockResolvedValueOnce({
          key: 'signatures/signature.webp',
          url: 'https://storage.test/signatures/signature.webp'
        })
        .mockResolvedValueOnce({
          key: 'pdf/delivery-note.pdf',
          url: 'https://storage.test/pdf/delivery-note.pdf'
        });

      const nextSignedEvent = waitForSocketEvent(socketA, 'deliverynote:signed');
      const noSignedEventForOtherCompany = expectNoSocketEvent(socketB, 'deliverynote:signed');

      const signResponse = await api
        .patch(`/api/deliverynote/${deliveryNoteResponse.body.deliveryNote._id}/sign`)
        .set('Authorization', `Bearer ${ownerA.token}`)
        .attach('signature', signatureImageBuffer, {
          filename: 'signature.png',
          contentType: 'image/png'
        });

      expect(signResponse.statusCode).toBe(200);

      const signedEvent = await nextSignedEvent;
      await noSignedEventForOtherCompany;

      expect(signedEvent).toMatchObject({
        id: deliveryNoteResponse.body.deliveryNote._id,
        company: ownerA.user.company._id,
        createdAt: deliveryNoteResponse.body.deliveryNote.createdAt,
        format: deliveryNoteResponse.body.deliveryNote.format,
        signed: true,
        signedAt: signResponse.body.deliveryNote.signedAt
      });
    } finally {
      socketA.close();
      socketB.close();
    }
  });
});

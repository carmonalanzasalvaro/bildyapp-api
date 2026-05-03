import { jest } from '@jest/globals';
import request from 'supertest';

const storageServiceMock = {
  uploadBuffer: jest.fn(),
  getFileUrl: jest.fn(),
  getSignedUrl: jest.fn()
};

jest.unstable_mockModule('../src/services/storage.service.js', () => ({
  storageService: storageServiceMock,
  default: storageServiceMock
}));

let app;
let User;
let Company;
let Client;
let Project;
let DeliveryNote;
let generateAccessToken;
let signatureImageBuffer;
let sequence = 0;

const binaryParser = (res, callback) => {
  res.setEncoding('binary');
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    callback(null, Buffer.from(data, 'binary'));
  });
};

const nextValue = (prefix) => {
  sequence += 1;
  return `${prefix}-${sequence}`;
};

const createAuthenticatedContext = async () => {
  const user = await User.create({
    name: 'Ada',
    lastName: 'Lovelace',
    nif: nextValue('NIF'),
    address: 'Calle Principal 1',
    email: `${nextValue('user')}@example.com`,
    password: 'hashed-password',
    status: 'verified',
    role: 'admin',
    verification: {
      code: '123456',
      attempts: 3
    }
  });

  const company = await Company.create({
    owner: user._id,
    name: `Company ${sequence}`,
    cif: `A${String(10000000 + sequence).padStart(8, '0')}`,
    address: `Calle Empresa ${sequence}`,
    isFreelance: false
  });

  user.company = company._id;
  await user.save();

  const client = await Client.create({
    user: user._id,
    company: company._id,
    name: `Client ${sequence}`,
    cif: `B${String(10000000 + sequence).padStart(8, '0')}`,
    email: `${nextValue('client')}@example.com`,
    address: {
      street: 'Gran Vía',
      number: '10',
      postal: '28013',
      city: 'Madrid',
      province: 'Madrid'
    }
  });

  const project = await Project.create({
    user: user._id,
    company: company._id,
    client: client._id,
    name: `Project ${sequence}`,
    projectCode: `PRJ-${sequence}`,
    address: {
      street: 'Alcalá',
      number: '25',
      postal: '28014',
      city: 'Madrid',
      province: 'Madrid'
    },
    email: `${nextValue('project')}@example.com`,
    active: true
  });

  const token = generateAccessToken({
    _id: user._id,
    role: user.role,
    company: company._id
  });

  return {
    token,
    user,
    company,
    client,
    project
  };
};

const createDeliveryNote = async ({ user, company, client, project }, overrides = {}) => {
  return DeliveryNote.create({
    user: user._id,
    company: company._id,
    client: client._id,
    project: project._id,
    format: 'material',
    description: 'Entrega de material',
    workDate: new Date('2025-06-10T00:00:00.000Z'),
    material: 'Ladrillo',
    quantity: 15,
    unit: 'uds',
    hours: null,
    workers: [],
    signed: false,
    signedAt: null,
    signatureUrl: null,
    pdfUrl: null,
    deleted: false,
    ...overrides
  });
};

beforeAll(async () => {
  const appModule = await import('../src/app.js');
  const sharpModule = await import('sharp');
  const userModule = await import('../src/models/User.js');
  const companyModule = await import('../src/models/Company.js');
  const clientModule = await import('../src/models/Client.js');
  const projectModule = await import('../src/models/Project.js');
  const deliveryNoteModule = await import('../src/models/DeliveryNote.js');
  const jwtModule = await import('../src/utils/jwt.js');

  app = appModule.default;
  User = userModule.default;
  Company = companyModule.default;
  Client = clientModule.default;
  Project = projectModule.default;
  DeliveryNote = deliveryNoteModule.default;
  generateAccessToken = jwtModule.generateAccessToken;
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
});

afterEach(() => {
  jest.restoreAllMocks();
  storageServiceMock.uploadBuffer.mockReset();
  storageServiceMock.getFileUrl.mockReset();
  storageServiceMock.getSignedUrl.mockReset();
});

describe('Delivery note signing and PDF endpoints', () => {
  test('signs note and uploads signature and pdf', async () => {
    const context = await createAuthenticatedContext();
    const deliveryNote = await createDeliveryNote(context);

    storageServiceMock.uploadBuffer
      .mockResolvedValueOnce({
        key: 'signatures/signature.webp',
        url: 'https://storage.test/signatures/signature.webp'
      })
      .mockResolvedValueOnce({
        key: 'pdf/delivery-note.pdf',
        url: 'https://storage.test/pdf/delivery-note.pdf'
      });

    const response = await request(app)
      .patch(`/api/deliverynote/${deliveryNote._id}/sign`)
      .set('Authorization', `Bearer ${context.token}`)
      .attach('signature', signatureImageBuffer, {
        filename: 'signature.png',
        contentType: 'image/png'
      });

    expect(response.statusCode).toBe(200);
    expect(storageServiceMock.uploadBuffer).toHaveBeenCalledTimes(2);
    expect(storageServiceMock.uploadBuffer.mock.calls[0][0]).toMatchObject({
      contentType: 'image/webp'
    });
    expect(storageServiceMock.uploadBuffer.mock.calls[1][0]).toMatchObject({
      contentType: 'application/pdf'
    });
    expect(storageServiceMock.uploadBuffer.mock.calls[1][0].buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(response.body.deliveryNote).toMatchObject({
      _id: deliveryNote._id.toString(),
      signed: true,
      signatureUrl: 'https://storage.test/signatures/signature.webp',
      pdfUrl: 'https://storage.test/pdf/delivery-note.pdf'
    });
    expect(response.body.deliveryNote.signedAt).toEqual(expect.any(String));

    const updatedDeliveryNote = await DeliveryNote.findById(deliveryNote._id);

    expect(updatedDeliveryNote).toMatchObject({
      signed: true,
      signatureUrl: 'https://storage.test/signatures/signature.webp',
      pdfUrl: 'https://storage.test/pdf/delivery-note.pdf'
    });
    expect(updatedDeliveryNote.signedAt).toBeInstanceOf(Date);
  });

  test('rejects signing already signed note', async () => {
    const context = await createAuthenticatedContext();
    const deliveryNote = await createDeliveryNote(context, {
      signed: true,
      signedAt: new Date('2025-06-10T12:00:00.000Z'),
      signatureUrl: 'https://storage.test/signatures/existing.webp',
      pdfUrl: 'https://storage.test/pdf/existing.pdf'
    });

    const response = await request(app)
      .patch(`/api/deliverynote/${deliveryNote._id}/sign`)
      .set('Authorization', `Bearer ${context.token}`)
      .attach('signature', signatureImageBuffer, {
        filename: 'signature.png',
        contentType: 'image/png'
      });

    expect(response.statusCode).toBe(409);
    expect(response.body.code).toBe('DELIVERY_NOTE_SIGNED');
    expect(storageServiceMock.uploadBuffer).not.toHaveBeenCalled();
  });

  test('returns pdf url for signed note', async () => {
    const context = await createAuthenticatedContext();
    const deliveryNote = await createDeliveryNote(context, {
      signed: true,
      signedAt: new Date('2025-06-10T12:00:00.000Z'),
      signatureUrl: 'signatures/existing.webp',
      pdfUrl: 'pdf/existing.pdf'
    });

    storageServiceMock.getFileUrl.mockResolvedValue('https://storage.test/pdf/existing.pdf?token=abc');

    const response = await request(app)
      .get(`/api/deliverynote/pdf/${deliveryNote._id}`)
      .set('Authorization', `Bearer ${context.token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      data: {
        url: 'https://storage.test/pdf/existing.pdf?token=abc'
      }
    });
    expect(storageServiceMock.getFileUrl).toHaveBeenCalledWith('pdf/existing.pdf');
  });

  test('streams generated pdf for unsigned note', async () => {
    const context = await createAuthenticatedContext();
    const deliveryNote = await createDeliveryNote(context);

    const response = await request(app)
      .get(`/api/deliverynote/pdf/${deliveryNote._id}`)
      .set('Authorization', `Bearer ${context.token}`)
      .buffer(true)
      .parse(binaryParser);

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/pdf/);
    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.body.subarray(0, 4).toString()).toBe('%PDF');
    expect(storageServiceMock.getFileUrl).not.toHaveBeenCalled();
  });

  test('returns controlled error when storage upload fails', async () => {
    const context = await createAuthenticatedContext();
    const deliveryNote = await createDeliveryNote(context);

    storageServiceMock.uploadBuffer.mockRejectedValueOnce(new Error('storage offline'));

    const response = await request(app)
      .patch(`/api/deliverynote/${deliveryNote._id}/sign`)
      .set('Authorization', `Bearer ${context.token}`)
      .attach('signature', signatureImageBuffer, {
        filename: 'signature.png',
        contentType: 'image/png'
      });

    expect(response.statusCode).toBe(500);
    expect(response.body.code).toBe('STORAGE_ERROR');
    expect(response.body.error).toBe(true);
    expect(storageServiceMock.uploadBuffer).toHaveBeenCalledTimes(1);
  });
});

import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import DeliveryNote from '../src/models/DeliveryNote.js';
import User from '../src/models/User.js';
import { mailService, resetMailTransport } from '../src/services/mail.service.js';

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

const buildMaterialDeliveryNotePayload = (clientId, projectId, overrides = {}) => ({
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

const buildHoursDeliveryNotePayload = (clientId, projectId, overrides = {}) => ({
  client: clientId,
  project: projectId,
  format: 'hours',
  description: 'Jornada de instalación',
  workDate: '2025-05-12T00:00:00.000Z',
  hours: 8,
  workers: [
    {
      name: 'Ana',
      hours: 5
    },
    {
      name: 'Luis',
      hours: 3
    }
  ],
  ...overrides
});

const createAuthenticatedCompanyUser = async ({
  email,
  companyName,
  companyCif,
  companyAddress
}) => {
  jest.spyOn(mailService, 'sendVerificationEmail').mockResolvedValue({ messageId: 'mocked-message' });

  const password = 'secreta123';

  const registerResponse = await request(app)
    .post('/api/user/register')
    .send({ email, password });

  expect(registerResponse.statusCode).toBe(201);

  const createdUser = await User.findOne({ email }).select('+password');

  const validationResponse = await request(app)
    .put('/api/user/validation')
    .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
    .send({ code: createdUser.verification.code });

  expect(validationResponse.statusCode).toBe(200);

  const loginResponse = await request(app)
    .post('/api/user/login')
    .send({ email, password });

  expect(loginResponse.statusCode).toBe(200);

  const profileResponse = await request(app)
    .put('/api/user/register')
    .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
    .send({
      name: 'Ada',
      lastName: 'Lovelace',
      nif: `${companyCif}Z`,
      address: 'Calle Principal 1'
    });

  expect(profileResponse.statusCode).toBe(200);

  const companyResponse = await request(app)
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

const createClient = async (token, overrides = {}) => {
  const response = await request(app)
    .post('/api/client')
    .set('Authorization', `Bearer ${token}`)
    .send(buildClientPayload(overrides));

  expect(response.statusCode).toBe(201);

  return response.body.client;
};

const createProject = async (token, clientId, overrides = {}) => {
  const response = await request(app)
    .post('/api/project')
    .set('Authorization', `Bearer ${token}`)
    .send(buildProjectPayload(clientId, overrides));

  expect(response.statusCode).toBe(201);

  return response.body.project;
};

describe('DeliveryNote API', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    resetMailTransport();
  });

  test('creates material delivery note', async () => {
    const { token } = await createAuthenticatedCompanyUser({
      email: 'delivery-owner1@example.com',
      companyName: 'Delivery Company One',
      companyCif: 'A32345678',
      companyAddress: 'Calle Empresa 1'
    });

    const client = await createClient(token);
    const project = await createProject(token, client._id);

    const response = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${token}`)
      .send(buildMaterialDeliveryNotePayload(client._id, project._id));

    expect(response.statusCode).toBe(201);
    expect(response.body.deliveryNote).toMatchObject({
      client: client._id,
      project: project._id,
      format: 'material',
      description: 'Entrega de ladrillos',
      material: 'Ladrillo',
      quantity: 120,
      unit: 'uds',
      signed: false,
      deleted: false
    });
    expect(response.body.deliveryNote.hours).toBeNull();
    expect(response.body.deliveryNote.workers).toEqual([]);
  });

  test('creates hours delivery note and lists with filters', async () => {
    const { token } = await createAuthenticatedCompanyUser({
      email: 'delivery-owner2@example.com',
      companyName: 'Delivery Company Two',
      companyCif: 'A32345679',
      companyAddress: 'Calle Empresa 2'
    });

    const client = await createClient(token);
    const otherClient = await createClient(token, {
      name: 'Other Client',
      cif: 'B12345001',
      email: 'other-client@test.test'
    });

    const project = await createProject(token, client._id);
    const otherProject = await createProject(token, otherClient._id, {
      name: 'Otro proyecto',
      projectCode: 'PRJ-002',
      email: 'other-project@test.test'
    });

    const createHoursResponse = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${token}`)
      .send(buildHoursDeliveryNotePayload(client._id, project._id));

    expect(createHoursResponse.statusCode).toBe(201);

    const createMaterialResponse = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${token}`)
      .send(buildMaterialDeliveryNotePayload(otherClient._id, otherProject._id, {
        workDate: '2025-02-15T00:00:00.000Z',
        material: 'Cemento',
        quantity: 20,
        unit: 'sacos'
      }));

    expect(createMaterialResponse.statusCode).toBe(201);

    const response = await request(app)
      .get(`/api/deliverynote?page=1&limit=10&client=${client._id}&project=${project._id}&format=hours&signed=false&from=2025-05-01&to=2025-05-31&sort=-workDate`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      totalPages: 1,
      totalItems: 1,
      currentPage: 1
    });
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      format: 'hours',
      client: client._id,
      project: project._id,
      signed: false,
      hours: 8
    });
    expect(response.body.data[0].workers).toHaveLength(2);
  });

  test('gets delivery note by id with populated user client and project', async () => {
    const { token, user } = await createAuthenticatedCompanyUser({
      email: 'delivery-owner3@example.com',
      companyName: 'Delivery Company Three',
      companyCif: 'A32345680',
      companyAddress: 'Calle Empresa 3'
    });

    const client = await createClient(token);
    const project = await createProject(token, client._id);

    const createResponse = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${token}`)
      .send(buildMaterialDeliveryNotePayload(client._id, project._id));

    expect(createResponse.statusCode).toBe(201);

    const response = await request(app)
      .get(`/api/deliverynote/${createResponse.body.deliveryNote._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.deliveryNote).toMatchObject({
      _id: createResponse.body.deliveryNote._id,
      format: 'material'
    });
    expect(response.body.deliveryNote.user).toMatchObject({
      _id: user._id,
      email: 'delivery-owner3@example.com'
    });
    expect(response.body.deliveryNote.client).toMatchObject({
      _id: client._id,
      name: client.name
    });
    expect(response.body.deliveryNote.project).toMatchObject({
      _id: project._id,
      name: project.name,
      client: client._id
    });
  });

  test('returns 400 for invalid format and invalid type specific fields', async () => {
    const { token } = await createAuthenticatedCompanyUser({
      email: 'delivery-owner4@example.com',
      companyName: 'Delivery Company Four',
      companyCif: 'A32345681',
      companyAddress: 'Calle Empresa 4'
    });

    const client = await createClient(token);
    const project = await createProject(token, client._id);

    const invalidFormatResponse = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${token}`)
      .send(buildMaterialDeliveryNotePayload(client._id, project._id, {
        format: 'invalid-format'
      }));

    expect(invalidFormatResponse.statusCode).toBe(400);
    expect(invalidFormatResponse.body.code).toBe('VALIDATION_ERROR');

    const invalidFieldsResponse = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${token}`)
      .send(buildHoursDeliveryNotePayload(client._id, project._id, {
        hours: undefined,
        workers: []
      }));

    expect(invalidFieldsResponse.statusCode).toBe(400);
    expect(invalidFieldsResponse.body.code).toBe('VALIDATION_ERROR');
  });

  test('rejects project client mismatch', async () => {
    const { token } = await createAuthenticatedCompanyUser({
      email: 'delivery-owner5@example.com',
      companyName: 'Delivery Company Five',
      companyCif: 'A32345682',
      companyAddress: 'Calle Empresa 5'
    });

    const clientA = await createClient(token);
    const clientB = await createClient(token, {
      name: 'Other Client',
      cif: 'B12345002',
      email: 'other-client2@test.test'
    });
    const project = await createProject(token, clientA._id);

    const response = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${token}`)
      .send(buildMaterialDeliveryNotePayload(clientB._id, project._id));

    expect(response.statusCode).toBe(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  test('rejects cross company access for client and project', async () => {
    const ownerA = await createAuthenticatedCompanyUser({
      email: 'delivery-owner6@example.com',
      companyName: 'Delivery Company Six',
      companyCif: 'A32345683',
      companyAddress: 'Calle Empresa 6'
    });

    const ownerB = await createAuthenticatedCompanyUser({
      email: 'delivery-owner7@example.com',
      companyName: 'Delivery Company Seven',
      companyCif: 'A32345684',
      companyAddress: 'Calle Empresa 7'
    });

    const foreignClient = await createClient(ownerB.token);
    const foreignProject = await createProject(ownerB.token, foreignClient._id);

    const createResponse = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${ownerA.token}`)
      .send(buildMaterialDeliveryNotePayload(foreignClient._id, foreignProject._id));

    expect(createResponse.statusCode).toBe(404);

    const ownClient = await createClient(ownerA.token, {
      cif: 'B12345003',
      email: 'own-client@test.test'
    });
    const ownProject = await createProject(ownerA.token, ownClient._id, {
      projectCode: 'PRJ-OWN',
      email: 'own-project@test.test'
    });

    const localCreateResponse = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${ownerA.token}`)
      .send(buildMaterialDeliveryNotePayload(ownClient._id, ownProject._id));

    expect(localCreateResponse.statusCode).toBe(201);

    const getResponse = await request(app)
      .get(`/api/deliverynote/${localCreateResponse.body.deliveryNote._id}`)
      .set('Authorization', `Bearer ${ownerB.token}`);

    expect(getResponse.statusCode).toBe(404);

    const deleteResponse = await request(app)
      .delete(`/api/deliverynote/${localCreateResponse.body.deliveryNote._id}`)
      .set('Authorization', `Bearer ${ownerB.token}`);

    expect(deleteResponse.statusCode).toBe(404);
  });

  test('returns 409 when deleting a signed delivery note', async () => {
    const { token, user } = await createAuthenticatedCompanyUser({
      email: 'delivery-owner8@example.com',
      companyName: 'Delivery Company Eight',
      companyCif: 'A32345685',
      companyAddress: 'Calle Empresa 8'
    });

    const client = await createClient(token);
    const project = await createProject(token, client._id);

    const signedDeliveryNote = await DeliveryNote.create({
      user: user._id,
      company: user.company,
      client: client._id,
      project: project._id,
      format: 'material',
      description: 'Entrega firmada',
      workDate: new Date('2025-06-01T00:00:00.000Z'),
      material: 'Yeso',
      quantity: 10,
      unit: 'sacos',
      signed: true,
      signedAt: new Date('2025-06-01T12:00:00.000Z'),
      signatureUrl: 'https://example.test/signature.webp',
      pdfUrl: 'https://example.test/delivery-note.pdf',
      deleted: false
    });

    const response = await request(app)
      .delete(`/api/deliverynote/${signedDeliveryNote._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(409);
    expect(response.body.code).toBe('DELIVERY_NOTE_SIGNED');
  });

  test('returns 400 for invalid ids', async () => {
    const { token } = await createAuthenticatedCompanyUser({
      email: 'delivery-owner9@example.com',
      companyName: 'Delivery Company Nine',
      companyCif: 'A32345686',
      companyAddress: 'Calle Empresa 9'
    });

    const getResponse = await request(app)
      .get('/api/deliverynote/not-an-object-id')
      .set('Authorization', `Bearer ${token}`);

    expect(getResponse.statusCode).toBe(400);
    expect(getResponse.body.code).toBe('VALIDATION_ERROR');

    const listResponse = await request(app)
      .get('/api/deliverynote?project=invalid-id')
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.statusCode).toBe(400);
    expect(listResponse.body.code).toBe('VALIDATION_ERROR');
  });

  test('returns 400 for invalid list date range', async () => {
    const { token } = await createAuthenticatedCompanyUser({
      email: 'delivery-owner10@example.com',
      companyName: 'Delivery Company Ten',
      companyCif: 'A32345687',
      companyAddress: 'Calle Empresa 10'
    });

    const response = await request(app)
      .get('/api/deliverynote?from=2025-12-31&to=2025-01-01')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });
});

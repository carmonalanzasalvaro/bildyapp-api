import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import Client from '../src/models/Client.js';
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

describe('Client API', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    resetMailTransport();
  });

  test('creates lists archives restores client', async () => {
    const { token } = await createAuthenticatedCompanyUser({
      email: 'owner1@example.com',
      companyName: 'Company One',
      companyCif: 'A12345678',
      companyAddress: 'Calle Empresa 1'
    });

    const createResponse = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send(buildClientPayload());

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.body.client).toMatchObject({
      name: 'ACME Corp',
      cif: 'B12345678',
      email: 'contacto@acme.test',
      deleted: false
    });

    const clientId = createResponse.body.client._id;

    const updateResponse = await request(app)
      .put(`/api/client/${clientId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildClientPayload({
        name: 'ACME Updated',
        phone: '699888777'
      }));

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.client.name).toBe('ACME Updated');
    expect(updateResponse.body.client.phone).toBe('699888777');

    const getResponse = await request(app)
      .get(`/api/client/${clientId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.body.client._id).toBe(clientId);

    const listResponse = await request(app)
      .get('/api/client?page=1&limit=10&name=ACME&sort=-createdAt')
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.body).toMatchObject({
      totalPages: 1,
      totalItems: 1,
      currentPage: 1
    });
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0]._id).toBe(clientId);

    const archiveResponse = await request(app)
      .delete(`/api/client/${clientId}?soft=true`)
      .set('Authorization', `Bearer ${token}`);

    expect(archiveResponse.statusCode).toBe(200);
    expect(archiveResponse.body.message).toBe('Cliente archivado correctamente');

    const activeAfterArchiveResponse = await request(app)
      .get('/api/client')
      .set('Authorization', `Bearer ${token}`);

    expect(activeAfterArchiveResponse.statusCode).toBe(200);
    expect(activeAfterArchiveResponse.body.data).toHaveLength(0);

    const archivedResponse = await request(app)
      .get('/api/client/archived')
      .set('Authorization', `Bearer ${token}`);

    expect(archivedResponse.statusCode).toBe(200);
    expect(archivedResponse.body.data).toHaveLength(1);
    expect(archivedResponse.body.data[0]._id).toBe(clientId);

    const restoreResponse = await request(app)
      .patch(`/api/client/${clientId}/restore`)
      .set('Authorization', `Bearer ${token}`);

    expect(restoreResponse.statusCode).toBe(200);
    expect(restoreResponse.body.client.deleted).toBe(false);

    const activeAfterRestoreResponse = await request(app)
      .get('/api/client')
      .set('Authorization', `Bearer ${token}`);

    expect(activeAfterRestoreResponse.statusCode).toBe(200);
    expect(activeAfterRestoreResponse.body.data).toHaveLength(1);
    expect(activeAfterRestoreResponse.body.data[0]._id).toBe(clientId);

    const hardDeleteResponse = await request(app)
      .delete(`/api/client/${clientId}?soft=false`)
      .set('Authorization', `Bearer ${token}`);

    expect(hardDeleteResponse.statusCode).toBe(200);
    expect(hardDeleteResponse.body.message).toBe('Cliente eliminado correctamente');

    const deletedClient = await Client.findById(clientId);
    expect(deletedClient).toBeNull();
  });

  test('returns pagination metadata with filters and sorting', async () => {
    const { token } = await createAuthenticatedCompanyUser({
      email: 'owner2@example.com',
      companyName: 'Company Two',
      companyCif: 'A12345679',
      companyAddress: 'Calle Empresa 2'
    });

    await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send(buildClientPayload({ name: 'ACME One', cif: 'B12345001', email: 'one@acme.test' }));

    await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send(buildClientPayload({ name: 'ACME Two', cif: 'B12345002', email: 'two@acme.test' }));

    await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send(buildClientPayload({ name: 'Other Client', cif: 'B12345003', email: 'other@test.test' }));

    const response = await request(app)
      .get('/api/client?page=1&limit=1&name=ACME&sort=-createdAt')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.totalItems).toBe(2);
    expect(response.body.totalPages).toBe(2);
    expect(response.body.currentPage).toBe(1);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('ACME Two');
  });

  test('returns 409 when client CIF is duplicated within the same company', async () => {
    const { token } = await createAuthenticatedCompanyUser({
      email: 'owner3@example.com',
      companyName: 'Company Three',
      companyCif: 'A12345680',
      companyAddress: 'Calle Empresa 3'
    });

    await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send(buildClientPayload());

    const response = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send(buildClientPayload({ email: 'second@acme.test' }));

    expect(response.statusCode).toBe(409);
    expect(response.body.code).toBe('CLIENT_CIF_EXISTS');
  });

  test('returns 400 when payload is invalid', async () => {
    const { token } = await createAuthenticatedCompanyUser({
      email: 'owner4@example.com',
      companyName: 'Company Four',
      companyCif: 'A12345681',
      companyAddress: 'Calle Empresa 4'
    });

    const response = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '',
        cif: '',
        email: 'wrong-email',
        address: {
          street: '',
          number: '',
          postal: '',
          city: '',
          province: ''
        }
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  test('does not expose clients across companies', async () => {
    const ownerA = await createAuthenticatedCompanyUser({
      email: 'owner5@example.com',
      companyName: 'Company Five',
      companyCif: 'A12345682',
      companyAddress: 'Calle Empresa 5'
    });

    const ownerB = await createAuthenticatedCompanyUser({
      email: 'owner6@example.com',
      companyName: 'Company Six',
      companyCif: 'A12345683',
      companyAddress: 'Calle Empresa 6'
    });

    const createResponse = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${ownerA.token}`)
      .send(buildClientPayload());

    expect(createResponse.statusCode).toBe(201);

    const clientId = createResponse.body.client._id;

    const getResponse = await request(app)
      .get(`/api/client/${clientId}`)
      .set('Authorization', `Bearer ${ownerB.token}`);

    expect(getResponse.statusCode).toBe(404);

    const deleteResponse = await request(app)
      .delete(`/api/client/${clientId}?soft=true`)
      .set('Authorization', `Bearer ${ownerB.token}`);

    expect(deleteResponse.statusCode).toBe(404);
  });

  test('returns 400 when client id is invalid', async () => {
    const { token } = await createAuthenticatedCompanyUser({
      email: 'owner7@example.com',
      companyName: 'Company Seven',
      companyCif: 'A12345684',
      companyAddress: 'Calle Empresa 7'
    });

    const response = await request(app)
      .get('/api/client/not-an-object-id')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });
});

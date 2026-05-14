import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import Project from '../src/models/Project.js';
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

describe('Project API', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    resetMailTransport();
  });

  test('creates lists updates archives restores project', async () => {
    const { token } = await createAuthenticatedCompanyUser({
      email: 'project-owner1@example.com',
      companyName: 'Project Company One',
      companyCif: 'A22345678',
      companyAddress: 'Calle Empresa 1'
    });

    const client = await createClient(token);

    const createResponse = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send(buildProjectPayload(client._id));

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.body.project).toMatchObject({
      client: client._id,
      name: 'Reforma integral',
      projectCode: 'PRJ-001',
      email: 'obra@acme.test',
      active: true,
      deleted: false
    });

    const projectId = createResponse.body.project._id;

    const updateResponse = await request(app)
      .put(`/api/project/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildProjectPayload(client._id, {
        name: 'Reforma integral actualizada',
        projectCode: 'PRJ-002',
        active: false,
        notes: 'Proyecto actualizado'
      }));

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.project).toMatchObject({
      name: 'Reforma integral actualizada',
      projectCode: 'PRJ-002',
      active: false,
      notes: 'Proyecto actualizado'
    });

    const getResponse = await request(app)
      .get(`/api/project/${projectId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.body.project._id).toBe(projectId);

    const listResponse = await request(app)
      .get(`/api/project?page=1&limit=10&client=${client._id}&name=actualizada&active=false&sort=-createdAt`)
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.body).toMatchObject({
      totalPages: 1,
      totalItems: 1,
      currentPage: 1
    });
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0]._id).toBe(projectId);

    const archiveResponse = await request(app)
      .delete(`/api/project/${projectId}?soft=true`)
      .set('Authorization', `Bearer ${token}`);

    expect(archiveResponse.statusCode).toBe(200);
    expect(archiveResponse.body.message).toBe('Proyecto archivado correctamente');

    const activeAfterArchiveResponse = await request(app)
      .get('/api/project')
      .set('Authorization', `Bearer ${token}`);

    expect(activeAfterArchiveResponse.statusCode).toBe(200);
    expect(activeAfterArchiveResponse.body.data).toHaveLength(0);

    const archivedResponse = await request(app)
      .get('/api/project/archived')
      .set('Authorization', `Bearer ${token}`);

    expect(archivedResponse.statusCode).toBe(200);
    expect(archivedResponse.body.data).toHaveLength(1);
    expect(archivedResponse.body.data[0]._id).toBe(projectId);

    const restoreResponse = await request(app)
      .patch(`/api/project/${projectId}/restore`)
      .set('Authorization', `Bearer ${token}`);

    expect(restoreResponse.statusCode).toBe(200);
    expect(restoreResponse.body.project.deleted).toBe(false);

    const activeAfterRestoreResponse = await request(app)
      .get('/api/project')
      .set('Authorization', `Bearer ${token}`);

    expect(activeAfterRestoreResponse.statusCode).toBe(200);
    expect(activeAfterRestoreResponse.body.data).toHaveLength(1);
    expect(activeAfterRestoreResponse.body.data[0]._id).toBe(projectId);

    const hardDeleteResponse = await request(app)
      .delete(`/api/project/${projectId}?soft=false`)
      .set('Authorization', `Bearer ${token}`);

    expect(hardDeleteResponse.statusCode).toBe(200);
    expect(hardDeleteResponse.body.message).toBe('Proyecto eliminado correctamente');

    const deletedProject = await Project.findById(projectId);
    expect(deletedProject).toBeNull();
  });

  test('keeps project update idempotent when the same representation is sent twice', async () => {
    const { token } = await createAuthenticatedCompanyUser({
      email: 'project-owner-idempotency@example.com',
      companyName: 'Project Company Idempotency',
      companyCif: 'A22345688',
      companyAddress: 'Calle Empresa Idempotency'
    });

    const client = await createClient(token, {
      cif: 'B12345004',
      email: 'idempotent-client@test.test'
    });

    const createResponse = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send(buildProjectPayload(client._id, {
        projectCode: 'PRJ-IDEMPOTENT',
        email: 'idempotent-project@test.test'
      }));

    expect(createResponse.statusCode).toBe(201);

    const projectId = createResponse.body.project._id;
    const updatePayload = buildProjectPayload(client._id, {
      name: 'Reforma idempotente',
      projectCode: 'PRJ-IDEMPOTENT-UPDATED',
      email: 'idempotent-updated@test.test',
      notes: 'Misma representación enviada dos veces',
      active: false
    });

    const firstUpdateResponse = await request(app)
      .put(`/api/project/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updatePayload);

    expect(firstUpdateResponse.statusCode).toBe(200);

    const secondUpdateResponse = await request(app)
      .put(`/api/project/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updatePayload);

    expect(secondUpdateResponse.statusCode).toBe(200);

    const stableProjectState = (project) => ({
      id: project._id,
      client: project.client,
      name: project.name,
      projectCode: project.projectCode,
      email: project.email,
      notes: project.notes,
      active: project.active,
      deleted: project.deleted
    });

    expect(stableProjectState(secondUpdateResponse.body.project)).toEqual(stableProjectState(firstUpdateResponse.body.project));

    const getResponse = await request(app)
      .get(`/api/project/${projectId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getResponse.statusCode).toBe(200);
    expect(stableProjectState(getResponse.body.project)).toEqual({
      id: projectId,
      client: client._id,
      name: 'Reforma idempotente',
      projectCode: 'PRJ-IDEMPOTENT-UPDATED',
      email: 'idempotent-updated@test.test',
      notes: 'Misma representación enviada dos veces',
      active: false,
      deleted: false
    });
  });

  test('returns pagination metadata with client name active filters and sorting', async () => {
    const { token } = await createAuthenticatedCompanyUser({
      email: 'project-owner2@example.com',
      companyName: 'Project Company Two',
      companyCif: 'A22345679',
      companyAddress: 'Calle Empresa 2'
    });

    const clientA = await createClient(token, { cif: 'B12345001', email: 'clienta@test.test' });
    const clientB = await createClient(token, { name: 'Other Client', cif: 'B12345002', email: 'clientb@test.test' });

    await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send(buildProjectPayload(clientA._id, {
        name: 'Reforma cocina',
        projectCode: 'PRJ-A',
        email: 'a@test.test',
        active: true
      }));

    await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send(buildProjectPayload(clientA._id, {
        name: 'Reforma baño',
        projectCode: 'PRJ-B',
        email: 'b@test.test',
        active: true
      }));

    await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send(buildProjectPayload(clientB._id, {
        name: 'Instalación oficina',
        projectCode: 'PRJ-C',
        email: 'c@test.test',
        active: false
      }));

    const response = await request(app)
      .get(`/api/project?page=1&limit=1&client=${clientA._id}&name=Reforma&active=true&sort=-createdAt`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.totalItems).toBe(2);
    expect(response.body.totalPages).toBe(2);
    expect(response.body.currentPage).toBe(1);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('Reforma baño');
  });

  test('returns 409 when project code is duplicated within the same company', async () => {
    const { token } = await createAuthenticatedCompanyUser({
      email: 'project-owner3@example.com',
      companyName: 'Project Company Three',
      companyCif: 'A22345680',
      companyAddress: 'Calle Empresa 3'
    });

    const client = await createClient(token);

    await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send(buildProjectPayload(client._id));

    const response = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send(buildProjectPayload(client._id, { name: 'Otro proyecto', email: 'other@acme.test' }));

    expect(response.statusCode).toBe(409);
    expect(response.body.code).toBe('PROJECT_CODE_EXISTS');
  });

  test('returns 404 when project client does not exist', async () => {
    const { token } = await createAuthenticatedCompanyUser({
      email: 'project-owner4@example.com',
      companyName: 'Project Company Four',
      companyCif: 'A22345681',
      companyAddress: 'Calle Empresa 4'
    });

    const response = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send(buildProjectPayload(new mongoose.Types.ObjectId().toString()));

    expect(response.statusCode).toBe(404);
  });

  test('rejects cross company client', async () => {
    const ownerA = await createAuthenticatedCompanyUser({
      email: 'project-owner5@example.com',
      companyName: 'Project Company Five',
      companyCif: 'A22345682',
      companyAddress: 'Calle Empresa 5'
    });

    const ownerB = await createAuthenticatedCompanyUser({
      email: 'project-owner6@example.com',
      companyName: 'Project Company Six',
      companyCif: 'A22345683',
      companyAddress: 'Calle Empresa 6'
    });

    const foreignClient = await createClient(ownerB.token);

    const createResponse = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${ownerA.token}`)
      .send(buildProjectPayload(foreignClient._id));

    expect(createResponse.statusCode).toBe(404);

    const ownClient = await createClient(ownerA.token, {
      cif: 'B12345003',
      email: 'ownclient@test.test'
    });

    const projectResponse = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${ownerA.token}`)
      .send(buildProjectPayload(ownClient._id, {
        projectCode: 'PRJ-LOCAL',
        email: 'local@test.test'
      }));

    expect(projectResponse.statusCode).toBe(201);

    const updateResponse = await request(app)
      .put(`/api/project/${projectResponse.body.project._id}`)
      .set('Authorization', `Bearer ${ownerA.token}`)
      .send(buildProjectPayload(foreignClient._id, {
        projectCode: 'PRJ-LOCAL-2',
        email: 'local2@test.test'
      }));

    expect(updateResponse.statusCode).toBe(404);
  });

  test('returns 400 when payload is invalid', async () => {
    const { token } = await createAuthenticatedCompanyUser({
      email: 'project-owner7@example.com',
      companyName: 'Project Company Seven',
      companyCif: 'A22345684',
      companyAddress: 'Calle Empresa 7'
    });

    const response = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send({
        client: 'not-an-object-id',
        name: '',
        projectCode: '',
        address: {
          street: '',
          number: '',
          postal: '',
          city: '',
          province: ''
        },
        email: 'wrong-email',
        active: 'yes'
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  test('does not expose projects across companies', async () => {
    const ownerA = await createAuthenticatedCompanyUser({
      email: 'project-owner8@example.com',
      companyName: 'Project Company Eight',
      companyCif: 'A22345685',
      companyAddress: 'Calle Empresa 8'
    });

    const ownerB = await createAuthenticatedCompanyUser({
      email: 'project-owner9@example.com',
      companyName: 'Project Company Nine',
      companyCif: 'A22345686',
      companyAddress: 'Calle Empresa 9'
    });

    const client = await createClient(ownerA.token);
    const createResponse = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${ownerA.token}`)
      .send(buildProjectPayload(client._id));

    expect(createResponse.statusCode).toBe(201);

    const projectId = createResponse.body.project._id;

    const getResponse = await request(app)
      .get(`/api/project/${projectId}`)
      .set('Authorization', `Bearer ${ownerB.token}`);

    expect(getResponse.statusCode).toBe(404);

    const deleteResponse = await request(app)
      .delete(`/api/project/${projectId}?soft=true`)
      .set('Authorization', `Bearer ${ownerB.token}`);

    expect(deleteResponse.statusCode).toBe(404);
  });

  test('returns 400 when project id is invalid', async () => {
    const { token } = await createAuthenticatedCompanyUser({
      email: 'project-owner10@example.com',
      companyName: 'Project Company Ten',
      companyCif: 'A22345687',
      companyAddress: 'Calle Empresa 10'
    });

    const response = await request(app)
      .get('/api/project/not-an-object-id')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

});

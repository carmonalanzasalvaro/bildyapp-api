import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

let app;
let User;
let Company;
let database;
let mailService;
let mongoServer;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';

  database = await import('../src/config/database.js');
  mailService = await import('../src/services/mail.service.js');

  const appModule = await import('../src/app.js');
  const userModule = await import('../src/models/User.js');
  const companyModule = await import('../src/models/Company.js');

  app = appModule.default;
  User = userModule.default;
  Company = companyModule.default;

  mongoServer = await MongoMemoryServer.create();
  await database.connectDatabase(mongoServer.getUri());
});

afterEach(async () => {
  jest.restoreAllMocks();
  await Promise.all([
    User.deleteMany({}),
    Company.deleteMany({})
  ]);
  mailService.resetMailTransport();
});

afterAll(async () => {
  await database.disconnectDatabase();
  if (mongoServer) {
    await mongoServer.stop();
  }
  await mongoose.disconnect();
});

describe('Auth and onboarding', () => {
  test('register login company onboarding happy path', async () => {
    const sendVerificationEmailSpy = jest
      .spyOn(mailService.mailService, 'sendVerificationEmail')
      .mockResolvedValue({ messageId: 'mocked-message' });

    const registerResponse = await request(app)
      .post('/api/user/register')
      .send({
        email: 'Test@Example.com',
        password: 'secreta123'
      });

    expect(registerResponse.statusCode).toBe(201);
    expect(registerResponse.body.accessToken).toEqual(expect.any(String));
    expect(registerResponse.body.user).toMatchObject({
      email: 'test@example.com',
      status: 'pending',
      role: 'admin'
    });
    expect(registerResponse.body.user.password).toBeUndefined();
    expect(sendVerificationEmailSpy).toHaveBeenCalledTimes(1);

    const createdUser = await User.findOne({ email: 'test@example.com' }).select('+password');
    expect(createdUser.password).not.toBe('secreta123');
    expect(createdUser.verification.code).toMatch(/^\d{6}$/);
    expect(createdUser.verification.attempts).toBe(3);

    const validationResponse = await request(app)
      .put('/api/user/validation')
      .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
      .send({
        code: createdUser.verification.code
      });

    expect(validationResponse.statusCode).toBe(200);
    expect(validationResponse.body.user.status).toBe('verified');

    const loginResponse = await request(app)
      .post('/api/user/login')
      .send({
        email: 'test@example.com',
        password: 'secreta123'
      });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.body.accessToken).toEqual(expect.any(String));

    const profileResponse = await request(app)
      .put('/api/user/register')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .send({
        name: 'Ada',
        lastName: 'Lovelace',
        nif: '12345678A',
        address: 'Calle Principal 1'
      });

    expect(profileResponse.statusCode).toBe(200);
    expect(profileResponse.body.user.fullName).toBe('Ada Lovelace');

    const companyResponse = await request(app)
      .patch('/api/user/company')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .send({
        isFreelance: true
      });

    expect(companyResponse.statusCode).toBe(200);
    expect(companyResponse.body.user.role).toBe('admin');
    expect(companyResponse.body.user.company).toMatchObject({
      owner: companyResponse.body.user._id,
      cif: '12345678A',
      name: 'Ada Lovelace',
      address: 'Calle Principal 1',
      isFreelance: true
    });

    const meResponse = await request(app)
      .get('/api/user')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`);

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.body.user.password).toBeUndefined();
    expect(meResponse.body.user.fullName).toBe('Ada Lovelace');
    expect(meResponse.body.user.company.cif).toBe('12345678A');
  });

  test('returns 409 when email is duplicated', async () => {
    jest.spyOn(mailService.mailService, 'sendVerificationEmail').mockResolvedValue({ messageId: 'mocked-message' });

    await request(app).post('/api/user/register').send({
      email: 'duplicate@example.com',
      password: 'secreta123'
    });

    const response = await request(app).post('/api/user/register').send({
      email: 'duplicate@example.com',
      password: 'secreta123'
    });

    expect(response.statusCode).toBe(409);
    expect(response.body.code).toBe('EMAIL_EXISTS');
  });

  test('returns 400 when payload is invalid', async () => {
    const response = await request(app)
      .post('/api/user/register')
      .send({
        email: 'bad-email',
        password: '123'
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  test('rejects missing and invalid token', async () => {
    const missingTokenResponse = await request(app).get('/api/user');

    expect(missingTokenResponse.statusCode).toBe(401);
    expect(missingTokenResponse.body.code).toBe('NO_TOKEN');

    const invalidTokenResponse = await request(app)
      .get('/api/user')
      .set('Authorization', 'Bearer invalid-token');

    expect(invalidTokenResponse.statusCode).toBe(401);
    expect(invalidTokenResponse.body.code).toBe('INVALID_TOKEN');
  });
});

import request from 'supertest';
import { jest, beforeEach, describe, expect, test } from '@jest/globals';

const sendVerificationEmail = jest.fn();
const logServerError = jest.fn();

await jest.unstable_mockModule('../src/services/mail.service.js', () => ({
  mailService: {
    sendVerificationEmail
  },
  resetMailTransport: jest.fn()
}));

await jest.unstable_mockModule('../src/services/logger.service.js', () => ({
  loggerService: {
    logServerError
  }
}));

const { default: app } = await import('../src/app.js');

describe('notification flows', () => {
  beforeEach(() => {
    sendVerificationEmail.mockReset();
    logServerError.mockReset();

    sendVerificationEmail.mockResolvedValue({ messageId: 'test-message-id' });
    logServerError.mockResolvedValue(true);
  });

  test('register sends verification email', async () => {
    const response = await request(app)
      .post('/api/user/register')
      .send({
        email: 'User@Test.com',
        password: 'password123'
      });

    expect(response.status).toBe(201);
    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(sendVerificationEmail).toHaveBeenCalledWith({
      to: 'user@test.com',
      code: expect.stringMatching(/^\d{6}$/)
    });
    expect(response.body).toEqual(expect.objectContaining({
      accessToken: expect.any(String),
      user: expect.objectContaining({
        email: 'user@test.com',
        status: 'pending'
      })
    }));
  });

  test('forced 500 calls Slack once', async () => {
    const response = await request(app).get('/api/test/force-500');

    expect(response.status).toBe(500);
    expect(logServerError).toHaveBeenCalledTimes(1);
    expect(logServerError).toHaveBeenCalledWith(expect.objectContaining({
      timestamp: expect.any(String),
      method: 'GET',
      route: '/api/test/force-500',
      status: 500,
      message: 'Forced test error'
    }));
  });

  test('validation 400 does not call Slack', async () => {
    const response = await request(app)
      .post('/api/user/register')
      .send({
        email: 'invalid-email',
        password: 'short'
      });

    expect(response.status).toBe(400);
    expect(logServerError).not.toHaveBeenCalled();
  });

  test('Slack failure still returns the original 500', async () => {
    logServerError.mockRejectedValueOnce(new Error('Slack down'));

    const response = await request(app).get('/api/test/force-500');

    expect(response.status).toBe(500);
    expect(response.body).toEqual(expect.objectContaining({
      error: true,
      message: 'Forced test error',
      code: 'INTERNAL_ERROR'
    }));
    expect(logServerError).toHaveBeenCalledTimes(1);
  });
});

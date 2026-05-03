import request from 'supertest';
import app from '../src/app.js';

describe('GET /health', () => {
  it('returns API and database status data', async () => {
    const response = await request(app).get('/health');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      db: 'connected',
      uptime: expect.any(Number),
      timestamp: expect.any(String)
    });
  });
});

import request from 'supertest';
import app from '../src/app.js';

describe('Documentation and health endpoints', () => {
  test('GET /api-docs returns Swagger UI', async () => {
    const response = await request(app).get('/api-docs');

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('Swagger UI');
  });

  test('GET /api-docs.json returns OpenAPI document', async () => {
    const response = await request(app).get('/api-docs.json');

    expect(response.statusCode).toBe(200);
    expect(response.body.openapi).toBe('3.0.3');
    expect(response.body.info.title).toBe('BildyApp API');
    expect(response.body.paths['/health']).toBeDefined();
    expect(response.body.paths['/api/deliverynote/{id}/sign']).toBeDefined();
    expect(response.body.components.schemas.User).toBeDefined();
    expect(response.body.components.schemas.Company).toBeDefined();
    expect(response.body.components.schemas.Client).toBeDefined();
    expect(response.body.components.schemas.Project).toBeDefined();
    expect(response.body.components.schemas.DeliveryNote).toBeDefined();
  });

  test('GET /health returns current runtime shape', async () => {
    const response = await request(app).get('/health');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      db: 'connected',
      uptime: expect.any(Number),
      timestamp: expect.any(String)
    });
    expect(Number.isFinite(response.body.uptime)).toBe(true);
    expect(new Date(response.body.timestamp).toString()).not.toBe('Invalid Date');
  });
});

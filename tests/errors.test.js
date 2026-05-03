import request from 'supertest';
import app from '../src/app.js';

describe('404 handler', () => {
  it('returns a centralized error response for unknown routes', async () => {
    const response = await request(app).get('/not-found');

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      error: true,
      message: 'Ruta no encontrada: GET /not-found',
      code: 'NOT_FOUND'
    });
  });
});

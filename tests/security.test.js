import request from 'supertest';
import app from '../src/app.js';
import { sanitizeNoSql } from '../src/middleware/security.js';

describe('Security middleware', () => {
  test('adds helmet headers', async () => {
    const response = await request(app).get('/health');

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-dns-prefetch-control']).toBe('off');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  test('sanitizes dangerous Mongo keys from request data', async () => {
    const req = {
      body: {
        safe: 'value',
        nested: {
          '.bad': true,
          ok: 'yes'
        },
        $where: 'malicious'
      },
      query: {
        filter: {
          $ne: 'x',
          name: 'Ada'
        }
      },
      params: {
        'bad.key': 'remove-me',
        id: '123'
      }
    };

    await new Promise((resolve) => {
      sanitizeNoSql(req, {}, resolve);
    });

    expect(req.body).toEqual({
      safe: 'value',
      nested: {
        ok: 'yes'
      }
    });
    expect(req.query).toEqual({
      filter: {
        name: 'Ada'
      }
    });
    expect(req.params).toEqual({
      id: '123'
    });
  });
});

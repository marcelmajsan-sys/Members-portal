import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('GET /api/health', () => {
  it('returns 200 with { success: true }', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('includes a timestamp field', async () => {
    const res = await request(app).get('/api/health');

    expect(res.body.data.timestamp).toBeDefined();
    expect(typeof res.body.data.timestamp).toBe('string');
  });

  it('includes a version field', async () => {
    const res = await request(app).get('/api/health');

    expect(res.body.data.version).toBeDefined();
    expect(typeof res.body.data.version).toBe('string');
  });
});

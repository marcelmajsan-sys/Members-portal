import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { validate } from '../src/middleware/validate.js';

function createMockReqResNext(body: unknown) {
  const req = { body } as any;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as any;
  const next = vi.fn();
  return { req, res, next };
}

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

describe('validate middleware', () => {
  it('passes valid body and calls next', () => {
    const { req, res, next } = createMockReqResNext({
      name: 'Alice',
      email: 'alice@example.com',
    });

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid body', () => {
    const { req, res, next } = createMockReqResNext({
      name: '',
      email: 'not-an-email',
    });

    validate(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
        }),
      }),
    );
  });
});

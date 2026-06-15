import { describe, it, expect, beforeAll } from 'vitest';

// Set env vars before importing auth.service, since it imports env.ts which
// parses process.env at module load time.
beforeAll(() => {
  process.env.DATABASE_URL ??= 'postgresql://localhost:5432/test';
  process.env.JWT_SECRET ??= 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
});

describe('auth.service – pure functions', () => {
  it('hashPassword returns a hash different from input', async () => {
    const { hashPassword } = await import('../src/services/auth.service.js');
    const password = 'my-secret-password';
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(0);
  });

  it('comparePassword returns true for correct password', async () => {
    const { hashPassword, comparePassword } = await import(
      '../src/services/auth.service.js'
    );
    const password = 'correct-password';
    const hash = await hashPassword(password);

    const result = await comparePassword(password, hash);
    expect(result).toBe(true);
  });

  it('comparePassword returns false for wrong password', async () => {
    const { hashPassword, comparePassword } = await import(
      '../src/services/auth.service.js'
    );
    const hash = await hashPassword('correct-password');

    const result = await comparePassword('wrong-password', hash);
    expect(result).toBe(false);
  });

  it('generateAccessToken returns a string', async () => {
    const { generateAccessToken } = await import(
      '../src/services/auth.service.js'
    );
    const token = generateAccessToken({
      id: 'user-1',
      email: 'test@example.com',
      role: 'MEMBER',
    });

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('verifyAccessToken decodes the token correctly', async () => {
    const { generateAccessToken, verifyAccessToken } = await import(
      '../src/services/auth.service.js'
    );
    const user = { id: 'user-1', email: 'test@example.com', role: 'MEMBER' };
    const token = generateAccessToken(user);

    const decoded = verifyAccessToken(token);

    expect(decoded.userId).toBe(user.id);
    expect(decoded.email).toBe(user.email);
    expect(decoded.role).toBe(user.role);
  });
});

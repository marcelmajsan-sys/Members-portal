import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  paginationSchema,
  idParamSchema,
} from '../src/index.js';

describe('loginSchema', () => {
  it('should pass with valid input', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('should fail with missing email', () => {
    const result = loginSchema.safeParse({
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('should fail with short password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '12345',
    });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  const validInput = {
    email: 'user@example.com',
    password: 'password123',
    firstName: 'Ivan',
    lastName: 'Horvat',
    companyName: 'Firma d.o.o.',
    oib: '12345678901',
    memberType: 'WEB_TRADER' as const,
  };

  it('should pass with valid input', () => {
    const result = registerSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should fail with invalid OIB length', () => {
    const result = registerSchema.safeParse({
      ...validInput,
      oib: '12345',
    });
    expect(result.success).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('should apply defaults when no input provided', () => {
    const result = paginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('should coerce string numbers', () => {
    const result = paginationSchema.parse({ page: '3', limit: '50' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });
});

describe('idParamSchema', () => {
  it('should pass with a valid cuid', () => {
    const result = idParamSchema.safeParse({
      id: 'clfx1z2n30000qw08hn3g4e1v',
    });
    expect(result.success).toBe(true);
  });

  it('should fail with a random string', () => {
    const result = idParamSchema.safeParse({
      id: 'not-a-cuid',
    });
    expect(result.success).toBe(false);
  });
});

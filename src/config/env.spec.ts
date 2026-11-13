import { validateAppEnv, validateEnv } from './env.js';

describe('validateEnv', () => {
  const validEnv = {
    DATABASE_URL:
      'postgresql://eventscore:eventscore@localhost:5432/eventscore',
  };

  it('should apply defaults when optional variables are missing', () => {
    expect(validateEnv(validEnv)).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: validEnv.DATABASE_URL,
    });
  });

  it('should coerce PORT from string to number', () => {
    expect(validateEnv({ ...validEnv, PORT: '8080' }).PORT).toBe(8080);
  });

  it('should throw when DATABASE_URL is missing', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('should throw when DATABASE_URL is not a PostgreSQL URL', () => {
    expect(() =>
      validateEnv({ DATABASE_URL: 'mysql://user:pass@localhost:3306/db' }),
    ).toThrow(/DATABASE_URL/);
  });

  it('should throw when PORT is out of range', () => {
    expect(() => validateEnv({ ...validEnv, PORT: '70000' })).toThrow(/PORT/);
  });

  it('should throw when NODE_ENV is not allowed', () => {
    expect(() => validateEnv({ ...validEnv, NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV/,
    );
  });

  it('should reject a short JWT secret when one is configured', () => {
    expect(() => validateEnv({ ...validEnv, JWT_SECRET: 'curto' })).toThrow(
      /JWT_SECRET/,
    );
  });

  it('requires a strong JWT secret to start the API', () => {
    expect(() => validateAppEnv(validEnv)).toThrow(/JWT_SECRET/);
    expect(() => validateAppEnv({ ...validEnv, JWT_SECRET: 'short' })).toThrow(
      /JWT_SECRET/,
    );
    expect(
      validateAppEnv({ ...validEnv, JWT_SECRET: 'x'.repeat(32) }).JWT_SECRET,
    ).toBe('x'.repeat(32));
  });
});

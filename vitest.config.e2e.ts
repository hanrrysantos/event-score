import 'dotenv/config';
import { defineConfig } from 'vitest/config';

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();

if (!testDatabaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL deve apontar explicitamente para um banco exclusivo de testes',
  );
}

let testDatabaseName: string;
try {
  const url = new URL(testDatabaseUrl);
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error('protocolo inválido');
  }
  testDatabaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));
} catch {
  throw new Error('TEST_DATABASE_URL deve ser uma URL PostgreSQL válida');
}

if (!/(^|[_-])tests?($|[_-])/i.test(testDatabaseName)) {
  throw new Error(
    'TEST_DATABASE_URL recusada: o nome do banco deve conter o marcador "test"',
  );
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDatabaseUrl;

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});

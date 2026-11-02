import { PasswordHashService } from './password-hash.service.js';

describe('PasswordHashService', () => {
  const service = new PasswordHashService();

  it('gera hashes Argon2id com salts diferentes', async () => {
    const first = await service.hash('senha-de-teste');
    const second = await service.hash('senha-de-teste');

    expect(first).toMatch(/^\$argon2id\$/);
    expect(second).not.toBe(first);
    expect(first).not.toContain('senha-de-teste');
  });

  it('aceita a senha correta e rejeita a incorreta', async () => {
    const hash = await service.hash('senha-correta');

    await expect(service.verify(hash, 'senha-correta')).resolves.toBe(true);
    await expect(service.verify(hash, 'senha-incorreta')).resolves.toBe(false);
  });
});

import { loginSchema } from './login.dto.js';

describe('loginSchema', () => {
  it('aceita e-mail e senha e remove espaços do e-mail', () => {
    expect(
      loginSchema.parse({
        email: ' admin@example.com ',
        senha: 'senha-de-teste',
      }),
    ).toEqual({ email: 'admin@example.com', senha: 'senha-de-teste' });
  });

  it.each([
    { email: 'invalido', senha: 'senha-de-teste' },
    { email: 'admin@example.com', senha: '' },
    { email: 'admin@example.com', senha: 'senha', perfil: 'ADMIN' },
  ])('rejeita campos inválidos ou inesperados', (payload) => {
    expect(loginSchema.safeParse(payload).success).toBe(false);
  });
});

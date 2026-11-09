import {
  Controller,
  Get,
  INestApplication,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AuthModule } from './auth.module.js';
import { AuthUserRepository } from './auth-user.repository.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { JwtAuthenticatedRequest } from './jwt-auth.guard.js';
import { PasswordHashService } from './password-hash.service.js';

@Controller('protected-test')
class ProtectedTestController {
  @Get()
  @UseGuards(JwtAuthGuard)
  getUser(@Req() request: JwtAuthenticatedRequest) {
    return request.user;
  }
}

describe('POST /api/v1/auth/login', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const user = {
    id: 7,
    nome: 'Administradora',
    email: 'admin@example.com',
    senhaHash: 'hash-simulado',
    perfil: 'ADMIN',
    ativo: true,
  };
  const users = {
    findByEmail: vi.fn(async () => user),
    findById: vi.fn(async () => user),
  };
  const passwordHash = { verify: vi.fn(async () => true) };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProtectedTestController],
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          load: [
            () => ({
              JWT_SECRET: 'test-only-secret-with-at-least-32-characters',
            }),
          ],
        }),
        AuthModule.register({ provide: AuthUserRepository, useValue: users }),
      ],
    })
      .overrideProvider(PasswordHashService)
      .useValue(passwordHash)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna JWT de 1 hora, expiração correspondente e somente dados públicos', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'ADMIN@example.com', senha: 'senha-de-teste' })
      .expect(200);

    expect(users.findByEmail).toHaveBeenCalledWith('admin@example.com');
    expect(passwordHash.verify).toHaveBeenCalledWith(
      user.senhaHash,
      'senha-de-teste',
    );
    expect(response.body.usuario).toEqual({
      id: 7,
      nome: user.nome,
      email: user.email,
    });
    expect(response.body).not.toHaveProperty('senha');
    expect(response.body).not.toHaveProperty('senhaHash');
    const payload = await jwt.verifyAsync<{
      sub: number;
      iat: number;
      exp: number;
    }>(response.body.token);
    expect(payload.sub).toBe(7);
    expect(payload.exp - payload.iat).toBe(3600);
    expect(response.body.expiraEm).toBe(
      new Date(payload.exp * 1000).toISOString(),
    );
  });

  it('retorna 401 quando a senha não confere, sem emitir token', async () => {
    passwordHash.verify.mockResolvedValueOnce(false);
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: user.email, senha: 'errada' })
      .expect(401);
    expect(response.body.message).toBe('E-mail ou senha inválidos');
    expect(response.body).not.toHaveProperty('token');
  });

  it('retorna 400 para corpo inválido sem consultar usuário', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'invalido', senha: '' })
      .expect(400);
    expect(users.findByEmail).not.toHaveBeenCalled();
  });

  it('retorna 401 na rota protegida sem token ou com token inválido', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/protected-test')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/protected-test')
      .set('Authorization', 'Bearer token-invalido')
      .expect(401);
  });

  it('aceita token válido na rota protegida e rejeita conta desativada', async () => {
    const token = await jwt.signAsync({ sub: user.id });
    await request(app.getHttpServer())
      .get('/api/v1/protected-test')
      .set('Authorization', `Bearer ${token}`)
      .expect(200, { id: user.id });

    users.findById.mockResolvedValueOnce({ ...user, ativo: false });
    await request(app.getHttpServer())
      .get('/api/v1/protected-test')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
});

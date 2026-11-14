import { Controller, Get, INestApplication, Param, Req } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HealthController } from '../../health/health.controller.js';
import { AuthController } from './auth.controller.js';
import { AuthModule } from './auth.module.js';
import { AuthUserRepository } from './auth-user.repository.js';
import type { JwtAuthenticatedRequest } from './jwt-auth.guard.js';
import { PasswordHashService } from './password-hash.service.js';
import { IS_PUBLIC_KEY, Public } from './public.decorator.js';

@Controller('test-admin')
class AdminRoutesController {
  @Get(':section')
  getSection(
    @Param('section') section: string,
    @Req() req: JwtAuthenticatedRequest,
  ) {
    return { section, user: req.user };
  }
}

@Controller('test-public')
class PublicTestController {
  @Get()
  @Public()
  getPublic() {
    return { public: true };
  }
}

describe('Proteção global de rotas administrativas', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const admin = {
    id: 7,
    nome: 'Administradora',
    email: 'admin@example.com',
    senhaHash: 'hash-de-teste',
    perfil: 'ADMIN',
    ativo: true,
  };
  const users = {
    findByEmail: vi.fn(async () => admin),
    findById: vi.fn(async () => admin),
  };
  const passwordHash = { verify: vi.fn(async () => true) };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
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
      controllers: [AdminRoutesController, PublicTestController],
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
    users.findById.mockResolvedValue(admin);
  });

  it('deixa login e rotas explicitamente públicas sem token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: admin.email, senha: 'senha-de-teste' })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/test-public')
      .expect(200, { public: true });
    expect(users.findById).not.toHaveBeenCalled();
  });

  it('marca a rota real de health como pública', () => {
    const reflector = new Reflector();
    const healthHandler = Reflect.get(
      HealthController.prototype,
      'check',
    ) as () => unknown;
    const loginHandler = Reflect.get(
      AuthController.prototype,
      'login',
    ) as () => unknown;
    expect(
      reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        healthHandler,
        HealthController,
      ]),
    ).toBe(true);
    expect(
      reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        loginHandler,
        AuthController,
      ]),
    ).toBe(true);
  });

  it.each(['eventos', 'grupos', 'dias'])(
    'rejeita acesso a %s sem token ou com token inválido',
    async (section) => {
      await request(app.getHttpServer())
        .get(`/api/v1/test-admin/${section}`)
        .expect(401);
      await request(app.getHttpServer())
        .get(`/api/v1/test-admin/${section}`)
        .set('Authorization', 'Bearer token-invalido')
        .expect(401);
    },
  );

  it('aceita JWT válido e expõe apenas o ID do administrador', async () => {
    const token = await jwt.signAsync({ sub: admin.id });
    await request(app.getHttpServer())
      .get('/api/v1/test-admin/eventos')
      .set('Authorization', `Bearer ${token}`)
      .expect(200, { section: 'eventos', user: { id: admin.id } });
  });

  it('rejeita token expirado e conta inativa ou sem perfil ADMIN', async () => {
    const expired = await jwt.signAsync({ sub: admin.id }, { expiresIn: -1 });
    await request(app.getHttpServer())
      .get('/api/v1/test-admin/eventos')
      .set('Authorization', `Bearer ${expired}`)
      .expect(401);

    const token = await jwt.signAsync({ sub: admin.id });
    users.findById.mockResolvedValueOnce({ ...admin, ativo: false });
    await request(app.getHttpServer())
      .get('/api/v1/test-admin/eventos')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    users.findById.mockResolvedValueOnce({ ...admin, perfil: 'OPERADOR' });
    await request(app.getHttpServer())
      .get('/api/v1/test-admin/eventos')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
});

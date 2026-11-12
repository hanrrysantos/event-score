import { randomUUID } from 'node:crypto';
import { Controller, Get, INestApplication, Req } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import type { JwtAuthenticatedRequest } from '../src/modules/auth/jwt-auth.guard.js';
import { PasswordHashService } from '../src/modules/auth/password-hash.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { criarOuAtualizarAdmin } from '../src/scripts/admin.js';

@Controller('administrativo-teste')
class AdministrativoTesteController {
  @Get()
  get(@Req() request: JwtAuthenticatedRequest) {
    return request.user;
  }
}

describe('Autenticação persistida (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let adminId: number;
  let inativoId: number;
  let operadorId: number;
  let token: string;
  const idsCriados: number[] = [];
  const email = `admin-${randomUUID()}@example.test`;
  const emailInativo = `inativo-${randomUUID()}@example.test`;
  const emailOperador = `legado-${randomUUID()}@example.test`;
  const senha = 'senha-local-de-integracao-195';

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [AdministrativoTesteController],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);

    const dados = {
      ADMIN_NOME: 'Administradora de teste',
      ADMIN_EMAIL: email,
      ADMIN_SENHA: senha,
    };
    expect(await criarOuAtualizarAdmin(prisma, dados)).toBe('criado');
    const admin = await prisma.usuario.findFirstOrThrow({
      where: { email },
      select: { id: true, senhaHash: true, perfil: true, ativo: true },
    });
    idsCriados.push(admin.id);
    adminId = admin.id;
    expect(admin.perfil).toBe('ADMIN');
    expect(admin.ativo).toBe(true);
    expect(admin.senhaHash).toMatch(/^\$argon2id\$/);
    expect(admin.senhaHash).not.toBe(senha);
    expect(await new PasswordHashService().verify(admin.senhaHash, senha)).toBe(
      true,
    );

    const inativo = await prisma.usuario.create({
      data: {
        nome: 'Inativo de teste',
        email: emailInativo,
        senhaHash: admin.senhaHash,
        perfil: 'ADMIN',
        ativo: false,
      },
    });
    idsCriados.push(inativo.id);
    inativoId = inativo.id;

    const operador = await prisma.usuario.create({
      data: {
        nome: 'Legado de teste',
        email: emailOperador,
        senhaHash: admin.senhaHash,
        perfil: 'OPERADOR',
        ativo: true,
      },
    });
    idsCriados.push(operador.id);
    operadorId = operador.id;

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: email.toUpperCase(), senha })
      .expect(200);
    token = response.body.token;
  });

  afterAll(async () => {
    if (prisma && idsCriados.length > 0) {
      await prisma.usuario.deleteMany({ where: { id: { in: idsCriados } } });
    }
    await app?.close();
  });

  it('cria só ADMIN, mantém o hash numa segunda execução e emite JWT de uma hora', async () => {
    expect(
      await criarOuAtualizarAdmin(prisma, {
        ADMIN_NOME: 'Outro nome que não deve ser gravado',
        ADMIN_EMAIL: email.toUpperCase(),
        ADMIN_SENHA: 'outra-senha-local-de-integracao',
      }),
    ).toBe('mantido');
    expect(
      await prisma.usuario.count({
        where: { email: { equals: email, mode: 'insensitive' } },
      }),
    ).toBe(1);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: email.toUpperCase(), senha })
      .expect(200);
    expect(response.body.usuario).toEqual({
      id: adminId,
      nome: 'Administradora de teste',
      email,
    });
    expect(JSON.stringify(response.body)).not.toContain(senha);
    expect(JSON.stringify(response.body)).not.toContain('senhaHash');
    const payload = await jwt.verifyAsync<{
      sub: number;
      iat: number;
      exp: number;
    }>(response.body.token);
    expect(payload.sub).toBe(adminId);
    expect(payload.exp - payload.iat).toBe(3600);
    expect(response.body.expiraEm).toBe(
      new Date(payload.exp * 1000).toISOString(),
    );
  });

  it('retorna 400 para dados inválidos e 401 genérico para credenciais recusadas', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'inválido', senha: '' })
      .expect(400);

    for (const credentials of [
      { email, senha: 'senha-errada' },
      { email: `ausente-${randomUUID()}@example.test`, senha },
      { email: emailInativo, senha },
      { email: emailOperador, senha },
    ]) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(credentials)
        .expect(401);
      expect(response.body.message).toBe('E-mail ou senha inválidos');
      expect(response.body).not.toHaveProperty('token');
    }
  });

  it('protege a rota administrativa e /auth/me com o guard global', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/administrativo-teste')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/administrativo-teste')
      .set('Authorization', `Bearer ${token}`)
      .expect(200, { id: adminId });
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(response.body).toEqual({
      id: adminId,
      nome: 'Administradora de teste',
      email,
    });
    expect(response.body).not.toHaveProperty('senhaHash');
    await request(app.getHttpServer()).get('/health').expect(200);
  });

  it('rejeita token inválido, expirado, de usuário inexistente, inativo ou não ADMIN', async () => {
    const tokens = [
      'invalido',
      await new JwtService({ secret: randomUUID() }).signAsync({
        sub: adminId,
      }),
      await jwt.signAsync({ sub: adminId }, { expiresIn: -1 }),
      await jwt.signAsync({ sub: 999999999 }),
      await jwt.signAsync({ sub: inativoId }),
      await jwt.signAsync({ sub: operadorId }),
    ];
    for (const invalidToken of tokens) {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    }
  });

  it('revoga o acesso imediatamente quando o administrador é desativado', async () => {
    await prisma.usuario.update({
      where: { id: adminId },
      data: { ativo: false },
    });
    try {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, senha })
        .expect(401);
    } finally {
      await prisma.usuario.update({
        where: { id: adminId },
        data: { ativo: true },
      });
    }
  });

  it('só troca a senha de uma conta existente mediante opção explícita', async () => {
    const novaSenha = 'nova-senha-local-de-integracao';
    expect(
      await criarOuAtualizarAdmin(
        prisma,
        {
          ADMIN_NOME: 'Administradora de teste',
          ADMIN_EMAIL: email,
          ADMIN_SENHA: novaSenha,
        },
        { atualizarExistente: true },
      ),
    ).toBe('atualizado');

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, senha })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, senha: novaSenha })
      .expect(200);
  });
});

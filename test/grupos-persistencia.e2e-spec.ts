import { randomUUID } from 'node:crypto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { GruposService } from '../src/modules/grupos/grupos.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const PREFIXO = `US05 ${randomUUID()}`;

describe('Persistência de grupos (integração)', () => {
  let module: TestingModule;
  let service: GruposService;
  let prisma: PrismaService;
  let eventoId: number;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    service = module.get(GruposService);
    prisma = module.get(PrismaService);

    const evento = await prisma.evento.create({
      data: {
        nome: `${PREFIXO} Evento`,
        ano: 2098,
        dataInicio: new Date('2098-05-10T00:00:00.000Z'),
        dataFim: new Date('2098-05-12T00:00:00.000Z'),
        quantidadeDias: 3,
      },
    });
    eventoId = evento.id;
  });

  afterAll(async () => {
    await prisma.participante.deleteMany({ where: { eventoId } });
    await prisma.grupo.deleteMany({ where: { eventoId } });
    await prisma.evento.deleteMany({ where: { id: eventoId } });
    await module.close();
  });

  it('cria, lista, consulta e atualiza grupos no PostgreSQL', async () => {
    const alfa = await service.create(eventoId, {
      nome: 'Alfa',
      cor: '#FF5733',
    });

    expect(alfa).toEqual({
      id: alfa.id,
      nome: 'Alfa',
      cor: '#FF5733',
      quantidadeParticipantes: 0,
    });

    const beta = await service.create(eventoId, {
      nome: 'Beta',
      cor: '#3380FF',
    });

    const listados = await service.list(eventoId);
    expect(listados.map((grupo) => grupo.id)).toEqual(
      expect.arrayContaining([alfa.id, beta.id]),
    );

    await expect(service.findById(eventoId, alfa.id)).resolves.toEqual(alfa);

    await expect(
      service.update(eventoId, alfa.id, { nome: 'Alfa Prime' }),
    ).resolves.toMatchObject({ id: alfa.id, nome: 'Alfa Prime' });
  });

  it('retorna 404 ao listar grupos de um evento inexistente', async () => {
    await expect(service.list(999_999_999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('isola grupos por evento (404)', async () => {
    const alfa = await service.create(eventoId, {
      nome: 'Gama',
      cor: '#00AA00',
    });

    await expect(service.findById(999_999_999, alfa.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('recusa excluir grupo com participantes vinculados (409)', async () => {
    const grupo = await service.create(eventoId, {
      nome: 'Delta',
      cor: '#AA00AA',
    });

    await prisma.participante.create({
      data: {
        grupoId: grupo.id,
        eventoId,
        nome: 'Participante de teste',
        matricula: randomUUID().replace(/-/g, '').slice(0, 16),
        turma: 'A1',
      },
    });

    await expect(service.remove(eventoId, grupo.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('exclui grupo sem participantes', async () => {
    const grupo = await service.create(eventoId, {
      nome: 'Epsilon',
      cor: '#555555',
    });

    await expect(service.remove(eventoId, grupo.id)).resolves.toBeUndefined();
  });
});

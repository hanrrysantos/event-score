import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { ParticipantesService } from '../src/modules/participantes/participantes.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const PREFIXO = `US05 ${randomUUID()}`;

function csv(rows: string[][]): Buffer {
  const header = 'nome,matricula,turma,grupo';
  const lines = rows.map((row) => row.join(','));
  return Buffer.from([header, ...lines].join('\n'), 'utf-8');
}

describe('Persistência de participantes (integração)', () => {
  let module: TestingModule;
  let service: ParticipantesService;
  let prisma: PrismaService;
  let eventoId: number;
  let grupoAlfaId: number;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    service = module.get(ParticipantesService);
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

    const grupo = await prisma.grupo.create({
      data: { eventoId, nome: 'Alfa', cor: '#FF5733' },
    });
    grupoAlfaId = grupo.id;
  });

  afterAll(async () => {
    await prisma.participante.deleteMany({ where: { eventoId } });
    await prisma.grupo.deleteMany({ where: { eventoId } });
    await prisma.evento.deleteMany({ where: { id: eventoId } });
    await module.close();
  });

  it('lista participantes com envelope', async () => {
    const result = await service.list(eventoId, { pagina: 1, tamanho: 20 });

    expect(result.dados).toEqual([]);
    expect(result.paginacao.totalItens).toBe(0);
    expect(result.resumo).toEqual({ totalParticipantes: 0 });
  });

  it('pré-visualiza e importa participantes válidos', async () => {
    const file = csv([
      ['João', '2023001', 'A1', 'Alfa'],
      ['Maria', '2023002', 'A2', 'Alfa'],
    ]);

    const preview = await service.previewImport(eventoId, file);
    expect(preview).toEqual({
      totalLinhas: 2,
      validas: 2,
      invalidas: 0,
      erros: [],
    });

    const confirm = await service.confirmImport(eventoId, file);
    expect(confirm.importados).toBe(2);
    expect(confirm.participantes).toHaveLength(2);
    expect(confirm.participantes[0]).toMatchObject({
      nome: 'João',
      matricula: '2023001',
      turma: 'A1',
      grupoId: grupoAlfaId,
      grupoNome: 'Alfa',
    });
  });

  it('detecta matrícula duplicada e grupo inexistente na prévia', async () => {
    const file = csv([
      ['Ana', '2023001', 'A1', 'Alfa'],
      ['Bia', '2023003', 'A3', 'NaoExiste'],
    ]);

    const preview = await service.previewImport(eventoId, file);

    expect(preview.validas).toBe(0);
    expect(preview.invalidas).toBe(2);
    expect(preview.erros).toEqual(
      expect.arrayContaining([
        {
          linha: 2,
          problema: "matricula '2023001' já cadastrada neste evento",
        },
        { linha: 3, problema: "grupo 'NaoExiste' não pertence ao evento" },
      ]),
    );
  });
});

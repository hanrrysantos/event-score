import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { ParticipantesService } from '../src/modules/participantes/participantes.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const PREFIXO = `US05 ${randomUUID()}`;

function csvFile(rows: string[][]): { buffer: Buffer } {
  const header = 'nome,matricula,turma,grupo';
  const lines = rows.map((row) => row.join(','));
  return { buffer: Buffer.from([header, ...lines].join('\n'), 'utf-8') };
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
    const file = csvFile([
      ['João', '2023001', 'A1', 'Alfa'],
      ['Maria', '2023002', 'A2', 'Alfa'],
    ]);

    const preview = await service.previewImport(eventoId, file);
    expect(preview.totalLinhas).toBe(2);
    expect(preview.linhasValidas).toBe(2);
    expect(preview.linhasComErro).toBe(0);
    expect(preview.linhas.every((linha) => linha.status === 'VALIDO')).toBe(
      true,
    );

    const confirm = await service.confirmImport(eventoId, file);
    expect(confirm.importados).toBe(2);
    expect(confirm.participantes).toHaveLength(2);
    expect(confirm.participantes[0]).toMatchObject({
      nome: 'João',
      matricula: '2023001',
      turma: 'A1',
      grupoId: grupoAlfaId,
      grupo: 'Alfa',
    });
  });

  it('detecta matrícula duplicada e grupo inexistente na prévia', async () => {
    const file = csvFile([
      ['Ana', '2023001', 'A1', 'Alfa'],
      ['Bia', '2023003', 'A3', 'NaoExiste'],
    ]);

    const preview = await service.previewImport(eventoId, file);

    expect(preview.linhasValidas).toBe(0);
    expect(preview.linhasComErro).toBe(2);
    expect(preview.linhas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          linha: 2,
          status: 'ERRO',
          motivoErro: "matricula '2023001' já cadastrada neste evento",
        }),
        expect.objectContaining({
          linha: 3,
          status: 'ERRO',
          motivoErro: "grupo 'NaoExiste' não pertence ao evento",
        }),
      ]),
    );
  });

  it('recusa confirmar importação com erro (422) sem gravar', async () => {
    const file = csvFile([
      ['Carlos', '2023004', 'A1', 'Alfa'],
      ['', '', '', ''],
    ]);

    await expect(service.confirmImport(eventoId, file)).rejects.toThrow();
    await expect(
      prisma.participante.count({ where: { eventoId } }),
    ).resolves.toBe(2);
  });
});

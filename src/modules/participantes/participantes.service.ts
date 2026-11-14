import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { Workbook } from 'exceljs';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  ImportacaoConfirmadaDto,
  ImportacaoLinhaDto,
  ImportacaoPrevistaDto,
} from './dto/importacao.dto.js';
import type { ListarParticipantesQueryDto } from './dto/listar-participantes-query.dto.js';
import type { ParticipanteResumoDto } from './dto/participante-resumo.dto.js';

const MIMETYPE_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

interface Row {
  nome: string;
  matricula: string;
  turma: string;
  grupo: string;
}

interface ValidRow extends Row {
  grupoId: number;
}

interface ImportFile {
  buffer: Buffer;
  mimetype?: string;
  originalname?: string;
}

interface ParticipantWithGroup {
  id: number;
  nome: string;
  matricula: string;
  turma: string;
  grupo: { id: number; nome: string };
}

@Injectable()
export class ParticipantesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(eventId: number, query: ListarParticipantesQueryDto) {
    await this.assertEventExists(eventId);

    const { pagina, tamanho, grupoId, turma, busca } = query;

    const where: Prisma.ParticipanteWhereInput = { eventoId: eventId };
    if (grupoId !== undefined) {
      where.grupoId = grupoId;
    }
    if (turma !== undefined && turma !== '') {
      where.turma = turma;
    }
    if (busca !== undefined && busca !== '') {
      where.OR = [
        { nome: { contains: busca, mode: 'insensitive' } },
        { matricula: { contains: busca, mode: 'insensitive' } },
      ];
    }

    const [total, participants] = await Promise.all([
      this.prisma.participante.count({ where }),
      this.prisma.participante.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (pagina - 1) * tamanho,
        take: tamanho,
        include: { grupo: { select: { id: true, nome: true } } },
      }),
    ]);

    return {
      dados: participants.map((participant) => this.toSummary(participant)),
      paginacao: {
        pagina,
        tamanho,
        totalItens: total,
        totalPaginas: Math.ceil(total / tamanho),
      },
      resumo: { totalParticipantes: total },
    };
  }

  async previewImport(
    eventId: number,
    file: ImportFile,
  ): Promise<ImportacaoPrevistaDto> {
    await this.assertEventExists(eventId);

    const rows = await this.parseFile(file);
    const { lines, linhasValidas, linhasComErro } = await this.validateRows(
      eventId,
      rows,
    );

    return {
      totalLinhas: rows.length,
      linhasValidas,
      linhasComErro,
      linhas: lines,
    };
  }

  async confirmImport(
    eventId: number,
    file: ImportFile,
  ): Promise<ImportacaoConfirmadaDto> {
    await this.assertEventExists(eventId);

    const rows = await this.parseFile(file);
    const { valid, lines, linhasValidas, linhasComErro } =
      await this.validateRows(eventId, rows);

    if (linhasComErro > 0) {
      throw new UnprocessableEntityException({
        message: 'Existem linhas com erro na importação',
        totalLinhas: rows.length,
        linhasValidas,
        linhasComErro,
        linhas: lines,
      });
    }

    const created = await this.prisma.$transaction(
      valid.map((row) =>
        this.prisma.participante.create({
          data: {
            eventoId: eventId,
            grupoId: row.grupoId,
            nome: row.nome,
            matricula: row.matricula,
            turma: row.turma,
          },
          include: { grupo: { select: { id: true, nome: true } } },
        }),
      ),
    );

    return {
      importados: created.length,
      participantes: created.map((participant) => this.toSummary(participant)),
    };
  }

  private async parseFile(file: ImportFile): Promise<Row[]> {
    if (this.isXlsx(file)) {
      return this.parseXlsx(file.buffer);
    }
    return this.parseCsv(file.buffer);
  }

  private isXlsx(file: ImportFile): boolean {
    return (
      file.mimetype === MIMETYPE_XLSX ||
      file.originalname?.toLowerCase().endsWith('.xlsx') === true
    );
  }

  private parseCsv(buffer: Buffer): Row[] {
    const csv = buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const records = parse(csv, {
      columns: true,
      delimiter: [';', ','],
      trim: true,
      skip_empty_lines: false,
      relax_column_count: true,
    }) as Record<string, string | undefined>[];

    return records.map((record) => ({
      nome: record.nome ?? '',
      matricula: record.matricula ?? '',
      turma: record.turma ?? '',
      grupo: record.grupo ?? '',
    }));
  }

  private async parseXlsx(buffer: Buffer): Promise<Row[]> {
    const workbook = new Workbook();
    await workbook.xlsx.load(buffer as never);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return [];
    }

    const rows: Row[] = [];
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }
      const values = row.values as unknown[];
      rows.push({
        nome: this.cellToString(values[1]),
        matricula: this.cellToString(values[2]),
        turma: this.cellToString(values[3]),
        grupo: this.cellToString(values[4]),
      });
    });

    return rows;
  }

  private cellToString(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value.trim();
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    return '';
  }

  private async validateRows(
    eventId: number,
    rows: Row[],
  ): Promise<{
    valid: ValidRow[];
    lines: ImportacaoLinhaDto[];
    linhasValidas: number;
    linhasComErro: number;
  }> {
    const groups = await this.prisma.grupo.findMany({
      where: { eventoId: eventId },
      select: { id: true, nome: true },
    });
    const groupIdByName = new Map(
      groups.map((group) => [group.nome.toLowerCase(), group.id]),
    );

    const existingMatriculas = new Set(
      (
        await this.prisma.participante.findMany({
          where: { eventoId: eventId },
          select: { matricula: true },
        })
      ).map((participant) => participant.matricula.toLowerCase()),
    );

    const valid: ValidRow[] = [];
    const lines: ImportacaoLinhaDto[] = [];
    const seenMatriculas = new Set<string>();
    let linhasValidas = 0;
    let linhasComErro = 0;

    rows.forEach((row, index) => {
      const lineNumber = index + 2;
      const problems: string[] = [];

      const nome = row.nome.trim();
      const matricula = row.matricula.trim();
      const turma = row.turma.trim();
      const grupo = row.grupo.trim();

      const isBlank = !nome && !matricula && !turma && !grupo;

      let grupoId: number | undefined;
      if (isBlank) {
        problems.push('linha em branco');
      } else {
        if (!nome) {
          problems.push('nome é obrigatório');
        } else if (nome.length > 150) {
          problems.push('nome excede 150 caracteres');
        }

        if (!matricula) {
          problems.push('matricula é obrigatória');
        } else if (matricula.length > 20) {
          problems.push('matricula excede 20 caracteres');
        }

        if (!turma) {
          problems.push('turma é obrigatória');
        } else if (turma.length > 10) {
          problems.push('turma excede 10 caracteres');
        }

        if (!grupo) {
          problems.push('grupo é obrigatório');
        } else {
          grupoId = groupIdByName.get(grupo.toLowerCase());
          if (grupoId === undefined) {
            problems.push(`grupo '${grupo}' não pertence ao evento`);
          }
        }

        if (matricula) {
          const key = matricula.toLowerCase();
          if (seenMatriculas.has(key)) {
            problems.push(`matricula '${matricula}' duplicada no arquivo`);
          } else if (existingMatriculas.has(key)) {
            problems.push(
              `matricula '${matricula}' já cadastrada neste evento`,
            );
          } else {
            seenMatriculas.add(key);
          }
        }
      }

      if (problems.length > 0) {
        linhasComErro += 1;
        lines.push({
          linha: lineNumber,
          nome,
          matricula,
          turma,
          grupo,
          status: 'ERRO',
          motivoErro: problems.join('; '),
        });
      } else {
        linhasValidas += 1;
        lines.push({
          linha: lineNumber,
          nome,
          matricula,
          turma,
          grupo,
          status: 'VALIDO',
          motivoErro: null,
        });
        valid.push({
          nome,
          matricula,
          turma,
          grupo,
          grupoId: grupoId as number,
        });
      }
    });

    return { valid, lines, linhasValidas, linhasComErro };
  }

  private toSummary(participant: ParticipantWithGroup): ParticipanteResumoDto {
    return {
      id: participant.id,
      nome: participant.nome,
      matricula: participant.matricula,
      turma: participant.turma,
      grupoId: participant.grupo.id,
      grupo: participant.grupo.nome,
    };
  }

  private async assertEventExists(eventId: number): Promise<void> {
    const event = await this.prisma.evento.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }
  }
}

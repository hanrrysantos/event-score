import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import type { PaginacaoQueryDto } from '../../common/dto/paginacao-query.dto.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  ImportacaoConfirmadaDto,
  ImportacaoErroDto,
  ImportacaoPrevistaDto,
} from './dto/importacao.dto.js';
import type { ParticipanteResumoDto } from './dto/participante-resumo.dto.js';

interface Row {
  nome: string;
  matricula: string;
  turma: string;
  grupo: string;
}

interface ValidRow extends Row {
  grupoId: number;
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

  async list(eventId: number, query: PaginacaoQueryDto) {
    await this.assertEventExists(eventId);

    const where = { eventoId: eventId };
    const { pagina, tamanho } = query;

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
    buffer: Buffer,
  ): Promise<ImportacaoPrevistaDto> {
    await this.assertEventExists(eventId);

    const rows = this.parseCsv(buffer);
    const { valid, errors } = await this.validateRows(eventId, rows);

    return {
      totalLinhas: rows.length,
      validas: valid.length,
      invalidas: rows.length - valid.length,
      erros: errors,
    };
  }

  async confirmImport(
    eventId: number,
    buffer: Buffer,
  ): Promise<ImportacaoConfirmadaDto> {
    await this.assertEventExists(eventId);

    const rows = this.parseCsv(buffer);
    const { valid } = await this.validateRows(eventId, rows);

    if (valid.length === 0) {
      throw new BadRequestException('Nenhuma linha válida para importar');
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

  private parseCsv(buffer: Buffer): Row[] {
    const csv = buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string | undefined>[];

    return records.map((record) => ({
      nome: record.nome ?? '',
      matricula: record.matricula ?? '',
      turma: record.turma ?? '',
      grupo: record.grupo ?? '',
    }));
  }

  private async validateRows(
    eventId: number,
    rows: Row[],
  ): Promise<{ valid: ValidRow[]; errors: ImportacaoErroDto[] }> {
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
    const errors: ImportacaoErroDto[] = [];
    const seenMatriculas = new Set<string>();

    rows.forEach((row, index) => {
      const lineNumber = index + 2;
      const problems: string[] = [];

      const nome = row.nome.trim();
      const matricula = row.matricula.trim();
      const turma = row.turma.trim();
      const grupo = row.grupo.trim();

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

      let grupoId: number | undefined;
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
          problems.push(`matricula '${matricula}' já cadastrada neste evento`);
        } else {
          seenMatriculas.add(key);
        }
      }

      if (problems.length > 0) {
        for (const problem of problems) {
          errors.push({ linha: lineNumber, problema: problem });
        }
      } else {
        valid.push({
          nome,
          matricula,
          turma,
          grupo,
          grupoId: grupoId as number,
        });
      }
    });

    return { valid, errors };
  }

  private toSummary(participant: ParticipantWithGroup): ParticipanteResumoDto {
    return {
      id: participant.id,
      nome: participant.nome,
      matricula: participant.matricula,
      turma: participant.turma,
      grupoId: participant.grupo.id,
      grupoNome: participant.grupo.nome,
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

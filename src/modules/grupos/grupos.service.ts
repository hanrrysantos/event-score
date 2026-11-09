import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AtualizarGrupoDto } from './dto/atualizar-grupo.dto.js';
import type { CriarGrupoDto } from './dto/criar-grupo.dto.js';
import type { GrupoResumoDto } from './dto/grupo-resumo.dto.js';

const PARTICIPANTS_INCLUDED = { _count: { select: { participantes: true } } };

type GroupWithCount = {
  id: number;
  nome: string;
  cor: string;
  _count: { participantes: number };
};

@Injectable()
export class GruposService {
  constructor(private readonly prisma: PrismaService) {}

  async list(eventId: number): Promise<GrupoResumoDto[]> {
    await this.assertEventExists(eventId);

    const groups = await this.prisma.grupo.findMany({
      where: { eventoId: eventId },
      orderBy: { id: 'asc' },
      include: PARTICIPANTS_INCLUDED,
    });

    return groups.map((group) => this.toSummary(group));
  }

  async findById(eventId: number, groupId: number): Promise<GrupoResumoDto> {
    const group = await this.prisma.grupo.findUnique({
      where: { id_eventoId: { id: groupId, eventoId: eventId } },
      include: PARTICIPANTS_INCLUDED,
    });

    if (group) {
      return this.toSummary(group);
    }

    await this.assertEventExists(eventId);
    throw new NotFoundException('Grupo não encontrado neste evento');
  }

  async create(eventId: number, dto: CriarGrupoDto): Promise<GrupoResumoDto> {
    await this.assertEventExists(eventId);

    try {
      const group = await this.prisma.grupo.create({
        data: { eventoId: eventId, nome: dto.nome, cor: dto.cor },
        include: PARTICIPANTS_INCLUDED,
      });

      return this.toSummary(group);
    } catch (error) {
      this.mapGroupError(error);
    }
  }

  async update(
    eventId: number,
    groupId: number,
    dto: AtualizarGrupoDto,
  ): Promise<GrupoResumoDto> {
    await this.assertGroupInEvent(eventId, groupId);

    try {
      const group = await this.prisma.grupo.update({
        where: { id_eventoId: { id: groupId, eventoId: eventId } },
        data: dto,
        include: PARTICIPANTS_INCLUDED,
      });

      return this.toSummary(group);
    } catch (error) {
      this.mapGroupError(error);
    }
  }

  async remove(eventId: number, groupId: number): Promise<void> {
    await this.assertGroupInEvent(eventId, groupId);

    const participantCount = await this.prisma.participante.count({
      where: { grupoId: groupId, eventoId: eventId },
    });
    if (participantCount > 0) {
      throw new ConflictException(
        'Não é permitido excluir grupos com participantes vinculados',
      );
    }

    try {
      await this.prisma.grupo.delete({
        where: { id_eventoId: { id: groupId, eventoId: eventId } },
      });
    } catch (error) {
      this.mapGroupError(error);
    }
  }

  private toSummary(group: GroupWithCount): GrupoResumoDto {
    return {
      id: group.id,
      nome: group.nome,
      cor: group.cor,
      quantidadeParticipantes: group._count.participantes,
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

  private async assertGroupInEvent(
    eventId: number,
    groupId: number,
  ): Promise<void> {
    const group = await this.prisma.grupo.findUnique({
      where: { id_eventoId: { id: groupId, eventoId: eventId } },
      select: { id: true },
    });

    if (group) {
      return;
    }

    await this.assertEventExists(eventId);
    throw new NotFoundException('Grupo não encontrado neste evento');
  }

  // Os triggers do banco (V6) usam restrict_violation, que o Prisma expõe como
  // P2003; a violação de unicidade de nome/cor chega como P2002.
  private mapGroupError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Já existe um grupo com esse nome ou cor neste evento',
        );
      }
      if (error.code === 'P2003') {
        throw new ConflictException(
          'Não é permitido alterar grupos de um evento que já possui resultados lançados (RF03)',
        );
      }
    }

    throw error;
  }
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

    const group = await this.prisma.grupo.create({
      data: { eventoId: eventId, nome: dto.nome, cor: dto.cor },
      include: PARTICIPANTS_INCLUDED,
    });

    return this.toSummary(group);
  }

  async update(
    eventId: number,
    groupId: number,
    dto: AtualizarGrupoDto,
  ): Promise<GrupoResumoDto> {
    await this.assertGroupInEvent(eventId, groupId);

    const group = await this.prisma.grupo.update({
      where: { id_eventoId: { id: groupId, eventoId: eventId } },
      data: dto,
      include: PARTICIPANTS_INCLUDED,
    });

    return this.toSummary(group);
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

    await this.prisma.grupo.delete({
      where: { id_eventoId: { id: groupId, eventoId: eventId } },
    });
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
}

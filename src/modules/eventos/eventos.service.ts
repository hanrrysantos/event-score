import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { AtualizarEventoDto } from './dto/atualizar-evento.dto.js';
import type { CriarEventoDto } from './dto/criar-evento.dto.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const DATA_SOMENTE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILISSEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;

export interface DadosEventoValidos {
  nome: string;
  ano: number;
  dataInicio: string;
  dataFim: string;
  quantidadeDias: number;
}

export interface NovoEvento extends DadosEventoValidos {
  ativo: false;
}

export interface EventoCadastrado extends DadosEventoValidos {
  id: number;
  ativo: boolean;
}

export interface EventoPeriodo {
  eventoId: number;
  dataInicio: string;
  dataFim: string;
  quantidadeDias: number;
}

interface EventoPersistido {
  id: number;
  nome: string;
  ano: number;
  dataInicio: Date;
  dataFim: Date;
  quantidadeDias: number;
  ativo: boolean;
}

@Injectable()
export class EventosService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dto: CriarEventoDto): Promise<EventoCadastrado> {
    const dados = this.prepararCriacao(dto);
    const evento = await this.prisma.evento.create({
      data: {
        nome: dados.nome,
        ano: dados.ano,
        dataInicio: this.converterDataParaPersistencia(dados.dataInicio),
        dataFim: this.converterDataParaPersistencia(dados.dataFim),
        quantidadeDias: dados.quantidadeDias,
        ativo: dados.ativo,
      },
    });

    return this.mapearEvento(evento);
  }

  async listar(): Promise<EventoCadastrado[]> {
    const eventos = await this.prisma.evento.findMany({
      orderBy: [{ ano: 'desc' }, { dataInicio: 'desc' }, { id: 'desc' }],
    });

    return eventos.map((evento) => this.mapearEvento(evento));
  }

  async buscarPorId(id: number): Promise<EventoCadastrado> {
    return this.mapearEvento(await this.buscarRegistroPorId(id));
  }

  async buscarAtivo(): Promise<EventoCadastrado> {
    const evento = await this.prisma.evento.findFirst({
      where: { ativo: true },
    });

    if (!evento) {
      throw new NotFoundException('Nenhum evento está ativo no momento');
    }

    return this.mapearEvento(evento);
  }

  async atualizar(
    id: number,
    dto: AtualizarEventoDto,
  ): Promise<EventoCadastrado> {
    const atual = this.mapearEvento(await this.buscarRegistroPorId(id));
    const dados = this.prepararAtualizacao(atual, dto);
    const evento = await this.prisma.evento.update({
      where: { id },
      data: {
        nome: dados.nome,
        ano: dados.ano,
        dataInicio: this.converterDataParaPersistencia(dados.dataInicio),
        dataFim: this.converterDataParaPersistencia(dados.dataFim),
        quantidadeDias: dados.quantidadeDias,
      },
    });

    return this.mapearEvento(evento);
  }

  async ativar(id: number): Promise<EventoCadastrado> {
    const evento = await this.prisma.$transaction(async (tx) => {
      const atual = await tx.evento.findUnique({ where: { id } });

      if (!atual) {
        throw new NotFoundException('Evento não encontrado');
      }

      if (atual.ativo) {
        return atual;
      }

      await tx.evento.updateMany({
        where: { ativo: true, NOT: { id } },
        data: { ativo: false },
      });

      return tx.evento.update({
        where: { id },
        data: { ativo: true },
      });
    });

    return this.mapearEvento(evento);
  }

  async obterPeriodoPorId(id: number): Promise<EventoPeriodo> {
    return this.obterPeriodo(await this.buscarPorId(id));
  }

  prepararCriacao(dto: CriarEventoDto): NovoEvento {
    return {
      ...this.validarDados(dto),
      ativo: false,
    };
  }

  prepararAtualizacao(
    evento: EventoCadastrado,
    dto: AtualizarEventoDto,
  ): EventoCadastrado {
    const dados = this.validarDados({
      nome: dto.nome ?? evento.nome,
      ano: dto.ano ?? evento.ano,
      dataInicio: dto.dataInicio ?? evento.dataInicio,
      dataFim: dto.dataFim ?? evento.dataFim,
      quantidadeDias: dto.quantidadeDias ?? evento.quantidadeDias,
    });

    return {
      ...evento,
      ...dados,
    };
  }

  obterPeriodo(evento: EventoCadastrado): EventoPeriodo {
    return {
      eventoId: evento.id,
      dataInicio: evento.dataInicio,
      dataFim: evento.dataFim,
      quantidadeDias: evento.quantidadeDias,
    };
  }

  validarPertencimentoAoEvento(
    eventoId: number,
    eventoIdDoRecurso: number,
  ): void {
    if (eventoId !== eventoIdDoRecurso) {
      throw new NotFoundException('Recurso não encontrado neste evento');
    }
  }

  private async buscarRegistroPorId(id: number): Promise<EventoPersistido> {
    const evento = await this.prisma.evento.findUnique({ where: { id } });

    if (!evento) {
      throw new NotFoundException('Evento não encontrado');
    }

    return evento;
  }

  private mapearEvento(evento: EventoPersistido): EventoCadastrado {
    return {
      id: evento.id,
      nome: evento.nome,
      ano: evento.ano,
      dataInicio: this.formatarData(evento.dataInicio),
      dataFim: this.formatarData(evento.dataFim),
      quantidadeDias: evento.quantidadeDias,
      ativo: evento.ativo,
    };
  }

  private converterDataParaPersistencia(valor: string): Date {
    return new Date(`${valor}T00:00:00.000Z`);
  }

  private formatarData(valor: Date): string {
    return valor.toISOString().slice(0, 10);
  }

  private validarDados(dados: DadosEventoValidos): DadosEventoValidos {
    const nome = this.validarNome(dados.nome);
    this.validarAno(dados.ano);
    this.validarQuantidadeDias(dados.quantidadeDias);

    const dataInicio = this.converterData(dados.dataInicio, 'dataInicio');
    const dataFim = this.converterData(dados.dataFim, 'dataFim');

    if (dataFim < dataInicio) {
      throw new UnprocessableEntityException(
        'A data de término deve ser igual ou posterior à data de início do evento',
      );
    }

    const diasNoPeriodo =
      Math.floor(
        (dataFim.getTime() - dataInicio.getTime()) / MILISSEGUNDOS_POR_DIA,
      ) + 1;
    if (dados.quantidadeDias > diasNoPeriodo) {
      throw new UnprocessableEntityException(
        'A quantidade de dias não pode exceder o período do evento',
      );
    }

    return {
      nome,
      ano: dados.ano,
      dataInicio: dados.dataInicio,
      dataFim: dados.dataFim,
      quantidadeDias: dados.quantidadeDias,
    };
  }

  private validarNome(valor: string): string {
    if (typeof valor !== 'string') {
      throw new BadRequestException('nome deve ser uma string');
    }

    const nome = valor.trim();
    if (nome.length === 0 || nome.length > 100) {
      throw new BadRequestException(
        'nome deve possuir entre 1 e 100 caracteres',
      );
    }
    return nome;
  }

  private validarAno(valor: number): void {
    if (!Number.isInteger(valor) || valor < 2000 || valor > 2100) {
      throw new BadRequestException(
        'ano deve ser um inteiro entre 2000 e 2100',
      );
    }
  }

  private validarQuantidadeDias(valor: number): void {
    if (!Number.isInteger(valor) || valor < 1) {
      throw new BadRequestException(
        'quantidadeDias deve ser um inteiro maior ou igual a 1',
      );
    }
  }

  private converterData(valor: string, campo: string): Date {
    const correspondencia = DATA_SOMENTE_PATTERN.exec(valor);
    if (!correspondencia) {
      throw new BadRequestException(
        `${campo} deve estar no formato YYYY-MM-DD`,
      );
    }

    const ano = Number(correspondencia[1]);
    const mes = Number(correspondencia[2]);
    const dia = Number(correspondencia[3]);
    const data = new Date(Date.UTC(ano, mes - 1, dia));

    if (
      data.getUTCFullYear() !== ano ||
      data.getUTCMonth() !== mes - 1 ||
      data.getUTCDate() !== dia
    ) {
      throw new BadRequestException(`${campo} deve ser uma data válida`);
    }

    return data;
  }
}

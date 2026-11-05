import { PartialType } from '@nestjs/swagger';
import { CriarEventoDto } from './criar-evento.dto.js';

export class AtualizarEventoDto extends PartialType(CriarEventoDto) {}

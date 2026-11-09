import { PartialType } from '@nestjs/swagger';
import { CriarDiaEventoDto } from './criar-dia-evento.dto.js';

export class AtualizarDiaEventoDto extends PartialType(CriarDiaEventoDto) {}

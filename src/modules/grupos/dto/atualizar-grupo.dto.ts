import { PartialType } from '@nestjs/swagger';
import { CriarGrupoDto } from './criar-grupo.dto.js';

export class AtualizarGrupoDto extends PartialType(CriarGrupoDto) {}

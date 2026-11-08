import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Eventos')
@ApiBearerAuth()
@Controller('eventos')
export class EventosController {}

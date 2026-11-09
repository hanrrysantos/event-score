import { Module } from '@nestjs/common';
import { DiasEventoController } from './dias-evento.controller.js';
import { DiasEventoService } from './dias-evento.service.js';

@Module({
  controllers: [DiasEventoController],
  providers: [DiasEventoService],
})
export class DiasEventoModule {}

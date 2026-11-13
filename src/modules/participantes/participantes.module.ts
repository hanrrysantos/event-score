import { Module } from '@nestjs/common';
import { ParticipantesController } from './participantes.controller.js';
import { ParticipantesService } from './participantes.service.js';

@Module({
  controllers: [ParticipantesController],
  providers: [ParticipantesService],
  exports: [ParticipantesService],
})
export class ParticipantesModule {}

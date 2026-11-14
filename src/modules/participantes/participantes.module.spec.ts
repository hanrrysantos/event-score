import { Test } from '@nestjs/testing';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ParticipantesController } from './participantes.controller.js';
import { ParticipantesModule } from './participantes.module.js';
import { ParticipantesService } from './participantes.service.js';

describe('ParticipantesModule', () => {
  it('disponibiliza controller e service sem acessar o banco', async () => {
    const module = await Test.createTestingModule({
      imports: [ParticipantesModule, PrismaModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    expect(module.get(ParticipantesController)).toBeInstanceOf(
      ParticipantesController,
    );
    expect(module.get(ParticipantesService)).toBeInstanceOf(
      ParticipantesService,
    );
    await module.close();
  });
});

import { Test } from '@nestjs/testing';
import { EventosController } from './eventos.controller.js';
import { EventosModule } from './eventos.module.js';
import { EventosService } from './eventos.service.js';

describe('EventosModule', () => {
  it('disponibiliza controller e service sem acessar o banco', async () => {
    const module = await Test.createTestingModule({
      imports: [EventosModule],
    }).compile();

    expect(module.get(EventosController)).toBeInstanceOf(EventosController);
    expect(module.get(EventosService)).toBeInstanceOf(EventosService);
    await module.close();
  });
});

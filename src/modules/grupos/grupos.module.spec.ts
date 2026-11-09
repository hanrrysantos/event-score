import { Test } from '@nestjs/testing';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { GruposController } from './grupos.controller.js';
import { GruposModule } from './grupos.module.js';
import { GruposService } from './grupos.service.js';

describe('GruposModule', () => {
  it('disponibiliza controller e service sem acessar o banco', async () => {
    const module = await Test.createTestingModule({
      imports: [GruposModule, PrismaModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    expect(module.get(GruposController)).toBeInstanceOf(GruposController);
    expect(module.get(GruposService)).toBeInstanceOf(GruposService);
    await module.close();
  });
});

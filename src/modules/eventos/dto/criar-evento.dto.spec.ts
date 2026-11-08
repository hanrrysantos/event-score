import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AtualizarEventoDto } from './atualizar-evento.dto.js';
import { CriarEventoDto } from './criar-evento.dto.js';

const eventoValido = {
  nome: 'Arena Comp 2026',
  ano: 2026,
  dataInicio: '2026-11-20',
  dataFim: '2026-11-22',
  quantidadeDias: 3,
};

describe('CriarEventoDto', () => {
  it('aceita o payload definido no contrato OpenAPI', async () => {
    const dto = plainToInstance(CriarEventoDto, eventoValido);

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([
    { ...eventoValido, nome: '' },
    { ...eventoValido, nome: 'A'.repeat(101) },
    { ...eventoValido, ano: 1999 },
    { ...eventoValido, ano: 2101 },
    { ...eventoValido, dataInicio: '20/11/2026' },
    { ...eventoValido, dataFim: '2026-02-30' },
    { ...eventoValido, quantidadeDias: 0 },
    { ...eventoValido, quantidadeDias: 1.5 },
  ])('rejeita campo fora do contrato: %o', async (payload) => {
    const dto = plainToInstance(CriarEventoDto, payload);

    expect(await validate(dto)).not.toHaveLength(0);
  });
});

describe('AtualizarEventoDto', () => {
  it('aceita atualização parcial e payload vazio', async () => {
    const parcial = plainToInstance(AtualizarEventoDto, {
      nome: 'Arena Comp 2026 - Edição Especial',
    });
    const vazio = plainToInstance(AtualizarEventoDto, {});

    await expect(validate(parcial)).resolves.toHaveLength(0);
    await expect(validate(vazio)).resolves.toHaveLength(0);
  });

  it('valida os campos opcionais quando informados', async () => {
    const dto = plainToInstance(AtualizarEventoDto, { ano: 1999 });

    expect(await validate(dto)).not.toHaveLength(0);
  });
});

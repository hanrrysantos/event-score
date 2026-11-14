import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AtualizarGrupoDto } from './atualizar-grupo.dto.js';
import { CriarGrupoDto } from './criar-grupo.dto.js';

const grupoValido = {
  nome: 'Alfa',
  cor: '#FF5733',
};

describe('CriarGrupoDto', () => {
  it('aceita o payload definido no contrato OpenAPI', async () => {
    const dto = plainToInstance(CriarGrupoDto, grupoValido);

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([
    { ...grupoValido, nome: '' },
    { ...grupoValido, nome: 'A'.repeat(51) },
    { ...grupoValido, cor: 'FF5733' },
    { ...grupoValido, cor: '#FFF' },
    { ...grupoValido, cor: '#GGGGGG' },
  ])('rejeita campo fora do contrato: %o', async (payload) => {
    const dto = plainToInstance(CriarGrupoDto, payload);

    expect(await validate(dto)).not.toHaveLength(0);
  });
});

describe('AtualizarGrupoDto', () => {
  it('aceita atualização parcial e payload vazio', async () => {
    const parcial = plainToInstance(AtualizarGrupoDto, {
      nome: 'Alfa Prime',
    });
    const vazio = plainToInstance(AtualizarGrupoDto, {});

    await expect(validate(parcial)).resolves.toHaveLength(0);
    await expect(validate(vazio)).resolves.toHaveLength(0);
  });

  it('valida os campos opcionais quando informados', async () => {
    const dto = plainToInstance(AtualizarGrupoDto, { cor: '#XYZ' });

    expect(await validate(dto)).not.toHaveLength(0);
  });
});

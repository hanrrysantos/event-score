import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { PaginacaoQueryDto } from './paginacao-query.dto.js';

describe('PaginacaoQueryDto (Segurança e Limites contra DoS)', () => {
  it('aplica valores padrão seguros (pagina = 1, tamanho = 20) quando omitidos', async () => {
    const dto = plainToInstance(PaginacaoQueryDto, {});

    const erros = await validate(dto);
    expect(erros).toHaveLength(0);
    expect(dto.pagina).toBe(1);
    expect(dto.tamanho).toBe(20);
  });

  it('converte e aceita strings numéricas inteiras dentro dos limites permitidos (1..100)', async () => {
    const dto = plainToInstance(PaginacaoQueryDto, {
      pagina: '3',
      tamanho: '100',
    });

    const erros = await validate(dto);
    expect(erros).toHaveLength(0);
    expect(dto.pagina).toBe(3);
    expect(dto.tamanho).toBe(100);
  });

  it.each([
    { pagina: 0, tamanho: 20 },
    { pagina: -1, tamanho: 20 },
    { pagina: 1.5, tamanho: 20 },
    { pagina: 'abc', tamanho: 20 },
    { pagina: 1, tamanho: 0 },
    { pagina: 1, tamanho: -10 },
    { pagina: 1, tamanho: 25.5 },
    { pagina: 1, tamanho: 'xyz' },
    { pagina: 1, tamanho: 101 },
    { pagina: 1, tamanho: 10000000 },
  ])(
    'rejeita parâmetros inválidos ou tentativa de exaustão de recursos: %o',
    async (query) => {
      const dto = plainToInstance(PaginacaoQueryDto, query);

      const erros = await validate(dto);
      expect(erros.length).toBeGreaterThan(0);
    },
  );
});


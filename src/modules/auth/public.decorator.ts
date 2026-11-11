import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Exceção explícita à autenticação global para rotas públicas. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

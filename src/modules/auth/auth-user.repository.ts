export interface AuthUser {
  id: number;
  nome: string;
  email: string;
  senhaHash: string;
  perfil: string;
  ativo: boolean;
}

// A implementação da consulta ao PostgreSQL pertence à T15.
export abstract class AuthUserRepository {
  abstract findByEmail(email: string): Promise<AuthUser | null>;
}

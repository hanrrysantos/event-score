export interface AuthUser {
  id: number;
  nome: string;
  email: string;
  senhaHash: string;
  perfil: string;
  ativo: boolean;
}

export type AuthUserIdentity = Omit<AuthUser, 'senhaHash'>;

export abstract class AuthUserRepository {
  abstract findByEmail(email: string): Promise<AuthUser | null>;
  abstract findById(id: number): Promise<AuthUserIdentity | null>;
}

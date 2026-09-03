export type UserRole = 'Gestor' | 'Analista' | 'Usuário';

export type CurrentAccessStatus =
  | 'aprovado'
  | 'pendente'
  | 'migracao-pendente'
  | 'nao-cadastrado';

export interface CurrentAccess {
  cadastrado: boolean;
  perfil: UserRole | null;
  acesso_aprovado: boolean | null;
  schema_ready: boolean;
  status_acesso: CurrentAccessStatus;
}

export interface CurrentAccessResponse {
  success: boolean;
  data: CurrentAccess;
  request_id?: string;
  code?: string;
}

export type AccessBlockReason =
  | 'pendente'
  | 'nao-cadastrado'
  | 'migracao-pendente'
  | 'indisponivel'
  | 'perfil';

export function getAccessBlockReason(
  access: CurrentAccess,
): AccessBlockReason | null {
  if (!access.cadastrado || access.status_acesso === 'nao-cadastrado') {
    return 'nao-cadastrado';
  }
  if (!access.schema_ready || access.status_acesso === 'migracao-pendente') {
    return 'migracao-pendente';
  }
  if (access.acesso_aprovado !== true || access.status_acesso === 'pendente') {
    return 'pendente';
  }
  return null;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  telefone?: string;
}

export interface LoginPayload {
  email: string;
  senha: string;
}

export interface RegisterPayload {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
}

export interface AuthResponse {
  token: string;
  usuario: Usuario;
}

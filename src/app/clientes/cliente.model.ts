export interface Cliente {
  id: number;
  codigo: string;
  nome_razao_social: string;
  nome_fantasia: string | null;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ClientePayload {
  codigo: string;
  nome_razao_social: string;
  nome_fantasia: string | null;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  observacoes: string | null;
  ativo: boolean;
}

export type PrioridadePedido = 'normal' | 'alta' | 'urgente';
export type StatusPedido =
  | 'rascunho'
  | 'recebido'
  | 'em_execucao'
  | 'concluido'
  | 'cancelado';

export interface PedidoAnalise {
  id: number;
  codigo: string;
  cliente_id: number;
  cliente_nome?: string;
  cliente_codigo?: string;
  solicitante: string | null;
  descricao: string;
  prioridade: PrioridadePedido;
  data_entrada: string;
  prazo: string | null;
  status: StatusPedido;
  observacoes: string | null;
  total_amostras?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PedidoAnalisePayload {
  codigo: string;
  cliente_id: number;
  solicitante: string | null;
  descricao: string;
  prioridade: PrioridadePedido;
  data_entrada: string;
  prazo: string | null;
  status: StatusPedido;
  observacoes: string | null;
}

export interface AlterarStatusPedidoPayload {
  status: StatusPedido;
  motivo: string | null;
}

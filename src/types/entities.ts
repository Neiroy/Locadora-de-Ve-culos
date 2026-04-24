export type Role = "admin" | "atendente";
export type CarStatus = "disponivel" | "alugado" | "manutencao";
export type RentalStatus = "aberta" | "finalizada" | "cancelada";

export interface Profile {
  id: string;
  nome: string;
  email: string;
  role: Role;
  status?: "ativo" | "inativo";
  updated_at?: string;
  created_at: string;
}

export interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  cnh: string;
  telefone: string | null;
  endereco?: string | null;
  created_at: string;
}

export interface Carro {
  id: string;
  marca: string;
  modelo: string;
  placa: string;
  ano: number;
  cor: string | null;
  km_atual: number;
  valor_diaria: number;
  status: CarStatus;
  observacoes: string | null;
  created_at: string;
}

export interface Locacao {
  id: string;
  cliente_id: string;
  carro_id: string;
  usuario_id: string | null;
  data_retirada: string;
  data_prevista_devolucao: string;
  data_devolucao_real: string | null;
  quantidade_diarias: number;
  valor_diaria: number;
  valor_previsto?: number;
  valor_adicional?: number;
  valor_final?: number;
  valor_total: number;
  dias_extras?: number;
  horas_atraso?: number;
  km_saida: number;
  km_entrada: number | null;
  km_devolucao?: number | null;
  km_rodado: number | null;
  km_rodado_real?: number | null;
  status: RentalStatus;
  observacoes_devolucao: string | null;
  observacao_devolucao?: string | null;
  contrato_observacoes?: string | null;
  testemunha1_nome?: string | null;
  testemunha1_cpf?: string | null;
  testemunha2_nome?: string | null;
  testemunha2_cpf?: string | null;
  contrato_html: string | null;
  created_at: string;
  clientes?: Pick<Cliente, "id" | "nome" | "cpf" | "cnh" | "telefone" | "endereco">;
  carros?: Pick<Carro, "id" | "marca" | "modelo" | "placa" | "ano" | "cor" | "km_atual">;
  profiles?: Pick<Profile, "id" | "nome" | "email">;
}

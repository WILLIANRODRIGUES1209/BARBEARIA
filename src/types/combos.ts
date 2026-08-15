export type ComboTemplate = {
  id: string;
  nome: string;
  descricao: string;
  valor_total: number;
  ativo: boolean;
};

export type ComboTemplateItem = {
  id: string;
  combo_template_id: string;
  procedimento_id: string;
  quantidade: number;
};

export type ComboCliente = {
  id: string;
  cliente_id: string;
  combo_template_id: string | null;
  nome_personalizado: string;
  valor_pago: number;
  data_inicio: string;
  status: 'ATIVO' | 'CONCLUIDO' | 'CANCELADO';
  observacoes: string;
};

export type ComboClienteItem = {
  id: string;
  combo_cliente_id: string;
  procedimento_id: string;
  nome_procedimento: string;
  valor_unitario: number;
  quantidade_contratada: number;
  quantidade_usada: number;
};

export type ComboBaixa = {
  id: string;
  combo_cliente_id: string;
  combo_cliente_item_id: string;
  data_hora: string;
  valor_descontado: number;
  observacao: string;
};

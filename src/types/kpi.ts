export interface Kpi {
  id: string;
  user_id: string;
  pillar_id: string | null;
  pillar_block_id: string | null;
  question: string;
  tags: string[] | null; // Novo campo para tags
  created_at: string;
}

export interface KpiFormData {
  pillar_id: string;
  pillar_block_id: string;
  question: string;
  tags: string; // Usar string para o input do formulário, será convertido para array
}
export interface Kpi {
  id: string;
  user_id: string;
  pillar_id: string | null;
  pillar_block_id: string | null;
  question: string;
  tags: string[] | null; // Novo campo para tags
  created_at: string;

  // Propriedades para exibição com joins
  pillars?: { id: string; description: string } | null; // Adicionado para o join
  pillar_blocks?: { id: string; name: string } | null; // Adicionado para o join
}

export interface KpiFormData {
  pillar_id: string;
  pillar_block_id: string;
  question: string;
  tags: string; // Usar string para o input do formulário, será convertido para array
}
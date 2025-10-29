export interface ClassificationScale {
  id: string;
  user_id: string;
  pillar_id: string | null;
  pillar_block_id: string | null;
  min_percentage: number;
  max_percentage: number;
  classification_label: string;
  color_code: 'red' | 'yellow' | 'blue' | 'green';
  created_at: string;

  // Propriedades para exibição com joins
  pillars?: { description: string } | null;
  pillar_blocks?: { name: string } | null;
}

export interface ClassificationScaleFormData {
  pillar_id: string | ''; // Usar string vazia para 'null' no formulário
  pillar_block_id: string | ''; // Usar string vazia para 'null' no formulário
  min_percentage: number | string; // Usar string para input, converter para number
  max_percentage: number | string; // Usar string para input, converter para number
  classification_label: string;
  color_code: 'red' | 'yellow' | 'blue' | 'green';
}
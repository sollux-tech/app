export interface DiagnosticQuestionnaire {
  id: string;
  user_id: string;
  company_id: string;
  diagnostic_id: string;
  kpi_id: string;
  score_id: string | null; // Alterado para permitir null
  evidence: string | null;
  order_number: number | null; // Adicionado
  created_at: string;
  updated_at: string;

  // Propriedades para exibição com joins
  diagnostics?: {
    id: string;
    companies?: { name: string } | null;
    pillars?: { description: string } | null;
    pillar_blocks?: { name: string } | null;
  } | null;
  kpis?: { question: string; pillar_id: string | null; pillar_block_id: string | null } | null; // Adicionado pillar_id e pillar_block_id
  scoring_scales?: { score: number; description: string } | null;
  profiles?: { first_name: string | null; last_name: string | null } | null;
}

export interface DiagnosticQuestionnaireFormData {
  diagnostic_id: string;
  kpi_id: string;
  score_id: string;
  evidence: string;
  order_number: number; // Adicionado
}
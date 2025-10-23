export interface Diagnostic {
  id: string;
  user_id: string;
  company_id: string;
  pillar_id: string | null;
  pillar_block_id: string | null;
  diagnostic_status_id: string | null;
  created_at: string;
  
  // Propriedades para exibição com joins
  companies?: { name: string } | null;
  pillars?: { description: string } | null;
  pillar_blocks?: { name: string } | null;
  diagnostic_statuses?: { description: string } | null;
}

export interface DiagnosticFormData {
  pillar_id: string;
  pillar_block_id: string;
  diagnostic_status_id: string;
}
export interface Kpi {
  id: string;
  user_id: string;
  pillar_id: string | null;
  pillar_block_id: string | null;
  question: string;
  created_at: string;
}

export interface KpiFormData {
  pillar_id: string;
  pillar_block_id: string;
  question: string;
}
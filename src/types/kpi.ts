export interface Kpi {
  id: string;
  user_id: string;
  name: string;
  pillar_id: string | null;
  pillar_block_id: string | null;
  question: string;
  scoring_scale_id: string | null;
  weight_percentage: number;
  created_at: string;
}

export interface KpiFormData {
  name: string;
  pillar_id: string;
  pillar_block_id: string;
  question: string;
  scoring_scale_id: string;
  weight_percentage: number | string; // Use string for input, coerce to number
}
export interface ScoringScale {
  id: string;
  user_id: string;
  score: number;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface ScoringScaleFormData {
  score: number | string; // Use string for input, coerce to number
  description: string;
  status: boolean; // Represent 'active'/'inactive' as boolean in form
}
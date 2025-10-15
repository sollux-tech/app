export interface PillarBlock {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  pillar_id: string | null;
  weight_percentage: number;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface PillarBlockFormData {
  name: string;
  description: string;
  pillar_id: string;
  weight_percentage: number | string; // Use string for input, coerce to number
  status: boolean; // Represent 'active'/'inactive' as boolean in form
}
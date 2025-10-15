export interface Pillar {
  id: string;
  user_id: string;
  description: string;
  pillar_type_id: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface PillarFormData {
  description: string;
  pillar_type_id: string;
  status: boolean; // Represent 'active'/'inactive' as boolean in form
}
export interface PillarType {
  id: string;
  user_id: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface PillarTypeFormData {
  description: string;
  status: boolean; // Represent 'active'/'inactive' as boolean in form
}
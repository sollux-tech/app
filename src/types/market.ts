export interface Market {
  id: string;
  user_id: string;
  name: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface MarketFormData {
  name: string;
  status: boolean; // Represent 'active'/'inactive' as boolean in form
}
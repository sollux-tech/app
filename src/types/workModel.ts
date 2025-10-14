export interface WorkModel {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface WorkModelFormData {
  name: string;
  description: string;
}
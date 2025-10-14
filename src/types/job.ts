export interface Job {
  id: string;
  company_id: string;
  user_id: string;
  title: string;
  description: string;
  created_at: string;
}

export interface JobFormData {
  title: string;
  description: string;
}
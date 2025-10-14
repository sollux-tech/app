export interface JobSector {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface JobSectorFormData {
  name: string;
  description: string;
}
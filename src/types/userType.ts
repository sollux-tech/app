export interface UserType {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface UserTypeFormData {
  name: string;
  description: string;
}
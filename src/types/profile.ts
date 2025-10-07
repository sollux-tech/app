export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  birthdate: string | null; // Usar string para data no formulário
  city: string | null;
  state: string | null;
  avatar_url: string | null;
  updated_at: string | null;
}

export interface UserProfileFormData {
  first_name: string;
  last_name: string;
  birthdate: string; // Formato 'YYYY-MM-DD'
  city: string;
  state: string;
  avatar_url: string;
}
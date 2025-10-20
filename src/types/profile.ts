export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  birthdate: string | null; // ISO date string
  city: string | null;
  state: string | null;
  avatar_url: string | null;
  updated_at: string | null;
}

export interface BasicProfileInfo {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export interface ProfileFormData {
  first_name: string;
  last_name: string;
  birthdate: Date | undefined;
  city: string;
  state: string;
  avatar_url: string;
}
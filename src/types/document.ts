import { BasicProfileInfo } from './profile'; // Importar BasicProfileInfo

export interface Document {
  id: string;
  creator_user_id: string;
  title: string;
  version: string;
  content: string; // HTML content
  publication_date: string; // ISO date string
  target_user_id: string | null; // Null for all users
  created_at: string;
  updated_at: string;
  creator_profile?: BasicProfileInfo | null; // Adicionado para armazenar o perfil do criador
  target_profile?: BasicProfileInfo | null;  // Adicionado para armazenar o perfil do usuário alvo
}

export interface DocumentFormData {
  title: string;
  version: string;
  content: string;
  publication_date: Date | undefined;
  target_user_id: string | 'all'; // 'all' for all users, or a specific user ID
}
export interface PulseInformative {
  id: string;
  user_id: string;
  title: string;
  content: string;
  publication_date: string | null; // Adicionado campo para data de publicação
  created_at: string;
}

export interface PulseInformativeFormData {
  title: string;
  content: string;
  publication_date: Date | undefined; // Usar Date para o formulário
}
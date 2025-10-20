export interface PulseInformative {
  id: string;
  user_id: string;
  title: string;
  content: string;
  short_summary: string | null; // Novo campo para o resumo
  publication_date: string | null; // Adicionado campo para data de publicação
  created_at: string;
}

export interface PulseInformativeFormData {
  title: string;
  content: string;
  short_summary: string; // Usar string para o formulário
  publication_date: Date | undefined; // Usar Date para o formulário
}
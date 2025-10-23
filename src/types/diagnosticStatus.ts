export interface DiagnosticStatus {
  id: string;
  user_id: string;
  code: string;
  description: string;
  created_at: string;
}

export interface DiagnosticStatusFormData {
  code: string;
  description: string;
}
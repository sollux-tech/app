export interface Form {
  id: string;
  company_id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published';
  questions: Question[];
  response_count: number;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'multiselect' | 'radio' | 'checkbox' | 'date' | 'rating';
  title: string;
  description?: string;
  required: boolean;
  options?: string[]; // Para select, multiselect, radio, checkbox
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface FormResponse {
  id: string;
  form_id: string;
  responses: Record<string, any>;
  created_at: string;
}

export interface FormFormData {
  title: string;
  description: string;
  questions: Question[];
}

export interface QuestionFormData {
  type: Question['type'];
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}
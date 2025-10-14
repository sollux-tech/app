export interface ContractType {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ContractTypeFormData {
  name: string;
  description: string;
}
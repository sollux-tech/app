export interface KpiSmartStatus {
  id: string;
  user_id: string;
  code: number;
  description: string;
  created_at: string;
}

export interface KpiSmartStatusFormData {
  description: string;
}
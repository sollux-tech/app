export interface Notification {
  id: string;
  creator_user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  created_at: string;
  target_type: 'all' | 'users' | 'companies';
  target_user_ids: string[] | null;
  target_company_ids: string[] | null;
}

export interface NotificationFormData {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  target_type: 'all' | 'users' | 'companies';
  target_user_ids: string[];
  target_company_ids: string[];
}
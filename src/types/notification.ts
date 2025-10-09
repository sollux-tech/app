export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  created_at: string;
}

export interface NotificationFormData {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}
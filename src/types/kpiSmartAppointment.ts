export interface KpiSmartAppointment {
  id: string;
  user_id: string;
  kpi_smart_liberated_id: string;
  appointment_date: string;
  evidence: string;
  type: 1 | 2 | 3 | 4; // 1=Quantitativo, 2=Marco, 3=Frequência, 4=Intervalo
  status: 'pending' | 'approved' | 'rejected';
  // Campos para Quantitativo (type=1)
  current_value?: number;
  // Campos para Marco (type=2)
  progress_percentage?: number;
  // Campos para Frequência (type=3)
  performed_executions?: number;
  // Campos para Intervalo (type=4)
  current_value_interval?: number;
  created_at: string;
  updated_at: string;

  // Joins opcionais
  kpi_smart_liberated?: {
    id: string;
    kpi_smart_id: string;
    kpi_smart?: {
      kpi_smart_type_id: number; // Para determinar o tipo
    };
  };
}

export interface KpiSmartAppointmentFormData {
  kpi_smart_liberated_id: string;
  evidence: string;
  type: 1 | 2 | 3 | 4;
  status?: 'pending' | 'approved' | 'rejected';
  // Campos dinâmicos
  current_value?: number;
  progress_percentage?: number;
  performed_executions?: number;
  current_value_interval?: number;
}
export interface KpiSmartAppointment {
  id: string;
  user_id: string;
  kpi_smart_liberated_id: string;
  appointment_date: string; // Data do apontamento
  evidence: string | null; // Evidência do apontamento
  type: 1 | 2 | 3 | 4; // Tipo do KPI Smart (Quantitativo, Marco, Frequência, Intervalo)
  status: 'pending' | 'approved' | 'rejected'; // Status do apontamento

  // Campos específicos para cada tipo de KPI Smart
  current_value?: number | null; // Para Quantitativo e Intervalo
  progress_percentage?: number | null; // Para Marco
  performed_executions?: number | null; // Para Frequência
  current_value_interval?: number | null; // Para Intervalo (valor dentro do intervalo)

  created_at: string;
  updated_at: string;

  // Propriedades para exibição com joins
  kpi_smarts_liberated?: {
    code: number;
    kpi_smart_id: string;
    kpi_smarts?: {
      description: string;
      kpi_smart_types?: { description: string; code: number } | null;
      kpi_smart_units?: { description: string } | null;
    } | null;
  } | null;
}

export interface KpiSmartAppointmentFormData {
  kpi_smart_liberated_id: string;
  appointment_date: Date;
  evidence: string;
  type: 1 | 2 | 3 | 4; // Tipo do KPI Smart
  status: 'pending' | 'approved' | 'rejected';

  current_value?: number | string;
  progress_percentage?: number | string;
  performed_executions?: number | string;
  current_value_interval?: number | string;
}
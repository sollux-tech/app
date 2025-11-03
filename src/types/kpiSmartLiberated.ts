export interface KpiSmartLiberated {
  id: string;
  user_id: string;
  code: number;
  kpi_smart_id: string;
  execution_user_types: string[] | null;
  view_user_types: string[] | null;
  kpi_smart_frequency_id: string | null;
  kpi_smart_status_id: string | null; // Novo campo para o status do KPI Smart Liberado
  status: 'active' | 'inactive';
  created_at: string;

  // Campos para tipo 'Quantitativo'
  logical_comparator: string | null; // Ex: '>=', '<=', '='
  base_value: number | null;
  target_value: number | null;
  deadline_date: string | null; // Novo campo para prazo

  // Campos para tipo 'Marco'
  planned_delivery_date: string | null; // ISO date string
  actual_delivery_date: string | null; // ISO date string
  progress_percentage: number | null; // 0-100

  // Campos para tipo 'Frequência'
  planned_frequency: string | null; // Ex: 'Diário', 'Semanal'
  planned_executions: number | null;
  performed_executions: number | null;

  // Campos para tipo 'Intervalo'
  min_value: number | null;
  max_value: number | null;
  current_value: number | null;

  // Propriedades para exibição com joins
  kpi_smarts?: {
    description: string;
    kpi_smart_types?: { description: string; code: number } | null; // Adicionado 'code'
    kpi_smart_focuses?: { description: string } | null;
    kpi_smart_units?: { description: string } | null;
  } | null;
  kpi_smart_frequencies?: { description: string } | null;
  kpi_smart_statuses?: { description: string } | null; // Adicionado para o join
}

export interface KpiSmartLiberatedFormData {
  kpi_smart_id: string;
  execution_user_types: string[];
  view_user_types: string[];
  kpi_smart_frequency_id: string;
  kpi_smart_status_id: string; // Novo campo para o status do KPI Smart Liberado

  // Campos para tipo 'Quantitativo'
  logical_comparator?: string;
  base_value?: number | string;
  target_value?: number | string;
  deadline_date?: Date; // Novo campo para prazo

  // Campos para tipo 'Marco'
  planned_delivery_date?: Date;
  actual_delivery_date?: Date;
  progress_percentage?: number | string;

  // Campos para tipo 'Frequência'
  planned_frequency?: string;
  planned_executions?: number | string;
  performed_executions?: number | string;

  // Campos para tipo 'Intervalo'
  min_value?: number | string;
  max_value?: number | string;
  current_value?: number | string;
}
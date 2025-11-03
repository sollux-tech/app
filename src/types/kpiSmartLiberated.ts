export interface KpiSmartLiberated {
  id: string;
  user_id: string;
  code: number;
  kpi_smart_id: string;
  execution_user_ids: string[] | null; // Alterado para user_ids
  view_user_ids: string[] | null; // Alterado para user_ids
  kpi_smart_frequency_id: string | null;
  kpi_smart_status_id: string | null; // Adicionado
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
    id: string; // Adicionado para o filtro
    description: string;
    pillar_id: string; // Adicionado para o filtro
    kpi_smart_types?: { description: string; code: number } | null; // Adicionado 'code'
    kpi_smart_focuses?: { description: string } | null;
    kpi_smart_units?: { description: string } | null;
  } | null;
  kpi_smart_frequencies?: { description: string } | null;
  kpi_smart_statuses?: { description: string; id: string } | null; // Adicionado
}

export interface KpiSmartLiberatedFormData {
  kpi_smart_id: string;
  pillar_id: string; // Adicionado ao formulário
  execution_user_ids: string[] | null; // Alterado para user_ids
  view_user_ids: string[] | null; // Alterado para user_ids
  kpi_smart_frequency_id: string;
  kpi_smart_status_id: string; // Adicionado

  // Campos para tipo 'Quantitativo'
  logical_comparator?: string | null;
  base_value?: number | null;
  target_value?: number | null;
  deadline_date?: Date | null; // Novo campo para prazo

  // Campos para tipo 'Marco'
  planned_delivery_date?: Date | null;
  actual_delivery_date?: Date | null;
  progress_percentage?: number | null;

  // Campos para tipo 'Frequência'
  planned_frequency?: string | null;
  planned_executions?: number | null;
  performed_executions?: number | null;

  // Campos para tipo 'Intervalo'
  min_value?: number | null;
  max_value?: number | null;
  current_value?: number | null;
}
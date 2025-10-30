export interface KpiSmartLiberated {
  id: string;
  user_id: string;
  code: number;
  kpi_smart_id: string;
  execution_user_types: string[] | null;
  view_user_types: string[] | null;
  kpi_smart_frequency_id: string | null;
  created_at: string;

  // Propriedades para exibição com joins
  kpi_smarts?: {
    description: string;
    kpi_smart_types?: { description: string } | null;
    kpi_smart_focuses?: { description: string } | null;
    kpi_smart_units?: { description: string } | null;
  } | null;
  kpi_smart_frequencies?: { description: string } | null;
}

export interface KpiSmartLiberatedFormData {
  kpi_smart_id: string;
  execution_user_types: string[];
  view_user_types: string[];
  kpi_smart_frequency_id: string;
}
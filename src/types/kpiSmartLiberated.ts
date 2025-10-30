export interface KpiSmartLiberated {
  id: string;
  user_id: string;
  code: number;
  kpi_smart_id: string;
  created_at: string;

  // Propriedades para exibição com joins
  kpi_smarts?: { description: string } | null;
}

export interface KpiSmartLiberatedFormData {
  kpi_smart_id: string;
}
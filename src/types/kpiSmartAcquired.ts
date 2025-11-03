export interface KpiSmartAcquired {
  id: string;
  user_id: string;
  company_id: string;
  code: number;
  kpi_smart_id: string;
  status: 'active' | 'inactive';
  created_at: string;

  // Propriedades para exibição com joins
  kpi_smarts?: {
    description: string;
    kpi_smart_types?: { description: string; code: number } | null;
    kpi_smart_focuses?: { description: string } | null;
    kpi_smart_units?: { description: string } | null;
    pillar_id?: string; // Adicionado para facilitar o filtro
  } | null;
}

export interface KpiSmartAcquiredFormData {
  pillar_id: string; // Adicionado para o formulário
  kpi_smart_id: string;
  status: boolean; // Represent 'active'/'inactive' as boolean in form
}
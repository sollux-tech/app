export interface KpiSmartAcquired {
  id: string;
  user_id: string;
  company_id: string;
  code: number;
  kpi_smart_id: string;
  pillar_id: string; // Adicionado pillar_id
  status: 'active' | 'inactive';
  created_at: string;

  // Propriedades para exibição com joins
  kpi_smarts?: {
    description: string;
    pillar_id: string; // Adicionado para o join
    kpi_smart_types?: { description: string; code: number } | null;
    kpi_smart_focuses?: { description: string } | null;
    kpi_smart_units?: { description: string } | null;
  } | null;
}

export interface KpiSmartAcquiredFormData {
  pillar_id: string; // Adicionado pillar_id
  kpi_smart_id: string;
  status: boolean; // Represent 'active'/'inactive' as boolean in form
}
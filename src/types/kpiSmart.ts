export interface KpiSmart {
  id: string;
  user_id: string;
  code: number;
  description: string;
  pillar_id: string | null;
  kpi_smart_type_id: string | null;
  kpi_smart_action_verb_id: string | null;
  kpi_smart_focus_id: string | null;
  kpi_smart_unit_id: string | null;
  status: 'active' | 'inactive';
  created_at: string;

  // Propriedades para exibição com joins
  pillars?: { description: string } | null;
  kpi_smart_types?: { description: string; code: number } | null; // Adicionado 'code: number'
  kpi_smart_action_verbs?: { description: string } | null;
  kpi_smart_focuses?: { description: string } | null;
  kpi_smart_units?: { description: string } | null;
}

export interface KpiSmartFormData {
  description: string;
  pillar_id: string;
  kpi_smart_type_id: string;
  kpi_smart_action_verb_id: string;
  kpi_smart_focus_id: string;
  kpi_smart_unit_id: string;
  status: boolean; // Represent 'active'/'inactive' as boolean in form
}
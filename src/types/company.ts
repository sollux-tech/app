export interface Company {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  
  // Dados Básicos
  sector_market_id: string | null;
  annual_revenue_range: '<R$1M' | 'R$1-10M' | 'R$10-50M' | 'R$50M-R$200M' | 'R$200M-R$500M' | '>R$500M' | null;
  num_employees_range: '<10' | '10-50' | '50-200' | '200-500' | '500-1000' | '>1000' | null;
  time_in_market_years: number | null;

  // Análise Estratégica
  strengths: string[] | null;
  weaknesses: string[] | null;
  opportunities: string[] | null;
  threats: string[] | null;

  // Desafios e Objetivos
  urgent_problem: string | null;
  main_goal: string | null;
  main_competitors: string[] | null;
  critical_success_factors: string[] | null;

  // Operações e Tomada de Decisão
  decision_making_process: string | null;
  tools_technologies: string[] | null;
  kpis_monitored: string[] | null;

  // Perspectivas Futuras
  business_model_changes: string | null;
  priority_investments: string[] | null;
}

export interface CompanyFormData {
  name: string;
  
  // Dados Básicos
  sector_market_id: string;
  annual_revenue_range: '<R$1M' | 'R$1-10M' | 'R$10-50M' | 'R$50M-R$200M' | 'R$200M-R$500M' | '>R$500M' | '';
  num_employees_range: '<10' | '10-50' | '50-200' | '200-500' | '500-1000' | '>1000' | '';
  time_in_market_years: number | string; // Usar string para input, converter para number

  // Análise Estratégica (campos de texto para arrays)
  strengths: string;
  weaknesses: string;
  opportunities: string;
  threats: string;

  // Desafios e Objetivos
  urgent_problem: string;
  main_goal: string;
  main_competitors: string; // Campo de texto para array
  critical_success_factors: string; // Campo de texto para array

  // Operações e Tomada de Decisão
  decision_making_process: string;
  tools_technologies: string; // Campo de texto para array
  kpis_monitored: string; // Campo de texto para array

  // Perspectivas Futuras
  business_model_changes: string;
  priority_investments: string; // Campo de texto para array
}
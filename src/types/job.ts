export interface Job {
  id: string;
  company_id: string;
  user_id: string;
  title: string;
  created_at: string;
  
  // New fields
  job_sector_id: string | null;
  contract_type_id: string | null;
  work_model_id: string | null;
  city: string | null;
  state: string | null;
  publication_deadline_days: number | null;
  status: 'active' | 'inactive';
  short_summary: string | null;
  detailed_description: string | null;
  mandatory_requirements: string[] | null;
  differential_requirements: string[] | null;
  benefits: string[] | null;
  salary_min: number | null;
  salary_max: number | null;
  hashtags: string[] | null;
}

export interface JobFormData {
  title: string;
  job_sector_id: string;
  contract_type_id: string;
  work_model_id: string;
  city: string;
  state: string;
  publication_deadline_days: number | string; // Use string for input, coerce to number
  status: boolean; // Using boolean for the Switch component
  short_summary: string;
  detailed_description: string;
  mandatory_requirements: string; // Handled as string in form
  differential_requirements: string; // Handled as string in form
  benefits: string; // Handled as string in form
  salary_min: number | string; // Use string for input, coerce to number
  salary_max: number | string; // Use string for input, coerce to number
  hashtags: string; // Handled as string in form
}
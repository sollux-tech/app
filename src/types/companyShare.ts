export interface SharedUser {
  id: string; // This is the ID of the share record itself
  user_id: string;
  full_name: string;
}

export interface CompanyWithProfile {
  id: string;
  user_id: string | null;
  name: string;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export interface CompanyShareWithCompanyAndProfile {
  id: string; // ID of the company_share record
  shared_with_user_id: string;
  companies: CompanyWithProfile[]; // Alterado para ser um array
}
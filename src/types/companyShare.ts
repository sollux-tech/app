export interface SharedUser {
  id: string; // This is the ID of the share record itself
  user_id: string;
  full_name: string;
}

export interface CompanyShareResponse {
  id: string;
  shared_with_user_id: string;
  profiles: { // Corrigido para ser um objeto, pois a relação é um-para-um
    first_name: string | null;
    last_name: string | null;
  } | null;
}
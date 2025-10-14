export interface SharedUser {
  id: string; // This is the ID of the share record itself
  user_id: string;
  full_name: string;
}

export interface CompanyShareResponse {
  id: string;
  shared_with_user_id: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  }[] | null; // A inferência de tipo do Supabase pode retornar um array aqui
}
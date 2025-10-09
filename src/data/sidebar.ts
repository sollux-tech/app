import { supabase } from '@/integrations/supabase/client';
import { SidebarConfig } from '@/types/sidebar';

export const defaultNavItems = [
  {id: "pulse", label: "PULSE", to: "/pulse", icon: "HeartPulse", order: 1},
  {id: "id", label: "ID", to: "/id", icon: "Fingerprint", order: 2},
  {id: "connect", label: "CONNECT", to: "/connect", icon: "Link", order: 3},
  {id: "ops", label: "OPS", to: "/ops", icon: "Settings", order: 4},
  {id: "core", label: "CORE", to: "/core", icon: "Box", order: 5}
];

export const getOrCreateSidebarConfig = async (userId: string): Promise<SidebarConfig> => {
  const { data, error } = await supabase
    .from('sidebar_configs')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') { // No config found, create one
    const { data: newConfig, error: insertError } = await supabase
      .from('sidebar_configs')
      .insert({
        user_id: userId,
        nav_items: defaultNavItems,
        logo_url: null
      })
      .select()
      .single();
    
    if (insertError) {
      console.error("Error creating default sidebar config:", insertError);
      throw insertError;
    }
    return newConfig;
  }

  if (error) {
    console.error("Error fetching sidebar config:", error);
    throw error;
  }

  return data;
};
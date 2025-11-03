import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { KpiSmartAppointment } from '@/types/kpiSmartAppointment';

export const useKpiSmartAppointments = (userId: string, companyId: string, filters: any) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<KpiSmartAppointment[], Error>({
    queryKey: ['kpiSmartAppointments', userId, companyId, filters],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_smart_appointments')
        .select(`
          *,
          kpi_smart_liberated(kpi_smart_id, kpi_smart(kpi_smart_type_id))
        `)
        .eq('user_id', userId)
        .eq('kpi_smart_liberated.company_id', companyId)
        .order('appointment_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId && !!companyId,
  });

  const createAppointment = useMutation({
    mutationFn: async (appointment: Omit<KpiSmartAppointment, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('kpi_smart_appointments').insert(appointment).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kpiSmartAppointments', userId, companyId] }),
  });

  const updateAppointment = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<KpiSmartAppointment>) => {
      const { data, error } = await supabase.from('kpi_smart_appointments').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kpiSmartAppointments', userId, companyId] }),
  });

  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kpi_smart_appointments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kpiSmartAppointments', userId, companyId] }),
  });

  return { appointments: data, isLoading, error, createAppointment, updateAppointment, deleteAppointment };
};
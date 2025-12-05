import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { showSuccess, showError } from '@/utils/toast';
import { format } from 'date-fns';
import KpiApontamentosForm from '@/components/KpiApontamentosForm';
import * as z from 'zod';

const appointmentFormSchema = z.object({
    value: z.coerce.number({
        invalid_type_error: "O valor deve ser um número.",
        required_error: "O valor é obrigatório."
    }).positive({ message: "O valor deve ser positivo." }),
    note: z.string().optional().nullable(),
    appointment_date: z.date({ required_error: "A data do apontamento é obrigatória." }),
});

type AppointmentFormData = z.infer<typeof appointmentFormSchema>;

const KpiApontamentoFormPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useSession();
    const { id: kpiLiberatedId, appointmentId } = useParams<{ id: string; appointmentId?: string }>();

    // Fetch KPI details
    const { data: kpiDetails, isLoading: isLoadingKpi } = useQuery<any, Error>({
        queryKey: ['kpiSmartLiberatedDetails', kpiLiberatedId],
        queryFn: async () => {
            if (!kpiLiberatedId || !user?.id) return null;
            const { data, error } = await supabase
                .from('kpi_smarts_liberated')
                .select(`
          id, code,
          kpi_smarts(
            description,
            kpi_smart_types(description),
            kpi_smart_units(description)
          )
        `)
                .eq('id', kpiLiberatedId)
                .eq('user_id', user.id)
                .single();
            if (error) throw error;

            const kpiSmart = Array.isArray(data.kpi_smarts) ? data.kpi_smarts[0] : data.kpi_smarts;
            if (kpiSmart) {
                kpiSmart.kpi_smart_units = Array.isArray(kpiSmart.kpi_smart_units) ? kpiSmart.kpi_smart_units[0] : kpiSmart.kpi_smart_units;
                kpiSmart.kpi_smart_types = Array.isArray(kpiSmart.kpi_smart_types) ? kpiSmart.kpi_smart_types[0] : kpiSmart.kpi_smart_types;
            }

            return {
                ...data,
                kpi_smarts: kpiSmart
            };
        },
        enabled: !!kpiLiberatedId && !!user?.id,
    });

    // Fetch appointment if editing
    const { data: appointment, isLoading: isLoadingAppointment } = useQuery<any, Error>({
        queryKey: ['appointment', appointmentId],
        queryFn: async () => {
            if (!appointmentId) return null;
            const { data, error } = await supabase
                .from('kpi_apontamentos')
                .select('*')
                .eq('id', appointmentId)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!appointmentId,
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data: AppointmentFormData) => {
            if (!kpiLiberatedId) throw new Error("ID do KPI faltando.");
            const { error } = await supabase.from('kpi_apontamentos').insert({
                kpi_smart_liberated_id: kpiLiberatedId,
                value: data.value,
                note: data.note || null,
                appointment_date: format(data.appointment_date, 'yyyy-MM-dd'),
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments', kpiLiberatedId] });
            showSuccess('Apontamento criado com sucesso!');
            navigate(`/ops/shift/kpi-apontamentos/${kpiLiberatedId}`);
        },
        onError: (error: Error) => {
            showError(`Erro ao criar apontamento: ${error.message}`);
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async (data: AppointmentFormData) => {
            if (!appointmentId) throw new Error("ID do apontamento faltando.");
            const { error } = await supabase.from('kpi_apontamentos').update({
                value: data.value,
                note: data.note || null,
                appointment_date: format(data.appointment_date, 'yyyy-MM-dd'),
            }).eq('id', appointmentId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments', kpiLiberatedId] });
            showSuccess('Apontamento atualizado com sucesso!');
            navigate(`/ops/shift/kpi-apontamentos/${kpiLiberatedId}`);
        },
        onError: (error: Error) => {
            showError(`Erro ao atualizar apontamento: ${error.message}`);
        },
    });

    const handleSubmit = (data: AppointmentFormData) => {
        if (appointmentId) {
            updateMutation.mutate(data);
        } else {
            createMutation.mutate(data);
        }
    };

    if (isLoadingKpi || isLoadingAppointment) {
        return <div className="text-center text-muted-foreground py-8">Carregando...</div>;
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    onClick={() => navigate(`/ops/shift/kpi-apontamentos/${kpiLiberatedId}`)}
                    className="gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {appointmentId ? 'Editar Apontamento' : 'Novo Apontamento'}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        KPI: {kpiDetails?.kpi_smarts?.description || 'Carregando...'}
                    </p>
                </CardHeader>
                <CardContent>
                    <KpiApontamentosForm
                        open={true}
                        onOpenChange={(open) => {
                            if (!open) navigate(`/ops/shift/kpi-apontamentos/${kpiLiberatedId}`);
                        }}
                        onSubmit={handleSubmit}
                        initialData={appointment ? {
                            value: appointment.value?.toString() || '',
                            note: appointment.note || '',
                            appointment_date: new Date(appointment.appointment_date),
                        } : null}
                        isLoading={createMutation.isPending || updateMutation.isPending}
                        kpiLiberatedId={kpiLiberatedId!}
                        unit={kpiDetails?.kpi_smarts?.kpi_smart_units?.description}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default KpiApontamentoFormPage;

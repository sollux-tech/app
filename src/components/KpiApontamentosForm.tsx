import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import DatePicker from '@/components/DatePicker'; // Assumindo que DatePicker já existe
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';

// Schema de validação para o formulário de apontamento
const appointmentFormSchema = z.object({
  value: z.coerce.number({
    invalid_type_error: "O valor deve ser um número.",
    required_error: "O valor é obrigatório."
  }).positive({ message: "O valor deve ser positivo." }),
  note: z.string().optional().nullable(),
  appointment_date: z.date({ required_error: "A data do apontamento é obrigatória." }),
});

type AppointmentFormData = z.infer<typeof appointmentFormSchema>;

interface KpiApontamentosFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AppointmentFormData) => void;
  initialData?: AppointmentFormData | null; // Dados para edição
  isLoading: boolean;
  kpiLiberatedId: string; // ID do KPI Smart Liberado associado
}

const KpiApontamentosForm: React.FC<KpiApontamentosFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
  kpiLiberatedId,
}) => {
  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      value: undefined,
      note: '',
      appointment_date: new Date(), // Default para data atual
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        value: initialData.value,
        note: initialData.note || '',
        appointment_date: initialData.date || new Date(),
      });
    } else {
      form.reset({
        value: undefined,
        note: '',
        appointment_date: new Date(),
      });
    }
  }, [initialData, form, open]);

  const handleSubmit = (data: AppointmentFormData) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card backdrop-blur-md rounded-2xl shadow-lg border border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{initialData ? 'Editar Apontamento' : 'Novo Apontamento'}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Registre o valor e detalhes para o KPI Smart Liberado.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Valor</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 150.50"
                      {...field}
                      value={field.value ?? ''} // Garante que o valor seja string para o input
                      onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} // Converte para float ou undefined
                      className="rounded-lg"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="appointment_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-foreground text-left">Data do Apontamento</FormLabel>
                  <FormControl>
                    <DatePicker
                      date={field.value || undefined}
                      setDate={field.onChange}
                      placeholder="Selecione a data"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Nota (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Adicione um comentário opcional..."
                      {...field}
                      className="rounded-lg"
                      rows={3}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="rounded-lg">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {initialData ? 'Salvando...' : 'Registrando...'}
                  </>
                ) : (
                  initialData ? 'Salvar Alterações' : 'Registrar Apontamento'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default KpiApontamentosForm;
</dyad-file>

**2. Criação da Página `ops/shift/kpi-apontamentos/[kpiLiberatedId].tsx`**

Esta página exibirá a lista de apontamentos para um `kpi_smart_liberated_id` específico e permitirá adicionar novos.

<dyad-file path="src/pages/KpiApontamentosPage.tsx" description="Criando a página para gerenciar apontamentos de KPIs Smart Liberados.">
```typescript
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Loader2, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/components/CompanyContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DatePicker from '@/components/DatePicker'; // Assumindo que DatePicker já existe
import { Appointment } from '@/types/appointment'; // Assumindo que Appointment type existe
import KpiApontamentosForm from '@/components/KpiApontamentosForm'; // Novo componente de modal

// Schema para o formulário de apontamento (usado no modal)
const appointmentFormSchema = z.object({
  value: z.coerce.number({
    invalid_type_error: "O valor deve ser um número.",
    required_error: "O valor é obrigatório."
  }).positive({ message: "O valor deve ser positivo." }),
  note: z.string().optional().nullable(),
  appointment_date: z.date({ required_error: "A data do apontamento é obrigatória." }),
});

type AppointmentFormData = z.infer<typeof appointmentFormSchema>;

const KpiApontamentosPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { selectedCompany } = useCompany();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [currentKpiLiberatedId, setCurrentKpiLiberatedId] = useState<string | null>(null); // Para saber qual KPI estamos editando/adicionando

  // Buscar o ID do KPI Smart Liberado da URL
  const { id: kpiLiberatedIdFromUrl } = useParams<{ id: string }>();

  // Fetch details of the specific KpiSmartLiberated
  const { data: kpiLiberatedDetails, isLoading: isLoadingKpiLiberatedDetails, error: errorKpiLiberatedDetails } = useQuery<any, Error>({
    queryKey: ['kpiSmartLiberatedDetails', kpiLiberatedIdFromUrl],
    queryFn: async () => {
      if (!kpiLiberatedIdFromUrl || !user?.id) return null;
      const { data, error } = await supabase
        .from('kpi_smarts_liberated')
        .select(`
          id, code, kpi_smart_id,
          kpi_smarts(description, kpi_smart_types(description), kpi_smart_focuses(description), kpi_smart_units(description)),
          execution_user_ids, view_user_ids
        `)
        .eq('id', kpiLiberatedIdFromUrl)
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!kpiLiberatedIdFromUrl && !!user?.id,
    retry: false,
  });

  // Fetch all appointments for the specific kpi_smart_liberated_id
  const { data: appointments, isLoading: isLoadingAppointments, error: errorAppointments } = useQuery<Appointment[], Error>({
    queryKey: ['appointments', kpiLiberatedIdFromUrl, user?.id],
    queryFn: async () => {
      if (!kpiLiberatedIdFromUrl || !user?.id) return [];
      const { data, error } = await supabase
        .from('kpi_apontamentos')
        .select('*')
        .eq('kpi_smart_liberated_id', kpiLiberatedIdFromUrl)
        .order('appointment_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!kpiLiberatedIdFromUrl && !!user?.id,
  });

  // Mutation para criar um novo apontamento
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      if (!kpiLiberatedIdFromUrl || !user?.id) throw new Error("ID do KPI Smart Liberado ou usuário faltando.");
      const { error } = await supabase.from('kpi_apontamentos').insert({
        kpi_smart_liberated_id: kpiLiberatedIdFromUrl,
        value: data.value,
        note: data.note || null,
        appointment_date: format(data.appointment_date, 'yyyy-MM-dd'),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', kpiLiberatedIdFromUrl, user?.id] });
      showSuccess('Apontamento registrado com sucesso!');
      setIsFormDialogOpen(false);
      setEditingAppointment(null);
    },
    onError: (error: Error) => {
      showError(`Erro ao registrar apontamento: ${error.message}`);
    },
  });

  // Mutation para editar um apontamento
  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      if (!editingAppointment?.id) throw new Error("ID do apontamento está faltando.");
      const { error } = await supabase.from('kpi_apontamentos').update({
        value: data.value,
        note: data.note || null,
        appointment_date: format(data.appointment_date, 'yyyy-MM-dd'),
      }).eq('id', editingAppointment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', kpiLiberatedIdFromUrl, user?.id] });
      showSuccess('Apontamento atualizado com sucesso!');
      setIsFormDialogOpen(false);
      setEditingAppointment(null);
    },
    onError: (error: Error) => {
      showError(`Erro ao atualizar apontamento: ${error.message}`);
    },
  });

  // Mutation para excluir um apontamento
  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kpi_apontamentos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', kpiLiberatedIdFromUrl, user?.id] });
      showSuccess('Apontamento excluído com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao excluir apontamento: ${error.message}`);
    },
  });

  const handleAddClick = () => {
    setEditingAppointment(null);
    setIsFormDialogOpen(true);
  };

  const handleEditClick = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsFormDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este apontamento?')) {
      deleteAppointmentMutation.mutate(id);
    }
  };

  const isMutating = createAppointmentMutation.isPending || updateAppointmentMutation.isPending || deleteAppointmentMutation.isPending;

  const handleFormSubmit = (data: AppointmentFormData) => {
    if (editingAppointment) {
      updateAppointmentMutation.mutate(data);
    } else {
      createAppointmentMutation.mutate(data);
    }
  };

  if (isLoadingKpiLiberatedDetails || isLoadingAppointments) {
    return <div className="text-center text-muted-foreground py-8">Carregando dados...</div>;
  }

  if (errorKpiLiberatedDetails || errorAppointments) {
    return <div className="text-center text-destructive">Erro ao carregar dados: {errorKpiLiberatedDetails?.message || errorAppointments?.message}</div>;
  }

  if (!kpiLiberatedDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-md bg-card backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-sollux-red">KPI Smart Liberado não encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">O KPI Smart Liberado que você está tentando gerenciar não existe ou você não tem permissão.</p>
            <Button onClick={() => navigate('/ops/shift')} className="mt-4 rounded-lg bg-sollux-red hover:bg-sollux-orange">
              Voltar para a lista de KPIs Liberados
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader>
          <div>
            <CardTitle className="text-foreground uppercase font-bold">Apontamentos para: {kpiLiberatedDetails.kpi_smarts?.description || 'KPI Smart Desconhecido'}</CardTitle>
            <CardDescription className="text-muted-foreground">
              Código: {kpiLiberatedDetails.code} | Tipo: {kpiLiberatedDetails.kpi_smarts?.kpi_smart_types?.description || 'N/A'}
            </CardDescription>
          </div>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Apontamento
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Valor</TableHead>
                <TableHead className="text-foreground">Nota</TableHead>
                <TableHead className="text-foreground">Data</TableHead>
                <TableHead className="text-right text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments && appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum apontamento registrado para este KPI Smart Liberado.
                  </TableCell>
                </TableRow>
              ) : (
                appointments?.map((appt) => (
                  <TableRow key={appt.id}>
                    <TableCell className="font-medium text-foreground">{appt.value !== null ? appt.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{appt.note || 'Sem nota'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {appt.appointment_date ? format(new Date(appt.appointment_date), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(appt)}
                        className="mr-2 text-foreground hover:bg-accent rounded-lg"
                        disabled={isMutating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(appt.id)}
                        className="bg-sollux-red hover:bg-red-700 text-white rounded-lg"
                        disabled={isMutating}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <KpiApontamentosForm
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        onSubmit={handleFormSubmit}
        initialData={editingAppointment ? {
          value: editingAppointment.value?.toString() || '',
          note: editingAppointment.note || '',
          date: new Date(editingAppointment.appointment_date),
        } : null}
        isLoading={isMutating}
        kpiLiberatedId={kpiLiberatedIdFromUrl!}
      />
    </div>
  );
};

export default KpiApontamentosPage;
</dyad-file>

**3. Atualização do `src/pages/OpsPage.tsx`**

Precisamos adicionar um novo `FeatureCard` para o link para a nova página de apontamentos.

<dyad-write path="src/pages/OpsPage.tsx" description="Adicionando link para a página de Apontamentos de KPIs na página OPS.">
```typescript
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import FeatureCard from '@/components/FeatureCard';
import { Brain, Target, TrendingUp, ListChecks } from 'lucide-react'; // Importar ListChecks

const OpsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleInsightClick = () => {
    navigate('/ops/insight');
  };

  const handleShiftClick = () => {
    navigate('/ops/shift'); // Rota para a nova ShiftPage
  };

  const handleFlowClick = () => {
    navigate('/ops/flow'); // Navega para a nova página FlowPage
  };

  // Nova função para navegar para a página de apontamentos
  const handleKpiApontamentosClick = () => {
    // Precisamos decidir como navegar aqui. Se houver um KPI selecionado, ir para ele.
    // Se não, talvez ir para uma página que lista os KPIs liberados e permite escolher.
    // Por enquanto, vamos assumir que a navegação será feita a partir de uma lista de KPIs liberados.
    // Se a intenção é ir para uma página que lista TODOS os KPIs liberados para o usuário,
    // a rota seria /ops/shift/kpi-smarts-liberated.
    // Se a intenção é ir para a página de apontamentos de UM KPI específico, a rota seria /ops/shift/kpi-apontamentos/:kpiLiberatedId
    // Vamos assumir que o usuário irá para a lista de KPIs Liberados primeiro.
    navigate('/ops/shift/kpi-smarts-liberated'); 
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-4xl bg-card backdrop-blur-md rounded-2xl shadow-lg p-6 text-center border border-border">
        <CardHeader>
          <CardTitle className="text-4xl font-bold mb-4 text-foreground">SOLLUX OPS</CardTitle>
          <p className="text-xl text-muted-foreground">
            Gerencie operações e estratégias da sua plataforma.
          </p>
        </CardHeader>
        <CardContent className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              title="SOLLUX INSIGHT™"
              description="Avaliação do momento atual da sua empresa."
              icon={Brain}
              onClick={handleInsightClick}
            />
            <FeatureCard
              title="SOLLUX SHIFT™"
              description="Definição de metas e construção de um plano de ação."
              icon={Target}
              onClick={handleShiftClick}
            />
            <FeatureCard
              title="SOLLUX FLOW™"
              description="Acompanhamento contínuo da evolução dos indicadores."
              icon={TrendingUp}
              onClick={handleFlowClick}
            />
            {/* Novo Card para Apontamentos de KPIs */}
            <FeatureCard
              title="Apontamentos de KPIs"
              description="Registre e visualize os valores e notas dos seus KPIs Smart."
              icon={ListChecks} // Ícone apropriado para apontamentos/registros
              onClick={handleKpiApontamentosClick}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OpsPage;
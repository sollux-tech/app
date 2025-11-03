import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { KpiSmartLiberated } from '@/types/kpiSmartLiberated';
import { KpiSmartAppointment, KpiSmartAppointmentFormData } from '@/types/kpiSmartAppointment';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/components/CompanyContext';
import DatePicker from '@/components/DatePicker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Plus, Edit, Trash2, CalendarDays } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const emptyStringToUndefined = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.any()
);

const appointmentSchema = z.object({
  kpi_smart_liberated_id: z.string().min(1, { message: 'O KPI Smart Liberado é obrigatório.' }),
  appointment_date: z.date({ required_error: 'A data do apontamento é obrigatória.' }),
  evidence: z.string().optional(),
  type: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]), // 1: Quantitativo, 2: Marco, 3: Frequência, 4: Intervalo
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),

  // Campos condicionais
  current_value: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
  progress_percentage: emptyStringToUndefined.pipe(z.coerce.number().min(0).max(100).optional().nullable()),
  performed_executions: emptyStringToUndefined.pipe(z.coerce.number().int().positive().optional().nullable()),
  current_value_interval: emptyStringToUndefined.pipe(z.coerce.number().optional().nullable()),
});

const AppointmentKpiSmartPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { selectedCompany } = useCompany();

  const [selectedKpiLiberatedId, setSelectedKpiLiberatedId] = useState<string | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<KpiSmartAppointment | null>(null);

  const form = useForm<KpiSmartAppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      kpi_smart_liberated_id: '',
      appointment_date: new Date(),
      evidence: '',
      type: 1, // Default type, will be overwritten by selected KPI
      status: 'pending',
      current_value: undefined,
      progress_percentage: undefined,
      performed_executions: undefined,
      current_value_interval: undefined,
    },
  });

  const kpiSmartType = form.watch('type');

  // Fetch KPI Smarts Liberados for the current user and company
  const { data: kpiLiberatedList, isLoading: isLoadingKpiLiberatedList } = useQuery<KpiSmartLiberated[], Error>({
    queryKey: ['kpiSmartsLiberatedForAppointment', user?.id, selectedCompany?.id],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) return [];
      const { data, error } = await supabase
        .from('kpi_smarts_liberated')
        .select(`
          *,
          kpi_smarts(description, kpi_smart_types(description, code), kpi_smart_units(description))
        `)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(item => ({
        ...item,
        kpi_smarts: Array.isArray(item.kpi_smarts) ? item.kpi_smarts[0] : item.kpi_smarts,
      }));
    },
    enabled: !!user?.id && !!selectedCompany?.id,
  });

  // Fetch appointments for the selected KPI Smart Liberado
  const { data: appointments, isLoading: isLoadingAppointments } = useQuery<KpiSmartAppointment[], Error>({
    queryKey: ['kpiSmartAppointments', selectedKpiLiberatedId],
    queryFn: async () => {
      if (!selectedKpiLiberatedId) return [];
      const { data, error } = await supabase
        .from('kpi_smart_appointments')
        .select(`
          *,
          kpi_smarts_liberated(
            code,
            kpi_smarts(description, kpi_smart_types(description, code), kpi_smart_units(description))
          )
        `)
        .eq('kpi_smart_liberated_id', selectedKpiLiberatedId)
        .order('appointment_date', { ascending: false });
      if (error) throw error;
      return data.map(item => ({
        ...item,
        kpi_smarts_liberated: Array.isArray(item.kpi_smarts_liberated) ? item.kpi_smarts_liberated[0] : item.kpi_smarts_liberated,
      }));
    },
    enabled: !!selectedKpiLiberatedId,
  });

  // Effect to update form fields when editingAppointment changes
  useEffect(() => {
    if (editingAppointment) {
      const liberated = kpiLiberatedList?.find(l => l.id === editingAppointment.kpi_smart_liberated_id);
      if (liberated?.kpi_smarts?.kpi_smart_types?.code) {
        form.setValue('type', liberated.kpi_smarts.kpi_smart_types.code as 1 | 2 | 3 | 4);
      }
      form.reset({
        kpi_smart_liberated_id: editingAppointment.kpi_smart_liberated_id,
        appointment_date: new Date(editingAppointment.appointment_date),
        evidence: editingAppointment.evidence || '',
        type: editingAppointment.type,
        status: editingAppointment.status,
        current_value: editingAppointment.current_value || undefined,
        progress_percentage: editingAppointment.progress_percentage || undefined,
        performed_executions: editingAppointment.performed_executions || undefined,
        current_value_interval: editingAppointment.current_value_interval || undefined,
      });
      setSelectedKpiLiberatedId(editingAppointment.kpi_smart_liberated_id);
    } else {
      form.reset({
        kpi_smart_liberated_id: selectedKpiLiberatedId || '',
        appointment_date: new Date(),
        evidence: '',
        type: 1, // Reset to default, will be updated by select change
        status: 'pending',
        current_value: undefined,
        progress_percentage: undefined,
        performed_executions: undefined,
        current_value_interval: undefined,
      });
      // If a KPI is already selected, set its type
      const liberated = kpiLiberatedList?.find(l => l.id === selectedKpiLiberatedId);
      if (liberated?.kpi_smarts?.kpi_smart_types?.code) {
        form.setValue('type', liberated.kpi_smarts.kpi_smart_types.code as 1 | 2 | 3 | 4);
      }
    }
  }, [editingAppointment, form, isDialogOpen, selectedKpiLiberatedId, kpiLiberatedList]);

  // Effect to set the KPI type when selectedKpiLiberatedId changes
  useEffect(() => {
    const liberated = kpiLiberatedList?.find(l => l.id === selectedKpiLiberatedId);
    if (liberated?.kpi_smarts?.kpi_smart_types?.code) {
      form.setValue('type', liberated.kpi_smarts.kpi_smart_types.code as 1 | 2 | 3 | 4);
    }
  }, [selectedKpiLiberatedId, kpiLiberatedList, form]);

  const createAppointment = useMutation({
    mutationFn: async (data: KpiSmartAppointmentFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const payload = {
        user_id: user.id,
        kpi_smart_liberated_id: data.kpi_smart_liberated_id,
        appointment_date: format(data.appointment_date, 'yyyy-MM-dd'),
        evidence: data.evidence || null,
        type: data.type,
        status: data.status,
        current_value: data.current_value || null,
        progress_percentage: data.progress_percentage || null,
        performed_executions: data.performed_executions || null,
        current_value_interval: data.current_value_interval || null,
      };
      const { error } = await supabase.from('kpi_smart_appointments').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpiSmartAppointments', selectedKpiLiberatedId] });
      showSuccess('Apontamento registrado com sucesso!');
      setIsDialogOpen(false);
      setEditingAppointment(null);
      form.reset({
        kpi_smart_liberated_id: selectedKpiLiberatedId || '',
        appointment_date: new Date(),
        evidence: '',
        type: form.getValues('type'), // Keep the current type
        status: 'pending',
        current_value: undefined,
        progress_percentage: undefined,
        performed_executions: undefined,
        current_value_interval: undefined,
      });
    },
    onError: (error: Error) => {
      showError(`Erro ao registrar apontamento: ${error.message}`);
    },
  });

  const updateAppointment = useMutation({
    mutationFn: async (data: KpiSmartAppointmentFormData) => {
      if (!editingAppointment?.id || !user?.id) throw new Error("ID do apontamento ou usuário faltando.");
      const payload = {
        kpi_smart_liberated_id: data.kpi_smart_liberated_id,
        appointment_date: format(data.appointment_date, 'yyyy-MM-dd'),
        evidence: data.evidence || null,
        type: data.type,
        status: data.status,
        current_value: data.current_value || null,
        progress_percentage: data.progress_percentage || null,
        performed_executions: data.performed_executions || null,
        current_value_interval: data.current_value_interval || null,
      };
      const { error } = await supabase.from('kpi_smart_appointments').update(payload).eq('id', editingAppointment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpiSmartAppointments', selectedKpiLiberatedId] });
      showSuccess('Apontamento atualizado com sucesso!');
      setIsDialogOpen(false);
      setEditingAppointment(null);
    },
    onError: (error: Error) => {
      showError(`Erro ao atualizar apontamento: ${error.message}`);
    },
  });

  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error } = await supabase.from('kpi_smart_appointments').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpiSmartAppointments', selectedKpiLiberatedId] });
      showSuccess('Apontamento excluído com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro ao excluir apontamento: ${error.message}`);
    },
  });

  const onSubmit = (data: KpiSmartAppointmentFormData) => {
    if (editingAppointment) {
      updateAppointment.mutate(data);
    } else {
      createAppointment.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingAppointment(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (appointment: KpiSmartAppointment) => {
    setEditingAppointment(appointment);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este apontamento?')) {
      deleteAppointment.mutate(id);
    }
  };

  const isMutating = createAppointment.isPending || updateAppointment.isPending || deleteAppointment.isPending;
  const isLoadingPage = isLoadingKpiLiberatedList || isLoadingAppointments;

  if (!selectedCompany) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Por favor, selecione uma empresa na barra lateral para fazer apontamentos de KPI Smart.
      </div>
    );
  }

  if (isLoadingPage) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-sollux-red" />
        <span className="ml-2 text-muted-foreground">Carregando dados...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-foreground uppercase font-bold">Apontamento de KPI Smart</CardTitle>
          <CardDescription className="text-muted-foreground">
            Empresa: <span className="font-semibold">{selectedCompany.name}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Form {...form}>
              <FormField
                control={form.control}
                name="kpi_smart_liberated_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">KPI Smart Liberado</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedKpiLiberatedId(value);
                      }}
                      value={field.value}
                      disabled={isLoadingKpiLiberatedList || isMutating}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um KPI Smart Liberado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingKpiLiberatedList ? (
                          <SelectItem value="loading" disabled>Carregando KPIs...</SelectItem>
                        ) : (kpiLiberatedList?.length || 0) === 0 ? (
                          <SelectItem value="no-kpis" disabled>Nenhum KPI Liberado encontrado.</SelectItem>
                        ) : (
                          kpiLiberatedList?.map((kpi) => (
                            <SelectItem key={kpi.id} value={kpi.id}>
                              {kpi.kpi_smarts?.description || `KPI ${kpi.code}`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>
          </div>

          {selectedKpiLiberatedId && (
            <Card className="p-6 border border-border rounded-lg bg-muted/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-foreground">
                  Registrar Novo Apontamento
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  KPI: {kpiLiberatedList?.find(k => k.id === selectedKpiLiberatedId)?.kpi_smarts?.description || 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="appointment_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-foreground text-left">Data do Apontamento</FormLabel>
                          <FormControl>
                            <DatePicker
                              date={field.value}
                              setDate={field.onChange}
                              placeholder="Selecione a data"
                              disabled={isMutating}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {kpiSmartType === 1 && ( // Quantitativo
                      <FormField
                        control={form.control}
                        name="current_value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">Valor Atual</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="Ex: 110" {...field} disabled={isMutating} className="rounded-lg" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {kpiSmartType === 2 && ( // Marco
                      <FormField
                        control={form.control}
                        name="progress_percentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">Progresso (%)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="Ex: 50" {...field} disabled={isMutating} className="rounded-lg" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {kpiSmartType === 3 && ( // Frequência
                      <FormField
                        control={form.control}
                        name="performed_executions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">Execuções Realizadas</FormLabel>
                            <FormControl>
                              <Input type="number" step="1" placeholder="Ex: 5" {...field} disabled={isMutating} className="rounded-lg" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {kpiSmartType === 4 && ( // Intervalo
                      <FormField
                        control={form.control}
                        name="current_value_interval"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">Valor Atual (dentro do intervalo)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="Ex: 75" {...field} disabled={isMutating} className="rounded-lg" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="evidence"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Evidência (Opcional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Descreva as evidências para este apontamento." {...field} className="rounded-lg" rows={3} disabled={isMutating} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isMutating} className="rounded-lg">
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isMutating} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
                        {editingAppointment ? 'Salvar Alterações' : 'Registrar Apontamento'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {selectedKpiLiberatedId && (
            <div className="mt-8">
              <CardTitle className="text-foreground uppercase font-bold mb-4">Apontamentos Anteriores</CardTitle>
              {isLoadingAppointments ? (
                <p className="text-muted-foreground">Carregando apontamentos...</p>
              ) : (appointments?.length || 0) === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum apontamento registrado para este KPI Smart Liberado.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-foreground">Data</TableHead>
                      <TableHead className="text-foreground">Valor/Progresso</TableHead>
                      <TableHead className="text-foreground">Evidência</TableHead>
                      <TableHead className="text-foreground">Status</TableHead>
                      <TableHead className="text-right text-foreground">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments?.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell className="font-medium text-foreground">
                          {format(new Date(appointment.appointment_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {appointment.type === 1 && `Valor: ${appointment.current_value || 'N/A'}`}
                          {appointment.type === 2 && `Progresso: ${appointment.progress_percentage || 'N/A'}%`}
                          {appointment.type === 3 && `Execuções: ${appointment.performed_executions || 'N/A'}`}
                          {appointment.type === 4 && `Valor: ${appointment.current_value_interval || 'N/A'}`}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">{appointment.evidence || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              appointment.status === 'approved' ? 'default' :
                              appointment.status === 'rejected' ? 'destructive' :
                              'secondary'
                            }
                            className={
                              appointment.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                              appointment.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                              'bg-gray-100 text-gray-800 border-gray-200'
                            }
                          >
                            {appointment.status === 'pending' ? 'Pendente' :
                             appointment.status === 'approved' ? 'Aprovado' :
                             'Rejeitado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(appointment)}
                            className="mr-2 text-foreground hover:bg-accent rounded-lg"
                            disabled={isMutating}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(appointment.id)}
                            className="bg-sollux-red hover:bg-red-700 text-white rounded-lg"
                            disabled={isMutating}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AppointmentKpiSmartPage;
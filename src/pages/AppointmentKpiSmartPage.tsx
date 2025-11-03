import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/components/CompanyContext';
import { KpiSmartLiberated } from '@/types/kpiSmartLiberated';
import { KpiSmartAppointment, KpiSmartAppointmentFormData } from '@/types/kpiSmartAppointment';
import { Pillar } from '@/types/pillar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DatePicker from '@/components/DatePicker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useKpiSmartAppointments } from '@/hooks/useKpiSmartAppointment';

// Schema base para o formulário de appointment
const appointmentSchema = z.object({
  kpi_smart_liberated_id: z.string().min(1, { message: 'Selecione um KPI Smart Liberado.' }),
  evidence: z.string().min(1, { message: 'A evidência é obrigatória.' }),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  // Campos dinâmicos opcionais
  current_value: z.number().optional(),
  progress_percentage: z.number().min(0).max(100).optional(),
  performed_executions: z.number().min(0).optional(),
  current_value_interval: z.number().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

const AppointmentKpiSmartPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { selectedCompany } = useCompany();
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<KpiSmartAppointment | null>(null);
  const [selectedKpiLiberatedId, setSelectedKpiLiberatedId] = useState('');
  const [filters, setFilters] = useState({
    pillar_id: '',
    status: 'all',
    search: '',
  });

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      kpi_smart_liberated_id: '',
      evidence: '',
      status: 'pending',
      current_value: undefined,
      progress_percentage: undefined,
      performed_executions: undefined,
      current_value_interval: undefined,
    },
  });

  // Usar o hook auxiliar
  const { appointments, isLoading: isLoadingAppointments, error: errorAppointments, createAppointment, updateAppointment, deleteAppointment } = useKpiSmartAppointments(
    user?.id || '',
    selectedCompany?.id || '',
    filters
  );

  // Queries para KPIs Liberados
  const { data: kpiLiberatedList, isLoading: isLoadingKpiLiberated } = useQuery<KpiSmartLiberated[], Error>({
    queryKey: ['kpiSmartLiberatedList', user?.id, selectedCompany?.id, filters],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) return [];
      let query = supabase
        .from('kpi_smarts_liberated')
        .select(`
          *,
          kpi_smarts(id, description, kpi_smart_type_id),
          pillars(id, description)
        `)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id)
        .contains('execution_user_ids', [user.id]); // Verifica se o usuário tem permissão de execução

      // Aplicar filtros
      if (filters.pillar_id) {
        query = query.eq('kpi_smarts.pillar_id', filters.pillar_id);
      }
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.search) {
        query = query.ilike('kpi_smarts.description', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!selectedCompany?.id,
  });

  const { data: pillars, isLoading: isLoadingPillars } = useQuery<Pillar[], Error>({
    queryKey: ['pillarsForAppointment', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('pillars').select('*').eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Efeito para atualizar o tipo baseado no KPI selecionado
  useEffect(() => {
    if (selectedKpiLiberatedId) {
      const liberated = kpiLiberatedList?.find(l => l.id === selectedKpiLiberatedId);
      if (liberated?.kpi_smart?.kpi_smart_type_id) {
        form.setValue('type', liberated.kpi_smart.kpi_smart_type_id as 1 | 2 | 3 | 4);
      }
    }
  }, [selectedKpiLiberatedId, kpiLiberatedList, form]);

  const onSubmit = (data: AppointmentFormData) => {
    if (editingAppointment) {
      updateAppointment.mutate({ ...data, id: editingAppointment.id });
    } else {
      createAppointment.mutate(data);
    }
  };

  const handleEditAppointment = (appointment: KpiSmartAppointment) => {
    setEditingAppointment(appointment);
    setSelectedKpiLiberatedId(appointment.kpi_smart_liberated_id);
    form.reset({
      kpi_smart_liberated_id: appointment.kpi_smart_liberated_id,
      evidence: appointment.evidence,
      status: appointment.status,
      current_value: appointment.current_value,
      progress_percentage: appointment.progress_percentage,
      performed_executions: appointment.performed_executions,
      current_value_interval: appointment.current_value_interval,
    });
    setIsAppointmentDialogOpen(true);
  };

  const handleDeleteAppointment = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este apontamento?')) {
      deleteAppointment.mutate(id);
    }
  };

  const filteredLiberated = useMemo(() => {
    return kpiLiberatedList?.filter(liberated => {
      if (filters.search) {
        return liberated.kpi_smart?.description.toLowerCase().includes(filters.search.toLowerCase());
      }
      return true;
    }) || [];
  }, [kpiLiberatedList, filters.search]);

  if (!selectedCompany) {
    return <div className="text-center text-muted-foreground">Selecione uma empresa para fazer apontamentos.</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-foreground uppercase font-bold">Apontamento KPI Smart</CardTitle>
          <CardDescription className="text-muted-foreground">Registre dados para KPIs Smart liberados.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <FormItem>
              <FormLabel>Pilar</FormLabel>
              <Select value={filters.pillar_id} onValueChange={(value) => setFilters(prev => ({ ...prev, pillar_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os Pilares" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os Pilares</SelectItem>
                  {pillars?.map(pillar => (
                    <SelectItem key={pillar.id} value={pillar.id}>
                      {pillar.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem>
              <FormLabel>Buscar</FormLabel>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar KPIs..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </FormItem>
          </div>

          {/* Lista de KPIs Liberados */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>KPIs Smart Liberados</CardTitle>
              <Button onClick={() => setIsAppointmentDialogOpen(true)} className="bg-sollux-red hover:bg-sollux-orange text-white">
                <Plus className="mr-2 h-4 w-4" /> Novo Apontamento
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingKpiLiberated ? (
                <p>Carregando KPIs...</p>
              ) : filteredLiberated.length === 0 ? (
                <p>Nenhum KPI Smart liberado encontrado.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>KPI Smart</TableHead>
                      <TableHead>Pilar</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLiberated.map(liberated => (
                      <TableRow key={liberated.id}>
                        <TableCell>{liberated.kpi_smart?.description}</TableCell>
                        <TableCell>{pillars?.find(p => p.id === liberated.kpi_smarts?.pillar_id)?.description}</TableCell>
                        <TableCell>
                          <Badge variant={liberated.status === 'active' ? 'default' : 'secondary'}>
                            {liberated.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedKpiLiberatedId(liberated.id);
                              setIsAppointmentDialogOpen(true);
                            }}
                          >
                            Apontar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Lista de Apontamentos */}
          <Card>
            <CardHeader>
              <CardTitle>Meus Apontamentos</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAppointments ? (
                <p>Carregando apontamentos...</p>
              ) : appointments.length === 0 ? (
                <p>Nenhum apontamento encontrado.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>KPI</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map(appointment => (
                      <TableRow key={appointment.id}>
                        <TableCell>{kpiLiberatedList?.find(l => l.id === appointment.kpi_smart_liberated_id)?.kpi_smart?.description}</TableCell>
                        <TableCell>{format(new Date(appointment.appointment_date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                        <TableCell>
                          <Badge variant={appointment.status === 'pending' ? 'secondary' : appointment.status === 'approved' ? 'default' : 'destructive'}>
                            {appointment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleEditAppointment(appointment)}>
                            <Edit className="h-4 w-4 mr-1" /> Editar
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteAppointment(appointment.id)}>
                            <Trash2 className="h-4 w-4 mr-1" /> Excluir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Dialog de Apontamento */}
      <Dialog open={isAppointmentDialogOpen} onOpenChange={setIsAppointmentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAppointment ? 'Editar Apontamento' : 'Novo Apontamento'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="kpi_smart_liberated_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KPI Smart Liberado</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um KPI" />
                      </SelectTrigger>
                      <SelectContent>
                        {kpiLiberatedList?.map(liberated => (
                          <SelectItem key={liberated.id} value={liberated.id}>
                            {liberated.kpi_smart?.description} ({pillars?.find(p => p.id === liberated.kpi_smarts?.pillar_id)?.description})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="evidence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evidência (Obrigatório)</FormLabel>
                    <FormControl>
                      <ReactQuill
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Descreva a evidência para este apontamento..."
                        className="min-h-[150px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Campos dinâmicos baseados no tipo */}
              {form.watch('kpi_smart_liberated_id') && (
                <div className="space-y-4">
                  {form.watch('type') === 1 && (
                    <>
                      <FormField
                        control={form.control}
                        name="current_value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Atual</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} placeholder="Ex: 150" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  {form.watch('type') === 2 && (
                    <>
                      <FormField
                        control={form.control}
                        name="progress_percentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Progresso (%)</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} max={100} {...field} placeholder="Ex: 75" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  {form.watch('type') === 3 && (
                    <>
                      <FormField
                        control={form.control}
                        name="performed_executions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Execuções Realizadas</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} placeholder="Ex: 5" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  {form.watch('type') === 4 && (
                    <>
                      <FormField
                        control={form.control}
                        name="current_value_interval"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Atual</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} placeholder="Ex: 80" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
              )}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="approved">Aprovado</SelectItem>
                        <SelectItem value="rejected">Rejeitado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAppointmentDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createAppointment.isPending || updateAppointment.isPending}>
                  {editingAppointment ? 'Atualizar' : 'Criar'} Apontamento
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentKpiSmartPage;
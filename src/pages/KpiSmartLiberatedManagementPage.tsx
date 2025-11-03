import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { KpiSmartAcquired, KpiSmartAcquiredFormData } from '@/types/kpiSmartAcquired';
import { KpiSmart } from '@/types/kpiSmart';
import { Pillar } from '@/types/pillar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import MultiSelect, { MultiSelectOption } from '@/components/MultiSelect';
import { useCompany } from '@/components/CompanyContext';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  pillar_id: z.string().min(1, { message: 'O pilar é obrigatório.' }),
  kpi_smart_id: z.string().min(1, { message: 'O KPI Smart é obrigatório.' }),
  status: z.boolean().default(true),
});

const KpiSmartAcquiredManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();

  const [editingKpiSmartAcquired, setEditingKpiSmartAcquired] = useState<KpiSmartAcquired | null>(null);
  const [isLoadingEditingKpiSmartAcquired, setIsLoadingEditingKpiSmartAcquired] = useState(false);
  const [selectedPillarIdForForm, setSelectedPillarIdForForm] = useState<string>('');
  const [selectedKpiSmartDetails, setSelectedKpiSmartDetails] = useState<KpiSmart | null>(null);

  const [selectedPillarFilter, setSelectedPillarFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const form = useForm<KpiSmartAcquiredFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pillar_id: '',
      kpi_smart_id: '',
      status: true,
    },
  });

  const { id: kpiSmartAcquiredId } = useParams<{ id: string }>();
  const isEditing = !!kpiSmartAcquiredId;

  useEffect(() => {
    if (editingKpiSmartAcquired) {
      const kpiSmartPillarId = (editingKpiSmartAcquired.kpi_smarts as any)?.pillar_id || '';
      setSelectedPillarIdForForm(kpiSmartPillarId);
      
      const fetchKpiSmartDetails = async () => {
        if (editingKpiSmartAcquired.kpi_smart_id) {
          const { data: kpiDetails, error } = await supabase
            .from('kpi_smarts')
            .select('id, description, pillar_id, user_id, code, kpi_smart_type_id, kpi_smart_action_verb_id, kpi_smart_focus_id, kpi_smart_unit_id, status, created_at, kpi_smart_types(description, code), kpi_smart_focuses(description), kpi_smart_units(description)')
            .eq('id', editingKpiSmartAcquired.kpi_smart_id)
            .single();
          if (error) {
            console.error("Erro ao buscar detalhes do KPI Smart:", error);
          } else if (kpiDetails) {
            // Fix type conversion by ensuring the structure matches KpiSmart
            const safeKpiDetails: KpiSmart = {
              id: kpiDetails.id,
              user_id: kpiDetails.user_id,
              code: kpiDetails.code,
              description: kpiDetails.description,
              pillar_id: kpiDetails.pillar_id,
              kpi_smart_type_id: kpiDetails.kpi_smart_type_id,
              kpi_smart_action_verb_id: kpiDetails.kpi_smart_action_verb_id,
              kpi_smart_focus_id: kpiDetails.kpi_smart_focus_id,
              kpi_smart_unit_id: kpiDetails.kpi_smart_unit_id,
              status: kpiDetails.status,
              created_at: kpiDetails.created_at,
              kpi_smart_types: kpiDetails.kpi_smart_types ? (Array.isArray(kpiDetails.kpi_smart_types) ? kpiDetails.kpi_smart_types[0] : kpiDetails.kpi_smart_types) : null,
              kpi_smart_focuses: kpiDetails.kpi_smart_focuses ? (Array.isArray(kpiDetails.kpi_smart_focuses) ? kpiDetails.kpi_smart_focuses[0] : kpiDetails.kpi_smart_focuses) : null,
              kpi_smart_units: kpiDetails.kpi_smart_units ? (Array.isArray(kpiDetails.kpi_smart_units) ? kpiDetails.kpi_smart_units[0] : kpiDetails.kpi_smart_units) : null,
            };
            setSelectedKpiSmartDetails(safeKpiDetails);
          }
        }
      };

      fetchKpiSmartDetails();

      const timer = setTimeout(() => {
        form.reset({
          pillar_id: kpiSmartPillarId,
          kpi_smart_id: editingKpiSmartAcquired.kpi_smart_id,
          status: editingKpiSmartAcquired.status === 'active',
        });
      }, 100);
      return () => clearTimeout(timer);
    } else {
      form.reset({
        pillar_id: '',
        kpi_smart_id: '',
        status: true,
      });
      setSelectedPillarIdForForm('');
      setSelectedKpiSmartDetails(null);
    }
  }, [editingKpiSmartAcquired, form]);

  const { data: kpiSmartsAcquired, isLoading: isLoadingKpiSmartsAcquired } = useQuery<KpiSmartAcquired[], Error>({
    queryKey: ['kpiSmartsAcquired', user?.id, selectedCompany?.id, selectedPillarFilter, selectedStatusFilter],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) return [];
      let query = supabase
        .from('kpi_smarts_acquired')
        .select('*, kpi_smarts(description, kpi_smart_types(description), kpi_smart_focuses(description), kpi_smart_units(description))')
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id);
      
      if (selectedPillarFilter !== 'all') {
        query = query.eq('kpi_smarts.pillar_id', selectedPillarFilter);
      }
      if (selectedStatusFilter !== 'all') {
        query = query.eq('status', selectedStatusFilter);
      }

      query = query.order('code', { ascending: true });
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!selectedCompany?.id,
  });

  const { data: pillars, isLoading: isLoadingPillars } = useQuery<Pillar[], Error>({
    queryKey: ['pillars', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('pillars')
        .select('*')
        .eq('user_id', user.id)
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: kpiSmarts, isLoading: isLoadingKpiSmarts } = useQuery<KpiSmart[], Error>({
    queryKey: ['kpiSmarts', user?.id, selectedPillarIdForForm],
    queryFn: async () => {
      if (!user?.id || !selectedPillarIdForForm) return [];
      const { data, error } = await supabase
        .from('kpi_smarts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('pillar_id', selectedPillarIdForForm)
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!selectedPillarIdForForm,
  });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpiSmartsAcquired', user?.id, selectedCompany?.id] });
      setEditingKpiSmartAcquired(null);
      showSuccess('KPI Smart adquirido com sucesso!');
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createKpiSmartAcquiredMutation = useMutation({
    mutationFn: async (data: KpiSmartAcquiredFormData) => {
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário ou empresa não selecionada.");
      const { data: newKpiSmartAcquired, error } = await supabase
        .from('kpi_smarts_acquired')
        .insert({
          pillar_id: data.pillar_id,
          kpi_smart_id: data.kpi_smart_id,
          status: data.status ? 'active' : 'inactive',
          user_id: user.id,
          company_id: selectedCompany.id,
        })
        .select()
        .single();
      if (error) throw error;
      return newKpiSmartAcquired;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      form.reset();
    },
  });

  const updateKpiSmartAcquiredMutation = useMutation({
    mutationFn: async (data: KpiSmartAcquiredFormData) => {
      if (!kpiSmartAcquiredId) throw new Error("ID do KPI Smart adquirido está faltando.");
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário ou empresa não selecionada.");
      const { data: updatedKpiSmartAcquired, error } = await supabase
        .from('kpi_smarts_acquired')
        .update({
          pillar_id: data.pillar_id,
          kpi_smart_id: data.kpi_smart_id,
          status: data.status ? 'active' : 'inactive',
        })
        .eq('id', kpiSmartAcquiredId)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id)
        .select()
        .single();
      if (error) throw error;
      return updatedKpiSmartAcquired;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      form.reset();
    },
  });

  const deleteKpiSmartAcquiredMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário ou empresa não selecionada.");
      const { error, count } = await supabase
        .from('kpi_smarts_acquired')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id);
      
      if (error) throw error;
      if (count === 0) throw new Error("KPI Smart adquirido não encontrado ou você não tem permissão para excluí-lo.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpiSmartsAcquired', user?.id, selectedCompany?.id] });
      showSuccess('KPI Smart adquirido excluído com sucesso!');
      setEditingKpiSmartAcquired(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  });

  const onSubmit = (data: KpiSmartAcquiredFormData) => {
    if (isEditing) {
      updateKpiSmartAcquiredMutation.mutate(data);
    } else {
      createKpiSmartAcquiredMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingKpiSmartAcquired(null);
    setSelectedPillarIdForForm('');
    setSelectedKpiSmartDetails(null);
    form.reset();
  };

  const handleEditClick = (kpiSmartAcquired: KpiSmartAcquired) => {
    setEditingKpiSmartAcquired(kpiSmartAcquired);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este KPI Smart adquirido?')) {
      deleteKpiSmartAcquiredMutation.mutate(id);
    }
  };

  const isMutating = createKpiSmartAcquiredMutation.isPending || updateKpiSmartAcquiredMutation.isPending || deleteKpiSmartAcquiredMutation.isPending;

  if (!selectedCompany) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Por favor, selecione uma empresa na barra lateral para gerenciar os KPIs Smart adquiridos.
      </div>
    );
  }

  if (isLoadingKpiSmartsAcquired) {
    return <div className="text-center text-muted-foreground">Carregando KPIs Smart adquiridos...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground uppercase font-bold">KPIs Smart Adquiridos</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adquirir KPI Smart
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <Label className="text-foreground">Filtrar por Pilar</Label>
              <Select value={selectedPillarFilter} onValueChange={setSelectedPillarFilter} disabled={isLoadingPillars}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Todos os Pilares" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Pilares</SelectItem>
                  {pillars?.map((pillar) => (
                    <SelectItem key={pillar.id} value={pillar.id}>
                      {pillar.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-foreground">Filtrar por Status</Label>
              <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Código</TableHead>
                <TableHead className="text-foreground">Pilar</TableHead>
                <TableHead className="text-foreground">KPI Smart</TableHead>
                <TableHead className="text-foreground">Status</TableHead>
                <TableHead className="text-right text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpiSmartsAcquired?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum KPI Smart adquirido encontrado para esta empresa.
                  </TableCell>
                </TableRow>
              ) : (
                kpiSmartsAcquired?.map((kpiSmartAcquired) => (
                  <TableRow key={kpiSmartAcquired.id}>
                    <TableCell className="font-medium text-foreground">{kpiSmartAcquired.code}</TableCell>
                    <TableCell className="text-muted-foreground">{kpiSmartAcquired.pillar_id}</TableCell>
                    <TableCell className="text-muted-foreground">{kpiSmartAcquired.kpi_smart_id}</TableCell>
                    <TableCell>
                      <Badge variant={kpiSmartAcquired.status === 'active' ? 'default' : 'secondary'}>
                        {kpiSmartAcquired.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(kpiSmartAcquired)}
                        className="mr-2 text-foreground hover:bg-accent rounded-lg"
                        disabled={isMutating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(kpiSmartAcquired.id)}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card backdrop-blur-md rounded-2xl shadow-lg border border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {isEditing ? 'Editar KPI Smart Adquirido' : 'Adquirir Novo KPI Smart'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="pillar_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Pilar</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingPillars}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione o pilar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingPillars ? (
                          <SelectItem value="loading" disabled>Carregando pilares...</SelectItem>
                        ) : pillars?.length === 0 ? (
                          <SelectItem value="no-pillars" disabled>Nenhum pilar disponível</SelectItem>
                        ) : (
                          pillars?.map((pillar) => (
                            <SelectItem key={pillar.id} value={pillar.id}>
                              {pillar.description}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kpi_smart_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">KPI Smart</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingKpiSmarts || selectedPillarIdForForm === ''}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione o KPI Smart" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingKpiSmarts ? (
                          <SelectItem value="loading" disabled>Carregando KPIs...</SelectItem>
                        ) : kpiSmarts?.length === 0 ? (
                          <SelectItem value="no-kpis" disabled>Nenhum KPI Smart disponível</SelectItem>
                        ) : (
                          kpiSmarts?.map((kpi) => (
                            <SelectItem key={kpi.id} value={kpi.id}>
                              {kpi.description}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-foreground">Status</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isMutating}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isMutating} className="rounded-lg">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isMutating} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
                  {isEditing ? 'Salvar Alterações' : 'Adquirir KPI Smart'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KpiSmartAcquiredManagementPage;
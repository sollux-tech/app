import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { KpiSmartAcquired, KpiSmartAcquiredFormData } from '@/types/kpiSmartAcquired';
import { KpiSmart } from '@/types/kpiSmart';
import { Pillar } from '@/types/pillar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/components/CompanyContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  pillar_id: z.string().min(1, { message: 'O Pilar é obrigatório.' }), // Novo campo para o formulário
  kpi_smart_id: z.string().min(1, { message: 'O KPI Smart é obrigatório.' }),
  status: z.boolean().default(true),
});

const KpiSmartAcquiredManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { selectedCompany } = useCompany();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKpiSmartAcquired, setEditingKpiSmartAcquired] = useState<KpiSmartAcquired | null>(null);

  // Estados para os filtros da tabela
  const [selectedPillarFilter, setSelectedPillarFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const form = useForm<KpiSmartAcquiredFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pillar_id: '', // Valor padrão para o novo campo
      kpi_smart_id: '',
      status: true,
    },
  });

  // Observar o valor do pilar selecionado no formulário para filtrar os KPIs Smart
  const selectedPillarIdForForm = form.watch('pillar_id');

  useEffect(() => {
    if (editingKpiSmartAcquired) {
      // Ao editar, precisamos buscar o pilar do KPI Smart original
      const fetchKpiSmartPillar = async () => {
        const { data: kpiSmartData, error } = await supabase
          .from('kpi_smarts')
          .select('pillar_id')
          .eq('id', editingKpiSmartAcquired.kpi_smart_id)
          .single();
        if (error) {
          console.error("Erro ao buscar pilar do KPI Smart:", error);
          return;
        }
        form.reset({
          pillar_id: kpiSmartData?.pillar_id || '',
          kpi_smart_id: editingKpiSmartAcquired.kpi_smart_id,
          status: editingKpiSmartAcquired.status === 'active',
        });
      };
      fetchKpiSmartPillar();
    } else {
      form.reset({
        pillar_id: '',
        kpi_smart_id: '',
        status: true,
      });
    }
  }, [editingKpiSmartAcquired, form, isDialogOpen]);

  const { data: kpiSmartsAcquired, isLoading: isLoadingKpiSmartsAcquired, error: errorKpiSmartsAcquired } = useQuery<KpiSmartAcquired[], Error>({
    queryKey: ['kpiSmartsAcquired', user?.id, selectedCompany?.id, selectedPillarFilter, selectedStatusFilter], // Adicionar filtros ao queryKey
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) return [];
      let query = supabase
        .from('kpi_smarts_acquired')
        .select(`
          *,
          kpi_smarts(description, pillar_id, kpi_smart_types(description), kpi_smart_focuses(description), kpi_smart_units(description))
        `)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id);
      
      // Aplicar filtros da tabela
      if (selectedPillarFilter !== 'all') {
        query = query.eq('kpi_smarts.pillar_id', selectedPillarFilter);
      }
      if (selectedStatusFilter !== 'all') {
        query = query.eq('status', selectedStatusFilter);
      }

      query = query.order('code', { ascending: true });
      const { data, error } = await query;
      if (error) throw error;
      return data.map(item => ({
        ...item,
        kpi_smarts: Array.isArray(item.kpi_smarts) ? item.kpi_smarts[0] : item.kpi_smarts,
      }));
    },
    enabled: !!user?.id && !!selectedCompany?.id,
  });

  // Query para buscar todos os Pilares (para filtros e formulário)
  const { data: pillars, isLoading: isLoadingPillars } = useQuery<Pillar[], Error>({
    queryKey: ['pillarsListForKpiSmartAcquired', user?.id],
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

  // Query para buscar KPIs Smart ativos, filtrados pelo pilar selecionado no formulário
  const { data: kpiSmarts, isLoading: isLoadingKpiSmarts } = useQuery<KpiSmart[], Error>({
    queryKey: ['kpiSmartsListForAcquiredForm', user?.id, selectedPillarIdForForm],
    queryFn: async () => {
      if (!user?.id || !selectedPillarIdForForm) return [];
      const { data, error } = await supabase
        .from('kpi_smarts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('pillar_id', selectedPillarIdForForm) // Filtrar por pilar selecionado
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!selectedPillarIdForForm, // Habilitar apenas se um pilar for selecionado
  });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpiSmartsAcquired', user?.id, selectedCompany?.id] });
      setIsDialogOpen(false);
      setEditingKpiSmartAcquired(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createKpiSmartAcquiredMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário não autenticado ou empresa não selecionada.");
      const { data: newKpiSmartAcquired, error } = await supabase
        .from('kpi_smarts_acquired')
        .insert({
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
      showSuccess('KPI Smart Adquirido com sucesso!');
    },
  });

  const updateKpiSmartAcquiredMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      if (!editingKpiSmartAcquired?.id) throw new Error("ID do KPI Smart Adquirido está faltando.");
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário não autenticado ou empresa não selecionada.");
      const { data: updatedKpiSmartAcquired, error } = await supabase
        .from('kpi_smarts_acquired')
        .update({
          kpi_smart_id: data.kpi_smart_id,
          status: data.status ? 'active' : 'inactive',
        })
        .eq('id', editingKpiSmartAcquired.id)
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
      showSuccess('KPI Smart Adquirido atualizado com sucesso!');
    },
  });

  const deleteKpiSmartAcquiredMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário não autenticado ou empresa não selecionada.");
      const { error, count } = await supabase
        .from('kpi_smarts_acquired')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("KPI Smart Adquirido não encontrado ou você não tem permissão para excluí-lo.");
      }
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('KPI Smart Adquirido excluído com sucesso!');
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (editingKpiSmartAcquired) {
      updateKpiSmartAcquiredMutation.mutate(data);
    } else {
      createKpiSmartAcquiredMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingKpiSmartAcquired(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (kpiSmartAcquired: KpiSmartAcquired) => {
    setEditingKpiSmartAcquired(kpiSmartAcquired);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este KPI Smart Adquirido?')) {
      deleteKpiSmartAcquiredMutation.mutate(id);
    }
  };

  const isMutating = createKpiSmartAcquiredMutation.isPending || updateKpiSmartAcquiredMutation.isPending || deleteKpiSmartAcquiredMutation.isPending;
  const isLoadingPage = isLoadingKpiSmartsAcquired || isLoadingKpiSmarts || isLoadingPillars;

  if (!selectedCompany) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Por favor, selecione uma empresa na barra lateral para gerenciar os KPIs Smart Adquiridos.
      </div>
    );
  }

  if (isLoadingPage) {
    return <div className="text-center text-muted-foreground">Carregando KPIs Smart Adquiridos...</div>;
  }

  if (errorKpiSmartsAcquired) {
    return <div className="text-center text-destructive">Erro ao carregar KPIs Smart Adquiridos: ${errorKpiSmartsAcquired.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground uppercase font-bold">Gerenciar KPIs Smart Adquiridos</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adquirir KPI Smart
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filtros da Tabela */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="pillar-filter" className="text-foreground">Filtrar por Pilar</Label>
              <Select
                value={selectedPillarFilter}
                onValueChange={setSelectedPillarFilter}
                disabled={isLoadingPillars}
              >
                <SelectTrigger id="pillar-filter" className="rounded-lg">
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
              <Label htmlFor="status-filter" className="text-foreground">Filtrar por Status</Label>
              <Select
                value={selectedStatusFilter}
                onValueChange={setSelectedStatusFilter}
              >
                <SelectTrigger id="status-filter" className="rounded-lg">
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
                <TableHead className="text-foreground">KPI Smart</TableHead>
                <TableHead className="text-foreground">Tipo</TableHead>
                <TableHead className="text-foreground">Foco</TableHead>
                <TableHead className="text-foreground">Unidade</TableHead>
                <TableHead className="text-foreground">Status</TableHead>
                <TableHead className="text-right text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpiSmartsAcquired?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum KPI Smart Adquirido encontrado para esta empresa.
                  </TableCell>
                </TableRow>
              ) : (
                kpiSmartsAcquired?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-foreground">{item.code}</TableCell>
                    <TableCell className="text-muted-foreground">{item.kpi_smarts?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{item.kpi_smarts?.kpi_smart_types?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{item.kpi_smarts?.kpi_smart_focuses?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{item.kpi_smarts?.kpi_smart_units?.description || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={item.status === 'active' ? 'default' : 'secondary'}
                        className={item.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}
                      >
                        {item.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(item)}
                        className="mr-2 text-foreground hover:bg-accent rounded-lg"
                        disabled={isMutating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(item.id)}
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
        <DialogContent className="sm:max-w-[425px] bg-card backdrop-blur-md rounded-2xl shadow-lg border border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingKpiSmartAcquired ? 'Editar KPI Smart Adquirido' : 'Adquirir Novo KPI Smart'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="pillar_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Pilar</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('kpi_smart_id', ''); // Limpar KPI Smart quando o pilar muda
                    }} value={field.value} disabled={isLoadingPillars || isMutating}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um Pilar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingPillars ? (
                          <SelectItem value="loading-pillars" disabled>Carregando Pilares...</SelectItem>
                        ) : (pillars && pillars.length === 0) ? (
                          <SelectItem value="no-pillars" disabled>Nenhum Pilar cadastrado</SelectItem>
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
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedPillarIdForForm || isLoadingKpiSmarts || (kpiSmarts && kpiSmarts.length === 0) || isMutating}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um KPI Smart" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!selectedPillarIdForForm ? (
                          <SelectItem value="select-pillar" disabled>Selecione um pilar primeiro</SelectItem>
                        ) : isLoadingKpiSmarts ? (
                          <SelectItem value="loading-kpis" disabled>Carregando KPIs Smart...</SelectItem>
                        ) : (kpiSmarts && kpiSmarts.length === 0) ? (
                          <SelectItem value="no-kpis" disabled>Nenhum KPI Smart ativo disponível para este pilar</SelectItem>
                        ) : (
                          kpiSmarts.map((kpi) => (
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
                  {editingKpiSmartAcquired ? 'Salvar Alterações' : 'Adquirir KPI Smart'}
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
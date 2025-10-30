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
import { KpiSmart, KpiSmartFormData } from '@/types/kpiSmart';
import { Pillar } from '@/types/pillar';
import { KpiSmartType } from '@/types/kpiSmartType';
import { KpiSmartActionVerb } from '@/types/kpiSmartActionVerb';
import { KpiSmartFocus } from '@/types/kpiSmartFocus';
import { KpiSmartUnit } from '@/types/kpiSmartUnit';
import { KpiSmartStatus } from '@/types/kpiSmartStatus'; // Importar KpiSmartStatus
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label'; // Importar Label

const formSchema = z.object({
  description: z.string().min(1, { message: 'A descrição do KPI Smart é obrigatória.' }),
  pillar_id: z.string().min(1, { message: 'O pilar é obrigatório.' }),
  kpi_smart_type_id: z.string().min(1, { message: 'O tipo de KPI Smart é obrigatório.' }),
  kpi_smart_action_verb_id: z.string().min(1, { message: 'O verbo de ação é obrigatório.' }),
  kpi_smart_focus_id: z.string().min(1, { message: 'O foco é obrigatório.' }),
  kpi_smart_unit_id: z.string().min(1, { message: 'A unidade de medida é obrigatória.' }),
  status: z.boolean().default(true),
});

const KpiSmartManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKpiSmart, setEditingKpiSmart] = useState<KpiSmart | null>(null);

  // Estados para os filtros
  const [selectedPillarFilter, setSelectedPillarFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const form = useForm<KpiSmartFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      pillar_id: '',
      kpi_smart_type_id: '',
      kpi_smart_action_verb_id: '',
      kpi_smart_focus_id: '',
      kpi_smart_unit_id: '',
      status: true,
    },
  });

  useEffect(() => {
    if (editingKpiSmart) {
      form.reset({
        description: editingKpiSmart.description,
        pillar_id: editingKpiSmart.pillar_id || '',
        kpi_smart_type_id: editingKpiSmart.kpi_smart_type_id || '',
        kpi_smart_action_verb_id: editingKpiSmart.kpi_smart_action_verb_id || '',
        kpi_smart_focus_id: editingKpiSmart.kpi_smart_focus_id || '',
        kpi_smart_unit_id: editingKpiSmart.kpi_smart_unit_id || '',
        status: editingKpiSmart.status === 'active',
      });
    } else {
      form.reset({
        description: '',
        pillar_id: '',
        kpi_smart_type_id: '',
        kpi_smart_action_verb_id: '',
        kpi_smart_focus_id: '',
        kpi_smart_unit_id: '',
        status: true,
      });
    }
  }, [editingKpiSmart, form, isDialogOpen]);

  const { data: kpiSmarts, isLoading: isLoadingKpiSmarts, error: errorKpiSmarts } = useQuery<KpiSmart[], Error>({
    queryKey: ['kpiSmarts', user?.id, selectedPillarFilter, selectedTypeFilter, selectedStatusFilter], // Adicionado filtros ao queryKey
    queryFn: async () => {
      if (!user?.id) return [];
      let query = supabase
        .from('kpi_smarts')
        .select('*, pillars(description), kpi_smart_types(description), kpi_smart_action_verbs(description), kpi_smart_focuses(description), kpi_smart_units(description)')
        .eq('user_id', user.id);
      
      // Aplicar filtros
      if (selectedPillarFilter !== 'all') {
        query = query.eq('pillar_id', selectedPillarFilter);
      }
      if (selectedTypeFilter !== 'all') {
        query = query.eq('kpi_smart_type_id', selectedTypeFilter);
      }
      if (selectedStatusFilter !== 'all') {
        query = query.eq('status', selectedStatusFilter);
      }

      query = query.order('code', { ascending: true });
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: pillars, isLoading: isLoadingPillars } = useQuery<Pillar[], Error>({
    queryKey: ['pillarsListForKpiSmart', user?.id],
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

  const { data: kpiSmartTypes, isLoading: isLoadingKpiSmartTypes } = useQuery<KpiSmartType[], Error>({
    queryKey: ['kpiSmartTypesListForKpiSmart', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('kpi_smart_types')
        .select('*')
        .eq('user_id', user.id)
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: kpiSmartActionVerbs, isLoading: isLoadingKpiSmartActionVerbs } = useQuery<KpiSmartActionVerb[], Error>({
    queryKey: ['kpiSmartActionVerbsListForKpiSmart', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('kpi_smart_action_verbs')
        .select('*')
        .eq('user_id', user.id)
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: kpiSmartFocuses, isLoading: isLoadingKpiSmartFocuses } = useQuery<KpiSmartFocus[], Error>({
    queryKey: ['kpiSmartFocusesListForKpiSmart', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('kpi_smart_focuses')
        .select('*')
        .eq('user_id', user.id)
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: kpiSmartUnits, isLoading: isLoadingKpiSmartUnits } = useQuery<KpiSmartUnit[], Error>({
    queryKey: ['kpiSmartUnitsListForKpiSmart', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('kpi_smart_units')
        .select('*')
        .eq('user_id', user.id)
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: kpiSmartStatuses, isLoading: isLoadingKpiSmartStatuses } = useQuery<KpiSmartStatus[], Error>({
    queryKey: ['kpiSmartStatusesListForKpiSmart', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('kpi_smart_statuses')
        .select('*')
        .eq('user_id', user.id)
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpiSmarts', user?.id] });
      setIsDialogOpen(false);
      setEditingKpiSmart(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createKpiSmartMutation = useMutation({
    mutationFn: async (data: KpiSmartFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newKpiSmart, error } = await supabase
        .from('kpi_smarts')
        .insert({
          description: data.description,
          pillar_id: data.pillar_id,
          kpi_smart_type_id: data.kpi_smart_type_id,
          kpi_smart_action_verb_id: data.kpi_smart_action_verb_id,
          kpi_smart_focus_id: data.kpi_smart_focus_id,
          kpi_smart_unit_id: data.kpi_smart_unit_id,
          status: data.status ? 'active' : 'inactive',
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return newKpiSmart;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('KPI Smart criado com sucesso!');
    },
  });

  const updateKpiSmartMutation = useMutation({
    mutationFn: async (data: KpiSmartFormData) => {
      if (!editingKpiSmart?.id) throw new Error("ID do KPI Smart está faltando.");
      const { data: updatedKpiSmart, error } = await supabase
        .from('kpi_smarts')
        .update({
          description: data.description,
          pillar_id: data.pillar_id,
          kpi_smart_type_id: data.kpi_smart_type_id,
          kpi_smart_action_verb_id: data.kpi_smart_action_verb_id,
          kpi_smart_focus_id: data.kpi_smart_focus_id,
          kpi_smart_unit_id: data.kpi_smart_unit_id,
          status: data.status ? 'active' : 'inactive',
        })
        .eq('id', editingKpiSmart.id)
        .eq('user_id', user?.id)
        .select()
        .single();
      if (error) throw error;
      return updatedKpiSmart;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('KPI Smart atualizado com sucesso!');
    },
  });

  const deleteKpiSmartMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error, count } = await supabase
        .from('kpi_smarts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("KPI Smart não encontrado ou você não tem permissão para excluí-lo.");
      }
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('KPI Smart excluído com sucesso!');
    },
  });

  const onSubmit = (data: KpiSmartFormData) => {
    if (editingKpiSmart) {
      updateKpiSmartMutation.mutate(data);
    } else {
      createKpiSmartMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingKpiSmart(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (kpiSmart: KpiSmart) => {
    setEditingKpiSmart(kpiSmart);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este KPI Smart?')) {
      deleteKpiSmartMutation.mutate(id);
    }
  };

  const isMutating = createKpiSmartMutation.isPending || updateKpiSmartMutation.isPending || deleteKpiSmartMutation.isPending;
  const isLoadingPage = isLoadingKpiSmarts || isLoadingPillars || isLoadingKpiSmartTypes || isLoadingKpiSmartActionVerbs || isLoadingKpiSmartFocuses || isLoadingKpiSmartUnits || isLoadingKpiSmartStatuses;

  if (isLoadingPage) {
    return <div className="text-center text-muted-foreground">Carregando KPIs Smart...</div>;
  }

  if (errorKpiSmarts) {
    return <div className="text-center text-destructive">Erro ao carregar KPIs Smart: {errorKpiSmarts.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground uppercase font-bold">Gerenciar KPIs Smart</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar KPI Smart
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Filtro por Pilar */}
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

            {/* Filtro por Tipo */}
            <div>
              <Label htmlFor="type-filter" className="text-foreground">Filtrar por Tipo</Label>
              <Select
                value={selectedTypeFilter}
                onValueChange={setSelectedTypeFilter}
                disabled={isLoadingKpiSmartTypes}
              >
                <SelectTrigger id="type-filter" className="rounded-lg">
                  <SelectValue placeholder="Todos os Tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  {kpiSmartTypes?.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Status */}
            <div>
              <Label htmlFor="status-filter" className="text-foreground">Filtrar por Status</Label>
              <Select
                value={selectedStatusFilter}
                onValueChange={setSelectedStatusFilter}
                disabled={isLoadingKpiSmartStatuses}
              >
                <SelectTrigger id="status-filter" className="rounded-lg">
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  {/* Você pode adicionar os status dinamicamente se necessário */}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Código</TableHead>
                <TableHead className="text-foreground">Descrição</TableHead>
                <TableHead className="text-foreground">Pilar</TableHead>
                <TableHead className="text-foreground">Tipo</TableHead>
                <TableHead className="text-foreground">Verbo de Ação</TableHead>
                <TableHead className="text-foreground">Foco</TableHead>
                <TableHead className="text-foreground">Unidade</TableHead>
                <TableHead className="text-foreground">Status</TableHead>
                <TableHead className="text-right text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpiSmarts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    Nenhum KPI Smart encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                kpiSmarts?.map((kpi) => (
                  <TableRow key={kpi.id}>
                    <TableCell className="font-medium text-foreground">{kpi.code}</TableCell>
                    <TableCell className="text-muted-foreground">{kpi.description}</TableCell>
                    <TableCell className="text-muted-foreground">{kpi.pillars?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{kpi.kpi_smart_types?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{kpi.kpi_smart_action_verbs?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{kpi.kpi_smart_focuses?.description || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{kpi.kpi_smart_units?.description || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={kpi.status === 'active' ? 'default' : 'secondary'}
                        className={kpi.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}
                      >
                        {kpi.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(kpi)}
                        className="mr-2 text-foreground hover:bg-accent rounded-lg"
                        disabled={isMutating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(kpi.id)}
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
            <DialogTitle className="text-foreground">{editingKpiSmart ? 'Editar KPI Smart' : 'Adicionar Novo KPI Smart'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Descrição do KPI Smart</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Aumentar a satisfação do cliente em 10% até o final do ano" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pillar_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Pilar</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingPillars}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um pilar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pillars?.length === 0 ? (
                          <SelectItem value="no-pillars" disabled>Nenhum pilar cadastrado</SelectItem>
                        ) : (
                          pillars?.map((pillar) => (
                            pillar.id && pillar.id !== '' ? (
                              <SelectItem key={pillar.id} value={pillar.id}>
                                {pillar.description}
                              </SelectItem>
                            ) : null
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
                name="kpi_smart_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Tipo de KPI Smart</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingKpiSmartTypes}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {kpiSmartTypes?.length === 0 ? (
                          <SelectItem value="no-types" disabled>Nenhum tipo cadastrado</SelectItem>
                        ) : (
                          kpiSmartTypes?.map((type) => (
                            type.id && type.id !== '' ? (
                              <SelectItem key={type.id} value={type.id}>
                                {type.description}
                              </SelectItem>
                            ) : null
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
                name="kpi_smart_action_verb_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Verbo de Ação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingKpiSmartActionVerbs}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um verbo de ação" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {kpiSmartActionVerbs?.length === 0 ? (
                          <SelectItem value="no-verbs" disabled>Nenhum verbo de ação cadastrado</SelectItem>
                        ) : (
                          kpiSmartActionVerbs?.map((verb) => (
                            verb.id && verb.id !== '' ? (
                              <SelectItem key={verb.id} value={verb.id}>
                                {verb.description}
                              </SelectItem>
                            ) : null
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
                name="kpi_smart_focus_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Foco</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingKpiSmartFocuses}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um foco" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {kpiSmartFocuses?.length === 0 ? (
                          <SelectItem value="no-focuses" disabled>Nenhum foco cadastrado</SelectItem>
                        ) : (
                          kpiSmartFocuses?.map((focus) => (
                            focus.id && focus.id !== '' ? (
                              <SelectItem key={focus.id} value={focus.id}>
                                {focus.description}
                              </SelectItem>
                            ) : null
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
                name="kpi_smart_unit_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Unidade de Medida</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingKpiSmartUnits}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione uma unidade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {kpiSmartUnits?.length === 0 ? (
                          <SelectItem value="no-units" disabled>Nenhuma unidade cadastrada</SelectItem>
                        ) : (
                          kpiSmartUnits?.map((unit) => (
                            unit.id && unit.id !== '' ? (
                              <SelectItem key={unit.id} value={unit.id}>
                                {unit.description}
                              </SelectItem>
                            ) : null
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
                  {editingKpiSmart ? 'Salvar Alterações' : 'Adicionar KPI Smart'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KpiSmartManagementPage;
import React, { useState, useEffect, useMemo } from 'react';
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
import { Kpi, KpiFormData } from '@/types/kpi';
import { Pillar } from '@/types/pillar';
import { PillarBlock } from '@/types/pillarBlock';
import { Tag } from '@/types/tag'; // Importar o tipo Tag
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MultiSelect, { MultiSelectOption } from '@/components/MultiSelect'; // Importar MultiSelect
import { Label } from '@/components/ui/label'; // Importar Label

const formSchema = z.object({
  pillar_id: z.string().min(1, { message: 'O pilar é obrigatório.' }),
  pillar_block_id: z.string().min(1, { message: 'O bloco é obrigatório.' }),
  question: z.string().min(1, { message: 'A pergunta é obrigatória.' }),
  tags: z.array(z.string()).optional(), // Alterado para array de strings para o MultiSelect
});

const KpiManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<Kpi | null>(null);

  // Estados para os filtros
  const [selectedPillarFilter, setSelectedPillarFilter] = useState<string>('all');
  const [selectedBlockFilter, setSelectedBlockFilter] = useState<string>('all');

  const form = useForm<z.infer<typeof formSchema>>({ // Usar z.infer<typeof formSchema> para o tipo do form
    resolver: zodResolver(formSchema),
    defaultValues: {
      pillar_id: '',
      pillar_block_id: '',
      question: '',
      tags: [], // Inicializar como array vazio
    },
  });

  const selectedPillarId = form.watch('pillar_id');

  useEffect(() => {
    if (editingKpi) {
      form.reset({
        pillar_id: editingKpi.pillar_id || '',
        pillar_block_id: editingKpi.pillar_block_id || '',
        question: editingKpi.question,
        tags: editingKpi.tags || [], // Carregar tags existentes
      });
    } else {
      form.reset({
        pillar_id: '',
        pillar_block_id: '',
        question: '',
        tags: [],
      });
    }
  }, [editingKpi, form, isDialogOpen]);

  const { data: kpis, isLoading: isLoadingKpis, error: errorKpis } = useQuery<Kpi[], Error>({
    queryKey: ['kpis', user?.id, selectedPillarFilter, selectedBlockFilter], // Adicionado filtros ao queryKey
    queryFn: async () => {
      if (!user?.id) return [];
      let query = supabase
        .from('kpis')
        .select('*, pillars(description, pillar_types(description)), pillar_blocks(name)')
        .eq('user_id', user.id);
      
      // Aplicar filtros
      if (selectedPillarFilter !== 'all') {
        query = query.eq('pillar_id', selectedPillarFilter);
      }
      if (selectedBlockFilter !== 'all') {
        query = query.eq('pillar_block_id', selectedBlockFilter);
      }

      query = query.order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: pillars, isLoading: isLoadingPillars } = useQuery<Pillar[], Error>({
    queryKey: ['pillarsListForKpi', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('pillars')
        .select('*, pillar_types(description)')
        .eq('user_id', user.id)
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: pillarBlocks, isLoading: isLoadingPillarBlocks } = useQuery<PillarBlock[], Error>({
    queryKey: ['pillarBlocksListForKpi', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('pillar_blocks')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: tags, isLoading: isLoadingTags } = useQuery<Tag[], Error>({
    queryKey: ['tagsForKpi', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const tagOptions: MultiSelectOption[] = useMemo(() => {
    return tags?.map(tag => ({ value: tag.name, label: tag.name })) || [];
  }, [tags]);

  const filteredPillarBlocks = useMemo(() => {
    if (!pillarBlocks || !selectedPillarId) return [];
    return pillarBlocks.filter(block => block.pillar_id === selectedPillarId);
  }, [pillarBlocks, selectedPillarId]);

  // Filtra os blocos para o dropdown de filtro
  const filteredBlocksForFilter = useMemo(() => {
    if (!pillarBlocks) return [];
    if (selectedPillarFilter === 'all') return pillarBlocks;
    return pillarBlocks.filter(block => block.pillar_id === selectedPillarFilter);
  }, [pillarBlocks, selectedPillarFilter]);

  const selectedPillar = pillars?.find(p => p.id === selectedPillarId);
  const selectedPillarTypeName = (selectedPillar as any)?.pillar_types?.description || 'N/A';

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis', user?.id] });
      setIsDialogOpen(false);
      setEditingKpi(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createKpiMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newKpi, error } = await supabase
        .from('kpis')
        .insert({
          pillar_id: data.pillar_id,
          pillar_block_id: data.pillar_block_id,
          question: data.question,
          tags: data.tags && data.tags.length > 0 ? data.tags : null, // Salvar tags
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return newKpi;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('KPI criado com sucesso!');
    },
  });

  const updateKpiMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      if (!editingKpi?.id) throw new Error("ID do KPI está faltando.");
      const { data: updatedKpi, error } = await supabase
        .from('kpis')
        .update({
          pillar_id: data.pillar_id,
          pillar_block_id: data.pillar_block_id,
          question: data.question,
          tags: data.tags && data.tags.length > 0 ? data.tags : null, // Atualizar tags
        })
        .eq('id', editingKpi.id)
        .eq('user_id', user?.id)
        .select()
        .single();
      if (error) throw error;
      return updatedKpi;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('KPI atualizado com sucesso!');
    },
  });

  const deleteKpiMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error, count } = await supabase
        .from('kpis')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("KPI não encontrado ou você não tem permissão para excluí-lo.");
      }
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('KPI excluído com sucesso!');
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (editingKpi) {
      updateKpiMutation.mutate(data);
    } else {
      createKpiMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingKpi(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (kpi: Kpi) => {
    setEditingKpi(kpi);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este KPI?')) {
      deleteKpiMutation.mutate(id);
    }
  };

  const isMutating = createKpiMutation.isPending || updateKpiMutation.isPending || deleteKpiMutation.isPending;
  const isLoadingPage = isLoadingKpis || isLoadingPillars || isLoadingPillarBlocks || isLoadingTags;

  if (isLoadingPage) {
    return <div className="text-center text-muted-foreground">Carregando KPIs...</div>;
  }

  if (errorKpis) {
    return <div className="text-center text-destructive">Erro ao carregar KPIs: {errorKpis.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground uppercase font-bold">Gerenciar Perguntas para KPIs de Diagnóstico</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Pergunta
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Filtro por Pilar */}
            <div>
              <Label htmlFor="pillar-filter" className="text-foreground">Filtrar por Pilar</Label>
              <Select
                value={selectedPillarFilter}
                onValueChange={(value) => {
                  setSelectedPillarFilter(value);
                  setSelectedBlockFilter('all'); // Resetar filtro de bloco ao mudar o pilar
                }}
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

            {/* Filtro por Bloco */}
            <div>
              <Label htmlFor="block-filter" className="text-foreground">Filtrar por Bloco</Label>
              <Select
                value={selectedBlockFilter}
                onValueChange={setSelectedBlockFilter}
                disabled={isLoadingPillarBlocks || (selectedPillarFilter !== 'all' && filteredBlocksForFilter.length === 0)}
              >
                <SelectTrigger id="block-filter" className="rounded-lg">
                  <SelectValue placeholder="Todos os Blocos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Blocos</SelectItem>
                  {filteredBlocksForFilter.length === 0 ? (
                    <SelectItem value="no-blocks" disabled>Nenhum bloco para este pilar</SelectItem>
                  ) : (
                    filteredBlocksForFilter.map((block) => (
                      <SelectItem key={block.id} value={block.id}>
                        {block.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Pilar</TableHead>
                <TableHead className="text-foreground">Bloco</TableHead>
                <TableHead className="text-foreground">Pergunta</TableHead>
                <TableHead className="text-foreground">Tags</TableHead> {/* Nova coluna para Tags */}
                <TableHead className="text-right text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpis?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground"> {/* Colspan ajustado */}
                    Nenhuma pergunta de KPI encontrada com os filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                kpis?.map((kpi) => (
                  <TableRow key={kpi.id}>
                    <TableCell className="text-muted-foreground">
                      {(kpi as any).pillars?.description || 'N/A'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(kpi as any).pillar_blocks?.name || 'N/A'}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{kpi.question}</TableCell>
                    <TableCell className="text-muted-foreground"> {/* Exibir Tags */}
                      {kpi.tags && kpi.tags.length > 0 ? kpi.tags.join(', ') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right flex justify-end items-center gap-1">
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
            <DialogTitle className="text-foreground">{editingKpi ? 'Editar Pergunta de KPI' : 'Adicionar Nova Pergunta de KPI'}</DialogTitle>
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
                      form.setValue('pillar_block_id', ''); // Reset pillar block when pillar changes
                    }} value={field.value} disabled={isLoadingPillars}>
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
              <FormItem>
                <FormLabel className="text-foreground">Tipo do Pilar</FormLabel>
                <Input value={selectedPillarTypeName} readOnly className="rounded-lg bg-muted text-muted-foreground" />
              </FormItem>
              <FormField
                control={form.control}
                name="pillar_block_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Bloco</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedPillarId || isLoadingPillarBlocks || filteredPillarBlocks.length === 0}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um bloco" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredPillarBlocks.length === 0 ? (
                          <SelectItem value="no-blocks" disabled>Nenhum bloco para este pilar</SelectItem>
                        ) : (
                          filteredPillarBlocks.map((block) => (
                            block.id && block.id !== '' ? (
                              <SelectItem key={block.id} value={block.id}>
                                {block.name}
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
                name="question"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Pergunta</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Quão satisfeito você está com o produto?" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Tags (Opcional)</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={tagOptions}
                        selected={field.value || []}
                        onChange={field.onChange}
                        placeholder="Selecione as tags..."
                        className="rounded-lg"
                      />
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
                  {editingKpi ? 'Salvar Alterações' : 'Adicionar Pergunta'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KpiManagementPage;
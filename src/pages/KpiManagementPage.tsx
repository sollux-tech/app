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
import { ScoringScale } from '@/types/scoringScale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  name: z.string().min(1, { message: 'O nome do KPI é obrigatório.' }),
  pillar_id: z.string().min(1, { message: 'O pilar é obrigatório.' }),
  pillar_block_id: z.string().min(1, { message: 'O bloco é obrigatório.' }),
  question: z.string().min(1, { message: 'A pergunta é obrigatória.' }),
  scoring_scale_id: z.string().min(1, { message: 'A nota da régua de pontuação é obrigatória.' }),
  weight_percentage: z.coerce.number().min(0, { message: 'O peso deve ser entre 0 e 100.' }).max(100, { message: 'O peso deve ser entre 0 e 100.' }),
});

const KpiManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<Kpi | null>(null);

  const form = useForm<KpiFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      pillar_id: '',
      pillar_block_id: '',
      question: '',
      scoring_scale_id: '',
      weight_percentage: '',
    },
  });

  const selectedPillarId = form.watch('pillar_id');

  useEffect(() => {
    if (editingKpi) {
      form.reset({
        name: editingKpi.name,
        pillar_id: editingKpi.pillar_id || '',
        pillar_block_id: editingKpi.pillar_block_id || '',
        question: editingKpi.question,
        scoring_scale_id: editingKpi.scoring_scale_id || '',
        weight_percentage: editingKpi.weight_percentage,
      });
    } else {
      form.reset({
        name: '',
        pillar_id: '',
        pillar_block_id: '',
        question: '',
        scoring_scale_id: '',
        weight_percentage: '',
      });
    }
  }, [editingKpi, form, isDialogOpen]);

  const { data: kpis, isLoading: isLoadingKpis, error: errorKpis } = useQuery<Kpi[], Error>({
    queryKey: ['kpis', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('kpis')
        .select('*, pillars(description, pillar_types(description)), pillar_blocks(name), scoring_scales(score)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
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

  const { data: scoringScales, isLoading: isLoadingScoringScales } = useQuery<ScoringScale[], Error>({
    queryKey: ['scoringScalesListForKpi', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('scoring_scales')
        .select('*')
        .eq('user_id', user.id)
        .order('score', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const filteredPillarBlocks = useMemo(() => {
    if (!pillarBlocks || !selectedPillarId) return [];
    return pillarBlocks.filter(block => block.pillar_id === selectedPillarId);
  }, [pillarBlocks, selectedPillarId]);

  const selectedPillar = pillars?.find(p => p.id === selectedPillarId);
  const selectedPillarTypeName = (selectedPillar as any)?.pillar_types?.description || 'N/A';
  const selectedScoringScaleScore = scoringScales?.find(s => s.id === form.watch('scoring_scale_id'))?.score || 'N/A';

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
    mutationFn: async (data: KpiFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newKpi, error } = await supabase
        .from('kpis')
        .insert({
          name: data.name,
          pillar_id: data.pillar_id,
          pillar_block_id: data.pillar_block_id,
          question: data.question,
          scoring_scale_id: data.scoring_scale_id,
          weight_percentage: Number(data.weight_percentage),
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
    mutationFn: async (data: KpiFormData) => {
      if (!editingKpi?.id) throw new Error("ID do KPI está faltando.");
      const { data: updatedKpi, error } = await supabase
        .from('kpis')
        .update({
          name: data.name,
          pillar_id: data.pillar_id,
          pillar_block_id: data.pillar_block_id,
          question: data.question,
          scoring_scale_id: data.scoring_scale_id,
          weight_percentage: Number(data.weight_percentage),
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

  const onSubmit = (data: KpiFormData) => {
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
  const isLoadingPage = isLoadingKpis || isLoadingPillars || isLoadingPillarBlocks || isLoadingScoringScales;

  if (isLoadingPage) {
    return <div className="text-center text-gray-600">Carregando KPIs...</div>;
  }

  if (errorKpis) {
    return <div className="text-center text-red-600">Erro ao carregar KPIs: {errorKpis.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sollux-black uppercase font-bold">Gerenciar KPIs de Diagnóstico</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar KPI
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sollux-black">Nome do KPI</TableHead>
                <TableHead className="text-sollux-black">Pilar</TableHead>
                <TableHead className="text-sollux-black">Bloco</TableHead>
                <TableHead className="text-sollux-black">Pergunta</TableHead>
                <TableHead className="text-sollux-black">Nota</TableHead>
                <TableHead className="text-sollux-black">Peso (%)</TableHead>
                <TableHead className="text-right text-sollux-black">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpis?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500">
                    Nenhum KPI encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                kpis?.map((kpi) => (
                  <TableRow key={kpi.id}>
                    <TableCell className="font-medium text-sollux-black">{kpi.name}</TableCell>
                    <TableCell className="text-gray-700">
                      {(kpi as any).pillars?.description || 'N/A'}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {(kpi as any).pillar_blocks?.name || 'N/A'}
                    </TableCell>
                    <TableCell className="text-gray-700">{kpi.question}</TableCell>
                    <TableCell className="text-gray-700">
                      {(kpi as any).scoring_scales?.score || 'N/A'}
                    </TableCell>
                    <TableCell className="text-gray-700">{kpi.weight_percentage}%</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(kpi)}
                        className="mr-2 text-sollux-black hover:bg-gray-100 rounded-lg"
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
        <DialogContent className="sm:max-w-lg bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-sollux-card-border">
          <DialogHeader>
            <DialogTitle className="text-sollux-black">{editingKpi ? 'Editar KPI de Diagnóstico' : 'Adicionar Novo KPI de Diagnóstico'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Nome do KPI</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Satisfação do Cliente" {...field} className="rounded-lg" />
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
                    <FormLabel className="text-sollux-black">Pilar</FormLabel>
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
                          <SelectItem value="" disabled>Nenhum pilar cadastrado</SelectItem>
                        ) : (
                          pillars?.map((pillar) => (
                            <SelectItem key={pillar.id} value={pillar.id}>
                              {pillar.description}
                            </SelectItem>
                          ))
                        )}
                      </TSelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel className="text-sollux-black">Tipo do Pilar</FormLabel>
                <Input value={selectedPillarTypeName} readOnly className="rounded-lg bg-gray-100 text-gray-700" />
              </FormItem>
              <FormField
                control={form.control}
                name="pillar_block_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Bloco</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedPillarId || isLoadingPillarBlocks || filteredPillarBlocks.length === 0}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um bloco" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredPillarBlocks.length === 0 ? (
                          <SelectItem value="" disabled>Nenhum bloco para este pilar</SelectItem>
                        ) : (
                          filteredPillarBlocks.map((block) => (
                            <SelectItem key={block.id} value={block.id}>
                              {block.name}
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
                name="question"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Pergunta</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Quão satisfeito você está com o produto?" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scoring_scale_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Régua de Pontuação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingScoringScales}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione uma nota da régua" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {scoringScales?.length === 0 ? (
                          <SelectItem value="" disabled>Nenhuma régua de pontuação cadastrada</SelectItem>
                        ) : (
                          scoringScales?.map((scale) => (
                            <SelectItem key={scale.id} value={scale.id}>
                              {scale.score} - {scale.description}
                            </SelectItem>
                          ))
                        )}
                      </TSelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel className="text-sollux-black">Nota Selecionada</FormLabel>
                <Input value={selectedScoringScaleScore} readOnly className="rounded-lg bg-gray-100 text-gray-700" />
              </FormItem>
              <FormField
                control={form.control}
                name="weight_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Peso (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Ex: 10" {...field} className="rounded-lg" />
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
                  {editingKpi ? 'Salvar Alterações' : 'Adicionar KPI'}
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
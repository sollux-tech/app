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
import { Plus, Edit, Trash2, Palette, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { ClassificationScale, ClassificationScaleFormData } from '@/types/classificationScale';
import { Pillar } from '@/types/pillar';
import { PillarBlock } from '@/types/pillarBlock';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  pillar_id: z.string().optional().nullable().transform(e => e === '' ? null : e),
  pillar_block_id: z.string().optional().nullable().transform(e => e === '' ? null : e),
  min_percentage: z.coerce.number().min(0, { message: 'Mínimo 0%' }).max(100, { message: 'Máximo 100%' }),
  max_percentage: z.coerce.number().min(0, { message: 'Mínimo 0%' }).max(100, { message: 'Máximo 100%' }),
  classification_label: z.string().min(1, { message: 'A classificação é obrigatória.' }),
  color_code: z.enum(['red', 'yellow', 'blue', 'green'], { required_error: 'A cor é obrigatória.' }),
}).refine(data => data.max_percentage >= data.min_percentage, {
  message: "O percentual máximo deve ser maior ou igual ao mínimo.",
  path: ["max_percentage"],
});

const ClassificationScaleManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScale, setEditingScale] = useState<ClassificationScale | null>(null);

  const form = useForm<ClassificationScaleFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pillar_id: '',
      pillar_block_id: '',
      min_percentage: '',
      max_percentage: '',
      classification_label: '',
      color_code: 'blue', // Default color
    },
  });

  const selectedPillarId = form.watch('pillar_id');

  useEffect(() => {
    if (editingScale) {
      form.reset({
        pillar_id: editingScale.pillar_id || '',
        pillar_block_id: editingScale.pillar_block_id || '',
        min_percentage: editingScale.min_percentage,
        max_percentage: editingScale.max_percentage,
        classification_label: editingScale.classification_label,
        color_code: editingScale.color_code,
      });
    } else {
      form.reset({
        pillar_id: '',
        pillar_block_id: '',
        min_percentage: '',
        max_percentage: '',
        classification_label: '',
        color_code: 'blue',
      });
    }
  }, [editingScale, form, isDialogOpen]);

  const { data: classificationScales, isLoading: isLoadingScales, error: errorScales } = useQuery<ClassificationScale[], Error>({
    queryKey: ['classificationScales', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('classification_scales')
        .select('*, pillars(description), pillar_blocks(name)')
        .eq('user_id', user.id)
        .order('min_percentage', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: pillars, isLoading: isLoadingPillars } = useQuery<Pillar[], Error>({
    queryKey: ['pillarsListForClassification', user?.id],
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

  const { data: pillarBlocks, isLoading: isLoadingPillarBlocks } = useQuery<PillarBlock[], Error>({
    queryKey: ['pillarBlocksListForClassification', user?.id],
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

  const filteredPillarBlocks = useMemo(() => {
    if (!pillarBlocks || !selectedPillarId) return [];
    return pillarBlocks.filter(block => block.pillar_id === selectedPillarId);
  }, [pillarBlocks, selectedPillarId]);

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classificationScales', user?.id] });
      setIsDialogOpen(false);
      setEditingScale(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createScaleMutation = useMutation({
    mutationFn: async (data: ClassificationScaleFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newScale, error } = await supabase
        .from('classification_scales')
        .insert({
          user_id: user.id,
          pillar_id: data.pillar_id === '' ? null : data.pillar_id,
          pillar_block_id: data.pillar_block_id === '' ? null : data.pillar_block_id,
          min_percentage: Number(data.min_percentage),
          max_percentage: Number(data.max_percentage),
          classification_label: data.classification_label,
          color_code: data.color_code,
        })
        .select()
        .single();
      if (error) throw error;
      return newScale;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Régua de Classificação criada com sucesso!');
    },
  });

  const updateScaleMutation = useMutation({
    mutationFn: async (data: ClassificationScaleFormData) => {
      if (!editingScale?.id) throw new Error("ID da régua de classificação está faltando.");
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: updatedScale, error } = await supabase
        .from('classification_scales')
        .update({
          pillar_id: data.pillar_id === '' ? null : data.pillar_id,
          pillar_block_id: data.pillar_block_id === '' ? null : data.pillar_block_id,
          min_percentage: Number(data.min_percentage),
          max_percentage: Number(data.max_percentage),
          classification_label: data.classification_label,
          color_code: data.color_code,
        })
        .eq('id', editingScale.id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return updatedScale;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Régua de Classificação atualizada com sucesso!');
    },
  });

  const deleteScaleMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error, count } = await supabase
        .from('classification_scales')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("Régua de classificação não encontrada ou você não tem permissão para excluí-la.");
      }
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Régua de Classificação excluída com sucesso!');
    },
  });

  const onSubmit = (data: ClassificationScaleFormData) => {
    if (editingScale) {
      updateScaleMutation.mutate(data);
    } else {
      createScaleMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingScale(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (scale: ClassificationScale) => {
    setEditingScale(scale);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta régua de classificação?')) {
      deleteScaleMutation.mutate(id);
    }
  };

  const isMutating = createScaleMutation.isPending || updateScaleMutation.isPending || deleteScaleMutation.isPending;
  const isLoadingPage = isLoadingScales || isLoadingPillars || isLoadingPillarBlocks;

  const getColorClass = (colorCode: 'red' | 'yellow' | 'blue' | 'green') => {
    switch (colorCode) {
      case 'red': return 'bg-red-500 text-white';
      case 'yellow': return 'bg-yellow-500 text-black';
      case 'blue': return 'bg-blue-500 text-white';
      case 'green': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (isLoadingPage) {
    return <div className="text-center text-muted-foreground">Carregando réguas de classificação...</div>;
  }

  if (errorScales) {
    return <div className="text-center text-destructive">Erro ao carregar réguas de classificação: {errorScales.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground uppercase font-bold">Gerenciar Régua de Classificação</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Régua
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Pilar</TableHead>
                <TableHead className="text-foreground">Bloco</TableHead>
                <TableHead className="text-foreground">Percentual</TableHead>
                <TableHead className="text-foreground">Classificação</TableHead>
                <TableHead className="text-foreground">Cor</TableHead>
                <TableHead className="text-right text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classificationScales?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma régua de classificação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                classificationScales?.map((scale) => (
                  <TableRow key={scale.id}>
                    <TableCell className="text-muted-foreground">
                      {(scale as any).pillars?.description || 'Global'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(scale as any).pillar_blocks?.name || 'Global'}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {scale.min_percentage}% a {scale.max_percentage}%
                    </TableCell>
                    <TableCell className="text-muted-foreground">{scale.classification_label}</TableCell>
                    <TableCell>
                      <Badge className={getColorClass(scale.color_code)}>
                        {scale.color_code.charAt(0).toUpperCase() + scale.color_code.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(scale)}
                        className="mr-2 text-foreground hover:bg-accent rounded-lg"
                        disabled={isMutating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(scale.id)}
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
            <DialogTitle className="text-foreground">{editingScale ? 'Editar Régua de Classificação' : 'Adicionar Nova Régua de Classificação'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pillar_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Pilar (Opcional)</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('pillar_block_id', ''); // Reset pillar block when pillar changes
                      }} value={field.value || ''} disabled={isLoadingPillars}>
                        <FormControl>
                          <SelectTrigger className="rounded-lg">
                            <SelectValue placeholder="Global (todos os pilares)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Global (todos os pilares)</SelectItem>
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
                  name="pillar_block_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Bloco (Opcional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''} disabled={!selectedPillarId || isLoadingPillarBlocks || filteredPillarBlocks.length === 0}>
                        <FormControl>
                          <SelectTrigger className="rounded-lg">
                            <SelectValue placeholder="Global (todos os blocos)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Global (todos os blocos)</SelectItem>
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
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="min_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Percentual Mínimo (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Ex: 0" {...field} className="rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="max_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Percentual Máximo (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Ex: 49.99" {...field} className="rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="classification_label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Classificação</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Crítico, Alerta, Satisfatório" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Cor da Sinalização</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isMutating}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione uma cor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="red">Vermelho</SelectItem>
                        <SelectItem value="yellow">Amarelo</SelectItem>
                        <SelectItem value="blue">Azul</SelectItem>
                        <SelectItem value="green">Verde</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isMutating} className="rounded-lg">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isMutating} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
                  {editingScale ? 'Salvar Alterações' : 'Adicionar Régua'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassificationScaleManagementPage;
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
import { ScoringScale, ScoringScaleFormData } from '@/types/scoringScale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  score: z.coerce.number().min(0, { message: 'A nota deve ser entre 0 e 5.' }).max(5, { message: 'A nota deve ser entre 0 e 5.' }),
  description: z.string().min(1, { message: 'A descrição é obrigatória.' }),
  status: z.boolean().default(true),
});

const ScoringScaleManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScoringScale, setEditingScoringScale] = useState<ScoringScale | null>(null);

  const form = useForm<ScoringScaleFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      score: '',
      description: '',
      status: true,
    },
  });

  useEffect(() => {
    if (editingScoringScale) {
      form.reset({
        score: editingScoringScale.score,
        description: editingScoringScale.description,
        status: editingScoringScale.status === 'active',
      });
    } else {
      form.reset({
        score: '',
        description: '',
        status: true,
      });
    }
  }, [editingScoringScale, form, isDialogOpen]);

  const { data: scoringScales, isLoading, error } = useQuery<ScoringScale[], Error>({
    queryKey: ['scoringScales', user?.id],
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

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoringScales', user?.id] });
      setIsDialogOpen(false);
      setEditingScoringScale(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createScoringScaleMutation = useMutation({
    mutationFn: async (data: ScoringScaleFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newScoringScale, error } = await supabase
        .from('scoring_scales')
        .insert({
          score: Number(data.score),
          description: data.description,
          status: data.status ? 'active' : 'inactive',
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return newScoringScale;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Régua de Pontuação criada com sucesso!');
    },
  });

  const updateScoringScaleMutation = useMutation({
    mutationFn: async (data: ScoringScaleFormData) => {
      if (!editingScoringScale?.id) throw new Error("ID da régua de pontuação está faltando.");
      const { data: updatedScoringScale, error } = await supabase
        .from('scoring_scales')
        .update({
          score: Number(data.score),
          description: data.description,
          status: data.status ? 'active' : 'inactive',
        })
        .eq('id', editingScoringScale.id)
        .eq('user_id', user?.id)
        .select()
        .single();
      if (error) throw error;
      return updatedScoringScale;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Régua de Pontuação atualizada com sucesso!');
    },
  });

  const deleteScoringScaleMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error, count } = await supabase
        .from('scoring_scales')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("Régua de pontuação não encontrada ou você não tem permissão para excluí-la.");
      }
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Régua de Pontuação excluída com sucesso!');
    },
  });

  const onSubmit = (data: ScoringScaleFormData) => {
    if (editingScoringScale) {
      updateScoringScaleMutation.mutate(data);
    } else {
      createScoringScaleMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingScoringScale(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (scoringScale: ScoringScale) => {
    setEditingScoringScale(scoringScale);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta régua de pontuação?')) {
      deleteScoringScaleMutation.mutate(id);
    }
  };

  const isMutating = createScoringScaleMutation.isPending || updateScoringScaleMutation.isPending || deleteScoringScaleMutation.isPending;

  if (isLoading) {
    return <div className="text-center text-gray-600">Carregando réguas de pontuação...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600">Erro ao carregar réguas de pontuação: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sollux-black uppercase font-bold">Gerenciar Régua de Pontuação</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Régua
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sollux-black">Nota</TableHead>
                <TableHead className="text-sollux-black">Descrição</TableHead>
                <TableHead className="text-sollux-black">Status</TableHead>
                <TableHead className="text-right text-sollux-black">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scoringScales?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500">
                    Nenhuma régua de pontuação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                scoringScales?.map((scale) => (
                  <TableRow key={scale.id}>
                    <TableCell className="font-medium text-sollux-black">{scale.score}</TableCell>
                    <TableCell className="text-gray-700">{scale.description}</TableCell>
                    <TableCell>
                      <Badge
                        variant={scale.status === 'active' ? 'default' : 'secondary'}
                        className={scale.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}
                      >
                        {scale.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(scale)}
                        className="mr-2 text-sollux-black hover:bg-gray-100 rounded-lg"
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
        <DialogContent className="sm:max-w-[425px] bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-sollux-card-border">
          <DialogHeader>
            <DialogTitle className="text-sollux-black">{editingScoringScale ? 'Editar Régua de Pontuação' : 'Adicionar Nova Régua de Pontuação'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Nota</FormLabel>
                    <Select onValueChange={field.onChange} value={String(field.value)} disabled={isMutating}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione uma nota" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5].map((s) => (
                          <SelectItem key={s} value={String(s)}>
                            {s}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Descrição</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Resposta excelente" {...field} className="rounded-lg" />
                    </FormControl>
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
                      <FormLabel className="text-sollux-black">Status</FormLabel>
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
                  {editingScoringScale ? 'Salvar Alterações' : 'Adicionar Régua'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScoringScaleManagementPage;
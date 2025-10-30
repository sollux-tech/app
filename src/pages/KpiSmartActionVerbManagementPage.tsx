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
import { KpiSmartActionVerb, KpiSmartActionVerbFormData } from '@/types/kpiSmartActionVerb';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  description: z.string().min(1, { message: 'A descrição do verbo de ação é obrigatória.' }),
});

const KpiSmartActionVerbManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKpiSmartActionVerb, setEditingKpiSmartActionVerb] = useState<KpiSmartActionVerb | null>(null);

  const form = useForm<KpiSmartActionVerbFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
    },
  });

  useEffect(() => {
    if (editingKpiSmartActionVerb) {
      form.reset({
        description: editingKpiSmartActionVerb.description,
      });
    } else {
      form.reset({
        description: '',
      });
    }
  }, [editingKpiSmartActionVerb, form, isDialogOpen]);

  const { data: kpiSmartActionVerbs, isLoading, error } = useQuery<KpiSmartActionVerb[], Error>({
    queryKey: ['kpiSmartActionVerbs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('kpi_smart_action_verbs')
        .select('*')
        .eq('user_id', user.id)
        .order('code', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpiSmartActionVerbs', user?.id] });
      setIsDialogOpen(false);
      setEditingKpiSmartActionVerb(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createKpiSmartActionVerbMutation = useMutation({
    mutationFn: async (data: KpiSmartActionVerbFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newKpiSmartActionVerb, error } = await supabase
        .from('kpi_smart_action_verbs')
        .insert({
          description: data.description,
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return newKpiSmartActionVerb;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Verbo de Ação de KPI Smart criado com sucesso!');
    },
  });

  const updateKpiSmartActionVerbMutation = useMutation({
    mutationFn: async (data: KpiSmartActionVerbFormData) => {
      if (!editingKpiSmartActionVerb?.id) throw new Error("ID do verbo de ação de KPI Smart está faltando.");
      const { data: updatedKpiSmartActionVerb, error } = await supabase
        .from('kpi_smart_action_verbs')
        .update({
          description: data.description,
        })
        .eq('id', editingKpiSmartActionVerb.id)
        .eq('user_id', user?.id)
        .select()
        .single();
      if (error) throw error;
      return updatedKpiSmartActionVerb;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Verbo de Ação de KPI Smart atualizado com sucesso!');
    },
  });

  const deleteKpiSmartActionVerbMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error, count } = await supabase
        .from('kpi_smart_action_verbs')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("Verbo de ação de KPI Smart não encontrado ou você não tem permissão para excluí-lo.");
      }
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Verbo de Ação de KPI Smart excluído com sucesso!');
    },
  });

  const onSubmit = (data: KpiSmartActionVerbFormData) => {
    if (editingKpiSmartActionVerb) {
      updateKpiSmartActionVerbMutation.mutate(data);
    } else {
      createKpiSmartActionVerbMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingKpiSmartActionVerb(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (kpiSmartActionVerb: KpiSmartActionVerb) => {
    setEditingKpiSmartActionVerb(kpiSmartActionVerb);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este verbo de ação de KPI Smart?')) {
      deleteKpiSmartActionVerbMutation.mutate(id);
    }
  };

  const isMutating = createKpiSmartActionVerbMutation.isPending || updateKpiSmartActionVerbMutation.isPending || deleteKpiSmartActionVerbMutation.isPending;

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Carregando verbos de ação de KPI Smart...</div>;
  }

  if (error) {
    return <div className="text-center text-destructive">Erro ao carregar verbos de ação de KPI Smart: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground uppercase font-bold">Gerenciar Verbos de Ação de KPI Smart</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Verbo
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Código</TableHead>
                <TableHead className="text-foreground">Descrição</TableHead>
                <TableHead className="text-right text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpiSmartActionVerbs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhum verbo de ação de KPI Smart encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                kpiSmartActionVerbs?.map((verb) => (
                  <TableRow key={verb.id}>
                    <TableCell className="font-medium text-foreground">{verb.code}</TableCell>
                    <TableCell className="text-muted-foreground">{verb.description}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(verb)}
                        className="mr-2 text-foreground hover:bg-accent rounded-lg"
                        disabled={isMutating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(verb.id)}
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
            <DialogTitle className="text-foreground">{editingKpiSmartActionVerb ? 'Editar Verbo de Ação de KPI Smart' : 'Adicionar Novo Verbo de Ação de KPI Smart'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Descrição do Verbo de Ação</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Aumentar, Reduzir, Manter, Otimizar" {...field} className="rounded-lg" />
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
                  {editingKpiSmartActionVerb ? 'Salvar Alterações' : 'Adicionar Verbo'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KpiSmartActionVerbManagementPage;
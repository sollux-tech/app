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
import { KpiSmartFrequency, KpiSmartFrequencyFormData } from '@/types/kpiSmartFrequency';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  description: z.string().min(1, { message: 'A descrição da frequência de monitoramento é obrigatória.' }),
});

const KpiSmartFrequencyManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKpiSmartFrequency, setEditingKpiSmartFrequency] = useState<KpiSmartFrequency | null>(null);

  const form = useForm<KpiSmartFrequencyFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
    },
  });

  useEffect(() => {
    if (editingKpiSmartFrequency) {
      form.reset({
        description: editingKpiSmartFrequency.description,
      });
    } else {
      form.reset({
        description: '',
      });
    }
  }, [editingKpiSmartFrequency, form, isDialogOpen]);

  const { data: kpiSmartFrequencies, isLoading, error } = useQuery<KpiSmartFrequency[], Error>({
    queryKey: ['kpiSmartFrequencies', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('kpi_smart_frequencies')
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
      queryClient.invalidateQueries({ queryKey: ['kpiSmartFrequencies', user?.id] });
      setIsDialogOpen(false);
      setEditingKpiSmartFrequency(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createKpiSmartFrequencyMutation = useMutation({
    mutationFn: async (data: KpiSmartFrequencyFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newKpiSmartFrequency, error } = await supabase
        .from('kpi_smart_frequencies')
        .insert({
          description: data.description,
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return newKpiSmartFrequency;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Frequência de Monitoramento de KPI Smart criada com sucesso!');
    },
  });

  const updateKpiSmartFrequencyMutation = useMutation({
    mutationFn: async (data: KpiSmartFrequencyFormData) => {
      if (!editingKpiSmartFrequency?.id) throw new Error("ID da frequência de monitoramento de KPI Smart está faltando.");
      const { data: updatedKpiSmartFrequency, error } = await supabase
        .from('kpi_smart_frequencies')
        .update({
          description: data.description,
        })
        .eq('id', editingKpiSmartFrequency.id)
        .eq('user_id', user?.id)
        .select()
        .single();
      if (error) throw error;
      return updatedKpiSmartFrequency;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Frequência de Monitoramento de KPI Smart atualizada com sucesso!');
    },
  });

  const deleteKpiSmartFrequencyMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error, count } = await supabase
        .from('kpi_smart_frequencies')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("Frequência de monitoramento de KPI Smart não encontrada ou você não tem permissão para excluí-la.");
      }
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Frequência de Monitoramento de KPI Smart excluída com sucesso!');
    },
  });

  const onSubmit = (data: KpiSmartFrequencyFormData) => {
    if (editingKpiSmartFrequency) {
      updateKpiSmartFrequencyMutation.mutate(data);
    } else {
      createKpiSmartFrequencyMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingKpiSmartFrequency(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (kpiSmartFrequency: KpiSmartFrequency) => {
    setEditingKpiSmartFrequency(kpiSmartFrequency);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta frequência de monitoramento de KPI Smart?')) {
      deleteKpiSmartFrequencyMutation.mutate(id);
    }
  };

  const isMutating = createKpiSmartFrequencyMutation.isPending || updateKpiSmartFrequencyMutation.isPending || deleteKpiSmartFrequencyMutation.isPending;

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Carregando frequências de monitoramento de KPI Smart...</div>;
  }

  if (error) {
    return <div className="text-center text-destructive">Erro ao carregar frequências de monitoramento de KPI Smart: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground uppercase font-bold">Gerenciar Frequências de Monitoramento de KPI Smart</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Frequência
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
              {kpiSmartFrequencies?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhuma frequência de monitoramento de KPI Smart encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                kpiSmartFrequencies?.map((frequency) => (
                  <TableRow key={frequency.id}>
                    <TableCell className="font-medium text-foreground">{frequency.code}</TableCell>
                    <TableCell className="text-muted-foreground">{frequency.description}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(frequency)}
                        className="mr-2 text-foreground hover:bg-accent rounded-lg"
                        disabled={isMutating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(frequency.id)}
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
            <DialogTitle className="text-foreground">{editingKpiSmartFrequency ? 'Editar Frequência de Monitoramento de KPI Smart' : 'Adicionar Nova Frequência de Monitoramento de KPI Smart'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Descrição da Frequência</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Diário, Semanal, Mensal, Trimestral" {...field} className="rounded-lg" />
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
                  {editingKpiSmartFrequency ? 'Salvar Alterações' : 'Adicionar Frequência'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KpiSmartFrequencyManagementPage;
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
import { KpiSmartStatus, KpiSmartStatusFormData } from '@/types/kpiSmartStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  description: z.string().min(1, { message: 'A descrição do status é obrigatória.' }),
});

const KpiSmartStatusManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKpiSmartStatus, setEditingKpiSmartStatus] = useState<KpiSmartStatus | null>(null);

  const form = useForm<KpiSmartStatusFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
    },
  });

  useEffect(() => {
    if (editingKpiSmartStatus) {
      form.reset({
        description: editingKpiSmartStatus.description,
      });
    } else {
      form.reset({
        description: '',
      });
    }
  }, [editingKpiSmartStatus, form, isDialogOpen]);

  const { data: kpiSmartStatuses, isLoading, error } = useQuery<KpiSmartStatus[], Error>({
    queryKey: ['kpiSmartStatuses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('kpi_smart_statuses')
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
      queryClient.invalidateQueries({ queryKey: ['kpiSmartStatuses', user?.id] });
      setIsDialogOpen(false);
      setEditingKpiSmartStatus(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createKpiSmartStatusMutation = useMutation({
    mutationFn: async (data: KpiSmartStatusFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newKpiSmartStatus, error } = await supabase
        .from('kpi_smart_statuses')
        .insert({
          description: data.description,
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return newKpiSmartStatus;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Status de KPI Smart criado com sucesso!');
    },
  });

  const updateKpiSmartStatusMutation = useMutation({
    mutationFn: async (data: KpiSmartStatusFormData) => {
      if (!editingKpiSmartStatus?.id) throw new Error("ID do status de KPI Smart está faltando.");
      const { data: updatedKpiSmartStatus, error } = await supabase
        .from('kpi_smart_statuses')
        .update({
          description: data.description,
        })
        .eq('id', editingKpiSmartStatus.id)
        .eq('user_id', user?.id)
        .select()
        .single();
      if (error) throw error;
      return updatedKpiSmartStatus;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Status de KPI Smart atualizado com sucesso!');
    },
  });

  const deleteKpiSmartStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error, count } = await supabase
        .from('kpi_smart_statuses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("Status de KPI Smart não encontrado ou você não tem permissão para excluí-lo.");
      }
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Status de KPI Smart excluído com sucesso!');
    },
  });

  const onSubmit = (data: KpiSmartStatusFormData) => {
    if (editingKpiSmartStatus) {
      updateKpiSmartStatusMutation.mutate(data);
    } else {
      createKpiSmartStatusMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingKpiSmartStatus(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (kpiSmartStatus: KpiSmartStatus) => {
    setEditingKpiSmartStatus(kpiSmartStatus);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este status de KPI Smart?')) {
      deleteKpiSmartStatusMutation.mutate(id);
    }
  };

  const isMutating = createKpiSmartStatusMutation.isPending || updateKpiSmartStatusMutation.isPending || deleteKpiSmartStatusMutation.isPending;

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Carregando status de KPI Smart...</div>;
  }

  if (error) {
    return <div className="text-center text-destructive">Erro ao carregar status de KPI Smart: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground uppercase font-bold">Gerenciar Status de KPI Smart</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Status
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
              {kpiSmartStatuses?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhum status de KPI Smart encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                kpiSmartStatuses?.map((status) => (
                  <TableRow key={status.id}>
                    <TableCell className="font-medium text-foreground">{status.code}</TableCell>
                    <TableCell className="text-muted-foreground">{status.description}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(status)}
                        className="mr-2 text-foreground hover:bg-accent rounded-lg"
                        disabled={isMutating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(status.id)}
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
            <DialogTitle className="text-foreground">{editingKpiSmartStatus ? 'Editar Status de KPI Smart' : 'Adicionar Novo Status de KPI Smart'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Descrição do Status</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Em Andamento, Concluído, Atrasado" {...field} className="rounded-lg" />
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
                  {editingKpiSmartStatus ? 'Salvar Alterações' : 'Adicionar Status'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KpiSmartStatusManagementPage;
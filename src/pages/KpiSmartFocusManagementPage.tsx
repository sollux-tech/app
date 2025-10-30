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
import { KpiSmartFocus, KpiSmartFocusFormData } from '@/types/kpiSmartFocus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  description: z.string().min(1, { message: 'A descrição do foco é obrigatória.' }),
});

const KpiSmartFocusManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKpiSmartFocus, setEditingKpiSmartFocus] = useState<KpiSmartFocus | null>(null);

  const form = useForm<KpiSmartFocusFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
    },
  });

  useEffect(() => {
    if (editingKpiSmartFocus) {
      form.reset({
        description: editingKpiSmartFocus.description,
      });
    } else {
      form.reset({
        description: '',
      });
    }
  }, [editingKpiSmartFocus, form, isDialogOpen]);

  const { data: kpiSmartFocuses, isLoading, error } = useQuery<KpiSmartFocus[], Error>({
    queryKey: ['kpiSmartFocuses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('kpi_smart_focuses')
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
      queryClient.invalidateQueries({ queryKey: ['kpiSmartFocuses', user?.id] });
      setIsDialogOpen(false);
      setEditingKpiSmartFocus(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createKpiSmartFocusMutation = useMutation({
    mutationFn: async (data: KpiSmartFocusFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newKpiSmartFocus, error } = await supabase
        .from('kpi_smart_focuses')
        .insert({
          description: data.description,
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return newKpiSmartFocus;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Foco de KPI Smart criado com sucesso!');
    },
  });

  const updateKpiSmartFocusMutation = useMutation({
    mutationFn: async (data: KpiSmartFocusFormData) => {
      if (!editingKpiSmartFocus?.id) throw new Error("ID do foco de KPI Smart está faltando.");
      const { data: updatedKpiSmartFocus, error } = await supabase
        .from('kpi_smart_focuses')
        .update({
          description: data.description,
        })
        .eq('id', editingKpiSmartFocus.id)
        .eq('user_id', user?.id)
        .select()
        .single();
      if (error) throw error;
      return updatedKpiSmartFocus;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Foco de KPI Smart atualizado com sucesso!');
    },
  });

  const deleteKpiSmartFocusMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error, count } = await supabase
        .from('kpi_smart_focuses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("Foco de KPI Smart não encontrado ou você não tem permissão para excluí-lo.");
      }
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Foco de KPI Smart excluído com sucesso!');
    },
  });

  const onSubmit = (data: KpiSmartFocusFormData) => {
    if (editingKpiSmartFocus) {
      updateKpiSmartFocusMutation.mutate(data);
    } else {
      createKpiSmartFocusMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingKpiSmartFocus(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (kpiSmartFocus: KpiSmartFocus) => {
    setEditingKpiSmartFocus(kpiSmartFocus);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este foco de KPI Smart?')) {
      deleteKpiSmartFocusMutation.mutate(id);
    }
  };

  const isMutating = createKpiSmartFocusMutation.isPending || updateKpiSmartFocusMutation.isPending || deleteKpiSmartFocusMutation.isPending;

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Carregando focos de KPI Smart...</div>;
  }

  if (error) {
    return <div className="text-center text-destructive">Erro ao carregar focos de KPI Smart: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground uppercase font-bold">Gerenciar Focos de KPI Smart</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Foco
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
              {kpiSmartFocuses?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhum foco de KPI Smart encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                kpiSmartFocuses?.map((focus) => (
                  <TableRow key={focus.id}>
                    <TableCell className="font-medium text-foreground">{focus.code}</TableCell>
                    <TableCell className="text-muted-foreground">{focus.description}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(focus)}
                        className="mr-2 text-foreground hover:bg-accent rounded-lg"
                        disabled={isMutating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(focus.id)}
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
            <DialogTitle className="text-foreground">{editingKpiSmartFocus ? 'Editar Foco de KPI Smart' : 'Adicionar Novo Foco de KPI Smart'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Descrição do Foco</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Crescimento, Eficiência, Qualidade" {...field} className="rounded-lg" />
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
                  {editingKpiSmartFocus ? 'Salvar Alterações' : 'Adicionar Foco'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KpiSmartFocusManagementPage;
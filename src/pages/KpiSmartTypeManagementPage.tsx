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
import { KpiSmartType, KpiSmartTypeFormData } from '@/types/kpiSmartType';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  description: z.string().min(1, { message: 'A descrição do tipo de KPI Smart é obrigatória.' }),
});

const KpiSmartTypeManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKpiSmartType, setEditingKpiSmartType] = useState<KpiSmartType | null>(null);

  const form = useForm<KpiSmartTypeFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
    },
  });

  useEffect(() => {
    if (editingKpiSmartType) {
      form.reset({
        description: editingKpiSmartType.description,
      });
    } else {
      form.reset({
        description: '',
      });
    }
  }, [editingKpiSmartType, form, isDialogOpen]);

  const { data: kpiSmartTypes, isLoading, error } = useQuery<KpiSmartType[], Error>({
    queryKey: ['kpiSmartTypes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('kpi_smart_types')
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
      queryClient.invalidateQueries({ queryKey: ['kpiSmartTypes', user?.id] });
      setIsDialogOpen(false);
      setEditingKpiSmartType(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createKpiSmartTypeMutation = useMutation({
    mutationFn: async (data: KpiSmartTypeFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newKpiSmartType, error } = await supabase
        .from('kpi_smart_types')
        .insert({
          description: data.description,
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return newKpiSmartType;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Tipo de KPI Smart criado com sucesso!');
    },
  });

  const updateKpiSmartTypeMutation = useMutation({
    mutationFn: async (data: KpiSmartTypeFormData) => {
      if (!editingKpiSmartType?.id) throw new Error("ID do tipo de KPI Smart está faltando.");
      const { data: updatedKpiSmartType, error } = await supabase
        .from('kpi_smart_types')
        .update({
          description: data.description,
        })
        .eq('id', editingKpiSmartType.id)
        .eq('user_id', user?.id)
        .select()
        .single();
      if (error) throw error;
      return updatedKpiSmartType;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Tipo de KPI Smart atualizado com sucesso!');
    },
  });

  const deleteKpiSmartTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error, count } = await supabase
        .from('kpi_smart_types')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("Tipo de KPI Smart não encontrado ou você não tem permissão para excluí-lo.");
      }
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Tipo de KPI Smart excluído com sucesso!');
    },
  });

  const onSubmit = (data: KpiSmartTypeFormData) => {
    if (editingKpiSmartType) {
      updateKpiSmartTypeMutation.mutate(data);
    } else {
      createKpiSmartTypeMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingKpiSmartType(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (kpiSmartType: KpiSmartType) => {
    setEditingKpiSmartType(kpiSmartType);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este tipo de KPI Smart?')) {
      deleteKpiSmartTypeMutation.mutate(id);
    }
  };

  const isMutating = createKpiSmartTypeMutation.isPending || updateKpiSmartTypeMutation.isPending || deleteKpiSmartTypeMutation.isPending;

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Carregando tipos de KPI Smart...</div>;
  }

  if (error) {
    return <div className="text-center text-destructive">Erro ao carregar tipos de KPI Smart: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground uppercase font-bold">Gerenciar Tipos de KPI Smart</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Tipo
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
              {kpiSmartTypes?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhum tipo de KPI Smart encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                kpiSmartTypes?.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium text-foreground">{type.code}</TableCell>
                    <TableCell className="text-muted-foreground">{type.description}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(type)}
                        className="mr-2 text-foreground hover:bg-accent rounded-lg"
                        disabled={isMutating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(type.id)}
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
            <DialogTitle className="text-foreground">{editingKpiSmartType ? 'Editar Tipo de KPI Smart' : 'Adicionar Novo Tipo de KPI Smart'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Descrição do Tipo</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Específico, Mensurável, Atingível, Relevante, Temporal" {...field} className="rounded-lg" />
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
                  {editingKpiSmartType ? 'Salvar Alterações' : 'Adicionar Tipo'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KpiSmartTypeManagementPage;
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
import { KpiSmartUnit, KpiSmartUnitFormData } from '@/types/kpiSmartUnit';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  description: z.string().min(1, { message: 'A descrição da unidade de medida é obrigatória.' }),
});

const KpiSmartUnitManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKpiSmartUnit, setEditingKpiSmartUnit] = useState<KpiSmartUnit | null>(null);

  const form = useForm<KpiSmartUnitFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
    },
  });

  useEffect(() => {
    if (editingKpiSmartUnit) {
      form.reset({
        description: editingKpiSmartUnit.description,
      });
    } else {
      form.reset({
        description: '',
      });
    }
  }, [editingKpiSmartUnit, form, isDialogOpen]);

  const { data: kpiSmartUnits, isLoading, error } = useQuery<KpiSmartUnit[], Error>({
    queryKey: ['kpiSmartUnits', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('kpi_smart_units')
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
      queryClient.invalidateQueries({ queryKey: ['kpiSmartUnits', user?.id] });
      setIsDialogOpen(false);
      setEditingKpiSmartUnit(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createKpiSmartUnitMutation = useMutation({
    mutationFn: async (data: KpiSmartUnitFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newKpiSmartUnit, error } = await supabase
        .from('kpi_smart_units')
        .insert({
          description: data.description,
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return newKpiSmartUnit;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Unidade de Medida de KPI Smart criada com sucesso!');
    },
  });

  const updateKpiSmartUnitMutation = useMutation({
    mutationFn: async (data: KpiSmartUnitFormData) => {
      if (!editingKpiSmartUnit?.id) throw new Error("ID da unidade de medida de KPI Smart está faltando.");
      const { data: updatedKpiSmartUnit, error } = await supabase
        .from('kpi_smart_units')
        .update({
          description: data.description,
        })
        .eq('id', editingKpiSmartUnit.id)
        .eq('user_id', user?.id)
        .select()
        .single();
      if (error) throw error;
      return updatedKpiSmartUnit;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Unidade de Medida de KPI Smart atualizada com sucesso!');
    },
  });

  const deleteKpiSmartUnitMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error, count } = await supabase
        .from('kpi_smart_units')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("Unidade de medida de KPI Smart não encontrada ou você não tem permissão para excluí-la.");
      }
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Unidade de Medida de KPI Smart excluída com sucesso!');
    },
  });

  const onSubmit = (data: KpiSmartUnitFormData) => {
    if (editingKpiSmartUnit) {
      updateKpiSmartUnitMutation.mutate(data);
    } else {
      createKpiSmartUnitMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingKpiSmartUnit(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (kpiSmartUnit: KpiSmartUnit) => {
    setEditingKpiSmartUnit(kpiSmartUnit);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta unidade de medida de KPI Smart?')) {
      deleteKpiSmartUnitMutation.mutate(id);
    }
  };

  const isMutating = createKpiSmartUnitMutation.isPending || updateKpiSmartUnitMutation.isPending || deleteKpiSmartUnitMutation.isPending;

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Carregando unidades de medida de KPI Smart...</div>;
  }

  if (error) {
    return <div className="text-center text-destructive">Erro ao carregar unidades de medida de KPI Smart: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground uppercase font-bold">Gerenciar Unidades de Medida de KPI Smart</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Unidade
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
              {kpiSmartUnits?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhuma unidade de medida de KPI Smart encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                kpiSmartUnits?.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium text-foreground">{unit.code}</TableCell>
                    <TableCell className="text-muted-foreground">{unit.description}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(unit)}
                        className="mr-2 text-foreground hover:bg-accent rounded-lg"
                        disabled={isMutating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(unit.id)}
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
            <DialogTitle className="text-foreground">{editingKpiSmartUnit ? 'Editar Unidade de Medida de KPI Smart' : 'Adicionar Nova Unidade de Medida de KPI Smart'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Descrição da Unidade</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Porcentagem, Número, Valor Monetário" {...field} className="rounded-lg" />
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
                  {editingKpiSmartUnit ? 'Salvar Alterações' : 'Adicionar Unidade'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KpiSmartUnitManagementPage;
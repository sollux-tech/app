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
import { DiagnosticStatus, DiagnosticStatusFormData } from '@/types/diagnosticStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  code: z.string().length(3, { message: 'O código deve ter exatamente 3 caracteres.' }).toUpperCase(),
  description: z.string().min(1, { message: 'A descrição do status é obrigatória.' }),
});

const DiagnosticStatusManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<DiagnosticStatus | null>(null);

  const form = useForm<DiagnosticStatusFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
      description: '',
    },
  });

  useEffect(() => {
    if (editingStatus) {
      form.reset({
        code: editingStatus.code,
        description: editingStatus.description,
      });
    } else {
      form.reset({
        code: '',
        description: '',
      });
    }
  }, [editingStatus, form, isDialogOpen]);

  const { data: statuses, isLoading, error } = useQuery<DiagnosticStatus[], Error>({
    queryKey: ['diagnosticStatuses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('diagnostic_statuses')
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
      queryClient.invalidateQueries({ queryKey: ['diagnosticStatuses', user?.id] });
      setIsDialogOpen(false);
      setEditingStatus(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createStatusMutation = useMutation({
    mutationFn: async (data: DiagnosticStatusFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newStatus, error } = await supabase
        .from('diagnostic_statuses')
        .insert({
          code: data.code,
          description: data.description,
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return newStatus;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Status de diagnóstico criado com sucesso!');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: DiagnosticStatusFormData) => {
      if (!editingStatus?.id) throw new Error("ID do status está faltando.");
      const { data: updatedStatus, error } = await supabase
        .from('diagnostic_statuses')
        .update({
          code: data.code,
          description: data.description,
        })
        .eq('id', editingStatus.id)
        .eq('user_id', user?.id)
        .select()
        .single();
      if (error) throw error;
      return updatedStatus;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Status de diagnóstico atualizado com sucesso!');
    },
  });

  const deleteStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error, count } = await supabase
        .from('diagnostic_statuses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("Status de diagnóstico não encontrado ou você não tem permissão para excluí-lo.");
      }
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Status de diagnóstico excluído com sucesso!');
    },
  });

  const onSubmit = (data: DiagnosticStatusFormData) => {
    if (editingStatus) {
      updateStatusMutation.mutate(data);
    } else {
      createStatusMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingStatus(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (status: DiagnosticStatus) => {
    setEditingStatus(status);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este status de diagnóstico?')) {
      deleteStatusMutation.mutate(id);
    }
  };

  const isMutating = createStatusMutation.isPending || updateStatusMutation.isPending || deleteStatusMutation.isPending;

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Carregando status de diagnósticos...</div>;
  }

  if (error) {
    return <div className="text-center text-destructive">Erro ao carregar status de diagnósticos: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground uppercase font-bold">Gerenciar Status de Diagnósticos</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Status
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Código</TableHead>
                <TableHead className="text-foreground">Descrição do Status</TableHead>
                <TableHead className="text-right text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statuses?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhum status de diagnóstico encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                statuses?.map((status) => (
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
            <DialogTitle className="text-foreground">{editingStatus ? 'Editar Status de Diagnóstico' : 'Adicionar Novo Status de Diagnóstico'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Código (3 caracteres)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: PND" {...field} maxLength={3} className="rounded-lg text-foreground" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Descrição do Status</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Pendente de Diagnóstico" {...field} className="rounded-lg text-foreground" />
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
                  {editingStatus ? 'Salvar Alterações' : 'Adicionar Status'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiagnosticStatusManagementPage;
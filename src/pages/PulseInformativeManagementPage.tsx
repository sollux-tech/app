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
import { Plus, Edit, Trash2, Newspaper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { PulseInformative, PulseInformativeFormData } from '@/types/pulseInformative';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/components/SessionContextProvider';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formSchema = z.object({
  title: z.string().min(1, { message: 'O título do informativo é obrigatório.' }),
  content: z.string().min(1, { message: 'O conteúdo do informativo é obrigatório.' }),
});

const PulseInformativeManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInformative, setEditingInformative] = useState<PulseInformative | null>(null);

  const form = useForm<PulseInformativeFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
    },
  });

  useEffect(() => {
    if (editingInformative) {
      form.reset({
        title: editingInformative.title,
        content: editingInformative.content,
      });
    } else {
      form.reset({
        title: '',
        content: '',
      });
    }
  }, [editingInformative, form, isDialogOpen]);

  const { data: informatives, isLoading, error } = useQuery<PulseInformative[], Error>({
    queryKey: ['pulseInformatives', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('pulse_informatives')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const createInformativeMutation = useMutation({
    mutationFn: async (data: PulseInformativeFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newInformative, error } = await supabase
        .from('pulse_informatives')
        .insert({ ...data, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return newInformative;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulseInformatives'] });
      showSuccess('Informativo criado com sucesso!');
      setIsDialogOpen(false);
    },
    onError: (error) => {
      showError(`Erro ao criar informativo: ${error.message}`);
    },
  });

  const updateInformativeMutation = useMutation({
    mutationFn: async (data: PulseInformativeFormData) => {
      if (!editingInformative?.id) throw new Error("ID do informativo está faltando.");
      const { data: updatedInformative, error } = await supabase
        .from('pulse_informatives')
        .update(data)
        .eq('id', editingInformative.id)
        .select()
        .single();
      if (error) throw error;
      return updatedInformative;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulseInformatives'] });
      showSuccess('Informativo atualizado com sucesso!');
      setIsDialogOpen(false);
      setEditingInformative(null);
    },
    onError: (error) => {
      showError(`Erro ao atualizar informativo: ${error.message}`);
    },
  });

  const deleteInformativeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pulse_informatives')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulseInformatives'] });
      showSuccess('Informativo excluído com sucesso!');
    },
    onError: (error) => {
      showError(`Erro ao excluir informativo: ${error.message}`);
    },
  });

  const onSubmit = (data: PulseInformativeFormData) => {
    if (editingInformative) {
      updateInformativeMutation.mutate(data);
    } else {
      createInformativeMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingInformative(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (informative: PulseInformative) => {
    setEditingInformative(informative);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este informativo?')) {
      deleteInformativeMutation.mutate(id);
    }
  };

  const isMutating = createInformativeMutation.isPending || updateInformativeMutation.isPending || deleteInformativeMutation.isPending;

  if (isLoading) {
    return <div className="text-center text-gray-600">Carregando informativos...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600">Erro ao carregar informativos: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sollux-black uppercase font-bold">Gerenciar Informativos PULSE</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Informativo
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sollux-black">Título</TableHead>
                <TableHead className="text-sollux-black">Conteúdo</TableHead>
                <TableHead className="text-sollux-black">Criado em</TableHead>
                <TableHead className="text-right text-sollux-black">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {informatives?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500">
                    Nenhum informativo encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                informatives?.map((informative) => (
                  <TableRow key={informative.id}>
                    <TableCell className="font-medium text-sollux-black">{informative.title}</TableCell>
                    <TableCell className="text-gray-700 max-w-xs truncate">{informative.content}</TableCell>
                    <TableCell className="text-gray-700">
                      {format(new Date(informative.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(informative)}
                        className="mr-2 text-sollux-black hover:bg-gray-100 rounded-lg"
                        disabled={isMutating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(informative.id)}
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
        <DialogContent className="sm:max-w-[600px] bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-sollux-card-border">
          <DialogHeader>
            <DialogTitle className="text-sollux-black">{editingInformative ? 'Editar Informativo' : 'Adicionar Novo Informativo'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Título do informativo" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Conteúdo</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Conteúdo detalhado do informativo" {...field} className="rounded-lg min-h-[100px]" />
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
                  {editingInformative ? 'Salvar Alterações' : 'Adicionar Informativo'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PulseInformativeManagementPage;
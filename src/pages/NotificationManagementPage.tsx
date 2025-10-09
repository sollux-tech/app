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
import { Notification, NotificationFormData } from '@/types/notification';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formSchema = z.object({
  title: z.string().min(1, { message: 'O título é obrigatório.' }),
  message: z.string().min(1, { message: 'A mensagem é obrigatória.' }),
  type: z.enum(['info', 'success', 'warning', 'error'], { required_error: 'O tipo é obrigatório.' }),
});

const NotificationManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);

  const form = useForm<NotificationFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      message: '',
      type: 'info',
    },
  });

  useEffect(() => {
    if (editingNotification) {
      form.reset(editingNotification);
    } else {
      form.reset({ title: '', message: '', type: 'info' });
    }
  }, [editingNotification, form, isDialogOpen]);

  const { data: notifications, isLoading, error } = useQuery<Notification[], Error>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: async (data: NotificationFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newNotification, error } = await supabase
        .from('notifications')
        .insert({ ...data, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return newNotification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showSuccess('Notificação criada com sucesso!');
      setIsDialogOpen(false);
    },
    onError: (error) => {
      showError(`Erro ao criar notificação: ${error.message}`);
    },
  });

  const updateNotificationMutation = useMutation({
    mutationFn: async (data: NotificationFormData) => {
      if (!editingNotification?.id) throw new Error("ID da notificação está faltando.");
      const { data: updatedNotification, error } = await supabase
        .from('notifications')
        .update(data)
        .eq('id', editingNotification.id)
        .select()
        .single();
      if (error) throw error;
      return updatedNotification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showSuccess('Notificação atualizada com sucesso!');
      setIsDialogOpen(false);
      setEditingNotification(null);
    },
    onError: (error) => {
      showError(`Erro ao atualizar notificação: ${error.message}`);
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showSuccess('Notificação excluída com sucesso!');
    },
    onError: (error) => {
      showError(`Erro ao excluir notificação: ${error.message}`);
    },
  });

  const onSubmit = (data: NotificationFormData) => {
    if (editingNotification) {
      updateNotificationMutation.mutate(data);
    } else {
      createNotificationMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingNotification(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (notification: Notification) => {
    setEditingNotification(notification);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta notificação?')) {
      deleteNotificationMutation.mutate(id);
    }
  };

  const isMutating = createNotificationMutation.isPending || updateNotificationMutation.isPending || deleteNotificationMutation.isPending;

  if (isLoading) return <div className="text-center text-gray-600">Carregando notificações...</div>;
  if (error) return <div className="text-center text-red-600">Erro ao carregar notificações: {error.message}</div>;

  return (
    <div className="space-y-6">
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sollux-black uppercase font-bold">Gerenciar Notificações</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Notificação
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sollux-black">Título</TableHead>
                <TableHead className="text-sollux-black">Tipo</TableHead>
                <TableHead className="text-sollux-black">Criado em</TableHead>
                <TableHead className="text-right text-sollux-black">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500">Nenhuma notificação encontrada.</TableCell>
                </TableRow>
              ) : (
                notifications?.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell className="font-medium text-sollux-black">{notification.title}</TableCell>
                    <TableCell className="text-gray-700 capitalize">{notification.type}</TableCell>
                    <TableCell className="text-gray-700">{format(new Date(notification.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(notification)} className="mr-2 rounded-lg" disabled={isMutating}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(notification.id)} className="rounded-lg" disabled={isMutating}>
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
            <DialogTitle className="text-sollux-black">{editingNotification ? 'Editar Notificação' : 'Nova Notificação'}</DialogTitle>
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
                      <Input placeholder="Título da notificação" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Mensagem</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Conteúdo da notificação" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="info">Informativo</SelectItem>
                        <SelectItem value="success">Sucesso</SelectItem>
                        <SelectItem value="warning">Aviso</SelectItem>
                        <SelectItem value="error">Erro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isMutating} className="rounded-lg">Cancelar</Button>
                <Button type="submit" disabled={isMutating} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
                  {editingNotification ? 'Salvar Alterações' : 'Criar Notificação'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationManagementPage;
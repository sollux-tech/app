import React, { useState, useEffect, useMemo } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MultiSelect from '@/components/MultiSelect';
import { Profile } from '@/types/profile';
import { Company } from '@/types/company';

const formSchema = z.object({
  title: z.string().min(1, { message: 'O título é obrigatório.' }),
  message: z.string().min(1, { message: 'A mensagem é obrigatória.' }),
  type: z.enum(['info', 'success', 'warning', 'error'], { required_error: 'O tipo é obrigatório.' }),
  target_type: z.enum(['all', 'users', 'companies']),
  target_user_ids: z.array(z.string()).optional(),
  target_company_ids: z.array(z.string()).optional(),
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
      target_type: 'all',
      target_user_ids: [],
      target_company_ids: [],
    },
  });

  const targetType = form.watch('target_type');

  useEffect(() => {
    if (editingNotification) {
      form.reset({
        ...editingNotification,
        target_user_ids: editingNotification.target_user_ids || [],
        target_company_ids: editingNotification.target_company_ids || [],
      });
    } else {
      form.reset({ title: '', message: '', type: 'info', target_type: 'all', target_user_ids: [], target_company_ids: [] });
    }
  }, [editingNotification, form, isDialogOpen]);

  const { data: notifications, isLoading: isLoadingNotifications } = useQuery<Notification[], Error>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: users, isLoading: isLoadingUsers } = useQuery<Profile[], Error>({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, first_name, last_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: companies, isLoading: isLoadingCompanies } = useQuery<Company[], Error>({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('id, name');
      if (error) throw error;
      return data;
    },
  });

  const userOptions = useMemo(() => users?.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}` })) || [], [users]);
  const companyOptions = useMemo(() => companies?.map(c => ({ value: c.id, label: c.name })) || [], [companies]);

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setIsDialogOpen(false);
      setEditingNotification(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createNotificationMutation = useMutation({
    mutationFn: async (data: NotificationFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error } = await supabase.from('notifications').insert({
        ...data,
        creator_user_id: user.id,
        target_user_ids: data.target_type === 'users' ? data.target_user_ids : null,
        target_company_ids: data.target_type === 'companies' ? data.target_company_ids : null,
      });
      if (error) throw error;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Notificação criada com sucesso!');
    },
  });

  const updateNotificationMutation = useMutation({
    mutationFn: async (data: NotificationFormData) => {
      if (!editingNotification?.id) throw new Error("ID da notificação está faltando.");
      const { error } = await supabase.from('notifications').update({
        ...data,
        target_user_ids: data.target_type === 'users' ? data.target_user_ids : null,
        target_company_ids: data.target_type === 'companies' ? data.target_company_ids : null,
      }).eq('id', editingNotification.id);
      if (error) throw error;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Notificação atualizada com sucesso!');
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Notificação excluída com sucesso!');
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
  const isLoading = isLoadingNotifications || isLoadingUsers || isLoadingCompanies;

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
          {isLoading ? <p>Carregando...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sollux-black">Título</TableHead>
                  <TableHead className="text-sollux-black">Público</TableHead>
                  <TableHead className="text-sollux-black">Criado em</TableHead>
                  <TableHead className="text-right text-sollux-black">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications?.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell className="font-medium text-sollux-black">{notification.title}</TableCell>
                    <TableCell className="text-gray-700 capitalize">{
                      { all: 'Todos', users: 'Usuários Específicos', companies: 'Empresas Específicas' }[notification.target_type]
                    }</TableCell>
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-sollux-card-border">
          <DialogHeader>
            <DialogTitle className="text-sollux-black">{editingNotification ? 'Editar Notificação' : 'Nova Notificação'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel className="text-sollux-black">Título</FormLabel><FormControl><Input placeholder="Título da notificação" {...field} className="rounded-lg" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="message" render={({ field }) => (
                <FormItem><FormLabel className="text-sollux-black">Mensagem</FormLabel><FormControl><Textarea placeholder="Conteúdo da notificação" {...field} className="rounded-lg" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem><FormLabel className="text-sollux-black">Tipo</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="rounded-lg"><SelectValue placeholder="Selecione um tipo" /></SelectTrigger></FormControl><SelectContent><SelectItem value="info">Informativo</SelectItem><SelectItem value="success">Sucesso</SelectItem><SelectItem value="warning">Aviso</SelectItem><SelectItem value="error">Erro</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
              
              <FormField control={form.control} name="target_type" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel className="text-sollux-black">Enviar para</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="all" /></FormControl><FormLabel className="font-normal">Todos</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="users" /></FormControl><FormLabel className="font-normal">Usuários Específicos</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="companies" /></FormControl><FormLabel className="font-normal">Empresas Específicas</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>
              )} />

              {targetType === 'users' && (
                <FormField control={form.control} name="target_user_ids" render={({ field }) => (
                  <FormItem><FormLabel className="text-sollux-black">Selecionar Usuários</FormLabel><FormControl><MultiSelect options={userOptions} selected={field.value || []} onChange={field.onChange} placeholder="Selecione os usuários..." /></FormControl><FormMessage /></FormItem>
                )} />
              )}

              {targetType === 'companies' && (
                <FormField control={form.control} name="target_company_ids" render={({ field }) => (
                  <FormItem><FormLabel className="text-sollux-black">Selecionar Empresas</FormLabel><FormControl><MultiSelect options={companyOptions} selected={field.value || []} onChange={field.onChange} placeholder="Selecione as empresas..." /></FormControl><FormMessage /></FormItem>
                )} />
              )}

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
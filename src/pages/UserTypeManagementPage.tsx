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
import { Plus, Edit, Trash2, UserCog } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { UserType, UserTypeFormData } from '@/types/userType';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  name: z.string().min(1, { message: 'O nome do tipo de usuário é obrigatório.' }),
  description: z.string().optional(),
});

const UserTypeManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUserType, setEditingUserType] = useState<UserType | null>(null);

  const form = useForm<UserTypeFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (editingUserType) {
      form.reset({
        name: editingUserType.name,
        description: editingUserType.description || '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
      });
    }
  }, [editingUserType, form, isDialogOpen]);

  const { data: userTypes, isLoading, error } = useQuery<UserType[], Error>({
    queryKey: ['userTypes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_types')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createUserTypeMutation = useMutation({
    mutationFn: async (data: UserTypeFormData) => {
      const { data: newUserType, error } = await supabase
        .from('user_types')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return newUserType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userTypes'] });
      showSuccess('Tipo de usuário criado com sucesso!');
      setIsDialogOpen(false);
    },
    onError: (error) => {
      showError(`Erro ao criar tipo de usuário: ${error.message}`);
    },
  });

  const updateUserTypeMutation = useMutation({
    mutationFn: async (data: UserTypeFormData) => {
      if (!editingUserType?.id) throw new Error("User type ID is missing.");
      const { data: updatedUserType, error } = await supabase
        .from('user_types')
        .update(data)
        .eq('id', editingUserType.id)
        .select()
        .single();
      if (error) throw error;
      return updatedUserType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userTypes'] });
      showSuccess('Tipo de usuário atualizado com sucesso!');
      setIsDialogOpen(false);
      setEditingUserType(null);
    },
    onError: (error) => {
      showError(`Erro ao atualizar tipo de usuário: ${error.message}`);
    },
  });

  const deleteUserTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_types')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userTypes'] });
      showSuccess('Tipo de usuário excluído com sucesso!');
    },
    onError: (error) => {
      showError(`Erro ao excluir tipo de usuário: ${error.message}`);
    },
  });

  const onSubmit = (data: UserTypeFormData) => {
    if (editingUserType) {
      updateUserTypeMutation.mutate(data);
    } else {
      createUserTypeMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingUserType(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (userType: UserType) => {
    setEditingUserType(userType);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este tipo de usuário?')) {
      deleteUserTypeMutation.mutate(id);
    }
  };

  const isMutating = createUserTypeMutation.isPending || updateUserTypeMutation.isPending || deleteUserTypeMutation.isPending;

  if (isLoading) {
    return <div className="text-center text-gray-600">Carregando tipos de usuário...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600">Erro ao carregar tipos de usuário: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sollux-black uppercase font-bold">Gerenciar Tipos de Usuário</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Tipo
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sollux-black">Nome</TableHead>
                <TableHead className="text-sollux-black">Descrição</TableHead>
                <TableHead className="text-right text-sollux-black">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userTypes?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-500">
                    Nenhum tipo de usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                userTypes?.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium text-sollux-black">{type.name}</TableCell>
                    <TableCell className="text-gray-700">{type.description || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(type)}
                        className="mr-2 text-sollux-black hover:bg-gray-100 rounded-lg"
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
        <DialogContent className="sm:max-w-[425px] bg-sollux-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-sollux-card-border">
          <DialogHeader>
            <DialogTitle className="text-sollux-black">{editingUserType ? 'Editar Tipo de Usuário' : 'Adicionar Novo Tipo de Usuário'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Admin Sollux" {...field} className="rounded-lg" />
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
                    <FormLabel className="text-sollux-black">Descrição (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Breve descrição do tipo de usuário" {...field} className="rounded-lg" />
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
                  {editingUserType ? 'Salvar Alterações' : 'Adicionar Tipo'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserTypeManagementPage;
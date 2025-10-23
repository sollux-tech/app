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
import { Tag, TagFormData } from '@/types/tag';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';

const formSchema = z.object({
  name: z.string().min(1, { message: 'O nome da tag é obrigatório.' }),
});

const TagManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const form = useForm<TagFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (editingTag) {
      form.reset({
        name: editingTag.name,
      });
    } else {
      form.reset({
        name: '',
      });
    }
  }, [editingTag, form, isDialogOpen]);

  const { data: tags, isLoading, error } = useQuery<Tag[], Error>({
    queryKey: ['tags', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', user?.id] });
      setIsDialogOpen(false);
      setEditingTag(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createTagMutation = useMutation({
    mutationFn: async (data: TagFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newTag, error } = await supabase
        .from('tags')
        .insert({
          name: data.name,
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return newTag;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Tag criada com sucesso!');
    },
  });

  const updateTagMutation = useMutation({
    mutationFn: async (data: TagFormData) => {
      if (!editingTag?.id) throw new Error("ID da tag está faltando.");
      const { data: updatedTag, error } = await supabase
        .from('tags')
        .update({
          name: data.name,
        })
        .eq('id', editingTag.id)
        .eq('user_id', user?.id)
        .select()
        .single();
      if (error) throw error;
      return updatedTag;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Tag atualizada com sucesso!');
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error, count } = await supabase
        .from('tags')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("Tag não encontrada ou você não tem permissão para excluí-la.");
      }
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Tag excluída com sucesso!');
    },
  });

  const onSubmit = (data: TagFormData) => {
    if (editingTag) {
      updateTagMutation.mutate(data);
    } else {
      createTagMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingTag(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (tag: Tag) => {
    setEditingTag(tag);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta tag?')) {
      deleteTagMutation.mutate(id);
    }
  };

  const isMutating = createTagMutation.isPending || updateTagMutation.isPending || deleteTagMutation.isPending;

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Carregando tags...</div>;
  }

  if (error) {
    return <div className="text-center text-destructive">Erro ao carregar tags: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground uppercase font-bold">Gerenciar Tags</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Tag
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Nome da Tag</TableHead>
                <TableHead className="text-right text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    Nenhuma tag encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                tags?.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell className="font-medium text-foreground">{tag.name}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(tag)}
                        className="mr-2 text-foreground hover:bg-accent rounded-lg"
                        disabled={isMutating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(tag.id)}
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
            <DialogTitle className="text-foreground">{editingTag ? 'Editar Tag' : 'Adicionar Nova Tag'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Nome da Tag</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Inovação, Liderança" {...field} className="rounded-lg" />
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
                  {editingTag ? 'Salvar Alterações' : 'Adicionar Tag'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TagManagementPage;
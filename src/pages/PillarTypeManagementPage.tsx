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
import { PillarType, PillarTypeFormData } from '@/types/pillarType';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  description: z.string().min(1, { message: 'A descrição do pilar é obrigatória.' }),
  status: z.boolean().default(true),
});

const PillarTypeManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPillarType, setEditingPillarType] = useState<PillarType | null>(null);

  const form = useForm<PillarTypeFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      status: true,
    },
  });

  useEffect(() => {
    if (editingPillarType) {
      form.reset({
        description: editingPillarType.description,
        status: editingPillarType.status === 'active',
      });
    } else {
      form.reset({
        description: '',
        status: true,
      });
    }
  }, [editingPillarType, form, isDialogOpen]);

  const { data: pillarTypes, isLoading, error } = useQuery<PillarType[], Error>({
    queryKey: ['pillarTypes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('pillar_types')
        .select('*')
        .eq('user_id', user.id)
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pillarTypes', user?.id] });
      setIsDialogOpen(false);
      setEditingPillarType(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createPillarTypeMutation = useMutation({
    mutationFn: async (data: PillarTypeFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newPillarType, error } = await supabase
        .from('pillar_types')
        .insert({
          description: data.description,
          status: data.status ? 'active' : 'inactive',
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return newPillarType;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Tipo de Pilar criado com sucesso!');
    },
  });

  const updatePillarTypeMutation = useMutation({
    mutationFn: async (data: PillarTypeFormData) => {
      if (!editingPillarType?.id) throw new Error("ID do tipo de pilar está faltando.");
      const { data: updatedPillarType, error } = await supabase
        .from('pillar_types')
        .update({
          description: data.description,
          status: data.status ? 'active' : 'inactive',
        })
        .eq('id', editingPillarType.id)
        .eq('user_id', user?.id)
        .select()
        .single();
      if (error) throw error;
      return updatedPillarType;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Tipo de Pilar atualizado com sucesso!');
    },
  });

  const deletePillarTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error, count } = await supabase
        .from('pillar_types')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("Tipo de pilar não encontrado ou você não tem permissão para excluí-lo.");
      }
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Tipo de Pilar excluído com sucesso!');
    },
  });

  const onSubmit = (data: PillarTypeFormData) => {
    if (editingPillarType) {
      updatePillarTypeMutation.mutate(data);
    } else {
      createPillarTypeMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingPillarType(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (pillarType: PillarType) => {
    setEditingPillarType(pillarType);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este tipo de pilar?')) {
      deletePillarTypeMutation.mutate(id);
    }
  };

  const isMutating = createPillarTypeMutation.isPending || updatePillarTypeMutation.isPending || deletePillarTypeMutation.isPending;

  if (isLoading) {
    return <div className="text-center text-gray-600">Carregando tipos de pilares...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600">Erro ao carregar tipos de pilares: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sollux-black uppercase font-bold">Gerenciar Tipos de Pilares</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Tipo
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sollux-black">Descrição do Pilar</TableHead>
                <TableHead className="text-sollux-black">Status</TableHead>
                <TableHead className="text-right text-sollux-black">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pillarTypes?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-500">
                    Nenhum tipo de pilar encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                pillarTypes?.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium text-sollux-black">{type.description}</TableCell>
                    <TableCell>
                      <Badge
                        variant={type.status === 'active' ? 'default' : 'secondary'}
                        className={type.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}
                      >
                        {type.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
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
            <DialogTitle className="text-sollux-black">{editingPillarType ? 'Editar Tipo de Pilar' : 'Adicionar Novo Tipo de Pilar'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Descrição do Pilar</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Pilar de Inovação" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sollux-black">Status</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isMutating}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isMutating} className="rounded-lg">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isMutating} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
                  {editingPillarType ? 'Salvar Alterações' : 'Adicionar Tipo'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PillarTypeManagementPage;
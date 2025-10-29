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
import { Pillar, PillarFormData } from '@/types/pillar';
import { PillarType } from '@/types/pillarType'; // Importar PillarType
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  description: z.string().min(1, { message: 'A descrição do pilar é obrigatória.' }),
  pillar_type_id: z.string().min(1, { message: 'O tipo de pilar é obrigatório.' }),
  status: z.boolean().default(true),
});

const PillarManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPillar, setEditingPillar] = useState<Pillar | null>(null);

  const form = useForm<PillarFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      pillar_type_id: '',
      status: true,
    },
  });

  useEffect(() => {
    if (editingPillar) {
      form.reset({
        description: editingPillar.description,
        pillar_type_id: editingPillar.pillar_type_id || '',
        status: editingPillar.status === 'active',
      });
    } else {
      form.reset({
        description: '',
        pillar_type_id: '',
        status: true,
      });
    }
  }, [editingPillar, form, isDialogOpen]);

  const { data: pillars, isLoading: isLoadingPillars, error: errorPillars } = useQuery<Pillar[], Error>({
    queryKey: ['pillars', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('pillars')
        .select('*, pillar_types(description)') // Seleciona também a descrição do tipo de pilar
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: pillarTypes, isLoading: isLoadingPillarTypes, error: errorPillarTypes } = useQuery<PillarType[], Error>({
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
      queryClient.invalidateQueries({ queryKey: ['pillars', user?.id] });
      setIsDialogOpen(false);
      setEditingPillar(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createPillarMutation = useMutation({
    mutationFn: async (data: PillarFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newPillar, error } = await supabase
        .from('pillars')
        .insert({
          description: data.description,
          pillar_type_id: data.pillar_type_id,
          status: data.status ? 'active' : 'inactive',
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return newPillar;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Pilar criado com sucesso!');
    },
  });

  const updatePillarMutation = useMutation({
    mutationFn: async (data: PillarFormData) => {
      if (!editingPillar?.id) throw new Error("ID do pilar está faltando.");
      const { data: updatedPillar, error } = await supabase
        .from('pillars')
        .update({
          description: data.description,
          pillar_type_id: data.pillar_type_id,
          status: data.status ? 'active' : 'inactive',
        })
        .eq('id', editingPillar.id)
        .eq('user_id', user?.id)
        .select()
        .single();
      if (error) throw error;
      return updatedPillar;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Pilar atualizado com sucesso!');
    },
  });

  const deletePillarMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error, count } = await supabase
        .from('pillars')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("Pilar não encontrado ou você não tem permissão para excluí-lo.");
      }
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Pilar excluído com sucesso!');
    },
  });

  const onSubmit = (data: PillarFormData) => {
    if (editingPillar) {
      updatePillarMutation.mutate(data);
    } else {
      createPillarMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingPillar(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (pillar: Pillar) => {
    setEditingPillar(pillar);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este pilar?')) {
      deletePillarMutation.mutate(id);
    }
  };

  const isMutating = createPillarMutation.isPending || updatePillarMutation.isPending || deletePillarMutation.isPending;
  const isLoadingPage = isLoadingPillars || isLoadingPillarTypes;

  if (isLoadingPage) {
    return <div className="text-center text-muted-foreground">Carregando pilares...</div>;
  }

  if (errorPillars) {
    return <div className="text-center text-destructive">Erro ao carregar pilares: {errorPillars.message}</div>;
  }
  if (errorPillarTypes) {
    return <div className="text-center text-destructive">Erro ao carregar tipos de pilares: {errorPillarTypes.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground uppercase font-bold">Gerenciar Pilares</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Pilar
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Descrição do Pilar</TableHead>
                <TableHead className="text-foreground">Tipo de Pilar</TableHead>
                <TableHead className="text-foreground">Status</TableHead>
                <TableHead className="text-right text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pillars?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum pilar encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                pillars?.map((pillar) => (
                  <TableRow key={pillar.id}>
                    <TableCell className="font-medium text-foreground">{pillar.description}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {(pillar as any).pillar_types?.description || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={pillar.status === 'active' ? 'default' : 'secondary'}
                        className={pillar.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}
                      >
                        {pillar.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(pillar)}
                        className="mr-2 text-foreground hover:bg-accent rounded-lg"
                        disabled={isMutating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(pillar.id)}
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
            <DialogTitle className="text-foreground">{editingPillar ? 'Editar Pilar' : 'Adicionar Novo Pilar'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Descrição do Pilar</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Pilar de Inovação" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pillar_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Tipo de Pilar</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingPillarTypes}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um tipo de pilar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pillarTypes?.length === 0 ? (
                          <SelectItem value="no-pillars" disabled>Nenhum tipo de pilar cadastrado</SelectItem>
                        ) : (
                          pillarTypes?.map((type) => (
                            type.id && type.id !== '' ? (
                              <SelectItem key={type.id} value={type.id}>
                                {type.description}
                              </SelectItem>
                            ) : null
                          ))
                        )}
                      </SelectContent>
                    </Select>
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
                      <FormLabel className="text-foreground">Status</FormLabel>
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
                  {editingPillar ? 'Salvar Alterações' : 'Adicionar Pilar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PillarManagementPage;
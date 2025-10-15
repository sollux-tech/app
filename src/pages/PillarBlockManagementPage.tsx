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
import { PillarBlock, PillarBlockFormData } from '@/types/pillarBlock';
import { Pillar } from '@/types/pillar'; // Importar Pillar
import { PillarType } from '@/types/pillarType'; // Importar PillarType para exibir o tipo
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  name: z.string().min(1, { message: 'O nome do bloco é obrigatório.' }),
  description: z.string().optional(),
  pillar_id: z.string().min(1, { message: 'O pilar é obrigatório.' }),
  weight_percentage: z.coerce.number().min(0, { message: 'O peso deve ser entre 0 e 100.' }).max(100, { message: 'O peso deve ser entre 0 e 100.' }),
  status: z.boolean().default(true),
});

const PillarBlockManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPillarBlock, setEditingPillarBlock] = useState<PillarBlock | null>(null);

  const form = useForm<PillarBlockFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      pillar_id: '',
      weight_percentage: '',
      status: true,
    },
  });

  useEffect(() => {
    if (editingPillarBlock) {
      form.reset({
        name: editingPillarBlock.name,
        description: editingPillarBlock.description || '',
        pillar_id: editingPillarBlock.pillar_id || '',
        weight_percentage: editingPillarBlock.weight_percentage,
        status: editingPillarBlock.status === 'active',
      });
    } else {
      form.reset({
        name: '',
        description: '',
        pillar_id: '',
        weight_percentage: '',
        status: true,
      });
    }
  }, [editingPillarBlock, form, isDialogOpen]);

  const { data: pillarBlocks, isLoading: isLoadingPillarBlocks, error: errorPillarBlocks } = useQuery<PillarBlock[], Error>({
    queryKey: ['pillarBlocks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('pillar_blocks')
        .select('*, pillars(description, pillar_types(description))') // Seleciona pilar e tipo de pilar
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: pillars, isLoading: isLoadingPillars, error: errorPillarsList } = useQuery<Pillar[], Error>({
    queryKey: ['pillarsList', user?.id], // Usar uma chave diferente para a lista de pilares
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('pillars')
        .select('*, pillar_types(description)')
        .eq('user_id', user.id)
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pillarBlocks', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['pillarsList', user?.id] }); // Invalida a lista de pilares também
      setIsDialogOpen(false);
      setEditingPillarBlock(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createPillarBlockMutation = useMutation({
    mutationFn: async (data: PillarBlockFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newPillarBlock, error } = await supabase
        .from('pillar_blocks')
        .insert({
          name: data.name,
          description: data.description,
          pillar_id: data.pillar_id,
          weight_percentage: Number(data.weight_percentage),
          status: data.status ? 'active' : 'inactive',
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return newPillarBlock;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Bloco de Pilar criado com sucesso!');
    },
  });

  const updatePillarBlockMutation = useMutation({
    mutationFn: async (data: PillarBlockFormData) => {
      if (!editingPillarBlock?.id) throw new Error("ID do bloco de pilar está faltando.");
      const { data: updatedPillarBlock, error } = await supabase
        .from('pillar_blocks')
        .update({
          name: data.name,
          description: data.description,
          pillar_id: data.pillar_id,
          weight_percentage: Number(data.weight_percentage),
          status: data.status ? 'active' : 'inactive',
        })
        .eq('id', editingPillarBlock.id)
        .eq('user_id', user?.id)
        .select()
        .single();
      if (error) throw error;
      return updatedPillarBlock;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Bloco de Pilar atualizado com sucesso!');
    },
  });

  const deletePillarBlockMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error, count } = await supabase
        .from('pillar_blocks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("Bloco de pilar não encontrado ou você não tem permissão para excluí-lo.");
      }
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Bloco de Pilar excluído com sucesso!');
    },
  });

  const onSubmit = (data: PillarBlockFormData) => {
    if (editingPillarBlock) {
      updatePillarBlockMutation.mutate(data);
    } else {
      createPillarBlockMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingPillarBlock(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (pillarBlock: PillarBlock) => {
    setEditingPillarBlock(pillarBlock);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este bloco de pilar?')) {
      deletePillarBlockMutation.mutate(id);
    }
  };

  const isMutating = createPillarBlockMutation.isPending || updatePillarBlockMutation.isPending || deletePillarBlockMutation.isPending;
  const isLoadingPage = isLoadingPillarBlocks || isLoadingPillars;

  // Encontrar o tipo de pilar do pilar selecionado no formulário
  const selectedPillar = pillars?.find(p => p.id === form.watch('pillar_id'));
  const selectedPillarTypeName = (selectedPillar as any)?.pillar_types?.description || 'N/A';

  if (isLoadingPage) {
    return <div className="text-center text-gray-600">Carregando blocos de pilares...</div>;
  }

  if (errorPillarBlocks) {
    return <div className="text-center text-red-600">Erro ao carregar blocos de pilares: {errorPillarBlocks.message}</div>;
  }
  if (errorPillarsList) {
    return <div className="text-center text-red-600">Erro ao carregar lista de pilares: {errorPillarsList.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sollux-black uppercase font-bold">Gerenciar Blocos dos Pilares</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Bloco
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sollux-black">Nome do Bloco</TableHead>
                <TableHead className="text-sollux-black">Pilar</TableHead>
                <TableHead className="text-sollux-black">Tipo do Pilar</TableHead>
                <TableHead className="text-sollux-black">Peso (%)</TableHead>
                <TableHead className="text-sollux-black">Status</TableHead>
                <TableHead className="text-right text-sollux-black">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pillarBlocks?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    Nenhum bloco de pilar encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                pillarBlocks?.map((block) => (
                  <TableRow key={block.id}>
                    <TableCell className="font-medium text-sollux-black">{block.name}</TableCell>
                    <TableCell className="text-gray-700">
                      {(block as any).pillars?.description || 'N/A'}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {(block as any).pillars?.pillar_types?.description || 'N/A'}
                    </TableCell>
                    <TableCell className="text-gray-700">{block.weight_percentage}%</TableCell>
                    <TableCell>
                      <Badge
                        variant={block.status === 'active' ? 'default' : 'secondary'}
                        className={block.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}
                      >
                        {block.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(block)}
                        className="mr-2 text-sollux-black hover:bg-gray-100 rounded-lg"
                        disabled={isMutating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(block.id)}
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
            <DialogTitle className="text-sollux-black">{editingPillarBlock ? 'Editar Bloco do Pilar' : 'Adicionar Novo Bloco do Pilar'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Nome do Bloco</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Bloco de Estratégia" {...field} className="rounded-lg" />
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
                    <FormLabel className="text-sollux-black">Descrição do Bloco (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Breve descrição do bloco" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pillar_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Pilar</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingPillars}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um pilar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pillars?.length === 0 ? (
                          <SelectItem value="" disabled>Nenhum pilar cadastrado</SelectItem>
                        ) : (
                          pillars?.map((pillar) => (
                            <SelectItem key={pillar.id} value={pillar.id}>
                              {pillar.description}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel className="text-sollux-black">Tipo do Pilar</FormLabel>
                <Input value={selectedPillarTypeName} readOnly className="rounded-lg bg-gray-100 text-gray-700" />
              </FormItem>
              <FormField
                control={form.control}
                name="weight_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sollux-black">Peso do Bloco (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Ex: 25" {...field} className="rounded-lg" />
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
                  {editingPillarBlock ? 'Salvar Alterações' : 'Adicionar Bloco'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PillarBlockManagementPage;
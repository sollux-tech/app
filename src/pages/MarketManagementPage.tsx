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
import { Market, MarketFormData } from '@/types/market';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  name: z.string().min(1, { message: 'O nome do mercado é obrigatório.' }),
  status: z.boolean().default(true),
});

const MarketManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMarket, setEditingMarket] = useState<Market | null>(null);

  const form = useForm<MarketFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      status: true,
    },
  });

  useEffect(() => {
    if (editingMarket) {
      form.reset({
        name: editingMarket.name,
        status: editingMarket.status === 'active',
      });
    } else {
      form.reset({
        name: '',
        status: true,
      });
    }
  }, [editingMarket, form, isDialogOpen]);

  const { data: markets, isLoading, error } = useQuery<Market[], Error>({
    queryKey: ['markets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('markets')
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
      queryClient.invalidateQueries({ queryKey: ['markets', user?.id] });
      setIsDialogOpen(false);
      setEditingMarket(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createMarketMutation = useMutation({
    mutationFn: async (data: MarketFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { data: newMarket, error } = await supabase
        .from('markets')
        .insert({
          name: data.name,
          status: data.status ? 'active' : 'inactive',
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return newMarket;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Mercado criado com sucesso!');
    },
  });

  const updateMarketMutation = useMutation({
    mutationFn: async (data: MarketFormData) => {
      if (!editingMarket?.id) throw new Error("ID do mercado está faltando.");
      const { data: updatedMarket, error } = await supabase
        .from('markets')
        .update({
          name: data.name,
          status: data.status ? 'active' : 'inactive',
        })
        .eq('id', editingMarket.id)
        .eq('user_id', user?.id)
        .select()
        .single();
      if (error) throw error;
      return updatedMarket;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Mercado atualizado com sucesso!');
    },
  });

  const deleteMarketMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error, count } = await supabase
        .from('markets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("Mercado não encontrado ou você não tem permissão para excluí-lo.");
      }
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Mercado excluído com sucesso!');
    },
  });

  const onSubmit = (data: MarketFormData) => {
    if (editingMarket) {
      updateMarketMutation.mutate(data);
    } else {
      createMarketMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingMarket(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (market: Market) => {
    setEditingMarket(market);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este mercado?')) {
      deleteMarketMutation.mutate(id);
    }
  };

  const isMutating = createMarketMutation.isPending || updateMarketMutation.isPending || deleteMarketMutation.isPending;

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Carregando mercados...</div>;
  }

  if (error) {
    return <div className="text-center text-destructive">Erro ao carregar mercados: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground uppercase font-bold">Gerenciar Mercados</CardTitle>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Mercado
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Mercado de Atuação</TableHead>
                <TableHead className="text-foreground">Status</TableHead>
                <TableHead className="text-right text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {markets?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhum mercado encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                markets?.map((market) => (
                  <TableRow key={market.id}>
                    <TableCell className="font-medium text-foreground">{market.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={market.status === 'active' ? 'default' : 'secondary'}
                        className={market.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}
                      >
                        {market.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(market)}
                        className="mr-2 text-foreground hover:bg-accent rounded-lg"
                        disabled={isMutating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(market.id)}
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
            <DialogTitle className="text-foreground">{editingMarket ? 'Editar Mercado' : 'Adicionar Novo Mercado'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Mercado de Atuação</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Tecnologia, Varejo, Saúde" {...field} className="rounded-lg" />
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
                  {editingMarket ? 'Salvar Alterações' : 'Adicionar Mercado'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketManagementPage;
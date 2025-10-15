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
import { JobSector, JobSectorFormData } from '@/types/jobSector';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  name: z.string().min(1, { message: 'O nome é obrigatório.' }),
  description: z.string().optional(),
});

const JobSectorsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JobSector | null>(null);

  const form = useForm<JobSectorFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (editingItem) {
      form.reset({ name: editingItem.name, description: editingItem.description || '' });
    } else {
      form.reset({ name: '', description: '' });
    }
  }, [editingItem, form, isDialogOpen]);

  const { data: items, isLoading } = useQuery<JobSector[], Error>({
    queryKey: ['jobSectors', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('job_sectors').select('*').eq('user_id', user.id).order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobSectors', user?.id] });
      setIsDialogOpen(false);
      setEditingItem(null);
    },
    onError: (error: Error) => showError(`Erro: ${error.message}`),
  };

  const createMutation = useMutation({
    mutationFn: async (data: JobSectorFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const { error } = await supabase.from('job_sectors').insert({ ...data, user_id: user.id });
      if (error) throw error;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Área/Setor criado com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: JobSectorFormData) => {
      if (!editingItem?.id) throw new Error("ID do item está faltando.");
      const { error } = await supabase.from('job_sectors').update(data).eq('id', editingItem.id);
      if (error) throw error;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Área/Setor atualizado com sucesso!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('job_sectors').delete().eq('id', id);
      if (error) throw error;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Área/Setor excluído com sucesso!');
    },
  });

  const onSubmit = (data: JobSectorFormData) => {
    if (editingItem) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-6">
      <Card className="bg-sollux-card-bg backdrop-blur-md border border-sollux-card-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sollux-black uppercase font-bold">Gerenciar Áreas/Setores</CardTitle>
          <Button onClick={() => { setEditingItem(null); setIsDialogOpen(true); }} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? <p>Carregando...</p> : (
            <Table>
              <TableHeader><TableRow><TableHead className="text-sollux-black">Nome</TableHead><TableHead className="text-sollux-black">Descrição</TableHead><TableHead className="text-right text-sollux-black">Ações</TableHead></TableRow></TableHeader>
              <TableBody>
                {items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-sollux-black">{item.name}</TableCell>
                    <TableCell className="text-gray-700">{item.description || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setIsDialogOpen(true); }} className="mr-2 rounded-lg" disabled={isMutating}><Edit className="h-4 w-4" /></Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(item.id)} className="rounded-lg" disabled={isMutating}><Trash2 className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle className="text-sollux-black">{editingItem ? 'Editar' : 'Novo'} Área/Setor</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel className="text-sollux-black">Nome</FormLabel><FormControl><Input placeholder="Ex: Tecnologia" {...field} className="rounded-lg" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel className="text-sollux-black">Descrição</FormLabel><FormControl><Textarea placeholder="Breve descrição" {...field} className="rounded-lg" /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isMutating} className="rounded-lg">Cancelar</Button>
                <Button type="submit" disabled={isMutating} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">{editingItem ? 'Salvar' : 'Criar'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobSectorsPage;
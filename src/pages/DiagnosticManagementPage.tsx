import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Diagnostic, DiagnosticFormData } from '@/types/diagnostic';
import { Pillar } from '@/types/pillar';
import { PillarBlock } from '@/types/pillarBlock';
import { DiagnosticStatus } from '@/types/diagnosticStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/components/CompanyContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formSchema = z.object({
  pillar_id: z.string().min(1, { message: 'O pilar é obrigatório.' }),
  pillar_block_id: z.string().min(1, { message: 'O bloco é obrigatório.' }),
  diagnostic_status_id: z.string().min(1, { message: 'O status do diagnóstico é obrigatório.' }),
});

const DiagnosticManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { selectedCompany } = useCompany();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDiagnostic, setEditingDiagnostic] = useState<Diagnostic | null>(null);

  const form = useForm<DiagnosticFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pillar_id: '',
      pillar_block_id: '',
      diagnostic_status_id: '',
    },
  });

  const selectedPillarId = form.watch('pillar_id');

  useEffect(() => {
    if (editingDiagnostic) {
      form.reset({
        pillar_id: editingDiagnostic.pillar_id || '',
        pillar_block_id: editingDiagnostic.pillar_block_id || '',
        diagnostic_status_id: editingDiagnostic.diagnostic_status_id || '',
      });
    } else {
      form.reset({
        pillar_id: '',
        pillar_block_id: '',
        diagnostic_status_id: '',
      });
    }
  }, [editingDiagnostic, form, isDialogOpen]);

  const { data: diagnostics, isLoading: isLoadingDiagnostics, error: errorDiagnostics } = useQuery<Diagnostic[], Error>({
    queryKey: ['diagnostics', user?.id, selectedCompany?.id],
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) return [];
      const { data, error } = await supabase
        .from('diagnostics')
        .select('*, companies(name), pillars(description), pillar_blocks(name), diagnostic_statuses(description)')
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!selectedCompany?.id,
  });

  const { data: pillars, isLoading: isLoadingPillars } = useQuery<Pillar[], Error>({
    queryKey: ['pillarsListForDiagnostic', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('pillars')
        .select('*')
        .eq('user_id', user.id)
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: pillarBlocks, isLoading: isLoadingPillarBlocks } = useQuery<PillarBlock[], Error>({
    queryKey: ['pillarBlocksListForDiagnostic', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('pillar_blocks')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: diagnosticStatuses, isLoading: isLoadingDiagnosticStatuses } = useQuery<DiagnosticStatus[], Error>({
    queryKey: ['diagnosticStatusesListForDiagnostic', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('diagnostic_statuses')
        .select('*')
        .eq('user_id', user.id)
        .order('description', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const filteredPillarBlocks = useMemo(() => {
    if (!pillarBlocks || !selectedPillarId) return [];
    return pillarBlocks.filter(block => block.pillar_id === selectedPillarId);
  }, [pillarBlocks, selectedPillarId]);

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostics', user?.id, selectedCompany?.id] });
      setIsDialogOpen(false);
      setEditingDiagnostic(null);
    },
    onError: (error: Error) => {
      showError(`Erro: ${error.message}`);
    },
  };

  const createDiagnosticMutation = useMutation({
    mutationFn: async (data: DiagnosticFormData) => {
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário não autenticado ou empresa não selecionada.");
      const { error } = await supabase
        .from('diagnostics')
        .insert({
          user_id: user.id,
          company_id: selectedCompany.id,
          pillar_id: data.pillar_id,
          pillar_block_id: data.pillar_block_id,
          diagnostic_status_id: data.diagnostic_status_id,
        });
      if (error) throw error;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Diagnóstico criado com sucesso!');
    },
  });

  const updateDiagnosticMutation = useMutation({
    mutationFn: async (data: DiagnosticFormData) => {
      if (!editingDiagnostic?.id) throw new Error("ID do diagnóstico está faltando.");
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário não autenticado ou empresa não selecionada.");
      const { error } = await supabase
        .from('diagnostics')
        .update({
          pillar_id: data.pillar_id,
          pillar_block_id: data.pillar_block_id,
          diagnostic_status_id: data.diagnostic_status_id,
        })
        .eq('id', editingDiagnostic.id)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id);
      if (error) throw error;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Diagnóstico atualizado com sucesso!');
    },
  });

  const deleteDiagnosticMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário não autenticado ou empresa não selecionada.");
      const { error, count } = await supabase
        .from('diagnostics')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id);
      
      if (error) {
        throw error;
      }
      if (count === 0) {
        throw new Error("Diagnóstico não encontrado ou você não tem permissão para excluí-lo.");
      }
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Diagnóstico excluído com sucesso!');
    },
  });

  const onSubmit = (data: DiagnosticFormData) => {
    if (editingDiagnostic) {
      updateDiagnosticMutation.mutate(data);
    } else {
      createDiagnosticMutation.mutate(data);
    }
  };

  const handleAddClick = () => {
    setEditingDiagnostic(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (diagnostic: Diagnostic) => {
    setEditingDiagnostic(diagnostic);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este diagnóstico?')) {
      deleteDiagnosticMutation.mutate(id);
    }
  };

  const isMutating = createDiagnosticMutation.isPending || updateDiagnosticMutation.isPending || deleteDiagnosticMutation.isPending;
  const isLoadingPage = isLoadingDiagnostics || isLoadingPillars || isLoadingPillarBlocks || isLoadingDiagnosticStatuses;

  if (!selectedCompany) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Por favor, selecione uma empresa na barra lateral para gerenciar os diagnósticos.
      </div>
    );
  }

  if (isLoadingPage) {
    return <div className="text-center text-muted-foreground">Carregando diagnósticos...</div>;
  }

  if (errorDiagnostics) {
    return <div className="text-center text-destructive">Erro ao carregar diagnósticos: {errorDiagnostics.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card backdrop-blur-md border border-border shadow-lg rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-foreground uppercase font-bold">Gerenciar Diagnósticos</CardTitle>
            <CardDescription className="text-muted-foreground">
              Diagnósticos para a empresa: <span className="font-semibold">{selectedCompany.name}</span>
            </CardDescription>
          </div>
          <Button onClick={handleAddClick} className="bg-sollux-red hover:bg-sollux-red/90 text-white rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Diagnóstico
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Pilar</TableHead>
                <TableHead className="text-foreground">Bloco</TableHead>
                <TableHead className="text-foreground">Status</TableHead>
                <TableHead className="text-foreground">Criado em</TableHead>
                <TableHead className="text-right text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {diagnostics?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum diagnóstico encontrado para esta empresa.
                  </TableCell>
                </TableRow>
              ) : (
                diagnostics?.map((diagnostic) => (
                  <TableRow key={diagnostic.id}>
                    <TableCell className="font-medium text-foreground">
                      {diagnostic.pillars?.description || 'N/A'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {diagnostic.pillar_blocks?.name || 'N/A'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {diagnostic.diagnostic_statuses?.description || 'N/A'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(diagnostic.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(diagnostic)}
                        className="mr-2 text-foreground hover:bg-accent rounded-lg"
                        disabled={isMutating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(diagnostic.id)}
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
            <DialogTitle className="text-foreground">{editingDiagnostic ? 'Editar Diagnóstico' : 'Adicionar Novo Diagnóstico'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingDiagnostic ? 'Atualize os detalhes do diagnóstico.' : 'Crie um novo diagnóstico para a empresa selecionada.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="pillar_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Pilar</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('pillar_block_id', ''); // Reset pillar block when pillar changes
                    }} value={field.value} disabled={isLoadingPillars}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um pilar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Selecione um pilar</SelectItem> {/* Removido disabled */}
                        {pillars?.length === 0 ? (
                          <SelectItem value="no-pillars" disabled>Nenhum pilar cadastrado</SelectItem>
                        ) : (
                          pillars?.map((pillar) => (
                            pillar.id && pillar.id !== '' ? (
                              <SelectItem key={pillar.id} value={pillar.id}>
                                {pillar.description}
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
                name="pillar_block_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Bloco</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedPillarId || isLoadingPillarBlocks || filteredPillarBlocks.length === 0}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um bloco" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Selecione um bloco</SelectItem> {/* Removido disabled */}
                        {filteredPillarBlocks.length === 0 ? (
                          <SelectItem value="no-blocks" disabled>Nenhum bloco para este pilar</SelectItem>
                        ) : (
                          filteredPillarBlocks.map((block) => (
                            block.id && block.id !== '' ? (
                              <SelectItem key={block.id} value={block.id}>
                                {block.name}
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
                name="diagnostic_status_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Status do Diagnóstico</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingDiagnosticStatuses}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Selecione um status</SelectItem> {/* Removido disabled */}
                        {diagnosticStatuses?.length === 0 ? (
                          <SelectItem value="no-statuses" disabled>Nenhum status cadastrado</SelectItem>
                        ) : (
                          diagnosticStatuses?.map((status) => (
                            status.id && status.id !== '' ? (
                              <SelectItem key={status.id} value={status.id}>
                                {status.description}
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
              <DialogFooter className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isMutating} className="rounded-lg">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isMutating} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
                  {editingDiagnostic ? 'Salvar Alterações' : 'Adicionar Diagnóstico'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiagnosticManagementPage;
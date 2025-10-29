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
import { Label } from '@/components/ui/label'; // Importar Label

const formSchema = z.object({
  pillar_id: z.string().min(1, { message: 'O pilar é obrigatório.' }),
  diagnostic_status_id: z.string().min(1, { message: 'O status do diagnóstico é obrigatório.' }),
});

const DiagnosticManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { selectedCompany } = useCompany();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDiagnostic, setEditingDiagnostic] = useState<Diagnostic | null>(null);

  // Estados para os filtros
  const [selectedPillarFilter, setSelectedPillarFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const form = useForm<DiagnosticFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pillar_id: undefined,
      diagnostic_status_id: undefined,
    },
  });

  useEffect(() => {
    if (editingDiagnostic) {
      form.reset({
        diagnostic_status_id: editingDiagnostic.diagnostic_status_id || undefined,
        // pillar_id e pillar_block_id são somente leitura na edição, não são resetados no form
        // O campo pillar_id não é parte do formulário de edição, então não o resetamos aqui.
        // Ele é apenas para criação.
        pillar_id: undefined, // Garante que o campo pillar_id não seja preenchido no formulário de edição
      });
    } else {
      form.reset({
        pillar_id: undefined,
        diagnostic_status_id: undefined,
      });
    }
  }, [editingDiagnostic, form, isDialogOpen]);

  const { data: diagnostics, isLoading: isLoadingDiagnostics, error: errorDiagnostics } = useQuery<Diagnostic[], Error>({
    queryKey: ['diagnostics', user?.id, selectedCompany?.id, selectedPillarFilter, selectedStatusFilter], // Adicionado filtros ao queryKey
    queryFn: async () => {
      if (!user?.id || !selectedCompany?.id) return [];
      let query = supabase
        .from('diagnostics')
        .select('*, companies(name), pillars(description), pillar_blocks(name), diagnostic_statuses(description)')
        .eq('user_id', user.id)
        .eq('company_id', selectedCompany.id);
      
      // Aplicar filtros
      if (selectedPillarFilter !== 'all') {
        query = query.eq('pillar_id', selectedPillarFilter);
      }
      if (selectedStatusFilter !== 'all') {
        query = query.eq('diagnostic_status_id', selectedStatusFilter);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
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

      // 1. Fetch all pillar blocks associated with the selected pillar
      const { data: blocks, error: blocksError } = await supabase
        .from('pillar_blocks')
        .select('id')
        .eq('user_id', user.id) // Ensure only user's blocks
        .eq('pillar_id', data.pillar_id);

      if (blocksError) throw blocksError;
      if (!blocks || blocks.length === 0) {
        throw new Error("Nenhum bloco de pilar encontrado para o pilar selecionado. Cadastre blocos em 'OPS | Blocos dos Pilares'.");
      }

      // 2. Prepare multiple insert operations
      const insertPayloads = blocks.map(block => ({
        user_id: user.id,
        company_id: selectedCompany.id,
        pillar_id: data.pillar_id,
        pillar_block_id: block.id, // Assign each block's ID
        diagnostic_status_id: data.diagnostic_status_id,
      }));

      // 3. Perform the bulk insert
      const { error } = await supabase
        .from('diagnostics')
        .insert(insertPayloads);

      if (error) throw error;
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess('Diagnósticos criados com sucesso para todos os blocos do pilar!');
    },
  });

  const updateDiagnosticMutation = useMutation({
    mutationFn: async (data: DiagnosticFormData) => {
      if (!editingDiagnostic?.id) throw new Error("ID do diagnóstico está faltando.");
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário não autenticado ou empresa não selecionada.");

      // Only update diagnostic_status_id for existing diagnostics
      const { error } = await supabase
        .from('diagnostics')
        .update({
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
      showSuccess('Status do diagnóstico atualizado com sucesso!');
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
  const isLoadingPage = isLoadingDiagnostics || isLoadingPillars || isLoadingDiagnosticStatuses;

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Filtro por Pilar */}
            <div>
              <Label htmlFor="pillar-filter" className="text-foreground">Filtrar por Pilar</Label>
              <Select
                value={selectedPillarFilter}
                onValueChange={setSelectedPillarFilter}
                disabled={isLoadingPillars}
              >
                <SelectTrigger id="pillar-filter" className="rounded-lg">
                  <SelectValue placeholder="Todos os Pilares" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Pilares</SelectItem>
                  {pillars?.map((pillar) => (
                    <SelectItem key={pillar.id} value={pillar.id}>
                      {pillar.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Status */}
            <div>
              <Label htmlFor="status-filter" className="text-foreground">Filtrar por Status</Label>
              <Select
                value={selectedStatusFilter}
                onValueChange={setSelectedStatusFilter}
                disabled={isLoadingDiagnosticStatuses}
              >
                <SelectTrigger id="status-filter" className="rounded-lg">
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {diagnosticStatuses?.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
                    Nenhum diagnóstico encontrado para esta empresa com os filtros aplicados.
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
              {editingDiagnostic ? 'Atualize o status do diagnóstico.' : 'Selecione um pilar para criar um diagnóstico para cada bloco associado.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {editingDiagnostic ? (
                <>
                  <FormItem>
                    <FormLabel className="text-foreground">Pilar</FormLabel>
                    <Input value={editingDiagnostic.pillars?.description || 'N/A'} readOnly className="rounded-lg bg-muted text-muted-foreground" />
                  </FormItem>
                  <FormItem>
                    <FormLabel className="text-foreground">Bloco</FormLabel>
                    <Input value={editingDiagnostic.pillar_blocks?.name || 'N/A'} readOnly className="rounded-lg bg-muted text-muted-foreground" />
                  </FormItem>
                </>
              ) : (
                <FormField
                  control={form.control}
                  name="pillar_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Pilar</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingPillars || isMutating}>
                        <FormControl>
                          <SelectTrigger className="rounded-lg">
                            <SelectValue placeholder="Selecione um pilar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
              )}
              <FormField
                control={form.control}
                name="diagnostic_status_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Status do Diagnóstico</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingDiagnosticStatuses || isMutating}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Selecione um status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
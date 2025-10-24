import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/components/CompanyContext';
import { Diagnostic } from '@/types/diagnostic';
import { Kpi } from '@/types/kpi';
import { DiagnosticQuestionnaire } from '@/types/diagnosticQuestionnaire';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

interface AddMultipleDiagnosticQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagnosticId: string | undefined;
}

// Tipo para o estado interno de cada KPI no formulário (sem score_id e evidence)
interface KpiResponseFormItem {
  kpi_id: string;
  question: string; // Para exibição
  pillar_id: string; // Para filtragem
  pillar_block_id: string; // Para filtragem
  isSelected: boolean;
  existingQuestionnaireId?: string; // ID da resposta existente, se houver
  order_number: number; // Adicionado
}

// Schema para o formulário completo (um array de KpiResponseFormItem)
const formSchema = z.object({
  kpiResponses: z.array(z.object({
    kpi_id: z.string(),
    question: z.string(),
    pillar_id: z.string(),
    pillar_block_id: z.string(),
    isSelected: z.boolean(),
    existingQuestionnaireId: z.string().optional(),
    order_number: z.number(), // Adicionado
  })),
});

const AddMultipleDiagnosticQuestionsDialog: React.FC<AddMultipleDiagnosticQuestionsDialogProps> = ({
  open,
  onOpenChange,
  diagnosticId,
}) => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { selectedCompany } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kpiResponses: [],
    },
  });

  // Fetch diagnostic details to get pillar and pillar block IDs
  const { data: selectedDiagnostic, isLoading: isLoadingDiagnostic } = useQuery<Diagnostic, Error>({
    queryKey: ['diagnosticDetails', diagnosticId],
    queryFn: async () => {
      if (!diagnosticId) throw new Error("ID do diagnóstico está faltando.");
      const { data, error } = await supabase
        .from('diagnostics')
        .select('*')
        .eq('id', diagnosticId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!diagnosticId && open,
  });

  // Fetch KPIs based on selected diagnostic's pillar and pillar block
  const { data: kpis, isLoading: isLoadingKpis } = useQuery<Kpi[], Error>({
    queryKey: ['kpisForDiagnostic', selectedDiagnostic?.pillar_id, selectedDiagnostic?.pillar_block_id],
    queryFn: async () => {
      if (!user?.id || !selectedDiagnostic?.pillar_id || !selectedDiagnostic?.pillar_block_id) return [];
      const { data, error } = await supabase
        .from('kpis')
        .select('*, pillars(id), pillar_blocks(id)')
        .eq('user_id', user.id)
        .eq('pillar_id', selectedDiagnostic.pillar_id)
        .eq('pillar_block_id', selectedDiagnostic.pillar_block_id)
        .order('question', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!selectedDiagnostic?.pillar_id && !!selectedDiagnostic?.pillar_block_id && open,
  });

  // Fetch existing questionnaire responses for the current diagnostic
  const { data: existingQuestionnaires, isLoading: isLoadingExistingQuestionnaires } = useQuery<DiagnosticQuestionnaire[], Error>({
    queryKey: ['existingQuestionnairesForDiagnostic', diagnosticId],
    queryFn: async () => {
      if (!diagnosticId) return [];
      const { data, error } = await supabase
        .from('diagnostic_questionnaires')
        .select('*')
        .eq('diagnostic_id', diagnosticId)
        .eq('user_id', user?.id)
        .eq('company_id', selectedCompany?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!diagnosticId && !!user?.id && !!selectedCompany?.id && open,
  });

  // Initialize form with KPIs and existing responses
  useEffect(() => {
    if (open && kpis && existingQuestionnaires && !isLoadingDiagnostic && !isLoadingKpis && !isLoadingExistingQuestionnaires) {
      const initialKpiResponses: KpiResponseFormItem[] = kpis.map((kpi, index) => {
        const existingResponse = existingQuestionnaires.find(eq => eq.kpi_id === kpi.id);
        return {
          kpi_id: kpi.id,
          question: kpi.question,
          pillar_id: kpi.pillar_id || '',
          pillar_block_id: kpi.pillar_block_id || '',
          isSelected: !!existingResponse,
          existingQuestionnaireId: existingResponse?.id,
          order_number: existingResponse?.order_number ?? (index + 1), // Use existing order or assign new
        };
      });
      form.reset({ kpiResponses: initialKpiResponses });
      setSearchTerm(''); // Reset search term when dialog opens
    } else if (!open) {
      form.reset({ kpiResponses: [] }); // Limpar o formulário ao fechar
      setSearchTerm(''); // Reset search term when dialog closes
    }
  }, [open, kpis, existingQuestionnaires, isLoadingDiagnostic, isLoadingKpis, isLoadingExistingQuestionnaires, form]);

  const createUpdateDeleteQuestionnairesMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      if (!user?.id || !selectedCompany?.id || !diagnosticId) {
        throw new Error("Usuário não autenticado, empresa não selecionada ou diagnóstico não disponível.");
      }

      const currentResponses = data.kpiResponses;
      const existingResponsesMap = new Map(existingQuestionnaires?.map(eq => [eq.kpi_id, eq]) || []);

      const inserts = [];
      const updates = []; // Para atualizar o order_number de itens existentes
      const deletes = [];

      for (const item of currentResponses) {
        const existing = existingResponsesMap.get(item.kpi_id);

        if (item.isSelected) {
          // Usuário quer este KPI vinculado
          if (!existing) {
            // Não está vinculado ainda, então insere
            inserts.push({
              user_id: user.id,
              company_id: selectedCompany.id,
              diagnostic_id: diagnosticId,
              kpi_id: item.kpi_id,
              score_id: null, // Explicitamente null, pois não estamos respondendo aqui
              evidence: null, // Explicitamente null, pois não estamos respondendo aqui
              order_number: item.order_number, // Adicionado
            });
          } else if (existing.order_number !== item.order_number) {
            // Se já existe e a ordem mudou, atualiza
            updates.push({
              id: existing.id,
              order_number: item.order_number,
            });
          }
        } else {
          // Usuário NÃO quer este KPI vinculado
          if (existing) {
            // Está vinculado atualmente, então exclui
            deletes.push(existing.id);
          }
          // Se não existe, não faz nada (já está desvinculado)
        }
      }

      const promises = [];

      if (inserts.length > 0) {
        promises.push(supabase.from('diagnostic_questionnaires').insert(inserts));
      }
      if (updates.length > 0) {
        for (const updateItem of updates) {
          promises.push(supabase.from('diagnostic_questionnaires').update({ order_number: updateItem.order_number }).eq('id', updateItem.id));
        }
      }
      if (deletes.length > 0) {
        promises.push(supabase.from('diagnostic_questionnaires').delete().in('id', deletes));
      }

      const results = await Promise.all(promises);
      results.forEach(result => {
        if (result.error) throw result.error;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnosticQuestionnaires', user?.id, selectedCompany?.id] });
      showSuccess('Perguntas do questionário salvas com sucesso!');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      showError(`Erro ao salvar perguntas: ${error.message}`);
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createUpdateDeleteQuestionnairesMutation.mutate(data);
  };

  const isLoadingPage = isLoadingDiagnostic || isLoadingKpis || isLoadingExistingQuestionnaires;
  const isSubmitting = createUpdateDeleteQuestionnairesMutation.isPending;

  const allKpiResponses = form.watch('kpiResponses');

  const filteredAndSortedKpiResponses = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    
    const selectedItems = allKpiResponses.filter(item => item.isSelected);
    const unselectedItems = allKpiResponses.filter(item => !item.isSelected);

    const filteredUnselectedItems = unselectedItems.filter(item => 
      item.question.toLowerCase().includes(lowerCaseSearchTerm)
    );

    // Combine selected items (always visible) with filtered unselected items
    // Sort by order_number first, then by question if order_number is the same
    return [
      ...selectedItems.sort((a, b) => a.order_number - b.order_number || a.question.localeCompare(b.question)),
      ...filteredUnselectedItems.sort((a, b) => a.order_number - b.order_number || a.question.localeCompare(b.question)),
    ];
  }, [allKpiResponses, searchTerm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-card backdrop-blur-md rounded-2xl shadow-lg border border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Adicionar/Editar Perguntas do Diagnóstico</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Selecione as perguntas pertinentes para este diagnóstico. As notas e evidências serão preenchidas posteriormente.
          </DialogDescription>
        </DialogHeader>
        {isLoadingPage ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-sollux-red" />
            <span className="ml-2 text-muted-foreground">Carregando perguntas e respostas existentes...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {allKpiResponses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma pergunta encontrada para este diagnóstico. Certifique-se de que há KPIs cadastrados para o Pilar e Bloco deste diagnóstico em <a href="/core/global-settings/ops/kpis" className="text-sollux-red hover:underline">OPS | KPIs de Diagnóstico</a>.
                </p>
              ) : (
                <>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Buscar perguntas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 rounded-lg"
                    />
                  </div>

                  <div className="space-y-4">
                    {filteredAndSortedKpiResponses.map((item, index) => {
                      // Find the actual index in the form's kpiResponses array
                      const formItemIndex = allKpiResponses.findIndex(kpi => kpi.kpi_id === item.kpi_id);
                      if (formItemIndex === -1) return null; // Should not happen if logic is correct

                      return (
                        <Card key={item.kpi_id} className="p-4 border border-border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <FormField
                                control={form.control}
                                name={`kpiResponses.${formItemIndex}.isSelected`}
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-semibold text-foreground cursor-pointer">
                                      {item.order_number}. {item.question}
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}

              <DialogFooter className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="rounded-lg">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Perguntas'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddMultipleDiagnosticQuestionsDialog;
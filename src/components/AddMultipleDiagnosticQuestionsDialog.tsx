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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, MinusCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { useCompany } from '@/components/CompanyContext';
import { Diagnostic } from '@/types/diagnostic';
import { Kpi } from '@/types/kpi';
import { ScoringScale } from '@/types/scoringScale';
import { DiagnosticQuestionnaire } from '@/types/diagnosticQuestionnaire'; // Importar o tipo completo
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox'; // Importar Checkbox

interface AddMultipleDiagnosticQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagnosticId: string | undefined;
}

// Tipo para o estado interno de cada KPI no formulário
interface KpiResponseFormItem {
  kpi_id: string;
  question: string; // Para exibição
  pillar_id: string; // Para filtragem
  pillar_block_id: string; // Para filtragem
  isSelected: boolean;
  score_id: string;
  evidence: string;
  existingQuestionnaireId?: string; // ID da resposta existente, se houver
}

// Schema para o formulário completo (um array de KpiResponseFormItem)
const formSchema = z.object({
  kpiResponses: z.array(z.object({
    kpi_id: z.string(),
    question: z.string(),
    pillar_id: z.string(),
    pillar_block_id: z.string(),
    isSelected: z.boolean(),
    score_id: z.string().optional(), // Opcional se não estiver selecionado
    evidence: z.string().optional(),
    existingQuestionnaireId: z.string().optional(),
  })).refine(data => {
    // Validação para garantir que KPIs selecionados tenham score_id
    return data.every(item => !item.isSelected || (item.isSelected && item.score_id && item.score_id !== ''));
  }, {
    message: "Todos os KPIs selecionados devem ter uma nota.",
    path: ["kpiResponses"], // Caminho para o erro
  }),
});

const AddMultipleDiagnosticQuestionsDialog: React.FC<AddMultipleDiagnosticQuestionsDialogProps> = ({
  open,
  onOpenChange,
  diagnosticId,
}) => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { selectedCompany } = useCompany();

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

  // Fetch scoring scales
  const { data: scoringScales, isLoading: isLoadingScoringScales } = useQuery<ScoringScale[], Error>({
    queryKey: ['scoringScalesListForQuestionnaire', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('scoring_scales')
        .select('*')
        .eq('user_id', user.id)
        .order('score', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
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
      const initialKpiResponses: KpiResponseFormItem[] = kpis.map(kpi => {
        const existingResponse = existingQuestionnaires.find(eq => eq.kpi_id === kpi.id);
        return {
          kpi_id: kpi.id,
          question: kpi.question,
          pillar_id: kpi.pillar_id || '',
          pillar_block_id: kpi.pillar_block_id || '',
          isSelected: !!existingResponse,
          score_id: existingResponse?.score_id || '',
          evidence: existingResponse?.evidence || '',
          existingQuestionnaireId: existingResponse?.id,
        };
      });
      form.reset({ kpiResponses: initialKpiResponses });
    } else if (!open) {
      form.reset({ kpiResponses: [] }); // Limpar o formulário ao fechar
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
      const updates = [];
      const deletes = [];

      for (const item of currentResponses) {
        const existing = existingResponsesMap.get(item.kpi_id);

        if (item.isSelected) {
          // KPI está selecionado
          if (existing) {
            // Atualizar se houver mudanças
            if (existing.score_id !== item.score_id || existing.evidence !== item.evidence) {
              updates.push({
                id: existing.id,
                score_id: item.score_id,
                evidence: item.evidence || null,
              });
            }
          } else {
            // Inserir novo
            inserts.push({
              user_id: user.id,
              company_id: selectedCompany.id,
              diagnostic_id: diagnosticId,
              kpi_id: item.kpi_id,
              score_id: item.score_id,
              evidence: item.evidence || null,
            });
          }
        } else {
          // KPI não está selecionado
          if (existing) {
            // Excluir se existia antes
            deletes.push(existing.id);
          }
        }
      }

      const promises = [];

      if (inserts.length > 0) {
        promises.push(supabase.from('diagnostic_questionnaires').insert(inserts));
      }
      if (updates.length > 0) {
        for (const updateItem of updates) {
          promises.push(supabase.from('diagnostic_questionnaires').update({
            score_id: updateItem.score_id,
            evidence: updateItem.evidence,
          }).eq('id', updateItem.id));
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

  const isLoadingPage = isLoadingDiagnostic || isLoadingKpis || isLoadingScoringScales || isLoadingExistingQuestionnaires;
  const isSubmitting = createUpdateDeleteQuestionnairesMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-card backdrop-blur-md rounded-2xl shadow-lg border border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Adicionar/Editar Perguntas do Diagnóstico</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Selecione as perguntas pertinentes e preencha as notas e evidências.
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
              {form.watch('kpiResponses').length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma pergunta encontrada para este diagnóstico. Certifique-se de que há KPIs cadastrados para o Pilar e Bloco deste diagnóstico em <a href="/core/global-settings/ops/kpis" className="text-sollux-red hover:underline">OPS | KPIs de Diagnóstico</a>.
                </p>
              ) : (
                <div className="space-y-4">
                  {form.watch('kpiResponses').map((item, index) => (
                    <Card key={item.kpi_id} className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <FormField
                            control={form.control}
                            name={`kpiResponses.${index}.isSelected`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="font-semibold text-foreground cursor-pointer">
                                  {index + 1}. {item.question}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      {item.isSelected && (
                        <div className="space-y-3 mt-3">
                          <FormField
                            control={form.control}
                            name={`kpiResponses.${index}.score_id`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-foreground">Nota</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingScoringScales}>
                                  <FormControl>
                                    <SelectTrigger className="rounded-lg">
                                      <SelectValue placeholder="Selecione uma nota" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {scoringScales?.length === 0 ? (
                                      <SelectItem value="no-scores" disabled>Nenhuma régua de pontuação cadastrada</SelectItem>
                                    ) : (
                                      scoringScales?.map((score) => (
                                        score.id && score.id !== '' ? (
                                          <SelectItem key={score.id} value={score.id}>
                                            {score.score} - {score.description}
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
                            name={`kpiResponses.${index}.evidence`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-foreground">Evidência (Opcional)</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Descreva as evidências para esta resposta." {...field} className="rounded-lg" rows={2} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}

              <DialogFooter className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="rounded-lg">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || form.formState.errors.kpiResponses?.length > 0} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
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
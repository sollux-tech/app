import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { DiagnosticQuestionnaireFormData } from '@/types/diagnosticQuestionnaire';
import { Card } from '@/components/ui/card'; // Importação adicionada

interface AddMultipleDiagnosticQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagnosticId: string | undefined;
}

// Schema para uma única resposta de KPI
const kpiResponseSchema = z.object({
  kpi_id: z.string().min(1, { message: 'A pergunta (KPI) é obrigatória.' }),
  score_id: z.string().min(1, { message: 'A nota é obrigatória.' }),
  evidence: z.string().optional(),
});

// Schema para o formulário completo (um array de respostas de KPI)
const formSchema = z.object({
  responses: z.array(kpiResponseSchema),
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
      responses: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'responses',
  });

  // Fetch diagnostic details to get pillar and pillar block IDs
  const { data: selectedDiagnostic, isLoading: isLoadingDiagnostic } = useQuery<Diagnostic, Error>({
    queryKey: ['diagnosticDetails', diagnosticId],
    queryFn: async () => {
      if (!diagnosticId) throw new Error("ID do diagnóstico está faltando.");
      const { data, error } = await supabase
        .from('diagnostics')
        .select('*') // Alterado para selecionar todos os campos para corresponder à interface Diagnostic
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
        .select('*')
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

  // Populate form with KPIs when they load, ensuring no duplicates
  useEffect(() => {
    if (kpis && fields.length === 0) {
      const existingKpiIds = new Set(fields.map(f => f.kpi_id));
      const newKpisToAdd = kpis.filter(kpi => !existingKpiIds.has(kpi.id));
      newKpisToAdd.forEach(kpi => {
        append({ kpi_id: kpi.id, score_id: '', evidence: '' });
      });
    }
  }, [kpis, fields, append]);

  const createMultipleQuestionnairesMutation = useMutation({
    mutationFn: async (data: { diagnostic_id: string; responses: DiagnosticQuestionnaireFormData[] }) => {
      if (!user?.id || !selectedCompany?.id) throw new Error("Usuário não autenticado ou empresa não selecionada.");

      const recordsToInsert = data.responses.map(response => ({
        user_id: user.id,
        company_id: selectedCompany.id,
        diagnostic_id: data.diagnostic_id,
        kpi_id: response.kpi_id,
        score_id: response.score_id,
        evidence: response.evidence || null,
      }));

      const { error } = await supabase
        .from('diagnostic_questionnaires')
        .insert(recordsToInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnosticQuestionnaires', user?.id, selectedCompany?.id] });
      showSuccess('Perguntas do questionário salvas com sucesso!');
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      showError(`Erro ao salvar perguntas: ${error.message}`);
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (!diagnosticId) {
      showError("ID do diagnóstico não está disponível.");
      return;
    }
    createMultipleQuestionnairesMutation.mutate({
      diagnostic_id: diagnosticId,
      responses: data.responses as DiagnosticQuestionnaireFormData[],
    });
  };

  const isLoadingPage = isLoadingDiagnostic || isLoadingKpis || isLoadingScoringScales;
  const isSubmitting = createMultipleQuestionnairesMutation.isPending;

  const getKpiQuestion = (kpiId: string) => {
    return kpis?.find(k => k.id === kpiId)?.question || 'Pergunta desconhecida';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-card backdrop-blur-md rounded-2xl shadow-lg border border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Adicionar Perguntas ao Diagnóstico</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Preencha as notas e evidências para as perguntas do diagnóstico selecionado.
          </DialogDescription>
        </DialogHeader>
        {isLoadingPage ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-sollux-red" />
            <span className="ml-2 text-muted-foreground">Carregando perguntas...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {fields.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma pergunta encontrada para este diagnóstico. Certifique-se de que há KPIs cadastrados para o Pilar e Bloco deste diagnóstico.
                </p>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-foreground">
                          {index + 1}. {getKpiQuestion(field.kpi_id)}
                        </h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="text-destructive hover:bg-destructive/10 rounded-lg"
                        >
                          <MinusCircle className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormField
                        control={form.control}
                        name={`responses.${index}.score_id`}
                        render={({ field: scoreField }) => (
                          <FormItem className="mb-3">
                            <FormLabel className="text-foreground">Nota</FormLabel>
                            <Select onValueChange={scoreField.onChange} value={scoreField.value} disabled={isLoadingScoringScales}>
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
                        name={`responses.${index}.evidence`}
                        render={({ field: evidenceField }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">Evidência (Opcional)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Descreva as evidências para esta resposta." {...evidenceField} className="rounded-lg" rows={2} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </Card>
                  ))}
                </div>
              )}

              <DialogFooter className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="rounded-lg">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || fields.length === 0} className="rounded-lg bg-sollux-red hover:bg-sollux-orange">
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
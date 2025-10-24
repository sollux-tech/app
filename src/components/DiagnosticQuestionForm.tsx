import React from 'react';
import { useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DiagnosticQuestionnaire } from '@/types/diagnosticQuestionnaire';
import { ScoringScale } from '@/types/scoringScale';
import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label'; // Importação adicionada

// Schema para validar a resposta de uma única pergunta
const questionResponseSchema = z.object({
  score_id: z.string().min(1, { message: 'A nota é obrigatória.' }),
  evidence: z.string().optional(),
});

interface DiagnosticQuestionFormProps {
  currentQuestionnaire: DiagnosticQuestionnaire | null;
  scoringScales: ScoringScale[] | undefined;
  isLoadingScoringScales: boolean;
  isSaving: boolean;
}

const DiagnosticQuestionForm: React.FC<DiagnosticQuestionFormProps> = ({
  currentQuestionnaire,
  scoringScales,
  isLoadingScoringScales,
  isSaving,
}) => {
  const form = useFormContext<z.infer<typeof questionResponseSchema>>();

  if (!currentQuestionnaire) {
    return <p className="text-center text-muted-foreground">Nenhuma pergunta selecionada.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-lg font-semibold text-foreground">
          {currentQuestionnaire.kpis?.question || 'Pergunta não disponível.'}
        </Label>
        <p className="text-sm text-muted-foreground">
          {/* Adicionar descrição do KPI se disponível */}
        </p>
      </div>

      <FormField
        control={form.control}
        name="score_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-foreground">Nota</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value}
              disabled={isLoadingScoringScales || isSaving}
            >
              <FormControl>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Selecione uma nota" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {isLoadingScoringScales ? (
                  <SelectItem value="loading" disabled>Carregando notas...</SelectItem>
                ) : (scoringScales?.length || 0) === 0 ? (
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
        name="evidence"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-foreground">Evidência (Opcional)</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Descreva as evidências para esta resposta."
                {...field}
                className="rounded-lg"
                rows={4}
                disabled={isSaving}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default DiagnosticQuestionForm;
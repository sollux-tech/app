import { z } from 'zod';

export const questionResponseSchema = z.object({
  score_id: z.string().min(1, { message: 'A nota é obrigatória.' }),
  evidence: z.string().optional(),
});

// Ajustamos o tipo inferido para permitir que score_id seja opcional.
// A validação do Zod (min(1)) ainda será aplicada no submit.
export type QuestionResponseFormData = {
  score_id?: string;
  evidence?: string;
};
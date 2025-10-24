import { z } from 'zod';

export const questionResponseSchema = z.object({
  score_id: z.string().optional(), // Torna score_id opcional no nível do esquema
  evidence: z.string().optional(),
}).superRefine((data, ctx) => {
  // Adiciona validação para garantir que score_id não seja vazio ou undefined na submissão
  if (data.score_id === undefined || data.score_id.trim() === '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A nota é obrigatória.',
      path: ['score_id'],
    });
  }
});

export type QuestionResponseFormData = z.infer<typeof questionResponseSchema>;
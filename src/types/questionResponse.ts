import { z } from 'zod';

export const questionResponseSchema = z.object({
  score_id: z.string().min(1, { message: 'A nota é obrigatória.' }),
  evidence: z.string().optional(),
});

export type QuestionResponseFormData = z.infer<typeof questionResponseSchema>;
import { z } from 'zod';

// Definir explicitamente a interface para garantir que score_id seja opcional
export interface QuestionResponseFormData {
  score_id?: string; // Torna score_id explicitamente opcional para o TypeScript
  evidence?: string;
  order_number?: number; // Adicionado
}

// Definir o esquema Zod, garantindo que ele seja compatível com a interface acima.
// Usamos z.string().optional() para a inferência de tipo e superRefine para a validação em tempo de execução.
export const questionResponseSchema: z.ZodType<QuestionResponseFormData> = z.object({
  score_id: z.string().optional(),
  evidence: z.string().optional(),
  order_number: z.number().optional(), // Adicionado
}).superRefine((data, ctx) => {
  // Esta é a validação em tempo de execução que o torna efetivamente obrigatório
  if (data.score_id === undefined || data.score_id.trim() === '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A nota é obrigatória.',
      path: ['score_id'],
    });
  }
});
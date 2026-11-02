import { z } from 'zod';

export const loginSchema = z.strictObject({
  email: z.string().trim().pipe(z.email()),
  senha: z.string().min(1),
});

export type LoginDto = z.infer<typeof loginSchema>;

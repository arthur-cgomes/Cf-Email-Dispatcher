import { z } from 'zod';

export const sendEmailSchema = z.object({
  to: z.string().email({ message: 'Invalid recipient email address' }),
  from: z.string().email({ message: 'Invalid sender email address' }),
  subject: z
    .string()
    .min(1, { message: 'Subject cannot be empty' })
    .max(255, { message: 'Subject cannot exceed 255 characters' }),
  body: z.string().min(1, { message: 'Body cannot be empty' }),
});

export type SendEmailDTO = z.infer<typeof sendEmailSchema>;

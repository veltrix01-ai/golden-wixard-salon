import { z } from 'zod';

export const SubmitQuestionSchema = z.object({
  question: z
    .string({ message: 'Please enter your question.' })
    .trim()
    .min(10, { message: 'Question must be at least 10 characters long.' })
    .max(500, { message: 'Question cannot exceed 500 characters.' }),
  asker_name: z
    .string()
    .trim()
    .max(100, { message: 'Name cannot exceed 100 characters.' })
    .optional()
    .nullable(),
  // human_verified is kept for backward-compatibility with the frontend payload,
  // but real bot-protection is now handled by Cloudflare Turnstile (turnstileToken).
  human_verified: z
    .boolean({ message: 'Please complete the human verification.' })
    .refine((val) => val === true, {
      message: 'Please complete the human verification.',
    })
    .optional(),
  // Cloudflare Turnstile challenge token — verified server-side against the
  // Turnstile siteverify API before the question is saved.
  turnstileToken: z
    .string({ message: 'Human verification token is missing. Please refresh and try again.' })
    .min(1, { message: 'Human verification token is missing. Please refresh and try again.' }),
  website: z.string().max(200).optional().nullable(),
});

export const PublishAnswerSchema = z.object({
  answer: z
    .string({ message: 'Please enter an answer.' })
    .trim()
    .min(5, { message: 'Answer must be at least 5 characters long.' })
    .max(2000, { message: 'Answer cannot exceed 2000 characters.' }),
});

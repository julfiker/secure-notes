import { z } from 'zod';

export const createPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title cannot exceed 200 characters'),
  content: z
    .string()
    .trim()
    .min(1, 'Content cannot be empty'),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;


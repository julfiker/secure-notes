import { z } from 'zod';
import { UserRole } from '../types';

export const adminCreateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address format'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .max(100, 'Password cannot exceed 100 characters'),
  role: z.nativeEnum(UserRole).default(UserRole.USER),
  interests: z
    .array(z.string().trim().min(1, 'Interest tag cannot be empty'))
    .optional()
    .default([]),
});

export const adminUpdateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .optional(),
  role: z.nativeEnum(UserRole).optional(),
  interests: z
    .array(z.string().trim().min(1, 'Interest tag cannot be empty'))
    .optional(),
});

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;


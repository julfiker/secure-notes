import { PaginationMeta, PaginationParams } from '../types';
import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => !isNaN(val) && val >= 1, {
      message: 'Page must be an integer greater than or equal to 1',
    }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 100, {
      message: 'Limit must be an integer between 1 and 100',
    }),
});

export const getPaginationParams = (query: any): PaginationParams => {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const rawLimit = parseInt(query.limit as string, 10) || 10;
  const limit = Math.min(100, Math.max(1, rawLimit));

  return { page, limit };
};

export const createPaginationMeta = (
  totalCount: number,
  page: number,
  limit: number
): PaginationMeta => {
  const totalPages = Math.ceil(totalCount / limit) || 1;

  return {
    page,
    limit,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};


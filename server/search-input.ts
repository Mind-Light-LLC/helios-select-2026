import * as z from 'zod/v4';

export const searchInput = z.object({
  query: z.string().trim().min(1).max(500),
  country: z.string().trim().min(2).max(80).optional(),
  record_kind: z.enum(['organization', 'volunteer', 'event']).optional(),
  limit: z.number().int().min(1).max(20).optional(),
});

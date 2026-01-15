// src/lib/validation/calendar-schema.ts
/**
 * Zod validation schemas for calendar API
 */

import { z } from 'zod';

/**
 * Birth info schema
 */
export const BirthInfoSchema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)').optional(),
  latitude: z.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
  longitude: z.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180'),
  timezone: z.string().min(1, 'Timezone is required'),
});

export type BirthInfoInput = z.infer<typeof BirthInfoSchema>;

/**
 * Calendar query schema
 */
export const CalendarQuerySchema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  latitude: z.string().transform(val => parseFloat(val)),
  longitude: z.string().transform(val => parseFloat(val)),
  timezone: z.string(),
  year: z.string().transform(val => parseInt(val, 10)),
  category: z.enum(['wealth', 'career', 'love', 'health', 'travel', 'study', 'all']).optional().default('all'),
  locale: z.enum(['ko', 'en']).optional().default('ko'),
});

export type CalendarQueryInput = z.infer<typeof CalendarQuerySchema>;

/**
 * Save date schema
 */
export const SaveDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().optional(),
  description: z.string().optional(),
});

export type SaveDateInput = z.infer<typeof SaveDateSchema>;

/**
 * Date ID param schema
 */
export const DateIdSchema = z.object({
  id: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type DateIdInput = z.infer<typeof DateIdSchema>;

/**
 * Validation helper
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: errors };
  }

  return { success: true, data: result.data };
}

/**
 * Async validation helper
 */
export async function validateInputAsync<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const parsed = await schema.parseAsync(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: errors };
    }
    return { success: false, error: 'Validation failed' };
  }
}

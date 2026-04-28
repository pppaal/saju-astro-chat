// POST /api/calendar/cross-augment
// Body: { birth: <BirthProfile>, scope: 'daily' | 'weekly' | 'monthly',
//         queryDate?: ISO, year?, month?, weekStart? }
// Returns: CalendarCrossAugment (+ scope metadata)
//
// 기존 /api/calendar route는 손 안 댐. UI에서 별도로 fetch해 month
// 헤더·하이라이트·양면성 카드를 채움.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiMiddleware,
  parseJsonBody,
  apiError,
  apiSuccess,
  ErrorCodes,
} from '@/lib/api/middleware'
import {
  buildCalendarCrossAugment,
  buildWeeklyCrossAugment,
  buildMonthlyCrossAugment,
} from '@/lib/destiny-map/destinyCalendar'

const bodySchema = z.object({
  birth: z.object({
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    birthTime: z.string().regex(/^\d{2}:\d{2}$/),
    gender: z.enum(['male', 'female']),
    calendarType: z.enum(['solar', 'lunar']).optional(),
    timezone: z.string().optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    astroTimezone: z.string().optional(),
    solarTimeMode: z.enum(['standard', 'meanSolar', 'trueSolar']).optional(),
  }),
  scope: z.enum(['daily', 'weekly', 'monthly']).default('monthly'),
  queryDate: z.string().datetime().optional(),
  year: z.number().int().optional(),
  month: z.number().int().min(1).max(12).optional(),
  weekStart: z.string().datetime().optional(),
})

export const POST = withApiMiddleware(async (req: NextRequest) => {
  let raw: unknown
  try {
    raw = await parseJsonBody(req)
  } catch {
    return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid JSON body')
  }
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid input', parsed.error.flatten())
  }

  const { birth, scope, queryDate, year, month, weekStart } = parsed.data
  try {
    if (scope === 'monthly') {
      const now = new Date()
      const y = year ?? now.getFullYear()
      const m = month ?? now.getMonth() + 1
      const aug = await buildMonthlyCrossAugment(birth, y, m)
      return apiSuccess(aug)
    }
    if (scope === 'weekly') {
      const ws = weekStart ? new Date(weekStart) : new Date()
      const aug = await buildWeeklyCrossAugment(birth, ws)
      return apiSuccess(aug)
    }
    // daily
    const qd = queryDate ? new Date(queryDate) : new Date()
    const aug = await buildCalendarCrossAugment(birth, qd)
    return apiSuccess(aug)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'augment build failed'
    return apiError(ErrorCodes.INTERNAL_ERROR, msg)
  }
})

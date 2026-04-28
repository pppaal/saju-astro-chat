// POST /api/fortune-cross/chat
// Body: {
//   birth: <BirthProfile>,
//   queryDate?: ISO string,
//   question: string,
//   history?: Array<{ role: 'user'|'assistant', content: string }>,
//   skipReturns?: boolean,
// }
//
// Returns: { answer, usedLlm, model? }

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiMiddleware,
  parseJsonBody,
  apiError,
  apiSuccess,
  ErrorCodes,
} from '@/lib/api/middleware'
import { runFortune } from '@/lib/fortune/cross-rules'
import { chatWithFortune } from '@/lib/fortune/cross-rules/chat'

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
  queryDate: z.string().datetime().optional(),
  question: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(5000),
      }),
    )
    .max(20)
    .optional(),
  skipReturns: z.boolean().optional(),
})

type Body = z.infer<typeof bodySchema>

export const POST = withApiMiddleware(async (req: NextRequest) => {
  let raw: unknown
  try {
    raw = await parseJsonBody<Body>(req)
  } catch {
    return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid JSON body')
  }
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid input', parsed.error.flatten())
  }

  const { birth, queryDate, question, history, skipReturns } = parsed.data
  const queryDateObj = queryDate ? new Date(queryDate) : new Date()

  let report
  try {
    report = await runFortune({
      birth,
      queryDate: queryDateObj,
      skipReturns,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'fortune calculation failed'
    return apiError(ErrorCodes.INTERNAL_ERROR, msg)
  }

  const result = await chatWithFortune(report, question, { history })
  return apiSuccess({
    answer: result.answer,
    usedLlm: result.usedLlm,
    model: result.model,
    usage: result.usage,
  })
})

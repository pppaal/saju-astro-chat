// POST /api/fortune-cross
// Body: { birth: { birthDate, birthTime, gender, calendarType?, timezone?,
//                  latitude, longitude, astroTimezone? },
//         queryDate?: ISO string, llm?: boolean, skipReturns?: boolean }
//
// Returns: { report, text, usedLlm, model? }

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  withApiMiddleware,
  parseJsonBody,
  apiError,
  apiSuccess,
  ErrorCodes,
} from '@/lib/api/middleware'
import { renderToText } from '@/lib/fortune/cross-rules/renderer'
import { runFortune } from '@/lib/fortune/cross-rules'
import { renderWithLlm } from '@/lib/fortune/cross-rules/llmRenderer'

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
  }),
  queryDate: z.string().datetime().optional(),
  llm: z.boolean().optional(),
  mode: z.enum(['counselor', 'report']).optional(), // LLM render mode
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

  const { birth, queryDate, llm, mode, skipReturns } = parsed.data
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

  if (llm) {
    const rendered = await renderWithLlm(report, { mode: mode ?? 'counselor' })
    return apiSuccess({
      report,
      text: rendered.text,
      sections: rendered.sections,
      usedLlm: rendered.usedLlm,
      mode: rendered.mode,
      model: rendered.model,
    })
  }

  return apiSuccess({
    report,
    text: renderToText(report),
    usedLlm: false,
    mode: mode ?? 'counselor',
  })
})

import { NextRequest, NextResponse } from 'next/server'
import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import type { CalendarBuildOptions, CalendarRange } from '@/lib/calendar-engine/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * 신호 기반 캘린더 엔진 API.
 *
 * POST /api/calendar-engine
 * body: {
 *   birthDate: 'YYYY-MM-DD',
 *   birthTime: 'HH:MM',
 *   gender: 'male' | 'female',
 *   latitude: number,
 *   longitude: number,
 *   timeZone: 'Asia/Seoul',
 *   range: { start: ISO, end: ISO, granularity?: 'day' | 'hour' },
 *   options?: { focusThemes?, enabledExtractors?, includeEvidence? }
 * }
 *
 * 응답: { cells: CalendarCell[], meta: {...} }
 *
 * 기존 /api/calendar 은 그대로 유지 — 이 라우트는 신규 엔진 전용.
 */

interface RequestBody {
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  latitude: number
  longitude: number
  timeZone: string
  calendarType?: 'solar' | 'lunar'
  lunarLeap?: boolean
  range: {
    start: string
    end: string
    granularity?: 'day' | 'hour'
  }
  options?: CalendarBuildOptions
}

export async function POST(req: NextRequest) {
  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const missing = validate(body)
  if (missing) {
    return NextResponse.json({ error: `Missing field: ${missing}` }, { status: 400 })
  }

  try {
    const t0 = Date.now()
    const natal = await buildNatalContext({
      birthDate: body.birthDate,
      birthTime: body.birthTime,
      gender: body.gender,
      latitude: body.latitude,
      longitude: body.longitude,
      timeZone: body.timeZone,
      calendarType: body.calendarType,
      lunarLeap: body.lunarLeap,
    })

    const range: CalendarRange = {
      start: body.range.start,
      end: body.range.end,
      granularity: body.range.granularity ?? 'day',
    }

    const cells = await buildCalendar(natal, range, body.options ?? {})
    const elapsedMs = Date.now() - t0

    return NextResponse.json({
      cells,
      meta: {
        elapsedMs,
        cellCount: cells.length,
        signalCount: cells.reduce((sum, c) => sum + c.signals.length, 0),
        granularity: range.granularity,
        natal: {
          dayMaster: natal.saju.dayMaster.name,
          yongsin: natal.saju.yongsin.primary,
          strength: natal.saju.strength,
          sect: natal.astro.sect,
        },
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[calendar-engine] build failed:', message)
    return NextResponse.json({ error: `Build failed: ${message}` }, { status: 500 })
  }
}

function validate(b: Partial<RequestBody>): string | null {
  if (!b.birthDate) return 'birthDate'
  if (!b.birthTime) return 'birthTime'
  if (!b.gender) return 'gender'
  if (typeof b.latitude !== 'number') return 'latitude'
  if (typeof b.longitude !== 'number') return 'longitude'
  if (!b.timeZone) return 'timeZone'
  if (!b.range?.start) return 'range.start'
  if (!b.range?.end) return 'range.end'
  return null
}

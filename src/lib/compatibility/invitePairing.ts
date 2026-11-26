// src/lib/compatibility/invitePairing.ts
//
// 초대 링크 궁합의 서버 페어링 — 공유자(초대자)의 출생정보는 Redis 공유 레코드에만
// 있고 클라이언트로 내려가지 않는다. 받은 사람은 자기 출생정보 + 토큰만 보내고,
// 서버가 두 사람의 사주 기둥·본명 차트를 계산해 궁합 리포트(결과)만 돌려준다.
//
// 입력 규약은 무료 궁합 페이지의 수동 입력 경로(/api/saju ×2 + /api/astrology ×2 →
// /api/compatibility/report)와 같다: 시간 미상 → 정오 앵커(birthTimeAnchor SSOT),
// 출생 타임존 = 명시 tz → 출생 좌표(도시)의 tz, 좌표 미상이면 그 tz 의 존 기준점, 양력 고정.
// 같은 두 사람이면 같은 리포트가 나온다. tz 도 도시도 없으면 서울 기둥을 지어내지 않고
// BirthTimezoneRequiredError 를 던진다 — 라우트가 422 로 돌린다(G13, 제품은 전 세계 판매).
// 한쪽 계산이 실패하면 그 블록만 null 로 두고 리포트는 만든다(수동 경로와 같은 graceful).
//
// 서버 전용.

import { calculateSajuData } from '@/lib/saju/saju'
import { resolveBirthTimeAnchor } from '@/lib/saju/birthTimeAnchor'
import { parseHourMinute } from '@/lib/saju/timeParse'
import { cachedCalculateNatalChart } from '@/lib/astrology/cached'
import { logger } from '@/lib/logger'
import { defaultLatitudeFor, defaultLongitudeFor } from '@/lib/saju/timezone'
import { resolveBirthTimezoneStrict } from '@/lib/datetime/resolveTimezone'
import { buildCompatReport, type CompatReport } from './compatReport'
import type { SajuPillarInput } from './sajuSynastryFormatter'

/** 한 사람의 출생 타임존도 출생 도시(좌표)도 없다 — 라우트가 422 로 돌린다. */
export class BirthTimezoneRequiredError extends Error {
  constructor(readonly who: 'inviter' | 'invitee') {
    super(`birth timezone or birth city is required (${who})`)
    this.name = 'BirthTimezoneRequiredError'
  }
}

/** 한 사람의 출생 입력 — 공유 레코드의 inviter 와 받은 사람 요청 본문이 같은 모양. */
interface PairPersonInput {
  birthDate: string
  birthTime?: string
  timeUnknown?: boolean
  gender?: 'male' | 'female'
  lat?: number
  lon?: number
  tz?: string
}

interface ResolvedPerson {
  birthDate: string
  time: string
  timeUnknown: boolean
  gender?: 'male' | 'female'
  lat: number
  lon: number
  /** 좌표가 없어 타임존 기준점으로 떨어졌다 — ASC·MC·하우스를 가린다(재감사 CS-2). */
  cityUnknown: boolean
  tz: string
}

function resolvePerson(p: PairPersonInput, who: 'inviter' | 'invitee'): ResolvedPerson {
  // 미상 플래그가 켜져 있으면 남은 시각 문자열은 무시(폼·프리필 경로와 같은 tri-state).
  const anchor = resolveBirthTimeAnchor(
    p.timeUnknown ? '' : (p.birthTime ?? ''),
    p.timeUnknown === true
  )
  const hasCity = typeof p.lat === 'number' && typeof p.lon === 'number'
  // 출생 타임존 — 명시 tz → 출생 도시 좌표의 tz. 둘 다 없으면 계산하지 않는다(서울 폴백 없음).
  const resolved = resolveBirthTimezoneStrict({
    timezone: p.tz,
    latitude: hasCity ? p.lat : undefined,
    longitude: hasCity ? p.lon : undefined,
  })
  if (!resolved) throw new BirthTimezoneRequiredError(who)
  const tz = resolved.timeZone
  return {
    birthDate: p.birthDate,
    time: anchor.time,
    timeUnknown: anchor.timeUnknown,
    gender: p.gender,
    // 좌표 미상은 출생 타임존 기준점(defaultLatitudeFor/defaultLongitudeFor, OD-2) — 무료 궁합
    // 페이지의 수동 경로와 같은 값(둘이 갈리면 리포트가 달라진다).
    lat: hasCity ? (p.lat as number) : defaultLatitudeFor(tz),
    lon: hasCity ? (p.lon as number) : defaultLongitudeFor(tz),
    cityUnknown: !hasCity,
    tz,
  }
}

function sajuPillarsOf(p: ResolvedPerson, now: Date): SajuPillarInput[] | null {
  try {
    const r = calculateSajuData(
      p.birthDate,
      p.time,
      p.gender === 'female' ? 'female' : 'male',
      'solar',
      p.tz,
      false,
      p.lon,
      now
    )
    const cell = (x: { heavenlyStem: { name: string }; earthlyBranch: { name: string } }) => ({
      stem: x.heavenlyStem.name,
      branch: x.earthlyBranch.name,
    })
    const out = [cell(r.yearPillar), cell(r.monthPillar), cell(r.dayPillar), cell(r.timePillar)]
    return out[2].stem && out[2].branch ? out : null
  } catch (err) {
    logger.warn('[invitePairing] saju pillars failed', {
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

async function natalOf(p: ResolvedPerson): Promise<unknown> {
  try {
    const [year, month, date] = p.birthDate.split('-').map(Number)
    const { h, m } = parseHourMinute(p.time)
    return await cachedCalculateNatalChart({
      year,
      month,
      date,
      hour: h,
      minute: m,
      latitude: p.lat,
      longitude: p.lon,
      timeZone: p.tz,
    })
  } catch (err) {
    logger.warn('[invitePairing] natal chart failed', {
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * 공유자(A) × 받은 사람(B) 궁합 리포트를 서버에서 계산한다. 반환값엔 리포트와
 * 시간 미상 플래그만 있고, 공유자의 생년월일·시각·좌표·타임존은 없다.
 * 어느 쪽이든 출생 tz 도 도시도 없으면 BirthTimezoneRequiredError.
 */
export async function computeInvitePairReport(input: {
  inviter: PairPersonInput
  invitee: PairPersonInput
  lang: 'ko' | 'en'
  now?: Date
}): Promise<{ report: CompatReport; timeUnknownA: boolean; timeUnknownB: boolean }> {
  const now = input.now ?? new Date()
  const a = resolvePerson(input.inviter, 'inviter')
  const b = resolvePerson(input.invitee, 'invitee')
  const [astroA, astroB] = await Promise.all([natalOf(a), natalOf(b)])
  const report = buildCompatReport({
    astroA,
    astroB,
    pillarsA: sajuPillarsOf(a, now),
    pillarsB: sajuPillarsOf(b, now),
    timeUnknownA: a.timeUnknown,
    timeUnknownB: b.timeUnknown,
    cityUnknownA: a.cityUnknown,
    cityUnknownB: b.cityUnknown,
    genderA: a.gender,
    genderB: b.gender,
    lang: input.lang,
  })
  return { report, timeUnknownA: a.timeUnknown, timeUnknownB: b.timeUnknown }
}

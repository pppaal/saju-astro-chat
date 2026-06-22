// src/lib/push/keyDay.ts
//
// "오늘의 큰 날" 판정 — 캘린더 엔진의 salience(현저도, =큰날 축)를 그 사용자의
// 이달 안에서 상대 랭킹해, 오늘이 상위라면 푸시 페이로드를 만든다. 절대 임계는
// 청크별로 흔들리므로 쓰지 않고, 월 내 상위 K위만 "큰 날"로 본다(한 달에 몇 번).
//
// 톤은 derivedScore(우호도)로 갈라 좋은 큰 날 / 주의할 큰 날을 구분하고, 본문은
// 엔진이 만든 사유(topReasons/cautions) 첫 줄을 그대로 쓴다(LLM 없음, 결정론).
// 서버 전용 — 캘린더 엔진(Swiss Ephemeris) 사용.

import { getOrBuildNatalContext, getOrBuildMonthCells } from '@/lib/calendar-engine/persistence'
import { getNowInTimezone, formatDateString } from '@/lib/datetime/timezone'
import type { PushPayload } from './sender'

export interface KeyDayBirth {
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  latitude: number
  longitude: number
  timeZone: string
}

// 이달 salience 상위 몇 위까지를 "큰 날"로 볼지. 3이면 한 달에 약 3번.
const TOP_K = 3

/**
 * 오늘이 그 사용자의 "큰 날"이면 푸시 페이로드를, 아니면 null.
 * 월 cells 는 캐시 우선(getOrBuildMonthCells) — 같은 달 재호출은 싸다.
 */
export async function buildKeyDayPayload(
  birth: KeyDayBirth,
  locale: 'ko' | 'en'
): Promise<PushPayload | null> {
  const natal = await getOrBuildNatalContext(birth)
  const today = getNowInTimezone(birth.timeZone)
  const cells = await getOrBuildMonthCells(birth, natal, today.year, today.month)
  if (cells.length === 0) return null

  const iso = formatDateString(today.year, today.month, today.day)
  const todayCell = cells.find((c) => c.datetime.slice(0, 10) === iso)
  if (!todayCell) return null

  // 이달 안에서 현저도(salience) 랭킹 — 상위 K위 밖이면 평범한 날.
  const rank = [...cells]
    .sort((a, b) => b.salience - a.salience)
    .findIndex((c) => c.datetime.slice(0, 10) === iso)
  if (rank < 0 || rank >= TOP_K) return null

  const ko = locale === 'ko'
  const positive = todayCell.derivedScore >= 50
  const reason = (
    positive
      ? ko
        ? todayCell.topReasons[0]
        : todayCell.topReasonsEn?.[0]
      : ko
        ? todayCell.cautions[0]
        : todayCell.cautionsEn?.[0]
  )?.trim()

  const title = ko
    ? positive
      ? '오늘은 당신의 큰 날 ✨'
      : '오늘은 살펴야 할 날 ⚠️'
    : positive
      ? 'Today is your big day ✨'
      : 'A day to watch ⚠️'

  const fallback = ko
    ? positive
      ? '흐름이 당신 쪽으로 모이는 날이에요. 중요한 일을 미루지 마세요.'
      : '신호가 거센 날이에요. 큰 결정은 한 박자 늦추세요.'
    : positive
      ? 'The flow gathers in your favor today — don’t put off what matters.'
      : 'Strong signals today — give big decisions an extra beat.'

  return { title, body: reason || fallback, url: '/calendar' }
}

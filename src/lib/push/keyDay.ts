// src/lib/push/keyDay.ts
//
// "오늘의 큰 날" 판정 — 캘린더 엔진의 salience(현저도, =큰날 축)를 그 사용자의
// 이달 안에서 상대 랭킹해, 오늘이 상위라면 푸시 페이로드를 만든다. 절대 임계는
// 청크별로 흔들리므로 쓰지 않고, 월 내 상위 K위만 "큰 날"로 본다(한 달에 몇 번).
//
// 톤·본문은 웹 캘린더와 *같은 권위*에서 뽑는다 — deriveLayeredScores(월 모집단
// 일 점수) + reconcileCellOneLine(화해 verdict·한 줄). 예전엔 derivedScore>=50
// (6층 합산 절대값)으로 톤을 갈라, 앱 그리드가 빨간 날에 "큰 날 ✨" 푸시가
// 나가는 모순이 있었다(감사 #5). 이제 푸시가 열어주는 /calendar 화면과 같은
// 점수축·같은 문장이다(LLM 없음, 결정론). 서버 전용 — 캘린더 엔진 사용.

import { getOrBuildNatalContext, getOrBuildMonthCells } from '@/lib/calendar-engine/persistence'
import { deriveLayeredScores } from '@/lib/calendar-engine/derivers/layeredScore'
import { reconcileCellOneLine } from '@/components/calendar/adapters/toDay'
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
  // 웹과 동일 축: 월 모집단 layered.daily 점수 → 화해 verdict(톤) + 한 줄.
  const layered = deriveLayeredScores(cells)
  const unified = reconcileCellOneLine(todayCell, layered.daily.get(iso)?.score)
  const tone = unified.dayTone.tone

  const title = ko
    ? tone === 'positive'
      ? '오늘은 당신의 큰 날 ✨'
      : tone === 'caution'
        ? '오늘은 살펴야 할 날 ⚠️'
        : '오늘은 기복 있는 큰 날 🌗'
    : tone === 'positive'
      ? 'Today is your big day ✨'
      : tone === 'caution'
        ? 'A day to watch ⚠️'
        : 'A big day with swings 🌗'

  const fallback = ko
    ? tone === 'caution'
      ? '신호가 거센 날이에요. 큰 결정은 한 박자 늦추세요.'
      : '흐름이 당신 쪽으로 모이는 날이에요. 중요한 일을 미루지 마세요.'
    : tone === 'caution'
      ? 'Strong signals today — give big decisions an extra beat.'
      : 'The flow gathers in your favor today — don’t put off what matters.'

  // 본문 = 웹 일 화면의 한 줄 그대로 — 푸시를 눌러 연 화면과 문장이 이어진다.
  const body = (ko ? unified.oneLine : unified.oneLineEn) || fallback
  return { title, body, url: '/calendar', tag: 'keyday' }
}

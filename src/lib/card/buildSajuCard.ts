/**
 * 사주 카드 데이터 빌더 — 서버 전용, 결정론(now 주입, 시계를 읽지 않는다).
 *
 * 통합 리포트 페이지(src/app/(main)/integrated-report/page.tsx)와 같은 길로 계산한다:
 *
 *   buildReportContext → natalToReportData(기둥 · 십성) → buildCrossRows(교차 판정)
 *     → tallyCrossRows(합의 줄) → crossTypeName(사주 타입) → lifeShapeFor(인생 모양)
 *     → ganjiToRoman · ganjiToKorean(기둥 읽기)
 *
 * 그래서 카드의 타입 이름 · 정체성 판정 · 'N 중 M' 은 리포트와, 인생 모양은 /destiny 와 늘 같다.
 *
 * 규칙
 * - 시주는 데이터에 넣지 않는다(카드는 시주 칸을 숨김으로 그린다 — 공유 개인정보 기본값).
 *   생년월일 · 시각도 넣지 않는다.
 * - ASC 는 출생시각 · 출생지 미상(placeUnreliable)이면 null — 교차 행(buildCrossRows)과 같은
 *   가림 규칙이라, 정오 앵커 · 기본 좌표로 지어낸 상승궁을 보이지 않는다.
 * - 합의 줄의 전체 수는 고정값이 아니라 tallyCrossRows().total — 미성년(연애 · 재물 축 제외),
 *   MC · 섹트 미상(사회역할 · 음양 축 없음)마다 달라진다. 결핍 축(공망/카르마 · 성장 방향)은
 *   tallyCrossRows 가 뺀다.
 * - 카드 뒷면 세운(backYear)은 데이터가 아니다 — 렌더하는 쪽이 보는 사람의 날짜로 정한다.
 * - 데이터는 ko/en 한 쌍(Bi)이라 한 번 빌드로 두 언어를 다 그린다.
 */

import 'server-only'

import { buildReportContext } from '@/lib/report/buildReportContext'
import { buildCrossRows, natalToReportData, type CrossRowOut } from '@/lib/report/integratedAdapter'
import { normSajuElement, tallyCrossRows } from '@/lib/report/natalCross'
import { crossTypeName } from '@/lib/report/crossType'
import { getArchetype } from '@/lib/report/viralArchetype'
import { lifeShapeFor } from '@/lib/calendar-view/lifeShape'
import { SIGN_KO } from '@/lib/astrology/signLabels'
import { KO_TO_SAJU_ELEMENT, SIGN_TO_ASTRO_ELEMENT } from '@/lib/saju/elementBridge'
import { getBranchElement, getStemElement } from '@/lib/saju/stemBranchUtils'
import { ganjiToKorean, ganjiToRoman } from '@/lib/saju/ganjiKo'
import { resolveBirthTimeAnchor } from '@/lib/saju/birthTimeAnchor'
import { defaultLatitudeFor, defaultLongitudeFor } from '@/lib/saju/timezone'
import type { Bi, Lang } from '@/lib/i18n/bi'
import type { ReportPillar } from '@/lib/report/reportTypes'
import type { CardPillar, CardTraitRow, ElementKey, SajuCardData } from './types'

export interface SajuCardBirth {
  /** 양력 생년월일 'YYYY-MM-DD'. */
  date: string
  /** 출생 시각 'HH:MM'. 비었거나 timeUnknown 이면 정오 앵커 + 삼주(CONVENTIONS §5). */
  time?: string | null
  /** 출생시각 미상(명시). 기본 false — '00:00' 은 실제 자정 출생으로 본다. */
  timeUnknown?: boolean
  gender: 'male' | 'female'
  /** 출생 IANA 시간대 — 호출자가 resolveBirthTimezone 으로 정해 넘긴다. */
  timeZone: string
  /** 출생지 좌표. 하나라도 없으면 출생 시간대 기준점으로 계산하고 출생지 미상(ASC 없음). */
  latitude?: number | null
  longitude?: number | null
}

export interface SajuCardInput {
  birth: SajuCardBirth
  /** 요청 경계에서 한 번 읽은 '지금' — 미성년 판정 · 현재 대운 · 인생 모양의 만 나이. */
  now: Date
}

/** 카드와, 카드를 계산한 교차 행(언어별) — 홈 띠의 축 행 · 테스트가 같은 행을 읽는다. */
export interface SajuCardReading {
  card: SajuCardData
  crossRows: Record<Lang, CrossRowOut[]>
}

const elementOf = (ko: string): ElementKey => KO_TO_SAJU_ELEMENT[ko] ?? 'earth'

/** 기둥(천간 · 지지) → 카드 기둥(오행 · 로마자 · 한글). Life 화면 미니 카드도 같은 함수. */
export function cardPillar(p: Pick<ReportPillar, 'stem' | 'branch'>): CardPillar {
  return {
    stem: p.stem,
    branch: p.branch,
    element: {
      stem: elementOf(getStemElement(p.stem)),
      branch: elementOf(getBranchElement(p.branch)),
    },
    roman: ganjiToRoman(p.stem, p.branch),
    hangul: ganjiToKorean(`${p.stem}${p.branch}`),
  }
}

/** 영문 별자리 이름(Aries) → { ko: '양자리', en: 'Aries' }. 모르는 이름이면 null. */
function signBi(sign: string | null | undefined): Bi | null {
  if (!sign || !SIGN_KO[sign]) return null
  return { ko: SIGN_KO[sign], en: sign }
}

/**
 * 사주 타입 이름 — 리포트 바이럴 카드와 같은 규칙(crossTypeName, 없으면 일간 유형 이름).
 * Life 공유 블록(assembleLifetime)도 이 함수를 쓴다 — 홈 카드 · Life 카드가 같은 이름.
 */
export function typeNameOf(input: Parameters<typeof crossTypeName>[0]): Bi {
  const ko = crossTypeName(input, 'ko')
  const en = crossTypeName(input, 'en')
  if (ko && en) return { ko, en }
  const archetype = getArchetype(input.dayStem)
  if (!archetype) throw new Error(`buildSajuCard: unknown day stem '${input.dayStem}'`)
  return { ko: archetype.name.ko, en: archetype.name.en }
}

/**
 * 교차 행 하나 → 축 행(CrossCheckRow trait). 평가기의 칸 문구는 '오행 · 결'
 * ('Water · fluid and permeating')이라 ' · ' 앞을 값, 뒤를 둘째 줄로 나눈다.
 * 칸이 없는 행(left/right 없음)은 칸 없이 축 이름 · 판정만.
 */
export function toTraitRow(row: CrossRowOut): CardTraitRow {
  const cell = (s: string | undefined) => {
    if (!s) return undefined
    const i = s.indexOf(' · ')
    return i < 0 ? { text: s } : { text: s.slice(0, i), w: s.slice(i + 3) }
  }
  const saju = cell(row.left)
  const stars = cell(row.right)
  return {
    key: row.key,
    axis: row.category,
    verdict: row.tone,
    ...(saju ? { saju } : {}),
    ...(stars ? { stars } : {}),
  }
}

/** 카드 + 그 카드를 계산한 교차 행(ko/en). */
export async function buildSajuCardReading({
  birth,
  now,
}: SajuCardInput): Promise<SajuCardReading> {
  const { time, timeUnknown } = resolveBirthTimeAnchor(birth.time, birth.timeUnknown ?? false)
  const lat = birth.latitude
  const lng = birth.longitude
  const hasCoords =
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    typeof lng === 'number' &&
    Number.isFinite(lng)
  const cityUnknown = !hasCoords

  const natal = await buildReportContext({
    birthDate: birth.date,
    birthTime: time,
    gender: birth.gender,
    latitude: hasCoords ? lat : defaultLatitudeFor(birth.timeZone),
    longitude: hasCoords ? lng : defaultLongitudeFor(birth.timeZone),
    timeZone: birth.timeZone,
    birthTimeUnknown: timeUnknown,
    birthCityUnknown: cityUnknown,
    now,
  })
  // 리포트 페이지와 같은 ctx — 미상 플래그를 input 에도 싣는다(어댑터가 읽는 자리).
  const ctx = {
    ...natal,
    input: { ...natal.input, birthTimeUnknown: timeUnknown, birthCityUnknown: cityUnknown },
  }

  const data = natalToReportData(ctx, 'en', now)
  const crossRows: Record<Lang, CrossRowOut[]> = {
    ko: buildCrossRows(ctx, 'ko', now).rows,
    en: buildCrossRows(ctx, 'en', now).rows,
  }
  const rows = crossRows.en

  // 빅 쓰리 — 교차 평가기(buildCrossRows)와 같은 자리에서 같은 가림 규칙으로 읽는다.
  const chart = natal.astro.chart
  const sunSign = chart.planets.find((p) => p.name === 'Sun')?.sign
  const moonSign = chart.planets.find((p) => p.name === 'Moon')?.sign
  const ascSign = natal.astro.placeUnreliable ? undefined : chart.ascendant?.sign
  const sun = signBi(sunSign)
  const moon = signBi(moonSign)
  if (!sun || !moon) throw new Error('buildSajuCard: natal chart has no Sun or Moon sign')

  const P = data.saju.pillars
  const dayStem = P.day.stem

  // 정체성 — 리포트 '정체성' 행과 같은 판정(일간 오행 × 태양 별자리). 별 쪽은 판정 계산용
  // 단일값 오행(signToSajuElement — air→木 근사)이 아니라 리포트 칸이 보여 주는 서양 원소다
  // (쌍둥이·천칭·물병 태양 = 'air'). 예전엔 근사값이 그대로 들어가 카드에 'Wood' 로 떴다.
  const identityRow = rows.find((r) => r.key === 'identity')
  const sajuEl = normSajuElement(natal.saju.dayMaster?.element)
  const astroEl = sunSign ? SIGN_TO_ASTRO_ELEMENT[sunSign] : undefined
  const identity =
    identityRow && sajuEl && astroEl
      ? { saju: sajuEl, astro: astroEl, verdictKey: identityRow.tone }
      : null

  const tally = tallyCrossRows(rows)
  const lifeShape = await lifeShapeFor(natal, now)

  const card: SajuCardData = {
    pillars: {
      hour: null,
      day: cardPillar(P.day),
      month: cardPillar(P.month),
      year: cardPillar(P.year),
    },
    hourHidden: true,
    dayMaster: { stem: dayStem, element: elementOf(getStemElement(dayStem)) },
    bigThree: { sun, moon, asc: signBi(ascSign) },
    typeName: typeNameOf({
      sibsinCount: data.sibsinCount,
      monthStemSibsin: P.month.sibsinStem,
      dayBranchSibsin: P.day.sibsinBranch,
      dayStem,
    }),
    lifeShape: lifeShape ? { ko: lifeShape.ko, en: lifeShape.en } : null,
    identity,
    agree: tally.total > 0 ? { lineUp: tally.same + tally.supportive, total: tally.total } : null,
  }
  return { card, crossRows }
}

/** 사주 카드 데이터 — buildSajuCardReading 의 카드만. */
export async function buildSajuCardData(input: SajuCardInput): Promise<SajuCardData> {
  return (await buildSajuCardReading(input)).card
}

/**
 * 인생 모양(life shape) — 대운 흐름에 실제 외행성 트랜짓 곡선(lifeCurve)을 얹어 정하는
 * 인생 유형('대기만성형' · '굴곡형' …). 홈 사주 카드 · 인생 흐름 히어로 · Life 미니 카드가
 * 같은 값을 쓰도록 곡선 파이프라인을 이 한 곳에 둔다.
 *
 * 곡선이 있으면 lifePattern 이 대운 favor 로 고른 키를 곡선 형상으로 덮어쓴다
 * (lifePattern.classifyFromCurve, 감사 B1). 그래서 곡선 없이 deriveLifePattern 만 부르면
 * /destiny 와 다른 키가 나온다 — 모든 표면이 아래 세 단계를 같은 상수로 거친다:
 *
 *   lifeCurveAstroSeries  실제 외행성 트랜짓 시계열(만 0..90세, 3년 표본 + 보간)
 *   lifeCurveFromSeries   사주 층(대운 · 세운 · 충합) + 위 시계열 → 연 단위 곡선
 *   lifePatternFor        대운 favor 분류 → 곡선 형상으로 덮어쓰기
 *
 * 결정론: natal + 주입한 now 만 쓴다. now 는 만 나이(정점 서술의 시제)에만 닿고, 유형 키는
 * 나이와 무관하다.
 */

import {
  buildLifeCurve,
  computeTransitAstroSeries,
  type LifeCurve,
} from '@/lib/calendar-engine/derivers/lifeCurve'
import {
  deriveLifePattern,
  type LifePattern,
  type LifePatternKey,
} from '@/lib/calendar-engine/derivers/lifePattern'
import { currentManAge } from '@/lib/datetime/currentAge'
import type { NatalContext } from '@/lib/calendar-engine/context/types'

/** 곡선 호라이즌(만 나이 0..90) — 곡선 · 분류 · 화면 필터가 같은 값을 쓴다(감사 R2). */
const LIFE_CURVE_SPAN = 90
/** 트랜짓 표본 간격(년) — 외행성은 느려 3년 표본 + 선형 보간으로 충분하다. */
const LIFE_CURVE_STEP = 3

/**
 * 인생 곡선용 실제 외행성 트랜짓 시계열(길이 LIFE_CURVE_SPAN + 1). 프로세스 메모가 있어
 * 재방문은 무료. ephemeris 가 실패하면 null — 곡선만 빠지고 나머지는 정상(호출부 규약).
 */
export async function lifeCurveAstroSeries(natal: NatalContext): Promise<number[] | null> {
  return computeTransitAstroSeries(natal, { span: LIFE_CURVE_SPAN, step: LIFE_CURVE_STEP }).catch(
    () => null
  )
}

/** 시계열 + 본명 → 인생 곡선. 시계열이 없거나 조립이 실패하면 null(평균 나이표로 채우지 않는다). */
export function lifeCurveFromSeries(
  natal: NatalContext,
  astroSeries: number[] | null,
  now: Date
): LifeCurve | null {
  if (!astroSeries) return null
  try {
    return buildLifeCurve(natal, { now, span: LIFE_CURVE_SPAN, astroSeries })
  } catch {
    return null
  }
}

/**
 * 인생 유형 — 대운 favor 분류 후, 곡선이 있으면 곡선 형상으로 덮어쓴다. nowAge 는 *만 나이*
 * (정점 서술이 지금~앞으로를 가리키게). 대운 · 일간이 없으면 null.
 */
export function lifePatternFor(
  natal: NatalContext,
  nowAge: number,
  lifeCurve?: LifeCurve | null
): LifePattern | null {
  return deriveLifePattern(
    natal.saju as never,
    nowAge,
    lifeCurve
      ? { points: lifeCurve.points.map((p) => ({ age: p.age, macro: p.macro })) }
      : undefined
  )
}

/** 본명의 출생지 시간대 기준 만 나이(now 주입). */
function natalManAge(natal: NatalContext, now: Date): number {
  return currentManAge({
    birthYear: natal.input.year,
    birthMonth: natal.input.month,
    birthDate: natal.input.date,
    birthTimeZone: natal.input.timeZone,
    now,
  })
}

/** 인생 모양 — 유형 키와 ko/en 이름('굴곡형' / 'Ups and downs'). */
export interface LifeShape {
  key: LifePatternKey
  ko: string
  en: string
}

/**
 * 본명 하나의 인생 모양 — /destiny 의 lifetime.lifePattern 과 같은 파이프라인(같은 시계열 ·
 * 같은 곡선 · 같은 분류). 대운이 없으면 null.
 */
export async function lifeShapeFor(natal: NatalContext, now: Date): Promise<LifeShape | null> {
  const series = await lifeCurveAstroSeries(natal)
  const curve = lifeCurveFromSeries(natal, series, now)
  const lp = lifePatternFor(natal, natalManAge(natal, now), curve)
  return lp ? { key: lp.key, ko: lp.ko, en: lp.en } : null
}

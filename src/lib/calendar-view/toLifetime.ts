/**
 * NatalContext + lifetimeFlow / lifetimePivots → 인생 흐름 `lifetime` 페이로드 adapter.
 *
 * 출력(DestinyLifetime): { birthYear, currentYear, nowAge, daewoon[], lifeStages[],
 *   milestones[], lifePattern, lifeCurve, sibsinRadar, lifeStrategy } — /destiny 의 뷰모델
 * (calendar-view/lifetimeViewModel)과 상담사가 아닌 화면만 읽는다(상담사는 NatalContext).
 *
 * 본 adapter 는 toDaewoon / toLifeStages / toMilestones 를 한 번에 호출한다.
 *
 * 입력:
 *  - natal: NatalContext
 *  - lifetimeFlow / lifetimePivots (deriver 결과)
 *  - currentYear (UI 기준 연도)
 *
 * 출력: DestinyLifetime
 */

import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { LifetimeFlow } from '@/lib/calendar-engine/derivers/lifetimeFlow'
import type { LifetimePivots } from '@/lib/calendar-engine/derivers/lifetimePivots'
import type { LifeCurve } from '@/lib/calendar-engine/derivers/lifeCurve'
import type {
  DestinyLifetime,
  DestinyDaewoon,
  DestinyLifeStage,
  DestinyMilestone,
  DestinyLifeCurve,
} from '@/types/calendar'

import { lifePatternFor } from './lifeShape'
import {
  daeunCellsToCover,
  runningDaeunIndex,
  DAEUN_LIST_MIN_LENGTH,
  DAEUN_SPAN_YEARS,
} from '@/lib/saju/daeunAge'
import { buildSibsinRadar } from '@/lib/report/sibsinRadar'
import { buildLifeStrategy } from '@/lib/report/lifeStrategy'
import { toDaewoon } from './toDaewoon'
import { toLifeStages } from './toLifeStages'
import { toMilestones } from './toMilestones'

export interface ToLifetimeOptions {
  /** 본명 출생 연도. */
  birthYear: number
  /** UI 기준 (현재) 연도. */
  currentYear: number
  /**
   * 현재 *만 나이* (currentManAge — 생일 통과 반영). 만 나이 SSOT(감사 B1):
   * 곡선 nowAge·lifePattern 시제·대운 now 플래그가 전부 이 값을 쓴다.
   * 미지정 시 연차 나이(currentYear−birthYear) 폴백 — 생일 전엔 1살 과다.
   */
  manAge?: number
  /** lifetimeFlow deriver 결과 (선택 — 없으면 lifeStages 가 빈 4-슬롯). */
  lifetimeFlow?: LifetimeFlow
  /** lifetimePivots deriver 결과 (선택 — 없으면 milestones 가 빈 배열). */
  lifetimePivots?: LifetimePivots
  /** buildLifeCurve 결과 (선택 — 없으면 lifeCurve 미노출). */
  lifeCurve?: LifeCurve
}

/** buildLifeCurve(macro 곡선) → 렌더용 DestinyLifeCurve (value 0..1 정규화, ≤88세). */
function toDestinyLifeCurve(
  curve: LifeCurve | undefined,
  nowAge: number
): DestinyLifeCurve | undefined {
  if (!curve || curve.points.length === 0) return undefined
  // 호라이즌 90 통일(감사 R2) — 88 컷은 F5 가 살린 말년(89~90) 경계 피크를 다시
  // 떨궈 "다음 마루" 가 비던 증상을 재현했다. span·classifyFromCurve 와 한 값으로.
  const pts = curve.points.filter((p) => p.age <= 90)
  const vals = pts.map((p) => p.macro)
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const r = hi - lo || 1
  const norm = (v: number) => (v - lo) / r
  const peaks = curve.peaks
    .filter((e) => e.age <= 90)
    .map((e) => ({ age: e.age, year: e.year, kind: 'peak' as const }))
  const troughs = curve.troughs
    .filter((e) => e.age <= 90)
    .map((e) => ({ age: e.age, year: e.year, kind: 'trough' as const }))

  // "지금" 읽기 — macro 기울기(3년) + 현재 이후 첫 마루/저점.
  let now: DestinyLifeCurve['now']
  const here = pts.find((p) => p.age === nowAge)
  if (here) {
    // 3년 뒤쪽 기울기가 기본. 유아기(nowAge<3)는 뒤쪽 점이 없어 항상 plateau 로
    // 뭉개지던(감사 F8) 것을 앞쪽 3년 기울기로 대체한다.
    const prev = pts.find((p) => p.age === nowAge - 3)
    const dv = prev
      ? norm(here.macro) - norm(prev.macro)
      : norm((pts.find((p) => p.age === nowAge + 3) ?? pts[pts.length - 1]).macro) -
        norm(here.macro)
    const slope: 'rising' | 'falling' | 'plateau' =
      dv > 0.04 ? 'rising' : dv < -0.04 ? 'falling' : 'plateau'
    now = {
      slope,
      nextPeak: peaks.find((e) => e.age > nowAge),
      nextTrough: troughs.find((e) => e.age > nowAge),
    }
  }

  return {
    points: pts.map((p) => ({ age: p.age, year: p.year, value: norm(p.macro) })),
    peaks,
    troughs,
    nowAge,
    now,
  }
}

/**
 * 본명 컨텍스트의 대운 목록이 만 나이를 덮지 못하면 같은 순서열로 이어 붙인 사본을
 * 돌려준다(덮으면 원본 그대로). 만 나이를 모르면 손대지 않는다.
 */
function withDaeunCovering(
  natal: NatalContext,
  manAge: number | undefined,
  fallbackBirthYear: number
): NatalContext {
  const list = natal.saju?.daeun
  if (manAge == null || !list?.length) return natal
  const extra = daeunCellsToCover(list, manAge)
  if (!extra.length) return natal
  const birthYear =
    typeof list[0].startYear === 'number' && Number.isFinite(list[0].startYear)
      ? list[0].startYear - list[0].startAge
      : fallbackBirthYear
  return {
    ...natal,
    saju: {
      ...natal.saju,
      daeun: [...list, ...extra.map((c) => ({ ...c, startYear: birthYear + c.startAge }))],
    },
  }
}

/**
 * NatalContext + derivers → DestinyLifetime. 입력만 주어지면 모든 필드가 채워진다.
 */
export function toLifetime(natal: NatalContext, opts: ToLifetimeOptions): DestinyLifetime {
  // 만 나이 SSOT — milestones(lifetimePivots)·lifeStages(lifetimeFlow)와 같은 축.
  const nowAge = opts.manAge ?? opts.currentYear - opts.birthYear

  // 대운 — 현재 대운 SSOT(daeunAge, CONVENTIONS §14)와 같은 규칙. 영구 캐시된 본명
  // 컨텍스트의 목록이 만 나이를 덮지 못하면(시작 나이 + 100세 이상) 같은 순서열로 이어
  // 붙이고(daeunCellsToCover), 지금 칸은 runningDaeunIndex 가 고른다 — /api/saju·상담사·
  // 궁합과 같은 대운을 '지금'이라 한다(재감사 SI-5: 예전엔 nowAge < startAge+10 경계로
  // 10칸 뒤의 100세+ 에게 현재 대운이 없었다).
  const natalForDaewoon = withDaeunCovering(natal, opts.manAge, opts.birthYear)
  const daewoonAll = toDaewoon(natalForDaewoon)
  const runningIdx =
    opts.manAge != null
      ? runningDaeunIndex(
          daewoonAll.map((d) => d.startAge),
          nowAge
        )
      : null
  const daewoonRows: DestinyDaewoon[] = daewoonAll.map((d, i) => ({
    gz: d.gz,
    start: d.start,
    end: d.end,
    startAge: d.startAge,
    endAge: d.startAge + DAEUN_SPAN_YEARS,
    sibsin: d.sibsin,
    known: d.known,
    now:
      opts.manAge != null
        ? runningIdx === i
        : opts.currentYear >= d.start && opts.currentYear < d.end,
  }))
  // 막대 줄은 10칸 격자다 — 목록이 10칸을 넘으면(100세+) 지금 대운으로 끝나는 10칸만
  // 보여 준다(가장 이른 대운부터 뺀다). 일부러 자른다: '지금' 칸이 늘 보인다.
  const windowEnd = runningIdx != null && runningIdx >= 0 ? runningIdx + 1 : daewoonRows.length
  const windowStart = Math.max(0, windowEnd - DAEUN_LIST_MIN_LENGTH)
  const daewoon = daewoonRows.slice(windowStart, windowStart + DAEUN_LIST_MIN_LENGTH)

  // 4구간 단계 — 이름 · 나이 범위 · 지금 여부 · 톤.
  const lifeStages: DestinyLifeStage[] = toLifeStages(opts.lifetimeFlow, {
    birthYear: opts.birthYear,
  })

  const milestones: DestinyMilestone[] = toMilestones(opts.lifetimePivots).map((m) => ({
    year: m.year,
    age: m.age,
    label: m.label,
    labelEn: m.labelEn,
    meaning: m.meaning,
    meaningEn: m.meaningEn,
    meaningCore: m.meaningCore,
    meaningCoreEn: m.meaningCoreEn,
    kind: m.kind,
    now: m.now,
  }))

  // 인생 유형 — 대운 흐름(대기만성/초년발복/청년절정/…).
  // 현재 *만* 나이를 넘겨 "정점" 서술이 지금~앞으로를 가리키게(과거/유아기 정점 방지
  // + 생일 전 1살 과다로 시제가 어긋나던 감사 B1 교정).
  // 분류·정점·계절톤·곡선을 *모두 같은 blended macro* 에서 뽑아 라벨↔정점서사↔단계
  // 톤↔화면 곡선이 구조적으로 일치하게 한다(감사 30인: 라벨과 표시 곡선이 다른
  // 신호라 "가장 환하게 N세"가 저점 구간을 가리키던 모순 다수). 점성 성숙-트랜짓
  // 재평가(lifeCurve) 이후엔 blended 가 사주 곡선 형상을 뒤집지 않아 안전.
  // 홈 사주 카드의 인생 모양(lifeShapeFor)과 같은 함수 — 곡선이 키를 덮어쓰는 규칙이 한 곳에.
  const lp = lifePatternFor(natal, nowAge, opts.lifeCurve)
  const lifePattern = lp
    ? {
        key: lp.key,
        ko: lp.ko,
        en: lp.en,
        line: lp.line,
        lineEn: lp.lineEn,
        lead: lp.lead,
        leadEn: lp.leadEn,
        body: lp.body,
        bodyEn: lp.bodyEn,
        tagline: lp.tagline,
        taglineEn: lp.taglineEn,
        ...(lp.peak ? { peak: lp.peak } : {}),
        daeun: lp.daeun.map((d) => ({ startAge: d.startAge, gz: d.gz, favor: d.favor })),
      }
    : undefined

  // 타고난 능력치 레이더 — 십성 분포에서 정직하게(가짜 점수 아님). 근거 없으면
  // undefined → 컴포넌트가 블록 자체를 렌더 안 함. 축마다 그 원국 글자(chars — 일간 제외,
  // 시주 없으면 세 기둥 · estimated)를 엔진 기둥의 십신에서 그대로 싣는다(v9 강점 표).
  const sibsinRadar =
    buildSibsinRadar(natal.saju.analyses?.sibsin?.categoryCount, natal.saju.pillars) ?? undefined

  // "운을 내 편으로" — 엔진이 *이미* 계산했으나 프론트에 안 오던 값을 하나로 묶는다:
  //  행운 요소(용신 색·방향·숫자), 귀인 띠(천을귀인), 주의 구간(곡선 저점, 재파생
  //  없이 엔진 troughs 그대로), 재물 방식(재성). 근거 없는 타일은 생략, 전부 없으면
  //  undefined → 블록 미노출.
  const lifeStrategy =
    buildLifeStrategy({
      yongsin: natal.saju.analyses?.yongsin,
      dayStemHanja: natal.saju.dayMaster?.name,
      sibsinCount: natal.saju.analyses?.sibsin?.categoryCount,
      curveTroughs: opts.lifeCurve?.troughs.map((t) => ({
        age: t.age,
        year: t.year,
        value: t.value,
      })),
      nowAge,
    }) ?? undefined

  return {
    birthYear: opts.birthYear,
    currentYear: opts.currentYear,
    // 만 나이 SSOT 를 lifetime 에 직접 실어, 컴포넌트가 곡선 부재(에페메리스 실패)
    // 시에도 달력 나이(currentYear−birthYear, 생일 전 +1)로 떨어지지 않게 한다(감사 G4).
    nowAge,
    daewoon,
    lifeStages,
    milestones,
    lifePattern,
    lifeCurve: toDestinyLifeCurve(opts.lifeCurve, nowAge),
    sibsinRadar,
    lifeStrategy,
  }
}

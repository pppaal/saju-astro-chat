// 현재 운(運) — 조회 시점의 세운(年)·월운(月)·일진(日) + 본명 대비 형충회합.
//
// 순수 사주 계산이다. 원래 fusion/adapters/saju.ts 안에 갇혀 있어 상담사가
// fusion 을 거쳐야만 현재 운을 받을 수 있었다(잘못된 결합). 여기 lib/saju 로
// 빼내, calculateSajuData 결과(이미 진경도 보정됨)만 있으면 누구나 직접 쓴다.
//
// 입력 raw 는 collectSajuFacts._raw / calculateSajuData 결과 — longitude 보정이
// 적용된 동일 기준이라, 현재 운도 본명과 같은 평균태양시 위에서 나온다.

import { getIljinCalendar } from './unse'
import { getMonthPillarForDate, getYearPillarForDate } from './datePillars'
import {
  BRANCH_CLASH,
  SIX_HARMONY,
  STEM_CLASH_4,
  STEM_COMBINE,
  toPairKeySet,
} from './relationTables'
import type { CalculateSajuDataResult, RelationHit, SajuPillars, PillarKind } from './types'

// 충/합 키셋 — relationTables(SSOT)에서 파생. 로컬 하드코딩 복제 금지(드리프트
// 방지). toPairKeySet 이 'a-b'/'b-a' 양방향 키를 만들어 .has 가 방향 무관.
const BRANCH_CHUNG = toPairKeySet(BRANCH_CLASH)
const BRANCH_YUKHAP = toPairKeySet(SIX_HARMONY.map((h) => h.pair))
const STEM_CHUNG = toPairKeySet(STEM_CLASH_4)
const STEM_HAP = toPairKeySet(STEM_COMBINE.map((s) => s.pair))
const PILLAR_NAMES: PillarKind[] = ['year', 'month', 'day', 'time']

/** 운(運)의 천간·지지가 본명 네 기둥과 이루는 충/합. */
export function detectUnseRelations(
  pillars: SajuPillars,
  unseStem: string,
  unseBranch: string
): RelationHit[] {
  const out: RelationHit[] = []
  for (const name of PILLAR_NAMES) {
    const p = pillars[name]
    const ns = p.heavenlyStem.name
    const nb = p.earthlyBranch.name
    if (STEM_CHUNG.has(`${unseStem}-${ns}`))
      out.push({ kind: '천간충', pillars: [name], detail: `운 ${unseStem} - ${name} ${ns}` })
    else if (STEM_HAP.has(`${unseStem}-${ns}`))
      out.push({ kind: '천간합', pillars: [name], detail: `운 ${unseStem} - ${name} ${ns}` })
    if (BRANCH_CHUNG.has(`${unseBranch}-${nb}`))
      out.push({ kind: '지지충', pillars: [name], detail: `운 ${unseBranch} - ${name} ${nb}` })
    else if (BRANCH_YUKHAP.has(`${unseBranch}-${nb}`))
      out.push({ kind: '지지육합', pillars: [name], detail: `운 ${unseBranch} - ${name} ${nb}` })
  }
  return out
}

interface StemBranch {
  stem: string
  branch: string
}

function pickSeun(queryDate: Date): StemBranch | null {
  // 세운(年運) = 절기 기준 현재 사주 연주. 세운은 1/1 이 아니라 *입춘*에 바뀐다.
  // 직전엔 raw.unse.annual 을 queryDate.getFullYear()(=1/1 경계)로 lookup 해서,
  // 1/1 ~ 입춘(~2/4) 구간이 다음 해 세운으로 잘못 떴다(예: 1/15 에 이미 다음 해
  // 간지). datePillars(입춘-aware getYearPillarForDate)로 직접 산출해 바로잡는다 —
  // 월운·일진·생일 차트와 동일 convention.
  const { stem, branch } = getYearPillarForDate(queryDate)
  return stem && branch ? { stem, branch } : null
}

function pickWolun(queryDate: Date): StemBranch | null {
  // 월운(月運) = 절기 기준 현재 사주월. 생일 차트·운흐름 캘린더·일진과 동일한
  // 절기(태양 황경) convention 으로 통일한다. 직전엔 raw.unse.monthly
  // (getSajuMonthlyCycles, 寅-first 달력 산술 배열)에서 (연,달력월) 로 lookup 했는데,
  // 그 배열은 "달력월 = 사주월 번호"로 퉁쳐 현재 달이 항상 한 칸 밀렸다(예: 달력
  // 6월에 未월 → 정답은 午월). datePillars(절기)로 직접 산출해 바로잡는다.
  const { stem, branch } = getMonthPillarForDate(queryDate)
  return stem && branch ? { stem, branch } : null
}

function pickIljin(raw: CalculateSajuDataResult, queryDate: Date): StemBranch | null {
  try {
    // queryDate 는 유저-tz 날짜의 UTC 정오(counselorContext) → getUTC* 로 읽어야
    // seun/wolun(getTime)과 같은 프레임이 된다. 예전엔 getFullYear/Month/Date(로컬)라
    // 서버 TZ 에 따라 일진이 하루 어긋날 수 있었다(ENGINE-AUDIT).
    const cal = getIljinCalendar(
      queryDate.getUTCFullYear(),
      queryDate.getUTCMonth() + 1,
      raw.dayMaster
    )
    const found = cal.find((d) => d.day === queryDate.getUTCDate())
    return found ? { stem: found.heavenlyStem, branch: found.earthlyBranch } : null
  } catch {
    return null
  }
}

export interface CurrentUnse {
  seun: StemBranch | null
  wolun: StemBranch | null
  iljin: StemBranch | null
  relations: Array<{ source: 'seun' | 'wolun' | 'iljin'; relation: RelationHit }>
}

/**
 * 조회 시점(queryDate)의 세운·월운·일진 + 각 운이 본명과 이루는 충/합.
 * raw 는 진경도 보정이 적용된 calculateSajuData 결과(collectSajuFacts._raw).
 */
export function computeCurrentUnse(raw: CalculateSajuDataResult, queryDate: Date): CurrentUnse {
  const seun = pickSeun(queryDate)
  const wolun = pickWolun(queryDate)
  const iljin = pickIljin(raw, queryDate)
  const relations: CurrentUnse['relations'] = []
  for (const [sb, source] of [
    [seun, 'seun'],
    [wolun, 'wolun'],
    [iljin, 'iljin'],
  ] as const) {
    if (!sb) continue
    for (const r of detectUnseRelations(raw.pillars, sb.stem, sb.branch)) {
      relations.push({ source, relation: r })
    }
  }
  return { seun, wolun, iljin, relations }
}

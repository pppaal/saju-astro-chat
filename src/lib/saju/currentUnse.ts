// 현재 운(運) — 그날의 세운(年)·월운(月)·일진(日) + 본명 대비 형충회합.
//
// 순수 사주 계산이다. 원래 fusion/adapters/saju.ts 안에 갇혀 있어 상담사가
// fusion 을 거쳐야만 현재 운을 받을 수 있었다(잘못된 결합). 여기 lib/saju 로
// 빼내, calculateSajuData 결과만 있으면 누구나 직접 쓴다.
//
// '그날'은 순간이 아니라 *현지 민용 날짜*다(재감사 G3 · TP-4 · TP-5). 세운·월운은 호출자가
// 캘린더와 같은 헬퍼(calendar-engine/periodPillars.pillarsForLocalDate — 節/立春 이 든 그
// 현지 날이 새 기둥)로 골라 넘긴다. 예전엔 여기서 '그 날짜의 UTC 정오' 순간을 절입 순간과
// 비교해, 캘린더 셀(같은 날짜)과 절입일에 월운·세운이 갈렸고 UTC+12..+14 에선 그 순간이
// 이미 다음 현지 날이라 하루 일찍 바뀌었다. 일진은 날짜 산술(getIljinCalendar)이다.

import { getIljinCalendar } from './unse'
import { BRANCH_CLASH, SIX_HARMONY, STEM_CLASH, STEM_COMBINE, toPairKeySet } from './relationTables'
import type { CalculateSajuDataResult, RelationHit, SajuPillars, MaybeTimeless } from './types'
import { presentPillars } from './stemBranchUtils'

// 충/합 키셋 — relationTables(SSOT)에서 파생. 로컬 하드코딩 복제 금지(드리프트
// 방지). toPairKeySet 이 'a-b'/'b-a' 양방향 키를 만들어 .has 가 방향 무관.
const BRANCH_CHUNG = toPairKeySet(BRANCH_CLASH)
const BRANCH_YUKHAP = toPairKeySet(SIX_HARMONY.map((h) => h.pair))
const STEM_CHUNG = toPairKeySet(STEM_CLASH) // 엔진 공통 천간충 모드(4쌍)
const STEM_HAP = toPairKeySet(STEM_COMBINE.map((s) => s.pair))
/**
 * 운(運)의 천간·지지가 본명 네 기둥과 이루는 충/합. 시주가 null 이면(출생시각 미상)
 * 년·월·일 세 기둥만 본다(CONVENTIONS §5).
 */
export function detectUnseRelations(
  pillars: MaybeTimeless<SajuPillars>,
  unseStem: string,
  unseBranch: string
): RelationHit[] {
  const out: RelationHit[] = []
  for (const [name, p] of presentPillars(pillars)) {
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

/** 현지 민용 날짜(연·월·일) — 상담사 '오늘'. */
export interface CivilDay {
  year: number
  /** 1–12 */
  month: number
  day: number
}

/**
 * 그 날짜의 세운·월운 — 캘린더 셀과 같은 절입일 규칙으로 고른 값
 * (calendar-engine/periodPillars.pillarsForLocalDate 의 { year, month }).
 */
export interface DayPeriodPillars {
  year: StemBranch
  month: StemBranch
}

function pickIljin(raw: CalculateSajuDataResult, day: CivilDay): StemBranch | null {
  try {
    // 일진은 날짜 산술 — 현지 날짜의 연·월·일 그대로(서버 TZ·순간 무관).
    const cal = getIljinCalendar(day.year, day.month, raw.dayMaster)
    const found = cal.find((d) => d.day === day.day)
    return found ? { stem: found.heavenlyStem, branch: found.earthlyBranch } : null
  } catch {
    return null
  }
}

/** 기둥 객체에서 간지만 — sajuYear·termIndex 같은 부가 필드는 싣지 않는다. */
const pickSb = (p: StemBranch): StemBranch => ({ stem: p.stem, branch: p.branch })

export interface CurrentUnse {
  seun: StemBranch | null
  wolun: StemBranch | null
  iljin: StemBranch | null
  relations: Array<{ source: 'seun' | 'wolun' | 'iljin'; relation: RelationHit }>
}

/**
 * 현지 날짜 day 의 세운·월운·일진 + 각 운이 본명과 이루는 충/합.
 * period 는 그 날짜의 세운·월운(pillarsForLocalDate — 캘린더 셀과 같은 값).
 */
export function computeCurrentUnse(
  raw: CalculateSajuDataResult,
  day: CivilDay,
  period: DayPeriodPillars
): CurrentUnse {
  const seun = period.year.stem && period.year.branch ? pickSb(period.year) : null
  const wolun = period.month.stem && period.month.branch ? pickSb(period.month) : null
  const iljin = pickIljin(raw, day)
  const relations: CurrentUnse['relations'] = []
  // 시간 미상이면 raw.pillars.time 은 정오 앵커 자리표시 — 운과의 충/합에서 뺀다.
  const natal = raw.timeUnknown ? { ...raw.pillars, time: null } : raw.pillars
  for (const [sb, source] of [
    [seun, 'seun'],
    [wolun, 'wolun'],
    [iljin, 'iljin'],
  ] as const) {
    if (!sb) continue
    for (const r of detectUnseRelations(natal, sb.stem, sb.branch)) {
      relations.push({ source, relation: r })
    }
  }
  return { seun, wolun, iljin, relations }
}

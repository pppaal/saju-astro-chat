// 현재 운(運) — 조회 시점의 세운(年)·월운(月)·일진(日) + 본명 대비 형충회합.
//
// 순수 사주 계산이다. 원래 fusion/adapters/saju.ts 안에 갇혀 있어 상담사가
// fusion 을 거쳐야만 현재 운을 받을 수 있었다(잘못된 결합). 여기 lib/saju 로
// 빼내, calculateSajuData 결과(이미 진경도 보정됨)만 있으면 누구나 직접 쓴다.
//
// 입력 raw 는 collectSajuFacts._raw / calculateSajuData 결과 — longitude 보정이
// 적용된 동일 기준이라, 현재 운도 본명과 같은 평균태양시 위에서 나온다.

import { getIljinCalendar } from './unse'
import { getMonthPillarForDate } from './datePillars'
import type { CalculateSajuDataResult, RelationHit, SajuPillars, PillarKind } from './types'

const BRANCH_CHUNG = new Set([
  '子-午',
  '午-子',
  '丑-未',
  '未-丑',
  '寅-申',
  '申-寅',
  '卯-酉',
  '酉-卯',
  '辰-戌',
  '戌-辰',
  '巳-亥',
  '亥-巳',
])
const BRANCH_YUKHAP = new Set([
  '子-丑',
  '丑-子',
  '寅-亥',
  '亥-寅',
  '卯-戌',
  '戌-卯',
  '辰-酉',
  '酉-辰',
  '巳-申',
  '申-巳',
  '午-未',
  '未-午',
])
const STEM_CHUNG = new Set(['甲-庚', '庚-甲', '乙-辛', '辛-乙', '丙-壬', '壬-丙', '丁-癸', '癸-丁'])
const STEM_HAP = new Set([
  '甲-己',
  '己-甲',
  '乙-庚',
  '庚-乙',
  '丙-辛',
  '辛-丙',
  '丁-壬',
  '壬-丁',
  '戊-癸',
  '癸-戊',
])
const PILLAR_NAMES: PillarKind[] = ['year', 'month', 'day', 'time']

/** 운(運)의 천간·지지가 본명 네 기둥과 이루는 충/합. */
function detectUnseRelations(
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

function splitGanji(found: {
  heavenlyStem?: string
  earthlyBranch?: string
  ganji?: string
}): StemBranch | null {
  const stem = found.heavenlyStem ?? (found.ganji ? found.ganji.slice(0, 1) : '')
  const branch = found.earthlyBranch ?? (found.ganji ? found.ganji.slice(1) : '')
  return stem && branch ? { stem, branch } : null
}

function pickSeun(raw: CalculateSajuDataResult, queryDate: Date): StemBranch | null {
  const yr = queryDate.getFullYear()
  const found = (raw.unse?.annual ?? []).find((a) => a.year === yr)
  return found ? splitGanji(found) : null
}

function pickWolun(_raw: CalculateSajuDataResult, queryDate: Date): StemBranch | null {
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
    const cal = getIljinCalendar(queryDate.getFullYear(), queryDate.getMonth() + 1, raw.dayMaster)
    const found = cal.find((d) => d.day === queryDate.getDate())
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
  const seun = pickSeun(raw, queryDate)
  const wolun = pickWolun(raw, queryDate)
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

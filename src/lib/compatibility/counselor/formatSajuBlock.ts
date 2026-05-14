/**
 * formatSajuBlock — convert raw saju output into a plain-text block the LLM
 * can read line-by-line.
 *
 * Designed to mirror how Korean 사주명리 chart-sharing sites lay out a
 * reading: pillars + day master + element counts + ten gods (십성) + a few
 * 신살 highlights + current 대운 / 세운. Plus a Pair Interactions block at
 * the bottom that shows the canonical 戊癸合-style stem合 and branch合/충.
 */

import { calculateSajuData } from '@/lib/saju/saju'
import { toSajuPillarsLike, getShinsalHits, type ShinsalHit } from '@/lib/saju/shinsal'
import type { CalculateSajuDataResult } from '@/lib/saju/types'
import { logger } from '@/lib/logger'
import type { CounselorPerson } from './types'

const FALLBACK_TZ = 'Asia/Seoul'

// 천간합 (heavenly stem combinations) — pairs that "marry" and transform.
const STEM_COMBO: Record<string, { partner: string; into: string; label: string }> = {
  甲: { partner: '己', into: '土', label: '甲己合 化土' },
  己: { partner: '甲', into: '土', label: '甲己合 化土' },
  乙: { partner: '庚', into: '金', label: '乙庚合 化金' },
  庚: { partner: '乙', into: '金', label: '乙庚合 化金' },
  丙: { partner: '辛', into: '水', label: '丙辛合 化水' },
  辛: { partner: '丙', into: '水', label: '丙辛合 化水' },
  丁: { partner: '壬', into: '木', label: '丁壬合 化木' },
  壬: { partner: '丁', into: '木', label: '丁壬合 化木' },
  戊: { partner: '癸', into: '火', label: '戊癸合 化火' },
  癸: { partner: '戊', into: '火', label: '戊癸合 化火' },
}

// 지지육합 (branch six combinations)
const BRANCH_SIX_COMBO: Record<string, { partner: string; into: string; label: string }> = {
  子: { partner: '丑', into: '土', label: '子丑合 土' },
  丑: { partner: '子', into: '土', label: '子丑合 土' },
  寅: { partner: '亥', into: '木', label: '寅亥合 木' },
  亥: { partner: '寅', into: '木', label: '寅亥合 木' },
  卯: { partner: '戌', into: '火', label: '卯戌合 火' },
  戌: { partner: '卯', into: '火', label: '卯戌合 火' },
  辰: { partner: '酉', into: '金', label: '辰酉合 金' },
  酉: { partner: '辰', into: '金', label: '辰酉合 金' },
  巳: { partner: '申', into: '水', label: '巳申合 水' },
  申: { partner: '巳', into: '水', label: '巳申合 水' },
  午: { partner: '未', into: '火', label: '午未合 火' },
  未: { partner: '午', into: '火', label: '午未合 火' },
}

// 지지충 (branch oppositions)
const BRANCH_CHUNG: Record<string, string> = {
  子: '午',
  午: '子',
  丑: '未',
  未: '丑',
  寅: '申',
  申: '寅',
  卯: '酉',
  酉: '卯',
  辰: '戌',
  戌: '辰',
  巳: '亥',
  亥: '巳',
}

// 지지형/파/해 (subset — most diagnostic ones)
const BRANCH_HYUNG: Record<string, string[]> = {
  寅: ['巳', '申'],
  巳: ['寅', '申'],
  申: ['寅', '巳'],
  丑: ['戌', '未'],
  戌: ['丑', '未'],
  未: ['丑', '戌'],
  子: ['卯'],
  卯: ['子'],
}

function yinYangFromStem(stem: string): '양' | '음' {
  return '甲丙戊庚壬'.includes(stem) ? '양' : '음'
}

function elementHanFromKorean(el: string): string {
  const map: Record<string, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }
  return map[el] || el
}

interface PersonSajuRaw {
  result: CalculateSajuDataResult
  shinsals: ShinsalHit[]
}

async function loadSajuRaw(p: CounselorPerson): Promise<PersonSajuRaw | null> {
  try {
    const tz = p.tzId || FALLBACK_TZ
    const time = p.birthTime || '00:00'
    const result = calculateSajuData(p.birthDate, time, p.gender, 'solar', tz)
    const pillarsLike = toSajuPillarsLike({
      yearPillar: {
        heavenlyStem: {
          name: result.yearPillar.heavenlyStem.name,
          element: result.yearPillar.heavenlyStem.element,
        },
        earthlyBranch: {
          name: result.yearPillar.earthlyBranch.name,
          element: result.yearPillar.earthlyBranch.element,
        },
      },
      monthPillar: {
        heavenlyStem: {
          name: result.monthPillar.heavenlyStem.name,
          element: result.monthPillar.heavenlyStem.element,
        },
        earthlyBranch: {
          name: result.monthPillar.earthlyBranch.name,
          element: result.monthPillar.earthlyBranch.element,
        },
      },
      dayPillar: {
        heavenlyStem: {
          name: result.dayPillar.heavenlyStem.name,
          element: result.dayPillar.heavenlyStem.element,
        },
        earthlyBranch: {
          name: result.dayPillar.earthlyBranch.name,
          element: result.dayPillar.earthlyBranch.element,
        },
      },
      timePillar: {
        heavenlyStem: {
          name: result.timePillar.heavenlyStem.name,
          element: result.timePillar.heavenlyStem.element,
        },
        earthlyBranch: {
          name: result.timePillar.earthlyBranch.name,
          element: result.timePillar.earthlyBranch.element,
        },
      },
    })
    const shinsals = getShinsalHits(pillarsLike).slice(0, 6)
    return { result, shinsals }
  } catch (err) {
    logger.warn('[counselor] saju load failed', err)
    return null
  }
}

function formatPersonBlock(name: string, raw: PersonSajuRaw): string {
  const { result, shinsals } = raw
  const y = result.yearPillar
  const m = result.monthPillar
  const d = result.dayPillar
  const t = result.timePillar
  const dm = result.dayMaster
  const dmYin = dm.yin_yang === '양' ? 'Yang' : 'Yin'
  const dmElement = elementHanFromKorean(dm.element)

  const pillars = `${y.heavenlyStem.name}${y.earthlyBranch.name} ${m.heavenlyStem.name}${m.earthlyBranch.name} ${d.heavenlyStem.name}${d.earthlyBranch.name} ${t.heavenlyStem.name}${t.earthlyBranch.name}`

  const elems = result.fiveElements
  const elemLine = `Wood ${elems.wood} · Fire ${elems.fire} · Earth ${elems.earth} · Metal ${elems.metal} · Water ${elems.water}`

  // Ten gods relative to day master — from each pillar's stem sibsin
  const sibsinLines: string[] = []
  if (y.heavenlyStem.sibsin) {
    sibsinLines.push(`    Year stem ${y.heavenlyStem.name}: ${y.heavenlyStem.sibsin}`)
  }
  if (m.heavenlyStem.sibsin) {
    sibsinLines.push(`    Month stem ${m.heavenlyStem.name}: ${m.heavenlyStem.sibsin}`)
  }
  if (t.heavenlyStem.sibsin) {
    sibsinLines.push(`    Hour stem ${t.heavenlyStem.name}: ${t.heavenlyStem.sibsin}`)
  }

  // 신살 — group by pillar for readability
  const shinsalByPillar: Record<string, string[]> = { year: [], month: [], day: [], time: [] }
  for (const hit of shinsals) {
    for (const p of hit.pillars) {
      shinsalByPillar[p]?.push(hit.kind)
    }
  }
  const shinsalLine = Object.entries(shinsalByPillar)
    .filter(([, list]) => list.length > 0)
    .map(([pillar, list]) => {
      const pillarKo: Record<string, string> = {
        year: '년',
        month: '월',
        day: '일',
        time: '시',
      }
      return `${pillarKo[pillar]}: ${list.slice(0, 3).join(', ')}`
    })
    .join(' | ')

  // 대운 current — trust the engine's `current`, otherwise fall back to the
  // first entry of the list (best-effort when current isn't computed).
  const currentDaeun = pickCurrentDaeun(result)
  const daeunLine = currentDaeun
    ? `${currentDaeun.heavenlyStem}${currentDaeun.earthlyBranch} (${currentDaeun.age}세~)`
    : '-'

  // 세운 this year
  const thisYear = new Date().getFullYear()
  const annualHit = result.unse.annual?.find((a) => a.year === thisYear)
  const annualLine = annualHit ? `${annualHit.ganji || '-'} (${thisYear})` : `-  (${thisYear})`

  return [
    `${name}:`,
    `  Pillars (Year-Month-Day-Hour): ${pillars}`,
    `  Day master: ${dm.name} (${dmYin} ${dmElement})`,
    `  Elements: ${elemLine}`,
    `  Ten gods:`,
    ...sibsinLines,
    shinsalLine ? `  Shinsals: ${shinsalLine}` : '  Shinsals: -',
    `  Current major period (대운): ${daeunLine}`,
    `  This year (세운): ${annualLine}`,
  ].join('\n')
}

function pickCurrentDaeun(
  result: CalculateSajuDataResult
): { age: number; heavenlyStem: string; earthlyBranch: string } | null {
  const current = result.daeWoon?.current
  if (current) {
    return {
      age: current.age,
      heavenlyStem: current.heavenlyStem,
      earthlyBranch: current.earthlyBranch,
    }
  }
  const list = result.daeWoon?.list || []
  if (list.length === 0) return null
  return {
    age: list[0].age,
    heavenlyStem: list[0].heavenlyStem,
    earthlyBranch: list[0].earthlyBranch,
  }
}

function formatPairInteractions(rawA: PersonSajuRaw, rawB: PersonSajuRaw): string {
  const aStem = rawA.result.dayPillar.heavenlyStem.name
  const bStem = rawB.result.dayPillar.heavenlyStem.name
  const aBranch = rawA.result.dayPillar.earthlyBranch.name
  const bBranch = rawB.result.dayPillar.earthlyBranch.name
  const aYearB = rawA.result.yearPillar.earthlyBranch.name
  const bYearB = rawB.result.yearPillar.earthlyBranch.name
  const aMonthB = rawA.result.monthPillar.earthlyBranch.name
  const bMonthB = rawB.result.monthPillar.earthlyBranch.name
  const aHourB = rawA.result.timePillar.earthlyBranch.name
  const bHourB = rawB.result.timePillar.earthlyBranch.name

  const lines: string[] = []

  // Day master pair
  const stemCombo = STEM_COMBO[aStem]
  if (stemCombo && stemCombo.partner === bStem) {
    lines.push(
      `Day master pair: ${aStem} (${yinYangFromStem(aStem)} ${elementHanFromKorean(rawA.result.dayMaster.element)}) × ${bStem} (${yinYangFromStem(bStem)} ${elementHanFromKorean(rawB.result.dayMaster.element)})`
    )
    lines.push(`  → ${stemCombo.label} — 합화 ${stemCombo.into}. 강한 결합 신호.`)
  } else {
    lines.push(`Day master pair: ${aStem} × ${bStem} — 직접 합 없음.`)
  }

  // Day branch
  lines.push(...formatBranchPair('Day branch pair', aBranch, bBranch))
  lines.push(...formatBranchPair('Year branch', aYearB, bYearB))
  lines.push(...formatBranchPair('Month branch', aMonthB, bMonthB))
  lines.push(...formatBranchPair('Hour branch', aHourB, bHourB))

  // Element mix combined
  const ea = rawA.result.fiveElements
  const eb = rawB.result.fiveElements
  lines.push('')
  lines.push(
    `Element mix combined: Wood ${ea.wood + eb.wood} · Fire ${ea.fire + eb.fire} · Earth ${ea.earth + eb.earth} · Metal ${ea.metal + eb.metal} · Water ${ea.water + eb.water}`
  )

  return lines.join('\n')
}

function formatBranchPair(label: string, a: string, b: string): string[] {
  const combo = BRANCH_SIX_COMBO[a]
  if (combo && combo.partner === b) {
    return [`${label}: ${a} × ${b} → ${combo.label}`]
  }
  if (BRANCH_CHUNG[a] === b) {
    return [`${label}: ${a} × ${b} → ${a}${b} 충 (팽팽함)`]
  }
  if (BRANCH_HYUNG[a]?.includes(b)) {
    return [`${label}: ${a} × ${b} → ${a}${b} 형 (어긋남 주의)`]
  }
  return [`${label}: ${a} × ${b} — 직접 합·충 없음.`]
}

export async function formatSajuBlock(
  personA: CounselorPerson,
  personB: CounselorPerson
): Promise<string> {
  const [rawA, rawB] = await Promise.all([loadSajuRaw(personA), loadSajuRaw(personB)])
  if (!rawA || !rawB) {
    return '(사주 데이터 계산에 실패했어요. 출생 정보를 다시 확인해 주세요.)'
  }
  const blocks: string[] = []
  blocks.push(formatPersonBlock(personA.name, rawA))
  blocks.push('')
  blocks.push(formatPersonBlock(personB.name, rawB))
  blocks.push('')
  blocks.push('— Pair Interactions (사주 궁합) —')
  blocks.push('')
  blocks.push(formatPairInteractions(rawA, rawB))
  return blocks.join('\n')
}

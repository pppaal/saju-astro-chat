// Saju/sajuLayers.ts
// 사주 엔진 — 특정 날짜·시간의 모든 타이밍 layer 를 한 번에 반환.
//
// fusion adapter (forCalendar 등) 가 raw 계산 함수를 직접 호출하는 대신,
// 이 파일을 통해 "그 날·그 시각의 사주 layer 들"을 받아 쓰도록 한다.
//
// natal 4기둥 + 대운 list 는 calculateSajuData() 에서 받아 별도로 들고 있고,
// 이 함수는 그것을 입력으로 받아 그 시점의 layer 들을 계산한다.

import { getIljinCalendar, getMonthlyCycles } from './foundation/unse'
import { getYearPillarForDate } from './foundation/datePillars'
import { STEMS, TIME_STEM_LOOKUP } from './foundation/constants'
import { getTimeBranchFromHour } from './foundation/validation'
import { analyzeDailySaju } from './timing/daily'
import { analyzeMonthlySaju } from './timing/monthly'
import { analyzeHourlySaju } from './timing/hourly'
import type { DayMaster, IljinData, WolunData, SajuPillarsInput } from './foundation/types'
import type { SajuTimingAnalysis, SajuTimingHighlight } from './timing/types'
import type { SimpleSajuPillars } from './themes/types'
// 정통 사주 분석 — 기존 foundation 파일들
import { determineGeokguk, type GeokgukResult } from './foundation/geokguk'
import { determineYongsin, type YongsinResult } from './foundation/yongsin'
import { evaluateJohuNeed, getJohuYongsin, type JohuYongsinInfo } from './foundation/johuYongsin'
import { calculateTonggeun, type TonggeunResult } from './foundation/tonggeun'
import { analyzeUnseInteraction } from './foundation/hyeongchung'
import { analyzeGongmang } from '@/lib/timing/ultra-precision-daily'
// 통합 정통 분석 — 강약+격국+용신 통합 + 용신 기준 운기 평가
import { analyzeAdvancedSaju, evaluateElementInfluence, type AdvancedSajuAnalysis, type YongsinAnalysis } from './foundation/advancedSajuAnalysis'
import { BRANCHES } from './foundation/constants'
import type { FiveElement } from './foundation/types'

const STEM_NAMES = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const BRANCH_NAMES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

export interface SajuLayersInput {
  /** 일간 (예: '辛') */
  dayMaster: string
  /** 본명 4기둥 — 격국/용신/조후/통근/형충회합/공망 산출에 사용 */
  natalPillars?: SimpleSajuPillars
  /** 그 사람 대운 list (calculateSajuData 결과의 daeWoon.list) */
  daeunList?: Array<{ stem: string; branch: string; startAge: number }>
  /** 출생년도 (세운 계산용) */
  birthYear?: number
  /** 그 시점 만나이 */
  age?: number
  /** 목표 시점 */
  year: number
  month: number      // 1-12
  day?: number       // 1-31, 미지정 시 day/hourly 미산출
  hour?: number      // 0-23, 미지정 시 hourly 미산출
}

/** 점성 mirror — 정통 사주 raw 분석 결과 (점수 계산기·UI 가 받아씀) */
export interface SajuLayersRaw {
  /** 그 날 일진 raw */
  iljinRaw?: IljinData
  /** 그 시각 시주 raw */
  hourPillar?: { stem: string; branch: string }
  /** 격국 (natal once) */
  geokguk?: GeokgukResult
  /** 용신 (natal once) */
  yongsin?: YongsinResult
  /** 조후용신 (natal once) */
  johu?: { yongsin: JohuYongsinInfo | null; need: ReturnType<typeof evaluateJohuNeed> }
  /** 일간 통근 (natal once) */
  tonggeun?: TonggeunResult
  /** 그 날 일진 ↔ 본명 형충회합 hits */
  hyeongchung?: ReturnType<typeof analyzeUnseInteraction>
  /** 그 날 일진이 본명 일주의 공망인가 */
  gongmang?: ReturnType<typeof analyzeGongmang>
  /** 통합 분석 — 강약+격국+용신 (context-aware tone 산출용) */
  advanced?: AdvancedSajuAnalysis
}

export interface SajuLayersBundle {
  decadal?: SajuTimingAnalysis    // 대운 (10년)
  yearly?: SajuTimingAnalysis     // 세운 (1년)
  monthly?: SajuTimingAnalysis    // 월운 (1개월)
  daily?: SajuTimingAnalysis      // 일진 (1일) — day 지정 시
  hourly?: SajuTimingAnalysis     // 시진 (1시간) — hour 지정 시
  /** natal+per-day raw analysis (점수·UI 가 받아씀) — 점성 raw 와 mirror */
  raw: SajuLayersRaw
  /** @deprecated raw.iljinRaw 사용. back-compat 만 유지. */
  iljinRaw?: IljinData
  /** @deprecated raw.hourPillar 사용. back-compat 만 유지. */
  hourPillar?: { stem: string; branch: string }
}

function getDayMasterObj(stemName: string): DayMaster | null {
  const found = STEMS.find((s) => s.name === stemName)
  return found ? (found as DayMaster) : null
}

function calcHourPillar(dayStem: string, hour: number): { stem: string; branch: string } | null {
  const firstHourStem = TIME_STEM_LOOKUP[dayStem]
  if (!firstHourStem) return null
  const branch = getTimeBranchFromHour(hour)
  const branchIdx = BRANCH_NAMES.indexOf(branch)
  const stemStartIdx = STEM_NAMES.indexOf(firstHourStem)
  if (stemStartIdx < 0 || branchIdx < 0) return null
  return { stem: STEM_NAMES[(stemStartIdx + branchIdx) % 10], branch }
}

/**
 * 그 시점의 사주 모든 layer 를 한 번에 반환.
 *
 * 호출 예:
 *   getSajuLayersForDate({
 *     dayMaster: '辛', daeunList, birthYear: 1995, age: 31,
 *     year: 2026, month: 5, day: 15, hour: 12,
 *   })
 */
/** SimpleSajuPillars (hour) → SajuPillarsInput (time) */
function toFullPillars(p: SimpleSajuPillars): SajuPillarsInput {
  return {
    year:  p.year,
    month: p.month,
    day:   p.day,
    time:  p.hour,
  }
}

/** tone 변환 — TonggeunResult.deukryeongScore 등 점수 → SajuTimingTone */
function scoreToTone(score: number, neutralBand = 0.2): SajuTimingHighlight['tone'] {
  if (score > neutralBand) return 'positive'
  if (score < -neutralBand) return 'cautious'
  return 'neutral'
}

/** 본명 용신 기준 element 가 길/흉 — context-aware. */
function elementRoleTone(element: FiveElement, yongsin: YongsinAnalysis): { role: string; tone: SajuTimingHighlight['tone'] } {
  const role = evaluateElementInfluence(element, yongsin)
  const tone: SajuTimingHighlight['tone'] =
    role === '용신' || role === '희신' ? 'positive' :
    role === '기신' || role === '구신' ? 'cautious' :
    'neutral'
  return { role, tone }
}

function getStemEl(name: string): FiveElement | null {
  return STEMS.find((s) => s.name === name)?.element ?? null
}
function getBranchEl(name: string): FiveElement | null {
  return BRANCHES.find((b) => b.name === name)?.element ?? null
}

/** SimpleSajuPillars → advancedSajuAnalysis pillars input */
function toAdvancedPillars(p: SimpleSajuPillars) {
  const make = (stemName: string, branchName: string) => {
    const stemEl = getStemEl(stemName)
    const branchEl = getBranchEl(branchName)
    if (!stemEl || !branchEl) return null
    return {
      heavenlyStem: { name: stemName, element: stemEl },
      earthlyBranch: { name: branchName, element: branchEl },
    }
  }
  const yp = make(p.year.stem,  p.year.branch)
  const mp = make(p.month.stem, p.month.branch)
  const dp = make(p.day.stem,   p.day.branch)
  const hp = make(p.hour.stem,  p.hour.branch)
  if (!yp || !mp || !dp || !hp) return null
  return { yearPillar: yp, monthPillar: mp, dayPillar: dp, timePillar: hp }
}

export function getSajuLayersForDate(input: SajuLayersInput): SajuLayersBundle {
  const bundle: SajuLayersBundle = { raw: {} }
  const dm = getDayMasterObj(input.dayMaster)
  if (!dm) return bundle

  // ============================================================
  // natal-once 정통 분석 — 격국 / 용신 / 조후 / 통근
  // ============================================================
  const natalHighlights: SajuTimingHighlight[] = []
  if (input.natalPillars) {
    const fullPillars = toFullPillars(input.natalPillars)
    // ── 통합 정통 분석 (강약 + 격국 + 용신 — context-aware tone 산출의 핵심) ──
    try {
      const advPillars = toAdvancedPillars(input.natalPillars)
      if (advPillars && dm) {
        const adv = analyzeAdvancedSaju(dm, advPillars)
        bundle.raw.advanced = adv
        natalHighlights.push({
          source: `일간 강약: ${adv.strength.level} (점수 ${adv.strength.score})`,
          meaning: `돕는 힘 ${adv.strength.helpingScore}, 빼는 힘 ${adv.strength.drainingScore}`,
          tone: adv.strength.level === '중화' ? 'positive'
              : (adv.strength.level === '극신강' || adv.strength.level === '극신약') ? 'cautious'
              : 'neutral',
        })
      }
    } catch { /* skip */ }
    try {
      const geokguk = determineGeokguk(fullPillars)
      bundle.raw.geokguk = geokguk
      const confHigh = geokguk.confidence === 'high'
      natalHighlights.push({
        source: `격국: ${geokguk.primary} (${geokguk.category})`,
        meaning: `${geokguk.description?.slice(0, 80) ?? ''} (확신도 ${geokguk.confidence})`,
        tone: confHigh ? 'positive' : 'neutral',
      })
    } catch { /* skip */ }
    try {
      const yongsin = determineYongsin(fullPillars)
      bundle.raw.yongsin = yongsin
      natalHighlights.push({
        source: `용신: ${yongsin.primaryYongsin} (${yongsin.yongsinType})`,
        meaning: `용신 ${yongsin.primaryYongsin} — ${yongsin.reasoning?.slice(0, 60) ?? ''}`,
        tone: 'neutral',  // 용신 자체는 중립, 그 운기가 들어올 때 +
      })
    } catch { /* skip */ }
    try {
      const johuInfo = getJohuYongsin(input.dayMaster, input.natalPillars.month.branch)
      const johuNeed = evaluateJohuNeed(input.dayMaster, input.natalPillars.month.branch)
      bundle.raw.johu = { yongsin: johuInfo, need: johuNeed }
      if (johuInfo) {
        natalHighlights.push({
          source: `조후: ${johuInfo.primaryYongsin}`,
          meaning: `${johuInfo.climate} 기후 — 조후용신 ${johuInfo.primaryYongsin} (필요도 ${johuInfo.rating}/5)`,
          tone: johuNeed.urgent ? 'cautious' : 'neutral',
        })
      }
    } catch { /* skip */ }
    try {
      const tonggeun = calculateTonggeun(input.dayMaster, fullPillars)
      bundle.raw.tonggeun = tonggeun
      const totalStrength = tonggeun.roots.reduce((sum, r) => sum + r.strength, 0)
      natalHighlights.push({
        source: `통근: 뿌리 ${tonggeun.roots.length}개`,
        meaning: `일간 ${input.dayMaster} 통근 — ${tonggeun.roots.map(r => r.pillar).join('/')} (총 ${totalStrength.toFixed(0)})`,
        tone: scoreToTone(totalStrength / 100),
      })
    } catch { /* skip */ }
  }

  // 대운 (decadal) — daeunList + age 제공 시 활성 period
  // + natal-once 정통 분석 (격국·용신·조후·통근) 도 여기 highlights 에 합침
  // (대운 = 평생 backdrop, natal 분석도 평생 backdrop 이므로 같이 묶음)
  if (input.daeunList && input.age != null) {
    const active = input.daeunList.find(
      (d) => input.age! >= d.startAge && input.age! < d.startAge + 10,
    )
    if (active) {
      // 용신 기준 대운 element 평가 (context-aware)
      const yongsinAna = bundle.raw.advanced?.yongsin
      const stemEl = getStemEl(active.stem)
      const branchEl = getBranchEl(active.branch)
      const ctxHighlights: SajuTimingHighlight[] = []
      if (yongsinAna && stemEl) {
        const r = elementRoleTone(stemEl, yongsinAna)
        ctxHighlights.push({
          source: `대운 천간 ${active.stem}(${stemEl}) — ${r.role}`,
          meaning: `본명 용신 기준: ${r.role} (${r.tone})`,
          tone: r.tone,
        })
      }
      if (yongsinAna && branchEl) {
        const r = elementRoleTone(branchEl, yongsinAna)
        ctxHighlights.push({
          source: `대운 지지 ${active.branch}(${branchEl}) — ${r.role}`,
          meaning: `본명 용신 기준: ${r.role} (${r.tone})`,
          tone: r.tone,
        })
      }
      bundle.decadal = {
        unit: 'decadal',
        periodLabel: `대운 ${active.stem}${active.branch} (age ${active.startAge}-${active.startAge + 9})`,
        highlights: [
          {
            source: `대운 ${active.stem}${active.branch}`,
            meaning: `${active.startAge}-${active.startAge + 9}세 대운 — ${active.stem}${active.branch} 10년 backdrop.`,
            tone: 'neutral',
          },
          ...ctxHighlights,
          ...natalHighlights,
        ],
        summary: `대운 ${active.stem}${active.branch} · 격국/용신/조후/통근 포함`,
      }
    }
  } else if (natalHighlights.length > 0) {
    // 대운 없어도 natal 분석은 decadal layer 로 노출
    bundle.decadal = {
      unit: 'decadal',
      periodLabel: '본명 정통 분석',
      highlights: natalHighlights,
      summary: '격국/용신/조후/통근',
    }
  }

  // 세운 (yearly) — 입춘 절기 boundary 정확 (KASI) + 용신 기준 context-aware
  if (input.birthYear != null) {
    try {
      const sampleDate = new Date(input.year, input.month - 1, input.day ?? 15)
      const yp = getYearPillarForDate(sampleDate)
      const yongsinAna = bundle.raw.advanced?.yongsin
      const ctxHl: SajuTimingHighlight[] = []
      const stemEl = getStemEl(yp.stem)
      const branchEl = getBranchEl(yp.branch)
      if (yongsinAna && stemEl) {
        const r = elementRoleTone(stemEl, yongsinAna)
        ctxHl.push({
          source: `세운 천간 ${yp.stem}(${stemEl}) — ${r.role}`,
          meaning: `본명 용신 기준: ${r.role}`,
          tone: r.tone,
        })
      }
      if (yongsinAna && branchEl) {
        const r = elementRoleTone(branchEl, yongsinAna)
        ctxHl.push({
          source: `세운 지지 ${yp.branch}(${branchEl}) — ${r.role}`,
          meaning: `본명 용신 기준: ${r.role}`,
          tone: r.tone,
        })
      }
      bundle.yearly = {
        unit: 'yearly',
        periodLabel: `세운 ${input.year} ${yp.stem}${yp.branch}`,
        highlights: [
          {
            source: `세운 ${yp.stem}${yp.branch}`,
            meaning: `${input.year}년 천간 ${yp.stem}, 지지 ${yp.branch} — 본명과 작용.`,
            tone: 'neutral',
          },
          ...ctxHl,
        ],
        summary: `${input.year} 세운 ${yp.stem}${yp.branch}`,
      }
    } catch { /* skip */ }
  }

  // 월운 (monthly)
  try {
    const monthCycles = getMonthlyCycles(input.year, dm) as WolunData[]
    const thisMonth = monthCycles.find((m) => m.month === input.month)
    if (thisMonth) {
      bundle.monthly = analyzeMonthlySaju({ month: thisMonth, dayMaster: input.dayMaster })
    }
  } catch { /* skip */ }

  // 일진 (daily) — day 제공 시
  // + natal 제공 시: 형충회합 (일진 ↔ 본명) + 공망 (일진이 본명 일주의 공망인지)
  if (input.day != null) {
    try {
      const iljins = getIljinCalendar(input.year, input.month, dm)
      const iljin = iljins.find((i) => i.day === input.day)
      if (iljin) {
        bundle.raw.iljinRaw = iljin
        bundle.iljinRaw = iljin   // back-compat
        bundle.daily = analyzeDailySaju({ iljin, dayMaster: input.dayMaster })

        // 형충회합·공망 + 용신 기준 일진 평가 — natalPillars 제공 시만
        if (input.natalPillars && bundle.daily) {
          const extraHighlights: SajuTimingHighlight[] = []
          // 용신 기준 일진 element 평가 (context-aware)
          const yongsinAna = bundle.raw.advanced?.yongsin
          if (yongsinAna) {
            const stemEl = getStemEl(iljin.heavenlyStem)
            const branchEl = getBranchEl(iljin.earthlyBranch)
            if (stemEl) {
              const r = elementRoleTone(stemEl, yongsinAna)
              extraHighlights.push({
                source: `일진 천간 ${iljin.heavenlyStem}(${stemEl}) — ${r.role}`,
                meaning: `본명 용신 기준: ${r.role}`,
                tone: r.tone,
              })
            }
            if (branchEl) {
              const r = elementRoleTone(branchEl, yongsinAna)
              extraHighlights.push({
                source: `일진 지지 ${iljin.earthlyBranch}(${branchEl}) — ${r.role}`,
                meaning: `본명 용신 기준: ${r.role}`,
                tone: r.tone,
              })
            }
          }
          // 형충회합: 일진 지지 가 본명 4지지와 작용
          try {
            const natalBranches = [
              input.natalPillars.year.branch,
              input.natalPillars.month.branch,
              input.natalPillars.day.branch,
              input.natalPillars.hour.branch,
            ]
            const interactions = analyzeUnseInteraction(natalBranches, [iljin.earthlyBranch])
            bundle.raw.hyeongchung = interactions
            // 합 = +, 충/형/해/파/원진 = -
            let totalScore = 0
            for (const it of interactions) {
              const positive = ['육합', '삼합', '반합', '방합'].includes(it.type)
              const contribution = (positive ? 1 : -1) * (it.strength / 100)
              totalScore += contribution
            }
            if (interactions.length > 0) {
              const summary = interactions.map(i => i.type).join('+')
              extraHighlights.push({
                source: `형충회합: ${summary}`,
                meaning: `일진 ${iljin.earthlyBranch} 가 본명과 ${summary} 작용 (점수 ${totalScore.toFixed(2)})`,
                tone: scoreToTone(totalScore),
              })
            }
          } catch { /* skip */ }
          // 공망: 본명 일주의 旬空 에 일진 지지가 걸리나
          try {
            const natalDay = input.natalPillars.day
            const gongmang = analyzeGongmang(natalDay.stem, natalDay.branch, iljin.earthlyBranch)
            bundle.raw.gongmang = gongmang
            const isEmpty = (gongmang as { isToday空?: boolean; isEmpty?: boolean }).isToday空
              ?? (gongmang as { isEmpty?: boolean }).isEmpty
              ?? false
            if (isEmpty) {
              extraHighlights.push({
                source: `공망: ${iljin.earthlyBranch}`,
                meaning: gongmang.advice ?? '공망일 — 해당 영역 신중',
                tone: 'cautious',
              })
            }
          } catch { /* skip */ }

          if (extraHighlights.length > 0) {
            bundle.daily = {
              ...bundle.daily,
              highlights: [...bundle.daily.highlights, ...extraHighlights],
            }
          }
        }
      }
    } catch { /* skip */ }
  }

  // 시진 (hourly) — hour 제공 시
  if (input.hour != null && input.day != null) {
    const hp = calcHourPillar(input.dayMaster, input.hour)
    if (hp) {
      bundle.raw.hourPillar = hp
      bundle.hourPillar = hp    // back-compat
      try {
        const dt = new Date(input.year, input.month - 1, input.day, input.hour, 0, 0)
        bundle.hourly = analyzeHourlySaju({ date: dt, hourPillar: hp, dayMaster: input.dayMaster })
      } catch { /* skip */ }
    }
  }

  return bundle
}

/**
 * 그 달의 모든 일진을 한 번에 가져오기 (월 캘린더용).
 * 30번 getIljinCalendar 호출 피하기 위한 batch 헬퍼.
 */
export function getSajuMonthDailyLayers(input: {
  dayMaster: string
  natalPillars?: SimpleSajuPillars   // 형충회합/공망 + 용신 context-aware 산출용
  year: number
  month: number
}): Map<string, { daily: SajuTimingAnalysis; iljinRaw: IljinData }> {
  const map = new Map<string, { daily: SajuTimingAnalysis; iljinRaw: IljinData }>()
  const dm = getDayMasterObj(input.dayMaster)
  if (!dm) return map
  const natalBranches = input.natalPillars ? [
    input.natalPillars.year.branch,
    input.natalPillars.month.branch,
    input.natalPillars.day.branch,
    input.natalPillars.hour.branch,
  ] : null
  // 본명 용신 — 30일 batch 의 일진마다 element 평가
  let yongsinAna: YongsinAnalysis | undefined
  if (input.natalPillars) {
    try {
      const advPillars = toAdvancedPillars(input.natalPillars)
      if (advPillars) yongsinAna = analyzeAdvancedSaju(dm, advPillars).yongsin
    } catch { /* skip */ }
  }
  try {
    const iljins = getIljinCalendar(input.year, input.month, dm)
    for (const iljin of iljins) {
      const date = `${iljin.year}-${String(iljin.month).padStart(2, '0')}-${String(iljin.day).padStart(2, '0')}`
      let daily = analyzeDailySaju({ iljin, dayMaster: input.dayMaster })

      // 형충회합 + 공망 + 용신 element 평가 — natal 있을 때만
      if (input.natalPillars && natalBranches) {
        const extras: SajuTimingHighlight[] = []
        // 용신 기준 일진 element (context-aware)
        if (yongsinAna) {
          const stemEl = getStemEl(iljin.heavenlyStem)
          const branchEl = getBranchEl(iljin.earthlyBranch)
          if (stemEl) {
            const r = elementRoleTone(stemEl, yongsinAna)
            extras.push({
              source: `일진 천간 ${iljin.heavenlyStem}(${stemEl}) — ${r.role}`,
              meaning: `용신 기준: ${r.role}`,
              tone: r.tone,
            })
          }
          if (branchEl) {
            const r = elementRoleTone(branchEl, yongsinAna)
            extras.push({
              source: `일진 지지 ${iljin.earthlyBranch}(${branchEl}) — ${r.role}`,
              meaning: `용신 기준: ${r.role}`,
              tone: r.tone,
            })
          }
        }
        try {
          const interactions = analyzeUnseInteraction(natalBranches, [iljin.earthlyBranch])
          if (interactions.length > 0) {
            let total = 0
            for (const it of interactions) {
              const pos = ['육합', '삼합', '반합', '방합'].includes(it.type)
              total += (pos ? 1 : -1) * (it.strength / 100)
            }
            extras.push({
              source: `형충회합: ${interactions.map(i => i.type).join('+')}`,
              meaning: `일진 ${iljin.earthlyBranch} 본명과 작용 (${total.toFixed(2)})`,
              tone: scoreToTone(total),
            })
          }
        } catch { /* skip */ }
        try {
          const natalDay = input.natalPillars.day
          const gm = analyzeGongmang(natalDay.stem, natalDay.branch, iljin.earthlyBranch)
          const isEmpty = (gm as { isToday空?: boolean; isEmpty?: boolean }).isToday空
            ?? (gm as { isEmpty?: boolean }).isEmpty
            ?? false
          if (isEmpty) {
            extras.push({
              source: `공망: ${iljin.earthlyBranch}`,
              meaning: gm.advice ?? '공망일 — 신중',
              tone: 'cautious',
            })
          }
        } catch { /* skip */ }
        if (extras.length > 0) {
          daily = { ...daily, highlights: [...daily.highlights, ...extras] }
        }
      }

      map.set(date, { daily, iljinRaw: iljin })
    }
  } catch { /* skip */ }
  return map
}

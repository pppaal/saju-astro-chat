// @ts-nocheck
/**
 * 1995-02-09 06:40 male Seoul — 풀 narration 캡처.
 */

import { calculateSajuData } from '../src/lib/saju/saju'
import { determineGeokguk } from '../src/lib/saju/geokguk'
import {
  getShinsalHits,
  getTwelveStagesForPillars,
  toSajuPillarsLike,
  getTwelveStage,
} from '../src/lib/saju/shinsal'
import { analyzeRelations, toAnalyzeInputFromSaju } from '../src/lib/saju/relations'
import {
  synthesizeExpertNarrationKo,
  buildSajuNarrationKo,
  buildTimingNarrationKo,
  buildStoryArcKo,
  buildNatalRelationKo,
} from '../src/lib/matrix/ai-report/sajuNarrationBridge'
import { buildPersonalityNarrationKo } from '../src/lib/matrix/personality'

const PROFILE = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  timezone: 'Asia/Seoul',
  currentDate: '2026-04-30',
}

async function main(): Promise<void> {
  const saju = calculateSajuData(
    PROFILE.birthDate,
    PROFILE.birthTime,
    PROFILE.gender,
    'solar',
    PROFILE.timezone
  )

  // sibsin 분포 — 4기둥 천간/지지에서 추출
  const sibsinDistribution: Record<string, number> = {}
  for (const pName of ['year', 'month', 'day', 'time']) {
    const p = saju.pillars?.[pName]
    if (!p) continue
    if (p.heavenlyStem?.sibsin) {
      sibsinDistribution[p.heavenlyStem.sibsin] = (sibsinDistribution[p.heavenlyStem.sibsin] || 0) + 1
    }
    if (p.earthlyBranch?.sibsin) {
      sibsinDistribution[p.earthlyBranch.sibsin] = (sibsinDistribution[p.earthlyBranch.sibsin] || 0) + 1
    }
  }

  // 12운성 — 일간 기준
  const dayStem = saju.pillars?.day?.heavenlyStem?.name
  const twelveStagesDist: Record<string, number> = {}
  for (const pName of ['year', 'month', 'day', 'time']) {
    const p = saju.pillars?.[pName]
    if (!p?.earthlyBranch?.name || !dayStem) continue
    const stage = getTwelveStage(dayStem, p.earthlyBranch.name)
    if (stage) twelveStagesDist[stage] = (twelveStagesDist[stage] || 0) + 1
  }

  // 격국
  let geokgukName: string | undefined
  try {
    const pillarsSimple: any = {
      year: { stem: saju.pillars.year.heavenlyStem.name, branch: saju.pillars.year.earthlyBranch.name },
      month: { stem: saju.pillars.month.heavenlyStem.name, branch: saju.pillars.month.earthlyBranch.name },
      day: { stem: saju.pillars.day.heavenlyStem.name, branch: saju.pillars.day.earthlyBranch.name },
      time: saju.pillars.time ? { stem: saju.pillars.time.heavenlyStem?.name, branch: saju.pillars.time.earthlyBranch?.name } : undefined,
    }
    const geokRes = determineGeokguk(pillarsSimple)
    geokgukName = geokRes?.primary || geokRes?.name
  } catch (e) {
    console.error('geokguk error:', (e as Error).message)
  }

  // 신살 — toSajuPillarsLike는 yearPillar/monthPillar/dayPillar/timePillar 형태 요구
  let shinsalList: string[] = []
  try {
    const sajuLike = toSajuPillarsLike({
      yearPillar: saju.yearPillar || saju.pillars.year,
      monthPillar: saju.monthPillar || saju.pillars.month,
      dayPillar: saju.dayPillar || saju.pillars.day,
      timePillar: saju.timePillar || saju.pillars.time,
    } as any)
    const hits = getShinsalHits(sajuLike, {
      includeLucky: true,
      includeUnlucky: true,
      includeTwelveAll: true,
      includeGeneralShinsal: true,
      includeLuckyDetails: true,
      ruleSet: 'your',
    })
    shinsalList = hits.map((h: any) => h.kind).filter(Boolean)
  } catch (e) {
    console.error('shinsal error:', (e as Error).message)
  }

  // 관계
  let relations: any[] = []
  try {
    const relInput = toAnalyzeInputFromSaju(saju as any)
    relations = analyzeRelations(relInput)
  } catch {}

  console.log('━━━ 입력 컨텍스트 (1995-02-09 06:40 남자, 서울) ━━━')
  console.log(`일간: ${saju.dayMaster?.name} (${saju.dayMaster?.element})`)
  console.log(`사주: ${saju.pillars.year.heavenlyStem.name}${saju.pillars.year.earthlyBranch.name} ${saju.pillars.month.heavenlyStem.name}${saju.pillars.month.earthlyBranch.name} ${saju.pillars.day.heavenlyStem.name}${saju.pillars.day.earthlyBranch.name} ${saju.pillars.hour?.heavenlyStem?.name || '?'}${saju.pillars.hour?.earthlyBranch?.name || '?'}`)
  console.log(`격국: ${geokgukName || '(미산출)'}`)
  console.log(`12운성 분포: ${JSON.stringify(twelveStagesDist)}`)
  console.log(`십신 분포: ${JSON.stringify(sibsinDistribution)}`)
  console.log(`신살: ${shinsalList.slice(0, 8).join(', ')}`)
  console.log(`관계 ${relations.length}건: ${relations.slice(0, 5).map((r: any) => `${r.kind}${r.detail ? `(${r.detail})` : ''}`).join(', ')}`)
  console.log(`현재 대운: ${saju.daeWoon?.current?.heavenlyStem}${saju.daeWoon?.current?.earthlyBranch} (${saju.daeWoon?.current?.age}세 시작, ${saju.daeWoon?.current?.element})`)
  console.log()

  // Stem → element 폴백 (Saju 라이브러리가 currentDaeun에 element를 못 채우는 경우 대비)
  const STEM_EL: Record<string, string> = {
    甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
    己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
  }
  const deriveEl = (stem?: string) => (stem ? STEM_EL[stem] : undefined)
  const daeunStem = saju.daeWoon?.current?.heavenlyStem
  const currentYearGanji: string | undefined = saju.unse?.annual?.find?.((r: any) => r.year === 2026)?.ganji
  const saeunStem = currentYearGanji ? currentYearGanji[0] : undefined

  const matrixInput: any = {
    sajuSnapshot: {
      ...saju,
      pillars: saju.pillars,
      daeWoon: saju.daeWoon,
      unse: saju.unse,
      birthYear: Number(PROFILE.birthDate.slice(0, 4)),
    },
    geokguk: geokgukName,
    twelveStages: twelveStagesDist,
    sibsinDistribution,
    shinsalList,
    relations,
    dayMasterElement: saju.dayMaster?.element,
    currentDaeunElement: saju.daeWoon?.current?.element || deriveEl(daeunStem),
    currentSaeunElement: saju.unse?.current?.element || saju.unse?.year?.element || deriveEl(saeunStem),
    currentWolunElement: saju.unse?.month?.element,
    currentIljinElement: saju.unse?.day?.element,
    planetSigns: {
      Sun: 'Aquarius',
      Moon: 'Gemini',
      Mercury: 'Aquarius',
      Venus: 'Capricorn',
      Mars: 'Sagittarius',
      Jupiter: 'Sagittarius',
      Saturn: 'Pisces',
    },
    planetHouses: {
      Sun: 12, Moon: 4, Mercury: 12, Venus: 11, Mars: 9, Jupiter: 9, Saturn: 1,
    },
    aspects: [
      { p1: 'Sun', p2: 'Mars', type: 'trine' },
      { p1: 'Moon', p2: 'Venus', type: 'square' },
      { p1: 'Mercury', p2: 'Saturn', type: 'opposition' },
    ],
    dominantWesternElement: 'fire',
    // 2026-04-30 기준 활성 transit (1995-02-09 출생 31세 — 토성 리턴 막바지 가능)
    activeTransits: ['saturnReturn', 'mercuryRetrograde'],
    currentDateIso: PROFILE.currentDate,
  }

  const sections: Array<[string, () => string]> = [
    ['¶ synthesizeExpertNarrationKo (전문가 풀 본명)', () => synthesizeExpertNarrationKo(matrixInput)],
    ['¶ buildSajuNarrationKo (사주 단독)', () => buildSajuNarrationKo(matrixInput)],
    ['¶ buildTimingNarrationKo (대운/세운/월운/일운)', () => buildTimingNarrationKo(matrixInput)],
    ['¶ buildStoryArcKo (시계열 스토리)', () => buildStoryArcKo(matrixInput)],
    ['¶ buildNatalRelationKo (본명 specific 관계)', () => buildNatalRelationKo(matrixInput)],
    ['¶ buildPersonalityNarrationKo (개인화 인격)', () => buildPersonalityNarrationKo(matrixInput)],
  ]

  for (const [label, fn] of sections) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(label)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    try {
      const out = fn() || '(빈 출력)'
      console.log(out)
    } catch (e) {
      console.log(`(에러: ${(e as Error).message})`)
    }
    console.log()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

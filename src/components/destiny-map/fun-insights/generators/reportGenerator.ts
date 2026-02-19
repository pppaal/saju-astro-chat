import { elementTraits, dayMasterData, zodiacData, tianGanMap } from '../data'
import { findPlanetSign } from '../utils'

interface SajuData {
  dayMaster?: { name?: string; heavenlyStem?: string; element?: string }
  fiveElements?: Record<string, number>
  [key: string]: unknown
}

interface AstroData {
  planets?: Array<{ name?: string; sign?: string; house?: number; longitude?: number }>
  [key: string]: unknown
}

const reportCache = new Map<string, string>()

export function generateReport(saju: unknown, astro: unknown, lang: string, theme: string): string {
  const sajuData = saju as SajuData | undefined
  const astroData = astro as AstroData | undefined

  const cacheKey = JSON.stringify({
    dayMaster: sajuData?.dayMaster?.name,
    fiveElements: sajuData?.fiveElements,
    sun: findPlanetSign(astroData, 'sun'),
    moon: findPlanetSign(astroData, 'moon'),
    lang,
    theme,
  })

  if (reportCache.has(cacheKey)) {
    return reportCache.get(cacheKey)!
  }

  const isKo = lang === 'ko'

  const rawDayMasterName = sajuData?.dayMaster?.name || sajuData?.dayMaster?.heavenlyStem
  const dayMasterName = rawDayMasterName ? tianGanMap[rawDayMasterName] || rawDayMasterName : null
  const dayMasterInfo = dayMasterName ? dayMasterData[dayMasterName] : null

  const sunSign = findPlanetSign(astroData, 'sun')
  const moonSign = findPlanetSign(astroData, 'moon')
  const sunData = sunSign ? zodiacData[sunSign] : null
  const moonData = moonSign ? zodiacData[moonSign] : null

  const fiveElements = sajuData?.fiveElements || {}
  const sorted = Object.entries(fiveElements).sort(([, a], [, b]) => (b as number) - (a as number))
  const strongest = sorted[0]
  const weakest = sorted[sorted.length - 1]

  if (!dayMasterInfo) {
    return isKo ? '사주 데이터를 분석 중입니다...' : 'Analyzing Saju data...'
  }

  const themeLabelKo: Record<string, string> = {
    love: '사랑/관계',
    career: '직업/커리어',
    wealth: '재물/수입',
    health: '건강/리듬',
    family: '가족/소통',
    overall: '인생 전반',
    life: '인생 전반',
  }
  const themeLabelEn: Record<string, string> = {
    love: 'Love & Relationships',
    career: 'Career & Work',
    wealth: 'Money & Wealth',
    health: 'Health & Rhythm',
    family: 'Family & Communication',
    overall: 'Life Overview',
    life: 'Life Overview',
  }
  const resolvedThemeKo = themeLabelKo[theme] || themeLabelKo.overall
  const resolvedThemeEn = themeLabelEn[theme] || themeLabelEn.overall

  const strongestNameKo = strongest ? elementTraits[strongest[0]]?.ko : ''
  const strongestNameEn = strongest ? elementTraits[strongest[0]]?.en : ''
  const weakestNameKo = weakest ? elementTraits[weakest[0]]?.ko : ''
  const weakestNameEn = weakest ? elementTraits[weakest[0]]?.en : ''

  const themeAdviceKo: Record<string, string> = {
    love: '관계에서는 감정 반응보다 관계 목표를 먼저 합의하면 오래 갑니다.',
    career: '커리어에서는 확장 속도보다 실행 구조를 먼저 잡을수록 성과가 커집니다.',
    wealth: '재물운은 큰 한 방보다 손실 통제와 현금흐름 관리에서 크게 갈립니다.',
    health: '건강은 의지보다 루틴이 핵심이며, 수면과 식사 리듬이 운의 바닥을 지탱합니다.',
    family: '가족관계는 정답 제시보다 감정 확인 후 대화를 여는 방식이 갈등을 줄입니다.',
    overall: '인생 전체는 강점의 과잉 사용을 줄이고 약점 영역을 보완할 때 궤도가 안정됩니다.',
    life: '인생 전체는 강점의 과잉 사용을 줄이고 약점 영역을 보완할 때 궤도가 안정됩니다.',
  }
  const themeAdviceEn: Record<string, string> = {
    love: 'In relationships, agreeing on shared goals before emotional reactions makes bonds last.',
    career:
      'In career, building execution structure before expansion speed creates bigger outcomes.',
    wealth: 'Wealth grows more from loss control and cash-flow discipline than one big bet.',
    health: 'Health improves through routine, with sleep and meal rhythm as foundational leverage.',
    family: 'Family tension reduces when emotional validation comes before solutions.',
    overall: 'Life stabilizes when you stop overusing strengths and start rebuilding weak zones.',
    life: 'Life stabilizes when you stop overusing strengths and start rebuilding weak zones.',
  }

  const report = isKo
    ? `【${resolvedThemeKo} 포커스 리포트】\n\n${dayMasterInfo.hanja}${dayMasterInfo.ko} 일간의 기본 성향은 ${dayMasterInfo.personality.ko}입니다. 점성 기준으로는 태양 ${sunData?.ko || '미확인'}과 달 ${moonData?.ko || '미확인'}이 겹치며, 겉으로는 ${sunData?.trait.ko || '표현력'}을 보이고 내면에서는 ${moonData?.trait.ko || '정서 반응'}을 강하게 경험하는 구조입니다.\n\n용어를 쉽게 풀면, 일간(태어난 날의 중심 성질)은 '기본 엔진', 태양은 '사회적 페르소나', 달은 '감정 습관'을 뜻합니다. 이 세 축이 같은 방향을 볼수록 실행력이 높아지고, 서로 충돌하면 속도는 빠른데 만족감이 떨어질 수 있습니다.\n\n오행 분포에서는 ${strongestNameKo}${strongest ? `(${strongest[1]}%)` : ''}이 강점 축이고, ${weakestNameKo}${weakest ? `(${weakest[1]}%)` : ''}이 보완 축입니다. 강점 축은 당신을 빠르게 끌어올리지만, 보완 축을 비워두면 중요한 전환점에서 반복 실수가 생깁니다.\n\n${themeAdviceKo[theme] || themeAdviceKo.overall} 지금 시점의 핵심은 '잘하는 것의 과속'을 줄이고, 취약한 영역을 루틴으로 보강해 장기전 체력을 만드는 것입니다.\n\n초년에는 정체성 탐색과 방향 전환이 빠르게 반복될 가능성이 높고, 중년에는 실력과 책임이 동시에 커지며 영향력이 확장됩니다. 후반으로 갈수록 사람과 자원, 신뢰를 다루는 방식이 성패를 가르며, 결국 당신의 운은 통찰을 실행 체계로 바꾸는 능력에서 결정됩니다.`
    : `[${resolvedThemeEn} Focus Report]\n\nYour core Day Master signature is ${dayMasterInfo.personality.en}. Astrologically, Sun in ${sunData?.en || 'Unknown'} and Moon in ${moonData?.en || 'Unknown'} show an outer style of ${sunData?.trait.en || 'expression'} and an inner pattern of ${moonData?.trait.en || 'emotional processing'}.\n\nIn plain terms: Day Master is your base engine, Sun is your social persona, and Moon is your emotional habit. When these align, execution becomes smooth; when they clash, speed rises but fulfillment drops.\n\nIn five-element balance, ${strongestNameEn}${strongest ? ` (${strongest[1]}%)` : ''} is your growth axis, while ${weakestNameEn}${weakest ? ` (${weakest[1]}%)` : ''} is your compensation axis. Strength drives momentum, but weak-zone neglect creates repeated mistakes at major transitions.\n\n${themeAdviceEn[theme] || themeAdviceEn.overall} Your practical task now is to reduce over-acceleration in strengths and rebuild weak zones through consistent routines.\n\nEarly phase tends to include identity pivots, mid phase expands responsibility and influence, and later phase rewards trust-building and resource mastery. Your long-term fortune depends on converting insight into repeatable execution systems.`

  reportCache.set(cacheKey, report)

  if (reportCache.size > 500) {
    const firstKey = reportCache.keys().next().value
    if (firstKey !== undefined) {
      reportCache.delete(firstKey)
    }
  }

  return report
}

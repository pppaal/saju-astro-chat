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

type ZodiacInfo = {
  ko: string
  en: string
  trait: { ko: string; en: string }
}

const reportCache = new Map<string, string>()

function buildKoDirectToneReport(args: {
  theme: string
  resolvedThemeKo: string
  dayMasterInfo: {
    hanja: string
    ko: string
    personality: { ko: string }
  }
  sunData: ZodiacInfo | null
  moonData: ZodiacInfo | null
  strongestNameKo: string
  weakestNameKo: string
  strongest?: [string, number]
  weakest?: [string, number]
  themeAdviceKo: Record<string, string>
}): string {
  const {
    theme,
    resolvedThemeKo,
    dayMasterInfo,
    sunData,
    moonData,
    strongestNameKo,
    weakestNameKo,
    strongest,
    weakest,
    themeAdviceKo,
  } = args

  return `【${resolvedThemeKo} 집중 리포트】

결론부터 말씀드리면, 당신은 단순 반복형 조직 루틴보다 전문성으로 승부하는 구조에 가깝습니다. ${dayMasterInfo.hanja}${dayMasterInfo.ko} 일간의 핵심 성향은 ${dayMasterInfo.personality.ko}이며, 점성 기준으로 태양 ${sunData?.ko || '미확인'}과 달 ${moonData?.ko || '미확인'} 조합은 겉으로는 ${sunData?.trait.ko || '표현력'}이 강하고 내면에서는 ${moonData?.trait.ko || '정서 반응'}이 크게 작동하는 패턴입니다.

쉽게 풀면, 일간은 기본 엔진이고 태양은 사회적 캐릭터, 달은 감정 습관입니다. 이 셋이 한 방향으로 맞으면 실행력이 급상승합니다. 반대로 충돌하면 속도는 빠른데 만족도와 지속력이 떨어집니다.

오행 분포를 보면 ${strongestNameKo}${strongest ? `(${strongest[1]}%)` : ''}이 주력 축이고, ${weakestNameKo}${weakest ? `(${weakest[1]}%)` : ''}이 보완 축입니다. 주력 축은 성과를 빠르게 만들지만, 보완 축을 비워두면 중요한 시점마다 같은 실수가 반복됩니다. 지금은 강점을 더 세게 쓰는 시기가 아니라, 약한 축을 보강해 판을 넓히는 시기입니다.

직업 관점에서는 본인 재량이 큰 포지션이 유리합니다. 기획, 분석, 컨설팅, 재무·데이터, 디자인·개발처럼 실력 기반으로 평가받는 역할이 맞습니다. 반대로 감정노동이 과한 응대 중심 업무나 재량권이 매우 낮은 구조에서는 피로가 빠르게 누적될 수 있습니다.

${themeAdviceKo[theme] || themeAdviceKo.overall} 핵심은 "잘하는 것의 과속"을 줄이고, 취약 영역을 루틴으로 보강하는 것입니다. 오늘 바로 적용할 행동은 간단합니다. 첫째, 하루 핵심 과업 1개만 먼저 끝내고 확장하세요. 둘째, 감정 반응 전에 의사결정 기준을 문장으로 적으세요. 셋째, 수면·식사 리듬을 고정해 집중력 하한선을 끌어올리세요.

초반에는 방향 전환이 잦고, 중반에는 책임과 영향력이 커집니다. 후반으로 갈수록 사람과 자원을 다루는 방식이 성패를 가릅니다. 결국 당신의 운은 통찰 자체보다, 통찰을 반복 가능한 실행 체계로 바꾸는 능력에서 결정됩니다.`
}

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
  const sunData = (sunSign ? zodiacData[sunSign] : null) as ZodiacInfo | null
  const moonData = (moonSign ? zodiacData[moonSign] : null) as ZodiacInfo | null

  const fiveElements = sajuData?.fiveElements || {}
  const sorted = Object.entries(fiveElements).sort(([, a], [, b]) => (b as number) - (a as number))
  const strongest = sorted[0] as [string, number] | undefined
  const weakest = sorted[sorted.length - 1] as [string, number] | undefined

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
    ? buildKoDirectToneReport({
        theme,
        resolvedThemeKo,
        dayMasterInfo: {
          hanja: dayMasterInfo.hanja,
          ko: dayMasterInfo.ko,
          personality: { ko: dayMasterInfo.personality.ko },
        },
        sunData,
        moonData,
        strongestNameKo,
        weakestNameKo,
        strongest,
        weakest,
        themeAdviceKo,
      })
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

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @deprecated This file is kept for backward compatibility. Use index.ts instead.
 * This file has loose type checking due to complex dynamic structures from external APIs.
 */
import type { CombinedResult } from '@/lib/destiny-map/astrologyengine'
import type { AstrologyData, SajuData } from '@/lib/destiny-map/astrology/types'
import type { PlanetData, AspectHit } from '@/lib/astrology'
import { logger } from '@/lib/logger'
import type {
  HouseData,
  PillarData,
  DaeunItem,
  AnnualItem,
  MonthlyItem,
  AspectData,
  SinsalItem,
  SibsinRelation,
  CareerAptitude,
  BranchInteraction,
  TuechulItem,
  HoegukItem,
  FixedStarItem,
  MidpointItem,
  TransitItem,
  AsteroidAspect,
} from './prompt-types'

/**
 * Build a comprehensive data snapshot for fortune prompts.
 * v3.1 - Includes ALL saju + ALL advanced astrology data for expert-level predictions.
 *
 * Added in v3.0:
 * - Chiron, Lilith (extra points)
 * - All asteroids (Ceres, Pallas, Vesta, Juno)
 * - Solar Return (연간 차트)
 * - Lunar Return (월간 차트)
 * - Progressions (Secondary, Solar Arc)
 * - Draconic Chart (영혼 차트)
 * - Harmonics (H5/H7/H9)
 * - Fixed Stars (항성)
 * - Eclipses (일/월식)
 * - Electional (택일)
 * - Midpoints (미드포인트)
 */
export function buildAllDataPrompt(lang: string, theme: string, data: CombinedResult) {
  const { astrology = {}, saju } = data ?? {}
  const astroData = astrology as AstrologyData | Record<string, unknown>
  const {
    planets = [],
    houses = [],
    aspects = [],
    ascendant,
    mc,
    facts,
    transits = [],
  } = astroData as AstrologyData
  const sajuData = (saju ?? {}) as SajuData
  const { pillars, dayMaster, unse, sinsal, advancedAnalysis } = sajuData

  // ========== HELPER FUNCTIONS ==========
  const getPlanet = (name: string) => planets.find((p: PlanetData) => p.name === name)

  // 한자 → 쉬운 한글 변환 맵
  const stemToKorean: Record<string, string> = {
    甲: '갑목(나무+)',
    乙: '을목(나무-)',
    丙: '병화(불+)',
    丁: '정화(불-)',
    戊: '무토(흙+)',
    己: '기토(흙-)',
    庚: '경금(쇠+)',
    辛: '신금(쇠-)',
    壬: '임수(물+)',
    癸: '계수(물-)',
  }
  const branchToKorean: Record<string, string> = {
    子: '자(쥐/물)',
    丑: '축(소/흙)',
    寅: '인(호랑이/나무)',
    卯: '묘(토끼/나무)',
    辰: '진(용/흙)',
    巳: '사(뱀/불)',
    午: '오(말/불)',
    未: '미(양/흙)',
    申: '신(원숭이/쇠)',
    酉: '유(닭/쇠)',
    戌: '술(개/흙)',
    亥: '해(돼지/물)',
  }
  // 간지를 쉬운 형태로 변환
  const formatGanjiEasy = (stem?: string, branch?: string) => {
    if (!stem || !branch) {
      return '-'
    }
    const stemKo = stemToKorean[stem] || stem
    const branchKo = branchToKorean[branch] || branch
    return `${stemKo} + ${branchKo}`
  }

  const formatPillar = (p: PillarData | undefined) => {
    if (!p) {
      return null
    }
    const stem = p.heavenlyStem?.name || p.ganji?.split?.('')?.[0] || ''
    const branch = p.earthlyBranch?.name || p.ganji?.split?.('')?.[1] || ''
    return stem && branch ? `${stem}${branch}` : null
  }

  // ========== BASIC PLANETARY DATA ==========
  const sun = getPlanet('Sun')
  const moon = getPlanet('Moon')
  const mercury = getPlanet('Mercury')
  const venus = getPlanet('Venus')
  const mars = getPlanet('Mars')
  const jupiter = getPlanet('Jupiter')
  const saturn = getPlanet('Saturn')
  const uranus = getPlanet('Uranus')
  const neptune = getPlanet('Neptune')
  const pluto = getPlanet('Pluto')
  const northNode = getPlanet('North Node')

  const planetLines = planets
    .slice(0, 12)
    .map((p: PlanetData) => `${p.name ?? '?'}: ${p.sign ?? '-'} (H${p.house ?? '-'})`)
    .join('; ')

  // 하우스 정보 (배열 또는 객체 모두 지원)
  const houseLines = Array.isArray(houses)
    ? houses
        .slice(0, 12)
        .map((h: HouseData, i: number) => `H${i + 1}: ${h?.sign ?? h?.formatted ?? '-'}`)
        .join('; ')
    : Object.entries(houses ?? {})
        .slice(0, 12)
        .map(([num, val]: [string, any]) => `H${num}: ${val?.sign ?? '-'}`)
        .join('; ')

  const aspectLines = aspects
    .slice(0, 12)
    .map(
      (a: AspectData) =>
        `${a.planet1?.name ?? a.from?.name ?? '?'}-${a.type ?? a.aspect ?? ''}-${a.planet2?.name ?? a.to?.name ?? '?'}`
    )
    .join('; ')

  const elements = Object.entries(facts?.elementRatios ?? {})
    .map(([k, v]) => `${k}:${(v as number).toFixed?.(1) ?? v}`)
    .join(', ')

  // ========== PILLARS ==========
  const pillarText =
    [
      formatPillar(pillars?.year),
      formatPillar(pillars?.month),
      formatPillar(pillars?.day),
      formatPillar(pillars?.time),
    ]
      .filter(Boolean)
      .join(' / ') || '-'

  // 일간 추출
  const dayPillarStem = pillars?.day?.heavenlyStem?.name
  const dayPillarElement = pillars?.day?.heavenlyStem?.element
  const actualDayMaster = dayMaster?.name || dayPillarStem || '-'
  const actualDayMasterElement = dayMaster?.element || dayPillarElement || '-'

  // ========== LUCK CYCLES (현재 + 미래 예측용) ==========
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  // Get birth year from pillars (for age-based daeun calculation)

  const birthYear = ((pillars?.year as Record<string, unknown>)?.year as number) ?? currentYear - 30
  const currentAge = currentYear - birthYear

  // 현재 대운 찾기 (age 기반)
  type DaeunWithAge = DaeunItem
  const daeunList = (unse?.daeun ?? []) as DaeunItem[]
  const currentDaeun = daeunList.find((d) => {
    const startAge = d.age ?? 0
    const endAge = startAge + 9 // 대운은 10년 단위
    return currentAge >= startAge && currentAge <= endAge
  })

  // 현재 세운
  const annualList = (unse?.annual ?? []) as AnnualItem[]
  const currentAnnual = annualList.find((a) => a.year === currentYear)
  // 현재 월운
  const monthlyList = (unse?.monthly ?? []) as MonthlyItem[]
  const currentMonthly = monthlyList.find((m) => m.year === currentYear && m.month === currentMonth)

  // 현재 대운 텍스트 (age 기반) - 쉬운 한글로 변환
  const daeunText = currentDaeun
    ? `${currentDaeun.age}-${(currentDaeun.age ?? 0) + 9}세: ${formatGanjiEasy(currentDaeun.heavenlyStem, currentDaeun.earthlyBranch)}`
    : daeunList
        .slice(0, 3)
        .map(
          (u) =>
            `${u.age}-${(u.age ?? 0) + 9}세: ${formatGanjiEasy(u.heavenlyStem, u.earthlyBranch)}`
        )
        .join('; ')

  // ========== 미래 운세 데이터 (FUTURE PREDICTIONS) ==========
  // 전체 대운 흐름 (과거~미래) - age 기반, 쉬운 한글로 표시
  const allDaeunText = daeunList
    .map((d) => {
      const startAge = d.age ?? 0
      const endAge = startAge + 9
      const isCurrent = currentAge >= startAge && currentAge <= endAge
      const marker = isCurrent ? '★현재★' : ''
      const easyGanji = formatGanjiEasy(d.heavenlyStem, d.earthlyBranch)
      return `${startAge}-${endAge}세: ${easyGanji} ${marker}`
    })
    .join('\n  ')

  // 간지 문자열에서 천간/지지 분리 후 쉬운 형태로 변환
  const parseGanjiEasy = (ganji?: string) => {
    if (!ganji || ganji.length < 2) {
      return ganji || '-'
    }
    const stem = ganji[0]
    const branch = ganji[1]
    return formatGanjiEasy(stem, branch)
  }

  // 향후 연운 (현재년도 ~ +5년) - 쉬운 한글로 표시
  type AnnualWithName = AnnualItem & { name?: string }
  const futureAnnualList = annualList
    .filter((a) => (a.year ?? 0) >= currentYear && (a.year ?? 0) <= currentYear + 5)
    .map((a) => {
      const aWithName = a as AnnualWithName
      const isCurrent = a.year === currentYear
      const marker = isCurrent ? '★현재★' : ''
      const easyGanji = parseGanjiEasy(a.ganji ?? aWithName.name)
      return `${a.year}년: ${easyGanji} ${marker}`
    })
    .join('\n  ')

  // 향후 월운 (현재월 ~ 12개월) - 쉬운 한글로 표시
  const futureMonthlyList = monthlyList
    .filter((m) => {
      if ((m.year ?? 0) > currentYear) {
        return true
      }
      if ((m.year ?? 0) === currentYear && (m.month ?? 0) >= currentMonth) {
        return true
      }
      return false
    })
    .slice(0, 12)
    .map((m) => {
      const mWithName = m as MonthlyItem & { name?: string }
      const isCurrent = m.year === currentYear && m.month === currentMonth
      const marker = isCurrent ? '★현재★' : ''
      const easyGanji = parseGanjiEasy(m.ganji ?? mWithName.name)
      return `${m.year}년 ${m.month}월: ${easyGanji} ${marker}`
    })
    .join('\n  ')

  // ========== SINSAL ==========
  type SinsalRecord = { luckyList?: SinsalItem[]; unluckyList?: SinsalItem[] }
  const sinsalRecord = sinsal as SinsalRecord | undefined
  const lucky = (sinsalRecord?.luckyList ?? []).map((x) => x.name).join(', ')
  const unlucky = (sinsalRecord?.unluckyList ?? []).map((x) => x.name).join(', ')

  // ========== ADVANCED SAJU ANALYSIS ==========

  const adv = advancedAnalysis as Record<string, any> | undefined

  // 신강/신약
  const strengthText = adv?.extended?.strength
    ? `${adv.extended.strength.level} (${adv.extended.strength.score ?? 0}점, 통근${adv.extended.strength.rootCount ?? 0}개)`
    : '-'

  // 격국
  const geokgukText = adv?.geokguk?.type ?? adv?.extended?.geokguk?.type ?? '-'
  const geokgukDesc = adv?.geokguk?.description ?? adv?.extended?.geokguk?.description ?? ''

  // 용신/희신/기신
  const yongsinPrimary = adv?.yongsin?.primary?.element ?? adv?.extended?.yongsin?.primary ?? '-'
  const yongsinSecondary =
    adv?.yongsin?.secondary?.element ?? adv?.extended?.yongsin?.secondary ?? '-'
  const yongsinAvoid = adv?.yongsin?.avoid?.element ?? adv?.extended?.yongsin?.avoid ?? '-'

  // 십신 분석
  const sibsin = adv?.sibsin
  const sibsinDist = sibsin?.count ?? sibsin?.distribution ?? sibsin?.counts ?? {}
  const sibsinDistText = Object.entries(sibsinDist)
    .filter(([, v]) => (v as number) > 0)
    .map(([k, v]) => `${k}(${v})`)
    .join(', ')
  const sibsinDominant =
    sibsin?.dominantSibsin?.join?.(', ') ?? sibsin?.dominant ?? sibsin?.primary ?? '-'
  const sibsinMissing = sibsin?.missingSibsin?.join?.(', ') ?? sibsin?.missing?.join?.(', ') ?? '-'

  // 십신 기반 인간관계/직업
  const sibsinRelationships = sibsin?.relationships ?? []
  const sibsinCareerAptitudes = sibsin?.careerAptitudes ?? []
  const relationshipText = Array.isArray(sibsinRelationships)
    ? sibsinRelationships
        .slice(0, 3)
        .map((r: SibsinRelation) => `${r.type}:${r.quality ?? r.description ?? ''}`)
        .join('; ')
    : '-'
  const careerText = Array.isArray(sibsinCareerAptitudes)
    ? sibsinCareerAptitudes
        .slice(0, 4)
        .map((c: CareerAptitude) => `${c.field}(${c.score ?? 0})`)
        .join(', ')
    : '-'

  // 형충회합
  const hyeongchung = adv?.hyeongchung ?? {}
  const chungText = hyeongchung.chung?.length
    ? hyeongchung.chung
        .map((c: BranchInteraction) => `${c.branch1 ?? c.from}-${c.branch2 ?? c.to}`)
        .join(', ')
    : '-'
  const hapText = hyeongchung.hap?.length
    ? hyeongchung.hap
        .map(
          (h: BranchInteraction) => `${h.branch1 ?? h.from}-${h.branch2 ?? h.to}→${h.result ?? ''}`
        )
        .join(', ')
    : '-'
  const samhapText = hyeongchung.samhap?.length
    ? hyeongchung.samhap
        .map((s: { branches?: string[] }) => s.branches?.join?.('-') ?? '-')
        .join('; ')
    : '-'

  // 건강/직업
  const healthCareer = adv?.healthCareer ?? {}
  const healthWeak =
    healthCareer.health?.vulnerabilities?.join?.(', ') ??
    healthCareer.health?.weakOrgans?.join?.(', ') ??
    '-'
  const suitableCareers =
    healthCareer.career?.suitableFields?.join?.(', ') ??
    healthCareer.career?.aptitudes?.join?.(', ') ??
    '-'

  // 종합 점수
  const score = adv?.score ?? {}
  const scoreText =
    (score.total ?? score.overall)
      ? `총${score.total ?? score.overall}/100 (사업${score.business ?? score.career ?? 0}, 재물${score.wealth ?? score.finance ?? 0}, 건강${score.health ?? 0})`
      : '-'

  // 통근/투출/회국/득령 (고급 분석)
  const tonggeunText = adv?.tonggeun
    ? `${adv.tonggeun.stem ?? '-'}→${adv.tonggeun.rootBranch ?? '-'} (${adv.tonggeun.strength ?? '-'})`
    : '-'
  const tuechulText = adv?.tuechul?.length
    ? adv.tuechul
        .slice(0, 3)
        .map((t: TuechulItem) => `${t.element ?? t.stem}(${t.type ?? '-'})`)
        .join(', ')
    : '-'
  const hoegukText = adv?.hoeguk?.length
    ? adv.hoeguk
        .slice(0, 2)
        .map((h: HoegukItem) => `${h.type ?? h.name}→${h.resultElement ?? '-'}`)
        .join('; ')
    : '-'
  const deukryeongText = adv?.deukryeong
    ? `${adv.deukryeong.status ?? adv.deukryeong.type ?? '-'} (${adv.deukryeong.score ?? 0}점)`
    : '-'

  // 고급 분석 (종격, 화격, 일주론, 공망)
  const ultra = adv?.ultraAdvanced ?? {}
  const jonggeokText = ultra.jonggeok?.type ?? ultra.jonggeok?.name ?? ''
  const iljuText = ultra.iljuAnalysis?.character ?? ultra.iljuAnalysis?.personality ?? ''
  const gongmangText =
    ultra.gongmang?.branches?.join?.(', ') ?? ultra.gongmang?.emptyBranches?.join?.(', ') ?? ''

  // ========== EXTRA ASTROLOGY POINTS (Chiron, Lilith, Vertex, Part of Fortune) ==========
  type ExtraPoint = { sign?: string; house?: number }
  const extraPoints = data.extraPoints ?? ({} as Record<string, ExtraPoint | undefined>)
  const vertex = extraPoints.vertex
  const partOfFortune = extraPoints.partOfFortune
  const chiron = extraPoints.chiron
  const lilith = extraPoints.lilith

  const extraPointsText =
    [
      chiron ? `Chiron(상처/치유): ${chiron.sign} (H${chiron.house})` : null,
      lilith ? `Lilith(그림자): ${lilith.sign} (H${lilith.house})` : null,
      vertex ? `Vertex(운명): ${vertex.sign} (H${vertex.house})` : null,
      partOfFortune
        ? `Part of Fortune(행운): ${partOfFortune.sign} (H${partOfFortune.house})`
        : null,
    ]
      .filter(Boolean)
      .join('; ') || '-'

  // ========== ASTEROIDS (소행성 - Ceres, Pallas, Juno, Vesta) ==========
  type AsteroidPoint = { sign?: string; house?: number }
  type AsteroidData = {
    juno?: AsteroidPoint
    ceres?: AsteroidPoint
    pallas?: AsteroidPoint
    vesta?: AsteroidPoint
    aspects?: AsteroidAspect[] | Record<string, AsteroidAspect[]>
  }
  const asteroids =
    ((data as unknown as Record<string, unknown>).asteroids as AsteroidData | undefined) ?? {}
  const juno = asteroids.juno
  const ceres = asteroids.ceres
  const pallas = asteroids.pallas
  const vesta = asteroids.vesta

  const asteroidsText =
    [
      ceres ? `Ceres(양육): ${ceres.sign} (H${ceres.house})` : null,
      pallas ? `Pallas(지혜): ${pallas.sign} (H${pallas.house})` : null,
      juno ? `Juno(결혼): ${juno.sign} (H${juno.house})` : null,
      vesta ? `Vesta(헌신): ${vesta.sign} (H${vesta.house})` : null,
    ]
      .filter(Boolean)
      .join('; ') || '-'

  // Asteroid Aspects (소행성 어스팩트)
  const asteroidAspects = asteroids.aspects
  const asteroidAspectsText = asteroidAspects
    ? (() => {
        if (Array.isArray(asteroidAspects)) {
          return asteroidAspects
            .slice(0, 4)
            .map(
              (a: AsteroidAspect) =>
                `${a.asteroid ?? a.from}-${a.type ?? a.aspect}-${a.planet ?? a.to}`
            )
            .join('; ')
        }
        if (typeof asteroidAspects === 'object') {
          const allAsp: string[] = []
          for (const [name, hits] of Object.entries(asteroidAspects)) {
            if (Array.isArray(hits)) {
              for (const h of (hits as AsteroidAspect[]).slice(0, 2)) {
                allAsp.push(`${name}-${h.type ?? h.aspect}-${h.planet2?.name ?? h.to ?? h.planet}`)
              }
            }
          }
          return allAsp.slice(0, 4).join('; ')
        }
        return '-'
      })()
    : '-'

  // ========== SOLAR RETURN (연간 차트) ==========
  type ReturnSummary = {
    ascSign?: string
    ascendant?: string
    sunHouse?: number
    moonSign?: string
    moonHouse?: number
    theme?: string
    yearTheme?: string
    monthTheme?: string
  }
  type ReturnData = { summary?: ReturnSummary }
  const solarReturn = data.solarReturn as ReturnData | undefined
  const solarReturnText = solarReturn
    ? [
        `SR ASC: ${solarReturn.summary?.ascSign ?? solarReturn.summary?.ascendant ?? '-'}`,
        `SR Sun House: ${solarReturn.summary?.sunHouse ?? '-'}`,
        `SR Moon: ${solarReturn.summary?.moonSign ?? '-'} (H${solarReturn.summary?.moonHouse ?? '-'})`,
        `Year Theme: ${solarReturn.summary?.theme ?? solarReturn.summary?.yearTheme ?? '-'}`,
      ].join('; ')
    : '-'

  // ========== LUNAR RETURN (월간 차트) ==========
  const lunarReturn = data.lunarReturn as ReturnData | undefined
  const lunarReturnText = lunarReturn
    ? [
        `LR ASC: ${lunarReturn.summary?.ascSign ?? lunarReturn.summary?.ascendant ?? '-'}`,
        `LR Moon House: ${lunarReturn.summary?.moonHouse ?? '-'}`,
        `Month Theme: ${lunarReturn.summary?.theme ?? lunarReturn.summary?.monthTheme ?? '-'}`,
      ].join('; ')
    : '-'

  // ========== PROGRESSIONS (진행 차트) ==========
  type ProgressionSummary = {
    keySigns?: { sun?: string; moon?: string }
    progressedSun?: string
    progressedMoon?: string
    moonHouse?: number
    ascendant?: string
  }
  type ProgressionChart = { ascendant?: { sign?: string } }
  type ProgressionSecondary = {
    summary?: ProgressionSummary
    moonPhase?: { phase?: string }
    chart?: ProgressionChart
  }
  type ProgressionSolarArc = { summary?: ProgressionSummary }
  type ProgressionData = { secondary?: ProgressionSecondary; solarArc?: ProgressionSolarArc }
  const progressions = data.progressions as ProgressionData | undefined
  const progressedSun =
    progressions?.secondary?.summary?.keySigns?.sun ??
    progressions?.secondary?.summary?.progressedSun ??
    '-'
  const progressedMoon =
    progressions?.secondary?.summary?.keySigns?.moon ??
    progressions?.secondary?.summary?.progressedMoon ??
    '-'
  const progressedMoonPhase = progressions?.secondary?.moonPhase?.phase ?? '-'
  const progressedMoonHouse = progressions?.secondary?.summary?.moonHouse ?? '-'
  const progressedAsc =
    progressions?.secondary?.summary?.ascendant ??
    progressions?.secondary?.chart?.ascendant?.sign ??
    '-'
  const solarArcSun =
    progressions?.solarArc?.summary?.keySigns?.sun ??
    progressions?.solarArc?.summary?.progressedSun ??
    '-'

  const progressionsText = progressions
    ? [
        `P.Sun: ${progressedSun}`,
        `P.Moon: ${progressedMoon} (Phase: ${progressedMoonPhase})`,
        `P.ASC: ${progressedAsc}`,
        progressions.solarArc ? `SA Sun: ${solarArcSun}` : null,
      ]
        .filter(Boolean)
        .join('; ')
    : '-'

  // 프로그레션 상세 (인생 주기 분석용)
  const progressionDetailText = progressions
    ? `
• Progressed Sun: ${progressedSun} → 현재 자아 성장 방향
• Progressed Moon: ${progressedMoon} (House ${progressedMoonHouse}) → 현재 감정적 초점
• Progressed Moon Phase: ${progressedMoonPhase} → 29.5년 인생 주기 중 위치
  - New Moon(0-3.5년): 새로운 시작, 씨앗 심기
  - Crescent(3.5-7년): 성장 도전, 의지력 시험
  - First Quarter(7-10.5년): 행동, 결단의 시기
  - Gibbous(10.5-14년): 분석, 완성 추구
  - Full Moon(14-17.5년): 수확, 관계 절정
  - Disseminating(17.5-21년): 나눔, 가르침
  - Last Quarter(21-24.5년): 재평가, 정리
  - Balsamic(24.5-29.5년): 완료, 새 주기 준비
• Progressed ASC: ${progressedAsc} → 현재 페르소나 변화
${progressions.solarArc ? `• Solar Arc Sun: ${solarArcSun} → 외적 발전 방향` : ''}
`.trim()
    : ''

  // ========== DRACONIC CHART (드라코닉 - 영혼 차트) ==========
  type DraconicAlignment = { description?: string }
  type DraconicComparison = { alignments?: DraconicAlignment[] }
  type DraconicChartData = { planets?: PlanetData[]; ascendant?: { sign?: string } }
  type DraconicData = { chart?: DraconicChartData; comparison?: DraconicComparison }
  const draconic = data.draconic as DraconicData | undefined
  const draconicText = draconic
    ? [
        `Draconic Sun: ${draconic.chart?.planets?.find((p: PlanetData) => p.name === 'Sun')?.sign ?? '-'}`,
        `Draconic Moon: ${draconic.chart?.planets?.find((p: PlanetData) => p.name === 'Moon')?.sign ?? '-'}`,
        `Draconic ASC: ${draconic.chart?.ascendant?.sign ?? '-'}`,
        draconic.comparison?.alignments?.length
          ? `Alignments: ${draconic.comparison.alignments
              .slice(0, 2)
              .map((a: DraconicAlignment) => a.description)
              .join('; ')}`
          : null,
      ]
        .filter(Boolean)
        .join('; ')
    : '-'

  // ========== HARMONICS (하모닉 분석) ==========
  type HarmonicProfile = {
    dominant?: number
    creative?: number
    intuitive?: number
    spiritual?: number
  }
  type HarmonicChartData = { planets?: PlanetData[] }
  type HarmonicsData = {
    profile?: HarmonicProfile
    h5?: HarmonicChartData
    h7?: HarmonicChartData
    h9?: HarmonicChartData
  }
  const harmonics = data.harmonics as HarmonicsData | undefined
  const harmonicsText = harmonics?.profile
    ? [
        harmonics.profile.dominant ? `Dominant: H${harmonics.profile.dominant}` : null,
        harmonics.profile.creative
          ? `Creative(H5): ${harmonics.profile.creative?.toFixed?.(0) ?? harmonics.profile.creative}%`
          : null,
        harmonics.profile.intuitive
          ? `Intuitive(H7): ${harmonics.profile.intuitive?.toFixed?.(0) ?? harmonics.profile.intuitive}%`
          : null,
        harmonics.profile.spiritual
          ? `Spiritual(H9): ${harmonics.profile.spiritual?.toFixed?.(0) ?? harmonics.profile.spiritual}%`
          : null,
      ]
        .filter(Boolean)
        .join('; ')
    : '-'

  // Harmonic Charts (H5, H7, H9 개별 차트)
  const h5Sun = harmonics?.h5?.planets?.find((p: PlanetData) => p.name === 'Sun')
  const h7Sun = harmonics?.h7?.planets?.find((p: PlanetData) => p.name === 'Sun')
  const h9Sun = harmonics?.h9?.planets?.find((p: PlanetData) => p.name === 'Sun')
  const harmonicChartsText =
    [
      h5Sun ? `H5 Sun: ${h5Sun.sign}` : null,
      h7Sun ? `H7 Sun: ${h7Sun.sign}` : null,
      h9Sun ? `H9 Sun: ${h9Sun.sign}` : null,
    ]
      .filter(Boolean)
      .join('; ') || '-'

  // ========== FIXED STARS (항성) ==========
  const fixedStars = data.fixedStars as FixedStarItem[] | undefined
  const fixedStarsText = fixedStars?.length
    ? fixedStars
        .slice(0, 4)
        .map(
          (fs: FixedStarItem) =>
            `${fs.star ?? fs.starName}↔${fs.planet ?? fs.planetName}(${fs.meaning ?? ''})`
        )
        .join('; ')
    : '-'

  // ========== ECLIPSES (일/월식 영향) ==========
  type EclipseImpact = {
    eclipseType?: string
    type?: string
    affectedPoint?: string
    affectedPlanet?: string
  }
  type UpcomingEclipse = { date?: string; type?: string }
  type EclipseData = { impact?: EclipseImpact; upcoming?: UpcomingEclipse[] }
  const eclipses = data.eclipses as EclipseData | undefined
  const eclipsesText = eclipses
    ? [
        eclipses.impact
          ? `Impact: ${eclipses.impact.eclipseType ?? eclipses.impact.type ?? '-'} on ${eclipses.impact.affectedPoint ?? eclipses.impact.affectedPlanet ?? '-'}`
          : null,
        eclipses.upcoming?.length
          ? `Next: ${eclipses.upcoming[0]?.date ?? '-'} (${eclipses.upcoming[0]?.type ?? '-'})`
          : null,
      ]
        .filter(Boolean)
        .join('; ')
    : '-'

  // ========== ELECTIONAL (택일 분석) ==========
  type MoonPhaseInfo = { phase?: string; name?: string }
  type VOCInfo = { isVoid?: boolean }
  type PlanetaryHourInfo = { planet?: string }
  type ElectionalAnalysis = { score?: number; recommendation?: string }
  type ElectionalData = {
    moonPhase?: string | MoonPhaseInfo
    voidOfCourse?: VOCInfo
    planetaryHour?: PlanetaryHourInfo
    retrograde?: string[]
    analysis?: ElectionalAnalysis
  }
  const electional = data.electional as ElectionalData | undefined
  const electionalText = electional
    ? [
        `Moon Phase: ${typeof electional.moonPhase === 'string' ? electional.moonPhase : (electional.moonPhase?.phase ?? electional.moonPhase?.name ?? '-')}`,
        electional.voidOfCourse
          ? `VOC: ${electional.voidOfCourse.isVoid ? 'YES - 중요한 결정 피하기' : 'No'}`
          : null,
        `Planetary Hour: ${electional.planetaryHour?.planet ?? '-'}`,
        electional.retrograde?.length ? `Retrograde: ${electional.retrograde.join(', ')}` : null,
        electional.analysis?.score ? `Score: ${electional.analysis.score}/100` : null,
        electional.analysis?.recommendation ? `Tip: ${electional.analysis.recommendation}` : null,
      ]
        .filter(Boolean)
        .join('; ')
    : '-'

  // ========== MIDPOINTS (미드포인트) ==========
  type MidpointPoint = { sign?: string; degree?: number }
  type MidpointActivation = { description?: string; midpoint?: string; activator?: string }
  type MidpointsData = {
    sunMoon?: MidpointPoint
    ascMc?: MidpointPoint
    activations?: MidpointActivation[]
    all?: MidpointItem[]
  }
  const midpoints = data.midpoints as MidpointsData | undefined
  const midpointsText = midpoints
    ? [
        midpoints.sunMoon
          ? `Sun/Moon(심리): ${midpoints.sunMoon.sign} ${midpoints.sunMoon.degree?.toFixed?.(0) ?? midpoints.sunMoon.degree ?? 0}°`
          : null,
        midpoints.ascMc
          ? `ASC/MC(자아): ${midpoints.ascMc.sign} ${midpoints.ascMc.degree?.toFixed?.(0) ?? midpoints.ascMc.degree ?? 0}°`
          : null,
        midpoints.activations?.length
          ? `Activated: ${midpoints.activations
              .slice(0, 3)
              .map((a: MidpointActivation) => a.description ?? `${a.midpoint}-${a.activator}`)
              .join('; ')}`
          : null,
      ]
        .filter(Boolean)
        .join('; ')
    : '-'

  // All Midpoints (주요 미드포인트 목록)
  const allMidpointsText = midpoints?.all?.length
    ? midpoints.all
        .slice(0, 5)
        .map(
          (mp: MidpointItem) =>
            `${mp.planet1}-${mp.planet2}: ${mp.sign} ${mp.degree?.toFixed?.(0) ?? 0}°`
        )
        .join('; ')
    : '-'

  // ========== TRANSITS (현재 트랜짓) ==========
  type TransitData = TransitItem & {
    transitPlanet?: string
    natalPoint?: string
    isApplying?: boolean
  }
  const significantTransits = transits
    .filter((t: TransitData) =>
      ['conjunction', 'trine', 'square', 'opposition'].includes(t.type || t.aspectType || '')
    )
    .slice(0, 8)
    .map((t: TransitData) => {
      // Support both old format (from/to) and new format (transitPlanet/natalPoint)
      const planet1 = t.transitPlanet ?? t.from?.name ?? '?'
      const planet2 = t.natalPoint ?? t.to?.name ?? '?'
      const aspectType = t.aspectType ?? t.type ?? '?'
      const applyingText = t.isApplying ? '(접근중)' : '(분리중)'
      return `${planet1}-${aspectType}-${planet2} ${applyingText}`
    })
    .join('; ')

  // ========== 연애/배우자 전용 분석 (love theme) ==========
  // 7하우스 커스프 계산
  const house7Cusp = houses?.[6]?.cusp ?? 0
  const house7Sign = (() => {
    const signs = [
      'Aries',
      'Taurus',
      'Gemini',
      'Cancer',
      'Leo',
      'Virgo',
      'Libra',
      'Scorpio',
      'Sagittarius',
      'Capricorn',
      'Aquarius',
      'Pisces',
    ]
    return signs[Math.floor(house7Cusp / 30)] || '-'
  })()
  const house5Cusp = houses?.[4]?.cusp ?? 0
  const house5Sign = (() => {
    const signs = [
      'Aries',
      'Taurus',
      'Gemini',
      'Cancer',
      'Leo',
      'Virgo',
      'Libra',
      'Scorpio',
      'Sagittarius',
      'Capricorn',
      'Aquarius',
      'Pisces',
    ]
    return signs[Math.floor(house5Cusp / 30)] || '-'
  })()

  const loveAnalysisSection =
    theme === 'love'
      ? `
═══════════════════════════════════════
💕 연애/배우자 심층 분석
═══════════════════════════════════════

[사주 연애/배우자 분석]
• 배우자궁(일지): ${pillars?.day?.earthlyBranch?.name ?? '-'} (${pillars?.day?.earthlyBranch?.element ?? '-'})
• 정재(남성-아내): ${(sibsinDist as Record<string, number> | undefined)?.['정재'] ?? 0}개 | 편재(여자친구): ${(sibsinDist as Record<string, number> | undefined)?.['편재'] ?? 0}개
• 정관(여성-남편): ${(sibsinDist as Record<string, number> | undefined)?.['정관'] ?? 0}개 | 편관(남자친구): ${(sibsinDist as Record<string, number> | undefined)?.['편관'] ?? 0}개
• 도화살: ${lucky.includes('도화') ? '있음 → 이성에게 인기' : '없음'} | 홍염살: ${lucky.includes('홍염') ? '있음 → 강한 성적 매력' : '없음'}
• 원진살/귀문살: ${unlucky.includes('원진') || unlucky.includes('귀문') ? '있음 → 관계 트러블 주의' : '없음'}

[점성술 연애 분석]
• Venus(금성): ${venus?.sign ?? '-'} H${venus?.house ?? '-'} → 연애 스타일, 끌리는 타입
• Mars(화성): ${mars?.sign ?? '-'} H${mars?.house ?? '-'} → 성적 매력, 추구 방식
• 5하우스(연애): ${house5Sign} → 로맨스 스타일, 즐거움
• 7하우스(결혼): ${house7Sign} → 배우자 특성, 결혼관
• Juno(결혼): ${juno ? `${juno.sign} H${juno.house}` : '-'} → 이상적 배우자상
• Lilith(그림자): ${lilith ? `${lilith.sign} H${lilith.house}` : '-'} → 숨겨진 욕망

[연애 타이밍 분석]
• 현재 대운: ${daeunText} → ${currentDaeun?.element === '수' || currentDaeun?.element === '목' ? '감정/인연 활성화 시기' : '안정적 관계 구축 시기'}
• 금성 트랜짓: 5하우스/7하우스 통과 시 연애 기회
• 목성 트랜짓: 7하우스 통과 시 결혼 기회

[해석 포인트]
• 배우자궁 오행 → 배우자 기질/성격
• 금성 사인 → 끌리는 외모/성격 타입
• 7하우스 사인 → 배우자 첫인상/외적 특성
• 5하우스 vs 7하우스 → 연애 vs 결혼 스타일 차이
• 도화+편관/편재 많으면 → 연애는 많으나 결혼 신중
• 정관/정재 강하면 → 진지한 교제, 조기 결혼 경향
`
      : ''

  // ========== 직업/재물 전용 분석 (career/wealth theme) ==========
  // 2하우스(수입), 6하우스(일상업무), 10하우스(커리어) 사인 추출
  const housesWithSign = houses as Array<HouseData>
  const house2Sign = housesWithSign?.[1]?.sign ?? '-'
  const house6Sign = housesWithSign?.[5]?.sign ?? '-'
  const house10Sign = housesWithSign?.[9]?.sign ?? '-'

  // 관성(정관+편관), 재성(정재+편재), 식상(식신+상관) 합계
  const officialStar =
    ((sibsinDist as Record<string, number> | undefined)?.['정관'] ?? 0) +
    ((sibsinDist as Record<string, number> | undefined)?.['편관'] ?? 0)
  const wealthStar =
    ((sibsinDist as Record<string, number> | undefined)?.['정재'] ?? 0) +
    ((sibsinDist as Record<string, number> | undefined)?.['편재'] ?? 0)
  const outputStar =
    ((sibsinDist as Record<string, number> | undefined)?.['식신'] ?? 0) +
    ((sibsinDist as Record<string, number> | undefined)?.['상관'] ?? 0)

  const careerAnalysisSection =
    theme === 'career' || theme === 'wealth'
      ? `
═══════════════════════════════════════
💼 직업/재물 심층 분석 데이터 (職業/財物 CAREER/WEALTH ANALYSIS)
═══════════════════════════════════════

[사주 직업 분석 - 四柱 職業]
• 격국(格局): ${geokgukText} - ${geokgukDesc}
• 용신(用神): ${yongsinPrimary} (보조: ${yongsinSecondary}, 기신: ${yongsinAvoid})
• 관성(官星) 직장운: 정관 ${(sibsinDist as Record<string, number> | undefined)?.['정관'] ?? 0}개 + 편관 ${(sibsinDist as Record<string, number> | undefined)?.['편관'] ?? 0}개 = 총 ${officialStar}개
• 재성(財星) 재물운: 정재 ${(sibsinDist as Record<string, number> | undefined)?.['정재'] ?? 0}개 + 편재 ${(sibsinDist as Record<string, number> | undefined)?.['편재'] ?? 0}개 = 총 ${wealthStar}개
• 식상(食傷) 창의력: 식신 ${(sibsinDist as Record<string, number> | undefined)?.['식신'] ?? 0}개 + 상관 ${(sibsinDist as Record<string, number> | undefined)?.['상관'] ?? 0}개 = 총 ${outputStar}개
• 비겁(比劫) 경쟁력: ${((sibsinDist as Record<string, number> | undefined)?.['비견'] ?? 0) + ((sibsinDist as Record<string, number> | undefined)?.['겁재'] ?? 0)}개
• 적합 직업군: ${careerText}
• 업계 추천: ${suitableCareers}

[점성술 직업 분석 - WESTERN CAREER]
• MC(천정/Medium Coeli): ${mc?.sign ?? '-'} - 사회적 이미지/커리어 방향
• 10th House(커리어궁): ${house10Sign} - 직업적 성공 영역
• 6th House(일상업무궁): ${house6Sign} - 일하는 방식/근무 환경
• 2nd House(재물궁): ${house2Sign} - 돈 버는 방식/수입원
• Saturn(토성): ${saturn?.sign ?? '-'} (${saturn?.house ?? '-'}하우스) - 책임/장기목표/권위
• Jupiter(목성): ${jupiter?.sign ?? '-'} (${jupiter?.house ?? '-'}하우스) - 확장/기회/행운
• Mars(화성): ${mars?.sign ?? '-'} (${mars?.house ?? '-'}하우스) - 추진력/경쟁/야망

[직업 타이밍 분석]
• 현재 대운(大運): ${daeunText ?? '-'}
• 토성 트랜짓: 10하우스 통과 시 커리어 전환점/책임 증가
• 목성 트랜짓: 10하우스 통과 시 승진/확장 기회
• 목성 2하우스 통과: 수입 증가 가능성
• 북노드(Rahu) 대운: 야망 실현의 시기

[해석 포인트]
• 관성 강함(3+) → 조직 생활 유리, 안정적 직장인
• 관성 없음 → 프리랜서/자영업/창업 적합
• 재성 강함(3+) → 사업/투자/재테크 능력
• 식상 강함(3+) → 창의직/예술/기술직 적합
• MC 사인 → 사회에서 보이고 싶은 이미지
• 10하우스 vs 6하우스 → 큰 목표 vs 일상 업무 스타일 차이
• 토성 하우스 → 노력으로 성공할 영역
• 목성 하우스 → 자연스러운 행운/기회 영역
`
      : ''

  // ========== 건강 전용 분석 (health theme) ==========
  const healthAnalysisSection =
    theme === 'health'
      ? `
═══════════════════════════════════════
🏥 건강 심층 분석 데이터 (健康 HEALTH ANALYSIS)
═══════════════════════════════════════

[사주 체질 분석 - 四柱 體質]
• 일간 체질: ${actualDayMaster} (${actualDayMasterElement})
• 오행 균형: ${
          Object.entries(facts?.elementRatios ?? {})
            .map(([k, v]) => `${k}:${(v as number).toFixed?.(1) ?? v}`)
            .join(', ') || '-'
        }
• 부족 오행(용신): ${yongsinPrimary} → 이 오행 관련 장기 보강 필요
• 과다 오행(기신): ${yongsinAvoid} → 이 오행 관련 장기 과부하 주의
• 건강 취약 영역: ${healthWeak}

[오행별 장기/신체 연관표]
• 木(목): 간(肝), 담(膽), 눈, 근육, 손톱, 신경계
• 火(화): 심장(心), 소장(小腸), 혀, 혈관, 혈압
• 土(토): 비장(脾), 위장(胃), 입술, 살, 소화기
• 金(금): 폐(肺), 대장(大腸), 코, 피부, 털, 호흡기
• 水(수): 신장(腎), 방광(膀胱), 귀, 뼈, 치아, 생식기

[점성술 건강 분석 - WESTERN HEALTH]
• 6th House(건강궁): ${house6Sign} - 질병 경향/건강 관리 방식
• 1st House(신체): ASC ${ascendant?.sign ?? '-'} - 전반적 체력/외모
• Mars(화성): ${mars?.sign ?? '-'} (${mars?.house ?? '-'}하우스) - 에너지/염증/외상
• Saturn(토성): ${saturn?.sign ?? '-'} (${saturn?.house ?? '-'}하우스) - 만성질환/뼈/관절
• Chiron(카이론): ${chiron ? `${chiron.sign} (${chiron.house}하우스)` : '-'} - 상처/치유의 영역
• Neptune(해왕성): ${neptune?.sign ?? '-'} (${neptune?.house ?? '-'}하우스) - 면역/중독성

[건강 해석 가이드]
• 부족 오행 → 해당 장기 기능 약화, 음식/운동으로 보강
• 과다 오행 → 해당 장기 과부하, 절제/휴식 필요
• 6하우스 사인 → 질병 유형 및 건강 관리 스타일
• Chiron 하우스 → 평생 신경 써야 할 건강 영역
• 화성 긴장각 시기 → 급성 질환/사고 주의
• 토성 트랜짓 6하우스 → 건강 점검 필요 시기
• 목(木) 과다/화(火) 부족 → 혈압/심장 주의 등 상생상극 활용
`
      : ''

  // ========== 가족/인간관계 전용 분석 (family theme) ==========
  // 4하우스(가정) 사인 추출 (house5Sign은 love 섹션에서 이미 정의됨)
  const house4Sign = housesWithSign?.[3]?.sign ?? '-'

  // 비겁, 인성, 식상 합계
  const bijeopStar =
    ((sibsinDist as Record<string, number> | undefined)?.['비견'] ?? 0) +
    ((sibsinDist as Record<string, number> | undefined)?.['겁재'] ?? 0)
  const inseongStar =
    ((sibsinDist as Record<string, number> | undefined)?.['정인'] ?? 0) +
    ((sibsinDist as Record<string, number> | undefined)?.['편인'] ?? 0)
  const siksangStar =
    ((sibsinDist as Record<string, number> | undefined)?.['식신'] ?? 0) +
    ((sibsinDist as Record<string, number> | undefined)?.['상관'] ?? 0)

  const familyAnalysisSection =
    theme === 'family'
      ? `
═══════════════════════════════════════
👨‍👩‍👧 가족/인간관계 심층 분석 데이터 (家族 FAMILY ANALYSIS)
═══════════════════════════════════════

[사주 가족궁 분석 - 四柱 家族宮]
• 년주(年柱) - 조상/외부 인연: ${formatPillar(pillars?.year) ?? '-'}
• 월주(月柱) - 부모/형제 인연: ${formatPillar(pillars?.month) ?? '-'}
• 일주(日柱) - 배우자/본인: ${formatPillar(pillars?.day) ?? '-'}
• 시주(時柱) - 자녀/말년 운: ${formatPillar(pillars?.time) ?? '-'}

[가족 관계 십신 분석]
• 비겁(比劫) 형제운: 비견 ${(sibsinDist as Record<string, number> | undefined)?.['비견'] ?? 0}개 + 겁재 ${(sibsinDist as Record<string, number> | undefined)?.['겁재'] ?? 0}개 = 총 ${bijeopStar}개
• 인성(印星) 부모운: 정인 ${(sibsinDist as Record<string, number> | undefined)?.['정인'] ?? 0}개 + 편인 ${(sibsinDist as Record<string, number> | undefined)?.['편인'] ?? 0}개 = 총 ${inseongStar}개
• 식상(食傷) 자녀운: 식신 ${(sibsinDist as Record<string, number> | undefined)?.['식신'] ?? 0}개 + 상관 ${(sibsinDist as Record<string, number> | undefined)?.['상관'] ?? 0}개 = 총 ${siksangStar}개
• 관성(官星) 남편/직장: 총 ${officialStar}개
• 재성(財星) 아내/아버지: 총 ${wealthStar}개
• 인간관계 패턴: ${relationshipText}

[점성술 가족 분석 - WESTERN FAMILY]
• 4th House(가정궁): ${house4Sign} - 가정 환경/어머니/뿌리
• IC(천저): 내면의 안식처/가족 원형
• 10th House(아버지궁): MC ${mc?.sign ?? '-'} - 아버지/권위/사회적 이미지
• Moon(달): ${moon?.sign ?? '-'} (${moon?.house ?? '-'}하우스) - 감정 패턴/어머니상
• Saturn(토성): ${saturn?.sign ?? '-'} (${saturn?.house ?? '-'}하우스) - 아버지상/제한/책임
• 5th House(자녀궁): ${house5Sign} - 자녀/창조성/즐거움
• Ceres(케레스): ${ceres ? `${ceres.sign} (${ceres.house}하우스)` : '-'} - 양육 방식/돌봄

[가족 해석 가이드]
• 월주에 충(沖)이 있으면 → 부모와의 갈등/이별 가능성
• 시주에 충(沖)이 있으면 → 자녀와의 관계 어려움
• 인성 강함(3+) → 부모 덕/정서적 지지 많음
• 인성 없음/약함 → 자수성가/독립심 강함
• 비겁 강함(3+) → 형제간 경쟁/협력 많음
• 식상 강함(3+) → 자녀복/표현력 좋음
• Moon 4하우스 → 가정 중심 성향
• Saturn 4하우스 → 가정에서의 책임/제한
`
      : ''

  // ========== 오늘 운세 전용 분석 (today theme) ==========
  const todayAnalysisSection =
    theme === 'today'
      ? `
═══════════════════════════════════════
📅 오늘의 운세 분석 데이터 (今日運勢 TODAY'S FORTUNE)
═══════════════════════════════════════

[사주 일간(日干) 흐름]
• 본인 일간: ${actualDayMaster} (${actualDayMasterElement})
• 현재 월운(月運): ${currentMonthly?.ganji ?? '-'} (${currentMonthly?.element ?? '-'})
• 일간 vs 월운 관계: ${actualDayMasterElement} 기준 ${currentMonthly?.element ?? '-'}의 십신 확인
• 길한 오행(용신): ${yongsinPrimary} → 이 오행 에너지가 강한 날 좋음
• 주의 오행(기신): ${yongsinAvoid} → 이 오행 에너지가 강한 날 주의

[점성술 트랜짓(Transit) 흐름]
• 현재 주요 트랜짓: ${significantTransits || '특별한 배치 없음'}
• Lunar Return 테마: ${lunarReturnText}
• 출생 달(Moon) 사인: ${moon?.sign ?? '-'} → 기본 감정 성향
• 트랜짓 달 → 현재 감정/직관 에너지

[오늘 해석 가이드]
• 트랜짓 행성이 네이탈과 조화각(트라인/섹스타일) → 순조로운 흐름
• 트랜짓 행성이 네이탈과 긴장각(스퀘어/오포지션) → 도전/성장 기회
• 트랜짓 달의 하우스 → 오늘 감정적 초점이 맞춰지는 영역
• 오늘 천간과 일간의 관계 → 하루 에너지 파악
• 용신 에너지 날 → 컨디션 좋음, 기신 에너지 날 → 컨디션 저하
`
      : ''

  // ========== 이달 운세 전용 분석 (month theme) ==========
  const monthAnalysisSection =
    theme === 'month'
      ? `
═══════════════════════════════════════
📆 이달의 운세 분석 데이터 (本月運勢 THIS MONTH'S FORTUNE)
═══════════════════════════════════════

[사주 월운(月運) 분석]
• 본인 일간: ${actualDayMaster} (${actualDayMasterElement})
• 현재 월운: ${currentMonthly?.ganji ?? '-'} (${currentMonthly?.element ?? '-'})
• 일간 vs 월운: ${actualDayMasterElement}일간에게 ${currentMonthly?.element ?? '-'}은 어떤 십신?
• 용신(用神): ${yongsinPrimary} → 이 오행 월운이면 좋은 달
• 기신(忌神): ${yongsinAvoid} → 이 오행 월운이면 주의 필요
• 향후 월운 흐름:
${futureMonthlyList || '데이터 없음'}

[점성술 Lunar Return 분석]
• Lunar Return 차트: ${lunarReturnText}
• LR ASC(어센던트) → 이달의 페르소나/분위기
• LR Moon House → 이달 감정이 집중되는 영역
• 현재 트랜짓: ${significantTransits || '특별한 배치 없음'}

[이달 해석 가이드]
• 월운 오행 = 용신 → 에너지 상승, 기회의 달
• 월운 오행 = 기신 → 에너지 저하, 신중해야 할 달
• 월운 오행 = 비겁(동일 오행) → 경쟁 심화, 협력 필요
• 월운 천간이 일간과 합(合) → 새로운 인연/기회
• LR 1하우스 강조 → 자아 성장의 달
• LR 7하우스 강조 → 관계 중심의 달
• LR 10하우스 강조 → 커리어 중요한 달
`
      : ''

  // ========== 올해 운세 전용 분석 (year theme) ==========
  const yearAnalysisSection =
    theme === 'year'
      ? `
═══════════════════════════════════════
🗓️ 올해의 운세 분석 데이터 (年運 THIS YEAR'S FORTUNE)
═══════════════════════════════════════

[사주 세운(歲運) + 대운(大運) 분석]
• 본인 일간: ${actualDayMaster} (${actualDayMasterElement})
• ${currentYear}년 세운: ${currentAnnual?.ganji ?? '-'} (${currentAnnual?.element ?? '-'})
• 현재 대운(10년 단위): ${daeunText}
• 일간 vs 세운: ${actualDayMasterElement}일간에게 ${currentAnnual?.element ?? '-'}은 어떤 십신?
• 용신(用神): ${yongsinPrimary} → 이 오행 세운이면 발전의 해
• 기신(忌神): ${yongsinAvoid} → 이 오행 세운이면 정리의 해
• 향후 연운 흐름:
${futureAnnualList || '데이터 없음'}

[점성술 Solar Return + Progressions 분석]
• Solar Return 차트: ${solarReturnText}
• SR ASC → 올해의 페르소나/대외 이미지
• SR Sun House → 올해 에너지가 집중되는 영역
• SR Moon House → 올해 감정이 집중되는 영역
• Progressions: ${progressionsText}
• Progressed Moon Phase → 29.5년 주기 중 현재 위치
• Progressed Moon Sign → 현재 내면의 성장 테마

[올해 해석 가이드]
• 세운 = 용신 → 성장/확장/기회의 해
• 세운 = 기신 → 내면 성장/정리/준비의 해
• 세운이 일간과 합(合) → 큰 인연/변화의 해
• 세운이 일간과 충(沖) → 도전/이별/전환의 해
• 대운 첫해/마지막해 → 10년 테마 전환점
• SR Sun 1하우스 → 자아 재정립의 해
• SR Sun 7하우스 → 관계 중심의 해
• SR Sun 10하우스 → 커리어 중요한 해
• Progressed New Moon → 새 시작, Full Moon → 절정/수확
`
      : ''

  // ========== 인생 종합 전용 분석 (life theme) ==========
  const lifeAnalysisSection =
    theme === 'life'
      ? `
═══════════════════════════════════════
🌟 인생 종합 분석 데이터 (人生綜合 LIFE PURPOSE ANALYSIS)
═══════════════════════════════════════

[대운(大運) 인생 흐름 - 10년 단위]
${allDaeunText || '데이터 없음'}

[사주 핵심 운명 코드 - 四柱 命理]
• 일주(日主): ${actualDayMaster} (${actualDayMasterElement}) - 본질적 자아
• 격국(格局): ${geokgukText} - ${geokgukDesc}
• 용신(用神): ${yongsinPrimary} - 인생에서 필요한 에너지
• 희신(喜神): ${yongsinSecondary} - 용신을 돕는 보조 에너지
• 기신(忌神): ${yongsinAvoid} - 피해야 할/조심해야 할 에너지
• 십신 강점: ${sibsinDominant}
• 십신 보완점: ${sibsinMissing}

[점성술 영혼 분석 - SOUL PURPOSE]
• North Node(북노드/라후): ${northNode?.sign ?? '-'} (${northNode?.house ?? '-'}하우스) - 이번 생의 목표/성장 방향
• South Node(남노드/케투): ${northNode?.sign ? `대칭 사인` : '-'} - 전생의 익숙함/버려야 할 패턴
• Chiron(카이론): ${chiron ? `${chiron.sign} (${chiron.house}하우스)` : '-'} - 상처와 치유의 여정
• Pluto(명왕성): ${pluto?.sign ?? '-'} (${pluto?.house ?? '-'}하우스) - 변환/재탄생의 영역
• Saturn(토성): ${saturn?.sign ?? '-'} (${saturn?.house ?? '-'}하우스) - 인생의 과제/카르마
• Draconic Chart: ${draconicText} - 영혼 레벨의 청사진

[인생 주요 전환점 시기]
• 대운 전환기(10년마다): 삶의 테마가 바뀌는 시기
• 토성 회귀(29세, 58세): 인생 성숙의 관문
• 카이론 회귀(50세): 상처 치유와 지혜의 시기
• 명왕성 스퀘어(37-38세): 중년 변환기
• 북노드 회귀(18-19세, 37-38세, 56세): 운명적 만남/결정

[인생 해석 가이드]
• 용신 대운 → 발전/성장/기회의 10년
• 기신 대운 → 내면 성찰/정리/준비의 10년
• North Node House → 이번 생에서 발전시켜야 할 영역
• South Node House → 익숙하지만 집착하면 안 되는 영역
• Chiron House → 상처를 통해 타인을 치유할 수 있는 영역
• Pluto House → 완전히 변환되어야 할 삶의 영역
• 격국 + MC → 사회적 역할과 내면 성향의 조화
• 용신 + North Node → 동서양 운명학의 공통 성장 방향
`
      : ''

  // ========== BUILD FINAL PROMPT ==========
  return `
[COMPREHENSIVE DATA SNAPSHOT v3.1 - ${theme}]
Locale: ${lang}

📌 사용자 기본 정보
───────────────────────────────────────
생년: ${birthYear}년생
현재 만 나이: ${currentAge}세
오늘 날짜: ${currentYear}년 ${currentMonth}월

⚠️⚠️⚠️ CRITICAL DATA ACCURACY RULES ⚠️⚠️⚠️
═══════════════════════════════════════════════════════════════
1. 대운/세운/월운 등 운세 데이터는 반드시 아래 제공된 데이터만 사용하세요.
2. 절대로 대운 간지를 추측하거나 만들어내지 마세요!
3. "현재 대운" 정보는 아래 "현재 장기 흐름" 섹션을 정확히 참조하세요.
4. 질문에서 특정 나이나 시기를 물으면, 아래 "전체 장기 흐름" 목록에서 해당 나이 범위의 대운을 찾아 답변하세요.
5. 데이터에 없는 정보는 "해당 정보가 데이터에 없습니다"라고 솔직히 말하세요.

NEVER fabricate 대운/운세 data! ONLY use exact data from sections below!
═══════════════════════════════════════════════════════════════

════════════════════════════════════════════════════════════════
PART 1: 사주팔자 동양 운명 분석 (四柱八字 EASTERN DESTINY ANALYSIS)
════════════════════════════════════════════════════════════════

⚠️ 일주(日主) 핵심 정체성 / 사주 팔자
───────────────────────────────────────
일주(日主) / Day Master: ${actualDayMaster} (${actualDayMasterElement})
사주 팔자(四柱八字) / Four Pillars: ${pillarText}
신강/신약(身强身弱): ${strengthText}
격국(格局) / 성향 유형: ${geokgukText}
용신(用神) / 핵심 에너지: ${yongsinPrimary} | 희신(喜神) 보조: ${yongsinSecondary} | 기신(忌神) 주의: ${yongsinAvoid}
통근(通根) 뿌리 연결: ${tonggeunText}
투출(透出) 표출: ${tuechulText}
회국(會局) 결합: ${hoegukText}
득령(得令) 시기 조화: ${deukryeongText}

📊 십신(十神) 에너지 분포 (Energy Distribution)
───────────────────────────────────────
십신 분포: ${sibsinDistText || '-'}
주요 에너지: ${sibsinDominant}
부족 에너지: ${sibsinMissing}
인간관계 패턴: ${relationshipText}
직업 적성: ${careerText}

🔄 형충회합(刑沖會合) 에너지 상호작용
───────────────────────────────────────
충(沖) 충돌: ${chungText}
합(合) 조화: ${hapText}
삼합(三合) 삼중 조화: ${samhapText}

🔮 신살(神煞) 길흉 에너지
───────────────────────────────────────
길신(吉神): ${lucky || '-'}
흉신(凶神): ${unlucky || '-'}

📅 대운(大運)/세운(歲運)/월운(月運) 현재 흐름
───────────────────────────────────────
현재 대운(大運): ${daeunText}
${currentYear}년 세운(歲運): ${currentAnnual?.element ?? '-'} (${currentAnnual?.ganji ?? ''})
${currentYear}년 ${currentMonth}월 월운(月運): ${currentMonthly?.element ?? '-'}

🔮 미래 예측용 운세 데이터 (Future Predictions)
───────────────────────────────────────
[전체 장기 흐름 - 10년 주기]
  ${allDaeunText || '데이터 없음'}

[향후 5년 연간 운세]
  ${futureAnnualList || '데이터 없음'}

[향후 12개월 월간 흐름]
  ${futureMonthlyList || '데이터 없음'}

⚠️ 미래 예측 시 활용:
- "연애는 언제?" → 연간/월간 흐름에서 연애 에너지, 금성 트랜짓 시기 분석
- "결혼 시기?" → 장기 흐름 전환점, 7하우스 트랜짓, 파트너 에너지 활성화 시기
- "취업/이직?" → 연간 흐름에서 직업 에너지 활성화, MC 트랜짓 시기
- "재물운?" → 재물 에너지 활성화, 2하우스/8하우스 트랜짓

🏥 건강/종합 점수
───────────────────────────────────────
건강 취약점: ${healthWeak}
종합 점수: ${scoreText}
${jonggeokText ? `특수 성향: ${jonggeokText}` : ''}
${iljuText ? `핵심 성격: ${iljuText}` : ''}
${gongmangText ? `빈 에너지: ${gongmangText}` : ''}

════════════════════════════════════════════════════════════════
PART 2: 서양 점성술 (WESTERN ASTROLOGY)
════════════════════════════════════════════════════════════════

🌟 핵심 행성 배치 (Core Planets)
───────────────────────────────────────
ASC: ${ascendant?.sign ?? '-'} | MC: ${mc?.sign ?? '-'}
Sun: ${sun?.sign ?? '-'} (H${sun?.house ?? '-'})
Moon: ${moon?.sign ?? '-'} (H${moon?.house ?? '-'})
Mercury: ${mercury?.sign ?? '-'} (H${mercury?.house ?? '-'})
Venus: ${venus?.sign ?? '-'} (H${venus?.house ?? '-'})
Mars: ${mars?.sign ?? '-'} (H${mars?.house ?? '-'})
Jupiter: ${jupiter?.sign ?? '-'} (H${jupiter?.house ?? '-'})
Saturn: ${saturn?.sign ?? '-'} (H${saturn?.house ?? '-'})
Uranus: ${uranus?.sign ?? '-'} (H${uranus?.house ?? '-'})
Neptune: ${neptune?.sign ?? '-'} (H${neptune?.house ?? '-'})
Pluto: ${pluto?.sign ?? '-'} (H${pluto?.house ?? '-'})
North Node: ${northNode?.sign ?? '-'} (H${northNode?.house ?? '-'})
Elements: ${elements || '-'}

All Planets: ${planetLines}
Houses: ${houseLines}
Major Aspects: ${aspectLines}
Current Transits: ${significantTransits || '-'}

🔮 Extra Points (특수점)
───────────────────────────────────────
${extraPointsText}

🌠 Asteroids (소행성)
───────────────────────────────────────
${asteroidsText}
Asteroid Aspects: ${asteroidAspectsText}

════════════════════════════════════════════════════════════════
PART 3: 고급 점성 분석 (ADVANCED ASTROLOGY)
════════════════════════════════════════════════════════════════

☀️ Solar Return (연간 차트 - ${currentYear})
───────────────────────────────────────
${solarReturnText}

🌙 Lunar Return (월간 차트)
───────────────────────────────────────
${lunarReturnText}

📈 프로그레션 Progressions (진행 차트 / 2차 진행법)
───────────────────────────────────────
${progressionsText}
${progressionDetailText}

🐉 Draconic Chart (드라코닉 - 영혼 차트)
───────────────────────────────────────
${draconicText}

🎵 Harmonics (하모닉 분석)
───────────────────────────────────────
Profile: ${harmonicsText}
Charts: ${harmonicChartsText}

⭐ Fixed Stars (항성)
───────────────────────────────────────
${fixedStarsText}

🌑 Eclipses (일/월식 영향)
───────────────────────────────────────
${eclipsesText}

📆 Electional (택일 분석)
───────────────────────────────────────
${electionalText}

🎯 Midpoints (미드포인트)
───────────────────────────────────────
Key: ${midpointsText}
All: ${allMidpointsText}
${loveAnalysisSection}${careerAnalysisSection}${healthAnalysisSection}${familyAnalysisSection}${todayAnalysisSection}${monthAnalysisSection}${yearAnalysisSection}${lifeAnalysisSection}
════════════════════════════════════════════════════════════════
PART 4: 동서양 융합 해석 가이드 (EAST-WEST SYNTHESIS)
════════════════════════════════════════════════════════════════

🔗 사주-점성술 대응 관계
───────────────────────────────────────
• 일간(日干) ↔ 태양(Sun): 핵심 정체성/자아
• 월간(月干) ↔ 달(Moon): 감정/내면/어머니
• 격국(格局) ↔ ASC(어센던트): 성향/페르소나
• 용신(用神) ↔ 가장 조화로운 행성: 필요한 에너지
• 대운(大運) ↔ 프로그레션(Progressed): 장기 흐름
• 세운(歲運) ↔ Solar Return: 연간 테마
• 월운(月運) ↔ Lunar Return: 월간 테마
• 신살(神煞) ↔ 항성(Fixed Stars): 특수 영향력

🎯 현재 트랜짓 해석 가이드
───────────────────────────────────────
현재 트랜짓: ${significantTransits || '특별한 배치 없음'}

[트랜짓 어스팩트별 의미]
• conjunction(합): 강력한 활성화, 새로운 시작
• trine(삼합): 순조로운 흐름, 기회
• sextile(육합): 가벼운 기회, 노력하면 성과
• square(사각): 도전/긴장, 성장 동력
• opposition(충): 관계 긴장, 균형 필요

[주요 트랜짓 행성별 의미]
• TR Jupiter: 확장/기회/행운 (약 1년 영향)
• TR Saturn: 책임/제한/성숙 (약 2.5년 영향)
• TR Uranus: 급변/혁신/자유 (약 7년 영향)
• TR Neptune: 영감/혼란/영성 (약 14년 영향)
• TR Pluto: 변환/재탄생/권력 (약 20년+ 영향)

🌊 융합 해석 핵심 원칙
───────────────────────────────────────
1. 일간 오행 + Sun Sign = 핵심 성격 융합
   - ${actualDayMaster}(${actualDayMasterElement}) + ${sun?.sign ?? '-'} = 이 사람의 본질

2. 용신 + 트랜짓 = 시기 판단
   - 용신(${yongsinPrimary}) 에너지가 활성화되는 트랜짓 = 좋은 시기
   - 기신(${yongsinAvoid}) 에너지가 활성화되는 트랜짓 = 주의 시기

3. 대운/세운 + 프로그레션/Solar Return = 인생 흐름
   - 동양: ${daeunText}
   - 서양: ${progressionsText !== '-' ? progressionsText : '프로그레션 데이터 확인'}

4. 십신 분포 + 하우스 배치 = 구체적 영역
   - 관성 많음 + 10하우스 강조 = 조직 내 성공
   - 재성 많음 + 2하우스 강조 = 재물 축적
   - 식상 많음 + 5하우스 강조 = 창의적 표현

⚡ 질문 유형별 분석 포인트
───────────────────────────────────────
[연애/결혼 질문]
→ 사주: 배우자궁(일지), 정재/편재(남), 정관/편관(여), 도화살
→ 점성: Venus, Mars, 5th/7th House, Juno, 금성 트랜짓

[직업/재물 질문]
→ 사주: 격국, 용신, 관성/재성/식상 분포, 대운 흐름
→ 점성: MC, 10th House, Saturn, Jupiter, 2nd/6th House

[건강 질문]
→ 사주: 오행 균형, 부족 오행 → 장기, 형충 스트레스
→ 점성: 6th House, Mars, Saturn, Chiron, 화성 트랜짓

[타이밍/시기 질문]
→ 사주: 대운 전환기, 세운/월운 흐름, 용신 에너지 시기
→ 점성: 트랜짓, 프로그레션, Solar/Lunar Return, 일/월식

════════════════════════════════════════════════════════════════
`.trim()
}

export const buildBasePrompt = buildAllDataPrompt

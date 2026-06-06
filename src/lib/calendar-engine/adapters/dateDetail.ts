/**
 * date-detail adapter — v2 캘린더 엔진 출력을 캘린더 UI / 타로 LLM 컨텍스트가
 * 기대하는 응답 형태로 변환.
 *
 * 옛 date-detail 라우트는 timing/·fusion adapter·analyzers 거대 체인을 거쳤지만,
 * 클라이언트가 진짜 쓰는 필드는 한정적이라 v2 NatalContext + CalendarCell 다발에서
 * 모두 derive 가능. 이 모듈이 그 변환을 책임진다.
 */
import type { CalendarCell, ActiveSignal } from '../types'
import type { NatalContext } from '../context/types'
import { getGongmang } from '@/lib/saju/pillarLookup'
import { SIBSIN_CAT, deriveCycleTone, deriveAstroTone } from '../derivers/cycleTone'

const ZH_TO_KO_BRANCH: Record<string, string> = {
  子: '자',
  丑: '축',
  寅: '인',
  卯: '묘',
  辰: '진',
  巳: '사',
  午: '오',
  未: '미',
  申: '신',
  酉: '유',
  戌: '술',
  亥: '해',
}
const KO_TO_ZH_BRANCH: Record<string, string> = Object.fromEntries(
  Object.entries(ZH_TO_KO_BRANCH).map(([z, k]) => [k, z])
)

export interface V2DateDetailResponse {
  date: string
  dayCross: {
    overallScore: number
    domainScores: Record<string, number>
    domainCross: Array<{
      theme: string
      sajuScore: number
      astroScore: number
      sajuSummary: string
      astroSummary: string
    }>
    hourly: {
      bestHours: Array<{
        hour: number
        score: number
        topDomain: string | null
        hourPillar?: string
        planetaryHour?: string
      }>
      worstHours: Array<{
        hour: number
        score: number
        topDomain: string | null
        hourPillar?: string
        planetaryHour?: string
      }>
      /**
       * 시진 24h 전체 breakdown — Day tier 가 24 시진 라인업을 그리려 best/worst top-N 만으로는
       * 부족하다. 0~23시 각 시점의 score / topTheme / hourPillar 를 한 줄씩 노출.
       * (별도 시진 emit 명시 — destinypal Day 페이지 spec.)
       */
      all24: Array<{
        hour: number
        score: number
        topDomain: string | null
        themeScores: Partial<Record<string, number>>
      }>
    }
    advice: { do: string[]; avoid: string[] }
    confidence: number
    agreement: number
  }
  transit: {
    aspects: Array<{
      transitPlanet: string
      natalPoint: string
      aspect: string
      orb: number
      isApplying: boolean
    }>
  }
  natalContext: {
    yongsin: { primary: string }
    strength: string
  }
  currentDaeun?: {
    label: string
    sibsinCheon?: string
    sibsinJi?: string
  }
  natalAngles: Record<string, { sign?: string; formatted?: string } | undefined>
  sajuExtras: {
    tenGodCounts: Record<string, number>
    fiveElements: { wood: number; fire: number; earth: number; metal: number; water: number }
  }
  shinsalActive: Array<{ name: string; type: string; affectedArea: string }>
  gongmangStatus: { isAffected: boolean; areas: string[] }
  /** 그날 주요 점성 transit (행성명 한글화). 일 탭 '오늘의 점성' 카드. */
  astroHighlights: Array<{ text: string; good: boolean }>
  /** 오늘 순탄/고비 한 줄 — 일진 십신 × 용신(cycleTone, 다른 탭과 동일 규칙) */
  dayTone?: string
  /** 오늘 점성 순탄/고비 한 줄 — 그날 본명 aspect 우호/마찰 (사주 dayTone 과 짝) */
  dayAstroTone?: string
  /**
   * 그날 활성 신호 전체 (cat/source/polarity/weight 포함) — Day tier 가 사주·점성·
   * cross 페어 모두 표시하려 raw 신호 dump 가 필요. allSignals = 사주 + 점성 + cross.
   * 각 요소: { id, source, cat(=kind), name, korean?, themes, polarity, layer, weight,
   * active }. evidence 는 includeEvidence true 일 때만 포함.
   */
  signalsRaw: Array<{
    id: string
    source: 'saju' | 'astro'
    cat: string // kind alias (Day tier 용)
    kind: string
    name: string
    korean?: string
    themes: string[]
    polarity: number
    layer: string
    weight: number
    active: { start: string; peak: string; end: string }
    evidence?: Record<string, unknown>
  }>
}

export interface BuildDateDetailInput {
  natal: NatalContext
  dayCell: CalendarCell
  hourlyCells: CalendarCell[]
  date: string
  birthYear: number
  lang?: 'ko' | 'en'
}

export function buildDateDetailResponse(input: BuildDateDetailInput): V2DateDetailResponse {
  const { natal, dayCell, hourlyCells, date, birthYear, lang = 'ko' } = input

  return {
    date,
    dayCross: buildDayCross(dayCell, hourlyCells),
    transit: buildTransit(dayCell),
    natalContext: {
      yongsin: { primary: natal.saju.yongsin.primary },
      strength: natal.saju.strength,
    },
    currentDaeun: buildCurrentDaeun(natal, date, birthYear),
    natalAngles: buildNatalAngles(natal),
    sajuExtras: buildSajuExtras(natal),
    shinsalActive: buildShinsalActive(dayCell, lang),
    gongmangStatus: buildGongmangStatus(natal, dayCell),
    astroHighlights: buildAstroHighlights(dayCell, lang),
    dayTone: buildDayTone(natal, dayCell, lang),
    dayAstroTone: lang === 'ko' ? deriveAstroTone('day', dayCell.signals) : undefined,
    signalsRaw: buildSignalsRaw(dayCell),
  }
}

// ──────────────────────────────────────────────────────────────────────
// signalsRaw — 그날 활성 신호 전체 dump (Day tier 가 cat/source/polarity/weight 다 표시)
// ──────────────────────────────────────────────────────────────────────

function buildSignalsRaw(
  dayCell: CalendarCell
): V2DateDetailResponse['signalsRaw'] {
  const out: V2DateDetailResponse['signalsRaw'] = []
  for (const s of dayCell.signals) {
    out.push({
      id: s.id,
      source: s.source,
      cat: s.kind, // destinypal Day tier 호환 alias
      kind: s.kind,
      name: s.name,
      korean: s.korean,
      themes: [...s.themes],
      polarity: s.polarity,
      layer: s.layer,
      weight: s.weight,
      active: { start: s.active.start, peak: s.active.peak, end: s.active.end },
      evidence: s.evidence as unknown as Record<string, unknown>,
    })
  }
  return out
}

// 오늘 순탄/고비 — 일진(daily layer) 십신 × 신강·신약. 다른 탭과 같은 cycleTone 규칙.
function buildDayTone(
  natal: NatalContext,
  dayCell: CalendarCell,
  lang: 'ko' | 'en'
): string | undefined {
  if (lang !== 'ko') return undefined
  for (const s of dayCell.signals) {
    const sib = s.evidence?.sibsin as string | undefined
    if (s.layer === 'daily' && sib && SIBSIN_CAT[sib]) {
      const element = s.evidence?.element as string | undefined
      return deriveCycleTone('day', natal.saju?.strength, SIBSIN_CAT[sib], element, natal.saju?.yongsin)
    }
  }
  return undefined
}

// ──────────────────────────────────────────────────────────────────────
// astroHighlights — 그날 주요 점성 transit (신호 korean 에서, 행성/포인트 한글화)
// ──────────────────────────────────────────────────────────────────────

// 멀티워드(True Node) 먼저 — 단어 단위 치환에서 'Node' 잔존 방지.
const ASTRO_TERM_KO: Array<[RegExp, string]> = [
  [/\bTrue Node\b/g, '북교점'],
  [/\bAscendant\b/g, '상승점'],
  [/\bDescendant\b/g, '하강점'],
  [/\bMC\b/g, '천정'],
  [/\bIC\b/g, '천저'],
  [/\bSun\b/g, '태양'],
  [/\bMoon\b/g, '달'],
  [/\bMercury\b/g, '수성'],
  [/\bVenus\b/g, '금성'],
  [/\bMars\b/g, '화성'],
  [/\bJupiter\b/g, '목성'],
  [/\bSaturn\b/g, '토성'],
  [/\bUranus\b/g, '천왕성'],
  [/\bNeptune\b/g, '해왕성'],
  [/\bPluto\b/g, '명왕성'],
  [/\bChiron\b/g, '카이런'],
  [/\bLilith\b/g, '릴리스'],
]
function koAstroName(name: string): string {
  let s = name
  for (const [re, ko] of ASTRO_TERM_KO) s = s.replace(re, ko)
  return s
}
function buildAstroHighlights(
  dayCell: CalendarCell,
  lang: 'ko' | 'en' = 'ko'
): V2DateDetailResponse['astroHighlights'] {
  // transit aspect(행성↔본명)만 — kind=transit 안에 dignity('금성 엑잘테이션 (Pisces)')도
  // 섞여 있어 '본명' 포함(=natal 포인트와의 aspect)으로 한정. ZR/dignity/별자리 jargon 배제.
  const astro = dayCell.signals.filter(
    (s) =>
      s.source === 'astro' &&
      s.kind === 'transit' &&
      (s.korean ?? '').includes('본명') &&
      Math.abs(s.polarity) * s.weight > 0
  )
  astro.sort((a, b) => Math.abs(b.polarity) * b.weight - Math.abs(a.polarity) * a.weight)
  const out: V2DateDetailResponse['astroHighlights'] = []
  const seen = new Set<string>()
  for (const s of astro) {
    const raw = (lang === 'ko' ? (s.korean ?? s.name) : s.name) || ''
    const text = lang === 'ko' ? koAstroName(raw) : raw
    if (!text || seen.has(text)) continue
    seen.add(text)
    out.push({ text, good: s.polarity > 0 })
    if (out.length >= 4) break
  }
  return out
}

// ──────────────────────────────────────────────────────────────────────
// dayCross — overall + domain × saju/astro 축 분리 + hourly + advice
// ──────────────────────────────────────────────────────────────────────

function buildDayCross(
  dayCell: CalendarCell,
  hourlyCells: CalendarCell[]
): V2DateDetailResponse['dayCross'] {
  const overallScore = Math.round(dayCell.derivedScore)
  const domainScores: Record<string, number> = {}
  for (const [theme, score] of Object.entries(dayCell.themeScores)) {
    if (typeof score === 'number') domainScores[mapThemeToLegacy(theme)] = Math.round(score)
  }

  // domainCross — 각 테마별 saju 축 vs astro 축 신호 강도 + 텍스트 요약
  const domainCross: V2DateDetailResponse['dayCross']['domainCross'] = []
  const themesInPlay = Object.keys(dayCell.themeScores)
  for (const theme of themesInPlay) {
    const sajuSigs = dayCell.signals.filter(
      (s) => s.source === 'saju' && s.themes.includes(theme as never)
    )
    const astroSigs = dayCell.signals.filter(
      (s) => s.source === 'astro' && s.themes.includes(theme as never)
    )
    domainCross.push({
      theme: mapThemeToLegacy(theme),
      sajuScore: scoreFromSignals(sajuSigs),
      astroScore: scoreFromSignals(astroSigs),
      sajuSummary: summarizeSignals(sajuSigs) || '사주 신호 없음',
      astroSummary: summarizeSignals(astroSigs) || '점성 신호 없음',
    })
  }

  // hourly — 24h cells에서 best/worst 추출
  const bestHours = hourlyCells
    .map((c) => ({
      hour: new Date(c.datetime).getUTCHours(),
      score: Math.round(c.derivedScore),
      topDomain: topThemeOfCell(c),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
  const worstHours = [...hourlyCells]
    .map((c) => ({
      hour: new Date(c.datetime).getUTCHours(),
      score: Math.round(c.derivedScore),
      topDomain: topThemeOfCell(c),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
  // all24 — 0..23 시진 전체 라인업 (destinypal Day tier 시진 카드). 같은 hourlyCells
  // 에서 hour 순으로 정렬 + themeScores 통째로.
  const all24 = hourlyCells
    .map((c) => ({
      hour: new Date(c.datetime).getUTCHours(),
      score: Math.round(c.derivedScore),
      topDomain: topThemeOfCell(c),
      themeScores: { ...c.themeScores } as Partial<Record<string, number>>,
    }))
    .sort((a, b) => a.hour - b.hour)

  // advice — 시간대 카드(DayHourly)의 추진/보류 리스트.
  // 옛 구현은 matchedPatterns.action 을 그대로 복사했는데,
  // DayDomains chip 의 action 과 같은 문장이 2번 나와 중복.
  // 시그널 단위 요약(topReasons / cautions)을 써서 출처를 분리한다.
  const doList = dayCell.topReasons.slice(0, 3)
  const avoidList = dayCell.cautions.slice(0, 3)

  // confidence / agreement
  // confidence = 활성 신호 개수 기반 (많을수록 신뢰도 높음)
  const confidence = Math.min(100, Math.round((dayCell.signals.length / 20) * 100))
  // agreement = saju vs astro 점수 차이 역수
  const sajuAvg = avgPolarity(dayCell.signals.filter((s) => s.source === 'saju'))
  const astroAvg = avgPolarity(dayCell.signals.filter((s) => s.source === 'astro'))
  const diff = Math.abs(sajuAvg - astroAvg)
  const agreement = Math.max(0, Math.round(100 - diff * 25))

  return {
    overallScore,
    domainScores,
    domainCross,
    hourly: { bestHours, worstHours, all24 },
    advice: { do: doList.slice(0, 3), avoid: avoidList.slice(0, 3) },
    confidence,
    agreement,
  }
}

function scoreFromSignals(sigs: ActiveSignal[]): number {
  if (sigs.length === 0) return 50
  const sum = sigs.reduce((acc, s) => acc + s.polarity * s.weight, 0)
  return Math.max(0, Math.min(100, Math.round(50 + sum * 8)))
}

function summarizeSignals(sigs: ActiveSignal[]): string {
  if (sigs.length === 0) return ''
  const top = [...sigs].sort(
    (a, b) => Math.abs(b.polarity) * b.weight - Math.abs(a.polarity) * a.weight
  )[0]
  return top.korean || top.name
}

function topThemeOfCell(cell: CalendarCell): string | null {
  const entries = Object.entries(cell.themeScores)
  if (entries.length === 0) return null
  entries.sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
  return mapThemeToLegacy(entries[0][0])
}

function avgPolarity(sigs: ActiveSignal[]): number {
  if (sigs.length === 0) return 0
  return sigs.reduce((acc, s) => acc + s.polarity * s.weight, 0) / sigs.length
}

// ──────────────────────────────────────────────────────────────────────
// transit — astro 신호에서 aspect 추출
// ──────────────────────────────────────────────────────────────────────

function buildTransit(dayCell: CalendarCell): V2DateDetailResponse['transit'] {
  const aspects: V2DateDetailResponse['transit']['aspects'] = []
  for (const s of dayCell.signals) {
    if (s.source !== 'astro' || s.kind !== 'transit') continue
    const d = s.evidence.detail as Record<string, unknown>
    aspects.push({
      transitPlanet: String(d.transitPlanet ?? d.planet ?? ''),
      natalPoint: String(d.natalPoint ?? d.target ?? ''),
      aspect: String(d.aspect ?? d.type ?? ''),
      orb: typeof d.orb === 'number' ? d.orb : 0,
      isApplying: Boolean(d.isApplying ?? false),
    })
  }
  return { aspects }
}

// ──────────────────────────────────────────────────────────────────────
// natalAngles — 본명 차트에서 행성/하우스 sign 추출
// ──────────────────────────────────────────────────────────────────────

function buildNatalAngles(natal: NatalContext): V2DateDetailResponse['natalAngles'] {
  const chart = natal.astro.chart
  const angles: V2DateDetailResponse['natalAngles'] = {}
  const findPlanet = (name: string) => chart.planets?.find((p) => p.name === name)
  const pick = (p?: { sign?: string; degree?: number }) => {
    if (!p?.sign) return undefined
    return {
      sign: p.sign,
      formatted: p.degree != null ? `${p.sign} ${Math.floor(p.degree)}°` : p.sign,
    }
  }
  angles.sun = pick(findPlanet('Sun'))
  angles.moon = pick(findPlanet('Moon'))
  angles.ascendant = chart.ascendant?.sign
    ? { sign: chart.ascendant.sign, formatted: chart.ascendant.sign }
    : undefined
  angles.mercury = pick(findPlanet('Mercury'))
  angles.venus = pick(findPlanet('Venus'))
  angles.mars = pick(findPlanet('Mars'))
  angles.jupiter = pick(findPlanet('Jupiter'))
  angles.saturn = pick(findPlanet('Saturn'))
  angles.neptune = pick(findPlanet('Neptune'))
  angles.northNode = pick(findPlanet('North Node') ?? findPlanet('NorthNode'))
  angles.mc = chart.mc?.sign ? { sign: chart.mc.sign, formatted: chart.mc.sign } : undefined
  const houseBy = (n: number) => {
    const h = chart.houses?.[n - 1]
    return h?.sign ? { sign: h.sign } : undefined
  }
  angles.house2 = houseBy(2)
  angles.house6 = houseBy(6)
  angles.house7 = houseBy(7)
  angles.house9 = houseBy(9)
  angles.house10 = houseBy(10)
  return angles
}

// ──────────────────────────────────────────────────────────────────────
// sajuExtras — 십신 분포 + 오행 분포 (4기둥)
// ──────────────────────────────────────────────────────────────────────

function buildSajuExtras(natal: NatalContext): V2DateDetailResponse['sajuExtras'] {
  const tenGodCounts: Record<string, number> = {}
  const fiveElements: Record<string, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  const pillars = natal.saju.pillars
  for (const p of [pillars.year, pillars.month, pillars.day, pillars.time]) {
    const stemSibsin =
      typeof p.heavenlyStem.sibsin === 'string'
        ? p.heavenlyStem.sibsin
        : String(p.heavenlyStem.sibsin)
    const branchSibsin =
      typeof p.earthlyBranch.sibsin === 'string'
        ? p.earthlyBranch.sibsin
        : String(p.earthlyBranch.sibsin)
    if (stemSibsin) tenGodCounts[stemSibsin] = (tenGodCounts[stemSibsin] || 0) + 1
    if (branchSibsin) tenGodCounts[branchSibsin] = (tenGodCounts[branchSibsin] || 0) + 1
    fiveElements[p.heavenlyStem.element] = (fiveElements[p.heavenlyStem.element] || 0) + 1
    fiveElements[p.earthlyBranch.element] = (fiveElements[p.earthlyBranch.element] || 0) + 1
  }
  return {
    tenGodCounts,
    fiveElements: {
      wood: fiveElements.wood,
      fire: fiveElements.fire,
      earth: fiveElements.earth,
      metal: fiveElements.metal,
      water: fiveElements.water,
    },
  }
}

// ──────────────────────────────────────────────────────────────────────
// currentDaeun — 현재 나이로 매칭
// ──────────────────────────────────────────────────────────────────────

function buildCurrentDaeun(
  natal: NatalContext,
  date: string,
  birthYear: number
): V2DateDetailResponse['currentDaeun'] {
  const year = parseInt(date.slice(0, 4), 10)
  // 대운 startAge 는 만 나이 기준 — daeunAge.ts SSOT (2026-06: +1 제거, 사주/점성
  // 전체를 만 나이로 통일). build.ts 도 startYear=birthYear+age 로 일관.
  const manAge = year - birthYear
  const list = natal.saju.daeun
  if (!list || list.length === 0) return undefined
  let current = list[0]
  for (const d of list) {
    if (d.startAge <= manAge) current = d
    else break
  }
  return {
    label: `${current.stem}${current.branch}`,
    sibsinCheon: undefined, // 대운 sibsin은 v2 NatalContext에 없음 (옛 응답 호환용 빈 필드)
    sibsinJi: undefined,
  }
}

// ──────────────────────────────────────────────────────────────────────
// shinsalActive — 그 날 발동된 신살
// ──────────────────────────────────────────────────────────────────────

// 신살 KO → EN 사전 — 대표 신살만. 못 찾은 것은 KO 그대로 (graceful).
const SHINSAL_EN: Record<string, string> = {
  도화: 'Romance star',
  천을귀인: 'Heavenly nobleman',
  역마: 'Wanderer star',
  화개: 'Solitary scholar',
  양인: 'Yang blade',
  백호: 'White tiger',
  괴강: 'Magnetic axis',
  천덕귀인: 'Heavenly virtue noble',
  월덕귀인: 'Lunar virtue noble',
  공망: 'Empty void',
  길성: 'Lucky star',
  흉성: 'Unlucky star',
  망신: 'Loss-of-face star',
  겁살: 'Robbery star',
  재살: 'Calamity star',
  천살: 'Heavenly killing',
  월살: 'Monthly killing',
  지살: 'Earthly star',
  장성: 'General star',
  반안: 'Saddle bearer',
  육해: 'Six harms',
  화해: 'Conflict harm',
  년살: 'Annual blade',
  현침: 'Hidden needle',
  고신: 'Lonely widower',
  문창: 'Literary brilliance',
  문곡: 'Literary refinement',
  천의성: 'Healing star',
  학당귀인: 'Scholar nobleman',
  홍염살: 'Crimson flame',
  천라지망: 'Heaven-earth net',
  원진: 'Resentment',
  천주귀인: 'Pillar nobleman',
  암록: 'Hidden prosperity',
  건록: 'Established prosperity',
  제왕: 'Emperor',
  삼재: 'Three calamities',
  태극귀인: 'Tai-chi nobleman',
  금여성: 'Golden chariot',
  천문성: 'Heaven gate',
  귀문관: 'Spirit gate',
  괘살: 'Suspended killing',
  '천을 귀인': 'Heavenly nobleman',
}
const TYPE_EN: Record<string, string> = {
  길신: 'Auspicious',
  흉신: 'Inauspicious',
}

function buildShinsalActive(
  dayCell: CalendarCell,
  lang: 'ko' | 'en' = 'ko'
): V2DateDetailResponse['shinsalActive'] {
  const result: V2DateDetailResponse['shinsalActive'] = []
  for (const s of dayCell.signals) {
    if (s.source !== 'saju' || s.kind !== 'shinsal') continue
    const d = s.evidence.detail as Record<string, unknown>
    const koName = (d.shinsalName as string) || s.name || ''
    if (!koName) continue
    const koType = (d.type as string) || '길신'
    result.push({
      name: lang === 'en' ? (SHINSAL_EN[koName] ?? koName) : koName,
      type: lang === 'en' ? (TYPE_EN[koType] ?? koType) : koType,
      affectedArea: (d.affectedArea as string) || '',
    })
  }
  return result
}

// ──────────────────────────────────────────────────────────────────────
// gongmangStatus — 본명 일주 기반 공망 지지가 그 날 시지/일지에 걸리는지
// ──────────────────────────────────────────────────────────────────────

function buildGongmangStatus(
  natal: NatalContext,
  dayCell: CalendarCell
): V2DateDetailResponse['gongmangStatus'] {
  const dayStem = natal.saju.pillars.day.heavenlyStem.name
  const dayBranch = natal.saju.pillars.day.earthlyBranch.name
  const dayPillar =
    (KO_TO_ZH_BRANCH[dayStem] ?? dayStem) + (KO_TO_ZH_BRANCH[dayBranch] ?? dayBranch)
  const gongmang = getGongmang(dayPillar) ?? []
  if (gongmang.length === 0) return { isAffected: false, areas: [] }
  const koGongmang = gongmang.map((b) => ZH_TO_KO_BRANCH[b] ?? b)

  // 그 날의 일지가 공망 지지에 걸리면 활성
  const todaySignals = dayCell.signals.filter((s) => s.source === 'saju' && s.layer === 'daily')
  const todayBranchHit = todaySignals.some((s) => {
    const d = s.evidence.detail as Record<string, unknown>
    const branch = d.targetBranch as string | undefined
    return branch && koGongmang.includes(branch)
  })
  return {
    isAffected: todayBranchHit,
    areas: todayBranchHit ? koGongmang : [],
  }
}

// ──────────────────────────────────────────────────────────────────────
// theme 키 정규화 — v2 internal key ↔ 옛 응답 형식
// ──────────────────────────────────────────────────────────────────────

const THEME_LEGACY_MAP: Record<string, string> = {
  money: '재물',
  wealth: '재물',
  love: '연애',
  romance: '연애',
  career: '직업',
  work: '직업',
  health: '건강',
  study: '학업',
  fame: '명예',
  travel: '이동',
  family: '가족',
  spirituality: '영성',
  legal: '법무',
  creativity: '창작',
  children: '자녀',
  social: '인맥',
  karma: '카르마',
  reputation: '평판',
}

function mapThemeToLegacy(theme: string): string {
  return THEME_LEGACY_MAP[theme] ?? theme
}

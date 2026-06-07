// src/lib/destiny-map/local-report-generator.ts
// Local template-based report generation (AI 없이 사주/점성 데이터만으로)

/**
 * Permissive shape used by chart summary extractors.
 * 옛 `destiny-map/astrology` 모듈에서 export 되던 `CombinedResult` 의
 * 최소 구조 — 이 파일의 extractSajuData / extractAstroData 가 내부에서
 * 모든 필드를 optional cast 로 다루므로 두 최상위 키만 있으면 충분.
 */
type CombinedResult = {
  saju: Record<string, unknown> | null | undefined
  astrology: Record<string, unknown> | null | undefined
}
import { logger } from '@/lib/logger'
import { getIljuArchetype } from '@/lib/saju/iljuDictionary'
import {
  getGeokgukRich,
  getSibsinCategoryMeaning,
  type SibsinCategory,
} from '@/lib/chart-dictionary'
import { ELEMENT_RELATIONS, ZODIAC_TO_ELEMENT } from '@/lib/calendar/constants'
import { normalizeElement } from '@/lib/calendar/utils'

// ============================================================
// Translation Maps
// ============================================================

/** Five element names */
const ELEMENT_NAMES: Record<string, { ko: string; en: string }> = {
  wood: { ko: '목(木)', en: 'Wood' },
  fire: { ko: '화(火)', en: 'Fire' },
  earth: { ko: '토(土)', en: 'Earth' },
  metal: { ko: '금(金)', en: 'Metal' },
  water: { ko: '수(水)', en: 'Water' },
}

/** Zodiac sign names */
const SIGN_NAMES: Record<string, { ko: string; en: string }> = {
  aries: { ko: '양자리', en: 'Aries' },
  taurus: { ko: '황소자리', en: 'Taurus' },
  gemini: { ko: '쌍둥이자리', en: 'Gemini' },
  cancer: { ko: '게자리', en: 'Cancer' },
  leo: { ko: '사자자리', en: 'Leo' },
  virgo: { ko: '처녀자리', en: 'Virgo' },
  libra: { ko: '천칭자리', en: 'Libra' },
  scorpio: { ko: '전갈자리', en: 'Scorpio' },
  sagittarius: { ko: '사수자리', en: 'Sagittarius' },
  capricorn: { ko: '염소자리', en: 'Capricorn' },
  aquarius: { ko: '물병자리', en: 'Aquarius' },
  pisces: { ko: '물고기자리', en: 'Pisces' },
}

/** Element personality traits */
// 오행 성정(性情) — 명리 五常 (목=仁 / 화=禮 / 토=信 / 금=義 / 수=智) 기반.
// 보고서 톤("…합니다") → 상담사 chat 톤("…에요/이에요")으로 통일.
// "한 줄 해석" 의 두 번째 문장으로 합쳐지므로 마침표 없이 끝남(상위에서 붙임).
const ELEMENT_TRAITS: Record<string, { ko: string; en: string }> = {
  wood: {
    ko: '새로 시작하고 키워가는 면이 강해요. 자라는 방향을 본능적으로 잡고, 굳어버리기보다 뻗어나가는 쪽을 택해요',
    en: 'You have a strong starting-and-growing edge. You instinctively find which way to extend, choosing to stretch rather than settle',
  },
  fire: {
    ko: '환하게 드러나고 사람을 끌어모으는 기운이에요. 표현이 솔직하고, 자리에 활기를 더해요',
    en: 'A bright, drawing-people-in energy. Your expression is candid, and you bring spark to whatever room you enter',
  },
  earth: {
    ko: '중심을 잡고 사이를 잇는 면이에요. 약속을 지키고, 주변이 흔들릴 때도 자기 자리를 지켜요',
    en: 'A grounding, in-between-connecting edge. You keep promises and hold your ground when things around you waver',
  },
  metal: {
    ko: '맺고 끊는 게 분명한 면이에요. 옳다고 본 건 밀고 가고, 흐트러진 걸 정리하는 감각이 좋아요',
    en: 'A clear-cut, decision-making edge. You push through what feels right and have a sharp sense for organizing what got scattered',
  },
  water: {
    ko: '흐름을 읽고 깊이 들여다보는 면이에요. 상황에 잘 녹아들면서도 자기 안의 흐름은 단단해요',
    en: 'A read-the-flow, look-deeper edge. You blend with situations while your inner thread stays firm',
  },
}

// ============================================================
// Data Extraction Helpers
// ============================================================

interface ExtractedSajuData {
  dayMasterName: string
  dayMasterElement: string
  fiveElements: Record<string, number>
  dominantElement: string
  weakestElement: string
}

interface ExtractedAstroData {
  sunSign: string
  moonSign: string
  ascendant: string
}

interface ImportantYear {
  year: number
  age: number
  rating: 1 | 2 | 3 | 4 | 5
  title: string
  sajuReason: string
  astroReason: string
  advice?: string
}

interface StructuredFortune {
  themeSummary?: string
  sections?: Array<{
    id: string
    icon: string
    title: string
    titleEn: string
    content: string
  }>
  lifeTimeline?: {
    description?: string
    importantYears?: ImportantYear[]
  }
  categoryAnalysis?: Record<
    string,
    {
      icon: string
      title: string
      sajuAnalysis: string
      astroAnalysis: string
      crossInsight: string
      keywords?: string[]
    }
  >
  keyInsights?: Array<{
    type: 'strength' | 'opportunity' | 'caution' | 'advice'
    text: string
    icon?: string
  }>
  luckyElements?: { colors?: string[]; directions?: string[]; numbers?: number[]; items?: string[] }
  sajuHighlight?: { pillar: string; element: string; meaning: string }
  astroHighlight?: { planet: string; sign: string; meaning: string }
  characterBuilder?: {
    archetype?: string
    tagline?: string
    personality: string
    conflict: string
    growthArc: string
    keywords?: string[]
  }
}

/**
 * Extract Saju data from various possible structures
 */
function extractSajuData(saju: CombinedResult['saju']): ExtractedSajuData {
  // 일간 정보 추출 - 여러 경로에서 시도
  const dayMasterRaw = saju?.dayMaster || (saju?.facts as Record<string, unknown>)?.dayMaster || {}
  const pillarsDay = (saju?.pillars as Record<string, unknown>)?.day as
    | Record<string, unknown>
    | undefined

  const dayMasterName =
    (dayMasterRaw as Record<string, string>)?.name ||
    (dayMasterRaw as Record<string, string>)?.heavenlyStem ||
    (pillarsDay?.heavenlyStem as Record<string, string>)?.name ||
    'Unknown'

  const dayMasterElement =
    (dayMasterRaw as Record<string, string>)?.element ||
    (pillarsDay?.heavenlyStem as Record<string, string>)?.element ||
    'Unknown'

  // 오행 정보
  const sajuFacts = saju?.facts as { fiveElements?: Record<string, number> } | undefined
  const sajuAny = saju as unknown as Record<string, unknown> | undefined
  const fiveElements =
    (sajuAny?.fiveElements as Record<string, number>) || sajuFacts?.fiveElements || {}

  // Sort elements
  const sorted = Object.entries(fiveElements).sort(([, a], [, b]) => (b as number) - (a as number))

  return {
    dayMasterName,
    dayMasterElement,
    fiveElements,
    dominantElement: sorted[0]?.[0] || 'unknown',
    weakestElement: sorted[sorted.length - 1]?.[0] || 'unknown',
  }
}

/**
 * Extract Astrology data from various possible structures
 */
function extractAstroData(astro: CombinedResult['astrology']): ExtractedAstroData {
  // 태양 별자리
  const sunSign = Array.isArray(astro?.planets)
    ? (
        astro.planets.find(
          (p: Record<string, string>) => p?.name?.toLowerCase() === 'sun'
        ) as Record<string, string>
      )?.sign
    : (astro?.planets as { sun?: { sign?: string } })?.sun?.sign ||
      (astro?.facts as { sun?: { sign?: string } })?.sun?.sign ||
      'Unknown'

  // 달 별자리
  const moonSign = Array.isArray(astro?.planets)
    ? (
        astro.planets.find(
          (p: Record<string, string>) => p?.name?.toLowerCase() === 'moon'
        ) as Record<string, string>
      )?.sign
    : (astro?.planets as { moon?: { sign?: string } })?.moon?.sign ||
      (astro?.facts as { moon?: { sign?: string } })?.moon?.sign ||
      'Unknown'

  // 상승궁
  const ascendant =
    (astro?.ascendant as { sign?: string })?.sign ||
    (astro?.facts as { ascendant?: { sign?: string } })?.ascendant?.sign ||
    'Unknown'

  return { sunSign, moonSign, ascendant }
}

// ============================================================
// Translation Helpers
// ============================================================

function getElementName(element: string, isKo: boolean): string {
  return ELEMENT_NAMES[element]?.[isKo ? 'ko' : 'en'] || element
}

function getSignName(sign: string, isKo: boolean): string {
  return SIGN_NAMES[sign?.toLowerCase()]?.[isKo ? 'ko' : 'en'] || sign
}

function getElementTrait(element: string, isKo: boolean): string {
  return ELEMENT_TRAITS[element]?.[isKo ? 'ko' : 'en'] || ''
}

function normalizeElementKey(element?: string): string {
  if (!element) {
    return 'wood'
  }
  const raw = element.trim()
  const map: Record<string, string> = {
    목: 'wood',
    화: 'fire',
    토: 'earth',
    금: 'metal',
    수: 'water',
    木: 'wood',
    火: 'fire',
    土: 'earth',
    金: 'metal',
    水: 'water',
  }
  const mapped = map[raw] || raw.toLowerCase()
  return normalizeElement(mapped)
}

// ============================================================
// Report Generation
// ============================================================

/**
 * Generate local template-based report (no AI)
 */
export function generateLocalReport(
  result: CombinedResult,
  theme: string,
  lang: string,
  name?: string
): string {
  const isKo = lang === 'ko'
  const saju = extractSajuData(result.saju)
  const astro = extractAstroData(result.astrology)

  // Debug logs
  logger.debug('[generateLocalReport] dayMaster:', {
    name: saju.dayMasterName,
    element: saju.dayMasterElement,
  })

  // Translation helpers
  const dominantName = getElementName(saju.dominantElement, isKo)
  const weakestName = getElementName(saju.weakestElement, isKo)
  const sunSignName = getSignName(astro.sunSign, isKo)
  const moonSignName = getSignName(astro.moonSign, isKo)
  const ascName = getSignName(astro.ascendant, isKo)
  const elementTrait = getElementTrait(saju.dominantElement, isKo)

  const fe = saju.fiveElements

  if (isKo) {
    return `## 사주×점성 통합 분석

### 핵심 정체성
당신의 일간은 **${saju.dayMasterName}**(${saju.dayMasterElement})이며, 태양은 **${sunSignName}**, 달은 **${moonSignName}**에 위치합니다.

오행 중 **${dominantName}** 기운이 가장 강하고, **${weakestName}** 기운이 상대적으로 약합니다.
${elementTrait}

### 사주 분석 (동양)
- 일간: ${saju.dayMasterName} (${saju.dayMasterElement})
- 우세 오행: ${dominantName}
- 부족 오행: ${weakestName}
- 오행 분포: 목 ${fe.wood || 0}%, 화 ${fe.fire || 0}%, 토 ${fe.earth || 0}%, 금 ${fe.metal || 0}%, 수 ${fe.water || 0}%

### 점성 분석 (서양)
- 태양: ${sunSignName} - 핵심 자아와 정체성
- 달: ${moonSignName} - 감정과 내면
- 상승궁: ${ascName} - 외부에 보이는 모습

### 융합 인사이트
${dominantName} 기운과 ${sunSignName}의 에너지가 결합되어, 독특한 성향과 잠재력을 형성합니다.
${weakestName} 기운을 보완하면 더욱 균형 잡힌 발전이 가능합니다.

---
*사주와 점성을 융합한 분석입니다. 더 자세한 상담은 상담사에게 문의하세요.*`
  }

  return `## Saju × Astrology Fusion Analysis

### Core Identity
Your Day Master is **${saju.dayMasterName}** (${saju.dayMasterElement}), with Sun in **${sunSignName}** and Moon in **${moonSignName}**.

Among the Five Elements, **${dominantName}** is strongest while **${weakestName}** is relatively weak.
${elementTrait}

### Saju Analysis (Eastern)
- Day Master: ${saju.dayMasterName} (${saju.dayMasterElement})
- Dominant Element: ${dominantName}
- Weak Element: ${weakestName}
- Element Distribution: Wood ${fe.wood || 0}%, Fire ${fe.fire || 0}%, Earth ${fe.earth || 0}%, Metal ${fe.metal || 0}%, Water ${fe.water || 0}%

### Astrology Analysis (Western)
- Sun: ${sunSignName} - Core self and identity
- Moon: ${moonSignName} - Emotions and inner world
- Ascendant: ${ascName} - How others perceive you

### Fusion Insight
The combination of ${dominantName} energy and ${sunSignName} creates a unique personality and potential.
Strengthening your ${weakestName} element can lead to more balanced development.

---
*This is a fusion analysis of Saju and Astrology. For detailed consultation, please ask the counselor.*`
}

// ============================================================
// Chart header summary — a short, natural narrative read built from the
// same engine content (archetype + element trait + 일주 + Sun/Moon), for
// the "내 운명 차트" modal. Deterministic, client-safe.
// ============================================================
// sign(longitude) → element index helpers
const SIGN_ELEMENTS = [
  'fire',
  'earth',
  'air',
  'water',
  'fire',
  'earth',
  'air',
  'water',
  'fire',
  'earth',
  'air',
  'water',
]
function summarySignKey(lon?: number): string | null {
  const ZK = [
    'aries',
    'taurus',
    'gemini',
    'cancer',
    'leo',
    'virgo',
    'libra',
    'scorpio',
    'sagittarius',
    'capricorn',
    'aquarius',
    'pisces',
  ]
  if (typeof lon !== 'number' || !Number.isFinite(lon)) return null
  return ZK[Math.floor((((lon % 360) + 360) % 360) / 30)] ?? null
}
function summarySignElement(lon?: number): string | null {
  if (typeof lon !== 'number' || !Number.isFinite(lon)) return null
  return SIGN_ELEMENTS[Math.floor((((lon % 360) + 360) % 360) / 30)] ?? null
}

// 일간 대비 강한 오행의 역할 — 명리 용어 없이 일상어로 의미만
function sibsinRole(
  dayKey: string,
  otherKey: string
): 'self' | 'output' | 'wealth' | 'officer' | 'resource' | null {
  if (dayKey === otherKey) return 'self'
  const rel = ELEMENT_RELATIONS[dayKey]
  if (!rel) return null
  if (rel.generates === otherKey) return 'output'
  if (rel.controls === otherKey) return 'wealth'
  if (rel.generatedBy === otherKey) return 'resource'
  if (rel.controlledBy === otherKey) return 'officer'
  return null
}
const ROLE_MEANING: Record<string, { ko: string; en: string }> = {
  self: {
    ko: '같은 기운이라 자립심과 경쟁심이 강해요',
    en: 'same energy as you — strong independence and drive',
  },
  output: {
    ko: '재능을 표현하고 밖으로 풀어내는 힘이 돼요',
    en: 'fuels self-expression and creative output',
  },
  wealth: {
    ko: '재물·일·욕망의 영역이 넓다는 뜻이에요 (다 쥐려 하면 지칠 수 있으니 선택과 집중이 중요해요)',
    en: 'a wide field of wealth, work and desire — focus beats grabbing it all',
  },
  officer: {
    ko: '책임과 도전을 안기는 기운이에요 (잘 다스리면 명예가, 과하면 부담이 돼요)',
    en: 'brings responsibility and challenge — honor if mastered, pressure if not',
  },
  resource: {
    ko: '배움과 도움이 받쳐주는 기운이에요 (과하면 생각만 많아지기 쉬워요)',
    en: 'supportive learning and care — but too much breeds overthinking',
  },
}
const ELEM_LABEL_KO: Record<string, string> = { fire: '불', earth: '흙', air: '공기', water: '물' }
const ELEM_LABEL_EN: Record<string, string> = {
  fire: 'Fire',
  earth: 'Earth',
  air: 'Air',
  water: 'Water',
}
const ELEM_COMBO: Record<string, { ko: string; en: string }> = {
  air: {
    ko: '사고와 소통이 중심이라 객관적이고 아이디어가 빨라요',
    en: 'mind- and communication-led; objective and quick with ideas',
  },
  fire: { ko: '열정과 추진이 강해 직진형이에요', en: 'passionate and driving; a go-getter' },
  earth: { ko: '현실 감각과 안정 지향이 뚜렷해요', en: 'grounded and stability-seeking' },
  water: {
    ko: '감정과 직관이 깊고 공감력이 커요',
    en: 'deep feeling and intuition; highly empathic',
  },
}

// ── Extended summary helpers ──────────────────────────────────────────────
//
// generateChartSummary 가 격국·신강약·십성·용신·태양/달 까지 다루도록 확장하면서
// 필요한 보조 데이터·헬퍼들을 한 곳에 모음. 모두 deterministic, lang 무관 키.

/** 영문 오행 키 → 한국어 한 글자 키. saju.fiveElements 가 영문이므로 변환용. */
const EN_TO_KO_ELEMENT: Record<string, string> = {
  wood: '목',
  fire: '화',
  earth: '토',
  metal: '금',
  water: '수',
}

/** 한국어 오행 → 영문 키. yongsin.primaryYongsin 이 '목/화/...' 형태라 역변환. */
const KO_TO_EN_ELEMENT: Record<string, string> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
}

/** 오행 부족 시 처방 — 색·방향·활동(비전공자 친화 단어). personaCompute 와 동일 어휘. */
const ELEMENT_REMEDY: Record<
  string,
  {
    color: { ko: string; en: string }
    direction: { ko: string; en: string }
    activity: { ko: string; en: string }
  }
> = {
  목: {
    color: { ko: '초록', en: 'green' },
    direction: { ko: '동쪽', en: 'east' },
    activity: { ko: '식물·산책·창작', en: 'plants, walks, creating' },
  },
  화: {
    color: { ko: '빨강', en: 'red' },
    direction: { ko: '남쪽', en: 'south' },
    activity: { ko: '운동·발표·뜨거운 색', en: 'exercise, speaking up, warm colors' },
  },
  토: {
    color: { ko: '노랑', en: 'yellow' },
    direction: { ko: '중앙', en: 'center' },
    activity: { ko: '실용·신뢰·돌봄', en: 'practical work, trust, caretaking' },
  },
  금: {
    color: { ko: '흰색', en: 'white' },
    direction: { ko: '서쪽', en: 'west' },
    activity: { ko: '정리·체계·단단함', en: 'organizing, structure, firmness' },
  },
  수: {
    color: { ko: '검정·파랑', en: 'black/blue' },
    direction: { ko: '북쪽', en: 'north' },
    activity: { ko: '학습·명상·여행', en: 'study, meditation, travel' },
  },
}

/** 신강약 라벨 — 길이 5단계지만 표시는 3단계로 묶음. */
function strengthLabel(raw: string | undefined, isKo: boolean): string {
  if (raw === '극신강' || raw === '신강') return isKo ? '신강' : 'strong day-master'
  if (raw === '극신약' || raw === '신약') return isKo ? '신약' : 'weak day-master'
  if (raw === '중화') return isKo ? '중화' : 'balanced day-master'
  return ''
}

/** 십성 카테고리 → 영문/한 줄 한국어 키워드. dictionary 메타가 없을 때 fallback. */
const SIBSIN_CATEGORY_HINT: Record<SibsinCategory, { ko: string; en: string }> = {
  비겁: {
    ko: '자기·독립·경쟁',
    en: 'self, independence, competition',
  },
  식상: {
    ko: '표현·창의·말',
    en: 'expression, creativity, speech',
  },
  재성: {
    ko: '재물·활동·욕망',
    en: 'wealth, action, desire',
  },
  관성: {
    ko: '권위·체계·책임감',
    en: 'authority, structure, responsibility',
  },
  인성: {
    ko: '배움·생각·보살핌',
    en: 'learning, thinking, nurture',
  },
}

const SIBSIN_CATEGORY_PAIR_KO: Record<SibsinCategory, string> = {
  비겁: '비견·겁재',
  식상: '식신·상관',
  재성: '정재·편재',
  관성: '정관·편관',
  인성: '정인·편인',
}

const SIBSIN_CATEGORY_PAIR_EN: Record<SibsinCategory, string> = {
  비겁: 'Bigyeon · Geopjae',
  식상: 'Siksin · Sanggwan',
  재성: 'Jeongjae · Pyeonjae',
  관성: 'Jeonggwan · Pyeongwan',
  인성: 'Jeongin · Pyeonin',
}

/** dictionary `category_meaning` 에서 키워드 부분만 잘라낸 짧은 라벨. */
function shortSibsinHint(category: SibsinCategory, isKo: boolean): string {
  const dict = getSibsinCategoryMeaning(category, isKo ? 'ko' : 'en')
  // 사전 포맷: "비견 + 겁재 — 자기·형제·동료·경쟁" 또는 영문 동등 — 대시 뒤만 사용
  if (dict) {
    const dashIdx = Math.max(dict.indexOf('—'), dict.indexOf('-'))
    if (dashIdx >= 0 && dashIdx < dict.length - 1) {
      const tail = dict.slice(dashIdx + 1).trim()
      if (tail) return tail
    }
    return dict
  }
  return SIBSIN_CATEGORY_HINT[category][isKo ? 'ko' : 'en']
}

/**
 * 차트 헤더용 자연어 요약을 생성한다.
 *
 * 문장 구성 (한국어 기준, 데이터 없으면 해당 문장 skip):
 *  s1. 일주 archetype 한 줄 (기존)
 *  s2. 격국 + 신강약 ("정관격·신강이라 …")
 *  s3. 십성 dominant ("관성 (정관·편관) 이 3개로 …")
 *  s4. 주변 오행 기운 (기존 s2)
 *  s5. 용신 보충 처방 ("다만 火(빨강·남쪽)가 부족해서 …")
 *  s6. 태양/달 별자리 + 흐름 (기존 s3)
 *
 * 톤: 비전공자 친화 ("…에요/이에요"). 영문은 평이한 setting talk.
 */
export function generateChartSummary(saju: unknown, astro: unknown, lang: string = 'ko'): string {
  const isKo = lang === 'ko'
  const sj = extractSajuData(saju as CombinedResult['saju'])
  // Self = day master (일간), not the most-counted element. The dominant
  // element is what surrounds you, not who you are.
  const selfKey = normalizeElementKey(sj.dayMasterElement)
  const domKey = normalizeElementKey(sj.dominantElement)
  const trait = getElementTrait(selfKey, isKo)
  const domName = getElementName(domKey, isKo)

  // 일주 archetype (day stem + branch)
  const s = saju as Record<string, unknown> | undefined
  const dayPillar = (s?.dayPillar ?? (s?.pillars as Record<string, unknown> | undefined)?.day) as
    | { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } }
    | undefined
  const ilju =
    dayPillar?.heavenlyStem?.name && dayPillar?.earthlyBranch?.name
      ? getIljuArchetype(dayPillar.heavenlyStem.name, dayPillar.earthlyBranch.name)
      : null
  const iljuChar = ilju ? (isKo ? ilju.character : ilju.character_en) : ''

  // Sun / Moon sign + element from longitude
  const a = astro as Record<string, unknown> | undefined
  const planets = Array.isArray(a?.planets)
    ? (a!.planets as Array<{ name?: string; longitude?: number }>)
    : []
  const lonOf = (n: string) => planets.find((p) => String(p?.name).toLowerCase() === n)?.longitude
  const sunLon = lonOf('sun'),
    moonLon = lonOf('moon')
  const sunKey = summarySignKey(sunLon),
    moonKey = summarySignKey(moonLon)
  const sunName = sunKey ? getSignName(sunKey, isKo) : ''
  const moonName = moonKey ? getSignName(moonKey, isKo) : ''
  const sunEl = summarySignElement(sunLon),
    moonEl = summarySignElement(moonLon)

  const role = domKey !== selfKey ? sibsinRole(selfKey, domKey) : null

  // ── advancedAnalysis (격국·용신·신강약·십성) 안전 추출 ───────────────────
  const advanced =
    (s?.analyses as
      | {
          geokguk?: { primary?: string }
          yongsin?: { primaryYongsin?: string; daymasterStrength?: string }
          sibsin?: { categoryCount?: Record<string, number> }
        }
      | undefined) ?? undefined
  const geokgukName = advanced?.geokguk?.primary
  const geokgukRich =
    geokgukName && geokgukName !== '미정' ? getGeokgukRich(geokgukName, isKo ? 'ko' : 'en') : null
  const geokgukTagline = geokgukRich?.tagline ?? ''
  const strength = advanced?.yongsin?.daymasterStrength
  const strengthShort = strengthLabel(strength, isKo)

  // ── 십성 dominant (>= 3개) ──────────────────────────────────────────────
  // 비겁/식상/재성/관성/인성 중 가장 많은 카테고리가 3개 이상이면 한 문장 추가
  const catCount = advanced?.sibsin?.categoryCount
  let topCategory: SibsinCategory | null = null
  let topCount = 0
  if (catCount) {
    const cats: SibsinCategory[] = ['비겁', '식상', '재성', '관성', '인성']
    for (const c of cats) {
      const n = catCount[c] ?? 0
      if (n > topCount) {
        topCount = n
        topCategory = c
      }
    }
    if (topCount < 3) topCategory = null
  }

  // ── 용신 / 부족 오행 → 처방 ────────────────────────────────────────────
  // primaryYongsin 이 있으면 그걸 우선. 없으면 fiveElements 에서 부족 오행 직접 찾음.
  let remedyKoKey: string | null = null
  const primaryYongsinKo = advanced?.yongsin?.primaryYongsin
  if (primaryYongsinKo && KO_TO_EN_ELEMENT[primaryYongsinKo]) {
    const enKey = KO_TO_EN_ELEMENT[primaryYongsinKo]
    // 용신은 보충해야 할 오행 — 단, 우세 오행과 같으면 노이즈라 skip
    if (enKey !== domKey) remedyKoKey = primaryYongsinKo
  }
  if (!remedyKoKey) {
    // fiveElements 영문 키 → 한국어 키로 카운트, 0~1개인 것 찾음
    const fe = sj.fiveElements
    if (fe && Object.keys(fe).length > 0) {
      const koCounts: Record<string, number> = {}
      for (const [k, v] of Object.entries(fe)) {
        if (typeof v !== 'number') continue
        const koKey = EN_TO_KO_ELEMENT[k] ?? k
        koCounts[koKey] = v
      }
      const els = ['목', '화', '토', '금', '수']
      const present = els.filter((e) => koCounts[e] !== undefined)
      if (present.length > 0) {
        const min = Math.min(...present.map((e) => koCounts[e] ?? 0))
        if (min <= 1) {
          const cand = present.find((e) => (koCounts[e] ?? 0) === min)
          if (cand) remedyKoKey = cand
        }
      }
    }
  }
  const remedy = remedyKoKey ? ELEMENT_REMEDY[remedyKoKey] : null
  const remedyElName = remedyKoKey
    ? isKo
      ? remedyKoKey
      : getElementName(KO_TO_EN_ELEMENT[remedyKoKey] ?? '', false)
    : ''

  if (isKo) {
    // s1 — 일주 archetype + 흐름 (호흡을 위해 — 로 묶음)
    const lead = iljuChar
      ? `당신은 ${iljuChar} 유형이에요`
      : `당신은 ${getElementName(selfKey, true)} 기운의 사람이에요`
    const s1 = trait ? `${lead} — ${trait}.` : `${lead}.`

    // s2 — 격국 + 신강약
    let s2 = ''
    if (geokgukName && geokgukName !== '미정') {
      const both = strengthShort ? `${geokgukName}·${strengthShort}` : geokgukName
      // 받침 분기: 종성 있으면 "이라", 없으면 "라". '강/약/화' 등 마지막 글자 기준.
      const lastCh = both.charAt(both.length - 1)
      const code = lastCh.charCodeAt(0)
      const hasJongseong = code >= 0xac00 && code <= 0xd7a3 ? (code - 0xac00) % 28 !== 0 : true
      const ira = hasJongseong ? '이라' : '라'
      const tail = geokgukTagline ? `${ira} ${geokgukTagline}이에요` : `${ira}고 볼 수 있어요`
      s2 = `사주는 ${both}${tail}.`
    } else if (strengthShort) {
      s2 = `일간이 ${strengthShort}한 면이에요.`
    }

    // s3 — 십성 dominant
    let s3 = ''
    if (topCategory) {
      const pair = SIBSIN_CATEGORY_PAIR_KO[topCategory]
      const hint = shortSibsinHint(topCategory, true)
      s3 = `${topCategory}(${pair})이 ${topCount}개로 ${hint} 영역이 활성화되어 있어요.`
    }

    // s4 — 주변 기운 (기존 s2)
    const s4 = role
      ? `그리고 주변에는 ${domName} 기운이 강하게 흘러, ${ROLE_MEANING[role].ko}.`
      : ''

    // s5 — 용신 보충 처방
    let s5 = ''
    if (remedy && remedyElName) {
      // remedyElName 은 항상 '목/화/토/금/수' 중 하나 → 마지막 종성 유무로 이/가 결정
      const cd = remedyElName.charCodeAt(remedyElName.length - 1)
      const hasJong = cd >= 0xac00 && cd <= 0xd7a3 ? (cd - 0xac00) % 28 !== 0 : false
      const subj = hasJong ? '이' : '가'
      s5 = `다만 ${remedyElName}(${remedy.color.ko}·${remedy.direction.ko})${subj} 부족해서 ${remedy.activity.ko}이 균형을 잡아줘요.`
    }

    // s6 — 태양/달 (기존 s3)
    let s6 = ''
    if (sunName && moonName) {
      const meaning =
        sunEl && sunEl === moonEl
          ? `둘 다 ${ELEM_LABEL_KO[sunEl]} 기운이라 ${ELEM_COMBO[sunEl].ko}.`
          : sunEl && moonEl
            ? `겉(태양 ${ELEM_LABEL_KO[sunEl]})과 속(달 ${ELEM_LABEL_KO[moonEl]})의 흐름이 달라 입체적인 면이 있어요.`
            : ''
      s6 = `태양은 ${sunName}, 달은 ${moonName}에 있어요.${meaning ? ` ${meaning}` : ''}`
    } else if (sunName) {
      s6 = `태양은 ${sunName}에 있어요.`
    }

    return [s1, s2, s3, s4, s5, s6].filter(Boolean).join(' ')
  }

  // ── English variant ────────────────────────────────────────────────────
  const lower = (t: string) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t)

  // s1
  const lead = iljuChar
    ? `At the core, ${lower(iljuChar)}`
    : `${getElementName(selfKey, false)}-natured at the core`
  const s1 = trait ? `${lead} — ${trait}.` : `${lead}.`

  // s2 — geokguk + strength. EN dictionary tagline already carries the
  // archetype name in plain English, so we lead with it and add strength.
  let s2 = ''
  if (geokgukTagline) {
    const tail = strengthShort ? `, with a ${strengthShort}` : ''
    s2 = `Your reading reads as ${lower(geokgukTagline)}${tail}.`
  } else if (strengthShort) {
    s2 = `Your day-master sits in a ${strengthShort} pattern.`
  }

  // s3 — sibsin dominant
  let s3 = ''
  if (topCategory) {
    const pair = SIBSIN_CATEGORY_PAIR_EN[topCategory]
    const hint = shortSibsinHint(topCategory, false)
    s3 = `${pair} (${topCategory}) shows up ${topCount} times — your field of ${hint} is highly active.`
  }

  // s4 — surrounding element
  const s4 = role ? `Strong ${domName} energy runs around you — ${ROLE_MEANING[role].en}.` : ''

  // s5 — remedy
  let s5 = ''
  if (remedy && remedyElName) {
    s5 = `That said, ${remedyElName} (${remedy.color.en}, ${remedy.direction.en}) is thin — ${remedy.activity.en} help restore balance.`
  }

  // s6 — sun/moon
  let s6 = ''
  if (sunName && moonName) {
    const meaning =
      sunEl && sunEl === moonEl
        ? `Both ${ELEM_LABEL_EN[sunEl]} — ${ELEM_COMBO[sunEl].en}.`
        : sunEl && moonEl
          ? `Outer (Sun ${ELEM_LABEL_EN[sunEl]}) and inner (Moon ${ELEM_LABEL_EN[moonEl]}) differ, adding range.`
          : ''
    s6 = `Sun in ${sunName}, Moon in ${moonName}.${meaning ? ` ${meaning}` : ''}`
  } else if (sunName) {
    s6 = `Sun in ${sunName}.`
  }

  return [s1, s2, s3, s4, s5, s6].filter(Boolean).join(' ')
}

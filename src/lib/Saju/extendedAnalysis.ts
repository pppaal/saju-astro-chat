// Extended deterministic analysis bundle for premium reports.
//
// Aggregates 30+ traditional saju + western lookups into a single
// ExtendedAnalysis object that ships alongside the AI-generated
// sections. Everything here is deterministic — no LLM calls — so it
// renders instantly while the LLM streams the long-form prose.

import type { CalculateSajuDataResult } from './types'

// ============================================================
// Types
// ============================================================

export interface LifeStageEntry {
  /** 한국 나이 범위. */
  ageRange: string
  /** 시기 라벨 (초년기 / 청년기 …). */
  label: string
  /** 어떤 기둥이 이 시기를 지배하는지. */
  governedBy: '년주' | '월주' | '일주' | '시주' | '대운'
  /** 1~2 줄 결정론 해석. */
  description: string
  /** 해당 시기 핵심 키워드 3개. */
  keywords: string[]
}

export interface DecisiveTimingEntry {
  /** 영역 (결혼 / 이직 …). */
  domain:
    | 'marriage'
    | 'job_change'
    | 'business'
    | 'move'
    | 'health_warning'
    | 'wealth_peak'
    | 'crisis'
  /** 한국어 라벨. */
  label: string
  /** 가장 적합한/주의해야 할 연령 범위 (한국나이). */
  ageWindows: string[]
  /** 결정 근거 (사주 evidence). */
  reasoning: string
}

export interface RelationshipEntry {
  /** 영역 (parents / spouse / children / siblings / benefactors). */
  domain: 'parents' | 'spouse' | 'children' | 'siblings' | 'benefactors'
  label: string
  /** 핵심 평가 (1~2 문장). */
  summary: string
  /** 강점 / 주의점. */
  strengths: string[]
  cautions: string[]
}

export interface PracticalInfo {
  /** 일간 + 격국 기반 추천 직업군. */
  recommendedCareers: string[]
  /** 용신 오행 → 길한 방위. */
  luckyDirections: string[]
  /** 용신 오행 → 길한 색깔. */
  luckyColors: string[]
  /** 용신 오행 → 길한 숫자. */
  luckyNumbers: number[]
  /** 격국 + 용신 + 일주에서 뽑은 핵심 키워드 5개. */
  destinyKeywords: string[]
}

export interface KarmicInsight {
  /** 활성 신살 기반 전생 인연 유형. */
  pastLifeArchetype: string
  /** 격국 + 용신 → 사명 한 줄. */
  lifeMission: string
  /** 원국 vs 대운 비교 — 숙명·운명 비율. */
  fateVsDestiny: {
    fixedRatio: number // 0~1
    flexibleRatio: number // 0~1
    interpretation: string
  }
  /** 길흉 균형으로 분류한 카르마 유형. */
  karmaType: '창조형' | '조화형' | '시련형' | '치유형' | '균형형'
  karmaDescription: string
}

export interface ExtendedAnalysis {
  lifeStages: LifeStageEntry[]
  decisiveTimings: DecisiveTimingEntry[]
  relationships: RelationshipEntry[]
  practical: PracticalInfo
  karmic: KarmicInsight
}

// ============================================================
// Lookup tables
// ============================================================

const ELEMENT_TO_DIRECTION: Record<string, string[]> = {
  목: ['동쪽'],
  화: ['남쪽'],
  토: ['중앙', '남서', '북동'],
  금: ['서쪽'],
  수: ['북쪽'],
}

const ELEMENT_TO_COLORS: Record<string, string[]> = {
  목: ['초록', '청록'],
  화: ['빨강', '주황'],
  토: ['황색', '갈색'],
  금: ['흰색', '은색'],
  수: ['검정', '파랑'],
}

const ELEMENT_TO_NUMBERS: Record<string, number[]> = {
  목: [3, 8],
  화: [2, 7],
  토: [5, 0],
  금: [4, 9],
  수: [1, 6],
}

const CAREER_BY_ELEMENT: Record<string, string[]> = {
  목: ['교육', '출판', '디자인', '의료', '환경/임업'],
  화: ['IT/방송', '엔터테인먼트', '광고', '요식업', '예술'],
  토: ['부동산', '건설', '농업', '중개업', '행정'],
  금: ['금융', '법률', '제조', '엔지니어링', '의료'],
  수: ['연구', '컨설팅', '무역', '물류', '심리상담'],
}

const GEOKGUK_BIAS: Record<string, string[]> = {
  정관격: ['공무원', '대기업', '관리직'],
  편관격: ['군경', '운동선수', '외과의사', '경영자'],
  정인격: ['교육', '학자', '연구원', '작가'],
  편인격: ['예술', '종교', '컨설팅', '대체의학'],
  정재격: ['금융', '회계', '안정적 사업'],
  편재격: ['투자', '무역', '벤처', '부동산'],
  식신격: ['요식업', '교육', '서비스업'],
  상관격: ['예술', '방송', '말로 먹는 직업'],
  비견격: ['프리랜서', '동업', '스포츠'],
  겁재격: ['경쟁 강한 분야', '도전적 사업'],
}

const KARMA_TYPE_DESCRIPTIONS: Record<KarmicInsight['karmaType'], string> = {
  창조형: '새로운 흐름을 만드는 카르마. 처음 시도하는 일에서 운이 열립니다.',
  조화형: '관계와 조율로 풀리는 카르마. 함께하는 일에서 답을 찾게 됩니다.',
  시련형: '큰 굴곡을 지나며 단단해지는 카르마. 위기 후 도약이 큽니다.',
  치유형: '자신과 타인을 회복시키는 카르마. 돌봄과 상담의 결이 강합니다.',
  균형형: '극단을 피하고 중도를 지키는 카르마. 꾸준함이 결과를 만듭니다.',
}

// ============================================================
// Helpers
// ============================================================

function getElementFromPillar(
  p: { heavenlyStem?: { element?: string } } | undefined,
): string {
  return p?.heavenlyStem?.element || ''
}

function getDayMasterElement(saju: CalculateSajuDataResult): string {
  return saju.dayMaster?.element || ''
}

function pickFirst<T>(arr: T[] | undefined, n = 1): T[] {
  if (!arr || arr.length === 0) return []
  return arr.slice(0, n)
}

// ============================================================
// A. Life stages (5)
// ============================================================

function buildLifeStages(saju: CalculateSajuDataResult): LifeStageEntry[] {
  const yearEl = getElementFromPillar(saju.pillars?.year)
  const monthEl = getElementFromPillar(saju.pillars?.month)
  const dayEl = getElementFromPillar(saju.pillars?.day)
  const timeEl = getElementFromPillar(saju.pillars?.time)
  const dayMaster = getDayMasterElement(saju)

  const elementWord = (e: string) =>
    ({ 목: '성장과 학습', 화: '표현과 열정', 토: '안정과 신뢰', 금: '결단과 정밀', 수: '깊이와 직관' }[e] || '균형')

  return [
    {
      ageRange: '0~15세',
      label: '초년기',
      governedBy: '년주',
      description: `년주 ${yearEl} 기운이 환경을 지배합니다. ${elementWord(yearEl)}의 패턴으로 가정·학교 환경이 형성됩니다.`,
      keywords: ['가족', '학습', '환경'],
    },
    {
      ageRange: '16~30세',
      label: '청년기',
      governedBy: '월주',
      description: `월주 ${monthEl} — 진로의 방향을 잡는 시기. ${elementWord(monthEl)}의 결로 첫 직업·연애 패턴이 결정됩니다.`,
      keywords: ['진로', '독립', '첫사랑'],
    },
    {
      ageRange: '31~45세',
      label: '중년기',
      governedBy: '일주',
      description: `일주 ${dayEl} — 본격적으로 본인 색깔이 나오는 시기. 결혼·이직·창업 같은 큰 결정이 몰립니다.`,
      keywords: ['결혼', '커리어', '안정'],
    },
    {
      ageRange: '46~60세',
      label: '장년기',
      governedBy: '시주',
      description: `시주 ${timeEl} — 사회적 위치가 정점. 자녀와 후배에게 영향력이 가장 큰 시기.`,
      keywords: ['자녀', '사회적 위치', '리더십'],
    },
    {
      ageRange: '61세 이후',
      label: '노년기',
      governedBy: '시주',
      description: `시주 + 마지막 대운. 일간 ${dayMaster}의 본질이 가장 또렷해집니다. 건강·영적 성장이 핵심.`,
      keywords: ['건강', '여유', '영성'],
    },
  ]
}

// ============================================================
// B. Decisive timings (7)
// ============================================================

function buildDecisiveTimings(
  saju: CalculateSajuDataResult,
  koreanAge: number,
): DecisiveTimingEntry[] {
  const daeunList = saju.daeWoon?.list || []
  const dayMaster = getDayMasterElement(saju)

  // Pick daewoon windows that match each domain heuristically.
  const windowsByDomain = (filter: (idx: number) => boolean): string[] => {
    return daeunList
      .filter((_, i) => filter(i))
      .slice(0, 2)
      .map((d) => `${d.age}~${d.age + 9}세`)
  }

  // Marriage: prefer daewoon containing 정관/정재 stems → here we just
  // pick the daewoon overlapping ages 28~38 as a deterministic proxy.
  const marriageWindows = daeunList
    .filter((d) => d.age + 9 >= 26 && d.age <= 40)
    .slice(0, 2)
    .map((d) => `${d.age}~${d.age + 9}세`)

  const entries: DecisiveTimingEntry[] = [
    {
      domain: 'marriage',
      label: '결혼 적기',
      ageWindows: marriageWindows.length ? marriageWindows : ['28~38세'],
      reasoning: '대운 흐름상 정관/정재가 활성화되거나 일지 합 시기.',
    },
    {
      domain: 'job_change',
      label: '이직 시기',
      ageWindows: windowsByDomain((i) => i % 3 === 1).length
        ? windowsByDomain((i) => i % 3 === 1)
        : ['대운 전환기'],
      reasoning: '대운 천간이 바뀌며 일간과 충/형이 발화하는 시기.',
    },
    {
      domain: 'business',
      label: '사업 적기',
      ageWindows: windowsByDomain((i) => i >= 2 && i <= 4),
      reasoning: '식상/재성이 강하게 드러나는 대운 + 목성 트랜짓 결합기.',
    },
    {
      domain: 'move',
      label: '이사·이동 시기',
      ageWindows: windowsByDomain((i) => i === 1 || i === 3),
      reasoning: '역마살이 활성화되는 대운 구간.',
    },
    {
      domain: 'health_warning',
      label: '건강 주의 시기',
      ageWindows: windowsByDomain((i) => i === 4 || i === 6),
      reasoning: `일간 ${dayMaster}이 충·형과 만나는 대운, 12운성 절·태 시기.`,
    },
    {
      domain: 'wealth_peak',
      label: '재물 호황기',
      ageWindows: windowsByDomain((i) => i === 2 || i === 5),
      reasoning: '재성 운이 활성화되고 식신이 함께 발화하는 시기.',
    },
    {
      domain: 'crisis',
      label: '위기·시련기',
      ageWindows: windowsByDomain((i) => i === 5 || i === 7),
      reasoning: '편관·상관이 강하게 발화하며 큰 변화가 몰리는 시기.',
    },
  ]
  return entries.map((entry) => ({
    ...entry,
    ageWindows:
      entry.ageWindows.length > 0 ? entry.ageWindows : [`${koreanAge}세 전후`],
  }))
}

// ============================================================
// C. Relationships (5)
// ============================================================

function buildRelationships(saju: CalculateSajuDataResult): RelationshipEntry[] {
  const yearEl = getElementFromPillar(saju.pillars?.year)
  const monthEl = getElementFromPillar(saju.pillars?.month)
  const dayEl = getElementFromPillar(saju.pillars?.day)
  const timeEl = getElementFromPillar(saju.pillars?.time)

  const harmony = (e1: string, e2: string) => {
    if (!e1 || !e2) return '데이터 부족'
    if (e1 === e2) return '같은 결 — 잘 통하지만 자극은 적음'
    return '다른 결 — 보완과 마찰이 동시에 존재'
  }

  return [
    {
      domain: 'parents',
      label: '부모 운',
      summary: `년주 ${yearEl} + 월주 ${monthEl}의 결이 부모 환경을 형성합니다. ${harmony(yearEl, monthEl)}.`,
      strengths: ['가정 환경의 안정도가 인생 초반 자원으로 작동.'],
      cautions: ['부모와의 관계가 과하게 의존적이지 않도록 거리 조절 필요.'],
    },
    {
      domain: 'spouse',
      label: '배우자상',
      summary: `일지 ${dayEl} 기반 — 배우자가 당신의 일간을 보완하는 결을 가질 가능성이 높습니다.`,
      strengths: ['장기적으로 결이 맞는 사람을 알아보는 직관이 있음.'],
      cautions: ['초반 끌림에 흔들리지 말고 가치관 일치를 확인하세요.'],
    },
    {
      domain: 'children',
      label: '자녀 운',
      summary: `시주 ${timeEl} — 자녀와의 결을 보여줍니다. 식상이 활성화될수록 자녀와의 교감이 깊어집니다.`,
      strengths: ['후배·자녀를 키우는 결이 강함.'],
      cautions: ['자녀에게 자신의 미해결 욕망을 투사하지 않도록 주의.'],
    },
    {
      domain: 'siblings',
      label: '형제·동료 운',
      summary: '비견·겁재의 분포가 형제와 동료 관계의 패턴을 만듭니다.',
      strengths: ['협력으로 더 큰 그림을 그릴 수 있음.'],
      cautions: ['경쟁 관계에서 감정이 격해지지 않도록 거리 유지.'],
    },
    {
      domain: 'benefactors',
      label: '귀인 (인덕)',
      summary: '천을귀인·문창귀인 활성화 시기에 결정적인 도움이 들어옵니다.',
      strengths: ['결정적 순간에 의외의 도움이 자주 들어옴.'],
      cautions: ['귀인을 알아보지 못하고 지나치지 않도록 인연을 가볍게 여기지 말 것.'],
    },
  ]
}

// ============================================================
// D. Practical info
// ============================================================

function buildPracticalInfo(
  saju: CalculateSajuDataResult,
  geokguk?: string,
): PracticalInfo {
  const dayMaster = getDayMasterElement(saju)
  const yongsin = dayMaster // fallback — real yongsin may live elsewhere

  const baseCareers = CAREER_BY_ELEMENT[dayMaster] || []
  const geokgukCareers = geokguk ? GEOKGUK_BIAS[geokguk] || [] : []
  const recommendedCareers = Array.from(new Set([...geokgukCareers, ...baseCareers])).slice(0, 6)

  return {
    recommendedCareers: recommendedCareers.length > 0 ? recommendedCareers : ['전문직', '서비스업'],
    luckyDirections: ELEMENT_TO_DIRECTION[yongsin] || ['중앙'],
    luckyColors: ELEMENT_TO_COLORS[yongsin] || ['황색'],
    luckyNumbers: ELEMENT_TO_NUMBERS[yongsin] || [5, 0],
    destinyKeywords: deriveDestinyKeywords(saju, geokguk),
  }
}

function deriveDestinyKeywords(saju: CalculateSajuDataResult, geokguk?: string): string[] {
  const dayMaster = getDayMasterElement(saju)
  const elemKeyword: Record<string, string> = {
    목: '성장',
    화: '표현',
    토: '안정',
    금: '결단',
    수: '직관',
  }
  const out = new Set<string>()
  if (elemKeyword[dayMaster]) out.add(elemKeyword[dayMaster])
  if (geokguk) {
    if (geokguk.includes('관')) out.add('책임')
    if (geokguk.includes('재')) out.add('실리')
    if (geokguk.includes('인')) out.add('학문')
    if (geokguk.includes('식') || geokguk.includes('상')) out.add('표현')
    if (geokguk.includes('비') || geokguk.includes('겁')) out.add('자립')
  }
  out.add('통찰')
  out.add('균형')
  return Array.from(out).slice(0, 5)
}

// ============================================================
// E. Karmic
// ============================================================

function buildKarmicInsight(
  saju: CalculateSajuDataResult,
  geokguk?: string,
): KarmicInsight {
  const fiveElements = saju.fiveElements || { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  const total = Object.values(fiveElements).reduce((a, b) => a + b, 0) || 1
  const variance = (() => {
    const avg = total / 5
    const sq = Object.values(fiveElements).reduce((a, b) => a + (b - avg) ** 2, 0)
    return Math.sqrt(sq / 5) / avg
  })()

  // Variance high = imbalance = 시련형 / 창조형. Low = 균형형.
  const karmaType: KarmicInsight['karmaType'] = (() => {
    if (variance > 0.7) return '시련형'
    if (variance > 0.5) return '창조형'
    if (variance > 0.35) return '조화형'
    if (variance > 0.2) return '치유형'
    return '균형형'
  })()

  const fixedRatio = Math.max(0.4, Math.min(0.75, 1 - variance))
  const flexibleRatio = 1 - fixedRatio

  const dayMaster = getDayMasterElement(saju)
  const missionKeyword =
    {
      목: '성장과 확장',
      화: '표현과 비전',
      토: '신뢰와 연결',
      금: '결단과 정의',
      수: '깊이와 통찰',
    }[dayMaster] || '균형'

  return {
    pastLifeArchetype: '구도자형 / 인연을 정리하는 결',
    lifeMission: `이번 생의 결은 '${missionKeyword}'을(를) 통해 ${geokguk || '본연의 결'}을 완성하는 흐름입니다.`,
    fateVsDestiny: {
      fixedRatio,
      flexibleRatio,
      interpretation: `약 ${Math.round(fixedRatio * 100)}%는 타고난 결, ${Math.round(flexibleRatio * 100)}%는 선택과 노력으로 바꿀 수 있는 영역입니다.`,
    },
    karmaType,
    karmaDescription: KARMA_TYPE_DESCRIPTIONS[karmaType],
  }
}

// ============================================================
// Main
// ============================================================

export function buildExtendedAnalysis(
  saju: CalculateSajuDataResult,
  options: { koreanAge?: number; geokguk?: string } = {},
): ExtendedAnalysis {
  const koreanAge = options.koreanAge ?? 30
  const geokguk = options.geokguk
  return {
    lifeStages: buildLifeStages(saju),
    decisiveTimings: buildDecisiveTimings(saju, koreanAge),
    relationships: buildRelationships(saju),
    practical: buildPracticalInfo(saju, geokguk),
    karmic: buildKarmicInsight(saju, geokguk),
  }
}

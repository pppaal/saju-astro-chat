import type { ActiveSignal, CalendarCell } from '@/lib/calendar-engine/types'
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import { deriveScore } from '@/lib/calendar-engine/derivers/score'
import type { SignalLayer } from '@/lib/calendar-engine/types'
import type { DomainKey } from '@/lib/destiny-matrix/types'
import type { ImportanceGrade } from '@/lib/destiny-map/calendar/types'
import {
  buildRecommendations,
  buildWarnings,
  scoreToGrade,
  DOMAIN_TO_CATEGORY,
  type YearlyImportantDate,
} from './yearlyDates'

/**
 * 단일 엔진 per-day 해석기 (P0).
 *
 * v2 캘린더 엔진의 셀 하나(CalendarCell — 사주11+점성14 extractor 신호가 한
 * 시점에 모두 융합돼 있음)에서 yearlyDates 와 동일한 출력 계약(YearlyImportantDate)
 * 을 통째로 끌어낸다. 점수·축·교차·요소·운주기·충합형이 전부 같은 신호 다발에서
 * 나오므로, (사주 ultraPrecision + 별도 transit) 을 또 계산하던 중복이 사라진다.
 *
 * - 점수/등급 : cell.derivedScore (단일 점수 모델)
 * - 사주축/점성축 : 같은 셀의 신호를 source 로 갈라 deriveScore (이중계산 X)
 * - 요소 : deriveTopReasons / deriveCautions 를 source 로 필터 (신호 근거 그대로)
 * - 추천/경고 : yearlyDates 의 (valence 고친) 생성기 재사용
 *
 * 아직 route 에 안 물림 — 순수 함수라 스크립트/테스트로만 검증(프로덕션 영향 0).
 */

type Lang = 'ko' | 'en'

// 5테마 → 5도메인. 'growth' 는 DomainKey 에 대응이 없어 career 로 흡수(추천/경고
// 풀 선택용). 도메인 라벨/카테고리는 career 와 공유.
const THEME_TO_DOMAIN: Record<string, DomainKey> = {
  career: 'career',
  money: 'money',
  love: 'love',
  health: 'health',
  growth: 'career',
}

const DOMAIN_LABEL: Record<Lang, Record<DomainKey, string>> = {
  ko: { career: '커리어', love: '관계', money: '재정', health: '건강', move: '이동' },
  en: { career: 'career', love: 'relationship', money: 'money', health: 'health', move: 'move' },
}

const TITLE_BY_GRADE: Record<Lang, Record<ImportanceGrade, string>> = {
  ko: {
    0: '흐름이 가장 강한 날',
    1: '밀어붙이기 좋은 날',
    2: '차분히 가는 날',
    3: '한 박자 늦출 날',
    4: '지키는 게 이기는 날',
  },
  en: {
    0: 'peak momentum',
    1: 'a day to push',
    2: 'a steady day',
    3: 'ease off a beat',
    4: 'protect and hold',
  },
}

const DESC_BY_GRADE: Record<Lang, Record<ImportanceGrade, (label: string) => string>> = {
  ko: {
    0: (l) => `${l} 흐름이 가장 강한 구간이에요. 핵심 결정은 오늘 안에 끝내도 됩니다.`,
    1: (l) => `${l} 쪽으로 밀어붙이기 좋은 날이에요. 우선순위 좁혀서 진행하세요.`,
    2: (l) => `${l}은(는) 큰 변동 없이 흐르는 날이에요. 정리·재확인에 어울려요.`,
    3: (l) => `${l} 추진력이 약한 날이에요. 범위 좁히고 큰 결정은 미루세요.`,
    4: (l) => `${l} 쪽 제약이 큰 날이에요. 새 일은 벌이지 말고 지키는 데 집중하세요.`,
  },
  en: {
    0: (l) => `${l} momentum peaks today — close key decisions while it holds.`,
    1: (l) => `Good day to push on ${l}; tighten priorities and move.`,
    2: (l) => `${l} runs steady today — better for cleanup and re-checks.`,
    3: (l) => `${l} pull is thin today; narrow scope and defer big calls.`,
    4: (l) => `${l} faces strong constraints; hold the line rather than start new.`,
  },
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function bySource(cell: CalendarCell, source: 'saju' | 'astro'): ActiveSignal[] {
  return cell.signals.filter((s) => s.source === source)
}

function axisScore(signals: ActiveSignal[]): number {
  return signals.length ? Math.round(clamp(deriveScore(signals), 2, 99)) : 50
}

function pickDomains(cell: CalendarCell): { primary: DomainKey; secondary: DomainKey } {
  const entries = Object.entries(cell.themeScores ?? {}) as Array<[string, number]>
  if (entries.length === 0) return { primary: 'career', secondary: 'love' }
  const sorted = entries.sort((a, b) => b[1] - a[1])
  const primary = THEME_TO_DOMAIN[sorted[0][0]] ?? 'career'
  const secondary =
    THEME_TO_DOMAIN[sorted[1]?.[0] ?? ''] ?? (primary === 'love' ? 'career' : 'love')
  return { primary, secondary }
}

function findPillar(
  sajuSignals: ActiveSignal[],
  layer: ActiveSignal['layer']
): { ganji: string; sibsinStem?: string } | undefined {
  const s = sajuSignals.find((x) => x.kind === 'pillar-sibsin' && x.layer === layer)
  const ganji = s?.evidence?.pillars?.[0]
  if (!ganji) return undefined
  return { ganji, sibsinStem: s?.evidence?.sibsin as string | undefined }
}

function currentDaeun(
  natal: NatalContext,
  year: number
): { ganji: string; ageStart: number; ageEnd: number; sibsinStem?: string } | undefined {
  const list = natal.saju?.daeun
  if (!list || list.length === 0) return undefined
  const sorted = [...list].sort((a, b) => a.startYear - b.startYear)
  let cur = sorted[0]
  for (const d of sorted) {
    if (d.startYear <= year) cur = d
    else break
  }
  if (!cur) return undefined
  return { ganji: `${cur.stem}${cur.branch}`, ageStart: cur.startAge, ageEnd: cur.startAge + 9 }
}

function sunSignOf(natal: NatalContext): string {
  const planets = (natal.astro?.chart?.planets ?? []) as Array<{ name?: string; sign?: string }>
  return planets.find((p) => p.name === 'Sun')?.sign ?? ''
}

type CycleKind = NonNullable<YearlyImportantDate['cycleInteractions']>[number]['kind']

const HYEONGCHUNG_KIND: Array<{ token: string; kind: CycleKind }> = [
  { token: '천간합', kind: '천간합' },
  { token: '천간충', kind: '천간충' },
  { token: '자형', kind: '자형' },
  { token: '지지합', kind: '지지합' },
  { token: '지지충', kind: '지지충' },
  { token: '지지형', kind: '지지형' },
  { token: '지지해', kind: '지지해' },
  { token: '지지파', kind: '지지파' },
  { token: '합', kind: '지지합' },
  { token: '충', kind: '지지충' },
  { token: '형', kind: '지지형' },
  { token: '해', kind: '지지해' },
  { token: '파', kind: '지지파' },
]

function cycleInteractionsOf(cell: CalendarCell): YearlyImportantDate['cycleInteractions'] {
  const hc = cell.signals.filter((s) => s.kind === 'hyeongchung')
  if (hc.length === 0) return undefined
  const out: NonNullable<YearlyImportantDate['cycleInteractions']> = []
  for (const s of hc.slice(0, 5)) {
    const label = `${s.name} ${s.korean ?? ''}`
    const matched = HYEONGCHUNG_KIND.find((h) => label.includes(h.token))
    out.push({
      pair: s.name,
      kind: matched?.kind ?? '지지합',
      blurb: s.korean ?? s.name,
    })
  }
  return out
}

function crossLine(pct: number, lang: Lang): string {
  if (lang === 'en') {
    if (pct >= 80) return 'Saju and astrology point the same way.'
    if (pct >= 60) return 'One axis leads; the other stays neutral.'
    if (pct >= 45) return 'No clear signal from either side.'
    return 'Saju and astrology pull in opposite directions — verify first.'
  }
  if (pct >= 80) return '사주·점성이 같은 방향을 가리켜요.'
  if (pct >= 60) return '한 축이 끌고 다른 축은 중립이에요.'
  if (pct >= 45) return '양쪽 다 뚜렷한 신호는 없어요.'
  return '사주·점성이 엇갈려요 — 한 번 더 확인하세요.'
}

const LAYER_WEIGHT: Record<SignalLayer, number> = {
  decadal: 1.0,
  yearly: 0.85,
  monthly: 0.7,
  daily: 0.55,
  hourly: 0.4,
  instant: 0.5,
}

const LAYER_LABEL: Record<Lang, Record<SignalLayer, string>> = {
  ko: {
    decadal: '대운',
    yearly: '세운',
    monthly: '월운',
    daily: '일진',
    hourly: '시',
    instant: '정점',
  },
  en: {
    decadal: 'This decade',
    yearly: 'This year',
    monthly: 'This month',
    daily: 'Today',
    hourly: 'This hour',
    instant: 'Right now',
  },
}

// 신호 하나 → 자연문. ↑/↓·[layer] 디버그 prefix 대신 layer+polarity 로 감싼다.
// 신호 라벨(삼합격·Saturn 폴 등 근거)은 유지 — 사주 유저가 기대하는 명리/점성 용어.
function naturalizeFactor(s: ActiveSignal, lang: Lang): string {
  const label = (s.korean ?? s.name).trim()
  const layer = LAYER_LABEL[lang][s.layer]
  const p = s.polarity
  if (lang === 'en') {
    const tone =
      p >= 2
        ? 'strongly in your favour'
        : p === 1
          ? 'lends support'
          : p === -1
            ? 'asks for care'
            : p <= -2
              ? 'presses hard'
              : 'stays quiet'
    return `${layer}: ${label} — ${tone}.`
  }
  const tone =
    p >= 2
      ? '크게 받쳐주는 흐름이에요'
      : p === 1
        ? '흐름을 보태요'
        : p === -1
          ? '주의가 필요해요'
          : p <= -2
            ? '강하게 누르는 신호예요'
            : '잔잔해요'
  return `${layer} ${label}, ${tone}.`
}

function impactOf(s: ActiveSignal): number {
  return Math.abs(s.polarity) * s.weight * (LAYER_WEIGHT[s.layer] ?? 0.5)
}

// source 별 신호를 우호/주의로 갈라 영향 큰 순 정렬 → 자연문 최대 5줄.
// 좋은 날(grade<=1)은 우호 먼저, 흉일(grade>=3)은 주의 먼저.
function rankedFactors(signals: ActiveSignal[], grade: ImportanceGrade, lang: Lang): string[] {
  const pos = signals.filter((s) => s.polarity > 0).sort((a, b) => impactOf(b) - impactOf(a))
  const neg = signals.filter((s) => s.polarity < 0).sort((a, b) => impactOf(b) - impactOf(a))
  // 강한 등급일수록 소수극성은 1줄만(정직한 단서는 남기되 노이즈는 줄임).
  const posN = grade <= 1 ? 4 : grade === 2 ? 3 : 1
  const negN = grade >= 3 ? 4 : grade === 2 ? 2 : 1
  const ordered =
    grade >= 3
      ? [...neg.slice(0, negN), ...pos.slice(0, posN)]
      : [...pos.slice(0, posN), ...neg.slice(0, negN)]
  return ordered.slice(0, 5).map((s) => naturalizeFactor(s, lang))
}

export function deriveDayInterpretation(args: {
  cell: CalendarCell
  natal: NatalContext
  lang?: Lang
  /** 미지정 시 절대 임계값(scoreToGrade). 프로덕션은 백분위 displayGrade 를 주입. */
  grade?: ImportanceGrade
}): YearlyImportantDate {
  const { cell, natal, lang = 'ko' } = args
  const date = cell.datetime.slice(0, 10)
  const year = Number(date.slice(0, 4))
  const score = Math.round(clamp(cell.derivedScore, 2, 99))
  const grade = args.grade ?? scoreToGrade(score)

  const saju = bySource(cell, 'saju')
  const astro = bySource(cell, 'astro')
  const sajuAxis = axisScore(saju)
  const astroAxis = axisScore(astro)
  const diff = Math.abs(sajuAxis - astroAxis)
  const axisAgreement: 'aligned' | 'mixed' | 'opposed' =
    diff <= 12 ? 'aligned' : diff <= 28 ? 'mixed' : 'opposed'
  const crossAgreementPercent = Math.round(clamp(90 - diff * 1.6, 28, 92))

  const { primary, secondary } = pickDomains(cell)
  const label = DOMAIN_LABEL[lang][primary]
  const seed = `${date}|${primary}|${grade}`

  // 요소 — 신호 근거를 자연문으로(디버그 ↑/↓·[layer] prefix 제거). 좋은 날은
  // 우호 위주, 흉일은 주의 위주로 정렬.
  const sajuFactorKeys = rankedFactors(saju, grade, lang)
  const astroFactorKeys = rankedFactors(astro, grade, lang)

  const iljin = findPillar(saju, 'daily')
  const sewoon = findPillar(saju, 'yearly')
  const wolwoon = findPillar(saju, 'monthly')
  const daeun = currentDaeun(natal, year)

  const categories = [DOMAIN_TO_CATEGORY[primary], 'general' as const]
  if (secondary !== primary) {
    const secCat = DOMAIN_TO_CATEGORY[secondary]
    if (!categories.includes(secCat)) categories.unshift(secCat)
  }

  return {
    date,
    grade,
    score,
    rawScore: score,
    adjustedScore: score,
    displayScore: score,
    categories,
    titleKey: `${TITLE_BY_GRADE[lang][grade]}`,
    descKey: DESC_BY_GRADE[lang][grade](label),
    ganzhi: iljin?.ganji ?? '',
    crossVerified: crossAgreementPercent >= 60,
    transitSunSign: sunSignOf(natal),
    sajuFactorKeys,
    astroFactorKeys,
    recommendationKeys: buildRecommendations(grade, primary, `${seed}|rec`),
    warningKeys: buildWarnings(grade, crossAgreementPercent, primary, `${seed}|warn`),
    confidence: clamp(Math.round(45 + (cell.signals.length - 40) * 0.5), 20, 95),
    confidenceNote: lang === 'ko' ? '신호 기반 단일 엔진' : 'signal-based single engine',
    crossAgreementPercent,
    crossCheck: {
      line: crossLine(crossAgreementPercent, lang),
      agreementPercent: crossAgreementPercent,
    },
    longCycleContext: {
      daeun: daeun
        ? { ganji: daeun.ganji, ageStart: daeun.ageStart, ageEnd: daeun.ageEnd }
        : undefined,
      sewoon: sewoon ? { ganji: sewoon.ganji, year, sibsinStem: sewoon.sibsinStem } : undefined,
      wolwoon: wolwoon ? { ganji: wolwoon.ganji, sibsinStem: wolwoon.sibsinStem } : undefined,
      iljin: iljin ? { ganji: iljin.ganji, sibsinStem: iljin.sibsinStem } : undefined,
    },
    cycleInteractions: cycleInteractionsOf(cell),
    scoreBreakdown: { sajuAxis, astroAxis, axisAgreement, finalScore: score },
  }
}

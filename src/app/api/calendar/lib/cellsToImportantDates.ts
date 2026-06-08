/**
 * cellsToImportantDates — v2 CalendarCell[] → ImportantDate[] (마이그레이션 단계 4).
 *
 * 라이브 캘린더의 단일 점수·서사 출처를 v2 엔진으로 일원화하는 브릿지. 구
 * calculateYearlyImportantDates(api/calendar/lib/yearlyDates.ts)의 사주·점성 blend
 * 스코어링 파이프라인을 대체한다. prescore 가 365일 전체에 v2 derivedScore 를 채운
 * 지금, 구 엔진의 blend 는 죽은 fallback 이었고 title/description/factors 는 단계
 * 2b/2c 가 이미 v2 로 덮어쓰고 있었다 — 즉 구 엔진이 실질적으로 만들던 건
 * recommendationKeys/warningKeys(모순방지 게이트) + categories + scoreBreakdown 뿐.
 *
 * 이 브릿지는 그 전부를 v2 셀에서 직접 만든다:
 *  - 점수/등급/축분해/교차검증/ganzhi/themeScores → v2 어댑터(cellToYearlyDate)
 *  - recommendationKeys/warningKeys → 순수 빌더(grade·domain·crossAgreement·seed).
 *    formatDateForResponse 의 gateRecommendations(통신주의↔비가역행동 모순 차단)가
 *    이 키들을 그대로 먹으므로 안전 게이트가 byte-for-byte 유지된다.
 *  - sajuFactorKeys/astroFactorKeys → v2 신호 → 게이트 토큰 매핑(부가 맥락 라인용).
 *
 * 산출물은 YearlyImportantDate(= ImportantDate) 형태로, 기존처럼 formatDateForResponse
 * 에 그대로 흘려보낸다.
 */
import type { ImportanceGrade } from '@/lib/calendar/types'
import type { DomainKey } from './types'
import type { CalendarCell, ActiveSignal } from '@/lib/calendar-engine/types'
import {
  cellToYearlyDate,
  type CalendarLang,
} from '@/lib/calendar-engine/adapters/cellsToYearlyDates'
import {
  pickDaeunForDate,
  sewoonForYear,
  wolwoonFromPillar,
  buildCycleInteractions,
  getSibsinKo,
  type DaeunCycleInput,
} from '@/lib/saju/cycleRelations'
import { getMonthPillarForDate } from '@/lib/saju/datePillars'
import type { YearlyImportantDate } from './yearlyDates'
import { clamp } from '@/lib/utils/math'

// ── 순수 서사-키 빌더 (구 yearlyDates 에서 이관, 동작 동일) ──────────────
// grade·domain·crossAgreement·seed 만으로 결정되는 결정론적 키 선택. 사주 내부
// 계산과 무관하므로 v2 경로에서 그대로 재사용해 게이트 입력을 보존한다.

function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pickBySeed<T>(seed: string, list: readonly T[]): T {
  if (!list.length) return undefined as unknown as T
  return list[hashSeed(seed) % list.length]
}

function buildRecommendations(grade: ImportanceGrade, domain: DomainKey, seed: string): string[] {
  const generalAnchorTier1 = [
    'confidence',
    'achievement',
    'creative',
    'newBeginning',
    'celebration',
    'luck',
  ]
  if (grade <= 1) {
    const anchorPool: Record<DomainKey, string[]> = {
      career: ['business', 'bigDecision', 'majorDecision', 'expression', 'authority', 'promotion'],
      love: ['love', 'meeting', 'dating', 'reconciliation', 'charm', 'selfExpression'],
      money: ['investment', 'finance', 'shopping', 'speculation', 'stableWealth', 'windfall'],
      health: ['discipline', 'achievement', 'newBeginning', 'meditation', 'beauty', 'rest'],
      move: ['moving', 'travel', 'change', 'expansion', 'newBeginning', 'celebration'],
    }
    const support = ['confidence', 'expression', 'collaboration', 'synergy', 'growth', 'harmony']
    return [
      pickBySeed(`${seed}|rec0`, anchorPool[domain] || generalAnchorTier1),
      pickBySeed(`${seed}|rec1`, support),
    ]
  }
  if (grade === 2) {
    const anchorPool = ['planning', 'completion', 'reflection', 'release', 'discipline', 'learning']
    const support = ['careful', 'meditation', 'mentor', 'documents', 'study']
    return [pickBySeed(`${seed}|rec0`, anchorPool), pickBySeed(`${seed}|rec1`, support)]
  }
  const anchorPool = ['careful', 'rest', 'lowProfile', 'postpone', 'meditation']
  const support = ['reflection', 'mentor', 'release']
  return [pickBySeed(`${seed}|rec0`, anchorPool), pickBySeed(`${seed}|rec1`, support)]
}

function buildWarnings(
  grade: ImportanceGrade,
  crossAgreementPercent: number,
  domain: DomainKey,
  seed: string
): string[] {
  if (grade < 2 && crossAgreementPercent >= 60) return []
  const domainWarnings: Record<DomainKey, string[]> = {
    career: ['authority', 'competition', 'opposition', 'rivalry', 'tension'],
    love: ['conflict', 'misunderstanding', 'betrayal', 'tension'],
    money: ['finance', 'loss', 'riskManagement', 'speculation'],
    health: ['health', 'accident', 'injury', 'stress'],
    move: ['travel', 'change', 'avoidTravel', 'instability'],
  }
  const general = ['confusion', 'caution', 'stress', 'tension', 'misunderstanding']
  if (grade >= 3) {
    return [
      pickBySeed(`${seed}|warn0`, domainWarnings[domain] || general),
      pickBySeed(`${seed}|warn1`, general),
    ]
  }
  return [pickBySeed(`${seed}|warn0`, general)]
}

function buildCrossCheckLineKo(percent: number): string {
  if (percent >= 75) {
    return `사주 신호와 점성 신호가 ${percent}%로 같은 방향을 가리킵니다. 둘이 동시에 받쳐줘 결정의 신뢰도가 높습니다.`
  }
  if (percent >= 55) {
    return `사주·점성 교차 일치도 ${percent}% — 큰 줄기는 같지만 세부에서 갈리니 핵심만 잡고 나머지는 미루는 편이 안전합니다.`
  }
  return `사주·점성 교차 일치도 ${percent}%로 낮습니다. 한쪽 신호만 보고 움직이지 말고 다른 축에서 다시 확인하세요.`
}

function buildCrossCheckLineEn(percent: number): string {
  if (percent >= 75) {
    return `Saju and astrology align at ${percent}% — both axes back the same direction, so confidence is high.`
  }
  if (percent >= 55) {
    return `Cross-check ${percent}% — broad direction holds but details diverge; keep the core moves and defer the rest.`
  }
  return `Cross-check ${percent}% — signals diverge. Don't move on a single axis; verify on the other before committing.`
}

// ── v2 신호 → 게이트 factor 토큰 ───────────────────────────────────────
// formatDateForResponse 의 buildFactorAction/buildContextWarnings 가 factor 키에서
// 영문 substring(retrograde/chung/xing/conflict/samhap/yukhap/cheoneul/gongmang/
// accident)을 스캔해 부가 맥락 라인을 만든다. v2 신호의 kind 는 일반값('hyeongchung'
// /'shinsal'/'transit')이라 토큰을 직접 안 품으므로, 한국어 라벨·name 에서 토큰을
// 재도출한다. (핵심 안전 게이트는 warningKeys+confidence 라 이 매핑이 불완전해도
// 비가역 조언 차단은 유지된다.)
function signalToFactorTokens(signal: ActiveSignal): string[] {
  const text = `${signal.korean ?? ''} ${signal.name ?? ''}`.toLowerCase()
  const tokens: string[] = []
  // 형충회합
  if (text.includes('충')) tokens.push('chung')
  if (text.includes('형')) tokens.push('xing')
  if (text.includes('삼합')) tokens.push('samhap')
  if (text.includes('육합') || text.includes('방합')) tokens.push('yukhap')
  if (text.includes('파') || text.includes('해') || text.includes('원진')) tokens.push('conflict')
  // 신살
  if (text.includes('공망')) tokens.push('gongmang')
  if (text.includes('천을')) tokens.push('cheoneul')
  if (text.includes('백호') || text.includes('accident')) tokens.push('accident')
  // 역행 (점성)
  if (text.includes('역행') || text.includes('retrograde')) tokens.push('retrograde')
  return tokens
}

// 추천/주의 텍스트 풀 선택용 기본 도메인. 테마(5버킷) 축이 제거된 뒤로는
// 그날의 "지배 영역"을 더 이상 산출하지 않으므로, 도메인-독립 폴백으로
// 'career' 풀을 일괄 사용한다(텍스트는 grade·crossAgreement·seed 로 여전히 분기).
const DEFAULT_DOMAIN: DomainKey = 'career'

export interface CellsToImportantDatesOptions {
  locale?: CalendarLang
  /** 본명 태양 별자리 — transitSunSign 표시값. */
  sunSign?: string
  /** 본명 사주 — 대운/세운/월운/일진 흐름 사다리 + 운끼리 충/합/형 계산용. */
  natal?: {
    dayMaster: string
    dayBranch: string
    daeunCycles?: DaeunCycleInput[]
    birthYear: number | null
  }
}

/**
 * 시간 층 흐름(대운→세운→월운→일진) + 운끼리 충/합/형 계산.
 * v2 시그니처 기능 — 단계 4 마이그레이션에서 빠졌던 longCycleContext/cycleInteractions
 * 를 saju cycleRelations 헬퍼로 재생성한다. iljin 은 셀이 이미 계산한 ganzhi 재사용해
 * 카드 표시값과 일관.
 */
function buildLongCycle(
  v2Ganzhi: string,
  date: string,
  natal: NonNullable<CellsToImportantDatesOptions['natal']>
): Pick<YearlyImportantDate, 'longCycleContext' | 'cycleInteractions'> {
  const dateObj = new Date(`${date}T12:00:00.000Z`)
  if (Number.isNaN(dateObj.valueOf()) || !natal.dayMaster) return {}
  const { dayMaster, dayBranch } = natal
  const monthPillar = getMonthPillarForDate(dateObj)
  const daeun = pickDaeunForDate(natal.daeunCycles, natal.birthYear, dayMaster, dateObj)
  const sewoon = sewoonForYear(dateObj.getUTCFullYear(), dayMaster)
  const wolwoon = wolwoonFromPillar(monthPillar.stem, monthPillar.branch, dayMaster)
  const iljinStem = v2Ganzhi.charAt(0)
  const iljinBranch = v2Ganzhi.charAt(1)
  return {
    longCycleContext: {
      daeun: daeun ?? undefined,
      sewoon,
      wolwoon,
      iljin: {
        ganji: v2Ganzhi,
        sibsinStem: iljinStem ? getSibsinKo(dayMaster, iljinStem) : undefined,
        sibsinBranch: iljinBranch ? getSibsinKo(dayMaster, iljinBranch) : undefined,
      },
    },
    cycleInteractions: buildCycleInteractions(dayMaster, dayBranch || '', daeun, sewoon, wolwoon, {
      ganji: v2Ganzhi,
    }),
  }
}

/** 한 셀 → ImportantDate. */
export function cellToImportantDate(
  cell: CalendarCell,
  options: CellsToImportantDatesOptions = {}
): YearlyImportantDate {
  const lang: CalendarLang = options.locale ?? 'ko'
  const v2 = cellToYearlyDate(cell, lang)
  const grade = v2.grade as ImportanceGrade
  const score = v2.score
  const domain = DEFAULT_DOMAIN
  const crossAgreementPercent = v2.crossAgreementPercent
  const seed = `${v2.date}|${domain}|${grade}`

  // categories — 5버킷 테마 축 제거로 더 이상 산출하지 않음(빈 배열). UI 도메인
  // 필터/카테고리 칩은 폐기됨(테마는 deriveScore 와 무관해 점수·등급은 불변).
  const categories: YearlyImportantDate['categories'] = []

  // factor 토큰 — saju/astro 신호에서 게이트 토큰 추출 (부가 맥락 라인용).
  const sajuFactorKeys: string[] = []
  const astroFactorKeys: string[] = []
  for (const sig of cell.signals) {
    const toks = signalToFactorTokens(sig)
    if (toks.length === 0) continue
    if (sig.source === 'saju') sajuFactorKeys.push(...toks)
    else astroFactorKeys.push(...toks)
  }

  // confidence — override 상시(prescore 365일)이므로 구 엔진과 동일하게 score 정렬.
  // isLowCoherenceSignal/lowConfidence(비가역 게이트)가 동일하게 발화하도록.
  const confidence = Math.round(clamp(score, 20, 99))

  const warningKeys = buildWarnings(grade, crossAgreementPercent, domain, `${seed}|warn`)

  // 시간 층 흐름(대운/세운/월운/일진) + 운끼리 충/합/형 — natal 주어질 때만.
  const longCycle = options.natal ? buildLongCycle(v2.ganzhi, v2.date, options.natal) : {}

  return {
    ...longCycle,
    date: v2.date,
    grade,
    score,
    rawScore: score,
    adjustedScore: score,
    displayScore: score,
    categories,
    // title/description 은 route 가 v2 문자열로 덮어쓰므로(단계 2b) titleKey/descKey
    // 에는 v2 문자열을 그대로 둔다 — getTranslation 이 미등록 키를 그대로 반환해도
    // 안전하고, 어차피 override 된다.
    titleKey: v2.title,
    descKey: v2.description,
    ganzhi: v2.ganzhi,
    crossVerified: v2.crossVerified,
    transitSunSign: options.sunSign || '',
    sajuFactorKeys: [...new Set(sajuFactorKeys)],
    astroFactorKeys: [...new Set(astroFactorKeys)],
    recommendationKeys: buildRecommendations(grade, domain, `${seed}|rec`),
    warningKeys,
    confidence,
    confidenceNote: lang === 'ko' ? '캘린더 스코어링 기준' : 'Calendar scoring baseline',
    crossAgreementPercent,
    crossCheck: {
      line:
        lang === 'ko'
          ? buildCrossCheckLineKo(crossAgreementPercent)
          : buildCrossCheckLineEn(crossAgreementPercent),
      agreementPercent: crossAgreementPercent,
    },
    scoreBreakdown: v2.scoreBreakdown,
  }
}

/** 셀 배열 → ImportantDate 배열 (날짜 오름차순). */
export function cellsToImportantDates(
  cells: CalendarCell[],
  options: CellsToImportantDatesOptions = {}
): YearlyImportantDate[] {
  return cells
    .filter((c) => c.datetime)
    .map((c) => cellToImportantDate(c, options))
    .sort((a, b) => a.date.localeCompare(b.date))
}

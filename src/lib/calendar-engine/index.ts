import { createHash } from 'node:crypto'
import type {
  ActiveSignal,
  CalendarBuildOptions,
  CalendarCell,
  CalendarRange,
  SignalExtractor,
} from './types'
import type { NatalContext } from './context/types'
import { createCache } from './cache'
import { tagSignalWithThemes } from './themes/tagger'

// 등록된 extractor — 새 추출기 추가 시 여기 import + getRegisteredExtractors에 push
import sajuShinsalExtractor from './extractors/saju-shinsal'
import sajuPillarExtractor from './extractors/saju-pillar'
import sajuHyeongchungExtractor from './extractors/saju-hyeongchung'
import sajuTonggeunExtractor from './extractors/saju-tonggeun'
import sajuTwelveStageExtractor from './extractors/saju-twelve-stage'
import sajuYongsinExtractor from './extractors/saju-yongsin'
import sajuPatternExtractor from './extractors/saju-pattern'
import sajuHourExtractor from './extractors/saju-hour'
import sajuElementFlowExtractor from './extractors/saju-element-flow'
import sajuIljuArchetypeExtractor from './extractors/saju-ilju-archetype'
import sajuJohuYongsinExtractor from './extractors/saju-johu-yongsin'
import sajuShinsalActivationExtractor from './extractors/saju-shinsal-activation'
import sajuNatalBranchRelationExtractor from './extractors/saju-natal-branch-relation'
import sajuElementBalanceExtractor from './extractors/saju-element-balance'
import sajuJijangganExtractor from './extractors/saju-jijanggan'
import sajuGeokgukExtractor from './extractors/saju-geokguk'
import sajuGongmangExtractor from './extractors/saju-gongmang'
import sajuAppliedPatternExtractor from './extractors/saju-applied-pattern'
import { extractCrossActivations } from './extractors/cross-activation'
import astroTransitExtractor from './extractors/astro-transit'
import astroEclipseExtractor from './extractors/astro-eclipse'
import astroProfectionExtractor from './extractors/astro-profection'
import astroLifecycleExtractor from './extractors/astro-lifecycle'
import astroZRExtractor from './extractors/astro-zr'
import astroArabicPartExtractor from './extractors/astro-arabic-part'
import astroFixedStarExtractor from './extractors/astro-fixed-star'
import astroReturnExtractor from './extractors/astro-return'
import astroProgressionExtractor from './extractors/astro-progression'
import astroMoonPhaseVocExtractor from './extractors/astro-moon-phase-voc'
import astroElectionalExtractor from './extractors/astro-electional'
import astroDignityExtractor from './extractors/astro-dignity'
import astroMoonNodesExtractor from './extractors/astro-moon-nodes'
import astroHouseTransitExtractor from './extractors/astro-house-transit'
import astroPlanetaryHourExtractor from './extractors/astro-planetary-hour'
import astroAsteroidExtractor from './extractors/astro-asteroid'
import astroSolarArcExtractor from './extractors/astro-solar-arc'
import astroMidpointExtractor from './extractors/astro-midpoint'
import astroSoulPatternExtractor from './extractors/astro-soul-pattern'

// derivers
import { deriveScore } from './derivers/score'
import { deriveThemeScores } from './derivers/themeScores'
import { deriveTopReasons, deriveCautions } from './derivers/summary'
import { derivePatterns } from './derivers/patterns'
import { computeBaseRates, cellSurprise } from './derivers/surprise'

/**
 * 캘린더 엔진 진입점.
 *
 * 1. NatalContext + range를 받아
 * 2. 등록된 extractor를 모두 실행해 ActiveSignal[]을 모으고
 * 3. tagger로 테마 라벨 보강
 * 4. CalendarCell[]로 그룹핑 + derivers로 점수·패턴·요약 계산
 *
 * 점수는 부산물 — 신호 다발 자체가 데이터의 본질.
 */
export async function buildCalendar(
  natal: NatalContext,
  range: CalendarRange,
  options: CalendarBuildOptions = {}
): Promise<CalendarCell[]> {
  const cache = createCache()
  const ctx = { natal, range, cache }

  // 1) 활성 추출기 결정
  const extractors = getRegisteredExtractors().filter((ex) => {
    if (!options.enabledExtractors) return true
    const kinds = Array.isArray(ex.kind) ? ex.kind : [ex.kind]
    return kinds.some((k) => options.enabledExtractors!.includes(k))
  })

  // 2) 모든 extractor 병렬 실행 → 신호 평탄화
  const signalArrays = await Promise.all(extractors.map((ex) => ex.extract(ctx)))
  const allSignals = signalArrays.flat()

  // 2b) Cross-activation post-pass — 사주 × 점성 동시 활성 페어 (A등급 매핑) 합성.
  //     표준 extractor 와 달리 *다른 추출기들의 결과* 를 입력으로 받기 때문에
  //     extract 패스 이후에 1회 실행. emit 된 cross 신호는 일반 신호처럼 tagger·
  //     groupIntoCells 를 거쳐 cell.signals 에 그대로 들어간다 (matcher 가
  //     conditions.signalKinds: ['cross-activation'] 으로 매칭).
  allSignals.push(...extractCrossActivations(allSignals))

  // 3) 테마 라벨 + 기여 가중 보강
  for (const signal of allSignals) {
    const tagged = tagSignalWithThemes(signal)
    signal.themes = tagged.themes
    signal.themeWeights = tagged.weights
  }

  // 4) 시점별 그룹핑 + derivers
  return groupIntoCells(allSignals, range, options)
}

/**
 * 추출기 레지스트리.
 * Wave 2~3에서 saju-shinsal, astro-transit 등이 여기 추가됨.
 * 각 추출기는 독립이라 하나씩 붙여도 캘린더가 점진 풍부해짐.
 */
function getRegisteredExtractors(): SignalExtractor[] {
  return [
    // ── saju (7) ──
    sajuShinsalExtractor,
    sajuPillarExtractor,
    sajuHyeongchungExtractor,
    sajuTonggeunExtractor,
    sajuTwelveStageExtractor,
    sajuYongsinExtractor,
    sajuPatternExtractor,
    sajuHourExtractor,
    sajuElementFlowExtractor,
    sajuIljuArchetypeExtractor,
    sajuJohuYongsinExtractor,
    // ── 본명 fact-layer 활성화 (natalShinsal / natalRelations / fiveElements) ──
    sajuShinsalActivationExtractor,
    sajuNatalBranchRelationExtractor,
    sajuElementBalanceExtractor,
    sajuJijangganExtractor,
    sajuGeokgukExtractor,
    sajuGongmangExtractor,
    sajuAppliedPatternExtractor,

    // ── astro (13) ──
    astroTransitExtractor,
    astroEclipseExtractor,
    astroProfectionExtractor,
    astroLifecycleExtractor,
    astroZRExtractor,
    astroArabicPartExtractor,
    astroFixedStarExtractor,
    astroReturnExtractor,
    astroProgressionExtractor,
    astroMoonPhaseVocExtractor,
    astroElectionalExtractor,
    astroDignityExtractor,
    astroMoonNodesExtractor,
    astroHouseTransitExtractor,
    astroPlanetaryHourExtractor,
    // ── 정통 단일화 (Hellenistic) — Phase 1: modern esoteric 차단 ──
    // 코드는 살려두되 등록만 끔. 학파 통일 위해 emit 차단.
    // - asteroid (Ceres/Pallas/Juno/Vesta): 19세기+ 발견, 현대 페미니스트 점성
    // - midpoint (Hamburg/Uranian 1923): 정통 아님
    // - soul-pattern (draconic + harmonic, Addey 1976): 완전 현대 esoteric
    // 복원하려면 아래 3줄 주석 해제 + 위 import 사용 (현재 미사용 import 경고
    // 회피 위해 import는 살려둠 — 다시 켜기 한 줄로 해결).
    // astroAsteroidExtractor,
    astroSolarArcExtractor,
    // astroMidpointExtractor,
    // astroSoulPatternExtractor,
  ]
}

/**
 * 신호 배열을 (date, hour?) 셀로 그룹핑.
 * derivers는 다음 wave에서 채움 — 일단 구조만.
 *
 * ── Timezone / day-bucketing contract (server-TZ-independent) ──
 * 셀 키는 항상 UTC midnight(day) 또는 UTC hour 로 정규화한다. extractor 가
 * 내보내는 active window ISO 가 (1) `...Z` UTC, (2) tz-less `...T12:00:00`
 * 둘 다 들어올 수 있는데, 어느 쪽이든 **문자열 prefix slice** 로만 키를 만든다.
 * `new Date()` 파싱을 거치지 않으므로 process.env.TZ(서버 타임존)에 무관하게
 * 같은 입력 → 같은 버킷이 보장된다. (옛 버그: tz-less 문자열을 `new Date()` 로
 * 파싱하면 서버 로컬로 해석돼 Seoul/LA 서버에서 ±1일 버킷이 달라졌다.)
 */
function groupIntoCells(
  signals: ActiveSignal[],
  range: CalendarRange,
  options: CalendarBuildOptions
): CalendarCell[] {
  const cells = new Map<string, CalendarCell>()
  // 셀 키 정규화 — 순수 문자열 prefix slice. tz-less / `...Z` 모두 동일 처리.
  // day:  'YYYY-MM-DD' + 'T00:00:00.000Z'
  // hour: 'YYYY-MM-DDTHH' + ':00:00.000Z'
  // (slice(0,13) 은 'YYYY-MM-DDTHH' 까지 — tz-less·Z 무관하게 wall-clock hour
  //  prefix 를 그대로 키로 쓴다. 서버 TZ 미사용.)
  const isoForCell = (iso: string) =>
    range.granularity === 'hour'
      ? iso.slice(0, 13) + ':00:00.000Z'
      : iso.slice(0, 10) + 'T00:00:00.000Z'

  // 각 셀 timestamp 초기화
  for (const day of iterateRange(range)) {
    cells.set(day, {
      datetime: day,
      signals: [],
      derivedScore: 50,
      salience: 0,
      themeScores: {},
      matchedPatterns: [],
      topReasons: [],
      cautions: [],
    })
  }

  // 신호를 활성 윈도우의 모든 셀에 push
  for (const signal of signals) {
    const startCell = isoForCell(signal.active.start)
    const endCell = isoForCell(signal.active.end)
    for (const cellKey of cellsBetween(startCell, endCell, range.granularity)) {
      const cell = cells.get(cellKey)
      if (!cell) continue
      cell.signals.push(options.includeEvidence ? signal : stripEvidence(signal))
    }
  }

  // derivers — 점수·테마점수·패턴·요약 계산 (점수는 부산물)
  // 패턴을 먼저 검출하고, 점수 계산에 패턴 보너스 반영.
  //
  // score/pattern 입력에서 *정적 본명*(명사) 신호를 제외한다. 그날 가변 신호가
  // 아니라 본명 자체 표지라 매일 같은 impact를 깔아 점수를 오염시킨다(강한 사주
  // 사용자만 매일 좋음으로 inflate — "다 좋네 ㅋ" 편향). narrative(cell.signals
  // 그대로)에는 유지 — 카드에서 본명 격국 확인. 흐름/리포트 분리는
  // docs/운흐름.md §0.5.8 / RAW_DISTRIBUTION.md §2.5(🔴) 참조.
  //  - 'saju-pattern'   : 본명 격국명·일주 archetype (decadal 배경)
  //  - 'geokguk-status' : 본명 격국 성패(±1, daily emit) — v4 추가
  const STATIC_NATAL_KINDS = new Set(['saju-pattern', 'geokguk-status'])
  for (const cell of cells.values()) {
    const scoreSignals = cell.signals.filter((s) => !STATIC_NATAL_KINDS.has(s.kind))
    cell.matchedPatterns = options.enablePatterns === false ? [] : derivePatterns(scoreSignals)
    cell.derivedScore = deriveScore(scoreSignals, cell.matchedPatterns)
    cell.themeScores = deriveThemeScores(cell.signals)
    cell.topReasons = deriveTopReasons(cell.signals, 5, 'ko')
    cell.cautions = deriveCautions(cell.signals, 5, 'ko')
    cell.topReasonsEn = deriveTopReasons(cell.signals, 5, 'en')
    cell.cautionsEn = deriveCautions(cell.signals, 5, 'en')
  }

  // 현저도(salience) — derivedScore(우호도)와 직교하는 "큰 날" 축. base-rate 는
  // *이 빌드 청크* 셀 전체를 모집단으로 1회 측정 후 각 셀에 cellSurprise 적용.
  // 셀당 독립 계산이 아니라 묶음 통계가 필요해서 deriver 루프와 분리한다.
  const cellList = Array.from(cells.values())
  const rates = computeBaseRates(cellList)
  for (const cell of cellList) {
    cell.salience = cellSurprise(cell, rates).total
  }

  return cellList.sort((a, b) => a.datetime.localeCompare(b.datetime))
}

/**
 * ISO 문자열을 UTC epoch ms 로 — server-TZ 무관.
 * `...Z` / `+09:00` 등 오프셋이 명시된 문자열은 그대로 `Date.parse`.
 * tz-less(예 `2026-03-15T12:00:00`, `2026-03-15`) 는 명시적으로 UTC 로 간주
 * (`Z` 부착) 해서 서버 로컬 파싱(±tzOffset 드리프트)을 막는다.
 */
function toUtcMs(iso: string): number {
  const hasOffset = /[zZ]$|[+\-]\d{2}:?\d{2}$/.test(iso)
  if (hasOffset) return Date.parse(iso)
  // tz-less → UTC 강제. 'YYYY-MM-DD' 만 오면 'T00:00:00' 채워 자정 UTC.
  const normalized = iso.length <= 10 ? `${iso}T00:00:00Z` : `${iso}Z`
  return Date.parse(normalized)
}

function* iterateRange(range: CalendarRange): Generator<string> {
  const start = toUtcMs(range.start)
  // 경계 해석 — date-only('YYYY-MM-DD') end 는 "그 날의 끝까지"로 본다. 그래야
  // hour granularity 의 단일일 범위({start:'…', end:'…', 같은 날})가 00:00 한 칸이
  // 아니라 00~23시 전부로 펼쳐진다(시진·행성시 신호가 시각별 셀에 들어가도록).
  // 시각이 명시된 end(길이>10, 예: '…T23:00:00.000Z')는 그대로 존중하므로
  // 프로덕션(date-detail 라우트)·day granularity 동작은 바뀌지 않는다.
  const end = range.end.length <= 10 ? toUtcMs(range.end) + 86_400_000 - 1 : toUtcMs(range.end)
  const step = range.granularity === 'hour' ? 3600_000 : 86_400_000
  for (let t = start; t <= end; t += step) {
    yield new Date(t).toISOString()
  }
}

function* cellsBetween(
  startIso: string,
  endIso: string,
  granularity: 'day' | 'hour'
): Generator<string> {
  // startIso/endIso 는 이미 isoForCell 로 `...Z` 정규화된 키지만, 방어적으로
  // toUtcMs 를 거쳐 어떤 입력이 와도 서버 TZ 에 흔들리지 않게 한다.
  const start = toUtcMs(startIso)
  const end = toUtcMs(endIso)
  const step = granularity === 'hour' ? 3600_000 : 86_400_000
  for (let t = start; t <= end; t += step) {
    yield new Date(t).toISOString()
  }
}

function stripEvidence(signal: ActiveSignal): ActiveSignal {
  return { ...signal, evidence: { module: signal.evidence.module, detail: {} } }
}

/**
 * 빌드 옵션을 캐시 키용 결정론적 해시로 정규화.
 *
 * `getOrBuildMonth` / 인-프로세스 memCache 는 본래 (birthKey, monthKey) 만으로
 * 키를 잡았는데, 실제 빌드된 cells 는 `includeEvidence`(evidence 포함 여부) ·
 * `enablePatterns`(패턴 매칭 on/off) · `enabledExtractors` · `focusThemes` 옵션에
 * 따라 달라진다 (index.ts groupIntoCells 참고). 지금은 모든 caller 가
 * `{ includeEvidence: true }` 한 가지만 넘겨서 충돌이 잠복해 있을 뿐이다.
 * 다른 옵션을 넘기는 미래 caller 가 잘못된 캐시 cell 을 받지 않도록 옵션을
 * 캐시 키에 접는다.
 *
 * 키만 짧고 안정적이면 되므로:
 *  - 결정론을 위해 객체 키를 정렬해 정준(canonical) JSON 으로 만든다.
 *  - cells 결과에 실제로 영향을 주는 옵션만 포함한다 (현재 인터페이스의 4개 전부).
 *  - 배열 옵션(enabledExtractors/focusThemes)도 정렬해 순서 무관 동일 키.
 * 기존 단일 옵션 형태 `{ includeEvidence: true }` 의 해시는 안정적으로 고정된다.
 */
export function makeOptionsKey(options: CalendarBuildOptions = {}): string {
  const sortStrings = (xs?: readonly string[]) => (xs ? [...xs].sort() : undefined)
  // 정준 형태 — 키 알파벳 순, 미지정(undefined) 필드는 생략해 안정성 확보.
  const canonical: Record<string, unknown> = {}
  if (options.enabledExtractors !== undefined)
    canonical.enabledExtractors = sortStrings(options.enabledExtractors)
  if (options.enablePatterns !== undefined) canonical.enablePatterns = options.enablePatterns
  if (options.focusThemes !== undefined) canonical.focusThemes = sortStrings(options.focusThemes)
  if (options.includeEvidence !== undefined) canonical.includeEvidence = options.includeEvidence
  const keys = Object.keys(canonical).sort()
  const json = JSON.stringify(canonical, keys)
  return createHash('sha1').update(json).digest('hex').slice(0, 16)
}

export type { ActiveSignal, CalendarCell, CalendarRange, CalendarBuildOptions } from './types'
export type { NatalContext } from './context/types'

/**
 * Test-only surface for the pure, deterministic day/hour bucketing.
 *
 * Exposed so `tests/lib/calendar-engine/calendar-tz.*` can pin that
 * signal→cell bucketing is server-TZ-independent (process.env.TZ has no
 * effect) without paying the Swiss Ephemeris cost of a full
 * `buildCalendar`. NOT part of the engine's public API — do not import
 * from product code.
 */
export const __bucketingInternals = {
  groupIntoCells,
  toUtcMs,
}

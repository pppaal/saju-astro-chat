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
import astroTransitExtractor from './extractors/astro-transit'
import astroEclipseExtractor from './extractors/astro-eclipse'
import astroProfectionExtractor from './extractors/astro-profection'
import astroLifecycleExtractor from './extractors/astro-lifecycle'
import astroZRExtractor from './extractors/astro-zr'
import astroArabicPartExtractor from './extractors/astro-arabic-part'
import astroFixedStarExtractor from './extractors/astro-fixed-star'
import astroReturnExtractor from './extractors/astro-return'
import astroProgressionExtractor from './extractors/astro-progression'
import astroPlanetaryHourExtractor from './extractors/astro-planetary-hour'
import astroElectionalExtractor from './extractors/astro-electional'

// derivers
import { deriveScore } from './derivers/score'
import { deriveThemeScores } from './derivers/themeScores'
import { deriveTopReasons } from './derivers/summary'

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
  options: CalendarBuildOptions = {},
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

  // 3) 테마 라벨 보강
  for (const signal of allSignals) {
    signal.themes = tagSignalWithThemes(signal)
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
    // ── saju (4) ──
    sajuShinsalExtractor,
    sajuPillarExtractor,
    sajuHyeongchungExtractor,
    sajuTonggeunExtractor,
    // TODO: saju-pattern (격국 컨텍스트화)

    // ── astro (11) ──
    astroTransitExtractor,
    astroEclipseExtractor,
    astroProfectionExtractor,
    astroLifecycleExtractor,
    astroZRExtractor,
    astroArabicPartExtractor,
    astroFixedStarExtractor,
    astroReturnExtractor,
    astroProgressionExtractor,
    astroPlanetaryHourExtractor,
    astroElectionalExtractor,
  ]
}

/**
 * 신호 배열을 (date, hour?) 셀로 그룹핑.
 * derivers는 다음 wave에서 채움 — 일단 구조만.
 */
function groupIntoCells(
  signals: ActiveSignal[],
  range: CalendarRange,
  options: CalendarBuildOptions,
): CalendarCell[] {
  const cells = new Map<string, CalendarCell>()
  const isoForCell = (iso: string) =>
    range.granularity === 'hour' ? iso.slice(0, 13) + ':00:00.000Z' : iso.slice(0, 10) + 'T00:00:00.000Z'

  // 각 셀 timestamp 초기화
  for (const day of iterateRange(range)) {
    cells.set(day, {
      datetime: day,
      signals: [],
      derivedScore: 50,
      themeScores: {},
      matchedPatterns: [],
      topReasons: [],
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

  // derivers — 점수·테마점수·요약 계산 (점수는 부산물)
  for (const cell of cells.values()) {
    cell.derivedScore = deriveScore(cell.signals)
    cell.themeScores = deriveThemeScores(cell.signals)
    cell.topReasons = deriveTopReasons(cell.signals)
    // TODO: matchedPatterns — 별도 wave에서 추가
  }

  return Array.from(cells.values()).sort((a, b) => a.datetime.localeCompare(b.datetime))
}

function* iterateRange(range: CalendarRange): Generator<string> {
  const start = new Date(range.start).getTime()
  const end = new Date(range.end).getTime()
  const step = range.granularity === 'hour' ? 3600_000 : 86_400_000
  for (let t = start; t <= end; t += step) {
    yield new Date(t).toISOString()
  }
}

function* cellsBetween(
  startIso: string,
  endIso: string,
  granularity: 'day' | 'hour',
): Generator<string> {
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  const step = granularity === 'hour' ? 3600_000 : 86_400_000
  for (let t = start; t <= end; t += step) {
    yield new Date(t).toISOString()
  }
}

function stripEvidence(signal: ActiveSignal): ActiveSignal {
  return { ...signal, evidence: { module: signal.evidence.module, detail: {} } }
}

export type { ActiveSignal, CalendarCell, CalendarRange, CalendarBuildOptions } from './types'
export type { NatalContext } from './context/types'

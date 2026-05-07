/**
 * 통합 엔진 오케스트레이터 — include 옵션에 따라 필요한 엔진만 호출 (lazy).
 *
 * 호출 순서:
 *   1. saju (자평력) — 기본
 *   2. astro (천기력) — 점성·교차·매트릭스에 필요
 *   3. cross (운명력) — saju + astro 모두 있어야 가능
 *   4. matrix (1206 셀) — saju + astro 모두 있어야 가능
 *
 * 의존성: cross 또는 matrix 호출 시 saju + astro 자동 호출.
 */
import { runMainSaju } from '../saju-engine'
import { runAstroEngine } from '../astro-engine'
import { runCrossEngine } from '../cross-engine'
import { calculateDestinyMatrix } from '../destiny-matrix/engine'
import { buildMatrixInput } from './adapters/matrixAdapter'
import { reconcileScores } from './enrichers/scoreReconciler'
import type { UnifiedInput, UnifiedOptions, UnifiedOutput } from './types'

const DEFAULT_LATITUDE = 37.5665
const DEFAULT_LONGITUDE = 126.978
const DEFAULT_TIMEZONE = 'Asia/Seoul'

export async function runUnifiedEngine(
  input: UnifiedInput,
  options: UnifiedOptions = {},
): Promise<UnifiedOutput> {
  const include = options.include ?? ['all']
  const want = (k: 'saju' | 'astro' | 'cross' | 'matrix') =>
    include.includes('all') || include.includes(k)

  // cross/matrix 는 saju+astro 의존
  const needsSaju = want('saju') || want('cross') || want('matrix')
  const needsAstro = want('astro') || want('cross') || want('matrix')

  const components: string[] = []
  const out: UnifiedOutput = {
    engine: {
      name: '운명 통합 엔진',
      version: '1.0',
      components,
    },
    input,
  }

  // 1. 자평력
  if (needsSaju) {
    out.saju = runMainSaju({
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      gender: input.gender,
      timezone: input.timezone || DEFAULT_TIMEZONE,
      targetDate: input.targetDate,
    })
    components.push('saju')
  }

  // 2. 천기력
  if (needsAstro) {
    out.astro = await runAstroEngine({
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      latitude: input.latitude ?? DEFAULT_LATITUDE,
      longitude: input.longitude ?? DEFAULT_LONGITUDE,
      timezone: input.timezone || DEFAULT_TIMEZONE,
      targetDate: input.targetDate,
    })
    components.push('astro')
  }

  // 3. 운명력 (사주↔점성 교차)
  if (want('cross') && out.saju && out.astro) {
    out.cross = runCrossEngine(out.saju, out.astro, input.segment)
    components.push('cross')
  }

  // 4. Destiny Matrix (1206 셀)
  if (want('matrix') && out.saju && out.astro) {
    try {
      const matrixInput = buildMatrixInput(out.saju, out.astro)
      out.matrix = calculateDestinyMatrix(matrixInput)
      components.push('matrix')
    } catch {
      // matrix 실패 시 무시 (다른 데이터는 살림)
    }
  }

  // 5. Unified score reconciliation (Matrix ↔ 운명력)
  if (out.cross || out.matrix) {
    out.unified = {
      scores: reconcileScores(out.matrix, out.cross),
    }
    components.push('unified')
  }

  return out
}

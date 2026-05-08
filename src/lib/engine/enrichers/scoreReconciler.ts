/**
 * Matrix ↔ 운명력 점수 통합 — 두 시스템이 같은 도메인에 다른 점수를 주는
 * 문제 해결. blended 점수 + 일치도 + verdict 추출.
 *
 * 매핑:
 *   Matrix career   ↔ Cross career
 *   Matrix money    ↔ Cross wealth
 *   Matrix love     ↔ Cross love
 *   Matrix health   ↔ Cross health
 *   Matrix move     → Cross 미존재 (single)
 *   Cross growth    → Matrix 미존재 (single)
 *   Cross family    → Matrix 미존재 (single)
 *
 * 가중치: Matrix 0.55 (calibration 튜닝됨) / Cross 0.45 (시그널 풍부)
 */
import type { CrossEngineOutput, ThemeKind } from '../../matrix/cross'
import type { DestinyFusionMatrixComputed } from '../../matrix/types'

export interface UnifiedDomainScore {
  domain: ThemeKind | 'move'
  /** Matrix 1206셀 도메인 점수 (0-10) — 없으면 undefined */
  matrixScore?: number
  /** 운명력 인생 전체 테마 점수 (0-10) — 없으면 undefined */
  crossScore?: number
  /** 가중 평균 (둘 다 있을 때) 또는 단일 점수 */
  blendedScore: number
  /** grade — 천운/길/평/주의/흉 */
  grade: '천운' | '길' | '평' | '주의' | '흉'
  /** 두 시스템 일치 정도 */
  alignment: 'aligned' | 'mixed' | 'opposed' | 'single'
  /** 종합 한 줄 */
  verdict: string
}

export interface UnifiedScoresOutput {
  domains: Record<string, UnifiedDomainScore>
  /** 종합 한 줄 (영역 비교) */
  summary: string
}

const MATRIX_TO_CROSS: Record<string, ThemeKind> = {
  career: 'career',
  money: 'wealth',
  love: 'love',
  health: 'health',
  // 'move' has no cross equivalent
}

function gradeFromPct(pct: number): UnifiedDomainScore['grade'] {
  if (pct >= 85) return '천운'
  if (pct >= 70) return '길'
  if (pct >= 50) return '평'
  if (pct >= 30) return '주의'
  return '흉'
}

function alignmentFromGap(gap: number, both: boolean): UnifiedDomainScore['alignment'] {
  if (!both) return 'single'
  if (gap < 1.5) return 'aligned'
  if (gap < 4) return 'mixed'
  return 'opposed'
}

export function reconcileScores(
  matrix: DestinyFusionMatrixComputed | undefined,
  cross: CrossEngineOutput | undefined,
): UnifiedScoresOutput {
  const domains: Record<string, UnifiedDomainScore> = {}

  // Matrix 도메인 점수 추출
  const matrixDomains = matrix?.summary?.domainScores || {}

  // Cross 인생 전체 점수 추출 (테마별)
  const crossLifeScores: Partial<Record<ThemeKind, number>> = {}
  if (cross) {
    for (const cell of cross.matrix) {
      if (cell.horizon === 'life') {
        crossLifeScores[cell.theme] = cell.signal.score
      }
    }
  }

  // 1) Matrix 도메인 처리 (career/money/love/health/move)
  for (const [matrixKey, scoreObj] of Object.entries(matrixDomains)) {
    const crossKey = MATRIX_TO_CROSS[matrixKey] as ThemeKind | undefined
    const matrixScore = (scoreObj as { finalScoreAdjusted?: number }).finalScoreAdjusted
    const crossScore = crossKey ? crossLifeScores[crossKey] : undefined

    const both = matrixScore !== undefined && crossScore !== undefined
    const blended = both
      ? (matrixScore as number) * 0.55 + (crossScore as number) * 0.45
      : (matrixScore ?? crossScore ?? 5)
    const gap = both ? Math.abs((matrixScore as number) - (crossScore as number)) : 0
    const align = alignmentFromGap(gap, both)
    const grade = gradeFromPct((blended / 10) * 100)

    const verdict = (() => {
      const label = matrixKey === 'money' ? '재물' :
                    matrixKey === 'career' ? '직업' :
                    matrixKey === 'love' ? '사랑' :
                    matrixKey === 'health' ? '건강' :
                    matrixKey === 'move' ? '이동' : matrixKey
      if (align === 'single') return `${label} ${grade} (단일 시스템)`
      if (align === 'aligned') return `${label} ${grade} — 동·서 일치 (확실)`
      if (align === 'mixed') return `${label} ${grade} — 시그널 혼재 (Matrix ${matrixScore?.toFixed(1)}/Cross ${crossScore?.toFixed(1)})`
      return `${label} ${grade} — 동·서 갈등 (Matrix ${matrixScore?.toFixed(1)} vs Cross ${crossScore?.toFixed(1)})`
    })()

    domains[crossKey || matrixKey] = {
      domain: (crossKey || matrixKey) as ThemeKind | 'move',
      matrixScore,
      crossScore,
      blendedScore: Math.round(blended * 10) / 10,
      grade,
      alignment: align,
      verdict,
    }
  }

  // 2) Cross 전용 도메인 (growth, family) — Matrix 매핑 없음
  for (const theme of ['growth', 'family'] as ThemeKind[]) {
    const crossScore = crossLifeScores[theme]
    if (crossScore === undefined) continue
    const grade = gradeFromPct((crossScore / 10) * 100)
    const label = theme === 'growth' ? '학업·성장' : '가족·인복'
    domains[theme] = {
      domain: theme,
      crossScore,
      blendedScore: Math.round(crossScore * 10) / 10,
      grade,
      alignment: 'single',
      verdict: `${label} ${grade} (운명력 단일 — Matrix 미커버)`,
    }
  }

  // 종합 한 줄
  const ranked = Object.values(domains).sort((a, b) => b.blendedScore - a.blendedScore)
  const top = ranked[0]
  const bottom = ranked[ranked.length - 1]
  const aligned = ranked.filter((d) => d.alignment === 'aligned').length
  const opposed = ranked.filter((d) => d.alignment === 'opposed').length
  const summary =
    top && bottom
      ? `최강: ${top.domain} (${top.blendedScore}) / 최약: ${bottom.domain} (${bottom.blendedScore}) | 동·서 일치 ${aligned} / 갈등 ${opposed}`
      : '도메인 데이터 없음'

  return { domains, summary }
}

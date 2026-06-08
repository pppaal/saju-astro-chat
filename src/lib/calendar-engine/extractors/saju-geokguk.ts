import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import { getGeokgukRich } from '@/lib/chart-dictionary'

// 격국 성패 상태 → 흐름 한 줄.
const STATUS_FLOW: Record<string, string> = {
  성격: '격이 제대로 갖춰져 본연의 힘을 발휘하는 구조예요',
  파격: '격이 깨져 본연의 힘이 새거나 어긋나는 구조예요',
  반성반파: '격이 반쯤 갖춰져 조건에 따라 살았다 죽었다 하는 구조예요',
}
const STATUS_FLOW_EN: Record<string, string> = {
  성격: 'the structure is well-formed and works at full strength',
  파격: 'the structure is broken — its native power leaks or misfires',
  반성반파: 'the structure is half-formed — it lives or dies by the conditions',
}
const STATUS_LABEL_EN: Record<string, string> = {
  성격: 'well-formed',
  파격: 'broken',
  반성반파: 'half-formed',
}

/**
 * 본명 격국 성패(成敗) 추출기.
 *
 * `advancedAnalysis.geokguk.statusResult` 에 정격·비격 사주의 성격/파격/반성반파
 * 판정이 담겨 있다 (build.ts → performAnalyses → determineGeokgukAdvanced).
 * 이를 매일 frame 신호로 띄움 — 본명 평생 활성이지만 score 에 매일 기여.
 *
 * saju-pattern 과의 차이:
 *  - saju-pattern: 격국명(label) 만 emit. polarity +1, weight 0.9, decadal layer.
 *    index.ts groupIntoCells 의 `scoreSignals.filter((s) => s.kind !== 'saju-pattern')`
 *    에 걸려 매일 score 에서 제외. narrative(cell.signals)에만 노출.
 *  - saju-geokguk: 격국의 성패(quality) 신호. kind='geokguk-status' 라 위 필터 통과 →
 *    매일 score 에 기여. layer 'daily' 로 cell 마다 1개 emit.
 *
 * Phase 2 변경 (재감사 이슈 #1):
 *  - 종전: 'saju-pattern' kind + decadal layer (lifetime 1회) → score 에서 제외돼 매일 점수 미반영.
 *  - 현재: 'geokguk-status' kind + daily layer (매일 1회 emit) → 매일 점수에 약한 frame 으로 반영.
 *    weight 를 낮춰(0.25) 격국 1개가 모든 셀을 inflate 하던 본질 문제는 피하면서,
 *    성패 자체는 매일 ±1 정도의 frame 으로 작동.
 *
 * 점수 영향 (각 셀당):
 *  - 성격: polarity +1, weight 0.25 — 길 frame
 *  - 파격: polarity −1, weight 0.25 — 흉 frame
 *  - 반성반파: polarity 0, weight 0.20 — 중립 표지만
 */

const sajuGeokgukExtractor: SignalExtractor = {
  source: 'saju',
  kind: 'geokguk-status',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const signals: ActiveSignal[] = []

    const advanced = natal.saju.analyses?.geokguk
    if (!advanced || !advanced.primary || advanced.primary === '미정') {
      return signals
    }

    const statusResult = (
      advanced as {
        statusResult?: {
          status: '성격' | '파격' | '반성반파'
          factors: { positive: string[]; negative: string[] }
          description: string
        }
      }
    ).statusResult
    if (!statusResult) return signals

    const geokguk = advanced.primary as string
    const status = statusResult.status
    const polarity: Polarity = status === '성격' ? 1 : status === '파격' ? -1 : 0
    const weight = status === '반성반파' ? 0.2 : 0.25

    // reason — positive·negative 요인을 사람이 읽을 수 있게 한 줄로.
    const reasonParts: string[] = []
    if (statusResult.factors.positive.length > 0) {
      reasonParts.push(`성격요소(${statusResult.factors.positive.join(', ')})`)
    }
    if (statusResult.factors.negative.length > 0) {
      reasonParts.push(`파격요소(${statusResult.factors.negative.join(', ')})`)
    }
    const reason = reasonParts.length > 0 ? reasonParts.join(' · ') : statusResult.description

    // 격국 본질 tagline + 성패 의미를 한 줄로.
    const tagline = getGeokgukRich(geokguk, 'ko')?.tagline
    const statusFlow = STATUS_FLOW[status] ?? statusResult.description
    const korean = tagline
      ? `${geokguk}·${status} — ${statusFlow} (${tagline})`
      : `${geokguk}·${status} — ${statusFlow}`

    // EN — geokguk rich tagline(en) + 성패 의미.
    const taglineEn = getGeokgukRich(geokguk, 'en')?.tagline
    const statusFlowEn = STATUS_FLOW_EN[status] ?? ''
    const english = taglineEn
      ? `${geokguk} (${STATUS_LABEL_EN[status] ?? status}) — ${statusFlowEn} (${taglineEn})`
      : `${geokguk} (${STATUS_LABEL_EN[status] ?? status}) — ${statusFlowEn}`

    // 매일 frame — range 의 모든 day cell 에 1 signal 씩 emit.
    // layer 'daily' + 24h active window 로 1 day cell 에 정확히 1번 들어감.
    const start = new Date(range.start)
    const end = new Date(range.end)
    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const d = new Date(t)
      const dayIso = d.toISOString().slice(0, 10)
      signals.push({
        id: `saju.geokguk-status.${dayIso}.${geokguk}.${status}`,
        source: 'saju',
        kind: 'geokguk-status',
        name: `${geokguk} (${status})`,
        korean,
        english,
        polarity,
        layer: 'daily',
        active: {
          start: `${dayIso}T00:00:00.000Z`,
          peak: `${dayIso}T12:00:00.000Z`,
          end: `${dayIso}T23:59:59.999Z`,
        },
        weight,
        evidence: {
          module: 'saju-geokguk',
          detail: {
            geokguk,
            category: advanced.category,
            status,
            reason,
            positiveFactors: statusResult.factors.positive,
            negativeFactors: statusResult.factors.negative,
            description: statusResult.description,
            kind: 'geokguk-status',
            framePhase: 'daily-frame',
          },
        },
      })
    }

    return signals
  },
}

export default sajuGeokgukExtractor

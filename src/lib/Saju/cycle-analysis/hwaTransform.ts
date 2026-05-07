/**
 * 천간합 化 (Heavenly Stem Combination Transform) — cycle 천간이
 * 본명 4기둥 천간과 합할 때, 단순 합인지 진짜 化하는지 정통 룰로 판정.
 *
 * 천간오합 (天干五合):
 *   甲己 → 化土
 *   乙庚 → 化金
 *   丙辛 → 化水
 *   丁壬 → 化木
 *   戊癸 → 化火
 *
 * 化 성립 조건 (자평진전 단순화 룰):
 *   1. 月令이 化한 오행이거나 化한 오행을 生하는 오행 → 진짜 化
 *   2. 月令이 化한 오행을 극하는 오행 → 化 깨짐 (假合)
 *   3. 그 외 → 단순 합 (묶임만)
 *
 * 의미:
 *   - 일간 합화 = 가장 큰 사건 (직업/관계 전환)
 *   - 假合 = 행동 제약 (둘이 묶여서 자기 역할 못함)
 *   - 진짜 化 = 본명 흐름 변질
 */

const HAP_PAIRS: Record<string, { partner: string; element: string }> = {
  甲: { partner: '己', element: '토' }, 己: { partner: '甲', element: '토' },
  乙: { partner: '庚', element: '금' }, 庚: { partner: '乙', element: '금' },
  丙: { partner: '辛', element: '수' }, 辛: { partner: '丙', element: '수' },
  丁: { partner: '壬', element: '목' }, 壬: { partner: '丁', element: '목' },
  戊: { partner: '癸', element: '화' }, 癸: { partner: '戊', element: '화' },
}

const BRANCH_MAIN_ELEMENT: Record<string, string> = {
  寅: '목', 卯: '목', 辰: '토',
  巳: '화', 午: '화', 未: '토',
  申: '금', 酉: '금', 戌: '토',
  亥: '수', 子: '수', 丑: '토',
}

// 오행 상생: A 가 B 를 生
const SHENG: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
// 오행 상극: A 가 B 를 克
const KE: Record<string, string> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' }

export type HwaQuality = 'true' | 'false' | 'simple'

export interface HwaHapEvent {
  /** 본명 어느 위치와 합? */
  natalPillar: 'year' | 'month' | 'day' | 'time'
  /** 본명 천간 (cycle 천간의 합 파트너) */
  natalStem: string
  /** 化한 오행 */
  hwaElement: string
  /** 化 품질: true=진짜 化 / false=假合(깨짐) / simple=단순 합 */
  quality: HwaQuality
  /** 의미 강도 (일간 합 = 3, 그 외 1-2) */
  significance: number
  /** 한 줄 설명 */
  description: string
}

export interface HwaTransformAnalysis {
  events: HwaHapEvent[]
  /** 가장 강한 이벤트 */
  primaryEvent?: HwaHapEvent
  summary: string
}

interface HwaInput {
  cycleStem: string
  natalStems: { year: string; month: string; day: string; time: string }
  monthBranch: string
}

export function analyzeHwaTransform(input: HwaInput): HwaTransformAnalysis {
  const cycleHap = HAP_PAIRS[input.cycleStem]
  if (!cycleHap) {
    return { events: [], summary: '천간합 없음' }
  }

  const monthEl = BRANCH_MAIN_ELEMENT[input.monthBranch]
  const events: HwaHapEvent[] = []

  for (const pillar of ['year', 'month', 'day', 'time'] as const) {
    const natalStem = input.natalStems[pillar]
    if (natalStem !== cycleHap.partner) continue

    const hwaEl = cycleHap.element
    let quality: HwaQuality = 'simple'
    let qualityNote = ''
    if (monthEl === hwaEl) {
      quality = 'true'
      qualityNote = `월지 ${input.monthBranch}(${monthEl}) = 化한 오행 → 진짜 化`
    } else if (monthEl && SHENG[monthEl] === hwaEl) {
      quality = 'true'
      qualityNote = `월지 ${input.monthBranch}(${monthEl})가 化氣 ${hwaEl}을 生 → 진짜 化`
    } else if (monthEl && KE[monthEl] === hwaEl) {
      quality = 'false'
      qualityNote = `월지 ${input.monthBranch}(${monthEl})가 化氣 ${hwaEl}을 克 → 假合 (化 깨짐)`
    } else {
      qualityNote = `월령 부족 → 단순 합 (묶임)`
    }

    // 일간 합은 가장 큰 사건
    const significance = pillar === 'day' ? 3 : pillar === 'month' ? 2 : 1

    events.push({
      natalPillar: pillar,
      natalStem,
      hwaElement: hwaEl,
      quality,
      significance,
      description: `${input.cycleStem}${natalStem} 합 → 化${hwaEl}: ${qualityNote}`,
    })
  }

  events.sort((a, b) => b.significance - a.significance)
  const primary = events[0]

  return {
    events,
    primaryEvent: primary,
    summary: buildSummary(events, primary),
  }
}

function buildSummary(events: HwaHapEvent[], primary?: HwaHapEvent): string {
  if (events.length === 0) return '천간합 없음'
  if (!primary) return `${events.length}개 합 이벤트`
  const labels: Record<HwaQuality, string> = {
    true: '진짜 化',
    false: '假合 (깨짐)',
    simple: '단순 합',
  }
  return `${primary.natalPillar} 합 → 化${primary.hwaElement} (${labels[primary.quality]}, 강도 ${primary.significance})`
}

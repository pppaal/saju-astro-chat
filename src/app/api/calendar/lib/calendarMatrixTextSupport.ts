import type { DomainKey, DomainScore, MonthlyOverlapPoint } from '@/lib/destiny-matrix/types'
import type { TimingCalibrationSummary } from '@/lib/destiny-matrix/types'
import { EVIDENCE_CONFIDENCE_THRESHOLDS } from '@/lib/destiny-map/calendar/scoring-config'
import { repairMojibakeText } from '@/lib/text/mojibake'

type MatrixSignal = {
  level: 'high' | 'medium' | 'caution'
  trigger: string
  score: number
}

const CROSS_AGREEMENT_ALIGNMENT_THRESHOLD = 60

const MATRIX_TECHNICAL_PAYLOAD_PATTERN =
  /(pair=|angle=|orb=|allowed=|dayMaster=|geokguk=|yongsin=|sibsin=|daeun=|saeun=|wolun=|iljin=|currentDaeun=|currentSaeun=|currentWolun=|currentIljin=|profile=|matrix=|overlap=|orbFit=|set\s*\d+)/i

export type MatrixCalendarContext = {
  calendarSignals?: MatrixSignal[]
  overlapTimeline?: MonthlyOverlapPoint[]
  overlapTimelineByDomain?: Record<DomainKey, MonthlyOverlapPoint[]>
  timingCalibration?: TimingCalibrationSummary
  domainScores?: Record<DomainKey, DomainScore>
} | null

export function isAlignedAcrossSystems(crossAgreementPercent: number | undefined): boolean {
  return (
    typeof crossAgreementPercent === 'number' &&
    Number.isFinite(crossAgreementPercent) &&
    crossAgreementPercent >= CROSS_AGREEMENT_ALIGNMENT_THRESHOLD
  )
}

export function isLowCoherenceSignal(
  confidence: number | undefined,
  crossAgreementPercent: number | undefined
): boolean {
  const lowConfidence = (confidence ?? 100) < EVIDENCE_CONFIDENCE_THRESHOLDS.low
  const lowAgreement =
    typeof crossAgreementPercent === 'number' &&
    Number.isFinite(crossAgreementPercent) &&
    crossAgreementPercent < CROSS_AGREEMENT_ALIGNMENT_THRESHOLD
  return lowConfidence || lowAgreement
}

export function isDefensivePhaseLabel(value: string | undefined): boolean {
  if (!value) return false
  return /(defensive\s*reset|stabilization|방어\/재정렬|안정화)/i.test(repairMojibakeText(value))
}

function humanizeCalendarEngineText(value: string | undefined): string {
  const repaired = repairMojibakeText(String(value || '')).trim()
  if (!repaired) return ''

  return repaired
    .replace(/레이어\s*0/gi, '핵심 조건')
    .replace(/레이어\s*1/gi, '보조 조건')
    .replace(
      /공격\s*(\d+(?:\.\d+)?)%\s*\/\s*방어\s*(\d+(?:\.\d+)?)%/gi,
      '밀어붙일 힘 $1% / 신중하게 볼 부분 $2%'
    )
    .replace(/방어\/재정렬 국면/gi, '서두르기보다 정리와 점검이 중요한 흐름')
    .replace(/공격\/확장 국면/gi, '움직이되 범위를 넓히기보다 핵심을 밀기 좋은 흐름')
    .replace(
      /확장 신호가 우세하여 실행력을 올리기 좋은 구간입니다\.?/gi,
      '움직일 여지는 있지만 판을 크게 벌리기보다 핵심 한두 가지에 집중하는 편이 좋습니다.'
    )
    .replace(
      /레이어\s*0 신호는 해당 구간의 실행 조건을 조정하라는 의미를 가집니다\.?/gi,
      '조건을 한 번 더 맞춘 뒤 들어가라는 뜻입니다.'
    )
    .replace(
      /핵심 흐름의 방향을 좁혀 실행력을 높이세요\.?/gi,
      '할 일을 넓히지 말고 한두 가지에 집중하세요.'
    )
}

export function sanitizeMatrixNarrativeLine(value: string | undefined): string {
  const original = humanizeCalendarEngineText(value)
  if (!original) return ''

  const cleaned = original
    .replace(
      /\bsibsin\s*=\s*.*?(?=,\s*(?:currentDaeun|currentSaeun|currentWolun|currentIljin|dayMaster|geokguk|yongsin|daeun|saeun|wolun|iljin|profile|matrix|overlap|pair|angle|orb|allowed|orbFit)\s*=|\||$)/gi,
      ' '
    )
    .replace(
      /\b(?:pair|angle|orb|allowed|dayMaster|geokguk|yongsin|daeun|saeun|wolun|iljin|currentDaeun|currentSaeun|currentWolun|currentIljin|profile|matrix|overlap|orbFit)\s*=\s*[^,|)\]]+/gi,
      ' '
    )
    .replace(/\b[가-힣A-Za-z]+\(\d+\)\b/g, ' ')
    .replace(/\b(?:birthDate|birthTime)\b\s*[:=]?\s*/gi, ' ')
    .replace(/[|]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,;:/\-|]+|[\s,;:/\-|]+$/g, '')

  const humanized = cleaned
    .replace(/성향 축에서는/gi, '지금은')
    .replace(/시기 축에서는/gi, '시기상')
    .replace(/통합 레이어:\s*/gi, '')
    .replace(/타이밍 레이어:\s*/gi, '')
    .replace(/전체 패턴을 실행 가능한 전략으로 압축합니다\./gi, '')
    .replace(/대운·세운·월운·일진 활성도를 해석합니다\./gi, '큰 흐름과 당장의 변수를 함께 읽습니다.')
    .replace(
      /핵심 조건 신호는 해당 구간의 실행 조건을 조정하라는 의미를 가집니다\./gi,
      '들어갈 때 필요한 조건을 먼저 맞추라는 뜻입니다.'
    )
    .replace(/조건 신호입니다/gi, '조건으로 읽는 편이 맞습니다')
    .replace(
      /재물 쪽에 힘이 실려 있어 잘게 나눠 밀면 성과가 나기 쉬운 날입니다\./gi,
      '돈 문제는 범위를 줄이고 조건을 분명히 할수록 결과가 좋아지기 쉽습니다.'
    )
    .replace(
      /커리어 쪽에 힘이 실려 있어 잘게 나눠 밀면 성과가 나기 쉬운 날입니다\./gi,
      '일은 한 번에 많이 벌리기보다 오늘 끝낼 결과 하나를 분명히 하는 편이 더 유리합니다.'
    )
    .replace(
      /이동 쪽에 힘이 실려 있어 잘게 나눠 밀면 성과가 나기 쉬운 날입니다\./gi,
      '일정 변경이나 이동은 미리 조율해 두면 생각보다 매끄럽게 풀릴 가능성이 큽니다.'
    )
    .replace(
      /움직일 여지는 있지만 판을 크게 벌리기보다 핵심 한두 가지에 집중하는 편이 좋습니다\./gi,
      '기회는 있지만 욕심을 넓히기보다 오늘 꼭 끝낼 핵심 한두 가지에 집중하는 편이 좋습니다.'
    )

  if (!humanized) return ''
  if (MATRIX_TECHNICAL_PAYLOAD_PATTERN.test(original) && humanized.length < 18) return ''
  return humanized
}

export function sanitizeCalendarCopy(value: string | undefined, lang: 'ko' | 'en'): string {
  const repaired = humanizeCalendarEngineText(value)
  if (!repaired) return ''

  if (lang === 'ko') {
    return repaired
      .replace(/최고의 날|대길일/g, '강한 실행 구간')
      .replace(/좋은 날/g, '활용 흐름이 좋은 구간')
      .replace(/보통 날/g, '운영 중심 구간')
      .replace(/안좋은 날|나쁜 날/g, '검토 우선 구간')
      .replace(/최악의 날/g, '조정 우선 구간')
      .replace(/완벽한 타이밍/g, '검토 후 진행하기 좋은 타이밍')
      .replace(/딱 좋아요/g, '잘 맞습니다')
      .replace(/오늘 해도 괜찮아요/g, '오늘은 검토 후 진행할 수 있습니다')
      .replace(/오늘 시작하면 일이 잘 풀려요/g, '오늘 시작한 일은 흐름을 타기 쉽습니다')
      .replace(/연애운 UP!/g, '관계 에너지가 올라옵니다.')
      .replace(/복권/g, '부수 수입 탐색')
      .replace(/프로포즈/g, '중요한 관계 결정')
      .replace(/계약서 사인/g, '계약 검토')
      .replace(/사인,/g, '검토,')
      .replace(
        /데이트, 쇼핑, 예술 활동에 완벽해요/g,
        '데이트, 쇼핑, 예술 활동은 무리 없이 즐기기 좋습니다'
      )
      .replace(/오랫동안 미뤄왔던 일을 오늘 하세요/g, '미뤄온 일은 우선순위를 정해 진행해 보세요')
  }

  return repaired
    .replace(/\bthe best day\b/gi, 'a strong execution window')
    .replace(/\bbest day\b/gi, 'strong execution window')
    .replace(/\bgood day\b/gi, 'favorable window')
    .replace(/\bnormal day\b/gi, 'operate-first window')
    .replace(/\bbad day\b/gi, 'review-first window')
    .replace(/\bworst day\b/gi, 'adjust-first window')
    .replace(/\bperfect timing\b/gi, 'a good time to review and proceed')
    .replace(/\bperfect for\b/gi, 'well suited for')
    .replace(/\bthings started today go well\b/gi, 'things started today can gain traction')
    .replace(/\bromance luck up!?/gi, 'relationship energy rises')
    .replace(/\blottery\b/gi, 'side-income exploration')
    .replace(/\bproposal\b/gi, 'important relationship decision')
    .replace(/\bsigning contracts\b/gi, 'reviewing contracts before commitment')
}

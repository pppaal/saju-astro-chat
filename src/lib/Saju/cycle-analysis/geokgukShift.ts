/**
 * 격국 변동 (Geokguk Shift) — cycle 천간/지지가 본명 격국을 강화시키는지,
 * 깨뜨리는지(파격), 보호하는지(호격), 무관한지를 정통 룰로 판정.
 *
 * 정통 격국별 喜神 / 忌神 매핑 — 자평진전 기본:
 *   정관격: 喜=정관·인성·재성, 忌=상관·칠살(겹침시)
 *   편관격(칠살): 喜=식상(制), 인성(化), 忌=재성(黨殺), 비겁(과다 시)
 *   정재격: 喜=정재·식상(生財)·관살(制겁), 忌=비겁(군겁쟁재)
 *   편재격: 喜=편재·식상·관살, 忌=비겁
 *   식신격: 喜=식신·재성, 忌=편인(도식)
 *   상관격: 喜=상관·재성·인성(制傷官), 忌=정관(傷官見官)
 *   정인격: 喜=정인·관살(생인)·비겁(보호), 忌=재성(財破印)
 *   편인격: 喜=관살(생인), 忌=식신(도식)·재성
 *   양인격: 喜=관살(制刃), 忌=인성(과부조)·재성
 *   건록격: 喜=식상·재성·관살, 忌=인성·비겁(이미 강함)
 *
 * 추가 시그널:
 *  - cycle 지지가 월지(격국 본거지)와 충 → 격국 동요 (큰 변동)
 *  - cycle 지지가 월지와 합 → 격국 강화/변질 (삼합·육합)
 */

const FAVORABLE: Record<string, Set<string>> = {
  정관격: new Set(['정관', '정인', '편인', '정재', '편재']),
  편관격: new Set(['식신', '상관', '정인', '편인']),
  정재격: new Set(['정재', '식신', '상관', '정관', '편관']),
  편재격: new Set(['편재', '식신', '상관', '정관', '편관']),
  식신격: new Set(['식신', '정재', '편재']),
  상관격: new Set(['상관', '정재', '편재', '정인', '편인']),
  정인격: new Set(['정인', '정관', '편관', '비견', '겁재']),
  편인격: new Set(['편인', '정관', '편관']),
  양인격: new Set(['정관', '편관']),
  건록격: new Set(['식신', '상관', '정재', '편재', '정관', '편관']),
  월겁격: new Set(['식신', '상관', '정재', '편재', '정관', '편관']),
}

const UNFAVORABLE: Record<string, Set<string>> = {
  정관격: new Set(['상관', '편관']),
  편관격: new Set(['정재', '편재', '비견', '겁재']),
  정재격: new Set(['비견', '겁재']),
  편재격: new Set(['비견', '겁재']),
  식신격: new Set(['편인']),
  상관격: new Set(['정관']),
  정인격: new Set(['정재', '편재']),
  편인격: new Set(['식신', '정재', '편재']),
  양인격: new Set(['정인', '편인', '정재', '편재']),
  건록격: new Set(['정인', '편인', '비견', '겁재']),
  월겁격: new Set(['정인', '편인', '비견', '겁재']),
}

export type ShiftType = 'strengthen' | 'break' | 'protect' | 'shake' | 'neutral'

export interface GeokgukShiftAnalysis {
  geokguk: string
  /** 변동 유형 */
  shift: ShiftType
  /** 강도 (0-3) — 0 무관, 3 매우 강한 변동 */
  intensity: number
  /** 근거 리스트 (사람이 읽는 형태) */
  reasons: string[]
  /** 한 줄 요약 */
  summary: string
}

interface GeokgukShiftInput {
  cycleStem: string
  cycleBranch: string
  cycleStemSibsin?: string // 한글 (정재/편관/...)
  cycleBranchSibsin?: string // 한글 (지지 정기 천간 기준)
  geokgukType: string // 정재격, 편관격, ...
  monthBranch: string // 격국 본거지
  branchInteractionWithMonth?: '충' | '육합' | '삼합' | '형' | '해' | '파' | '원진' | null
}

export function analyzeGeokgukShift(input: GeokgukShiftInput): GeokgukShiftAnalysis {
  const reasons: string[] = []
  const geok = input.geokgukType
  const fav = FAVORABLE[geok]
  const unfav = UNFAVORABLE[geok]

  // 종격/화격/특수격은 룰 다름 — 일단 neutral 처리하고 추후 확장
  if (!fav && !unfav) {
    return {
      geokguk: geok,
      shift: 'neutral',
      intensity: 0,
      reasons: [`${geok} — 종격/특수격 변동 룰 미적용`],
      summary: `${geok}: 변동 룰 미적용`,
    }
  }

  let strengthenSignals = 0
  let breakSignals = 0
  let protectSignals = 0

  // ── 천간 십신 영향
  const cheon = input.cycleStemSibsin
  if (cheon) {
    if (fav?.has(cheon)) {
      strengthenSignals += 1
      reasons.push(`천간 ${cheon} → ${geok} 喜神 (강화)`)
    } else if (unfav?.has(cheon)) {
      breakSignals += 1
      reasons.push(`천간 ${cheon} → ${geok} 忌神 (파격 위협)`)
    }
  }

  // ── 지지 정기 십신 영향
  const ji = input.cycleBranchSibsin
  if (ji) {
    if (fav?.has(ji)) {
      strengthenSignals += 1
      reasons.push(`지지 ${ji} → ${geok} 喜神 (강화)`)
    } else if (unfav?.has(ji)) {
      breakSignals += 1
      reasons.push(`지지 ${ji} → ${geok} 忌神 (파격 위협)`)
    }
  }

  // ── 천간 + 지지 둘 다 喜神이면 보호 (강화) 시너지
  if (cheon && ji && fav?.has(cheon) && fav?.has(ji)) {
    protectSignals += 1
    reasons.push('喜神 천간+지지 동시 → 격국 보호')
  }
  // ── 천간 喜神 + 지지 忌神 (or 반대) — 인성/재성 같은 견제 관계면 보호
  if (cheon && ji && fav?.has(cheon) && unfav?.has(ji)) {
    protectSignals += 1
    reasons.push(`천간 喜神(${cheon})이 지지 忌神(${ji}) 견제 → 호격`)
  }

  // ── 월지(격국 본거지) 동요
  const monthInter = input.branchInteractionWithMonth
  if (monthInter) {
    if (monthInter === '충') {
      breakSignals += 2
      reasons.push(`월지(${input.monthBranch}) 충 → 격국 본거지 동요`)
    } else if (monthInter === '삼합' || monthInter === '육합') {
      strengthenSignals += 1
      reasons.push(`월지 ${monthInter} → 격국 강화·변질`)
    } else if (monthInter === '형' || monthInter === '해') {
      breakSignals += 1
      reasons.push(`월지 ${monthInter} → 격국 균열`)
    }
  }

  // ── 종합 판정
  const net = strengthenSignals - breakSignals
  let shift: ShiftType
  let intensity: number
  if (breakSignals >= 2 || (breakSignals > 0 && net < 0)) {
    shift = 'break'
    intensity = Math.min(3, breakSignals + (protectSignals === 0 ? 1 : 0))
  } else if (strengthenSignals >= 2 || (strengthenSignals > 0 && net > 0)) {
    shift = 'strengthen'
    intensity = Math.min(3, strengthenSignals)
  } else if (protectSignals > 0) {
    shift = 'protect'
    intensity = 1
  } else if (breakSignals > 0 || strengthenSignals > 0) {
    shift = 'shake'
    intensity = 1
  } else {
    shift = 'neutral'
    intensity = 0
  }

  return {
    geokguk: geok,
    shift,
    intensity,
    reasons,
    summary: buildSummary(geok, shift, intensity, reasons.length),
  }
}

function buildSummary(geok: string, shift: ShiftType, intensity: number, reasonCount: number): string {
  const labels: Record<ShiftType, string> = {
    strengthen: '강화',
    break: '파격 위협',
    protect: '호격',
    shake: '동요',
    neutral: '무관',
  }
  if (shift === 'neutral') return `${geok}: 무관 (시그널 없음)`
  return `${geok}: ${labels[shift]} (강도 ${intensity}, ${reasonCount}개 시그널)`
}

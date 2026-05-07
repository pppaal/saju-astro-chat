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
  // 양인격: 정통은 편관(칠살)이 制刃 핵심. 정관은 양인과 충돌(刃旺逢官)이라 빼고
  //         식상으로 양인을 빼는 게 차선책.
  양인격: new Set(['편관', '식신', '상관']),
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
  // 양인격: 비겁이 들어오면 양인 강화로 군겁쟁재. 정관은 刃旺逢官 충돌.
  양인격: new Set(['정인', '편인', '정재', '편재', '비견', '겁재', '정관']),
  건록격: new Set(['정인', '편인', '비견', '겁재']),
  월겁격: new Set(['정인', '편인', '비견', '겁재']),
}

// ── 종격 (從格) cycle 룰 — 정통 자평진전
//   종강격: 인성다, 일간 약. 인성·비겁 喜 / 재성·식상·관살 忌
//   종왕격: 비겁다, 일간 강. 비겁·인성 喜 / 식상·재성·관살 忌
//   종재격: 재성다 종재. 재성·식상 喜 / 비겁·인성 忌
//   종살격: 관살다 종살. 관살·재성 喜 / 식상·비겁·인성 忌 (制·化 둘 다 거부)
//   종아격: 식상다 종아. 식상·재성 喜 / 인성·관살·비겁 忌 (단 비겁 약간 OK)
const JONGGEOK_FAVORABLE: Record<string, Set<string>> = {
  종강격: new Set(['정인', '편인', '비견', '겁재']),
  종왕격: new Set(['비견', '겁재', '정인', '편인']),
  종재격: new Set(['정재', '편재', '식신', '상관']),
  종살격: new Set(['정관', '편관', '정재', '편재']),
  종아격: new Set(['식신', '상관', '정재', '편재']),
}

const JONGGEOK_UNFAVORABLE: Record<string, Set<string>> = {
  종강격: new Set(['정재', '편재', '식신', '상관', '정관', '편관']),
  종왕격: new Set(['식신', '상관', '정재', '편재', '정관', '편관']),
  종재격: new Set(['비견', '겁재', '정인', '편인']),
  종살격: new Set(['식신', '상관', '비견', '겁재', '정인', '편인']),
  종아격: new Set(['정인', '편인', '정관', '편관']),
}

// ── 화격 (化格) cycle 룰 — 천간합으로 化한 오행을 보호/극이 핵심
//   갑기화토격 → 화한 오행 토. 토 + 토를 생하는 화 喜 / 토를 극하는 목 忌 / 화기를 깨는 합 忌
//   을경화금격 → 금. 금·토 喜 / 화 忌
//   병신화수격 → 수. 수·금 喜 / 토 忌
//   정임화목격 → 목. 목·수 喜 / 금 忌
//   무계화화격 → 화. 화·목 喜 / 수 忌
const HWAGYEOK_HUASHENG: Record<string, { sheng: string; ke: string }> = {
  갑기화토격: { sheng: '화', ke: '목' },
  을경화금격: { sheng: '토', ke: '화' },
  병신화수격: { sheng: '금', ke: '토' },
  정임화목격: { sheng: '수', ke: '금' },
  무계화화격: { sheng: '목', ke: '수' },
}
const HWAGYEOK_TARGET_ELEMENT: Record<string, string> = {
  갑기화토격: '토',
  을경화금격: '금',
  병신화수격: '수',
  정임화목격: '목',
  무계화화격: '화',
}

const STEM_TO_ELEMENT_LOCAL: Record<string, string> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const BRANCH_MAIN_ELEMENT: Record<string, string> = {
  寅: '목', 卯: '목', 辰: '토',
  巳: '화', 午: '화', 未: '토',
  申: '금', 酉: '금', 戌: '토',
  亥: '수', 子: '수', 丑: '토',
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
  /** 격국 변질 — cycle 인해 다른 격으로 일시 변신 (대운/세운 단위에서) */
  transformedTo?: {
    geokguk: string // 새 격국 이름
    by: 'stem' | 'branch' // 어디서 변질됐는지
    sibsin: string // 변질을 일으킨 십신
  }
}

interface GeokgukShiftInput {
  cycleStem: string
  cycleBranch: string
  cycleStemSibsin?: string // 한글 (정재/편관/...)
  cycleBranchSibsin?: string // 한글 (지지 정기 천간 기준)
  geokgukType: string // 정재격, 편관격, ...
  monthBranch: string // 격국 본거지
  branchInteractionWithMonth?: '충' | '육합' | '삼합' | '형' | '해' | '파' | '원진' | null
  /** cycle 지지가 본명 일간 기준 양인 자리인가 (양인격 특수 룰용) */
  cycleBranchIsYangin?: boolean
}

export function analyzeGeokgukShift(input: GeokgukShiftInput): GeokgukShiftAnalysis {
  const reasons: string[] = []
  const geok = input.geokgukType

  // 종격 분기
  if (JONGGEOK_FAVORABLE[geok]) {
    return analyzeJonggeokShift(input, geok, reasons)
  }
  // 화격 분기
  if (HWAGYEOK_TARGET_ELEMENT[geok]) {
    return analyzeHwagyeokShift(input, geok, reasons)
  }

  const fav = FAVORABLE[geok]
  const unfav = UNFAVORABLE[geok]

  // 특수격(곡직격/염상격 등)은 룰 다름 — 일단 neutral 처리
  if (!fav && !unfav) {
    return {
      geokguk: geok,
      shift: 'neutral',
      intensity: 0,
      reasons: [`${geok} — 특수격 변동 룰 미적용`],
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

  // ── 양인격 특수: cycle 지지가 양인 자리면 또 다른 양인 = 군겁쟁재 가중 흉
  if (geok === '양인격' && input.cycleBranchIsYangin) {
    breakSignals += 2
    reasons.push(`cycle 지지 ${input.cycleBranch} 양인 자리 — 양인쌍지 (군겁쟁재 가중)`)
  }

  // ── 격국 변질: cycle 천간 또는 지지가 본명 격국과 다른 명확한 격을 만들면 일시 변질
  let transformedTo: GeokgukShiftAnalysis['transformedTo']
  const transformMap: Record<string, string> = {
    정관: '정관격', 편관: '편관격', 정재: '정재격', 편재: '편재격',
    식신: '식신격', 상관: '상관격', 정인: '정인격', 편인: '편인격',
  }
  // 우선순위: 본명 격국과 같은 변질은 무시. 다른 격으로 변할 때만 표시.
  // 천간 변질이 지지 변질보다 우선 (천간이 더 표면 변화).
  const cheonTransform = input.cycleStemSibsin && transformMap[input.cycleStemSibsin]
  const jiTransform = input.cycleBranchSibsin && transformMap[input.cycleBranchSibsin]
  if (cheonTransform && cheonTransform !== geok && (UNFAVORABLE[geok]?.has(input.cycleStemSibsin!) || strengthenSignals === 0)) {
    transformedTo = { geokguk: cheonTransform, by: 'stem', sibsin: input.cycleStemSibsin! }
  } else if (jiTransform && jiTransform !== geok && (UNFAVORABLE[geok]?.has(input.cycleBranchSibsin!) || strengthenSignals === 0)) {
    transformedTo = { geokguk: jiTransform, by: 'branch', sibsin: input.cycleBranchSibsin! }
  }
  if (transformedTo) {
    reasons.push(
      `cycle ${transformedTo.by === 'stem' ? '천간' : '지지'} ${transformedTo.sibsin} → 일시 ${transformedTo.geokguk} 으로 변질`,
    )
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
    transformedTo,
  }
}

// ── 종격 cycle 분석
function analyzeJonggeokShift(
  input: GeokgukShiftInput,
  geok: string,
  reasons: string[],
): GeokgukShiftAnalysis {
  const fav = JONGGEOK_FAVORABLE[geok]!
  const unfav = JONGGEOK_UNFAVORABLE[geok]!
  let strengthen = 0
  let breakSignal = 0

  if (input.cycleStemSibsin) {
    if (fav.has(input.cycleStemSibsin)) {
      strengthen += 1
      reasons.push(`천간 ${input.cycleStemSibsin} → ${geok} 順 (종격 따라감)`)
    } else if (unfav.has(input.cycleStemSibsin)) {
      breakSignal += 2 // 종격은 거스르면 큰 충격
      reasons.push(`천간 ${input.cycleStemSibsin} → ${geok} 逆 (종격 깨짐 위협)`)
    }
  }
  if (input.cycleBranchSibsin) {
    if (fav.has(input.cycleBranchSibsin)) {
      strengthen += 1
      reasons.push(`지지 ${input.cycleBranchSibsin} → ${geok} 順`)
    } else if (unfav.has(input.cycleBranchSibsin)) {
      breakSignal += 2
      reasons.push(`지지 ${input.cycleBranchSibsin} → ${geok} 逆 (종격 깨짐 위협)`)
    }
  }
  if (input.branchInteractionWithMonth === '충') {
    breakSignal += 2
    reasons.push(`월지(${input.monthBranch}) 충 → 종격 본거지 동요`)
  }

  const shift: ShiftType = breakSignal >= strengthen + 1
    ? 'break'
    : strengthen > 0 ? 'strengthen' : 'neutral'
  const intensity = Math.min(3, shift === 'break' ? breakSignal : strengthen)
  return {
    geokguk: geok,
    shift,
    intensity,
    reasons,
    summary: buildSummary(geok, shift, intensity, reasons.length),
  }
}

// ── 화격 cycle 분석 — 化한 오행 보강/극으로 판단
function analyzeHwagyeokShift(
  input: GeokgukShiftInput,
  geok: string,
  reasons: string[],
): GeokgukShiftAnalysis {
  const target = HWAGYEOK_TARGET_ELEMENT[geok]!
  const supports = HWAGYEOK_HUASHENG[geok]!
  const stemEl = STEM_TO_ELEMENT_LOCAL[input.cycleStem]
  const branchEl = BRANCH_MAIN_ELEMENT[input.cycleBranch]
  let strengthen = 0
  let breakSignal = 0

  const evaluateElement = (label: string, el?: string) => {
    if (!el) return
    if (el === target) {
      strengthen += 1
      reasons.push(`${label} ${el} → ${geok} 化한 오행 동조 (강화)`)
    } else if (el === supports.sheng) {
      strengthen += 1
      reasons.push(`${label} ${el} → ${geok} 化한 오행 생부 (도움)`)
    } else if (el === supports.ke) {
      breakSignal += 2 // 화격은 化氣를 극하면 깨짐
      reasons.push(`${label} ${el} → ${geok} 化한 오행 극 (화격 깨짐 위협)`)
    }
  }
  evaluateElement('천간', stemEl)
  evaluateElement('지지', branchEl)

  if (input.branchInteractionWithMonth === '충') {
    breakSignal += 2
    reasons.push(`월지(${input.monthBranch}) 충 → 化氣 본거지 동요`)
  }

  const shift: ShiftType = breakSignal >= strengthen + 1
    ? 'break'
    : strengthen > 0 ? 'strengthen' : 'neutral'
  const intensity = Math.min(3, shift === 'break' ? breakSignal : strengthen)
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

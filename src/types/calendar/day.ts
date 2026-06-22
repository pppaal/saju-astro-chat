// src/types/destinypal/day.ts
//
// destinypal Day(1일 일진) 카드 prop.
// data.js window.DESTINY.day 와 동형 + 누락 5신호 (지장간 / 격국 성패 /
// 공망 / 응용격국 / cross-activation) 전부 포함.
//
// 5-tier 의 최하위 layer — 가장 풍부한 신호 묶음을 그리는 카드.
// 백엔드 CalendarCell (한 datetime 의 signals[] + derivedScore + matched
// patterns) 가 그대로 매핑.

import type {
  Ganji,
  TaggedNarrative,
  DestinySignal,
  SajuSignal,
  AstroSignal,
  CrossSignal,
  SibsinKind,
  FiveElement,
  Polarity,
} from './shared'
import type { GeokgukStatus, GeokgukStatusResult } from '@/lib/saju/geokguk'
import type { DayVerdict } from '@/lib/calendar-engine/derivers/reconcile'

// ============================================================================
// 지장간 (Jijanggan) — 본명 일주(=일지) 의 정기·중기·여기 분해.
// 누락 5신호 #1 — 본명 일주 3층.
// 백엔드 PillarData.jijanggan + 일간 기준 십신.
// ============================================================================

export interface DestinyJijangganLayer {
  /** 한자 — '戊' 등. */
  stem: string
  /** 일간 기준 십신. */
  sibsin: SibsinKind | string
  /** 5원소. */
  element: FiveElement
  /** 지장간 강도 라벨 (정기/중기/여기). */
  layer: '정기' | '중기' | '여기'
}

export interface DestinyJijanggan {
  /** 정기 (本氣) — 가장 강한 층. */
  jeonggi: DestinyJijangganLayer
  /** 중기 (中氣) — 중간 층. 일부 지지는 없음. */
  junggi?: DestinyJijangganLayer
  /** 여기 (餘氣) — 가장 약한 층. 일부 지지는 없음. */
  yeogi?: DestinyJijangganLayer
}

// ============================================================================
// 격국 성패 (Geokguk Status) — 정인격 반성반파 등.
// 누락 5신호 #2 — 본명 격국 성패 상태.
// 백엔드 evaluateGeokgukStatus() 결과 그대로 통과 + 한 줄 설명.
// ============================================================================

export interface DestinyGeokgukStatus {
  /** 격국명 — '정인격'. */
  name: string
  /** 영문 라벨 — 'Jeong-in (Direct Resource)'. */
  nameEn?: string
  /** 성격(成格) / 파격(破格) / 반성반파(半成半破). */
  status: GeokgukStatus
  /** 성패 요인. */
  factors: GeokgukStatusResult['factors']
  /** 한 줄 설명. */
  description: string
}

// ============================================================================
// 공망 (Gongmang) — 본명 일주 기준 활성 2지지.
// 누락 5신호 #3 — 일주 공망 2지지.
// 시기 지지가 본명 공망 지지에 닿을 때 활성.
// ============================================================================

export interface DestinyGongmang {
  /** 본명 일주에서 산출된 공망 2지지 — ['戌','亥'] 등. */
  natalBranches: [string, string]
  /** 현재 시점에서 활성화된 공망 지지들 (대운/세운/월운/일진과 겹친 것). */
  activeBranches: string[]
  /** 활성화의 축 — '일진'/'월운'/'세운'/'대운' 중. */
  activeAxes: Array<'대운' | '세운' | '월운' | '일진'>
  /** 한 줄 의미. */
  note?: string
}

// ============================================================================
// 응용 격국 (Applied Pattern) — 상관견관 / 식신제살 / 관인상생 / 재생관 /
// 인생비겁 / 비겁탈재 / 관살혼잡 / 효식탈 (8 종).
// 누락 5신호 #4.
// 백엔드 saju-applied-pattern extractor 결과.
// ============================================================================

export type AppliedPatternId =
  | 'sanggwan-gyeon-gwan' // 상관견관 −2 / −3
  | 'siksin-jesal' // 식신제살 +2
  | 'gwanin-sangsaeng' // 관인상생 +2
  | 'jaesaeng-gwan' // 재생관 +2
  | 'insaeng-bigeop' // 인생비겁 +2
  | 'bigeop-talJae' // 비겁탈재 −2
  | 'gwansal-honjap' // 관살혼잡 −1
  | 'hyosik-tal' // 효식탈 −2

export interface DestinyAppliedPattern {
  /** 패턴 ID. */
  id: AppliedPatternId | string
  /** 한국어 라벨 — '상관견관'. */
  korean: string
  /** 한자 라벨 — '傷官見官'. */
  name: string
  /** -3..+3 톤 (본명 십신 카운트에 따라 동적 조정). */
  polarity: Polarity
  /** 0..1 가중치. */
  weight: number
  /** 활성 시점 — 대운/세운/월운/일진. */
  activeAxes: string[]
  /** 패턴 발동 룰 — '본명 정관 + 시기 상관 → 정관 피상.' */
  rule: string
}

// ============================================================================
// Cross Activation — 사주·점성 동시 활성 페어.
// 누락 5신호 #5.
// 백엔드 cross-activation extractor 결과.
// ============================================================================

export interface DestinyCrossActivation {
  id: string
  /** 사주측 신호 라벨(표시·로케일). */
  sajuSide: string
  /** 점성측 신호 라벨(표시·로케일). */
  astroSide: string
  /** 사주측 십신 raw(KO) — 분야 라우팅용(로케일 무관). */
  sajuKo?: string
  /** 점성측 행성 raw(KO) — 분야 라우팅용. */
  astroKo?: string
  /** A등급 매핑 의미(KO) — '정관 ↔ Saturn (책임·구조)'. */
  meaning: string
  /** 의미 영문 — 클라이언트 로케일 토글 시 서버언어 고정 방지(양쪽 보관). */
  meaningEn?: string
  /** 합성 polarity. */
  polarity: Polarity
  /** 합성 weight. */
  weight: number
}

// ============================================================================
// 본명 일주 (Iljun) 정보 — destinypal Day 카드 헤더용.
// ============================================================================

export interface DestinyIljinHeader {
  /** ISO 'YYYY-MM-DD'. */
  date: string
  /** 한국어 — '2026년 6월 15일'. */
  dateKo: string
  /** 일진 간지. */
  iljin: Ganji
  /** 일간 기준 일진 천간 십신. */
  iljinSibsin: SibsinKind | string
  /** 0..100 derivedScore. */
  score: number
  /** 한 줄 요약 — '오늘은 같은 금(金) 기운이 겹쳐...'. */
  oneLine: string
  /** 한 줄 요약 영문 — 클라이언트 로케일 토글용(서버언어 고정 방지). */
  oneLineEn?: string
  /** 활성 신호 총 개수. */
  totalSignals: number
}

// ============================================================================
// Day 카드 prop.
// ============================================================================

export interface DestinyDay extends DestinyIljinHeader {
  // ── 신호 묶음 (백엔드 ActiveSignal[] 의 5-tier projection) ──
  /** data.js day.signals[] — 사주측 신호. */
  signals: SajuSignal[]
  /** data.js day.transits[] — 점성측 트랜짓 신호. */
  transits: AstroSignal[]
  /** cross-activation 페어. data.js 에 명시 없음 — 신규. */
  crossSignals: CrossSignal[]
  /** 모든 신호 (signals + transits + crossSignals) flatten — UI 정렬·필터용. */
  allSignals: DestinySignal[]

  // ── 누락 5신호 ──
  /** 본명 일주 지장간 3층. */
  jijanggan: DestinyJijanggan
  /** 본명 격국 성패. */
  geokgukStatus: DestinyGeokgukStatus
  /** 공망 활성. */
  gongmang: DestinyGongmang
  /** 응용 격국 동적 매칭 결과 (오늘 발동한 것). */
  appliedPatterns: DestinyAppliedPattern[]
  /** Cross activation (응용 격국과 별개 — 사주·점성 페어). */
  crossActivations: DestinyCrossActivation[]
  /** 본명 4기둥(천간) × 일진 지지 12운성 (기둥별 실제값). */
  twelveStageMatrix: Array<{ pillar: string; stem: string; branch: string; stage: string }>

  /**
   * 본명 일간(日干, day master) — 그날 해석의 *기준*. 일진(오늘 간지)은 이 일간을
   * 기준으로 십신이 매겨지므로, 화면 맨 위에 "누구 기준인지"를 보여준다.
   * (assembleTiers 가 user.ilgan 에서 채움.)
   */
  dayMaster?: { hanja: string; kr: string; en: string }

  /** 개인 시드(본명 고정) — 템플릿 문구를 사람마다 다르게 고르는 데 쓴다. */
  seed?: number

  // ── 타이밍 컨텍스트 (캘린더용 — assembleTiers 가 주변 날짜에서 채움) ──
  /** 이달 일별 점수 — 흐름 추이선용. day=1..31, score=0..100, today 표시. */
  monthScores?: Array<{ day: number; score: number; today: boolean }>
  /** 다가오는 며칠(오늘 다음날~) — 미리보기용. date='YYYY-MM-DD', score=0..100. */
  upcoming?: Array<{ date: string; score: number }>

  // ── 부속 (기존 destinypal data.js) ──
  /** 활성 신살 한글 이름들 — ['천을귀인','도화','역마']. */
  shinsalActive: string[]
  /** narrative chip 묶음 (옵션). */
  narrative?: TaggedNarrative[]
  /** 상위 우호 사유 3..5 (백엔드 CalendarCell.topReasons). KO. */
  topReasons?: string[]
  /** 상위 우호 사유 영문 — 토글용. */
  topReasonsEn?: string[]
  /** 상위 주의 사유 3..5 (백엔드 CalendarCell.cautions). KO. */
  cautions?: string[]
  /** 상위 주의 사유 영문 — 토글용. */
  cautionsEn?: string[]
  /**
   * 출력 화해 verdict — 점수 밴드 ↔ 신호/사유 톤을 묶은 단일 권위.
   * 헤드라인·한줄·칩이 같은 톤(positive/mixed/caution)을 말하도록 adapter 가
   * 산출. 점수는 그대로 두고 *서술 톤만* 조정한다. (reconcile.ts)
   */
  dayTone?: DayVerdict
  /** 시간별 사주 × 점성 교차 — 시진(십신) × 그 시각 상승궁. */
  hourCrossings?: Array<{
    when: string // '5-7시 (묘시)'
    whenEn: string // '5-7am (Rabbit hour)'
    sibsin: string
    tone: 'good' | 'caution'
    risingSignKo: string
    risingSignEn: string
    ruler: string
    rulerEn: string
    narrative?: string
    narrativeEn?: string
    strength: number
    /** 십신 × 상승궁 룰러가 의미사전에 매칭되는 진짜 교차인지 (아니면 병치). */
    matched: boolean
    /** matched 일 때 사전 해석 한 줄. */
    crossMeaning?: string
    crossMeaningEn?: string
  }>
  /** 시(時)별 달 정밀 — 12 시진 달 재계산으로 뽑은 달×본명 어스펙트 절정 시각. */
  hourMoon?: Array<{
    when: string
    whenEn: string
    hour: number
    moonSignKo: string
    moonSignEn: string
    aspectKo: string
    aspectEn: string
    natalPointKo: string
    natalPointEn: string
    body: string
    polarity: number
    tone: 'good' | 'caution'
    meaning: string
    meaningEn: string
  }>
}

import type { AstroThemeKey } from '@/lib/astrology/themes/types'
import type { FiveElement, SibsinKind } from '@/lib/saju/types'

export type SignalSource = 'saju' | 'astro'

export type SajuSignalKind =
  | 'shinsal' // 신살 일진 활성
  | 'hyeongchung' // 형충회합 (현재 일주 vs 본명)
  | 'amhap' // 암합 (지지 안 천간 합)
  | 'pillar-sibsin' // 대운/세운/월운/일주의 십신 발현
  | 'tonggeun-shift' // 대운 진입에 따른 통근 강약 변화
  | 'saju-pattern' // 격국·패턴 컨텍스트화

export type AstroSignalKind =
  | 'transit' // 트랜짓 어스펙트 (본명 → 트랜짓 행성)
  | 'eclipse' // 일식·월식 임팩트
  | 'progression' // 2차 진행 + Solar Arc
  | 'progressed-moon' // 진행 달 어스펙트
  | 'solar-return' // Solar Return 차트
  | 'lunar-return' // Lunar Return 차트
  | 'profection' // 연주술 활성 하우스
  | 'zodiacal-releasing' // ZR 챕터
  | 'lifecycle' // 라이프사이클 마일스톤 (Saturn Return 등)
  | 'electional' // 택일 점수
  | 'moon-phase' // 달 위상 (삭/상현/보름/하현)
  | 'planetary-hour' // 행성시 (예약 — Chaldean order, 미구현)
  | 'void-of-course' // VoC
  | 'fixed-star' // 항성 컨정션
  | 'arabic-part' // 아라빅 파츠 활성
  | 'house-transit' // 트랜짓 행성의 본명 하우스 오버레이
  | 'angle-contact' // 느린 행성의 ASC/MC 컨택
  | 'midpoint' // 중점 활성
  | 'asteroid' // 4대 소행성 (Ceres/Pallas/Juno/Vesta) 본명·트랜짓 어스펙트
  | 'solar-arc' // Solar Arc directions (본명 행성 1°/년 이동 → 본명 컨택)
  | 'draconic' // 드라코닉 차트 (영혼 결) 트랜짓 컨택
  | 'harmonic' // 하모닉 차트 (특정 결 패턴 — 4/5/7/9) 트랜짓 컨택
  | 'antiscia' // 안티시아 그림자 도 컨택트
  | 'vertex-contact' // Vertex/Anti-Vertex 컨택트 (운명점)

export type SignalKind = SajuSignalKind | AstroSignalKind

export type SignalLayer =
  | 'decadal' // 대운 / ZR 메이저 / outer transit (10년대)
  | 'yearly' // 세운 / Solar Return / Profection (1년)
  | 'monthly' // 월운 / Lunar Return / Prog Moon (1달)
  | 'daily' // 일진 / 신살 / inner transit (1~7일)
  | 'hourly' // 시운 / 행성시 (1시간)
  | 'instant' // 컨정션 정점

export type Polarity = -3 | -2 | -1 | 0 | 1 | 2 | 3

export interface ActiveWindow {
  start: string // ISO datetime
  peak: string // ISO datetime — 가장 강한 순간
  end: string // ISO datetime
}

/**
 * 한 신호 = 한 시점에 활성화된 raw 단위 하나.
 * 캘린더의 모든 점수·해석은 ActiveSignal[]에서 파생됨.
 */
export interface ActiveSignal {
  id: string // 'saju.shinsal.도화.2026-05-15' 같은 고유 키
  source: SignalSource
  kind: SignalKind
  name: string // 표시명 — '도화살' / 'Saturn □ Sun'
  korean?: string // 점성 영문 신호의 한글 표시
  themes: AstroThemeKey[] // 영향 테마 (tagger가 부여) — 멤버십(룰/카드용)
  // 테마별 기여 가중 (tagger가 부여). primary 1.0 / secondary 0.5 …
  // themeScore·themeBreakdown 만 사용 — 한 신호가 모든 테마에 동일 기여하던
  // 변별력 저하(목성 회귀가 일·재물·성장에 똑같이 박힘) 해소. 없으면 1.0.
  themeWeights?: Partial<Record<AstroThemeKey, number>>
  polarity: Polarity // -3 ~ +3 길흉 강도
  layer: SignalLayer // 시간 스케일
  active: ActiveWindow
  weight: number // 0~1 — layer 가중치 × intrinsic 강도
  evidence: SignalEvidence
}

/**
 * 신호의 추적·디버깅용 raw 컨텍스트.
 * derivers나 UI 모달에서 "왜 이 신호가 떴는지" 풀어 보일 때 사용.
 */
export interface SignalEvidence {
  module: string // 추출기 모듈명 'saju-shinsal' 등
  detail: Record<string, unknown>
  // 자주 쓰이는 필드들 (선택)
  planets?: string[]
  houses?: number[]
  pillars?: string[]
  element?: FiveElement
  sibsin?: SibsinKind
  shinsalName?: string
  aspectType?: string
  orbDegrees?: number
}

// ============================================================================
// 캘린더 셀 — 한 (날짜, 시간) 단위의 모든 활성 신호 + 파생값
// ============================================================================

export interface CalendarCell {
  datetime: string // ISO
  signals: ActiveSignal[] // 그 시점 활성 신호 전체
  derivedScore: number // 0~100 — polarity 가중합
  themeScores: Partial<Record<AstroThemeKey, number>> // 테마별 강도 0~100
  matchedPatterns: SignalPattern[] // 신호 조합 → 명명 패턴
  topReasons: string[] // 상위 3~5개 우호 사유 텍스트
  cautions: string[] // 상위 3~5개 주의 사유 텍스트 (topReasons mirror)
}

export interface SignalPattern {
  id: string
  name: string // '재성통근격', '재물 황금주간 #3'
  themes: AstroThemeKey[]
  matchedSignalIds: string[]
  strength: number // 0~100
  description?: string // 근거 (어떤 신호 조합에서 나온 패턴)
  /** 사용자한테 보여줄 한 줄 액션 추천 */
  action?: string
  /** 패턴 발동 강조 — UI에서 "오늘 발동!" 형식으로 노출 */
  headline?: string
}

// ============================================================================
// 입력 / 옵션
// ============================================================================

export interface CalendarRange {
  start: string // ISO
  end: string // ISO
  granularity: 'day' | 'hour' // 기본 'day'; 'hour'는 비싼 모드
}

export interface CalendarBuildOptions {
  /** 활성화할 추출기. 미지정 시 전부 사용 */
  enabledExtractors?: SignalKind[]
  /** 특정 테마만 보고 싶을 때 — 신호는 다 추출하되 derivers가 필터 */
  focusThemes?: AstroThemeKey[]
  /** 패턴 매칭 활성화 (비용 있음) */
  enablePatterns?: boolean
  /** 디버그용 — evidence를 응답에 포함 */
  includeEvidence?: boolean
}

// ============================================================================
// 추출기 인터페이스 — 모든 extractor가 구현
// ============================================================================

import type { NatalContext } from './context/types'

export interface ExtractorContext {
  natal: NatalContext
  range: CalendarRange
  /** Swiss Ephemeris 등 무거운 호출의 캐시 핸들 */
  cache: ExtractorCache
}

export interface ExtractorCache {
  get<T>(key: string): T | undefined
  set<T>(key: string, value: T): void
}

export interface SignalExtractor {
  kind: SignalKind | SignalKind[] // 한 추출기가 여러 kind 낼 수 있음
  source: SignalSource
  /** range 내 모든 활성 신호를 한 번에 뱉음 */
  extract(ctx: ExtractorContext): Promise<ActiveSignal[]> | ActiveSignal[]
}

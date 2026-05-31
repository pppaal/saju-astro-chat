// src/components/destiny-map/chat-types.ts
// Type definitions for Chat component - replacing 'any' types

import type { LangKey } from './chat-i18n'
import type { Message, UserContext } from './chat-constants'

// Profile type for chat component
export interface ChatProfile {
  name?: string
  birthDate?: string
  birthTime?: string
  birthTimeUnknown?: boolean
  city?: string
  gender?: string
  latitude?: number
  longitude?: number
}

// Saju (Four Pillars) data structure
export interface SajuPillar {
  stem: string
  branch: string
  stemKo?: string
  branchKo?: string
  element?: string
  animal?: string
}

export interface SajuData {
  yearPillar?: SajuPillar
  monthPillar?: SajuPillar
  dayPillar?: SajuPillar
  hourPillar?: SajuPillar
  dayMaster?: string
  dayMasterElement?: string
  fiveElements?: Record<string, number>
  dominantElement?: string
  weakElement?: string
  tenGods?: Record<string, string>
  compatibility?: {
    harmonies?: string[]
    clashes?: string[]
  }
}

// Planet data for astrology
export interface Planet {
  name: string
  sign: string
  signKo?: string
  degree?: number
  house?: number
  retrograde?: boolean
}

// House data for astrology
export interface House {
  number: number
  sign: string
  degree?: number
  planets?: string[]
}

// Aspect data for astrology
export interface Aspect {
  planet1: string
  planet2: string
  type: string
  degree?: number
  orb?: number
}

// Main astrology data structure
export interface AstroData {
  planets?: Planet[]
  houses?: House[]
  aspects?: Aspect[]
  ascendant?: {
    sign: string
    degree?: number
  }
  midheaven?: {
    sign: string
    degree?: number
  }
  sunSign?: string
  moonSign?: string
  risingSign?: string
}

// Advanced astrology features
export interface AdvancedAstroData {
  draconic?: {
    planets?: Planet[]
    ascendant?: { sign: string; degree?: number }
  }
  harmonics?: {
    harmonic: number
    planets?: Planet[]
  }[]
  progressions?: {
    type: string
    date: string
    planets?: Planet[]
  }
  solarReturn?: {
    year: number
    planets?: Planet[]
    houses?: House[]
  }
  lunarReturn?: {
    month: string
    planets?: Planet[]
  }
  compositeChart?: AstroData
}

// Life prediction context for AI counselor
export interface PredictionContext {
  eventType?: string
  eventLabel?: string
  optimalPeriods?: Array<{
    startDate: string
    endDate: string
    score: number
    grade: string
    reasons: string[]
  }>
  avoidPeriods?: Array<{
    startDate: string
    endDate: string
    score: number
    reasons: string[]
  }>
  advice?: string
  tierAnalysis?: {
    tier6?: { reasons: string[]; penalties: string[] }
    tier7to10?: { reasons: string[]; penalties: string[]; confidence: number }
  }
}

// Chat component props
export interface ChatProps {
  profile: ChatProfile
  initialContext?: string
  lang?: LangKey
  seedEvent?: string
  saju?: SajuData
  astro?: AstroData
  advancedAstro?: AdvancedAstroData
  // Life prediction context (TIER 1-10 분석 결과)
  predictionContext?: PredictionContext
  // Premium features
  userContext?: UserContext
  chatSessionId?: string
  onSaveMessage?: (userMsg: string, assistantMsg: string) => void
  autoScroll?: boolean
  // RAG session ID from /counselor/init prefetch
  ragSessionId?: string
  // Auto-send initial seeded question
  autoSendSeed?: boolean
  // Auto-focus the chat input on mount (pops mobile keyboard where the
  // platform allows it, e.g. Android/desktop).
  autoFocus?: boolean
  // When set, the chat resumes a past CounselorChatSession by id on
  // mount — same effect as clicking the row in the sidebar's history
  // modal. Used by the destiny counselor page to honor `?session=…` in
  // the URL (e.g. when navigating from the sidebar's past-chats list).
  initialSessionId?: string
  // 페이지 헤더가 현재 채팅의 제목 + ⋮ 메뉴(Rename/Delete) 를 표시할 수
  // 있도록 활성 세션 정보를 노출. id 는 항상 있고, title 은 저장 전이거나
  // 아직 로드 안 됐을 때 null.
  onSessionChange?: (info: { sessionId: string; title: string | null }) => void
  // 전송 직전 부모가 가로채는 가드. true 를 반환하면 전송을 막는다(입력은
  // 그대로 보존). 운명 상담사에서 생년월일·출생시간이 없는 채로 첫 메시지를
  // 보내려 할 때 BirthInfoModal 을 대신 띄우는 용도. 미지정 시 항상 전송.
  onSendBlocked?: (text: string) => boolean
}

// Chat API request payload
export interface ChatPayload {
  name?: string
  birthDate?: string
  birthTime?: string
  birthTimeUnknown?: boolean
  latitude?: number
  longitude?: number
  gender?: string
  city?: string
  /** 기기(브라우저) 현재 시간대 — 서버가 "오늘"/일진을 사용자 로컬 날짜로 계산. */
  userTimezone?: string
  lang: LangKey
  messages: Message[]
  cvText?: string
  saju?: SajuData
  astro?: AstroData
  advancedAstro?: AdvancedAstroData
  userContext?: UserContext
  // Life prediction context
  predictionContext?: PredictionContext
  // 새로고침/탭 복제 등으로 같은 turn 이 재진입할 때 크레딧 중복 차감
  // 방지용 멱등 키. 클라이언트가 매 user 메시지 보낼 때 UUID 생성, 같은
  // payload 가 재시도되면 그대로 재사용 → 서버는 한 번만 차감.
  idempotencyKey?: string
  /** 이 턴의 고유 id. 연결이 끊겨도 서버가 끝까지 생성해 이 키로 캐시에
   *  저장해 두면, 돌아왔을 때 result 엔드포인트로 완성 답을 복원한다. */
  turnId?: string
}

// PDF text content item (from pdfjs-dist)
export interface PDFTextItem {
  str: string
  dir?: string
  transform?: number[]
  width?: number
  height?: number
  fontName?: string
}

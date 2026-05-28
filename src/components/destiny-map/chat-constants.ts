// src/components/destiny-map/chat-constants.ts
// Constants extracted from Chat component

// Timing constants (in milliseconds)
export const CHAT_TIMINGS = {
  /** Debounce delay for auto-saving messages */
  DEBOUNCE_SAVE: 2000,
  /** Duration to show welcome back banner */
  WELCOME_BANNER_DURATION: 5000,
  // 단일 absolute timeout 은 길게 이어진 답변(특히 continuation 활성)을 중간에 잘랐다.
  // 응답 헤더까지의 한도와, 스트림 chunk 사이 idle 한도를 분리해서 관리.
  /** 응답 헤더 도착까지 허용 시간 — TTFB 가 이걸 넘으면 abort */
  HEADER_TIMEOUT: 30000,
  /** 스트림 도중 다음 chunk 까지 허용되는 idle 시간 — chunk 가 들어오는 동안엔 무한히 길게 받음 */
  CHUNK_IDLE_TIMEOUT: 45000,
  /** Base delay for exponential backoff retry */
  RETRY_BASE_DELAY: 1000,
  /** Notice auto-dismiss duration */
  NOTICE_DISMISS: 3000,
} as const

// Limits
export const CHAT_LIMITS = {
  /** Maximum CV text length to send */
  MAX_CV_CHARS: 6000,
  /** Number of follow-up questions to display */
  FOLLOWUP_DISPLAY_COUNT: 2,
  /** Maximum retry attempts for failed requests */
  MAX_RETRY_ATTEMPTS: 2,
  /** Response time threshold for "slow" connection (ms) */
  SLOW_CONNECTION_THRESHOLD: 5000,
} as const

// Connection status types
export type ConnectionStatus = 'online' | 'offline' | 'slow'

// Message types
export type Message = {
  role: 'system' | 'user' | 'assistant'
  content: string
  id?: string
  streaming?: boolean
  /**
   * Assistant response was cut off mid-stream (e.g. mobile network drop,
   * upstream idle abort). Surfaces a retry button on the bubble so the
   * user can re-send the previous question without retyping.
   */
  incomplete?: boolean
}

// Feedback types
export type FeedbackType = 'up' | 'down' | null

// User context for returning users (premium feature)
export type UserContext = {
  persona?: {
    sessionCount?: number
    lastTopics?: string[]
    emotionalTone?: string
    recurringIssues?: string[]
  }
  recentSessions?: Array<{
    id: string
    summary?: string
    keyTopics?: string[]
    lastMessageAt?: string
  }>
}

// Chat request/response types
export type ChatRequest = {
  profile: {
    name?: string
    birthDate?: string
    birthTime?: string
    city?: string
    gender?: string
    latitude?: number
    longitude?: number
  }
  lang: string
  messages: Message[]
}

export type ApiResponse = {
  reply?: string
  fallback?: boolean
  safety?: boolean
}

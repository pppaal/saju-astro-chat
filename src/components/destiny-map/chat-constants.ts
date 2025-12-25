// src/components/destiny-map/chat-constants.ts
// Constants extracted from Chat component

// Timing constants (in milliseconds)
export const CHAT_TIMINGS = {
  /** Debounce delay for auto-saving messages */
  DEBOUNCE_SAVE: 2000,
  /** Duration to show welcome back banner */
  WELCOME_BANNER_DURATION: 5000,
  /** API request timeout */
  REQUEST_TIMEOUT: 30000,
  /** Base delay for exponential backoff retry */
  RETRY_BASE_DELAY: 1000,
  /** Notice auto-dismiss duration */
  NOTICE_DISMISS: 3000,
} as const;

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
} as const;

// Connection status types
export type ConnectionStatus = "online" | "offline" | "slow";

// Message types
export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
  id?: string;
};

// Feedback types
export type FeedbackType = "up" | "down" | null;

// User context for returning users (premium feature)
export type UserContext = {
  persona?: {
    sessionCount?: number;
    lastTopics?: string[];
    emotionalTone?: string;
    recurringIssues?: string[];
  };
  recentSessions?: Array<{
    id: string;
    summary?: string;
    keyTopics?: string[];
    lastMessageAt?: string;
  }>;
};

// Chat request/response types
export type ChatRequest = {
  profile: {
    name?: string;
    birthDate?: string;
    birthTime?: string;
    city?: string;
    gender?: string;
    latitude?: number;
    longitude?: number;
  };
  theme: string;
  lang: string;
  messages: Message[];
};

export type ApiResponse = {
  reply?: string;
  fallback?: boolean;
  safety?: boolean;
};

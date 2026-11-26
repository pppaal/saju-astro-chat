/**
 * Shared TypeScript types for API requests and responses
 * Ensures type safety across frontend and backend communication
 */

// ============================================================
// Common Types
// ============================================================

export type Lang = 'ko' | 'en'

// ============================================================
// Chart Data Types
// ============================================================

export interface ChartData {
  saju?: Record<string, unknown>
  astro?: Record<string, unknown>
  advancedAstro?: Record<string, unknown>
}

// ============================================================
// Counselor API Types
// ============================================================

interface CounselorSession {
  id: string
  theme?: string
  summary?: string
  keyTopics?: string[]
  lastMessageAt?: string
  createdAt?: string
}

export interface UserContext {
  recentSessions?: CounselorSession[]
  personalityType?: {
    typeCode: string
    personaName: string
  }
}

export interface CounselorContextResponse {
  success: boolean
  sessions?: CounselorSession[]
  message?: string
}

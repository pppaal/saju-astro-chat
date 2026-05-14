/**
 * Compatibility counselor — shared types.
 *
 * The "counselor" flow is a chat-based 2-person reading where raw saju +
 * astrology data is dropped into the system prompt as plain text blocks and
 * the user chats with the model. No deterministic scoring lives here —
 * scoring is a separate concern owned by the future "report" feature.
 */

export type RelationKey =
  | 'partner'
  | 'crush'
  | 'spouse'
  | 'engaged'
  | 'ex'
  | 'friend'
  | 'family'
  | 'colleague'
  | 'business'
  | 'other'

export interface CounselorPerson {
  /** Display name shown in the chat header and the data block. */
  name: string
  /** YYYY-MM-DD (solar). */
  birthDate: string
  /** HH:mm — '00:00' is the canonical "unknown" placeholder. */
  birthTime: string
  gender: 'male' | 'female'
  /** Human label like "서울" or "Seoul" — purely for display. */
  birthCity?: string | null
  latitude?: number | null
  longitude?: number | null
  /** IANA tz id like 'Asia/Seoul'. Falls back to Asia/Seoul when missing. */
  tzId?: string | null
}

export interface BuildCounselorPromptInput {
  personA: CounselorPerson
  personB: CounselorPerson
  relation: RelationKey
  /** User-supplied free-text context, max ~200 chars (e.g. "초딩때부터 베프"). */
  relationNote?: string | null
  /** UI locale — only affects a few fallback labels; AI always replies in 한국어. */
  locale?: 'ko' | 'en'
}

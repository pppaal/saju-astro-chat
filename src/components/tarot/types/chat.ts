import type { LangKey } from "../data";
import type { InterpretationResult, ReadingResponse } from "./card";

/**
 * Message type for chat conversation
 */
export type Message = {
  role: "user" | "assistant";
  content: string;
};

/**
 * Props for TarotChat component
 */
export interface TarotChatProps {
  /** The tarot reading result containing spread and drawn cards */
  readingResult: ReadingResponse;
  /** AI interpretation of the reading (optional) */
  interpretation: InterpretationResult | null;
  /** Category name/ID of the reading */
  categoryName: string;
  /** Spread ID used for the reading */
  spreadId: string;
  /** Language for UI and responses */
  language: LangKey;
  /** Optional counselor ID for personalized readings */
  counselorId?: string;
  /** Optional counselor style description */
  counselorStyle?: string;
  /** Optional user topic for contextual questions */
  userTopic?: string;
}

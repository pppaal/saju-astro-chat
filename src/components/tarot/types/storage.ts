/**
 * Persisted card data for session storage
 */
export type PersistedCard = {
  /** Position in the spread (optional) */
  position?: string;
  /** Card name */
  name: string;
  /** Whether the card is reversed */
  is_reversed?: boolean;
  /** Card meaning */
  meaning?: string;
  /** Card keywords */
  keywords?: string[];
};

/**
 * Persisted context for maintaining conversation continuity
 */
export type PersistedContext = {
  /** Title of the spread used */
  spread_title?: string;
  /** Category of the reading */
  category?: string;
  /** Cards in this context */
  cards?: PersistedCard[];
  /** Overall message from the reading */
  overall_message?: string;
  /** Guidance provided */
  guidance?: string;
};

/**
 * Type guard to check if a value is a Record
 */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

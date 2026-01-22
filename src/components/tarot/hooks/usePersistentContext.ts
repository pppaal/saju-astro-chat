/**
 * Persistent context management hook
 * Extracted from TarotChat.tsx lines 439-498
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { PersistedContext } from "../types/storage";
import type { InterpretationResult, ReadingResponse } from "../types";
import { isRecord } from "../types/storage";
import { buildContext } from "../utils/contextBuilder";

/**
 * Hook for managing persistent context with session storage
 *
 * @param sessionKey - Session key for storage
 * @param readingResult - Reading result data
 * @param interpretation - AI interpretation
 * @param categoryName - Category name
 * @param language - Language code
 * @returns Persisted context state and build function
 */
export function usePersistentContext(
  sessionKey: string,
  readingResult: ReadingResponse,
  interpretation: InterpretationResult | null,
  categoryName: string,
  language: 'ko' | 'en'
) {
  const [persistedContext, setPersistedContext] = useState<PersistedContext | null>(null);
  const sessionKeyRef = useRef<string>(sessionKey);

  // Build context callback
  const buildContextCallback = useCallback(() => {
    return buildContext(
      readingResult,
      interpretation,
      categoryName,
      persistedContext,
      language
    );
  }, [readingResult, interpretation, categoryName, persistedContext, language]);

  // Persist context for reuse within session
  useEffect(() => {
    try {
      const ctx = buildContextCallback();
      sessionStorage.setItem(sessionKeyRef.current, JSON.stringify(ctx));
    } catch {
      // ignore storage errors
    }
  }, [buildContextCallback]);

  // Load persisted context (if exists) to keep conversations anchored
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(sessionKeyRef.current);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (isRecord(parsed) && Array.isArray(parsed.cards) && parsed.cards.length > 0) {
          setPersistedContext(parsed as PersistedContext);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  return {
    persistedContext,
    buildContext: buildContextCallback
  };
}

/**
 * Message persistence hook
 * Extracted from TarotChat.tsx lines 157-193
 */

import { useState, useEffect } from "react";
import type { Message } from "../types";
import { logger } from "@/lib/logger";

const isDev = process.env.NODE_ENV === 'development';
const devError = (...args: unknown[]) => logger.error('[useMessages]', ...args);

/**
 * Hook for managing chat messages with localStorage persistence
 *
 * @param storageKey - Key for localStorage
 * @returns Messages state and setter
 */
export function useMessages(storageKey: string): [Message[], React.Dispatch<React.SetStateAction<Message[]>>] {
  // Load messages from localStorage on mount
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') {return [];}
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch (e) {
        devError('Failed to save messages:', e);
      }
    }
  }, [messages, storageKey]);

  return [messages, setMessages];
}

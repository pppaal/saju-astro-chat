/**
 * Loading message rotation hook
 * Extracted from TarotChat.tsx lines 501-518
 */

import { useState, useRef, useCallback } from "react";

/**
 * Hook for rotating loading messages during API calls
 *
 * @param messages - Array of loading messages to rotate through
 * @returns Loading message state and control functions
 */
export function useLoadingMessages(messages: string[]) {
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const loadingMessageIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Start rotating loading messages
   */
  const startLoadingMessages = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * messages.length);
    setLoadingMessage(messages[randomIndex]);

    loadingMessageIntervalRef.current = setInterval(() => {
      const newIndex = Math.floor(Math.random() * messages.length);
      setLoadingMessage(messages[newIndex]);
    }, 3000);
  }, [messages]);

  /**
   * Stop rotating loading messages
   */
  const stopLoadingMessages = useCallback(() => {
    if (loadingMessageIntervalRef.current) {
      clearInterval(loadingMessageIntervalRef.current);
      loadingMessageIntervalRef.current = null;
    }
    setLoadingMessage("");
  }, []);

  return {
    loadingMessage,
    startLoadingMessages,
    stopLoadingMessages
  };
}

/**
 * Chat input keyboard handling hook
 * Extracted from TarotChat.tsx lines 712-717
 */

import { useState, useCallback } from "react";

/**
 * Hook for managing chat input with keyboard handling
 *
 * @param onSend - Callback when sending message
 * @returns Input state and handlers
 */
export function useTarotChatInput(onSend: () => void) {
  const [input, setInput] = useState("");

  /**
   * Handle keyboard events (Enter to send, Shift+Enter for new line)
   */
  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }, [onSend]);

  return {
    input,
    setInput,
    onKeyDown
  };
}

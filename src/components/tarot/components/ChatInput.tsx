/**
 * Chat input component
 * Extracted from TarotChat.tsx lines 886-902
 */

import React from "react";
import type { I18N } from "../data";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  disabled: boolean;
  tr: (typeof I18N)['ko'];
  styles: Record<string, string>;
}

/**
 * Chat input area with textarea and send button
 */
export const ChatInput = React.memo(function ChatInput({
  value,
  onChange,
  onKeyDown,
  onSend,
  disabled,
  tr,
  styles
}: ChatInputProps) {
  return (
    <div className={styles.inputArea}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={tr.placeholder}
        rows={2}
        className={styles.textarea}
        disabled={disabled}
      />
      <button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className={styles.sendButton}
      >
        {tr.send}
      </button>
    </div>
  );
});

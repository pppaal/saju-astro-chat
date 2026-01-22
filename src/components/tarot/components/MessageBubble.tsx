/**
 * Message bubble component
 * Extracted from TarotChat.tsx lines 74-107
 */

import React from "react";
import type { Message } from "../types";
import type { LangKey } from "../data";

interface MessageBubbleProps {
  message: Message;
  index: number;
  language: LangKey;
  styles: Record<string, string>;
}

/**
 * Memoized Message Component for performance
 */
export const MessageBubble = React.memo(function MessageBubble({
  message,
  index,
  language: _language,
  styles
}: MessageBubbleProps) {
  return (
    <div
      key={index}
      className={`${styles.messageRow} ${message.role === "assistant" ? styles.assistantRow : styles.userRow}`}
    >
      {message.role === "assistant" && (
        <div className={styles.avatar}>
          <span className={styles.avatarIcon}>🔮</span>
        </div>
      )}
      <div className={styles.messageBubble}>
        <div className={message.role === "assistant" ? styles.assistantMessage : styles.userMessage}>
          {message.content}
        </div>
      </div>
      {message.role === "user" && (
        <div className={styles.avatar}>
          <span className={styles.avatarIcon}>👤</span>
        </div>
      )}
    </div>
  );
});

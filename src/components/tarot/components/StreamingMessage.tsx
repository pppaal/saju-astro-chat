/**
 * Streaming message component
 * Extracted from TarotChat.tsx lines 825-837
 */

import React from "react";

interface StreamingMessageProps {
  content: string;
  styles: Record<string, string>;
}

/**
 * Display streaming content with cursor animation
 */
export const StreamingMessage = React.memo(function StreamingMessage({
  content,
  styles
}: StreamingMessageProps) {
  if (!content) {return null;}

  return (
    <div className={`${styles.messageRow} ${styles.assistantRow}`}>
      <div className={styles.avatar}>
        <span className={styles.avatarIcon}>🔮</span>
      </div>
      <div className={styles.messageBubble}>
        <div className={styles.assistantMessage}>
          {content}
          <span className={styles.streamingCursor}>▊</span>
        </div>
      </div>
    </div>
  );
});

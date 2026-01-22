/**
 * Loading indicator component
 * Extracted from TarotChat.tsx lines 840-856
 */

import React from "react";
import type { I18N } from "../data";

interface LoadingIndicatorProps {
  message: string;
  tr: (typeof I18N)['ko'];
  styles: Record<string, string>;
}

/**
 * Loading indicator with typing animation and message
 */
export const LoadingIndicator = React.memo(function LoadingIndicator({
  message,
  tr,
  styles
}: LoadingIndicatorProps) {
  return (
    <div className={`${styles.messageRow} ${styles.assistantRow}`}>
      <div className={styles.avatar}>
        <span className={styles.avatarIcon}>🔮</span>
      </div>
      <div className={styles.messageBubble}>
        <div className={styles.thinkingMessage}>
          <div className={styles.typingDots}>
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
          </div>
          <span className={styles.thinkingText}>{message || tr.thinking}</span>
        </div>
      </div>
    </div>
  );
});

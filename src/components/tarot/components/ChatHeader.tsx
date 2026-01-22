/**
 * Chat header component
 * Extracted from TarotChat.tsx lines 722-728
 */

import React from "react";
import Link from "next/link";
import CreditBadge from "@/components/ui/CreditBadge";

interface ChatHeaderProps {
  language: 'ko' | 'en';
  styles: Record<string, string>;
}

/**
 * Chat header with credit badge and home button
 */
export const ChatHeader = React.memo(function ChatHeader({
  language,
  styles
}: ChatHeaderProps) {
  return (
    <div className={styles.chatHeader}>
      <CreditBadge variant="compact" />
      <Link href="/" className={styles.homeButton} aria-label="Home">
        <span className={styles.homeIcon}>🏠</span>
        <span className={styles.homeLabel}>{language === 'ko' ? '홈' : 'Home'}</span>
      </Link>
    </div>
  );
});

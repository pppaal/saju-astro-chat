import React, { RefObject, useMemo, useCallback, memo } from 'react';
import type { ChatMessage } from '@/lib/dream/types';
import styles from './ChatSection.module.css';

interface ChatSectionProps {
  locale: string;
  dreamText: string;
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  isChatLoading: boolean;
  chatMessagesRef: RefObject<HTMLDivElement | null>;
  onSendMessage: () => void;
}

export const ChatSection = memo(function ChatSection({
  locale,
  dreamText,
  chatMessages,
  chatInput,
  setChatInput,
  isChatLoading,
  chatMessagesRef,
  onSendMessage,
}: ChatSectionProps) {
  const isKo = useMemo(() => locale === 'ko', [locale]);
  const dreamPreview = useMemo(() => dreamText.slice(0, 30), [dreamText]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  }, [onSendMessage]);

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <span className={styles.chatHeaderIcon}>🌙</span>
        <div>
          <h3 className={styles.chatHeaderTitle}>
            {isKo ? '꿈 상담사' : 'Dream Counselor'}
          </h3>
          <p className={styles.chatHeaderSubtitle}>
            {isKo ? '꿈에 대해 더 깊이 이야기해보세요' : 'Let\'s explore your dream deeper'}
          </p>
        </div>
      </div>

      <div className={styles.chatMessages} ref={chatMessagesRef}>
        <div className={styles.chatMessage}>
          <div className={styles.chatAvatar}>🌙</div>
          <div className={styles.chatBubble}>
            {isKo
              ? `꿈 해석 결과를 보셨군요. "${dreamPreview}..." 꿈에 대해 더 궁금한 점이 있으시면 편하게 물어보세요.`
              : `I see you've received your dream interpretation. Feel free to ask me anything about your dream "${dreamPreview}..."`
            }
          </div>
        </div>
        {chatMessages.map((msg, idx) => (
          <div key={idx} className={`${styles.chatMessage} ${msg.role === 'user' ? styles.user : ''}`}>
            <div className={styles.chatAvatar}>{msg.role === 'user' ? '👤' : '🌙'}</div>
            <div className={styles.chatBubble}>{msg.content}</div>
          </div>
        ))}
        {isChatLoading && (
          <div className={styles.chatLoading}>
            <div className={styles.chatLoadingDots}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.chatInputArea}>
        <input
          type="text"
          className={styles.chatInput}
          placeholder={isKo ? '꿈에 대해 질문하세요...' : 'Ask about your dream...'}
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isChatLoading}
        />
        <button
          className={styles.chatSendBtn}
          onClick={onSendMessage}
          disabled={isChatLoading || !chatInput.trim()}
        >
          {isKo ? '전송' : 'Send'}
        </button>
      </div>
    </div>
  );
});

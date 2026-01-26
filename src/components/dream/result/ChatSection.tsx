import { RefObject } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
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

export function ChatSection({
  locale,
  dreamText,
  chatMessages,
  chatInput,
  setChatInput,
  isChatLoading,
  chatMessagesRef,
  onSendMessage,
}: ChatSectionProps) {
  const { t } = useI18n();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <span className={styles.chatHeaderIcon}>🌙</span>
        <div>
          <h3 className={styles.chatHeaderTitle}>
            {t('dream.chat.title')}
          </h3>
          <p className={styles.chatHeaderSubtitle}>
            {t('dream.chat.subtitle')}
          </p>
        </div>
      </div>

      <div className={styles.chatMessages} ref={chatMessagesRef}>
        <div className={styles.chatMessage}>
          <div className={styles.chatAvatar}>🌙</div>
          <div className={styles.chatBubble}>
            {t('dream.chat.empty')}
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
          placeholder={t('dream.chat.placeholder')}
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
          {t('dream.chat.send')}
        </button>
      </div>
    </div>
  );
}

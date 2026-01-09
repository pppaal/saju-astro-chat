'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ServicePageLayout from '@/components/ui/ServicePageLayout';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './Chat.module.css';
import { logger } from '@/lib/logger';

// Loading fallback for Suspense
function ChatLoading() {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner} />
      <p>로딩 중...</p>
    </div>
  );
}

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type PersonData = {
  name: string;
  date: string;
  time: string;
  city: string;
  relation?: string;
};

function CompatibilityChatContent() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [persons, setPersons] = useState<PersonData[]>([]);
  const [compatibilityResult, setCompatibilityResult] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Parse URL params on mount
  useEffect(() => {
    if (!searchParams) return;
    try {
      const personsParam = searchParams.get('persons');
      const resultParam = searchParams.get('result');

      if (personsParam) {
        const parsed = JSON.parse(decodeURIComponent(personsParam));
        setPersons(parsed);
      }
      if (resultParam) {
        setCompatibilityResult(decodeURIComponent(resultParam));
      }
    } catch (e) {
      logger.error('Failed to parse URL params:', { error: e instanceof Error ? e.message : String(e) });
    }
  }, [searchParams]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/compatibility/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persons,
          compatibilityResult,
          lang: locale,
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let assistantContent = '';

      // Add empty assistant message
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            assistantContent += data;

            // Update the last assistant message
            setMessages((prev) => {
              const updated = [...prev];
              if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: assistantContent,
                };
              }
              return updated;
            });
          }
        }
      }
    } catch (e) {
      logger.error('Chat error:', { error: e instanceof Error ? e.message : String(e) });
      setError(t('compatibilityPage.chat.error', '오류가 발생했습니다. 다시 시도해 주세요.'));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, persons, compatibilityResult, locale, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const personNames = persons.map((p) => p.name || 'Person').join(' & ');

  return (
    <ServicePageLayout
      icon="💬"
      title={t('compatibilityPage.chat.title', '궁합 상담')}
      subtitle={personNames || t('compatibilityPage.chat.subtitle', '궁합에 대해 질문하세요')}
      onBack={() => router.back()}
      backLabel={t('app.back', '뒤로')}
    >
      <div className={styles.chatContainer}>
        {/* Messages */}
        <div className={styles.messagesContainer}>
          {messages.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>💕</div>
              <h3>{t('compatibilityPage.chat.welcomeTitle', '궁합 상담을 시작하세요')}</h3>
              <p>{t('compatibilityPage.chat.welcomeDesc', '두 분의 궁합에 대해 무엇이든 물어보세요')}</p>
              <div className={styles.suggestions}>
                <button
                  className={styles.suggestionButton}
                  onClick={() => setInput('우리 궁합의 강점은 뭐야?')}
                >
                  우리 궁합의 강점은?
                </button>
                <button
                  className={styles.suggestionButton}
                  onClick={() => setInput('우리가 주의해야 할 점은?')}
                >
                  주의해야 할 점은?
                </button>
                <button
                  className={styles.suggestionButton}
                  onClick={() => setInput('이번 달 우리에게 좋은 날은?')}
                >
                  좋은 날짜 추천
                </button>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.assistantMessage}`}
            >
              <div className={styles.messageIcon}>
                {msg.role === 'user' ? '👤' : '🔮'}
              </div>
              <div className={styles.messageContent}>
                {msg.content || (isLoading && idx === messages.length - 1 && (
                  <span className={styles.typing}>
                    <span>.</span><span>.</span><span>.</span>
                  </span>
                ))}
              </div>
            </div>
          ))}

          {error && (
            <div className={styles.errorMessage}>{error}</div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className={styles.inputContainer}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('compatibilityPage.chat.placeholder', '궁합에 대해 질문하세요...')}
            className={styles.input}
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className={styles.sendButton}
          >
            {isLoading ? (
              <span className={styles.loadingSpinner} />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </ServicePageLayout>
  );
}

export default function CompatibilityChatPage() {
  return (
    <Suspense fallback={<ChatLoading />}>
      <CompatibilityChatContent />
    </Suspense>
  );
}

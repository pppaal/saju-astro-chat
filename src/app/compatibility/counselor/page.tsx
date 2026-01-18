'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ServicePageLayout from '@/components/ui/ServicePageLayout';
import { useI18n } from '@/i18n/I18nProvider';
import CreditBadge from '@/components/ui/CreditBadge';
import AuthGate from '@/components/auth/AuthGate';
import styles from '../chat/Chat.module.css';
import { logger } from '@/lib/logger';

// Loading fallback for Suspense
function CounselorLoading() {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner} />
      <p>상담사 준비 중...</p>
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
  latitude?: number;
  longitude?: number;
  timeZone?: string;
  relation?: string;
};

type Theme = 'general' | 'love' | 'business' | 'family';

const themeInfo: Record<Theme, { emoji: string; label: string; labelEn: string }> = {
  general: { emoji: '💫', label: '종합 상담', labelEn: 'General' },
  love: { emoji: '💕', label: '연애/결혼', labelEn: 'Love/Marriage' },
  business: { emoji: '🤝', label: '비즈니스', labelEn: 'Business' },
  family: { emoji: '👨‍👩‍👧‍👦', label: '가족 관계', labelEn: 'Family' },
};

function CompatibilityCounselorContent() {
  const { locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status: authStatus } = useSession();
  const isAuthed = authStatus === 'authenticated';

  const [persons, setPersons] = useState<PersonData[]>([]);
  const [person1Saju, setPerson1Saju] = useState<Record<string, unknown> | null>(null);
  const [person2Saju, setPerson2Saju] = useState<Record<string, unknown> | null>(null);
  const [person1Astro, setPerson1Astro] = useState<Record<string, unknown> | null>(null);
  const [person2Astro, setPerson2Astro] = useState<Record<string, unknown> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('general');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isKo = locale === 'ko';

  // Parse URL params and fetch data on mount
  useEffect(() => {
    if (!searchParams) return;

    const initializeData = async () => {
      try {
        const personsParam = searchParams.get('persons');
        const themeParam = searchParams.get('theme') as Theme | null;

        if (themeParam && themeInfo[themeParam]) {
          setTheme(themeParam);
        }

        if (personsParam) {
          const parsed = JSON.parse(decodeURIComponent(personsParam)) as PersonData[];
          setPersons(parsed);

          if (parsed.length >= 2) {
            // Fetch Saju and Astrology data
            await fetchPersonData(parsed);
          }
        }
      } catch (e) {
        logger.error('Failed to parse URL params:', { error: e });
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeData();
  }, [searchParams]);

  const fetchPersonData = async (personList: PersonData[]) => {
    try {
      const [saju1Res, saju2Res, astro1Res, astro2Res] = await Promise.all([
        fetch('/api/saju', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: personList[0].date,
            time: personList[0].time,
            latitude: personList[0].latitude || 37.5665,
            longitude: personList[0].longitude || 126.9780,
            timeZone: personList[0].timeZone || 'Asia/Seoul',
          }),
        }),
        fetch('/api/saju', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: personList[1].date,
            time: personList[1].time,
            latitude: personList[1].latitude || 37.5665,
            longitude: personList[1].longitude || 126.9780,
            timeZone: personList[1].timeZone || 'Asia/Seoul',
          }),
        }),
        fetch('/api/astrology', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: personList[0].date,
            time: personList[0].time,
            latitude: personList[0].latitude || 37.5665,
            longitude: personList[0].longitude || 126.9780,
          }),
        }),
        fetch('/api/astrology', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: personList[1].date,
            time: personList[1].time,
            latitude: personList[1].latitude || 37.5665,
            longitude: personList[1].longitude || 126.9780,
          }),
        }),
      ]);

      if (saju1Res.ok) setPerson1Saju(await saju1Res.json());
      if (saju2Res.ok) setPerson2Saju(await saju2Res.json());
      if (astro1Res.ok) setPerson1Astro(await astro1Res.json());
      if (astro2Res.ok) setPerson2Astro(await astro2Res.json());
    } catch (e) {
      logger.error('Failed to fetch person data:', { error: e });
    }
  };

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
      const response = await fetch('/api/compatibility/counselor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persons,
          person1Saju,
          person2Saju,
          person1Astro,
          person2Astro,
          lang: locale,
          messages: [...messages, userMessage],
          theme,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('login_required');
        }
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
      logger.error('Chat error:', { error: e });
      if ((e as Error).message === 'login_required') {
        setError(isKo ? '로그인이 필요한 프리미엄 기능입니다.' : 'Login required for this premium feature.');
      } else {
        setError(isKo ? '오류가 발생했습니다. 다시 시도해 주세요.' : 'An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, persons, person1Saju, person2Saju, person1Astro, person2Astro, locale, theme, isKo]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const personNames = persons.map((p) => p.name || 'Person').join(' & ');
  const _currentTheme = themeInfo[theme];

  // Require auth for counselor
  if (!isAuthed && authStatus !== 'loading') {
    return (
      <ServicePageLayout
        icon="🔮"
        title={isKo ? '프리미엄 궁합 상담사' : 'Premium Compatibility Counselor'}
        subtitle={isKo ? '로그인이 필요합니다' : 'Login required'}
        onBack={() => router.back()}
        backLabel={isKo ? '뒤로' : 'Back'}
      >
        <AuthGate>
          <div />
        </AuthGate>
      </ServicePageLayout>
    );
  }

  if (isInitializing) {
    return <CounselorLoading />;
  }

  return (
    <ServicePageLayout
      icon="🔮"
      title={isKo ? '프리미엄 궁합 상담사' : 'Premium Compatibility Counselor'}
      subtitle={personNames || (isKo ? '심화 궁합 상담' : 'Deep Compatibility Counseling')}
      onBack={() => router.back()}
      backLabel={isKo ? '뒤로' : 'Back'}
    >
      {/* Theme Selector & Credit Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(themeInfo) as Theme[]).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                theme === t
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                  : 'bg-slate-800/50 border border-slate-700/50 text-gray-400 hover:text-white'
              }`}
            >
              {themeInfo[t].emoji} {isKo ? themeInfo[t].label : themeInfo[t].labelEn}
            </button>
          ))}
        </div>
        <CreditBadge />
      </div>

      {/* Premium Badge */}
      <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <div>
            <p className="text-amber-300 font-medium text-sm">
              {isKo ? '프리미엄 AI 상담' : 'Premium AI Counseling'}
            </p>
            <p className="text-gray-400 text-xs">
              {isKo
                ? 'GraphRAG + 사주 + 점성학 심화 분석 기반'
                : 'Based on GraphRAG + Saju + Astrology deep analysis'}
            </p>
          </div>
        </div>
      </div>

      <div className={styles.chatContainer}>
        {/* Messages */}
        <div className={styles.messagesContainer}>
          {messages.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🔮</div>
              <h3>{isKo ? '프리미엄 궁합 상담을 시작하세요' : 'Start Premium Counseling'}</h3>
              <p>
                {isKo
                  ? '사주와 점성학의 심화 분석을 바탕으로 깊은 상담을 받아보세요'
                  : 'Get deep insights based on advanced Saju and Astrology analysis'}
              </p>
              <div className={styles.suggestions}>
                <button
                  className={styles.suggestionButton}
                  onClick={() => setInput(isKo ? '우리의 숨겨진 인연은 뭐야?' : 'What are our hidden connections?')}
                >
                  {isKo ? '숨겨진 인연 분석' : 'Hidden connections'}
                </button>
                <button
                  className={styles.suggestionButton}
                  onClick={() => setInput(isKo ? '우리 관계의 미래 가이던스를 알려줘' : 'Give me future guidance for our relationship')}
                >
                  {isKo ? '미래 가이던스' : 'Future guidance'}
                </button>
                <button
                  className={styles.suggestionButton}
                  onClick={() => setInput(isKo ? '우리가 함께 성장하려면 어떻게 해야 해?' : 'How can we grow together?')}
                >
                  {isKo ? '성장 조언' : 'Growth advice'}
                </button>
                <button
                  className={styles.suggestionButton}
                  onClick={() => setInput(isKo ? '우리 갈등 해결 스타일은 어때?' : 'What is our conflict resolution style?')}
                >
                  {isKo ? '갈등 해결 스타일' : 'Conflict style'}
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
            placeholder={isKo ? '궁합에 대해 깊이 있는 질문을 해보세요...' : 'Ask deep questions about your compatibility...'}
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

export default function CompatibilityCounselorPage() {
  return (
    <Suspense fallback={<CounselorLoading />}>
      <CompatibilityCounselorContent />
    </Suspense>
  );
}

'use client';

import { useEffect, useMemo, useState, FormEvent, useRef } from 'react';
import tzLookup from 'tz-lookup';
import { getUserTimezone } from '@/lib/Saju/timezone';
import { searchCities } from '@/lib/cities';
import ServicePageLayout from '@/components/ui/ServicePageLayout';
import { useI18n } from '@/i18n/I18nProvider';
import { saveUserProfile } from '@/lib/userProfile';
import { useSession } from 'next-auth/react';
import styles from './Dream.module.css';

type CityItem = { name: string; country: string; lat: number; lon: number };

// Response types from the existing dream-insight API
type InsightResponse = {
  summary?: string;
  dreamSymbols?: { label: string; meaning: string }[];
  astrology?: { highlights: string[]; sun?: string; moon?: string; asc?: string };
  crossInsights?: string[];
  recommendations?: string[];
  themes?: { label: string; weight: number }[];
  culturalNotes?: {
    korean?: string;
    western?: string;
    chinese?: string;
    islamic?: string;
  };
  luckyElements?: {
    isLucky?: boolean;
    luckyNumbers?: number[];
    luckyColors?: string[];
    advice?: string;
    matchedSymbols?: string[];
    elementAnalysis?: string;
    confidence?: number;
  };
  celestial?: {
    moon_phase?: {
      name?: string;
      korean?: string;
      emoji?: string;
      illumination?: number;
      dream_quality?: string;
      dream_meaning?: string;
      advice?: string;
    };
    moon_sign?: {
      sign?: string;
      korean?: string;
      dream_flavor?: string;
      enhanced_symbols?: string[];
    };
    retrogrades?: Array<{
      planet?: string;
      korean?: string;
      emoji?: string;
      themes?: string[];
      interpretation?: string;
    }>;
  };
  saved?: boolean;
  fromFallback?: boolean;
  error?: string;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type DreamHistoryItem = {
  id: string;
  createdAt: string;
  summary: string;
  dreamText?: string;
  symbols?: string[];
  themes?: { label: string; weight: number }[];
  luckyNumbers?: number[];
};

export default function DreamInsightPage() {
  const { t, locale } = useI18n();

  // Dream content
  const [dreamText, setDreamText] = useState('');

  // Birth data
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [timeZone, setTimeZone] = useState(getUserTimezone() || 'Asia/Seoul');

  // City search state
  const [suggestions, setSuggestions] = useState<CityItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InsightResponse | null>(null);

  // Profile loading state
  const { data: session, status } = useSession();
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  // History state
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<DreamHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Previous consultation memory (for context)
  const [previousConsultations, setPreviousConsultations] = useState<Array<{
    summary: string;
    dreamText?: string;
    createdAt: string;
  }>>([]);
  const [personaMemory, setPersonaMemory] = useState<{
    sessionCount?: number;
    keyInsights?: string[];
    emotionalTone?: string;
  } | null>(null);

  // Load profile from DB for authenticated users
  const handleLoadProfile = async () => {
    if (status !== 'authenticated') return;

    setLoadingProfile(true);
    setProfileError(null);

    try {
      const res = await fetch('/api/me/profile', { cache: 'no-store' });
      if (!res.ok) {
        setProfileError(t('error.profileLoadFailed') || 'Failed to load profile');
        setLoadingProfile(false);
        return;
      }

      const { user } = await res.json();
      if (!user || !user.birthDate) {
        setProfileError(t('error.noProfileData') || 'No saved profile data found');
        setLoadingProfile(false);
        return;
      }

      // Set form fields from DB data
      if (user.birthDate) setDate(user.birthDate);
      if (user.birthTime) setTime(user.birthTime);
      if (user.birthCity) {
        setCityQuery(user.birthCity);
        // Try to get city coordinates
        const cityName = user.birthCity.split(',')[0]?.trim();
        if (cityName) {
          try {
            const hits = await searchCities(cityName, { limit: 1 }) as CityItem[];
            if (hits && hits[0]) {
              const hit = hits[0];
              setLatitude(hit.lat);
              setLongitude(hit.lon);
              try {
                const tz = tzLookup(hit.lat, hit.lon);
                setTimeZone(tz);
              } catch {
                // Keep default timezone
              }
            }
          } catch {
            console.warn('City search failed for:', cityName);
          }
        }
      }

      setProfileLoaded(true);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setProfileError(t('error.profileLoadFailed') || 'Failed to load profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  // City search - only search when user is actively typing
  useEffect(() => {
    if (!cityQuery || cityQuery.length < 2 || !isUserTyping) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchCities(cityQuery, { limit: 5 });
        setSuggestions(results as CityItem[]);
        setShowDropdown(true);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [cityQuery, isUserTyping]);

  // Load previous consultation history for context (logged in users)
  useEffect(() => {
    if (status !== 'authenticated') return;

    const loadPreviousConsultations = async () => {
      try {
        const res = await fetch('/api/dream/chat/save?limit=5');
        if (res.ok) {
          const data = await res.json();
          if (data.consultations) {
            setPreviousConsultations(data.consultations.map((c: { summary: string; dreamText?: string; createdAt: string }) => ({
              summary: c.summary,
              dreamText: c.dreamText,
              createdAt: c.createdAt,
            })));
          }
          if (data.memory) {
            setPersonaMemory(data.memory);
          }
        }
      } catch (err) {
        console.warn('Failed to load previous consultations:', err);
      }
    };

    loadPreviousConsultations();
  }, [status]);

  const selectCity = (city: CityItem) => {
    setIsUserTyping(false);
    setCityQuery(`${city.name}, ${city.country}`);
    setLatitude(city.lat);
    setLongitude(city.lon);
    try {
      const tz = tzLookup(city.lat, city.lon);
      setTimeZone(tz);
    } catch {
      // Keep current timezone
    }
    setSuggestions([]);
    setShowDropdown(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!dreamText.trim() || dreamText.trim().length < 10) {
      setError(t('dream.errorMinLength') || 'Please describe your dream in at least 10 characters.');
      return;
    }

    if (!date) {
      setError(t('error.dateRequired') || 'Birth date is required.');
      return;
    }

    if (latitude === null || longitude === null) {
      setError(t('error.cityRequired') || 'Please select a city from the suggestions.');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // Save profile for convenience
      saveUserProfile({
        birthDate: date,
        birthTime: time,
        birthCity: cityQuery,
        latitude: latitude,
        longitude: longitude,
        timezone: timeZone,
      });

      // Use the dream API
      const res = await fetch('/api/dream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dream: dreamText.trim(),
          locale,
          birth: {
            date,
            time: time || undefined,
            latitude,
            longitude,
            timeZone,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to analyze dream');
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setDreamText('');
    setResult(null);
    setError(null);
    setChatMessages([]);
    setChatOpen(false);
  };

  // Load dream history
  const loadHistory = async () => {
    if (status !== 'authenticated') return;

    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const res = await fetch('/api/dream/history');
      if (!res.ok) {
        throw new Error('Failed to load history');
      }
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err: any) {
      setHistoryError(err.message || 'Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Toggle history panel
  const toggleHistory = () => {
    if (!showHistory && history.length === 0) {
      loadHistory();
    }
    setShowHistory(!showHistory);
  };

  // Delete a dream from history
  const deleteDream = async (id: string) => {
    if (!confirm(t('dream.history.confirmDelete') || 'Delete this dream?')) return;

    try {
      const res = await fetch(`/api/dream/history?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistory(prev => prev.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete dream:', err);
    }
  };

  // View a past dream
  const viewPastDream = (item: DreamHistoryItem) => {
    setResult({
      summary: item.summary,
      dreamSymbols: item.symbols?.map(s => ({ label: s, meaning: '' })),
      themes: item.themes,
      luckyElements: item.luckyNumbers ? { luckyNumbers: item.luckyNumbers } : undefined,
    });
    if (item.dreamText) {
      setDreamText(item.dreamText);
    }
    setShowHistory(false);
  };

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Save chat history (after conversation ends or periodically)
  const saveChatHistory = async (messages: ChatMessage[]) => {
    if (status !== 'authenticated' || messages.length < 2) return;

    try {
      await fetch('/api/dream/chat/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamText: dreamText,
          messages: messages,
          summary: result?.summary,
          locale,
        }),
      });
    } catch (err) {
      console.warn('Failed to save chat history:', err);
    }
  };

  // Chat submit handler - Enhanced with cultural, celestial, saju, and previous consultations
  const handleChatSubmit = async (message?: string) => {
    const userMessage = message || chatInput.trim();
    if (!userMessage || chatLoading) return;

    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      // Build enhanced dream context with all available data
      const enhancedContext: Record<string, unknown> = {
        dreamText: dreamText,
        summary: result?.summary,
        symbols: result?.dreamSymbols?.map(s => s.label),
        emotions: result?.dreamSymbols?.filter(s =>
          s.label.includes('감정') || s.label.includes('emotion')
        ).map(s => s.meaning),
        themes: result?.themes?.map(t => t.label),
        recommendations: result?.recommendations,
      };

      // Add cultural notes if available
      if (result?.culturalNotes) {
        enhancedContext.cultural_notes = result.culturalNotes;
      }

      // Add celestial context if available
      if (result?.celestial) {
        enhancedContext.celestial = result.celestial;
      }

      // Add birth data for saju context if available
      if (date && latitude !== null && longitude !== null) {
        enhancedContext.saju = {
          birth_date: date,
          birth_time: time || undefined,
          birth_city: cityQuery,
          timezone: timeZone,
        };
      }

      // Add previous consultation context for continuity
      if (previousConsultations.length > 0) {
        enhancedContext.previous_consultations = previousConsultations.slice(0, 3).map(c => ({
          summary: c.summary,
          dreamText: c.dreamText?.slice(0, 200),
          date: c.createdAt,
        }));
      }

      // Add persona memory for personalized responses
      if (personaMemory) {
        enhancedContext.persona_memory = {
          sessionCount: personaMemory.sessionCount,
          keyInsights: personaMemory.keyInsights,
          emotionalTone: personaMemory.emotionalTone,
        };
      }

      const response = await fetch('/api/dream/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, { role: 'user', content: userMessage }],
          dreamContext: enhancedContext,
          locale,
        }),
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      // Check if streaming SSE response
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        // Handle SSE streaming
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = '';

        setChatMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    assistantMessage += parsed.content;
                    setChatMessages(prev => {
                      const updated = [...prev];
                      updated[updated.length - 1] = { role: 'assistant', content: assistantMessage };
                      return updated;
                    });
                  }
                } catch {
                  // Ignore parse errors for incomplete chunks
                }
              }
            }
          }
        }
      } else {
        // Handle regular JSON response
        const data = await response.json();
        const assistantContent = data.reply || data.content || t('dream.chat.error');
        setChatMessages(prev => {
          const updated = [...prev, { role: 'assistant' as const, content: assistantContent }];
          // Save chat after getting response
          saveChatHistory(updated);
          return updated;
        });
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: t('dream.chat.error') }]);
    } finally {
      setChatLoading(false);

      // Save chat history after streaming completes (for SSE responses)
      setChatMessages(prev => {
        if (prev.length >= 2 && prev[prev.length - 1].role === 'assistant') {
          saveChatHistory(prev);
        }
        return prev;
      });
    }
  };

  // Generate random stars for background
  const stars = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 4}s`,
    }));
  }, []);

  return (
    <ServicePageLayout
      title={t('dream.title')}
      subtitle={t('dream.simpleSubtitle')}
      icon="🌙"
    >
      <div className={styles.page}>
        {/* Animated Stars Background */}
        <div className={styles.stars}>
          {stars.map((star) => (
            <div
              key={star.id}
              className={styles.star}
              style={{ left: star.left, top: star.top, animationDelay: star.delay }}
            />
          ))}
        </div>

        {/* Result View */}
        {result ? (
          <div className={`${styles.formContainer} ${styles.fadeIn}`}>
            <button onClick={handleReset} className={styles.resetButton}>
              <span className={styles.resetArrow}>←</span>
              {t('dream.buttonReset') || 'New Dream'}
            </button>

            <div className={styles.resultHeader}>
              <div className={styles.resultIconWrapper}>
                <span className={styles.resultIcon}>🌙</span>
                <div className={styles.resultIconRing}></div>
              </div>
              <h1 className={styles.resultMainTitle}>
                {t('dream.resultTitle')}
              </h1>
              <p className={styles.resultSubtitle}>
                {t('dream.resultSubtitle')}
              </p>
            </div>

            {/* Summary */}
            {result.summary && (
              <div className={styles.resultCard}>
                <div className={styles.resultCardGlow}></div>
                <div className={styles.resultTitle}>📖 {t('dream.resultSummary')}</div>
                <div className={styles.resultText}>{result.summary}</div>
              </div>
            )}

            {/* Dream Symbols */}
            {result.dreamSymbols && result.dreamSymbols.length > 0 && (
              <div className={styles.resultCard}>
                <div className={styles.resultCardGlow}></div>
                <div className={styles.resultTitle}>🔮 {t('dream.resultSymbols')}</div>
                <ul className={styles.resultList}>
                  {result.dreamSymbols.map((sym, i) => (
                    <li key={i}><strong>{sym.label}:</strong> {sym.meaning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cross Insights */}
            {result.crossInsights && result.crossInsights.length > 0 && (
              <div className={styles.resultCard}>
                <div className={styles.resultCardGlow}></div>
                <div className={styles.resultTitle}>💡 {t('dream.resultInsights')}</div>
                <ul className={styles.resultList}>
                  {result.crossInsights.map((insight, i) => (
                    <li key={i}>{insight}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations && result.recommendations.length > 0 && (
              <div className={styles.resultCard}>
                <div className={styles.resultCardGlow}></div>
                <div className={styles.resultTitle}>🌟 {t('dream.resultRecommendations')}</div>
                <ol className={styles.resultListOrdered}>
                  {result.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Themes */}
            {result.themes && result.themes.length > 0 && (
              <div className={styles.resultCard}>
                <div className={styles.resultCardGlow}></div>
                <div className={styles.resultTitle}>🎭 {t('dream.resultThemes')}</div>
                {result.themes.map((theme, i) => (
                  <div key={i} className={styles.themeBar}>
                    <div className={styles.themeLabel}>
                      <span>{theme.label}</span>
                      <span className={styles.themePercent}>{Math.round(theme.weight * 100)}%</span>
                    </div>
                    <div className={styles.themeBarContainer}>
                      <div className={styles.themeBarFill} style={{ width: `${theme.weight * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cultural Notes */}
            {result.culturalNotes?.korean && (
              <div className={styles.resultCard}>
                <div className={styles.resultCardGlow}></div>
                <div className={styles.resultTitle}>🇰🇷 {t('dream.resultCultural')}</div>
                <div className={styles.culturalNotesGrid}>
                  <div className={styles.culturalNote}>
                    <div>
                      <strong>{t('dream.korean')}</strong>
                      <p>{result.culturalNotes.korean}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Lucky Elements */}
            {result.luckyElements && (result.luckyElements.luckyColors?.length || result.luckyElements.luckyNumbers?.length) && (
              <div className={`${styles.resultCard} ${styles.luckyCard}`}>
                <div className={styles.resultCardGlow}></div>
                <div className={styles.resultTitle}>🍀 {t('dream.luckyElements')}</div>
                <div className={styles.luckyContent}>
                  {result.luckyElements.luckyNumbers && result.luckyElements.luckyNumbers.length > 0 && (
                    <div className={styles.luckyNumbers}>
                      <strong>{t('dream.luckyNumbers')}:</strong>
                      <div className={styles.numberBalls}>
                        {result.luckyElements.luckyNumbers.map((num, i) => (
                          <span key={i} className={styles.numberBall}>{num}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.luckyElements.luckyColors && result.luckyElements.luckyColors.length > 0 && (
                    <div className={styles.luckyColors}>
                      <strong>{t('dream.luckyColors')}:</strong>
                      <div className={styles.colorTags}>
                        {result.luckyElements.luckyColors.map((color, i) => (
                          <span key={i} className={styles.colorTag}>{color}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.luckyElements.advice && (
                    <div className={styles.luckyAdvice}>
                      <strong>{t('dream.luckyAdvice')}:</strong>
                      <p>{result.luckyElements.advice}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Astrology Insights */}
            {result.astrology && result.astrology.highlights && result.astrology.highlights.length > 0 && (
              <div className={styles.resultCard}>
                <div className={styles.resultCardGlow}></div>
                <div className={styles.resultTitle}>✨ {t('dream.astroInsight')}</div>
                <ul className={styles.resultList}>
                  {result.astrology.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Saved Status & Fallback Warning */}
            {result.saved && (
              <div className={styles.savedNotification}>
                <span>✅</span> {t('dream.savedSuccess')}
              </div>
            )}
            {!result.saved && session?.user && (
              <div className={styles.savedNotification} style={{ background: 'rgba(251, 191, 36, 0.1)', borderColor: 'rgba(251, 191, 36, 0.4)', color: '#fbbf24' }}>
                <span>⚠️</span> {t('dream.saveNotice')}
              </div>
            )}
            {result.fromFallback && (
              <div className={styles.savedNotification} style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}>
                <span>⚡</span> {t('dream.fallbackNotice')}
              </div>
            )}

            {/* Chat Section */}
            <div className={styles.chatSection}>
              <div className={styles.chatHeader} onClick={() => setChatOpen(!chatOpen)}>
                <div className={styles.chatHeaderLeft}>
                  <span className={styles.chatHeaderIcon}>💬</span>
                  <div>
                    <h3 className={styles.chatHeaderTitle}>{t('dream.chat.title')}</h3>
                    <p className={styles.chatHeaderSubtitle}>{t('dream.chat.subtitle')}</p>
                  </div>
                </div>
                <span className={`${styles.chatToggleIcon} ${chatOpen ? styles.chatToggleIconOpen : ''}`}>▼</span>
              </div>

              {chatOpen && (
                <div className={styles.chatContent}>
                  {/* Messages */}
                  <div className={styles.chatMessages} ref={chatMessagesRef}>
                    {chatMessages.length === 0 ? (
                      <div className={styles.chatEmpty}>
                        <div className={styles.chatEmptyIcon}>🌙</div>
                        <p className={styles.chatEmptyText}>{t('dream.chat.empty')}</p>
                        <div className={styles.chatQuickQuestions}>
                          <button
                            className={styles.chatQuickQuestion}
                            onClick={() => handleChatSubmit(t('dream.chat.quickQ1'))}
                          >
                            {t('dream.chat.quickQ1')}
                          </button>
                          <button
                            className={styles.chatQuickQuestion}
                            onClick={() => handleChatSubmit(t('dream.chat.quickQ2'))}
                          >
                            {t('dream.chat.quickQ2')}
                          </button>
                          <button
                            className={styles.chatQuickQuestion}
                            onClick={() => handleChatSubmit(t('dream.chat.quickQ3'))}
                          >
                            {t('dream.chat.quickQ3')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      chatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`${styles.chatMessage} ${msg.role === 'user' ? styles.chatMessageUser : ''}`}
                        >
                          <div className={`${styles.chatMessageAvatar} ${msg.role === 'user' ? styles.chatMessageAvatarUser : styles.chatMessageAvatarAssistant}`}>
                            {msg.role === 'user' ? '👤' : '🌙'}
                          </div>
                          <div className={`${styles.chatMessageBubble} ${msg.role === 'user' ? styles.chatMessageBubbleUser : styles.chatMessageBubbleAssistant}`}>
                            {msg.content}
                            {chatLoading && idx === chatMessages.length - 1 && msg.role === 'assistant' && !msg.content && (
                              <span className={styles.chatStreamingCursor}></span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {chatLoading && chatMessages[chatMessages.length - 1]?.role === 'user' && (
                      <div className={styles.chatTyping}>
                        <div className={styles.chatTypingDots}>
                          <span className={styles.chatTypingDot}></span>
                          <span className={styles.chatTypingDot}></span>
                          <span className={styles.chatTypingDot}></span>
                        </div>
                        <span>{t('dream.chat.thinking')}</span>
                      </div>
                    )}
                  </div>

                  {/* Input Area */}
                  <div className={styles.chatInputArea}>
                    <textarea
                      className={styles.chatInput}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleChatSubmit();
                        }
                      }}
                      placeholder={t('dream.chat.placeholder')}
                      rows={1}
                      disabled={chatLoading}
                    />
                    <button
                      className={styles.chatSendButton}
                      onClick={() => handleChatSubmit()}
                      disabled={!chatInput.trim() || chatLoading}
                    >
                      <span className={styles.chatSendIcon}>➤</span>
                      {t('dream.chat.send')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Input Form */
          <form onSubmit={handleSubmit} className={`${styles.formContainer} ${styles.fadeIn}`}>
            {/* Dream Input Card */}
            <div className={styles.dreamInputCard}>
              <div className={styles.dreamInputHeader}>
                <div className={styles.dreamInputIconWrapper}>
                  <span className={styles.dreamInputIcon}>✍️</span>
                </div>
                <div className={styles.dreamInputTitleArea}>
                  <h3 className={styles.dreamInputTitle}>{t('dream.labelDream')}</h3>
                  <p className={styles.dreamInputHint}>{t('dream.hintDream')}</p>
                </div>
              </div>
              <div className={styles.dreamTextareaWrapper}>
                <textarea
                  className={styles.dreamTextarea}
                  value={dreamText}
                  onChange={(e) => setDreamText(e.target.value)}
                  placeholder={t('dream.placeholderDream')}
                  rows={6}
                />
                <div className={styles.dreamTextareaGlow}></div>
              </div>
            </div>

            {/* Birth Info Card */}
            <div className={styles.birthInfoCard}>
              <div className={styles.birthInfoHeader}>
                <div className={styles.birthInfoIconWrapper}>
                  <span className={styles.birthInfoIcon}>🎂</span>
                </div>
                <div className={styles.birthInfoTitleArea}>
                  <h3 className={styles.birthInfoTitle}>{t('dream.birthInfo')}</h3>
                  <p className={styles.birthInfoHint}>{t('dream.birthInfoHint')}</p>
                </div>
              </div>

              {/* Load My Profile Button - only for authenticated users */}
              {status === 'authenticated' && (
                <button
                  type="button"
                  className={`${styles.loadProfileButton} ${profileLoaded ? styles.loadProfileSuccess : ''}`}
                  onClick={handleLoadProfile}
                  disabled={loadingProfile}
                >
                  <span className={styles.loadProfileIcon}>
                    {loadingProfile ? (
                      <span className={styles.loadingDots}>...</span>
                    ) : profileLoaded ? '✓' : '👤'}
                  </span>
                  <span className={styles.loadProfileText}>
                    {loadingProfile
                      ? (t('app.loadingProfile') || 'Loading...')
                      : profileLoaded
                      ? (t('app.profileLoaded') || 'Profile Loaded!')
                      : (t('app.loadMyProfile') || 'Load My Profile')}
                  </span>
                  {!loadingProfile && !profileLoaded && (
                    <span className={styles.loadProfileArrow}>→</span>
                  )}
                </button>
              )}
              {profileError && <div className={styles.error}>{profileError}</div>}

              <div className={styles.birthFieldsGrid}>
                {/* Birth Date */}
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>
                    <span className={styles.fieldLabelIcon}>📅</span>
                    {t('form.birthDate')} *
                  </label>
                  <input
                    type="date"
                    className={styles.fieldInput}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                {/* Birth Time (optional) */}
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>
                    <span className={styles.fieldLabelIcon}>🕐</span>
                    {t('form.birthTime')}
                  </label>
                  <input
                    type="time"
                    className={styles.fieldInput}
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                  <p className={styles.fieldHint}>{t('form.birthTimeOptional')}</p>
                </div>
              </div>

              {/* City */}
              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  <span className={styles.fieldLabelIcon}>🌍</span>
                  {t('form.birthCity')} *
                </label>
                <div className={styles.cityInputWrapper}>
                  <input
                    type="text"
                    className={styles.fieldInput}
                    value={cityQuery}
                    onChange={(e) => {
                      setCityQuery(e.target.value);
                      setLatitude(null);
                      setLongitude(null);
                      setIsUserTyping(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setShowDropdown(false);
                        setIsUserTyping(false);
                      }, 200);
                    }}
                    placeholder={t('form.cityPlaceholder')}
                    autoComplete="off"
                    required
                  />
                  {showDropdown && suggestions.length > 0 && (
                    <ul className={styles.cityDropdown}>
                      {suggestions.map((city, idx) => (
                        <li
                          key={idx}
                          className={styles.cityDropdownItem}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectCity(city);
                          }}
                        >
                          <span className={styles.cityName}>{city.name}</span>
                          <span className={styles.cityCountry}>{city.country}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Error */}
            {error && <div className={styles.error}>{error}</div>}

            {/* Submit Button */}
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className={styles.spinner} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="10" />
                  </svg>
                  {t('dream.buttonAnalyzing')}
                </>
              ) : (
                <>
                  🔮 {t('dream.buttonAnalyze')}
                  <span className={styles.buttonGlow}></span>
                </>
              )}
            </button>

            {/* History Section - Only for authenticated users */}
            {status === 'authenticated' && (
              <div className={styles.historySection}>
                <button
                  type="button"
                  className={styles.historyToggle}
                  onClick={toggleHistory}
                >
                  <span>📜</span>
                  {t('dream.history.title') || 'My Dream History'}
                  <span className={`${styles.historyArrow} ${showHistory ? styles.historyArrowOpen : ''}`}>▼</span>
                </button>

                {showHistory && (
                  <div className={styles.historyPanel}>
                    {historyLoading ? (
                      <div className={styles.historyLoading}>
                        {t('dream.history.loading') || 'Loading...'}
                      </div>
                    ) : historyError ? (
                      <div className={styles.historyError}>
                        {historyError}
                        <button onClick={loadHistory} className={styles.historyRetry}>
                          {t('dream.history.retry') || 'Retry'}
                        </button>
                      </div>
                    ) : history.length === 0 ? (
                      <div className={styles.historyEmpty}>
                        <span>🌙</span>
                        <p>{t('dream.history.empty') || 'No dreams recorded yet'}</p>
                      </div>
                    ) : (
                      <div className={styles.historyList}>
                        {history.map((item) => (
                          <div key={item.id} className={styles.historyItem}>
                            <div className={styles.historyItemHeader}>
                              <span className={styles.historyDate}>
                                {new Date(item.createdAt).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                              <div className={styles.historyActions}>
                                <button
                                  className={styles.historyView}
                                  onClick={() => viewPastDream(item)}
                                  title={t('dream.history.view') || 'View'}
                                >
                                  👁️
                                </button>
                                <button
                                  className={styles.historyDelete}
                                  onClick={() => deleteDream(item.id)}
                                  title={t('dream.history.delete') || 'Delete'}
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                            <p className={styles.historySummary}>
                              {item.summary?.substring(0, 100)}
                              {(item.summary?.length || 0) > 100 ? '...' : ''}
                            </p>
                            {item.symbols && item.symbols.length > 0 && (
                              <div className={styles.historySymbols}>
                                {item.symbols.slice(0, 3).map((symbol, idx) => (
                                  <span key={idx} className={styles.historySymbol}>{symbol}</span>
                                ))}
                                {item.symbols.length > 3 && (
                                  <span className={styles.historySymbolMore}>+{item.symbols.length - 3}</span>
                                )}
                              </div>
                            )}
                            {item.luckyNumbers && item.luckyNumbers.length > 0 && (
                              <div className={styles.historyLucky}>
                                🍀 {item.luckyNumbers.join(', ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        )}
      </div>
    </ServicePageLayout>
  );
}

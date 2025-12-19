'use client';

import { useEffect, useMemo, useState, FormEvent, useCallback, useRef } from 'react';
import tzLookup from 'tz-lookup';
import { getSupportedTimezones, getUserTimezone } from '@/lib/Saju/timezone';
import { searchCities } from '@/lib/cities';
import ServicePageLayout from '@/components/ui/ServicePageLayout';
import { useI18n } from '@/i18n/I18nProvider';
import {
  DREAM_SYMBOLS,
  DREAM_EMOTIONS,
  DREAM_THEMES,
  DREAM_CONTEXT,
  KOREAN_DREAM_TYPES,
  KOREAN_LUCKY_SYMBOLS,
  generateQuickDreamEntry,
} from '@/lib/dream/dreamPrompts';
import styles from './Dream.module.css';

type CityItem = { name: string; country: string; lat: number; lon: number };

// Types for recent dreams
type RecentDream = {
  id: string;
  symbols: string[];
  emotions: string[];
  preview: string;
  date: string;
};

// Symbol relationships for smart recommendations
const SYMBOL_RELATIONSHIPS: Record<string, string[]> = {
  'snake': ['forest', 'water', 'fear', 'transformation'],
  'water': ['ocean', 'fish', 'rain', 'swimming', 'drowning'],
  'flying': ['bird', 'sky', 'falling', 'freedom'],
  'death': ['funeral', 'grave', 'rebirth', 'ancestor'],
  'fire': ['destruction', 'passion', 'phoenix', 'light'],
  'baby': ['birth', 'pregnancy', 'family', 'innocence'],
  'house': ['home', 'family', 'rooms', 'building'],
  'car': ['driving', 'journey', 'accident', 'speed'],
  'teeth': ['falling', 'breaking', 'health', 'anxiety'],
  'money': ['wealth', 'gold', 'treasure', 'loss'],
  'dog': ['loyalty', 'protection', 'friend', 'chase'],
  'cat': ['independence', 'mystery', 'intuition'],
  'spider': ['web', 'fear', 'creativity', 'trap'],
  'ocean': ['waves', 'depth', 'fish', 'drowning'],
  'forest': ['trees', 'lost', 'nature', 'darkness'],
};

// Symbol meanings for tooltips
const SYMBOL_MEANINGS: Record<string, string> = {
  'snake': '변화, 치유, 또는 숨겨진 위협을 상징',
  'water': '감정, 무의식, 정화를 나타냄',
  'flying': '자유, 해방, 또는 현실 도피를 의미',
  'death': '끝과 새로운 시작, 변화를 상징',
  'fire': '열정, 분노, 또는 정화를 나타냄',
  'baby': '새로운 시작, 순수함, 잠재력',
  'house': '자아, 마음의 상태, 안정감',
  'car': '인생의 방향, 통제력, 여정',
  'teeth': '자신감, 건강, 의사소통',
  'money': '가치, 자존감, 성공',
  'dog': '충성, 우정, 본능',
  'cat': '독립성, 직관, 여성성',
  'spider': '창의성, 운명, 인내',
  'ocean': '무의식, 감정의 깊이',
  'forest': '무의식 탐험, 미지의 영역',
};

// Voice Recognition Hook
function useVoiceRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'ko-KR';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            finalTranscript += event.results[i][0].transcript;
          }
          setTranscript(finalTranscript);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  return { isListening, transcript, isSupported, startListening, stopListening, setTranscript };
}

// LocalStorage keys
const STORAGE_KEYS = {
  DRAFT: 'dream_draft',
  RECENT: 'dream_recent',
};

type InsightResponse = {
  summary?: string;
  dreamSymbols?: { label: string; meaning: string }[];
  astrology?: { highlights: string[]; sun?: string; moon?: string; asc?: string };
  crossInsights?: string[];
  recommendations?: string[];
  themes?: { label: string; weight: number }[];
  culturalNotes?: {
    korean?: string;
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
  premiumFeatures?: {
    combinations?: {
      combination: string;
      meaning: string;
      interpretation: string;
      fortune_type: string;
      is_lucky: boolean;
      lucky_score: number;
    }[] | null;
    taemong?: {
      is_taemong: boolean;
      symbols: {
        symbol: string;
        child_trait: string;
        gender_hint: string;
        interpretation: string;
        celebrity_examples: string[];
        lucky_score: number;
      }[];
      primary_symbol: {
        symbol: string;
        child_trait: string;
        gender_hint: string;
        interpretation: string;
        celebrity_examples: string[];
        lucky_score: number;
      } | null;
    } | null;
    lucky_numbers?: {
      numbers: number[];
      matched_symbols: string[];
      dominant_element: string | null;
      element_analysis: string | null;
      confidence: number;
    } | null;
  };
  celestial?: {
    timestamp: string;
    moon_phase: {
      name: string;
      korean: string;
      emoji: string;
      illumination: number;
      age_days: number;
      dream_quality: string;
      dream_meaning: string;
      favorable_symbols: string[];
      intensified_symbols: string[];
      advice: string;
      weight_modifier: number;
      enhanced_themes: string[];
    };
    moon_sign: {
      sign: string;
      korean: string;
      dream_flavor: string;
      enhanced_symbols: string[];
    };
    retrogrades: {
      planet: string;
      korean: string;
      emoji?: string;
      themes: string[];
      common_symbols?: string[];
      interpretation?: string;
    }[];
    significant_aspects: {
      aspect: string;
      themes: string[];
      special_note?: string;
      interpretation?: string;
    }[];
    planets: {
      name: string;
      name_ko: string;
      sign: string;
      sign_ko: string;
      retrograde: boolean;
    }[];
    source: string;
  } | null;
  raw?: any;
  saved?: boolean; // Supabase에 저장되었는지 여부
  error?: string;
};

export default function DreamInsightPage() {
  const { t } = useI18n();

  // Dream - Quick Select Mode
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedContext, setSelectedContext] = useState<string[]>([]);
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [useDetailedMode, setUseDetailedMode] = useState(false);
  const [detailedDream, setDetailedDream] = useState('');
  const [share, setShare] = useState(false);

  // Cultural Dream Symbols (Korean only)
  const [selectedKoreanTypes, setSelectedKoreanTypes] = useState<string[]>([]);
  const [selectedKoreanLucky, setSelectedKoreanLucky] = useState<string[]>([]);

  // Birth data
  const [showBirthData, setShowBirthData] = useState(false);
  const [showCulturalSymbols, setShowCulturalSymbols] = useState(false);
  const [date, setDate] = useState('1995-02-09');
  const [time, setTime] = useState('06:40');
  const [cityQuery, setCityQuery] = useState('Seoul, KR');
  const [latitude, setLatitude] = useState(37.5665);
  const [longitude, setLongitude] = useState(126.978);
  const _timezones = useMemo(() => getSupportedTimezones(), []);
  const [timeZone, setTimeZone] = useState(getUserTimezone() || 'Asia/Seoul');

  // Autocomplete
  const [suggestions, setSuggestions] = useState<CityItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InsightResponse | null>(null);
  const [activeSymbolCategory, setActiveSymbolCategory] = useState<keyof typeof DREAM_SYMBOLS>('animals');

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingSection, setStreamingSection] = useState<string>('');
  const [streamingSummary, setStreamingSummary] = useState<string>('');
  const [streamingSymbols, setStreamingSymbols] = useState<string>('');
  const [streamingRecommendations, setStreamingRecommendations] = useState<string>('');
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Loading messages for streaming
  const LOADING_MESSAGES = [
    '꿈의 상징들을 해석하고 있어요...',
    '무의식의 메시지를 분석 중이에요...',
    '문화적 맥락을 고려하고 있어요...',
    '깊은 통찰을 찾고 있어요...',
    '당신의 꿈이 알려주는 이야기...',
  ];

  // Build result from streaming data when streaming completes
  useEffect(() => {
    if (!isStreaming && !isLoading && (streamingSummary || streamingSymbols || streamingRecommendations) && !result) {
      setResult({
        summary: streamingSummary || undefined,
        recommendations: streamingRecommendations ? streamingRecommendations.split('\n').filter(r => r.trim()) : [],
        dreamSymbols: streamingSymbols ? [{ label: '심볼 분석', meaning: streamingSymbols }] : [],
      });
    }
  }, [isStreaming, isLoading, streamingSummary, streamingSymbols, streamingRecommendations, result]);

  // NEW UX FEATURES STATE
  const [searchQuery, setSearchQuery] = useState('');
  const [recentDreams, setRecentDreams] = useState<RecentDream[]>([]);
  const [showRecentDreams, setShowRecentDreams] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [draggedSymbol, setDraggedSymbol] = useState<string | null>(null);

  // Voice recognition
  const voice = useVoiceRecognition();

  // Autocomplete debounce
  useEffect(() => {
    const q = cityQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const items = (await searchCities(q, { limit: 20 })) as CityItem[];
        setSuggestions(items);
        setShowDropdown(true);
      } catch {
        setSuggestions([]);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [cityQuery]);

  // Load recent dreams from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RECENT);
      if (stored) {
        setRecentDreams(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Auto-save draft to localStorage
  useEffect(() => {
    const draft = {
      selectedSymbols,
      selectedEmotions,
      selectedThemes,
      selectedContext,
      additionalDetails,
      detailedDream,
      useDetailedMode,
    };

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(draft));
        setAutoSaved(true);
        setTimeout(() => setAutoSaved(false), 2000);
      } catch {
        // Ignore storage errors
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [selectedSymbols, selectedEmotions, selectedThemes, selectedContext, additionalDetails, detailedDream, useDetailedMode]);

  // Load draft on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DRAFT);
      if (stored) {
        const draft = JSON.parse(stored);
        if (draft.selectedSymbols) setSelectedSymbols(draft.selectedSymbols);
        if (draft.selectedEmotions) setSelectedEmotions(draft.selectedEmotions);
        if (draft.selectedThemes) setSelectedThemes(draft.selectedThemes);
        if (draft.selectedContext) setSelectedContext(draft.selectedContext);
        if (draft.additionalDetails) setAdditionalDetails(draft.additionalDetails);
        if (draft.detailedDream) setDetailedDream(draft.detailedDream);
        if (draft.useDetailedMode !== undefined) setUseDetailedMode(draft.useDetailedMode);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Preview text (real-time generation)
  const previewText = useMemo(() => {
    if (useDetailedMode) return detailedDream;
    return generateQuickDreamEntry({
      symbols: selectedSymbols,
      emotions: selectedEmotions,
      additionalDetails,
    });
  }, [useDetailedMode, detailedDream, selectedSymbols, selectedEmotions, additionalDetails]);

  // Progress calculation
  const progress = useMemo(() => {
    if (useDetailedMode) {
      return Math.min(100, (detailedDream.length / 50) * 100);
    }
    let score = 0;
    if (selectedSymbols.length > 0) score += 40;
    if (selectedEmotions.length > 0) score += 30;
    if (selectedThemes.length > 0) score += 15;
    if (additionalDetails.trim()) score += 15;
    return Math.min(100, score);
  }, [useDetailedMode, detailedDream, selectedSymbols, selectedEmotions, selectedThemes, additionalDetails]);

  // Smart recommendations based on selected symbols
  const recommendations = useMemo(() => {
    const allRelated = new Set<string>();
    selectedSymbols.forEach(symbol => {
      const key = symbol.toLowerCase();
      const related = SYMBOL_RELATIONSHIPS[key] || [];
      related.forEach(r => allRelated.add(r));
    });
    // Filter out already selected and return top 5
    return Array.from(allRelated)
      .filter(r => !selectedSymbols.map(s => s.toLowerCase()).includes(r))
      .slice(0, 5);
  }, [selectedSymbols]);

  // Filter symbols by search query
  const filteredSymbols = useMemo(() => {
    if (!searchQuery.trim()) return DREAM_SYMBOLS[activeSymbolCategory];
    const query = searchQuery.toLowerCase();
    return DREAM_SYMBOLS[activeSymbolCategory].filter(
      symbol =>
        symbol.en.toLowerCase().includes(query) ||
        symbol.ko.toLowerCase().includes(query)
    );
  }, [searchQuery, activeSymbolCategory]);

  // Get tooltip for symbol
  const getTooltip = (symbolEn: string) => {
    return SYMBOL_MEANINGS[symbolEn.toLowerCase()] || '';
  };

  // Save to recent dreams
  const saveToRecent = (dreamPreview: string) => {
    const newDream: RecentDream = {
      id: Date.now().toString(),
      symbols: selectedSymbols,
      emotions: selectedEmotions,
      preview: dreamPreview.slice(0, 100),
      date: new Date().toLocaleDateString('ko-KR'),
    };
    const updated = [newDream, ...recentDreams].slice(0, 10);
    setRecentDreams(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  // Load from recent dream
  const loadRecentDream = (dream: RecentDream) => {
    setSelectedSymbols(dream.symbols);
    setSelectedEmotions(dream.emotions);
    setShowRecentDreams(false);
  };

  // Delete recent dream
  const deleteRecentDream = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentDreams.filter(d => d.id !== id);
    setRecentDreams(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  // Drag and drop handlers
  const handleDragStart = (symbol: string) => {
    setDraggedSymbol(symbol);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetSymbol: string) => {
    e.preventDefault();
    if (!draggedSymbol || draggedSymbol === targetSymbol) return;

    const newSymbols = [...selectedSymbols];
    const dragIndex = newSymbols.indexOf(draggedSymbol);
    const targetIndex = newSymbols.indexOf(targetSymbol);

    if (dragIndex !== -1 && targetIndex !== -1) {
      newSymbols.splice(dragIndex, 1);
      newSymbols.splice(targetIndex, 0, draggedSymbol);
      setSelectedSymbols(newSymbols);
    }
    setDraggedSymbol(null);
  };

  // Use voice transcript
  const useVoiceTranscript = () => {
    if (voice.transcript) {
      if (useDetailedMode) {
        setDetailedDream(prev => prev + ' ' + voice.transcript);
      } else {
        setAdditionalDetails(prev => prev + ' ' + voice.transcript);
      }
      voice.setTranscript('');
      voice.stopListening();
    }
  };

  const onPickCity = (item: CityItem) => {
    setCityQuery(`${item.name}, ${item.country}`);
    setLatitude(item.lat);
    setLongitude(item.lon);
    setShowDropdown(false);

    try {
      const guessed = tzLookup(item.lat, item.lon);
      if (guessed && typeof guessed === 'string') {
        setTimeZone(guessed);
      }
    } catch {}
  };

  const toggleSymbol = (symbol: string) => {
    setSelectedSymbols(prev =>
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  };

  const toggleEmotion = (emotion: string) => {
    setSelectedEmotions(prev =>
      prev.includes(emotion) ? prev.filter(e => e !== emotion) : [...prev, emotion]
    );
  };

  const toggleTheme = (theme: string) => {
    setSelectedThemes(prev =>
      prev.includes(theme) ? prev.filter(t => t !== theme) : [...prev, theme]
    );
  };

  const toggleContext = (context: string) => {
    setSelectedContext(prev =>
      prev.includes(context) ? prev.filter(c => c !== context) : [...prev, context]
    );
  };

  // Cultural symbol toggle functions
  const toggleKoreanType = (type: string) => {
    setSelectedKoreanTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleKoreanLucky = (symbol: string) => {
    setSelectedKoreanLucky(prev =>
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setIsStreaming(true);
    setError(null);
    setResult(null);
    setStreamingSummary('');
    setStreamingSymbols('');
    setStreamingRecommendations('');
    setStreamingSection('');
    setLoadingMessageIndex(0);

    // Generate dream text based on mode
    let dreamText: string;
    if (useDetailedMode) {
      dreamText = detailedDream.trim();
      if (dreamText.length < 10) {
        setIsLoading(false);
        setIsStreaming(false);
        setError(t('dream.errorMinLength'));
        return;
      }
    } else {
      if (selectedSymbols.length === 0 && selectedEmotions.length === 0 && !additionalDetails.trim()) {
        setIsLoading(false);
        setIsStreaming(false);
        setError(t('dream.errorSelectSymbols'));
        return;
      }
      dreamText = generateQuickDreamEntry({
        symbols: selectedSymbols,
        emotions: selectedEmotions,
        additionalDetails,
      });
    }

    if (!dreamText) {
      setIsLoading(false);
      setIsStreaming(false);
      setError(t('dream.errorEnterDream'));
      return;
    }

    // Start loading message rotation
    const messageInterval = setInterval(() => {
      setLoadingMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const body = {
        dreamText,
        symbols: selectedSymbols,
        emotions: selectedEmotions,
        themes: selectedThemes,
        context: selectedContext,
        locale: 'ko',
        koreanTypes: selectedKoreanTypes,
        koreanLucky: selectedKoreanLucky,
      };

      // Call streaming API
      const res = await fetch('/api/dream/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                throw new Error(data.error);
              }

              if (data.done) {
                // Streaming complete - will be handled in finally
                break;
              }

              if (data.section === 'summary') {
                if (data.status === 'start') {
                  setStreamingSection('summary');
                } else if (data.content) {
                  setStreamingSummary(prev => prev + data.content);
                }
              } else if (data.section === 'symbols') {
                if (data.status === 'start') {
                  setStreamingSection('symbols');
                } else if (data.content) {
                  setStreamingSymbols(prev => prev + data.content);
                }
              } else if (data.section === 'recommendations') {
                if (data.status === 'start') {
                  setStreamingSection('recommendations');
                } else if (data.content) {
                  setStreamingRecommendations(prev => prev + data.content);
                }
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      // Save to recent dreams
      saveToRecent(dreamText);
      // Clear draft after successful submission
      localStorage.removeItem(STORAGE_KEYS.DRAFT);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled - reset streaming state
        setStreamingSummary('');
        setStreamingSymbols('');
        setStreamingRecommendations('');
      } else {
        setError(err.message || 'Unknown error occurred.');
      }
    } finally {
      clearInterval(messageInterval);
      setIsLoading(false);
      setStreamingSection('');
      abortControllerRef.current = null;
      // Small delay before transitioning to result
      setTimeout(() => {
        setIsStreaming(false);
      }, 300);
    }
  };

  const cancelStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const resetForm = () => {
    setSelectedSymbols([]);
    setSelectedEmotions([]);
    setSelectedThemes([]);
    setSelectedContext([]);
    setAdditionalDetails('');
    setDetailedDream('');
    setResult(null);
    setError(null);
    // Reset Korean cultural symbols
    setSelectedKoreanTypes([]);
    setSelectedKoreanLucky([]);
    // Reset streaming state
    setStreamingSummary('');
    setStreamingSymbols('');
    setStreamingRecommendations('');
  };

  return (
    <ServicePageLayout
      icon="🌙"
      title={t("dream.title")}
      subtitle={t("dream.subtitle")}
    >
      <main className={styles.page}>
        {/* Background Stars - using deterministic values to avoid hydration mismatch */}
        <div className={styles.stars}>
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className={styles.star}
              style={{
                left: `${((i * 37 + 13) % 100)}%`,
                top: `${((i * 53 + 7) % 100)}%`,
                animationDelay: `${(i % 4) + (i * 0.13)}s`,
                animationDuration: `${3 + (i % 3)}s`,
              }}
            />
          ))}
        </div>

        {/* Streaming UI */}
        {isStreaming && (
          <div className={`${styles.streamingContainer} ${styles.fadeIn}`}>
            <h2 className={styles.streamingTitle}>🌙 꿈을 해석하고 있어요...</h2>

            {/* Progress Indicator */}
            <div className={styles.streamingProgress}>
              <span className={`${styles.streamingStep} ${streamingSection === 'summary' ? styles.streamingStepActive : streamingSummary ? styles.streamingStepDone : ''}`}>
                <span className={styles.streamingStepIcon}>{streamingSummary ? '✓' : '📝'}</span>
                요약
              </span>
              <span className={`${styles.streamingStep} ${streamingSection === 'symbols' ? styles.streamingStepActive : streamingSymbols ? styles.streamingStepDone : ''}`}>
                <span className={styles.streamingStepIcon}>{streamingSymbols ? '✓' : '🔮'}</span>
                심볼 분석
              </span>
              <span className={`${styles.streamingStep} ${streamingSection === 'recommendations' ? styles.streamingStepActive : streamingRecommendations ? styles.streamingStepDone : ''}`}>
                <span className={styles.streamingStepIcon}>{streamingRecommendations ? '✓' : '💡'}</span>
                조언
              </span>
            </div>

            {/* Summary Section */}
            {(streamingSection === 'summary' || streamingSummary) && (
              <div className={`${styles.streamingContentBox} ${streamingSection === 'summary' ? styles.active : ''}`}>
                <h3 className={styles.streamingSectionTitle}>📝 꿈의 메시지</h3>
                <div className={styles.streamingText}>
                  {streamingSummary}
                  {streamingSection === 'summary' && <span className={styles.streamingCursor} />}
                </div>
              </div>
            )}

            {/* Symbols Section */}
            {(streamingSection === 'symbols' || streamingSymbols) && (
              <div className={`${styles.streamingContentBox} ${streamingSection === 'symbols' ? styles.active : ''}`}>
                <h3 className={styles.streamingSectionTitle}>🔮 심볼 분석</h3>
                <div className={styles.streamingText}>
                  {streamingSymbols}
                  {streamingSection === 'symbols' && <span className={styles.streamingCursor} />}
                </div>
              </div>
            )}

            {/* Recommendations Section */}
            {(streamingSection === 'recommendations' || streamingRecommendations) && (
              <div className={`${styles.streamingContentBox} ${streamingSection === 'recommendations' ? styles.active : ''}`}>
                <h3 className={styles.streamingSectionTitle}>💡 실천 조언</h3>
                <div className={styles.streamingText}>
                  {streamingRecommendations}
                  {streamingSection === 'recommendations' && <span className={styles.streamingCursor} />}
                </div>
              </div>
            )}

            {/* Loading Dots when waiting */}
            {!streamingSummary && !streamingSymbols && !streamingRecommendations && (
              <div className={styles.streamingContentBox}>
                <div className={styles.typingDots}>
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                </div>
              </div>
            )}

            {/* Loading Message */}
            <div className={styles.loadingMessages}>
              <p className={styles.loadingMessage} key={loadingMessageIndex}>
                {LOADING_MESSAGES[loadingMessageIndex]}
              </p>
            </div>

            {/* Cancel Button */}
            <button type="button" className={styles.cancelButton} onClick={cancelStreaming}>
              취소
            </button>
          </div>
        )}

        {!result && !isStreaming && (
          <div className={`${styles.formContainer} ${styles.fadeIn}`}>
            <div className={styles.formHeader}>
              <div className={styles.formIcon}>🌙</div>
              <h1 className={styles.formTitle}>{t("dream.title")}</h1>
              <p className={styles.formSubtitle}>{t("dream.subtitle")}</p>
            </div>

            {/* Progress Indicator */}
            <div className={styles.progressContainer}>
              <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>입력 완성도</span>
                <span className={styles.progressPercent}>{Math.round(progress)}%</span>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
              <div className={styles.progressSteps}>
                <span className={`${styles.progressStep} ${selectedSymbols.length > 0 ? styles.progressStepActive : ''}`}>심볼</span>
                <span className={`${styles.progressStep} ${selectedEmotions.length > 0 ? styles.progressStepActive : ''}`}>감정</span>
                <span className={`${styles.progressStep} ${selectedThemes.length > 0 ? styles.progressStepActive : ''}`}>테마</span>
                <span className={`${styles.progressStep} ${additionalDetails.trim() ? styles.progressStepActive : ''}`}>상세</span>
              </div>
            </div>

            {/* Toolbar Row */}
            <div className={styles.toolbarRow}>
              {/* Voice Input Button */}
              {voice.isSupported && (
                <button
                  type="button"
                  className={`${styles.voiceButton} ${voice.isListening ? styles.voiceButtonActive : ''}`}
                  onClick={voice.isListening ? voice.stopListening : voice.startListening}
                >
                  {voice.isListening ? (
                    <>
                      <div className={styles.voiceWave}>
                        <span /><span /><span /><span />
                      </div>
                      녹음 중...
                    </>
                  ) : (
                    <>
                      <span className={styles.voiceIcon}>🎤</span>
                      음성 입력
                    </>
                  )}
                </button>
              )}

              {/* Auto-save indicator */}
              {autoSaved && (
                <div className={styles.autoSaveIndicator}>
                  <span>✓</span> 자동 저장됨
                </div>
              )}
            </div>

            {/* Voice Panel (when listening) */}
            {voice.isListening && (
              <div className={styles.voicePanel}>
                <div className={styles.voicePanelTitle}>
                  <div className={styles.voiceWave}>
                    <span /><span /><span /><span />
                  </div>
                  듣고 있어요...
                </div>
                <div className={styles.voiceTranscript}>
                  {voice.transcript || '말씀해 주세요...'}
                </div>
                <div className={styles.voiceControls}>
                  <button type="button" className={`${styles.voiceControlBtn} ${styles.voiceStopBtn}`} onClick={voice.stopListening}>
                    중지
                  </button>
                  {voice.transcript && (
                    <button type="button" className={`${styles.voiceControlBtn} ${styles.voiceUseBtn}`} onClick={useVoiceTranscript}>
                      사용하기
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Recent Dreams */}
            {recentDreams.length > 0 && (
              <>
                <button
                  type="button"
                  className={styles.recentDreamsToggle}
                  onClick={() => setShowRecentDreams(!showRecentDreams)}
                >
                  <span>📚</span>
                  <span>최근 꿈 기록 ({recentDreams.length})</span>
                  <span style={{ marginLeft: 'auto' }}>{showRecentDreams ? '▼' : '▶'}</span>
                </button>

                {showRecentDreams && (
                  <div className={styles.recentDreamsList}>
                    {recentDreams.map(dream => (
                      <div
                        key={dream.id}
                        className={styles.recentDreamItem}
                        onClick={() => loadRecentDream(dream)}
                      >
                        <span className={styles.recentDreamIcon}>🌙</span>
                        <div className={styles.recentDreamContent}>
                          <div className={styles.recentDreamTitle}>{dream.preview || '꿈 기록'}</div>
                          <div className={styles.recentDreamDate}>{dream.date}</div>
                        </div>
                        <button
                          type="button"
                          className={styles.recentDreamDelete}
                          onClick={(e) => deleteRecentDream(dream.id, e)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <form onSubmit={handleSubmit}>
              {/* Mode Toggle */}
              <div className={styles.modeToggle}>
                <button
                  type="button"
                  className={!useDetailedMode ? styles.modeActive : styles.modeInactive}
                  onClick={() => setUseDetailedMode(false)}
                >
                  {t("dream.modeQuick")}
                </button>
                <button
                  type="button"
                  className={useDetailedMode ? styles.modeActive : styles.modeInactive}
                  onClick={() => setUseDetailedMode(true)}
                >
                  {t("dream.modeWrite")}
                </button>
              </div>

              {!useDetailedMode ? (
                <>
                  {/* Dream Symbols - Quick Select */}
                  <div className={styles.section}>
                    <label className={styles.sectionLabel}>{t("dream.sectionSymbols")}</label>
                    <p className={styles.sectionHint}>Select what you saw in your dream</p>

                    {/* Selected Symbols Bar (Drag & Drop) */}
                    {selectedSymbols.length > 0 && (
                      <div className={`${styles.selectedBar} ${draggedSymbol ? styles.selectedBarActive : ''}`}>
                        {selectedSymbols.map(symbol => {
                          const symbolData = Object.values(DREAM_SYMBOLS).flat().find(s => s.en === symbol);
                          return (
                            <div
                              key={symbol}
                              className={`${styles.selectedChip} ${draggedSymbol === symbol ? styles.selectedChipDragging : ''}`}
                              draggable
                              onDragStart={() => handleDragStart(symbol)}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, symbol)}
                            >
                              {symbolData?.emoji} {symbolData?.ko || symbol}
                              <button
                                type="button"
                                className={styles.selectedChipRemove}
                                onClick={() => toggleSymbol(symbol)}
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Search Bar */}
                    <div className={styles.searchContainer}>
                      <span className={styles.searchIcon}>🔍</span>
                      <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="심볼 검색... (예: 뱀, 물, 비행)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          className={styles.searchClear}
                          onClick={() => setSearchQuery('')}
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Smart Recommendations */}
                    {recommendations.length > 0 && (
                      <div className={styles.recommendationsContainer}>
                        <div className={styles.recommendationsTitle}>
                          <span>💡</span> 관련 심볼 추천
                        </div>
                        <div className={styles.recommendationsGrid}>
                          {recommendations.map(rec => (
                            <button
                              key={rec}
                              type="button"
                              className={styles.recommendChip}
                              onClick={() => {
                                const symbolData = Object.values(DREAM_SYMBOLS).flat().find(
                                  s => s.en.toLowerCase() === rec.toLowerCase()
                                );
                                if (symbolData) toggleSymbol(symbolData.en);
                              }}
                            >
                              + {rec}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Symbol Category Tabs */}
                    <div className={styles.categoryTabs}>
                      {(Object.keys(DREAM_SYMBOLS) as Array<keyof typeof DREAM_SYMBOLS>).map((category) => (
                        <button
                          key={category}
                          type="button"
                          className={activeSymbolCategory === category ? styles.tabActive : styles.tab}
                          onClick={() => setActiveSymbolCategory(category)}
                        >
                          {category}
                        </button>
                      ))}
                    </div>

                    {/* Filtered Symbols with Tooltips */}
                    <div className={styles.chipGrid}>
                      {filteredSymbols.length > 0 ? (
                        filteredSymbols.map((symbol) => {
                          const tooltip = getTooltip(symbol.en);
                          return (
                            <div key={symbol.en} className={tooltip ? styles.chipWithTooltip : ''}>
                              <button
                                type="button"
                                className={selectedSymbols.includes(symbol.en) ? styles.chipSelected : styles.chip}
                                onClick={() => toggleSymbol(symbol.en)}
                              >
                                {symbol.emoji} {symbol.ko}
                              </button>
                              {tooltip && <div className={styles.tooltip}>{tooltip}</div>}
                            </div>
                          );
                        })
                      ) : (
                        <div className={styles.noResults}>검색 결과가 없습니다</div>
                      )}
                    </div>
                  </div>

                  {/* Dream Emotions */}
                  <div className={styles.section}>
                    <label className={styles.sectionLabel}>{t("dream.sectionEmotions")}</label>
                    <p className={styles.sectionHint}>How did the dream make you feel?</p>
                    <div className={styles.chipGrid}>
                      {DREAM_EMOTIONS.map((emotion) => (
                        <button
                          key={emotion.en}
                          type="button"
                          className={selectedEmotions.includes(emotion.en) ? styles.chipSelected : styles.chip}
                          onClick={() => toggleEmotion(emotion.en)}
                        >
                          {emotion.emoji} {emotion.ko}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dream Themes */}
                  <div className={styles.section}>
                    <label className={styles.sectionLabel}>{t("dream.sectionTypes")}</label>
                    <p className={styles.sectionHint}>What kind of dream was it?</p>
                    <div className={styles.chipGrid}>
                      {DREAM_THEMES.map((theme) => (
                        <button
                          key={theme.en}
                          type="button"
                          className={selectedThemes.includes(theme.ko) ? styles.chipSelected : styles.chip}
                          onClick={() => toggleTheme(theme.ko)}
                        >
                          {theme.ko}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dream Context */}
                  <div className={styles.section}>
                    <label className={styles.sectionLabel}>{t("dream.sectionContext")}</label>
                    <p className={styles.sectionHint}>When did you have this dream?</p>
                    <div className={styles.chipGrid}>
                      {DREAM_CONTEXT.map((ctx) => (
                        <button
                          key={ctx.en}
                          type="button"
                          className={selectedContext.includes(ctx.ko) ? styles.chipSelected : styles.chip}
                          onClick={() => toggleContext(ctx.ko)}
                        >
                          {ctx.ko}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Korean Dream Traditions (Collapsible) */}
                  <div className={styles.collapsibleSection}>
                    <button
                      type="button"
                      className={styles.collapsibleToggle}
                      onClick={() => setShowCulturalSymbols(!showCulturalSymbols)}
                    >
                      {showCulturalSymbols ? '▼' : '▶'} 한국 전통 해몽 (선택)
                    </button>

                    {showCulturalSymbols && (
                      <div className={styles.culturalSection}>
                        {/* Korean Traditional */}
                        <div className={styles.section}>
                          <label className={styles.sectionLabel}>🇰🇷 꿈의 종류</label>
                          <div className={styles.chipGrid}>
                            {KOREAN_DREAM_TYPES.map((type) => (
                              <button
                                key={type.en}
                                type="button"
                                className={selectedKoreanTypes.includes(type.ko) ? styles.chipSelected : styles.chip}
                                onClick={() => toggleKoreanType(type.ko)}
                              >
                                {type.emoji} {type.ko}
                              </button>
                            ))}
                          </div>
                          <p className={styles.sectionHint}>길몽 상징</p>
                          <div className={styles.chipGrid}>
                            {KOREAN_LUCKY_SYMBOLS.map((symbol) => (
                              <button
                                key={symbol.en}
                                type="button"
                                className={selectedKoreanLucky.includes(symbol.ko) ? styles.chipSelected : styles.chip}
                                onClick={() => toggleKoreanLucky(symbol.ko)}
                              >
                                {symbol.emoji} {symbol.ko}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Additional Details */}
                  <div className={styles.section}>
                    <label htmlFor="additionalDetails" className={styles.sectionLabel}>
                      {t("dream.labelAdditional")}
                    </label>
                    <textarea
                      id="additionalDetails"
                      placeholder={t("dream.placeholderAdditional")}
                      value={additionalDetails}
                      onChange={(e) => setAdditionalDetails(e.target.value)}
                      className={styles.textareaSmall}
                      rows={3}
                    />
                  </div>

                  {/* Selection Preview */}
                  {previewText && (
                    <div className={styles.previewContainer}>
                      <div className={styles.previewHeader}>
                        <span className={styles.previewTitle}>
                          <span>👁️</span> 분석될 내용 미리보기
                        </span>
                      </div>
                      <div className={styles.previewText}>{previewText}</div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Detailed Dream Input */}
                  <div className={styles.section}>
                    <label htmlFor="detailedDream" className={styles.label}>
                      {t("dream.labelDetailed")}
                    </label>
                    <textarea
                      id="detailedDream"
                      placeholder={t("dream.placeholderDetailed")}
                      value={detailedDream}
                      onChange={(e) => setDetailedDream(e.target.value)}
                      className={styles.textarea}
                      rows={8}
                    />
                  </div>
                </>
              )}

              {/* Share Checkbox */}
              <div className={styles.checkbox}>
                <input
                  id="share"
                  type="checkbox"
                  checked={share}
                  onChange={(e) => setShare(e.target.checked)}
                />
                <label htmlFor="share">{t("dream.shareAnonymous")}</label>
              </div>

              {/* Birth Data (Collapsible) */}
              <div className={styles.collapsibleSection}>
                <button
                  type="button"
                  className={styles.collapsibleToggle}
                  onClick={() => setShowBirthData(!showBirthData)}
                >
                  {showBirthData ? '▼' : '▶'} {t("dream.birthOptional")}
                </button>

                {showBirthData && (
                  <div className={styles.birthDataSection}>
                    <div className={`${styles.grid} ${styles.gridTwo}`}>
                      <div>
                        <label htmlFor="date" className={styles.label}>{t("app.birthDate")}</label>
                        <input
                          id="date"
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className={styles.input}
                        />
                      </div>
                      <div>
                        <label htmlFor="time" className={styles.label}>{t("app.birthTime")}</label>
                        <input
                          id="time"
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className={styles.input}
                        />
                      </div>
                    </div>

                    <div className={styles.relative}>
                      <label htmlFor="city" className={styles.label}>{t("app.birthCity")}</label>
                      <input
                        id="city"
                        autoComplete="off"
                        value={cityQuery}
                        onChange={(e) => setCityQuery(e.target.value)}
                        onFocus={() => setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                        placeholder='e.g., "Seoul, KR"'
                        className={styles.input}
                      />
                      {showDropdown && suggestions.length > 0 && (
                        <ul className={styles.dropdown}>
                          {suggestions.map((s, i) => (
                            <li
                              key={`${s.country}-${s.name}-${i}`}
                              className={styles.dropdownItem}
                              onMouseDown={(e) => { e.preventDefault(); onPickCity(s); }}
                            >
                              {s.name}, {s.country}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className={styles.inputSmall}>Timezone auto-detected from city.</p>
                    </div>

                    <input type="hidden" name="latitude" value={latitude} />
                    <input type="hidden" name="longitude" value={longitude} />

                    <div>
                      <label htmlFor="timeZone" className={styles.label}>{t("ui.timeZone")}</label>
                      <input
                        id="timeZone"
                        readOnly
                        value={timeZone}
                        className={styles.input}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className={styles.submitButton}
              >
                <span className={styles.buttonGlow} />
                {isLoading ? (
                  <>
                    <svg className={styles.spinner} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a 8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t("dream.buttonAnalyzing")}
                  </>
                ) : (
                  t("dream.buttonAnalyze")
                )}
              </button>

              {error && <div className={styles.error}>{error}</div>}
            </form>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className={styles.resultsContainer}>
            <button
              onClick={resetForm}
              className={styles.resetButton}
            >
              ← {t("dream.buttonReset")}
            </button>

            {/* 클라우드 저장 알림 */}
            {result.saved && (
              <div className={styles.savedNotification}>
                <span>☁️</span> 꿈 해석이 클라우드에 저장되었습니다
              </div>
            )}

            {result.summary && (
              <div className={`${styles.resultCard} ${styles.fadeIn}`} style={{ animationDelay: '0s' }}>
                <div className={styles.resultCardGlow} />
                <h2 className={styles.resultTitle}>{t("dream.resultSummary")}</h2>
                <p className={styles.resultText}>{result.summary}</p>
              </div>
            )}

            {/* Celestial Context Section - Moon Phase & Transits */}
            {result.celestial && (
              <div className={`${styles.resultCard} ${styles.celestialCard} ${styles.fadeIn}`} style={{ animationDelay: '0.05s' }}>
                <div className={styles.resultCardGlow} />
                <h3 className={styles.resultTitle}>🌙 천체 영향 분석</h3>

                {/* Moon Phase */}
                <div className={styles.moonPhaseSection}>
                  <div className={styles.moonPhaseHeader}>
                    <span className={styles.moonEmoji}>{result.celestial.moon_phase?.emoji || '🌙'}</span>
                    <div className={styles.moonPhaseInfo}>
                      <span className={styles.moonPhaseName}>
                        {result.celestial.moon_phase?.korean || result.celestial.moon_phase?.name}
                      </span>
                      <span className={styles.moonIllumination}>
                        밝기 {result.celestial.moon_phase?.illumination}% · 달령 {result.celestial.moon_phase?.age_days}일
                      </span>
                    </div>
                    {result.celestial.moon_phase?.weight_modifier && result.celestial.moon_phase.weight_modifier > 1 && (
                      <span className={styles.intensityBadge}>
                        ✨ 강화 x{result.celestial.moon_phase.weight_modifier}
                      </span>
                    )}
                  </div>

                  {result.celestial.moon_phase?.dream_quality && (
                    <div className={styles.dreamQuality}>
                      <span className={styles.qualityLabel}>꿈의 성질:</span>
                      <span className={styles.qualityValue}>{result.celestial.moon_phase.dream_quality}</span>
                    </div>
                  )}

                  {result.celestial.moon_phase?.dream_meaning && (
                    <p className={styles.moonMeaning}>{result.celestial.moon_phase.dream_meaning}</p>
                  )}

                  {result.celestial.moon_phase?.enhanced_themes && result.celestial.moon_phase.enhanced_themes.length > 0 && (
                    <div className={styles.enhancedThemes}>
                      <span className={styles.themesLabel}>강화된 테마:</span>
                      <div className={styles.themeTags}>
                        {result.celestial.moon_phase.enhanced_themes.map((theme, i) => (
                          <span key={i} className={styles.themeTag}>{theme}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.celestial.moon_phase?.advice && (
                    <div className={styles.moonAdvice}>
                      <span className={styles.adviceIcon}>💡</span>
                      <p>{result.celestial.moon_phase.advice}</p>
                    </div>
                  )}
                </div>

                {/* Moon Sign */}
                {result.celestial.moon_sign?.sign && (
                  <div className={styles.moonSignSection}>
                    <div className={styles.moonSignHeader}>
                      <span className={styles.signIcon}>⭐</span>
                      <span className={styles.signName}>
                        달의 별자리: {result.celestial.moon_sign.korean || result.celestial.moon_sign.sign}
                      </span>
                    </div>
                    {result.celestial.moon_sign.dream_flavor && (
                      <p className={styles.signFlavor}>꿈의 맛: {result.celestial.moon_sign.dream_flavor}</p>
                    )}
                    {result.celestial.moon_sign.enhanced_symbols && result.celestial.moon_sign.enhanced_symbols.length > 0 && (
                      <div className={styles.enhancedSymbols}>
                        <span>강화된 심볼:</span>
                        {result.celestial.moon_sign.enhanced_symbols.map((sym, i) => (
                          <span key={i} className={styles.symbolTag}>{sym}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Retrograde Planets */}
                {result.celestial.retrogrades && result.celestial.retrogrades.length > 0 && (
                  <div className={styles.retrogradeSection}>
                    <div className={styles.retrogradeHeader}>
                      <span className={styles.retroIcon}>↺</span>
                      <span>역행 행성 영향</span>
                    </div>
                    {result.celestial.retrogrades.map((retro, i) => (
                      <div key={i} className={styles.retrogradeItem}>
                        <span className={styles.retroPlanet}>
                          {retro.emoji} {retro.korean || retro.planet}
                        </span>
                        {retro.themes && retro.themes.length > 0 && (
                          <div className={styles.retroThemes}>
                            {retro.themes.map((theme, j) => (
                              <span key={j} className={styles.retroTheme}>{theme}</span>
                            ))}
                          </div>
                        )}
                        {retro.interpretation && (
                          <p className={styles.retroInterpretation}>{retro.interpretation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Significant Aspects */}
                {result.celestial.significant_aspects && result.celestial.significant_aspects.length > 0 && (
                  <div className={styles.aspectsSection}>
                    <div className={styles.aspectsHeader}>
                      <span className={styles.aspectIcon}>✧</span>
                      <span>주요 행성 배치</span>
                    </div>
                    {result.celestial.significant_aspects.map((asp, i) => (
                      <div key={i} className={styles.aspectItem}>
                        <span className={styles.aspectName}>{asp.aspect}</span>
                        {asp.themes && asp.themes.length > 0 && (
                          <div className={styles.aspectThemes}>
                            {asp.themes.map((theme, j) => (
                              <span key={j} className={styles.aspectTheme}>{theme}</span>
                            ))}
                          </div>
                        )}
                        {asp.special_note && (
                          <p className={styles.aspectNote}>📌 {asp.special_note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Planet Positions */}
                {result.celestial.planets && result.celestial.planets.length > 0 && (
                  <div className={styles.planetsSection}>
                    <details className={styles.planetsDetails}>
                      <summary className={styles.planetsSummary}>🪐 현재 행성 위치 보기</summary>
                      <div className={styles.planetsList}>
                        {result.celestial.planets.map((planet, i) => (
                          <div key={i} className={styles.planetItem}>
                            <span className={styles.planetName}>{planet.name_ko || planet.name}</span>
                            <span className={styles.planetSign}>{planet.sign_ko || planet.sign}</span>
                            {planet.retrograde && <span className={styles.retroBadge}>℞</span>}
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            )}

            {Array.isArray(result.themes) && result.themes.length > 0 && (
              <div className={`${styles.resultCard} ${styles.fadeIn}`} style={{ animationDelay: '0.1s' }}>
                <div className={styles.resultCardGlow} />
                <h3 className={styles.resultTitle}>{t("dream.resultThemes")}</h3>
                <div>
                  {result.themes.map((t, idx) => (
                    <div key={idx} className={styles.themeBar}>
                      <div className={styles.themeLabel}>
                        <span>{t.label}</span>
                        <span className={styles.themePercent}>{Math.round(t.weight * 100)}%</span>
                      </div>
                      <div className={styles.themeBarContainer}>
                        <div
                          className={styles.themeBarFill}
                          style={{
                            width: `${Math.min(100, Math.max(0, t.weight * 100))}%`,
                            animationDelay: `${0.2 + idx * 0.1}s`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(result.dreamSymbols) && result.dreamSymbols.length > 0 && (
              <div className={`${styles.resultCard} ${styles.fadeIn}`} style={{ animationDelay: '0.2s' }}>
                <div className={styles.resultCardGlow} />
                <h3 className={styles.resultTitle}>{t("dream.resultSymbols")}</h3>
                <ul className={styles.resultList}>
                  {result.dreamSymbols.map((s, i) => (
                    <li key={i}>
                      <span style={{ fontWeight: 600 }}>{s.label}:</span> {s.meaning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.astrology && (
              <div className={`${styles.resultCard} ${styles.fadeIn}`} style={{ animationDelay: '0.3s' }}>
                <div className={styles.resultCardGlow} />
                <h3 className={styles.resultTitle}>{t("dream.resultAstrology")}</h3>
                <ul className={styles.resultList}>
                  {result.astrology.sun && <li>Sun: {result.astrology.sun}</li>}
                  {result.astrology.moon && <li>Moon: {result.astrology.moon}</li>}
                  {result.astrology.asc && <li>Ascendant: {result.astrology.asc}</li>}
                  {Array.isArray(result.astrology.highlights) &&
                    result.astrology.highlights.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </div>
            )}

            {Array.isArray(result.crossInsights) && result.crossInsights.length > 0 && (
              <div className={`${styles.resultCard} ${styles.fadeIn}`} style={{ animationDelay: '0.4s' }}>
                <div className={styles.resultCardGlow} />
                <h3 className={styles.resultTitle}>{t("dream.resultInsights")}</h3>
                <ul className={styles.resultList}>
                  {result.crossInsights.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}

            {Array.isArray(result.recommendations) && result.recommendations.length > 0 && (
              <div className={`${styles.resultCard} ${styles.fadeIn}`} style={{ animationDelay: '0.5s' }}>
                <div className={styles.resultCardGlow} />
                <h3 className={styles.resultTitle}>{t("dream.resultRecommendations")}</h3>
                <ol className={styles.resultListOrdered}>
                  {result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ol>
              </div>
            )}

            {/* Korean Cultural Notes Section */}
            {result.culturalNotes?.korean && (
              <div className={`${styles.resultCard} ${styles.fadeIn}`} style={{ animationDelay: '0.6s' }}>
                <div className={styles.resultCardGlow} />
                <h3 className={styles.resultTitle}>🇰🇷 한국 전통 해몽</h3>
                <div className={styles.culturalNotesGrid}>
                  <div className={styles.culturalNote}>
                    <span className={styles.culturalFlag}>🇰🇷</span>
                    <div>
                      <strong>한국 해몽</strong>
                      <p>{result.culturalNotes.korean}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Lucky Elements Section */}
            {result.luckyElements && (result.luckyElements.isLucky || result.luckyElements.luckyNumbers?.length || result.luckyElements.advice) && (
              <div className={`${styles.resultCard} ${styles.luckyCard} ${styles.fadeIn}`} style={{ animationDelay: '0.7s' }}>
                <div className={styles.resultCardGlow} />
                <h3 className={styles.resultTitle}>🍀 {t("dream.resultLucky") || "Lucky Elements"}</h3>
                <div className={styles.luckyContent}>
                  {result.luckyElements.isLucky && (
                    <div className={styles.luckyBadge}>
                      ✨ 길몽 (Auspicious Dream) ✨
                    </div>
                  )}
                  {result.luckyElements.luckyNumbers && result.luckyElements.luckyNumbers.length > 0 && (
                    <div className={styles.luckyNumbers}>
                      <strong>🎱 Lucky Numbers:</strong>
                      <div className={styles.numberBalls}>
                        {result.luckyElements.luckyNumbers.map((num, i) => (
                          <span key={i} className={styles.numberBall}>{num}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.luckyElements.luckyColors && result.luckyElements.luckyColors.length > 0 && (
                    <div className={styles.luckyColors}>
                      <strong>🎨 Lucky Colors:</strong>
                      <div className={styles.colorTags}>
                        {result.luckyElements.luckyColors.map((color, i) => (
                          <span key={i} className={styles.colorTag}>{color}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.luckyElements.advice && (
                    <div className={styles.luckyAdvice}>
                      <strong>💡 Advice:</strong>
                      <p>{result.luckyElements.advice}</p>
                    </div>
                  )}
                  {result.luckyElements.elementAnalysis && (
                    <div className={styles.elementAnalysis}>
                      <strong>☯️ 오행 분석:</strong>
                      <p>{result.luckyElements.elementAnalysis}</p>
                      {result.luckyElements.confidence !== undefined && (
                        <div className={styles.confidenceBar}>
                          <div
                            className={styles.confidenceFill}
                            style={{ width: `${result.luckyElements.confidence * 100}%` }}
                          />
                          <span>신뢰도: {Math.round(result.luckyElements.confidence * 100)}%</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Symbol Combinations Section */}
            {result.premiumFeatures?.combinations && result.premiumFeatures.combinations.length > 0 && (
              <div className={`${styles.resultCard} ${styles.combinationCard} ${styles.fadeIn}`} style={{ animationDelay: '0.8s' }}>
                <div className={styles.resultCardGlow} />
                <h3 className={styles.resultTitle}>🔮 심볼 조합 분석</h3>
                <div className={styles.combinationList}>
                  {result.premiumFeatures.combinations.map((combo, i) => (
                    <div key={i} className={`${styles.combinationItem} ${combo.is_lucky ? styles.luckyCombo : styles.warningCombo}`}>
                      <div className={styles.comboHeader}>
                        <span className={styles.comboSymbols}>{combo.combination}</span>
                        <span className={styles.comboScore}>
                          {combo.is_lucky ? '🍀' : '⚠️'} {combo.lucky_score}점
                        </span>
                      </div>
                      <div className={styles.comboMeaning}>{combo.meaning}</div>
                      <p className={styles.comboInterpretation}>{combo.interpretation}</p>
                      <span className={styles.fortuneType}>{combo.fortune_type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Taemong (Conception Dream) Section */}
            {result.premiumFeatures?.taemong && result.premiumFeatures.taemong.is_taemong && (
              <div className={`${styles.resultCard} ${styles.taemongCard} ${styles.fadeIn}`} style={{ animationDelay: '0.9s' }}>
                <div className={styles.resultCardGlow} />
                <h3 className={styles.resultTitle}>👶 태몽 분석</h3>
                {result.premiumFeatures.taemong.primary_symbol && (
                  <div className={styles.taemongPrimary}>
                    <div className={styles.taemongSymbol}>
                      <span className={styles.symbolName}>{result.premiumFeatures.taemong.primary_symbol.symbol}</span>
                      <span className={styles.luckyScore}>
                        ⭐ {result.premiumFeatures.taemong.primary_symbol.lucky_score}점
                      </span>
                    </div>
                    <div className={styles.taemongDetails}>
                      <div className={styles.taemongTrait}>
                        <strong>예상 특성:</strong> {result.premiumFeatures.taemong.primary_symbol.child_trait}
                      </div>
                      <div className={styles.taemongGender}>
                        <strong>성별 암시:</strong> {result.premiumFeatures.taemong.primary_symbol.gender_hint}
                      </div>
                      <p className={styles.taemongInterp}>{result.premiumFeatures.taemong.primary_symbol.interpretation}</p>
                      {result.premiumFeatures.taemong.primary_symbol.celebrity_examples.length > 0 && (
                        <div className={styles.celebrityExamples}>
                          <strong>유명 직업군:</strong> {result.premiumFeatures.taemong.primary_symbol.celebrity_examples.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {result.premiumFeatures.taemong.symbols.length > 1 && (
                  <div className={styles.taemongOthers}>
                    <strong>기타 태몽 심볼:</strong>
                    <div className={styles.taemongSymbolList}>
                      {result.premiumFeatures.taemong.symbols.slice(1).map((sym, i) => (
                        <span key={i} className={styles.taemongTag}>
                          {sym.symbol} ({sym.gender_hint})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </ServicePageLayout>
  );
}

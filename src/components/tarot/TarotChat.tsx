"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import Link from "next/link";
import styles from "./TarotChat.module.css";
import { Spread, DrawnCard } from "@/lib/Tarot/tarot.types";
import { apiFetch } from "@/lib/api";
import { tarotCounselors } from "@/lib/Tarot/tarot-counselors";
import CreditBadge from "@/components/ui/CreditBadge";
import { logger } from "@/lib/logger";

// Pre-compiled regex patterns for topic detection (performance optimization)
const TOPIC_PATTERNS = {
  love: /연애|사랑|이별|짝사랑|결혼|연인|데이트|소개팅|love|relationship|dating|marriage|crush|ex/i,
  career: /취업|이직|직장|회사|업무|승진|면접|사업|창업|job|career|work|business|promotion|interview/i,
  money: /돈|재정|투자|주식|재물|월급|빚|대출|money|finance|invest|wealth|salary/i,
  health: /건강|다이어트|운동|병|치료|스트레스|health|diet|exercise|stress/i,
  study: /공부|시험|합격|학업|자격증|study|exam|test|school|university/i,
  family: /가족|부모|자녀|형제|집안|family|parents|children/i,
  decision: /선택|결정|고민|어떻게|해야|decision|choice|should|choose/i,
} as const;

// Pre-compiled regex patterns for contextual question generation
const CONTEXT_PATTERNS = {
  love: /연애|사랑|관계|감정|연인|love|relationship/i,
  career: /직장|커리어|일|사업|job|career|work/i,
  change: /변화|전환|바꾸|change|transform/i,
  choice: /선택|결정|decision|choice/i,
  timing: /시기|타이밍|언제|when|timing/i,
  warning: /주의|조심|경고|warning|caution/i,
} as const;

// Import extracted constants and utilities
import {
  I18N,
  LOADING_MESSAGES,
  SPREAD_QUESTIONS,
  CATEGORY_QUESTIONS,
  generateDynamicQuestions,
} from "./data";
import type { LangKey } from "./data";

// Development-only logging
const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args: unknown[]) => isDev && logger.debug('[TarotChat]', ...args);
const devWarn = (...args: unknown[]) => isDev && logger.warn('[TarotChat]', ...args);
const devError = (...args: unknown[]) => logger.error('[TarotChat]', ...args); // Always log errors
// Note: All question constants (SPREAD_QUESTIONS, CATEGORY_QUESTIONS, CARD_SPECIFIC_QUESTIONS,
// COMBINATION_QUESTIONS, SUIT_QUESTIONS, etc.) and generateDynamicQuestions function
// have been moved to ./data/ directory for better code organization
interface CardInsight {
  position: string;
  card_name: string;
  is_reversed: boolean;
  interpretation: string;
}

interface InterpretationResult {
  overall_message: string;
  card_insights: CardInsight[];
  guidance: string;
  affirmation: string;
}

interface ReadingResponse {
  category: string;
  spread: Spread;
  drawnCards: DrawnCard[];
}

type Message = { role: "user" | "assistant"; content: string };

// Memoized Message Component for performance
const MessageRow = React.memo(({
  message,
  index,
  language: _language,
  styles
}: {
  message: Message;
  index: number;
  language: LangKey;
  styles: Record<string, string>;
}) => {
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

MessageRow.displayName = "MessageRow";

type PersistedCard = {
  position?: string;
  name: string;
  is_reversed?: boolean;
  meaning?: string;
  keywords?: string[];
};

type PersistedContext = {
  spread_title?: string;
  category?: string;
  cards?: PersistedCard[];
  overall_message?: string;
  guidance?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

interface TarotChatProps {
  readingResult: ReadingResponse;
  interpretation: InterpretationResult | null;
  categoryName: string;
  spreadId: string;
  language: LangKey;
  counselorId?: string;
  counselorStyle?: string;
  userTopic?: string;
}

const TarotChat = memo(function TarotChat({
  readingResult,
  interpretation,
  categoryName,
  spreadId,
  language = "ko",
  counselorId,
  counselorStyle,
  userTopic
}: TarotChatProps) {
  const tr = I18N[language] || I18N.ko;
  const loadingMessages = LOADING_MESSAGES[language] || LOADING_MESSAGES.ko;
  const sessionKeyRef = useRef<string>(`tarot-chat:${categoryName}:${spreadId}`);
  const messagesStorageKey = `${sessionKeyRef.current}:messages`;

  // Load messages from localStorage on mount
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(messagesStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [usedFallback, setUsedFallback] = useState(false);
  const [persistedContext, setPersistedContext] = useState<PersistedContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [usedQuestionIndices, setUsedQuestionIndices] = useState<Set<number>>(new Set());
  const loadingMessageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showCardsModal, setShowCardsModal] = useState(false);

  // 타로집 스타일: 질문마다 카드 뽑기 설정 (reserved for future use)
  const [_cardCountForQuestion, _setCardCountForQuestion] = useState<1 | 3 | 5>(1);
  const [_newlyDrawnCards, _setNewlyDrawnCards] = useState<DrawnCard[]>([]);
  const [_showNewCards, _setShowNewCards] = useState(false);
  const [_isDrawingCards, _setIsDrawingCards] = useState(false);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      try {
        localStorage.setItem(messagesStorageKey, JSON.stringify(messages));
      } catch (e) {
        devError('Failed to save messages:', e);
      }
    }
  }, [messages, messagesStorageKey]);

  // Show counselor greeting on first load
  useEffect(() => {
    if (messages.length === 0 && counselorId) {
      const counselor = tarotCounselors.find(c => c.id === counselorId);
      if (counselor) {
        const greetingText = language === 'ko' ? counselor.greetingKo : counselor.greeting;
        setMessages([{
          role: "assistant",
          content: greetingText
        }]);
      }
    }
  }, []); // Only run once on mount

  // Generate dynamic questions based on actual drawn cards (만프로 Premium)
  const dynamicQuestions = generateDynamicQuestions(readingResult.drawnCards, language);

  // Generate topic-based questions from userTopic (uses pre-compiled TOPIC_PATTERNS)
  const generateTopicBasedQuestions = useCallback((): string[] => {
    if (!userTopic || userTopic.trim().length === 0) return [];

    const topic = userTopic.toLowerCase();
    const topicQuestions: string[] = [];

    // Detect topic themes using pre-compiled patterns
    const isLove = TOPIC_PATTERNS.love.test(topic);
    const isCareer = TOPIC_PATTERNS.career.test(topic);
    const isMoney = TOPIC_PATTERNS.money.test(topic);
    const isHealth = TOPIC_PATTERNS.health.test(topic);
    const isStudy = TOPIC_PATTERNS.study.test(topic);
    const isFamily = TOPIC_PATTERNS.family.test(topic);
    const isDecision = TOPIC_PATTERNS.decision.test(topic);

    if (language === 'ko') {
      // Add the user's original topic as a question prefix
      if (userTopic.length < 50) {
        topicQuestions.push(`"${userTopic}"에 대해 카드가 알려주는 조언은?`);
      }

      if (isLove) {
        topicQuestions.push("이 연애 고민에서 상대방의 마음은 어떤가요?");
        topicQuestions.push("이 관계의 미래는 어떻게 될까요?");
      }
      if (isCareer) {
        topicQuestions.push("이 커리어 결정에서 가장 중요하게 봐야 할 점은?");
        topicQuestions.push("직장에서의 전망은 어떤가요?");
      }
      if (isMoney) {
        topicQuestions.push("재정 상황이 언제쯤 나아질까요?");
        topicQuestions.push("금전적으로 주의해야 할 점은?");
      }
      if (isHealth) {
        topicQuestions.push("건강을 위해 특별히 신경 써야 할 부분은?");
      }
      if (isStudy) {
        topicQuestions.push("시험/공부 운이 어떤가요?");
        topicQuestions.push("학업에서 집중해야 할 방향은?");
      }
      if (isFamily) {
        topicQuestions.push("가족 관계를 개선하려면 어떻게 해야 할까요?");
      }
      if (isDecision) {
        topicQuestions.push("이 선택에서 어떤 방향이 더 좋을까요?");
        topicQuestions.push("결정을 내리기 전에 고려해야 할 점은?");
      }

      // Generic topic-related questions
      if (topicQuestions.length < 2) {
        topicQuestions.push("이 상황에서 가장 주의해야 할 점은?");
        topicQuestions.push("이 문제 해결을 위한 구체적인 조언은?");
      }
    } else {
      if (userTopic.length < 50) {
        topicQuestions.push(`What do the cards advise about "${userTopic}"?`);
      }

      if (isLove) {
        topicQuestions.push("What are their true feelings about this?");
        topicQuestions.push("What is the future of this relationship?");
      }
      if (isCareer) {
        topicQuestions.push("What's most important for this career decision?");
        topicQuestions.push("What does my professional future look like?");
      }
      if (isMoney) {
        topicQuestions.push("When will my financial situation improve?");
        topicQuestions.push("What financial pitfalls should I avoid?");
      }
      if (isHealth) {
        topicQuestions.push("What health aspects need special attention?");
      }
      if (isStudy) {
        topicQuestions.push("How are my study/exam prospects?");
      }
      if (isFamily) {
        topicQuestions.push("How can I improve family relationships?");
      }
      if (isDecision) {
        topicQuestions.push("Which direction is better for this choice?");
        topicQuestions.push("What should I consider before deciding?");
      }

      if (topicQuestions.length < 2) {
        topicQuestions.push("What should I watch out for in this situation?");
        topicQuestions.push("What's the specific advice for this issue?");
      }
    }

    return topicQuestions;
  }, [userTopic, language]);

  const topicQuestions = useMemo(() => generateTopicBasedQuestions(), [generateTopicBasedQuestions]);

  // Priority: dynamic card-based > spreadId > categoryName > default
  // Merge dynamic questions with spread questions for comprehensive suggestions
  const spreadQuestions = useMemo(() =>
    SPREAD_QUESTIONS[spreadId]?.[language] ||
    CATEGORY_QUESTIONS[categoryName]?.[language] ||
    CATEGORY_QUESTIONS.default[language],
    [spreadId, categoryName, language]
  );

  // 울트라 프리미엄 Combination: topic-specific > card-specific > spread context
  // Prioritize user's topic-related questions at the top
  const allSuggestedQuestions = useMemo(() => [
    ...topicQuestions.slice(0, 3),       // Top 3 topic-specific questions (highest priority)
    ...dynamicQuestions.slice(0, 4),     // Top 4 card-specific questions
    ...spreadQuestions.slice(0, 3)       // Top 3 spread-specific questions
  ].slice(0, 10), [topicQuestions, dynamicQuestions, spreadQuestions]); // Max 10 total for ultra premium experience

  // Generate contextual follow-up questions based on the last assistant response (uses pre-compiled CONTEXT_PATTERNS)
  const generateContextualQuestions = useCallback((lastResponse: string): string[] => {
    if (!lastResponse) return [];

    const contextualQuestions: string[] = [];
    const cards = readingResult.drawnCards;

    // Extract key themes from the response using pre-compiled patterns
    const hasLove = CONTEXT_PATTERNS.love.test(lastResponse);
    const hasCareer = CONTEXT_PATTERNS.career.test(lastResponse);
    const hasChange = CONTEXT_PATTERNS.change.test(lastResponse);
    const hasChoice = CONTEXT_PATTERNS.choice.test(lastResponse);
    const hasTiming = CONTEXT_PATTERNS.timing.test(lastResponse);
    const hasWarning = CONTEXT_PATTERNS.warning.test(lastResponse);

    if (language === 'ko') {
      if (hasChoice) {
        contextualQuestions.push("어떤 선택이 더 나은 결과를 가져올까요?");
        contextualQuestions.push("결정을 내릴 때 가장 중요하게 봐야 할 점은?");
      }
      if (hasTiming) {
        contextualQuestions.push("구체적으로 언제쯤 행동하는 게 좋을까요?");
        contextualQuestions.push("이 시기가 지나면 어떻게 될까요?");
      }
      if (hasLove) {
        contextualQuestions.push("상대방은 어떻게 생각하고 있을까요?");
        contextualQuestions.push("관계를 발전시키려면 무엇이 필요한가요?");
      }
      if (hasCareer) {
        contextualQuestions.push("현재 직장에서 더 성장할 수 있을까요?");
        contextualQuestions.push("커리어 전환의 적기는 언제인가요?");
      }
      if (hasChange) {
        contextualQuestions.push("변화에 대비해 지금 준비해야 할 것은?");
        contextualQuestions.push("변화를 받아들이기 위한 마음가짐은?");
      }
      if (hasWarning) {
        contextualQuestions.push("구체적으로 어떤 점을 조심해야 하나요?");
        contextualQuestions.push("이 위험을 피하려면 어떻게 해야 할까요?");
      }

      // Card-specific questions based on what was mentioned
      if (cards.length > 1) {
        contextualQuestions.push(`${cards[0].card.nameKo || cards[0].card.name} 카드를 더 자세히 알고 싶어요`);
        contextualQuestions.push("카드들의 조합이 가진 특별한 의미가 있나요?");
      }
    } else {
      if (hasChoice) {
        contextualQuestions.push("Which choice leads to a better outcome?");
        contextualQuestions.push("What's most important to consider when deciding?");
      }
      if (hasTiming) {
        contextualQuestions.push("When exactly should I take action?");
        contextualQuestions.push("What happens after this period passes?");
      }
      if (hasLove) {
        contextualQuestions.push("What are they thinking/feeling?");
        contextualQuestions.push("What's needed to develop this relationship?");
      }
      if (hasCareer) {
        contextualQuestions.push("Can I grow more at my current job?");
        contextualQuestions.push("When is the right time for a career change?");
      }
      if (hasChange) {
        contextualQuestions.push("What should I prepare for this change?");
        contextualQuestions.push("How should I embrace this transformation?");
      }
      if (hasWarning) {
        contextualQuestions.push("What specifically should I be careful about?");
        contextualQuestions.push("How can I avoid this risk?");
      }

      if (cards.length > 1) {
        contextualQuestions.push(`Tell me more about the ${cards[0].card.name} card`);
        contextualQuestions.push("Is there special meaning in this card combination?");
      }
    }

    return contextualQuestions;
  }, [readingResult.drawnCards, language]);

  // Get next 2 questions - prioritize contextual questions from last response
  const getNextSuggestions = useCallback((): string[] => {
    const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();

    if (lastAssistantMessage) {
      const contextual = generateContextualQuestions(lastAssistantMessage.content);
      if (contextual.length > 0) {
        // Mix contextual with unused general questions
        const available = allSuggestedQuestions.filter((_, idx) => !usedQuestionIndices.has(idx));
        const mixed = [...contextual.slice(0, 2), ...available.slice(0, 1)];
        return mixed.slice(0, 2);
      }
    }

    // Fallback to general questions
    const available = allSuggestedQuestions.filter((_, idx) => !usedQuestionIndices.has(idx));
    return available.slice(0, 2);
  }, [messages, generateContextualQuestions, allSuggestedQuestions, usedQuestionIndices]);

  // Check if last message is from assistant (for showing suggestions after response)
  const lastMessage = messages[messages.length - 1];
  const showSuggestionsAfterResponse = lastMessage?.role === 'assistant' && !loading;

  const isInitialMount = useRef(true);
  useEffect(() => {
    // Skip auto-scroll - let user control their own scroll position
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
    // Removed auto-scroll to prevent screen jumping during streaming
  }, [messages]);

  // Persist context for reuse within session
  useEffect(() => {
    try {
      const ctx = buildContext();
      sessionStorage.setItem(sessionKeyRef.current, JSON.stringify(ctx));
    } catch {
      // ignore storage errors
    }
  }, [readingResult, interpretation, categoryName, spreadId]);

  // Load persisted context (if exists) to keep conversations anchored
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(sessionKeyRef.current);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (isRecord(parsed) && Array.isArray(parsed.cards) && parsed.cards.length > 0) {
          setPersistedContext(parsed as PersistedContext);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const buildContext = useCallback(() => {
    const cards = readingResult.drawnCards.map((dc, idx) => ({
      position: readingResult.spread.positions[idx]?.title || `Card ${idx + 1}`,
      name: dc.card.name,
      is_reversed: dc.isReversed, // snake_case for backend compatibility
      meaning: dc.isReversed ? dc.card.reversed.meaning : dc.card.upright.meaning,
      keywords: dc.isReversed
        ? (dc.card.reversed.keywordsKo || dc.card.reversed.keywords)
        : (dc.card.upright.keywordsKo || dc.card.upright.keywords)
    }));

    const base: PersistedContext = {
      spread_title: readingResult.spread.title,
      category: categoryName,
      cards,
      overall_message: interpretation?.overall_message || "",
      guidance: interpretation?.guidance || ""
    };

    // If we have a persisted context with cards, merge to keep continuity
    const persistedCards = persistedContext?.cards;
    if (persistedCards && persistedCards.length) {
      const merged = [...persistedCards];
      for (const c of cards) {
        const dup = merged.find(
          (p) =>
            p.name === c.name &&
            (p.position === c.position || !p.position || !c.position)
        );
        if (!dup) merged.push(c);
      }
      return { ...base, cards: merged };
    }

    return base;
  }, [readingResult, interpretation, categoryName, persistedContext]);

  // Start rotating loading messages
  const startLoadingMessages = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * loadingMessages.length);
    setLoadingMessage(loadingMessages[randomIndex]);

    loadingMessageIntervalRef.current = setInterval(() => {
      const newIndex = Math.floor(Math.random() * loadingMessages.length);
      setLoadingMessage(loadingMessages[newIndex]);
    }, 3000);
  }, [loadingMessages]);

  // Stop rotating loading messages
  const stopLoadingMessages = useCallback(() => {
    if (loadingMessageIntervalRef.current) {
      clearInterval(loadingMessageIntervalRef.current);
      loadingMessageIntervalRef.current = null;
    }
    setLoadingMessage("");
  }, []);

  const handleSend = React.useCallback(async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;
    setUsedFallback(false);

    // Track used suggestion if it was from suggestions
    const suggestionIndex = allSuggestedQuestions.indexOf(messageText);
    if (suggestionIndex !== -1) {
      setUsedQuestionIndices(prev => new Set([...prev, suggestionIndex]));
    }

    const nextMessages: Message[] = [...messages, { role: "user", content: messageText }];
    setLoading(true);
    setMessages(nextMessages);
    setInput("");
    setStreamingContent("");
    startLoadingMessages();

    // Log counselor info for debugging
    devLog('[TarotChat] Sending request with counselor:', counselorId, 'style:', counselorStyle);

    try {
      // Step 1: Draw a new card for this question (타로집 스타일)
      let newDrawnCard = null;
      try {
        const drawResponse = await apiFetch("/api/tarot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId: categoryName,
            spreadId: "quick-reading", // 1장 뽑기
            cardCount: 1,
            userTopic: messageText
          })
        });
        if (drawResponse.ok) {
          const drawData = await drawResponse.json();
          if (drawData.drawnCards && drawData.drawnCards.length > 0) {
            newDrawnCard = drawData.drawnCards[0];
            devLog('[TarotChat] Drew new card for question:', newDrawnCard.card.name);
          }
        }
      } catch (drawErr) {
        devWarn('[TarotChat] Failed to draw new card, using existing context:', drawErr);
      }

      // Build context with new card added to cards array (backend processes cards array)
      const baseContext = buildContext();
      const contextWithNewCard = newDrawnCard ? {
        ...baseContext,
        cards: [
          // Add new card at the beginning with "이번 질문" position
          {
            position: language === 'ko' ? '이번 질문에 대한 카드' : 'Card for this question',
            name: language === 'ko' ? (newDrawnCard.card.nameKo || newDrawnCard.card.name) : newDrawnCard.card.name,
            is_reversed: newDrawnCard.isReversed,
            meaning: newDrawnCard.isReversed
              ? (language === 'ko' ? newDrawnCard.card.reversed.meaningKo || newDrawnCard.card.reversed.meaning : newDrawnCard.card.reversed.meaning)
              : (language === 'ko' ? newDrawnCard.card.upright.meaningKo || newDrawnCard.card.upright.meaning : newDrawnCard.card.upright.meaning),
            keywords: newDrawnCard.isReversed
              ? (language === 'ko' ? newDrawnCard.card.reversed.keywordsKo || newDrawnCard.card.reversed.keywords : newDrawnCard.card.reversed.keywords)
              : (language === 'ko' ? newDrawnCard.card.upright.keywordsKo || newDrawnCard.card.upright.keywords : newDrawnCard.card.upright.keywords)
          },
          // Keep original cards as reference context
          ...(baseContext.cards || [])
        ]
      } : baseContext;

      // Step 2: Try streaming endpoint with the new card context
      const response = await apiFetch("/api/tarot/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          context: contextWithNewCard,
          language,
          counselor_id: counselorId,
          counselor_style: counselorStyle
        })
      });

      if (!response.ok) {
        throw new Error(`Stream failed: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (response.headers.get("x-fallback") === "1") {
        setUsedFallback(true);
      }

      if (contentType?.includes("text/event-stream") && response.body) {
        // Handle SSE streaming
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = "";

        // Stop loading messages once streaming starts
        stopLoadingMessages();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  accumulatedContent += data.content;
                  setStreamingContent(accumulatedContent);
                }
                if (data.done) {
                  // Streaming complete - message will be added after loop
                  setStreamingContent("");
                }
                if (data.error) {
                  throw new Error(data.error);
                }
              } catch {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }

        // If no done signal received, still add the message
        if (accumulatedContent && !messages.find(m => m.content === accumulatedContent)) {
          setMessages(prev => {
            // Check if last message is already this content
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last?.content === accumulatedContent) {
              return prev;
            }
            return [...prev, { role: "assistant", content: accumulatedContent }];
          });
          setStreamingContent("");
        }
      } else {
        // Fallback to JSON response
        stopLoadingMessages();
        const data = await response.json();
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.reply || tr.error
        }]);
      }
    } catch (error) {
      devError("[TarotChat] Streaming error, falling back:", error);
      stopLoadingMessages();

      // Fallback to non-streaming endpoint
      try {
        const fallbackResponse = await apiFetch("/api/tarot/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages,
            context: buildContext(),
            language,
            counselor_id: counselorId,
            counselor_style: counselorStyle
          })
        });

        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          setUsedFallback(true);
          setMessages(prev => [...prev, {
            role: "assistant",
            content: data.reply || tr.error
          }]);
        } else {
          throw new Error("Fallback also failed");
        }
      } catch (fallbackError) {
        devError("[TarotChat] Fallback error:", fallbackError);
        setUsedFallback(true);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: tr.error
        }]);
      }
    } finally {
      setLoading(false);
      stopLoadingMessages();
      setStreamingContent("");
    }
  }, [input, loading, messages, buildContext, language, counselorId, counselorStyle, tr.error, allSuggestedQuestions, startLoadingMessages, stopLoadingMessages, categoryName]);

  const onKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className={styles.chatContainer}>
      {/* Header with Credit Badge and Home Button */}
      <div className={styles.chatHeader}>
        <CreditBadge variant="compact" />
        <Link href="/" className={styles.homeButton} aria-label="Home">
          <span className={styles.homeIcon}>🏠</span>
          <span className={styles.homeLabel}>{language === 'ko' ? '홈' : 'Home'}</span>
        </Link>
      </div>

      {/* Messages Panel */}
      <div className={styles.messagesPanel}>
        <button
          className={styles.cardContextButton}
          onClick={() => setShowCardsModal(true)}
        >
          <span className={styles.cardContextIcon}>🃏</span>
          <span className={styles.cardContextText}>
            {language === 'ko' ? `뽑은 카드 ${readingResult.drawnCards.length}장 보기` : `View ${readingResult.drawnCards.length} cards`}
          </span>
          <span className={styles.cardContextArrow}>▼</span>
        </button>

        {/* Cards Modal */}
        {showCardsModal && (
          <div className={styles.modalBackdrop} onClick={() => setShowCardsModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>{tr.cardContextTitle}</h3>
                <button
                  className={styles.modalCloseBtn}
                  onClick={() => setShowCardsModal(false)}
                >
                  ×
                </button>
              </div>
              <div className={styles.modalCardGrid}>
                {readingResult.drawnCards.map((dc, idx) => {
                  const pos = language === 'ko'
                    ? (readingResult.spread.positions[idx]?.titleKo || readingResult.spread.positions[idx]?.title || `카드 ${idx + 1}`)
                    : (readingResult.spread.positions[idx]?.title || `Card ${idx + 1}`);
                  const orient = dc.isReversed ? (language === "ko" ? "역위" : "reversed") : (language === "ko" ? "정위" : "upright");
                  const keywords = dc.isReversed ? (dc.card.reversed.keywordsKo || dc.card.reversed.keywords) : (dc.card.upright.keywordsKo || dc.card.upright.keywords);
                  // Use AI interpretation if available, otherwise fall back to default meaning
                  const aiInterpretation = interpretation?.card_insights?.[idx]?.interpretation;
                  const defaultMeaning = dc.isReversed ? (dc.card.reversed.meaningKo || dc.card.reversed.meaning) : (dc.card.upright.meaningKo || dc.card.upright.meaning);
                  const meaning = aiInterpretation || defaultMeaning;
                  return (
                    <div key={idx} className={styles.modalCardItem}>
                      <div className={styles.modalCardLeft}>
                        <div className={styles.modalCardImageWrapper}>
                          <img
                            src={dc.card.image}
                            alt={dc.card.name}
                            className={`${styles.modalCardImage} ${dc.isReversed ? styles.reversed : ''}`}
                          />
                          {dc.isReversed && (
                            <div className={styles.reversedBadge}>
                              {language === 'ko' ? '역위' : 'Reversed'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={styles.modalCardRight}>
                        <div className={styles.modalCardHeader}>
                          <span className={styles.modalCardNumber}>{idx + 1}</span>
                          <span className={styles.modalCardPosition}>{pos}</span>
                        </div>
                        <div className={styles.modalCardName}>{language === 'ko' ? dc.card.nameKo : dc.card.name}</div>
                        <div className={styles.modalCardOrient}>{orient}</div>
                        {keywords && keywords.length > 0 && (
                          <div className={styles.modalCardKeywords}>
                            {keywords.slice(0, 5).map((kw, i) => (
                              <span key={i} className={styles.modalKeywordTag}>{kw}</span>
                            ))}
                          </div>
                        )}
                        <div className={styles.modalCardMeaning}>{meaning}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {messages.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔮</div>
            <p className={styles.emptyText}>{tr.empty}</p>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageRow
            key={i}
            message={m}
            index={i}
            language={language}
            styles={styles}
          />
        ))}

        {/* Streaming content - show as it arrives */}
        {streamingContent && (
          <div className={`${styles.messageRow} ${styles.assistantRow}`}>
            <div className={styles.avatar}>
              <span className={styles.avatarIcon}>🔮</span>
            </div>
            <div className={styles.messageBubble}>
              <div className={styles.assistantMessage}>
                {streamingContent}
                <span className={styles.streamingCursor}>▊</span>
              </div>
            </div>
          </div>
        )}

        {/* Loading state - show fun messages before streaming starts */}
        {loading && !streamingContent && (
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
                <span className={styles.thinkingText}>{loadingMessage || tr.thinking}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {usedFallback && (
        <div className={styles.fallbackNote}>
          {tr.fallbackNote}
        </div>
      )}

      {/* Suggested Questions (after assistant response) */}
      {showSuggestionsAfterResponse && getNextSuggestions().length > 0 && (
        <div className={styles.suggestedSection}>
          <h4 className={styles.suggestedTitle}>{tr.suggestedQuestions}</h4>
          <div className={styles.suggestedGrid}>
            {getNextSuggestions().map((q: string, idx: number) => (
              <button
                key={idx}
                className={styles.suggestedButton}
                onClick={() => handleSend(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className={styles.inputArea}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={tr.placeholder}
          rows={2}
          className={styles.textarea}
          disabled={loading}
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className={styles.sendButton}
        >
          {tr.send}
        </button>
      </div>
    </div>
  );
});

export default TarotChat;

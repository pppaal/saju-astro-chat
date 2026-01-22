"use client";

/**
 * TarotChat - Refactored main component
 *
 * This file has been refactored to use extracted:
 * - Types (types/)
 * - Utilities (utils/)
 * - Hooks (hooks/)
 * - Components (components/)
 *
 * Original: 908 lines → Refactored: ~200 lines
 */

import React, { useState, useRef, useEffect, memo } from "react";
import styles from "./TarotChat.module.css";
import { tarotCounselors } from "@/lib/Tarot/tarot-counselors";

// Import extracted modules
import { I18N, LOADING_MESSAGES } from "./data";
import type { TarotChatProps } from "./types";
import {
  useMessages,
  useLoadingMessages,
  useTarotChatInput,
  usePersistentContext,
  useQuestionEngine,
  useTarotStreaming
} from "./hooks";
import {
  MessageBubble,
  CardsModal,
  SuggestedQuestions,
  ChatInput,
  LoadingIndicator,
  StreamingMessage,
  ChatHeader
} from "./components";

/**
 * TarotChat Component
 *
 * Main chat interface for tarot readings with:
 * - Message persistence
 * - Streaming responses
 * - Contextual question suggestions
 * - Card drawing per question
 */
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

  // Session and storage keys
  const sessionKeyRef = useRef<string>(`tarot-chat:${categoryName}:${spreadId}`);
  const messagesStorageKey = `${sessionKeyRef.current}:messages`;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // State
  const [showCardsModal, setShowCardsModal] = useState(false);

  // Custom hooks
  const [messages, setMessages] = useMessages(messagesStorageKey);
  const { loadingMessage, startLoadingMessages, stopLoadingMessages } = useLoadingMessages(loadingMessages);
  const { buildContext } = usePersistentContext(
    sessionKeyRef.current,
    readingResult,
    interpretation,
    categoryName,
    language
  );
  const { getNextSuggestions, markQuestionUsed } = useQuestionEngine(
    readingResult,
    categoryName,
    spreadId,
    userTopic,
    language,
    messages
  );
  const { loading, streamingContent, usedFallback, handleSend } = useTarotStreaming({
    messages,
    setMessages,
    buildContext,
    language,
    categoryName,
    counselorId,
    counselorStyle,
    errorMessage: tr.error,
    onLoadingStart: startLoadingMessages,
    onLoadingStop: stopLoadingMessages
  });

  // Handle send with question tracking
  const onSend = React.useCallback(async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    // Track used suggestion
    markQuestionUsed(messageText);

    // Clear input and send
    setInput("");
    await handleSend(messageText);
  }, [loading, markQuestionUsed, handleSend]);

  const { input, setInput, onKeyDown } = useTarotChatInput(() => onSend());

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

  // Skip auto-scroll on initial mount
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, [messages]);

  // Check if last message is from assistant (for showing suggestions)
  const lastMessage = messages[messages.length - 1];
  const showSuggestionsAfterResponse = lastMessage?.role === 'assistant' && !loading;

  return (
    <div className={styles.chatContainer}>
      {/* Header with Credit Badge and Home Button */}
      <ChatHeader language={language} styles={styles} />

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
        <CardsModal
          show={showCardsModal}
          onClose={() => setShowCardsModal(false)}
          readingResult={readingResult}
          interpretation={interpretation}
          language={language}
          tr={tr}
          styles={styles}
        />

        {/* Empty State */}
        {messages.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔮</div>
            <p className={styles.emptyText}>{tr.empty}</p>
          </div>
        )}

        {/* Message List */}
        {messages.map((m, i) => (
          <MessageBubble
            key={i}
            message={m}
            index={i}
            language={language}
            styles={styles}
          />
        ))}

        {/* Streaming content */}
        <StreamingMessage content={streamingContent} styles={styles} />

        {/* Loading state */}
        {loading && !streamingContent && (
          <LoadingIndicator message={loadingMessage} tr={tr} styles={styles} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Fallback Note */}
      {usedFallback && (
        <div className={styles.fallbackNote}>
          {tr.fallbackNote}
        </div>
      )}

      {/* Suggested Questions */}
      {showSuggestionsAfterResponse && (
        <SuggestedQuestions
          questions={getNextSuggestions()}
          onQuestionClick={(q) => onSend(q)}
          tr={tr}
          styles={styles}
        />
      )}

      {/* Input Area */}
      <ChatInput
        value={input}
        onChange={setInput}
        onKeyDown={onKeyDown}
        onSend={() => onSend()}
        disabled={loading}
        tr={tr}
        styles={styles}
      />
    </div>
  );
});

export default TarotChat;

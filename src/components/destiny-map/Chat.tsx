// src/components/destiny-map/Chat.tsx
// Refactored: decomposed into hooks (useFileUpload, useChatApi) and sub-components (MessagesPanel, ChatInputArea)

"use client";

import React, { memo } from "react";
import styles from "./Chat.module.css";
import InlineTarotModal, { type TarotResultSummary } from "./InlineTarotModal";
import { logger } from "@/lib/logger";

// Extracted modules
import { CHAT_I18N } from "./chat-i18n";
import { CHAT_TIMINGS } from "./chat-constants";
import {
  generateMessageId,
  buildReturningSummary,
} from "./chat-utils";
import { getSuggestedQuestions } from "./chat-followups";
import type { ChatProps } from "./chat-types";

// Extracted hooks
import { useChatSession } from "./hooks/useChatSession";
import { useChatFeedback } from "./hooks/useChatFeedback";
import { useFileUpload } from "./hooks/useFileUpload";
import { useChatApi } from "./hooks/useChatApi";

// Extracted components
import { CrisisModal, HistoryModal } from "./modals";
import { MessagesPanel, ChatInputArea } from "./chat-panels";

const Chat = memo(function Chat({
  profile,
  initialContext = "",
  lang = "ko",
  theme = "focus_career",
  seedEvent = "chat:seed",
  saju,
  astro,
  advancedAstro,
  predictionContext,
  userContext,
  chatSessionId,
  onSaveMessage,
  autoScroll = true,
  ragSessionId,
  autoSendSeed = false,
}: ChatProps) {
  const effectiveLang = lang === "ko" ? "ko" : "en";
  const tr = CHAT_I18N[effectiveLang];

  // Session management hook
  const {
    sessionIdRef,
    messages,
    setMessages,
    sessionLoaded,
    sessionHistory,
    historyLoading,
    deleteConfirmId,
    setDeleteConfirmId,
    loadSessionHistory,
    loadSession,
    deleteSession,
    startNewChat: hookStartNewChat,
  } = useChatSession({ theme, lang, initialContext, saju, astro });

  // Local UI state
  const [input, setInput] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);
  const [showTarotPrompt, setShowTarotPrompt] = React.useState(false);
  const [showTarotModal, setShowTarotModal] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(true);
  const [showWelcomeBack, setShowWelcomeBack] = React.useState(false);
  const [showHistoryModal, setShowHistoryModal] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const seedSentRef = React.useRef(false);
  const welcomeShownRef = React.useRef(false);

  // File upload hook
  const {
    cvText,
    cvName,
    parsingPdf,
    handleFileUpload,
  } = useFileUpload({ lang, setNotice });

  // Chat API hook
  const {
    loading,
    retryCount,
    connectionStatus,
    usedFallback,
    followUpQuestions,
    setFollowUpQuestions,
    handleSend: apiHandleSend,
    showCrisisModal,
    setShowCrisisModal,
  } = useChatApi({
    sessionIdRef,
    messages,
    setMessages,
    profile,
    theme,
    lang,
    saju,
    astro,
    advancedAstro,
    predictionContext,
    userContext,
    cvText,
    ragSessionId,
    autoScroll,
    messagesEndRef,
    onSaveMessage,
    setNotice,
  });

  // Feedback hook
  const { feedback, handleFeedback } = useChatFeedback({
    sessionId: sessionIdRef.current,
    theme,
    lang,
    messages,
  });

  // Wrapper: handleSend bridges input state with the hook
  const handleSend = React.useCallback(async (directText?: string) => {
    const text = directText || input.trim();
    if (!text) {return;}
    setInput("");
    setShowSuggestions(false);
    await apiHandleSend(text);
  }, [input, apiHandleSend]);

  // Handle follow-up question click - uses ref to avoid stale closure
  const handleSendRef = React.useRef<(text?: string) => Promise<void>>(null!);
  handleSendRef.current = handleSend;

  const handleFollowUp = React.useCallback((question: string) => {
    setFollowUpQuestions([]);
    setInput("");
    handleSendRef.current(question);
  }, [setFollowUpQuestions]);

  // Handle suggested question click
  const handleSuggestion = React.useCallback((question: string) => {
    setInput(question);
    setShowSuggestions(false);
  }, []);

  // Auto-save messages to database
  React.useEffect(() => {
    if (!sessionLoaded) {return;}
    if (messages.length === 0) {return;}

    const saveTimer = setTimeout(async () => {
      try {
        await fetch("/api/counselor/session/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            theme: theme || "chat",
            locale: lang || "ko",
            messages: messages.filter(m => m.role !== "system"),
          }),
        });
        logger.debug("[Chat] Session auto-saved:", { messageCount: messages.length });
      } catch (e) {
        logger.warn("[Chat] Failed to save session:", e);
      }
    }, CHAT_TIMINGS.DEBOUNCE_SAVE);

    return () => clearTimeout(saveTimer);
  }, [messages, sessionLoaded, theme, lang]);

  // Auto-update PersonaMemory after conversation (when assistant responds)
  const lastUpdateRef = React.useRef<number>(0);
  React.useEffect(() => {
    if (!sessionLoaded) {return;}
    const visibleMsgs = messages.filter(m => m.role !== "system");
    if (visibleMsgs.length < 2) {return;}

    const now = Date.now();
    if (now - lastUpdateRef.current < 30000) {return;}

    const lastMsg = visibleMsgs[visibleMsgs.length - 1];
    if (lastMsg?.role !== "assistant" || !lastMsg.content || lastMsg.content.length < 50) {return;}

    lastUpdateRef.current = now;

    fetch("/api/persona-memory/update-from-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionIdRef.current,
        theme: theme || "chat",
        locale: lang || "ko",
        messages: visibleMsgs,
        saju: saju || undefined,
        astro: astro || undefined,
      }),
    })
      .then(res => {
        if (res.ok) {
          logger.debug("[Chat] PersonaMemory auto-updated");
        }
      })
      .catch(e => {
        logger.warn("[Chat] Failed to update PersonaMemory:", e);
      });
  }, [messages, sessionLoaded, theme, lang, saju, astro]);

  // Show welcome back message for returning users
  React.useEffect(() => {
    const sessionCount = userContext?.persona?.sessionCount;
    if (sessionCount && sessionCount > 1 && !welcomeShownRef.current) {
      welcomeShownRef.current = true;
      setShowWelcomeBack(true);
      const timer = setTimeout(() => setShowWelcomeBack(false), CHAT_TIMINGS.WELCOME_BANNER_DURATION);
      return () => clearTimeout(timer);
    }
  }, [userContext?.persona?.sessionCount]);

  // Build returning user context summary
  const returningSummary = React.useMemo(() => {
    return buildReturningSummary(userContext?.persona, lang);
  }, [userContext?.persona, lang]);

  // Auto-insert returning context as system message
  React.useEffect(() => {
    if (!returningSummary) {return;}
    const alreadyHas = messages.some((m) => m.role === "system" && m.content.includes("Returning context"));
    if (alreadyHas) {return;}
    setMessages((prev) => [
      { role: "system", content: `Returning context: ${returningSummary}` },
      ...prev,
    ]);
  }, [returningSummary, messages]);

  // Show tarot prompt after 2+ assistant responses
  React.useEffect(() => {
    const assistantMessages = messages.filter((m) => m.role === "assistant");
    if (assistantMessages.length >= 2 && !showTarotPrompt) {
      setShowTarotPrompt(true);
    }
  }, [messages, showTarotPrompt]);

  // Seed event listener
  React.useEffect(() => {
    const onSeed = (e: CustomEvent<string>) => {
      if (e?.detail && typeof e.detail === "string") {
        setInput(e.detail);
        if (autoSendSeed && !seedSentRef.current) {
          seedSentRef.current = true;
          handleSend(e.detail);
        }
      }
    };
    window.addEventListener(seedEvent, onSeed as EventListener);
    return () => window.removeEventListener(seedEvent, onSeed as EventListener);
  }, [seedEvent, autoSendSeed]);

  // Auto-scroll
  React.useEffect(() => {
    if (!autoScroll) {return;}
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, autoScroll]);

  const goToTarot = React.useCallback(() => setShowTarotModal(true), []);

  // Handle tarot result from InlineTarotModal
  const handleTarotComplete = (result: TarotResultSummary) => {
    const cardsSummary = result.cards
      .map((c) => `\u2022 ${c.position}: ${c.name}${c.isReversed ? " (\uC5ED\uBC29\uD5A5)" : ""}`)
      .join("\n");

    const tarotMessage = `\uD83C\uDCCF **\uD0C0\uB85C \uB9AC\uB529 \uACB0\uACFC** - ${result.spreadTitle}

**\uC9C8\uBB38:** ${result.question}

**\uBF51\uC740 \uCE74\uB4DC:**
${cardsSummary}

**\uC804\uCCB4 \uBA54\uC2DC\uC9C0:**
${result.overallMessage}${result.guidance ? `\n\n**\uC870\uC5B8:** ${result.guidance}` : ""}${result.affirmation ? `\n\n**\uD655\uC5B8:** _${result.affirmation}_` : ""}`;

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: tarotMessage,
        id: generateMessageId("assistant"),
      },
    ]);
  };

  // Format relative date
  const formatRelativeDate = React.useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {return tr.today;}
    if (diffDays === 1) {return tr.yesterday;}
    return `${diffDays} ${tr.daysAgo}`;
  }, [tr.today, tr.yesterday, tr.daysAgo]);

  // Open history modal
  const openHistoryModal = () => {
    setShowHistoryModal(true);
    loadSessionHistory();
  };

  // Load session and close modal
  const handleLoadSession = async (sessionId: string) => {
    await loadSession(sessionId);
    setShowHistoryModal(false);
  };

  // Start new chat (reset UI state)
  const startNewChat = () => {
    hookStartNewChat();
    setShowHistoryModal(false);
    setFollowUpQuestions([]);
    setShowSuggestions(true);
  };

  const extractConcernFromMessages = React.useCallback(() => {
    const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content);
    return userMessages.slice(-2).join(" ").slice(0, 200);
  }, [messages]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const visibleMessages = messages.filter((m) => m.role !== "system");
  const suggestedQs = getSuggestedQuestions(theme, lang);

  return (
    <div className={styles.chatContainer}>
      {/* Connection Status Indicator */}
      {connectionStatus !== "online" && (
        <div className={`${styles.connectionStatus} ${styles[connectionStatus]}`}>
          {connectionStatus === "slow" && "\uD83D\uDC0C Slow connection detected"}
          {connectionStatus === "offline" && "\uD83D\uDCE1 Connection lost - Check your internet"}
        </div>
      )}

      {/* Crisis Support Modal */}
      <CrisisModal
        isOpen={showCrisisModal}
        onClose={() => setShowCrisisModal(false)}
        tr={tr}
        styles={styles}
      />

      {/* Session History Modal */}
      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        sessions={sessionHistory}
        loading={historyLoading}
        deleteConfirmId={deleteConfirmId}
        onLoadSession={handleLoadSession}
        onDeleteSession={deleteSession}
        onDeleteConfirm={setDeleteConfirmId}
        onNewChat={startNewChat}
        formatRelativeDate={formatRelativeDate}
        tr={tr}
        styles={styles}
      />

      {/* Welcome Back Banner */}
      {showWelcomeBack && (
        <div className={styles.welcomeBackBanner}>
          <span>{"\uD83D\uDC4B"}</span>
          <span>{tr.welcomeBack}</span>
        </div>
      )}

      {/* Session Management Buttons */}
      <div className={styles.sessionButtons}>
        <button
          type="button"
          className={styles.sessionBtn}
          onClick={startNewChat}
          title={tr.newChat}
        >
          {"\u2728"} {tr.newChat}
        </button>
        <button
          type="button"
          className={styles.sessionBtn}
          onClick={openHistoryModal}
          title={tr.previousChats}
        >
          {"\uD83D\uDCDC"} {tr.previousChats}
        </button>
      </div>

      {/* Messages Panel */}
      <MessagesPanel
        visibleMessages={visibleMessages}
        loading={loading}
        retryCount={retryCount}
        notice={notice}
        showSuggestions={showSuggestions}
        suggestedQs={suggestedQs}
        followUpQuestions={followUpQuestions}
        showTarotPrompt={showTarotPrompt}
        feedback={feedback}
        effectiveLang={effectiveLang}
        tr={tr}
        messagesEndRef={messagesEndRef}
        onSuggestion={handleSuggestion}
        onFeedback={handleFeedback}
        onFollowUp={handleFollowUp}
        onGoToTarot={goToTarot}
        styles={styles}
      />

      {/* Input Area */}
      <ChatInputArea
        input={input}
        loading={loading}
        cvName={cvName}
        parsingPdf={parsingPdf}
        usedFallback={usedFallback}
        tr={tr}
        onInputChange={setInput}
        onKeyDown={onKeyDown}
        onSend={() => handleSend()}
        onFileUpload={handleFileUpload}
        styles={styles}
      />

      {/* Inline Tarot Modal */}
      <InlineTarotModal
        isOpen={showTarotModal}
        onClose={() => setShowTarotModal(false)}
        onComplete={handleTarotComplete}
        lang={lang}
        profile={profile}
        initialConcern={extractConcernFromMessages()}
        theme={theme}
      />
    </div>
  );
});

export default Chat;

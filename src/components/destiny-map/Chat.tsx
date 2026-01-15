// src/components/destiny-map/Chat.tsx
// Refactored: extracted i18n, constants, utils, types to separate files

"use client";

import React from "react";
import styles from "./Chat.module.css";
import InlineTarotModal, { type TarotResultSummary } from "./InlineTarotModal";
import { logger } from "@/lib/logger";

// Extracted modules
import { CHAT_I18N, detectCrisis, type LangKey } from "./chat-i18n";
import {
  CHAT_TIMINGS,
  CHAT_LIMITS,
  type Message,
  type FeedbackType,
  type ConnectionStatus,
  type UserContext,
} from "./chat-constants";
import {
  generateSessionId,
  generateMessageId,
  getConnectionStatus,
  getErrorMessage,
  buildReturningSummary,
  streamProcessor,
} from "./chat-utils";
import {
  generateFollowUpQuestions,
  getSuggestedQuestions,
} from "./chat-followups";
import type {
  ChatProps,
  ChatPayload,
  PDFTextItem,
} from "./chat-types";
import MarkdownMessage from "@/components/ui/MarkdownMessage";

// PDF parsing utility
async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  logger.info("[PDF] Loaded:", { fileName: file.name, pages: pdf.numPages });

  let fullText = "";
  let totalItems = 0;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    totalItems += content.items.length;
    const pageText = content.items
      .map((item) => (item as PDFTextItem).str)
      .filter((str: string) => str.trim().length > 0)
      .join(" ");
    fullText += pageText + "\n";
    logger.debug(`[PDF] Page ${i}: ${content.items.length} items, ${pageText.length} chars`);
  }

  logger.info("[PDF] Total items:", { totalItems, totalChars: fullText.length });

  if (fullText.trim().length === 0 && totalItems === 0) {
    throw new Error("SCANNED_PDF");
  }

  return fullText.trim();
}

// Props type for MessageRow
interface MessageRowProps {
  message: Message;
  index: number;
  feedback: Record<string, FeedbackType>;
  lang: string;
  onFeedback: (id: string, type: FeedbackType) => void;
  styles: Record<string, string>;
}

// Memoized Message Component for performance
const MessageRow = React.memo(function MessageRow({
  message,
  index,
  feedback,
  lang,
  onFeedback,
  styles: s
}: MessageRowProps) {
  const isAssistant = message.role === "assistant";
  const rowClass = `${s.messageRow} ${isAssistant ? s.assistantRow : s.userRow}`;
  const messageClass = isAssistant ? s.assistantMessage : s.userMessage;
  const hasFeedback = isAssistant && message.content && message.id;

  return (
    <div
      key={message.id || index}
      className={rowClass}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {isAssistant && <div className={s.counselorAvatar} />}
      <div className={s.messageBubble}>
        <div className={messageClass}>
          {isAssistant ? (
            <MarkdownMessage content={message.content} />
          ) : (
            message.content
          )}
        </div>

        {hasFeedback && (
          <div className={s.feedbackButtons}>
            <button
              type="button"
              className={`${s.feedbackBtn} ${feedback[message.id!] === "up" ? s.feedbackActive : ""}`}
              onClick={() => onFeedback(message.id!, "up")}
              title={lang === "ko" ? "도움이 됐어요" : "Helpful"}
            >
              👍
            </button>
            <button
              type="button"
              className={`${s.feedbackBtn} ${feedback[message.id!] === "down" ? s.feedbackActive : ""}`}
              onClick={() => onFeedback(message.id!, "down")}
              title={lang === "ko" ? "아쉬워요" : "Not helpful"}
            >
              👎
            </button>
          </div>
        )}
      </div>
      {!isAssistant && (
        <div className={s.avatar}>
          <span className={s.avatarIcon}>👤</span>
        </div>
      )}
    </div>
  );
});

export default function Chat({
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
  const sessionIdRef = React.useRef<string>(generateSessionId());

  // State
  const [messages, setMessages] = React.useState<Message[]>(
    initialContext ? [{ role: "system", content: initialContext }] : []
  );
  const [sessionLoaded, setSessionLoaded] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [cvText, setCvText] = React.useState("");
  const [cvName, setCvName] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);
  const [usedFallback, setUsedFallback] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);
  const [connectionStatus, setConnectionStatus] = React.useState<ConnectionStatus>("online");
  const [parsingPdf, setParsingPdf] = React.useState(false);
  const [showTarotPrompt, setShowTarotPrompt] = React.useState(false);
  const [showTarotModal, setShowTarotModal] = React.useState(false);
  const [feedback, setFeedback] = React.useState<Record<string, FeedbackType>>({});
  const [showSuggestions, setShowSuggestions] = React.useState(true);
  const [followUpQuestions, setFollowUpQuestions] = React.useState<string[]>([]);
  const [showCrisisModal, setShowCrisisModal] = React.useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = React.useState(false);
  const [showHistoryModal, setShowHistoryModal] = React.useState(false);
  const [sessionHistory, setSessionHistory] = React.useState<Array<{
    id: string;
    theme: string;
    messageCount: number;
    updatedAt: string;
    summary?: string;
  }>>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const seedSentRef = React.useRef(false);
  const welcomeShownRef = React.useRef(false);

  // Mark session as loaded on mount (no longer auto-load previous messages)
  // Users can view history via "이전 채팅 보기" button
  React.useEffect(() => {
    setSessionLoaded(true);
    logger.debug("[Chat] Session ready (fresh start - history available via button)");
  }, []);

  // Auto-save messages to database
  React.useEffect(() => {
    if (!sessionLoaded) return;
    if (messages.length === 0) return;

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
    if (!sessionLoaded) return;
    const visibleMsgs = messages.filter(m => m.role !== "system");
    if (visibleMsgs.length < 2) return; // Need at least 1 Q&A pair

    // Debounce: only update if 30s passed since last update
    const now = Date.now();
    if (now - lastUpdateRef.current < 30000) return;

    // Only update when we have a complete Q&A (last message is assistant)
    const lastMsg = visibleMsgs[visibleMsgs.length - 1];
    if (lastMsg?.role !== "assistant" || !lastMsg.content || lastMsg.content.length < 50) return;

    lastUpdateRef.current = now;

    // Fire and forget - don't block UI
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

  const getLastUserMessage = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    return lastUser?.content || "";
  };

  // Handle feedback click
  const handleFeedback = React.useCallback(async (msgId: string, type: FeedbackType) => {
    const previousFeedback = feedback[msgId];

    if (previousFeedback === type) {
      setFeedback((prev) => ({ ...prev, [msgId]: null }));
      return;
    }

    setFeedback((prev) => ({ ...prev, [msgId]: type }));

    const message = messages.find((m) => m.id === msgId);
    const lastUserMsg = getLastUserMessage();

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: "destiny-map",
          theme,
          sectionId: msgId,
          helpful: type === "up",
          locale: lang,
          userHash: sessionIdRef.current,
          recordId: msgId,
          rating: type === "up" ? 5 : 1,
          userQuestion: lastUserMsg,
          consultationSummary: message?.content?.slice(0, 500),
        }),
      });

      if (response.ok) {
        logger.debug(`[Feedback] Sent: ${msgId} = ${type}`);
      } else {
        logger.warn("[Feedback] API error:", response.status);
      }
    } catch (err) {
      logger.warn("[Feedback] Failed to send:", err);
    }
  }, [feedback, messages, theme, lang]);

  // Handle follow-up question click - uses ref to avoid stale closure
  const handleSendRef = React.useRef(handleSend);
  React.useEffect(() => {
    handleSendRef.current = handleSend;
  });

  const handleFollowUp = React.useCallback((question: string) => {
    setFollowUpQuestions([]);
    setInput("");
    handleSendRef.current(question);
  }, []);

  // Handle suggested question click
  const handleSuggestion = React.useCallback((question: string) => {
    setInput(question);
    setShowSuggestions(false);
  }, []);

  // Show tarot prompt after 2+ assistant responses
  React.useEffect(() => {
    const assistantMessages = messages.filter((m) => m.role === "assistant");
    if (assistantMessages.length >= 2 && !showTarotPrompt) {
      setShowTarotPrompt(true);
    }
  }, [messages, showTarotPrompt]);

  // Auto-insert returning context as system message
  React.useEffect(() => {
    if (!returningSummary) return;
    const alreadyHas = messages.some((m) => m.role === "system" && m.content.includes("Returning context"));
    if (alreadyHas) return;
    setMessages((prev) => [
      { role: "system", content: `Returning context: ${returningSummary}` },
      ...prev,
    ]);
  }, [returningSummary, messages]);

  const goToTarot = () => setShowTarotModal(true);

  // Handle tarot result from InlineTarotModal
  const handleTarotComplete = (result: TarotResultSummary) => {
    // Create a summary message to add to chat
    const cardsSummary = result.cards
      .map((c) => `• ${c.position}: ${c.name}${c.isReversed ? " (역방향)" : ""}`)
      .join("\n");

    const tarotMessage = `🃏 **타로 리딩 결과** - ${result.spreadTitle}

**질문:** ${result.question}

**뽑은 카드:**
${cardsSummary}

**전체 메시지:**
${result.overallMessage}${result.guidance ? `\n\n**조언:** ${result.guidance}` : ""}${result.affirmation ? `\n\n**확언:** _${result.affirmation}_` : ""}`;

    // Add as assistant message
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
  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return tr.today;
    if (diffDays === 1) return tr.yesterday;
    return `${diffDays} ${tr.daysAgo}`;
  };

  // Load session history
  const loadSessionHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/counselor/session/list?theme=${theme || "chat"}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setSessionHistory(data.sessions || []);
      }
    } catch (e) {
      logger.warn("[Chat] Failed to load history:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Open history modal
  const openHistoryModal = () => {
    setShowHistoryModal(true);
    loadSessionHistory();
  };

  // Load a specific session
  const loadSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/counselor/session/load?theme=${theme || "chat"}&sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages);
          sessionIdRef.current = data.sessionId || sessionId;
          setShowHistoryModal(false);
        }
      }
    } catch (e) {
      logger.warn("[Chat] Failed to load session:", e);
    }
  };

  // Delete a session
  const deleteSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/counselor/session/list?sessionId=${sessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSessionHistory((prev) => prev.filter((s) => s.id !== sessionId));
        setDeleteConfirmId(null);
      }
    } catch (e) {
      logger.warn("[Chat] Failed to delete session:", e);
    }
  };

  // Start new chat
  const startNewChat = () => {
    setMessages(initialContext ? [{ role: "system", content: initialContext }] : []);
    sessionIdRef.current = generateSessionId();
    setShowHistoryModal(false);
    setFollowUpQuestions([]);
    setShowSuggestions(true);
  };

  const extractConcernFromMessages = () => {
    const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content);
    return userMessages.slice(-2).join(" ").slice(0, 200);
  };

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
    if (!autoScroll) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, autoScroll]);

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    logger.info("[CV Upload] File:", { name: file.name, type: file.type, size: file.size });
    setCvName(file.name);

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setParsingPdf(true);
      try {
        const text = await extractTextFromPDF(file);
        logger.info("[CV Upload] PDF parsed, text length:", { length: text.length });
        if (text.length > 0) {
          setCvText(text.slice(0, CHAT_LIMITS.MAX_CV_CHARS));
          setNotice(lang === "ko" ? `이력서 로드 완료 (${text.length}자)` : `CV loaded (${text.length} chars)`);
          setTimeout(() => setNotice(null), CHAT_TIMINGS.NOTICE_DISMISS);
        } else {
          setCvText("");
          setNotice(lang === "ko" ? "PDF에서 텍스트를 추출할 수 없습니다" : "Could not extract text from PDF");
        }
      } catch (err: unknown) {
        logger.error("[PDF] parse error:", err);
        setCvText("");
        const error = err as Error;
        if (error?.message === "SCANNED_PDF") {
          setNotice(lang === "ko"
            ? "스캔된 PDF는 텍스트를 읽을 수 없습니다. 텍스트 기반 PDF를 업로드해주세요."
            : "Scanned PDFs cannot be read. Please upload a text-based PDF.");
        } else {
          setNotice(lang === "ko" ? "PDF 파싱 실패" : "PDF parsing failed");
        }
      } finally {
        setParsingPdf(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === "string" ? reader.result : "";
        logger.info("[CV Upload] Text file loaded, length:", { length: text.length });
        setCvText(text.slice(0, CHAT_LIMITS.MAX_CV_CHARS));
        if (text.length > 0) {
          setNotice(lang === "ko" ? `파일 로드 완료 (${text.length}자)` : `File loaded (${text.length} chars)`);
          setTimeout(() => setNotice(null), CHAT_TIMINGS.NOTICE_DISMISS);
        }
      };
      reader.onerror = () => {
        logger.error("[FileReader] error:", reader.error);
        setCvText("");
        setCvName("");
        setNotice(lang === "ko" ? "파일 읽기 실패" : "File reading failed");
      };
      reader.readAsText(file);
    }
  };

  // Make API request with retry logic
  async function makeRequest(payload: ChatPayload, attempt: number = 0): Promise<Response> {
    const startTime = performance.now();
    logger.debug(`[Chat] Request started (attempt ${attempt + 1})`);

    try {
      const res = await fetch("/api/destiny-map/chat-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": ragSessionId || sessionIdRef.current,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(CHAT_TIMINGS.REQUEST_TIMEOUT),
      });

      const responseTime = performance.now() - startTime;
      logger.debug(`[Chat] Response received: ${responseTime.toFixed(0)}ms`);

      setConnectionStatus(getConnectionStatus(responseTime));

      if (!res.ok) {
        if (res.status >= 500 && attempt < CHAT_LIMITS.MAX_RETRY_ATTEMPTS) {
          logger.warn(`[Chat] Server error ${res.status}, retrying...`);
          setRetryCount(attempt + 1);
          await new Promise(resolve => setTimeout(resolve, CHAT_TIMINGS.RETRY_BASE_DELAY * (attempt + 1)));
          return makeRequest(payload, attempt + 1);
        }
        throw new Error(await res.text());
      }
      if (!res.body) throw new Error("No response body");

      setRetryCount(0);
      return res;
    } catch (error: unknown) {
      const err = error as Error & { name?: string };
      if (err.name === "AbortError" || err.name === "TimeoutError") {
        setConnectionStatus("slow");
        if (attempt < CHAT_LIMITS.MAX_RETRY_ATTEMPTS) {
          logger.warn(`[Chat] Request timeout, retrying...`);
          setRetryCount(attempt + 1);
          await new Promise(resolve => setTimeout(resolve, CHAT_TIMINGS.RETRY_BASE_DELAY * (attempt + 1)));
          return makeRequest(payload, attempt + 1);
        }
        throw new Error("Request timeout. Please check your connection.");
      }
      throw error;
    }
  }

  // Helper: Update last assistant message content
  const updateLastAssistantMessage = React.useCallback((content: string) => {
    setMessages((prev) => {
      const updated = [...prev];
      const lastIdx = updated.length - 1;
      if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
        updated[lastIdx] = { ...updated[lastIdx], content };
      }
      return updated;
    });
  }, []);

  // Process SSE stream response using StreamProcessor
  async function processStream(
    res: Response,
    assistantMsgId: string,
    userText: string
  ): Promise<void> {
    let lastScrollTime = 0;
    const result = await streamProcessor.process(res, {
      onChunk: (_accumulated, cleaned) => {
        // Update message in real-time as chunks arrive
        updateLastAssistantMessage(cleaned);
        // Auto-scroll during streaming (throttled to every 100ms)
        const now = Date.now();
        if (autoScroll && now - lastScrollTime > 100) {
          lastScrollTime = now;
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      },
      onError: () => {
        setNotice(tr.error);
      },
    });

    // Process final content
    if (!result.content) {
      updateLastAssistantMessage(tr.noResponse);
    } else {
      updateLastAssistantMessage(result.content);

      // Set follow-up questions
      if (result.followUps.length >= CHAT_LIMITS.FOLLOWUP_DISPLAY_COUNT) {
        setFollowUpQuestions(result.followUps.slice(0, CHAT_LIMITS.FOLLOWUP_DISPLAY_COUNT));
      } else {
        setFollowUpQuestions(generateFollowUpQuestions(theme, userText, lang, CHAT_LIMITS.FOLLOWUP_DISPLAY_COUNT));
      }

      if (onSaveMessage) {
        onSaveMessage(userText, result.content);
      }
    }
  }

  // Main send handler
  async function handleSend(directText?: string) {
    const text = directText || input.trim();
    if (!text || loading) return;

    // Crisis detection
    if (detectCrisis(text, lang)) {
      setShowCrisisModal(true);
    }

    setShowSuggestions(false);
    setFollowUpQuestions([]);

    const userMsgId = generateMessageId("user");
    const nextMessages: Message[] = [...messages, { role: "user", content: text, id: userMsgId }];
    setLoading(true);
    setMessages(nextMessages);
    setInput("");
    setNotice(null);
    setUsedFallback(false);

    const payload: ChatPayload = {
      name: profile.name,
      birthDate: profile.birthDate,
      birthTime: profile.birthTime,
      latitude: profile.latitude,
      longitude: profile.longitude,
      gender: profile.gender,
      city: profile.city,
      theme,
      lang,
      messages: nextMessages,
      cvText,
      saju,
      astro,
      advancedAstro,
      predictionContext,
      userContext,
    };

    try {
      const res = await makeRequest(payload);

      if (res.headers.get("x-fallback") === "1") {
        setUsedFallback(true);
      }

      const assistantMsgId = generateMessageId("assistant");
      setMessages((prev) => [...prev, { role: "assistant", content: "", id: assistantMsgId }]);
      setLoading(false);

      await processStream(res, assistantMsgId, text);
    } catch (e: unknown) {
      logger.error("[Chat] send error:", e);
      setConnectionStatus("offline");

      const errorMessage = getErrorMessage(e as Error, lang, tr);

      setMessages((prev) => [...prev, {
        role: "assistant",
        content: errorMessage,
        id: generateMessageId("error"),
      }]);
      setLoading(false);
      setRetryCount(0);
    }
  }

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
          {connectionStatus === "slow" && "🐌 Slow connection detected"}
          {connectionStatus === "offline" && "📡 Connection lost - Check your internet"}
        </div>
      )}

      {/* Crisis Support Modal */}
      {showCrisisModal && (
        <div className={styles.crisisModalOverlay}>
          <div className={styles.crisisModal}>
            <div className={styles.crisisIcon}>💜</div>
            <h3 className={styles.crisisTitle}>{tr.crisisTitle}</h3>
            <p className={styles.crisisMessage}>{tr.crisisMessage}</p>
            <div className={styles.crisisHotline}>
              <span className={styles.crisisHotlineLabel}>{tr.crisisHotline}:</span>
              <a href={`tel:${tr.crisisHotlineNumber.split(" ")[0]}`} className={styles.crisisHotlineNumber}>
                {tr.crisisHotlineNumber}
              </a>
            </div>
            <p className={styles.groundingTip}>{tr.groundingTip}</p>
            <button
              type="button"
              className={styles.crisisCloseBtn}
              onClick={() => setShowCrisisModal(false)}
            >
              {tr.crisisClose}
            </button>
          </div>
        </div>
      )}

      {/* Session History Modal */}
      {showHistoryModal && (
        <div className={styles.historyModalOverlay} onClick={() => setShowHistoryModal(false)}>
          <div className={styles.historyModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.historyHeader}>
              <h3 className={styles.historyTitle}>{tr.previousChats}</h3>
              <button
                type="button"
                className={styles.historyCloseBtn}
                onClick={() => setShowHistoryModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.historyContent}>
              {historyLoading ? (
                <div className={styles.historyLoading}>
                  <div className={styles.loadingSpinner} />
                </div>
              ) : sessionHistory.length === 0 ? (
                <div className={styles.historyEmpty}>{tr.noHistory}</div>
              ) : (
                <div className={styles.historyList}>
                  {sessionHistory.map((session) => (
                    <div key={session.id} className={styles.historyItem}>
                      {deleteConfirmId === session.id ? (
                        <div className={styles.deleteConfirm}>
                          <span>{tr.confirmDelete}</span>
                          <div className={styles.deleteConfirmButtons}>
                            <button
                              type="button"
                              className={styles.deleteConfirmYes}
                              onClick={() => deleteSession(session.id)}
                            >
                              {tr.deleteSession}
                            </button>
                            <button
                              type="button"
                              className={styles.deleteConfirmNo}
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              {tr.cancel}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={styles.historyItemContent} onClick={() => loadSession(session.id)}>
                            <div className={styles.historyItemDate}>
                              {formatRelativeDate(session.updatedAt)}
                            </div>
                            <div className={styles.historyItemMeta}>
                              {session.messageCount} {tr.messages}
                            </div>
                            {session.summary && (
                              <div className={styles.historyItemSummary}>
                                {session.summary.slice(0, 80)}...
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className={styles.historyItemDelete}
                            onClick={() => setDeleteConfirmId(session.id)}
                            title={tr.deleteSession}
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.historyFooter}>
              <button
                type="button"
                className={styles.newChatBtn}
                onClick={startNewChat}
              >
                ✨ {tr.newChat}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Back Banner */}
      {showWelcomeBack && (
        <div className={styles.welcomeBackBanner}>
          <span>👋</span>
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
          ✨ {tr.newChat}
        </button>
        <button
          type="button"
          className={styles.sessionBtn}
          onClick={openHistoryModal}
          title={tr.previousChats}
        >
          📜 {tr.previousChats}
        </button>
      </div>

      {/* Messages Panel */}
      <div className={styles.messagesPanel}>
        {notice && (
          <div className={styles.noticeBar}>
            <span className={styles.noticeIcon}>⚠️</span>
            <span>{notice}</span>
          </div>
        )}

        {visibleMessages.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔮</div>
            <p className={styles.emptyText}>{tr.empty}</p>

            {showSuggestions && (
              <div className={styles.suggestionsContainer}>
                {suggestedQs.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={styles.suggestionChip}
                    onClick={() => handleSuggestion(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {visibleMessages.map((m, i) => (
          <MessageRow
            key={m.id || i}
            message={m}
            index={i}
            feedback={feedback}
            lang={effectiveLang}
            onFeedback={handleFeedback}
            styles={styles}
          />
        ))}

        {loading && (
          <div className={`${styles.messageRow} ${styles.assistantRow}`}>
            <div className={`${styles.counselorAvatar} ${styles.counselorThinking}`} />
            <div className={styles.messageBubble}>
              <div className={styles.thinkingMessage}>
                <div className={styles.typingDots}>
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                </div>
                <span className={styles.thinkingText}>
                  {retryCount > 0
                    ? `${tr.thinking} (Retry ${retryCount}/3)`
                    : tr.thinking}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Follow-up Questions */}
        {!loading && followUpQuestions.length > 0 && visibleMessages.length > 0 && (
          <div className={styles.followUpContainer}>
            <span className={styles.followUpLabel}>
              {lang === "ko" ? "이어서 물어보기" : "Continue asking"}
            </span>
            <div className={styles.followUpButtons}>
              {followUpQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={styles.followUpChip}
                  onClick={() => handleFollowUp(q)}
                >
                  <span className={styles.followUpIcon}>💬</span>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tarot Transition Card */}
        {showTarotPrompt && !loading && (
          <div className={styles.tarotPromptCard}>
            <div className={styles.tarotPromptIcon}>🃏</div>
            <div className={styles.tarotPromptContent}>
              <h4 className={styles.tarotPromptTitle}>{tr.tarotPrompt}</h4>
              <p className={styles.tarotPromptDesc}>{tr.tarotDesc}</p>
            </div>
            <button
              type="button"
              onClick={goToTarot}
              className={styles.tarotPromptButton}
            >
              <span>✨</span>
              <span>{tr.tarotButton}</span>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={styles.inputArea}>
        <div className={styles.inputRow}>
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
            type="button"
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className={styles.sendButton}
          >
            <span className={styles.sendIcon}>✨</span>
            <span className={styles.sendText}>{tr.send}</span>
          </button>
        </div>

        {/* File Upload */}
        <div className={styles.fileUploadArea}>
          <label className={styles.fileLabel}>
            <span className={styles.fileLabelIcon}>📎</span>
            <span>{tr.uploadCv}</span>
            <input
              type="file"
              accept=".txt,.md,.csv,.pdf"
              className={styles.fileInput}
              onChange={handleFileUpload}
            />
          </label>
          {parsingPdf && (
            <span className={styles.fileName}>
              <span className={styles.loadingSpinner} />
              {tr.parsingPdf}
            </span>
          )}
          {cvName && !parsingPdf && (
            <span className={styles.fileName}>
              <span className={styles.fileIcon}>✓</span>
              {tr.attached} {cvName}
            </span>
          )}
        </div>

        {usedFallback && (
          <div className={styles.fallbackNote}>
            <span className={styles.fallbackIcon}>ℹ️</span>
            {tr.fallbackNote}
          </div>
        )}
      </div>

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
}

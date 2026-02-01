// src/components/astrology/AstrologyChat.tsx
// Astrology-only counselor chat component (no saju)

"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./AstrologyChat.module.css";
import { detectCrisis } from "@/components/destiny-map/chat-i18n";
import MarkdownMessage from "@/components/ui/MarkdownMessage";
import { logger } from "@/lib/logger";
import { CHAT_I18N, ASTROLOGY_FOLLOWUPS, type ChatLangKey } from "./constants";
import { useI18n } from "@/i18n/I18nProvider";

type Message = { role: "system" | "user" | "assistant"; content: string; id?: string };

// Memoized Message Component for performance
const MessageRow = memo(({
  message,
  feedback,
  onFeedback,
  styles
}: {
  message: Message;
  feedback: Record<string, FeedbackType>;
  onFeedback: (id: string, type: FeedbackType) => void;
  styles: Record<string, string>;
}) => {
  const { t } = useI18n();
  return (
    <div
      key={message.id || message.content.slice(0, 20)}
      className={`${styles.message} ${styles[message.role]}`}
    >
      <div className={styles.messageContent}>
        {message.role === "assistant" ? (
          <MarkdownMessage content={message.content} />
        ) : (
          message.content
        )}
      </div>
      {message.role === "assistant" && message.content && (
        <div className={styles.feedbackButtons}>
          <button
            type="button"
            className={`${styles.feedbackBtn} ${feedback[message.id || ""] === "up" ? styles.active : ""}`}
            onClick={() => onFeedback(message.id || "", "up")}
            title={t("feedback.good")}
          >
            &#x1F44D;
          </button>
          <button
            type="button"
            className={`${styles.feedbackBtn} ${feedback[message.id || ""] === "down" ? styles.active : ""}`}
            onClick={() => onFeedback(message.id || "", "down")}
            title={t("feedback.needsImprovement")}
          >
            &#x1F44E;
          </button>
        </div>
      )}
    </div>
  );
});

MessageRow.displayName = "MessageRow";

type FeedbackType = "up" | "down" | null;

type UserContext = {
  persona?: {
    sessionCount?: number;
    lastTopics?: string[];
    emotionalTone?: string;
    recurringIssues?: string[];
  };
  recentSessions?: Array<{
    id: string;
    summary?: string;
    keyTopics?: string[];
    lastMessageAt?: string;
  }>;
};

type AstrologyChatProps = {
  profile: {
    name?: string;
    birthDate?: string;
    birthTime?: string;
    city?: string;
    gender?: string;
    latitude?: number;
    longitude?: number;
  };
  initialContext?: string;
  lang?: ChatLangKey;
  theme?: string;
  seedEvent?: string;
  astro?: Record<string, unknown> | null;
  userContext?: UserContext;
  chatSessionId?: string;
  autoSendSeed?: boolean;
  onSaveMessage?: (userMsg: string, assistantMsg: string) => void;
  autoScroll?: boolean;
  ragSessionId?: string;
};

const AstrologyChat = memo(function AstrologyChat({
  profile,
  initialContext = "",
  lang = "ko",
  theme = "life",
  seedEvent = "astrology-chat:seed",
  astro,
  userContext,
  onSaveMessage,
  autoScroll = true,
  ragSessionId,
}: AstrologyChatProps) {
  const effectiveLang = lang === "ko" ? "ko" : "en";
  const tr = CHAT_I18N[effectiveLang];
  const sessionIdRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const [messages, setMessages] = useState<Message[]>(
    initialContext ? [{ role: "system", content: initialContext }] : []
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, FeedbackType>>({});
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const seedSentRef = useRef(false);
  const welcomeShownRef = useRef(false);

  // Memoized follow-up questions
  const astrologyFollowUps = useMemo(() =>
    lang === "ko" ? ASTROLOGY_FOLLOWUPS.ko : ASTROLOGY_FOLLOWUPS.en,
    [lang]
  );

  // Show welcome back message for returning users
  useEffect(() => {
    const sessionCount = userContext?.persona?.sessionCount;
    if (sessionCount && sessionCount > 1 && !welcomeShownRef.current) {
      welcomeShownRef.current = true;
      setShowWelcomeBack(true);
      const timer = setTimeout(() => setShowWelcomeBack(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [userContext?.persona?.sessionCount]);

  const generateFollowUpQuestions = useCallback(() => {
    const shuffled = [...astrologyFollowUps].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, [astrologyFollowUps]);

  const handleSuggestionClick = useCallback((question: string) => {
    setInput(question);
    setShowSuggestions(false);
  }, []);

  // Ref to store latest handleSubmit for follow-up questions
  const handleSubmitRef = useRef<(text: string) => void>(null!);

  // Handle follow-up question click - sends immediately
  const handleFollowUpClick = useCallback((question: string) => {
    setFollowUpQuestions([]);
    handleSubmitRef.current(question);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [autoScroll]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle seed event
  useEffect(() => {
    const handler = (e: Event) => {
      if (seedSentRef.current) {return;}
      seedSentRef.current = true;
      const question = (e as CustomEvent<string>).detail;
      if (question) {
        setInput(question);
        setTimeout(() => {
          const form = document.querySelector("form");
          if (form) {form.dispatchEvent(new Event("submit", { bubbles: true }));}
        }, 100);
      }
    };
    window.addEventListener(seedEvent, handler);
    return () => window.removeEventListener(seedEvent, handler);
  }, [seedEvent]);

  // Voice recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionClass) {
        setNotice(lang === "ko" ? "음성 인식이 지원되지 않습니다." : "Speech recognition not supported.");
        return;
      }
      const recognition = new SpeechRecognitionClass();
      recognition.lang = lang === "ko" ? "ko-KR" : "en-US";
      recognition.interimResults = false;
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => prev + " " + transcript);
        setIsRecording(false);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    }
  }, [isRecording, lang]);

  // Submit handler - can be called with direct text for follow-up questions
  const handleSubmit = async (e?: React.FormEvent, directText?: string) => {
    e?.preventDefault();
    const trimmed = directText || input.trim();
    if (!trimmed || loading) {return;}

    // Crisis detection
    if (detectCrisis(trimmed, effectiveLang)) {
      setShowCrisisModal(true);
    }

    const userMsg: Message = { role: "user", content: trimmed, id: `user-${Date.now()}` };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setNotice(null);
    setUsedFallback(false);
    setShowSuggestions(false);
    setFollowUpQuestions([]);

    try {
      const response = await fetch("/api/astrology/chat-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(ragSessionId ? { "x-session-id": ragSessionId } : {}),
        },
        body: JSON.stringify({
          name: profile.name,
          birthDate: profile.birthDate,
          birthTime: profile.birthTime,
          gender: profile.gender,
          latitude: profile.latitude,
          longitude: profile.longitude,
          theme,
          lang,
          messages: [...messages, userMsg].filter((m) => m.role !== "system"),
          astro,
          userContext,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Stream failed");
      }

      // Check fallback header
      if (response.headers.get("x-fallback") === "1") {
        setUsedFallback(true);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      const assistantId = `assistant-${Date.now()}`;
      let lastScrollTime = 0;

      setMessages((prev) => [...prev, { role: "assistant", content: "", id: assistantId }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) {break;}

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {continue;}

            // Check for follow-up questions
            if (data.includes("||FOLLOWUP||")) {
              const parts = data.split("||FOLLOWUP||");
              if (parts[0]) {
                assistantContent += parts[0];
              }
              if (parts[1]) {
                try {
                  const followUps = JSON.parse(parts[1]);
                  if (Array.isArray(followUps)) {
                    setFollowUpQuestions(followUps.slice(0, 3));
                  }
                } catch {
                  setFollowUpQuestions(generateFollowUpQuestions());
                }
              }
            } else {
              assistantContent += data;
            }

            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: assistantContent } : m
              )
            );

            // Auto-scroll during streaming (throttled)
            const now = Date.now();
            if (autoScroll && now - lastScrollTime > 100) {
              lastScrollTime = now;
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }
          }
        }
      }

      // If no follow-ups received, generate defaults
      if (followUpQuestions.length === 0) {
        setFollowUpQuestions(generateFollowUpQuestions());
      }

      // Save message if callback provided
      if (onSaveMessage && assistantContent) {
        onSaveMessage(trimmed, assistantContent);
      }

      if (!assistantContent) {
        setNotice(tr.noResponse);
      }
    } catch (err) {
      logger.error("[AstrologyChat] Error:", err);
      setNotice(tr.error);
    } finally {
      setLoading(false);
    }
  };

  // Update ref for follow-up click handler
  handleSubmitRef.current = (text: string) => handleSubmit(undefined, text);

  // Feedback handler
  const handleFeedback = useCallback(async (messageId: string, type: FeedbackType) => {
    setFeedback((prev) => ({ ...prev, [messageId]: type }));
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          type,
          sessionId: sessionIdRef.current,
          source: "astrology-counselor",
        }),
      });
    } catch {
      // Silent fail
    }
  }, []);

  const visibleMessages = useMemo(() =>
    messages.filter((m) => m.role !== "system"),
    [messages]
  );

  const closeCrisisModal = useCallback(() => setShowCrisisModal(false), []);

  return (
    <div className={styles.chatContainer}>
      {/* Welcome back banner */}
      {showWelcomeBack && (
        <div className={styles.welcomeBanner}>
          <span>{tr.welcomeBack}</span>
        </div>
      )}

      {/* Crisis Modal */}
      {showCrisisModal && (
        <div className={styles.crisisOverlay}>
          <div className={styles.crisisModal}>
            <h3 className={styles.crisisTitle}>{tr.crisisTitle}</h3>
            <p className={styles.crisisMessage}>{tr.crisisMessage}</p>
            <div className={styles.crisisHotline}>
              <strong>{tr.crisisHotline}:</strong>
              <span>{tr.crisisHotlineNumber}</span>
            </div>
            <button
              type="button"
              className={styles.crisisClose}
              onClick={closeCrisisModal}
            >
              {tr.crisisClose}
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className={styles.messagesContainer}>
        {visibleMessages.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <p>{tr.empty}</p>
          </div>
        )}

        {visibleMessages.map((msg) => (
          <MessageRow
            key={msg.id || msg.content.slice(0, 20)}
            message={msg}
            feedback={feedback}
            onFeedback={handleFeedback}
            styles={styles}
          />
        ))}

        {loading && visibleMessages[visibleMessages.length - 1]?.role !== "assistant" && (
          <div className={`${styles.message} ${styles.assistant}`}>
            <div className={styles.messageContent}>
              <span className={styles.typingIndicator}>
                <span></span>
                <span></span>
                <span></span>
              </span>
              {tr.thinking}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Follow-up questions */}
      {followUpQuestions.length > 0 && !loading && (
        <div className={styles.followUpContainer}>
          {followUpQuestions.map((q, i) => (
            <button
              key={i}
              type="button"
              className={styles.followUpBtn}
              onClick={() => handleFollowUpClick(q)}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Initial suggestions */}
      {showSuggestions && visibleMessages.length === 0 && !loading && (
        <div className={styles.suggestionsContainer}>
          {astrologyFollowUps.slice(0, 4).map((q, i) => (
            <button
              key={i}
              type="button"
              className={styles.suggestionBtn}
              onClick={() => handleSuggestionClick(q)}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Notice */}
      {notice && <div className={styles.notice}>{notice}</div>}
      {usedFallback && <div className={styles.fallbackNotice}>{tr.fallbackNote}</div>}

      {/* Input form */}
      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <div className={styles.inputWrapper}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={tr.placeholder}
            disabled={loading}
            className={styles.textInput}
          />
          <button
            type="button"
            className={`${styles.voiceBtn} ${isRecording ? styles.recording : ""}`}
            onClick={toggleRecording}
            disabled={loading}
            title={isRecording ? tr.stopRecording : tr.recording}
          >
            {isRecording ? "&#x23F9;" : "&#x1F3A4;"}
          </button>
          <button type="submit" className={styles.sendBtn} disabled={loading || !input.trim()}>
            {tr.send}
          </button>
        </div>
      </form>
    </div>
  );
});

export default AstrologyChat;

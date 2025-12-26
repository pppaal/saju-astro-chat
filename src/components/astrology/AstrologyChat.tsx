// src/components/astrology/AstrologyChat.tsx
// Astrology-only counselor chat component (no saju)

"use client";

import React from "react";
import styles from "./AstrologyChat.module.css";
import { detectCrisis } from "@/components/destiny-map/chat-i18n";
import MarkdownMessage from "@/components/ui/MarkdownMessage";

type LangKey = "en" | "ko" | "ja" | "zh" | "es" | "fr" | "de" | "pt" | "ru";

type Copy = {
  placeholder: string;
  send: string;
  thinking: string;
  empty: string;
  error: string;
  fallbackNote: string;
  noResponse: string;
  recording: string;
  stopRecording: string;
  crisisTitle: string;
  crisisMessage: string;
  crisisHotline: string;
  crisisHotlineNumber: string;
  crisisClose: string;
  welcomeBack: string;
};

const I18N: Record<LangKey, Copy> = {
  en: {
    placeholder: "Ask about your birth chart (planets, houses, transits)",
    send: "Send",
    thinking: "Reading the celestial energies...",
    empty: "Ask about your astrology chart for personalized guidance.",
    error: "An error occurred. Please try again.",
    fallbackNote: "Using backup response (AI temporarily unavailable).",
    noResponse: "No response received. Try again later.",
    recording: "Recording...",
    stopRecording: "Stop",
    crisisTitle: "We're Here For You",
    crisisMessage: "It sounds like you're going through a really difficult time. Please know that support is available.",
    crisisHotline: "Crisis Hotline",
    crisisHotlineNumber: "988 (US) / 116 123 (UK)",
    crisisClose: "I understand",
    welcomeBack: "Welcome back! Let's continue exploring your stars.",
  },
  ko: {
    placeholder: "별자리 차트에 대해 질문해 주세요 (행성, 하우스, 트랜짓)",
    send: "보내기",
    thinking: "별들의 에너지를 읽고 있습니다...",
    empty: "점성술 차트에 대해 질문하시면 맞춤 상담을 받으실 수 있습니다.",
    error: "오류가 발생했습니다. 다시 시도해 주세요.",
    fallbackNote: "백업 응답으로 대신합니다 (AI 일시 불가).",
    noResponse: "응답을 받을 수 없습니다. 잠시 후 다시 시도해 주세요.",
    recording: "녹음 중...",
    stopRecording: "중지",
    crisisTitle: "당신 곁에 있어요",
    crisisMessage: "지금 많이 힘드시죠. 혼자가 아니에요. 전문 상담 도움을 받으실 수 있어요.",
    crisisHotline: "위기상담전화",
    crisisHotlineNumber: "자살예방 1393 / 정신건강 1577-0199",
    crisisClose: "확인했어요",
    welcomeBack: "다시 오셨네요! 별자리 상담을 이어갈까요?",
  },
  ja: {
    placeholder: "出生チャートについて質問してください",
    send: "送信",
    thinking: "天体のエネルギーを読み取っています...",
    empty: "占星術チャートについてお聞きください。",
    error: "エラーが発生しました。もう一度お試しください。",
    fallbackNote: "バックアップの応答を返しました。",
    noResponse: "応答がありません。しばらくしてからお試しください。",
    recording: "録音中...",
    stopRecording: "停止",
    crisisTitle: "あなたのそばにいます",
    crisisMessage: "今、とても辛い時期を過ごしていますね。専門のサポートがあります。",
    crisisHotline: "相談窓口",
    crisisHotlineNumber: "いのちの電話 0570-783-556",
    crisisClose: "確認しました",
    welcomeBack: "お帰りなさい！占星術の相談を続けましょう。",
  },
  zh: {
    placeholder: "请询问您的星盘",
    send: "发送",
    thinking: "正在读取天体能量...",
    empty: "请询问您的星盘以获得个性化指导。",
    error: "发生错误，请稍后重试。",
    fallbackNote: "返回了备用回答。",
    noResponse: "暂无回复，请稍后再试。",
    recording: "录音中...",
    stopRecording: "停止",
    crisisTitle: "我们在您身边",
    crisisMessage: "您现在正经历困难时期。您并不孤单。",
    crisisHotline: "心理援助热线",
    crisisHotlineNumber: "全国心理援助 400-161-9995",
    crisisClose: "我了解了",
    welcomeBack: "欢迎回来！让我们继续星盘咨询。",
  },
  es: {
    placeholder: "Pregunta sobre tu carta natal",
    send: "Enviar",
    thinking: "Leyendo las energías celestiales...",
    empty: "Pregunta sobre tu carta astral para orientacion personalizada.",
    error: "Ocurrio un error. Intentalo de nuevo.",
    fallbackNote: "Respuesta de respaldo.",
    noResponse: "Sin respuesta. Intentalo mas tarde.",
    recording: "Grabando...",
    stopRecording: "Detener",
    crisisTitle: "Estamos contigo",
    crisisMessage: "Parece que estás pasando por un momento difícil.",
    crisisHotline: "Línea de crisis",
    crisisHotlineNumber: "Teléfono de la Esperanza 717 003 717",
    crisisClose: "Entendido",
    welcomeBack: "¡Bienvenido! Continuemos con tu astrología.",
  },
  fr: {
    placeholder: "Posez une question sur votre thème astral",
    send: "Envoyer",
    thinking: "Lecture des énergies célestes...",
    empty: "Posez une question sur votre thème natal.",
    error: "Une erreur s'est produite.",
    fallbackNote: "Réponse de secours.",
    noResponse: "Pas de réponse.",
    recording: "Enregistrement...",
    stopRecording: "Arrêter",
    crisisTitle: "Nous sommes là pour vous",
    crisisMessage: "Vous traversez une période difficile.",
    crisisHotline: "Ligne de crise",
    crisisHotlineNumber: "SOS Amitié 09 72 39 40 50",
    crisisClose: "J'ai compris",
    welcomeBack: "Bon retour ! Continuons votre astrologie.",
  },
  de: {
    placeholder: "Fragen Sie nach Ihrem Geburtshoroskop",
    send: "Senden",
    thinking: "Lese die himmlischen Energien...",
    empty: "Fragen Sie nach Ihrem Horoskop.",
    error: "Ein Fehler ist aufgetreten.",
    fallbackNote: "Backup-Antwort.",
    noResponse: "Keine Antwort.",
    recording: "Aufnahme...",
    stopRecording: "Stoppen",
    crisisTitle: "Wir sind für Sie da",
    crisisMessage: "Sie durchleben gerade eine schwierige Zeit.",
    crisisHotline: "Krisenhotline",
    crisisHotlineNumber: "Telefonseelsorge 0800 111 0 111",
    crisisClose: "Verstanden",
    welcomeBack: "Willkommen zurück! Lassen Sie uns Ihre Astrologie fortsetzen.",
  },
  pt: {
    placeholder: "Pergunte sobre seu mapa astral",
    send: "Enviar",
    thinking: "Lendo as energias celestiais...",
    empty: "Pergunte sobre seu mapa astral.",
    error: "Ocorreu um erro.",
    fallbackNote: "Resposta de backup.",
    noResponse: "Nenhuma resposta.",
    recording: "Gravando...",
    stopRecording: "Parar",
    crisisTitle: "Estamos com você",
    crisisMessage: "Você está passando por um momento difícil.",
    crisisHotline: "Linha de crise",
    crisisHotlineNumber: "CVV 188",
    crisisClose: "Entendi",
    welcomeBack: "Bem-vindo de volta! Vamos continuar sua astrologia.",
  },
  ru: {
    placeholder: "Спросите о вашей натальной карте",
    send: "Отправить",
    thinking: "Читаем небесные энергии...",
    empty: "Спросите о вашей карте рождения.",
    error: "Произошла ошибка.",
    fallbackNote: "Резервный ответ.",
    noResponse: "Нет ответа.",
    recording: "Запись...",
    stopRecording: "Стоп",
    crisisTitle: "Мы рядом с вами",
    crisisMessage: "Похоже, вы переживаете трудное время.",
    crisisHotline: "Линия помощи",
    crisisHotlineNumber: "8-800-2000-122",
    crisisClose: "Понятно",
    welcomeBack: "С возвращением! Продолжим астрологическую консультацию.",
  },
};

// detectCrisis imported from @/components/destiny-map/chat-i18n

type Message = { role: "system" | "user" | "assistant"; content: string; id?: string };

// Memoized Message Component for performance
const MessageRow = React.memo(({
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
            title="Good response"
          >
            &#x1F44D;
          </button>
          <button
            type="button"
            className={`${styles.feedbackBtn} ${feedback[message.id || ""] === "down" ? styles.active : ""}`}
            onClick={() => onFeedback(message.id || "", "down")}
            title="Needs improvement"
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
  lang?: LangKey;
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

export default function AstrologyChat({
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
  const tr = I18N[effectiveLang];
  const sessionIdRef = React.useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const [messages, setMessages] = React.useState<Message[]>(
    initialContext ? [{ role: "system", content: initialContext }] : []
  );
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [usedFallback, setUsedFallback] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [feedback, setFeedback] = React.useState<Record<string, FeedbackType>>({});
  const [showSuggestions, setShowSuggestions] = React.useState(true);
  const [followUpQuestions, setFollowUpQuestions] = React.useState<string[]>([]);
  const [showCrisisModal, setShowCrisisModal] = React.useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const recognitionRef = React.useRef<any>(null);
  const seedSentRef = React.useRef(false);
  const welcomeShownRef = React.useRef(false);

  // Show welcome back message for returning users
  React.useEffect(() => {
    const sessionCount = userContext?.persona?.sessionCount;
    if (sessionCount && sessionCount > 1 && !welcomeShownRef.current) {
      welcomeShownRef.current = true;
      setShowWelcomeBack(true);
      const timer = setTimeout(() => setShowWelcomeBack(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [userContext?.persona?.sessionCount]);

  // Astrology-focused follow-up questions
  const astrologyFollowUps = lang === "ko"
    ? [
        "제 태양 별자리의 특성을 알려주세요",
        "달 별자리가 감정에 어떤 영향을 주나요?",
        "현재 행성 트랜짓은 어떤가요?",
        "상승궁이 뭔가요? 제 성격에 어떤 영향이 있나요?",
        "금성의 위치가 연애운에 어떤 영향을 주나요?",
        "토성 리턴이 뭔가요?",
        "수성 역행 기간에 주의할 점은?",
        "제 7하우스에 대해 알려주세요",
        "목성이 어느 하우스에 있나요?",
        "올해 주요 트랜짓은 무엇인가요?",
      ]
    : [
        "Tell me about my Sun sign characteristics",
        "How does my Moon sign affect my emotions?",
        "What are the current planetary transits?",
        "What is my rising sign and how does it affect me?",
        "How does Venus placement affect my love life?",
        "What is Saturn return?",
        "What to watch during Mercury retrograde?",
        "Tell me about my 7th house",
        "Which house is Jupiter in my chart?",
        "What are the major transits this year?",
      ];

  const generateFollowUpQuestions = React.useCallback(() => {
    // Shuffle and pick 3 random questions
    const shuffled = [...astrologyFollowUps].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, [astrologyFollowUps]);

  const handleSuggestionClick = React.useCallback((question: string) => {
    setInput(question);
    setShowSuggestions(false);
  }, []);

  // Ref to store latest handleSubmit for follow-up questions
  const handleSubmitRef = React.useRef<(text: string) => void>(() => {});

  // Handle follow-up question click - sends immediately
  const handleFollowUpClick = React.useCallback((question: string) => {
    setFollowUpQuestions([]);
    handleSubmitRef.current(question);
  }, []);

  const scrollToBottom = React.useCallback(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [autoScroll]);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle seed event
  React.useEffect(() => {
    const handler = (e: Event) => {
      if (seedSentRef.current) return;
      seedSentRef.current = true;
      const question = (e as CustomEvent<string>).detail;
      if (question) {
        setInput(question);
        setTimeout(() => {
          const form = document.querySelector("form");
          if (form) form.dispatchEvent(new Event("submit", { bubbles: true }));
        }, 100);
      }
    };
    window.addEventListener(seedEvent, handler);
    return () => window.removeEventListener(seedEvent, handler);
  }, [seedEvent]);

  // Voice recording
  const toggleRecording = () => {
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
  };

  // Submit handler - can be called with direct text for follow-up questions
  const handleSubmit = async (e?: React.FormEvent, directText?: string) => {
    e?.preventDefault();
    const trimmed = directText || input.trim();
    if (!trimmed || loading) return;

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
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

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
      console.error("[AstrologyChat] Error:", err);
      setNotice(tr.error);
    } finally {
      setLoading(false);
    }
  };

  // Update ref for follow-up click handler
  handleSubmitRef.current = (text: string) => handleSubmit(undefined, text);

  // Feedback handler
  const handleFeedback = React.useCallback(async (messageId: string, type: FeedbackType) => {
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

  const visibleMessages = messages.filter((m) => m.role !== "system");

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
              onClick={() => setShowCrisisModal(false)}
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
}

// src/components/destiny-map/Chat.tsx

"use client";

import React from "react";
import styles from "./Chat.module.css";

// PDF parsing utility
async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(" ");
    fullText += pageText + "\n";
  }
  return fullText.trim();
}

type LangKey = "en" | "ko" | "ja" | "zh" | "es" | "fr" | "de" | "pt" | "ru";

type Copy = {
  placeholder: string;
  send: string;
  thinking: string;
  empty: string;
  error: string;
  fallbackNote: string;
  safetyNote: string;
  noResponse: string;
  uploadCv: string;
  attached: string;
  parsingPdf: string;
  recording: string;
  stopRecording: string;
  tarotPrompt: string;
  tarotButton: string;
  tarotDesc: string;
};

const I18N: Record<LangKey, Copy> = {
  en: {
    placeholder: "Ask precisely (when/why/what)",
    send: "Send",
    thinking: "Analyzing your cosmic path...",
    empty: "Ask in the chosen theme for more precise answers.",
    error: "An error occurred. Please try again.",
    fallbackNote: "Using backup response (AI temporarily unavailable).",
    safetyNote: "Response limited due to policy restrictions.",
    noResponse: "No response received. Try again later.",
    uploadCv: "Upload CV",
    attached: "Attached:",
    parsingPdf: "Reading PDF...",
    recording: "Recording...",
    stopRecording: "Stop",
    tarotPrompt: "Want deeper insights?",
    tarotButton: "Try Tarot Reading",
    tarotDesc: "Combine your astrology & saju with tarot for guidance on your current concern",
  },
  ko: {
    placeholder: "언제/왜/무엇을 구체적으로 입력해 주세요.",
    send: "보내기",
    thinking: "우주의 길을 분석하고 있습니다...",
    empty: "선택한 주제에 맞춰 질문하면 더 정확하게 답변합니다.",
    error: "오류가 발생했습니다. 다시 시도해 주세요.",
    fallbackNote: "백업 응답으로 대신합니다 (AI 일시 불가).",
    safetyNote: "정책상 제한된 답변입니다.",
    noResponse: "응답을 받을 수 없습니다. 잠시 후 다시 시도해 주세요.",
    uploadCv: "이력서 업로드",
    attached: "첨부됨:",
    parsingPdf: "PDF 읽는 중...",
    recording: "녹음 중...",
    stopRecording: "중지",
    tarotPrompt: "더 깊은 통찰을 원하시나요?",
    tarotButton: "타로 리딩 받기",
    tarotDesc: "점성술과 사주를 타로와 결합하여 현재 고민에 대한 지침을 받아보세요",
  },
  ja: {
    placeholder: "いつ/なぜ/何を、できるだけ具体的に",
    send: "送信",
    thinking: "宇宙の道を分析中...",
    empty: "選んだテーマで聞くと、より正確な答えになります。",
    error: "エラーが発生しました。もう一度お試しください。",
    fallbackNote: "バックアップの応答を返しました（AI一時停止中）。",
    safetyNote: "ポリシー上、回答が制限されます。",
    noResponse: "応答がありません。しばらくしてからお試しください。",
    uploadCv: "履歴書アップロード",
    attached: "添付済み:",
    parsingPdf: "PDFを読み込み中...",
    recording: "録音中...",
    stopRecording: "停止",
    tarotPrompt: "より深い洞察を求めますか？",
    tarotButton: "タロットリーディング",
    tarotDesc: "占星術と四柱推命をタロットと組み合わせて、今の悩みへの指針を得ましょう",
  },
  zh: {
    placeholder: "请具体说明（何时/原因/内容）",
    send: "发送",
    thinking: "正在分析您的宇宙之路...",
    empty: "在选定主题下提问，会更精准。",
    error: "发生错误，请稍后重试。",
    fallbackNote: "返回了备用回答（AI暂不可用）。",
    safetyNote: "因策略限制，回答受限。",
    noResponse: "暂无回复，请稍后再试。",
    uploadCv: "上传简历",
    attached: "已附加:",
    parsingPdf: "正在读取PDF...",
    recording: "录音中...",
    stopRecording: "停止",
    tarotPrompt: "想要更深入的洞察吗？",
    tarotButton: "塔罗牌占卜",
    tarotDesc: "结合占星术和四柱，用塔罗牌为您当前的困惑提供指引",
  },
  es: {
    placeholder: "Pregunta concreta (cuando/por que/que)",
    send: "Enviar",
    thinking: "Analizando tu camino cósmico...",
    empty: "Pregunta en el tema seleccionado para respuestas mas precisas.",
    error: "Ocurrio un error. Intentalo de nuevo.",
    fallbackNote: "Se uso respuesta de respaldo (IA temporalmente no disponible).",
    safetyNote: "Respuesta limitada por politica.",
    noResponse: "Sin respuesta. Intentalo mas tarde.",
    uploadCv: "Subir CV",
    attached: "Adjunto:",
    parsingPdf: "Leyendo PDF...",
    recording: "Grabando...",
    stopRecording: "Detener",
    tarotPrompt: "¿Quieres percepciones más profundas?",
    tarotButton: "Lectura de Tarot",
    tarotDesc: "Combina tu astrología y saju con el tarot para guiarte en tu preocupación actual",
  },
  fr: {
    placeholder: "Pose une question precise (quand/pourquoi/quoi)",
    send: "Envoyer",
    thinking: "Analyse de votre chemin cosmique...",
    empty: "Pose ta question dans le theme choisi pour plus de precision.",
    error: "Une erreur s'est produite. Reessaie.",
    fallbackNote: "Reponse de secours utilisee (IA momentaneamento indisponible).",
    safetyNote: "Reponse limitee par la politique.",
    noResponse: "Pas de reponse. Reessaie plus tard.",
    uploadCv: "Télécharger CV",
    attached: "Joint:",
    parsingPdf: "Lecture du PDF...",
    recording: "Enregistrement...",
    stopRecording: "Arrêter",
    tarotPrompt: "Voulez-vous des aperçus plus profonds?",
    tarotButton: "Tirage de Tarot",
    tarotDesc: "Combinez votre astrologie et saju avec le tarot pour des conseils sur votre préoccupation actuelle",
  },
  de: {
    placeholder: "Frag prazise (wann/warum/was)",
    send: "Senden",
    thinking: "Analysiere deinen kosmischen Pfad...",
    empty: "Frage im gewahlten Thema fuer genauere Antworten.",
    error: "Es ist ein Fehler aufgetreten. Bitte erneut versuchen.",
    fallbackNote: "Backup-Antwort verwendet (KI voruebergehend nicht verfuegbar).",
    safetyNote: "Antwort aus Richtliniengruenden eingeschraenkt.",
    noResponse: "Keine Antwort erhalten. Spaeter erneut versuchen.",
    uploadCv: "Lebenslauf hochladen",
    attached: "Angehängt:",
    parsingPdf: "PDF lesen...",
    recording: "Aufnahme...",
    stopRecording: "Stoppen",
    tarotPrompt: "Möchten Sie tiefere Einblicke?",
    tarotButton: "Tarot-Lesung",
    tarotDesc: "Kombinieren Sie Ihre Astrologie und Saju mit Tarot für Anleitungen zu Ihrem aktuellen Anliegen",
  },
  pt: {
    placeholder: "Pergunte de forma precisa (quando/por que/o que)",
    send: "Enviar",
    thinking: "Analisando seu caminho cósmico...",
    empty: "Pergunte no tema escolhido para respostas mais precisas.",
    error: "Ocorreu um erro. Tente novamente.",
    fallbackNote: "Usando resposta de backup (IA temporariamente indisponivel).",
    safetyNote: "Resposta limitada por politica.",
    noResponse: "Nenhuma resposta. Tente novamente mais tarde.",
    uploadCv: "Enviar CV",
    attached: "Anexado:",
    parsingPdf: "Lendo PDF...",
    recording: "Gravando...",
    stopRecording: "Parar",
    tarotPrompt: "Quer insights mais profundos?",
    tarotButton: "Leitura de Tarô",
    tarotDesc: "Combine sua astrologia e saju com tarô para orientação sobre sua preocupação atual",
  },
  ru: {
    placeholder: "Сформулируйте точно (когда/почему/что)",
    send: "Отправить",
    thinking: "Анализируем ваш космический путь...",
    empty: "Спрашивайте в выбранной теме для более точных ответов.",
    error: "Произошла ошибка. Попробуйте позже.",
    fallbackNote: "Использован резервный ответ (ИИ временно недоступен).",
    safetyNote: "Ответ ограничен правилами.",
    noResponse: "Нет ответа. Попробуйте позже.",
    uploadCv: "Загрузить резюме",
    attached: "Прикреплено:",
    parsingPdf: "Чтение PDF...",
    recording: "Запись...",
    stopRecording: "Стоп",
    tarotPrompt: "Хотите более глубокие озарения?",
    tarotButton: "Чтение Таро",
    tarotDesc: "Объедините свою астрологию и саджу с таро для руководства по текущей проблеме",
  },
};

type Message = { role: "system" | "user" | "assistant"; content: string };

type ChatProps = {
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
};

type ChatRequest = {
  profile: ChatProps["profile"];
  theme: string;
  lang: LangKey;
  messages: Message[];
};

type ApiResponse = {
  reply?: string;
  fallback?: boolean;
  safety?: boolean;
};

export default function Chat({
  profile,
  initialContext = "",
  lang = "ko",
  theme = "focus_career",
  seedEvent = "chat:seed",
}: ChatProps) {
  const tr = I18N[lang] ?? I18N.en;
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
  const [cvText, setCvText] = React.useState("");
  const [cvName, setCvName] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);
  const [usedFallback, setUsedFallback] = React.useState(false);
  const [parsingPdf, setParsingPdf] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [showTarotPrompt, setShowTarotPrompt] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const recognitionRef = React.useRef<any>(null);

  // Show tarot prompt after 2+ assistant responses
  React.useEffect(() => {
    const assistantMessages = messages.filter((m) => m.role === "assistant");
    if (assistantMessages.length >= 2 && !showTarotPrompt) {
      setShowTarotPrompt(true);
    }
  }, [messages, showTarotPrompt]);

  // Navigate to tarot with context
  const goToTarot = () => {
    // Extract conversation summary for tarot context
    const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content);
    const concern = userMessages.slice(-2).join(" ").slice(0, 200);

    // Store context in sessionStorage for tarot page
    const tarotContext = {
      profile,
      theme,
      concern,
      fromCounselor: true,
      timestamp: Date.now(),
    };
    sessionStorage.setItem("tarotContext", JSON.stringify(tarotContext));

    // Navigate to tarot page
    window.location.href = `/tarot?from=counselor&theme=${encodeURIComponent(theme)}`;
  };

  React.useEffect(() => {
    const onSeed = (e: any) => {
      if (e?.detail && typeof e.detail === "string") {
        setInput(e.detail);
      }
    };
    window.addEventListener(seedEvent, onSeed);
    return () => window.removeEventListener(seedEvent, onSeed);
  }, [seedEvent]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Voice recognition setup
  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNotice("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang === "ko" ? "ko-KR" : lang === "ja" ? "ja-JP" : lang === "zh" ? "zh-CN" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput((prev) => prev + transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("[Voice] error:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  // File upload handler (PDF + text)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCvName(file.name);

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setParsingPdf(true);
      try {
        const text = await extractTextFromPDF(file);
        setCvText(text.slice(0, 6000));
      } catch (err) {
        console.error("[PDF] parse error:", err);
        setCvText("");
        setNotice("PDF parsing failed");
      } finally {
        setParsingPdf(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === "string" ? reader.result : "";
        setCvText(text.slice(0, 6000));
      };
      reader.onerror = () => {
        console.error("[FileReader] error:", reader.error);
        setCvText("");
        setCvName("");
        setNotice("File reading failed. Please try again.");
      };
      reader.readAsText(file);
    }
  };

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user" as const, content: text }];
    setLoading(true);
    setMessages(nextMessages);
    setInput("");
    setNotice(null);
    setUsedFallback(false);

    const payload: ChatRequest = {
      profile,
      theme,
      lang,
      messages: nextMessages,
    };

    try {
      const res = await fetch("/api/destiny-map/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionIdRef.current,
        },
        body: JSON.stringify({
          ...payload,
          name: profile.name,
          birthDate: profile.birthDate,
          birthTime: profile.birthTime,
          latitude: profile.latitude,
          longitude: profile.longitude,
          gender: profile.gender,
          city: profile.city,
          cvText,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data: ApiResponse = await res.json();

      const reply: string = data?.reply || tr.noResponse;
      if (data?.safety) setNotice(tr.safetyNote);
      setUsedFallback(Boolean(data?.fallback));

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      console.error("[Chat] send error:", e);
      setMessages((prev) => [...prev, { role: "assistant", content: tr.error }]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const visibleMessages = messages.filter((m) => m.role !== "system");

  return (
    <div className={styles.chatContainer}>
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
          </div>
        )}

        {visibleMessages.map((m, i) => (
          <div
            key={i}
            className={`${styles.messageRow} ${
              m.role === "assistant" ? styles.assistantRow : styles.userRow
            }`}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            {m.role === "assistant" && (
              <div className={styles.counselorAvatar} />
            )}
            <div className={styles.messageBubble}>
              <div
                className={
                  m.role === "assistant"
                    ? styles.assistantMessage
                    : styles.userMessage
                }
              >
                {m.content}
              </div>
            </div>
            {m.role === "user" && (
              <div className={styles.avatar}>
                <span className={styles.avatarIcon}>👤</span>
              </div>
            )}
          </div>
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
                <span className={styles.thinkingText}>{tr.thinking}</span>
              </div>
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
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className={styles.sendButton}
          >
            <span className={styles.sendIcon}>✨</span>
            <span className={styles.sendText}>{tr.send}</span>
          </button>
        </div>

        {/* File Upload & Voice */}
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
          {/* Voice Recording Button */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`${styles.voiceButton} ${isRecording ? styles.recording : ""}`}
            disabled={loading}
          >
            {isRecording ? (
              <>
                <span className={styles.recordingDot} />
                <span>{tr.stopRecording}</span>
              </>
            ) : (
              <>
                <span className={styles.micIcon}>🎤</span>
              </>
            )}
          </button>
        </div>

        {usedFallback && (
          <div className={styles.fallbackNote}>
            <span className={styles.fallbackIcon}>ℹ️</span>
            {tr.fallbackNote}
          </div>
        )}
      </div>
    </div>
  );
}

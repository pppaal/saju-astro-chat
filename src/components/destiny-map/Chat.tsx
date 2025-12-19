// src/components/destiny-map/Chat.tsx

"use client";

import React from "react";
import styles from "./Chat.module.css";

// PDF parsing utility
async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  // Use bundled worker to avoid CDN/CORS failures in some environments (e.g. Turbopack).
  const workerModule = await import("pdfjs-dist/build/pdf.worker.min.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    // Next/Turbopack exposes the asset on `default`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (workerModule as any).default ?? workerModule;

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

type Message = { role: "system" | "user" | "assistant"; content: string; id?: string };

// Feedback tracking
type FeedbackType = "up" | "down" | null;

// User context for returning users (premium feature)
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
  saju?: any;
  astro?: any;
  // Premium features
  userContext?: UserContext;
  chatSessionId?: string; // Existing session to continue
  onSaveMessage?: (userMsg: string, assistantMsg: string) => void; // Callback to save messages
  autoScroll?: boolean;
  // RAG session ID from /counselor/init prefetch
  ragSessionId?: string;
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
  saju,
  astro,
  userContext,
  chatSessionId,
  onSaveMessage,
  autoScroll = true,
  ragSessionId,
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
  const [feedback, setFeedback] = React.useState<Record<string, FeedbackType>>({});
  const [showSuggestions, setShowSuggestions] = React.useState(true);
  const [followUpQuestions, setFollowUpQuestions] = React.useState<string[]>([]);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const recognitionRef = React.useRef<any>(null);

  // Universal follow-up questions (works for any response context)
  const universalFollowUps = lang === "ko"
    ? [
        // 깊이 파고들기
        "더 자세히 알려줘", "왜 그런 거예요?", "구체적으로 설명해줘",
        // 시기/타이밍
        "그럼 언제쯤이 좋아요?", "올해 안에 가능할까요?", "몇 월이 제일 좋아요?",
        // 조언/방향
        "어떻게 하면 좋을까요?", "주의할 점은 뭐예요?", "피해야 할 건 뭐예요?",
        // 다른 관점
        "다른 관점에서도 봐줘", "반대로 생각하면 어때요?", "최악의 경우는 뭐예요?",
        // 연결 질문
        "이거랑 연애운은 관련 있어요?", "돈 문제랑 연결해서 봐줘", "건강이랑 연관 있어요?",
        // 비교/선택
        "A랑 B 중에 뭐가 나아요?", "지금 vs 나중, 뭐가 좋아요?",
        // 미래/예측
        "앞으로 어떻게 될까요?", "내년에는 달라질까요?", "10년 후에는 어때요?",
        // 자기 이해
        "내 장점을 더 알려줘", "내 약점은 뭐예요?", "나한테 숨겨진 게 있어요?",
      ]
    : [
        // Dig deeper
        "Tell me more", "Why is that?", "Explain in detail",
        // Timing
        "When would be good?", "Is it possible this year?", "Which month is best?",
        // Advice
        "What should I do?", "What should I watch out for?", "What to avoid?",
        // Different perspective
        "Show me another angle", "What about the opposite?", "What's the worst case?",
        // Connected topics
        "How does this relate to love?", "Connect this to money", "Any health connection?",
        // Compare/choose
        "Which is better, A or B?", "Now vs later - which is better?",
        // Future
        "What happens next?", "Will it change next year?", "How about in 10 years?",
        // Self understanding
        "Tell me more strengths", "What are my weaknesses?", "Any hidden aspects?",
      ];

  // Generate random follow-up questions (universal - works for any context)
  const generateFollowUpQuestions = () => {
    const shuffled = [...universalFollowUps].sort(() => Math.random() - 0.5);
    setFollowUpQuestions(shuffled.slice(0, 2));
  };

  // Suggested questions based on theme
  const suggestedQuestions: Record<string, string[]> = {
    career: lang === "ko"
      ? ["나한테 천직이 뭐예요? 🎯", "올해 이직해도 될까요?", "사장 체질인지 직원 체질인지 궁금해요"]
      : ["What's my dream job? 🎯", "Should I change jobs this year?", "Am I a boss or employee type?"],
    love: lang === "ko"
      ? ["내 인연은 어디서 만나요? 💕", "이번 연애 진지하게 가도 될까요?", "왜 나는 연애가 안 될까요?"]
      : ["Where will I meet my soulmate? 💕", "Is this relationship serious?", "Why can't I find love?"],
    wealth: lang === "ko"
      ? ["부자 될 팔자인가요? 💰", "주식 해도 될까요?", "돈 복이 있는 편인가요?"]
      : ["Am I destined to be rich? 💰", "Should I invest in stocks?", "Do I have money luck?"],
    health: lang === "ko"
      ? ["타고난 체질이 뭐예요? 🏃", "조심해야 할 질병 있어요?", "살 빠지는 시기가 있을까요?"]
      : ["What's my body type? 🏃", "Any diseases to watch?", "When's good for weight loss?"],
    life_path: lang === "ko"
      ? ["내 인생 최고의 해는 언제예요? ⭐", "숨겨진 재능이 뭐예요?", "올해 대운이 어때요?"]
      : ["When's my best year? ⭐", "What's my hidden talent?", "How's my fortune this year?"],
    chat: lang === "ko"
      ? ["나는 어떤 사람이에요? ✨", "올해 무슨 일이 생길까요?", "행운의 숫자/색깔 알려줘"]
      : ["What kind of person am I? ✨", "What will happen this year?", "Tell me my lucky number/color"],
  };

  // Handle feedback click
  const handleFeedback = (msgId: string, type: FeedbackType) => {
    setFeedback((prev) => ({
      ...prev,
      [msgId]: prev[msgId] === type ? null : type,
    }));
    // Could send to analytics here
    console.log(`[Feedback] ${msgId}: ${type}`);
  };

  // Handle follow-up question click
  const handleFollowUp = (question: string) => {
    setFollowUpQuestions([]); // Clear follow-ups
    setInput(""); // Clear input (will use directText)
    handleSend(question); // Send directly
  };

  // Handle suggested question click
  const handleSuggestion = (question: string) => {
    setInput(question);
    setShowSuggestions(false);
  };

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
    if (!autoScroll) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, autoScroll]);

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

  async function handleSend(directText?: string) {
    const text = directText || input.trim();
    if (!text || loading) return;

    // Hide suggestions after first message
    setShowSuggestions(false);
    // Clear any existing follow-up questions
    setFollowUpQuestions([]);

    const userMsgId = `user-${Date.now()}`;
    const nextMessages: Message[] = [...messages, { role: "user" as const, content: text, id: userMsgId }];
    setLoading(true);
    setMessages(nextMessages);
    setInput("");
    setNotice(null);
    setUsedFallback(false);

    const payload = {
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
      // Pass pre-computed chart data for instant responses
      saju,
      astro,
      // Premium: user context for returning users
      userContext,
    };

    try {
      // Use streaming endpoint for instant response
      const startTime = performance.now();
      console.log("[Chat] Request started");

      const res = await fetch("/api/destiny-map/chat-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Use RAG session ID from /counselor/init if available (for cached RAG data)
          "x-session-id": ragSessionId || sessionIdRef.current,
        },
        body: JSON.stringify(payload),
      });

      console.log(`[Chat] Response received: ${(performance.now() - startTime).toFixed(0)}ms`);

      if (!res.ok) throw new Error(await res.text());
      if (!res.body) throw new Error("No response body");

      // Add empty assistant message that we'll stream into
      const assistantMsgId = `assistant-${Date.now()}`;
      setMessages((prev) => [...prev, { role: "assistant", content: "", id: assistantMsgId }]);
      setLoading(false); // Show message immediately

      // Read SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let firstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              // Stream complete
              break;
            } else if (data.startsWith("[ERROR]")) {
              setNotice(tr.error);
              break;
            } else {
              // Append text to message
              accumulated += data;
              // Real-time filter: hide ||FOLLOWUP|| marker and partial markers during streaming
              // Handles: ||FOLLOWUP||[...], partial ||FO, ||FOLLOW, ||FOLLOWUP|, etc.
              let displayContent = accumulated
                .replace(/\|\|FOLLOWUP\|\|.*/s, "")  // Full marker with content
                .replace(/\|\|F(?:O(?:L(?:L(?:O(?:W(?:U(?:P(?:\|(?:\|)?)?)?)?)?)?)?)?)?$/s, "")  // Any partial state
                .replace(/\|$/s, "")  // Single pipe at end
                .trim();
              setMessages((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
                  updated[lastIdx] = { ...updated[lastIdx], content: displayContent };
                }
                return updated;
              });
            }
          }
        }
      }

      // If no content received, show error
      if (!accumulated) {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
            updated[lastIdx] = { ...updated[lastIdx], content: tr.noResponse };
          }
          return updated;
        });
      } else {
        // Parse AI-generated follow-up questions from response
        let cleanContent = accumulated;
        let aiFollowUps: string[] = [];

        // Check for ||FOLLOWUP||["q1", "q2"] pattern (flexible parsing)
        const followUpMatch = accumulated.match(/\|\|FOLLOWUP\|\|\s*\[([^\]]+)\]/s);
        if (followUpMatch) {
          try {
            // Fix common AI mistakes: curly quotes → straight quotes
            let jsonStr = "[" + followUpMatch[1] + "]";
            jsonStr = jsonStr
              .replace(/[""]/g, '"')  // Fix curly double quotes
              .replace(/['']/g, "'")  // Fix curly single quotes
              .replace(/,\s*]/g, "]"); // Fix trailing comma

            aiFollowUps = JSON.parse(jsonStr);

            // Remove the followup part from displayed message
            cleanContent = accumulated.replace(/\|\|FOLLOWUP\|\|\s*\[[^\]]+\]/s, "").trim();

            // Update the message content without the followup marker
            setMessages((prev) => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
                updated[lastIdx] = { ...updated[lastIdx], content: cleanContent };
              }
              return updated;
            });
          } catch (e) {
            console.log("[Chat] Failed to parse followup questions:", e);
            // Still remove the malformed marker from display
            cleanContent = accumulated.replace(/\|\|FOLLOWUP\|\|.*/s, "").trim();
            setMessages((prev) => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
                updated[lastIdx] = { ...updated[lastIdx], content: cleanContent };
              }
              return updated;
            });
          }
        }

        // Use AI-generated follow-ups if available, otherwise use universal pool
        if (aiFollowUps.length >= 2) {
          setFollowUpQuestions(aiFollowUps.slice(0, 2));
        } else {
          generateFollowUpQuestions();
        }

        if (onSaveMessage) {
          // Save message to persistent storage (premium feature)
          onSaveMessage(text, cleanContent);
        }
      }
    } catch (e) {
      console.error("[Chat] send error:", e);
      setMessages((prev) => [...prev, { role: "assistant", content: tr.error }]);
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

            {/* Suggested Questions */}
            {showSuggestions && (
              <div className={styles.suggestionsContainer}>
                {(suggestedQuestions[theme] || suggestedQuestions.chat).map((q, idx) => (
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
          <div
            key={m.id || i}
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

              {/* Feedback buttons for assistant messages */}
              {m.role === "assistant" && m.content && m.id && (
                <div className={styles.feedbackButtons}>
                  <button
                    type="button"
                    className={`${styles.feedbackBtn} ${feedback[m.id] === "up" ? styles.feedbackActive : ""}`}
                    onClick={() => handleFeedback(m.id!, "up")}
                    title={lang === "ko" ? "도움이 됐어요" : "Helpful"}
                  >
                    👍
                  </button>
                  <button
                    type="button"
                    className={`${styles.feedbackBtn} ${feedback[m.id] === "down" ? styles.feedbackActive : ""}`}
                    onClick={() => handleFeedback(m.id!, "down")}
                    title={lang === "ko" ? "아쉬워요" : "Not helpful"}
                  >
                    👎
                  </button>
                </div>
              )}
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

        {/* Follow-up Questions (shown after response) */}
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

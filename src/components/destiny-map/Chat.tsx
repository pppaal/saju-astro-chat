// src/components/destiny-map/Chat.tsx
// Force rebuild: cache clear

"use client";

import React from "react";
import styles from "./Chat.module.css";
import InlineTarotModal from "./InlineTarotModal";

// PDF parsing utility
async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  // Use CDN worker for pdfjs-dist v4.x
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  console.log("[PDF] Loaded:", file.name, "Pages:", pdf.numPages);

  let fullText = "";
  let totalItems = 0;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    totalItems += content.items.length;
    // Join text items with proper spacing
    const pageText = content.items
      .map((item: any) => item.str)
      .filter((str: string) => str.trim().length > 0)
      .join(" ");
    fullText += pageText + "\n";
    console.log(`[PDF] Page ${i}: ${content.items.length} items, ${pageText.length} chars`);
  }

  console.log("[PDF] Total items:", totalItems, "Total chars:", fullText.length);

  // If no text found, it's likely a scanned/image-based PDF
  if (fullText.trim().length === 0 && totalItems === 0) {
    throw new Error("SCANNED_PDF");
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
  tarotPrompt: string;
  tarotButton: string;
  tarotDesc: string;
  // Crisis support
  crisisTitle: string;
  crisisMessage: string;
  crisisHotline: string;
  crisisHotlineNumber: string;
  crisisClose: string;
  // Returning user
  welcomeBack: string;
  // Grounding
  groundingTip: string;
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
    tarotPrompt: "Want deeper insights?",
    tarotButton: "Try Tarot Reading",
    tarotDesc: "Combine your astrology & saju with tarot for guidance on your current concern",
    crisisTitle: "We're Here For You",
    crisisMessage: "It sounds like you're going through a really difficult time. Please know that support is available.",
    crisisHotline: "Crisis Hotline",
    crisisHotlineNumber: "988 (US) / 116 123 (UK)",
    crisisClose: "I understand",
    welcomeBack: "Welcome back! Let's continue our conversation.",
    groundingTip: "Try this: Take a deep breath. Notice 5 things you can see around you.",
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
    tarotPrompt: "더 깊은 통찰을 원하시나요?",
    tarotButton: "타로 리딩 받기",
    tarotDesc: "점성술과 사주를 타로와 결합하여 현재 고민에 대한 지침을 받아보세요",
    crisisTitle: "당신 곁에 있어요",
    crisisMessage: "지금 많이 힘드시죠. 혼자가 아니에요. 전문 상담 도움을 받으실 수 있어요.",
    crisisHotline: "위기상담전화",
    crisisHotlineNumber: "자살예방 1393 / 정신건강 1577-0199",
    crisisClose: "확인했어요",
    welcomeBack: "다시 오셨네요! 이어서 대화해볼까요?",
    groundingTip: "잠시 숨을 고르세요. 지금 주변에서 보이는 것 5가지를 세어보세요.",
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
    tarotPrompt: "より深い洞察を求めますか？",
    tarotButton: "タロットリーディング",
    tarotDesc: "占星術と四柱推命をタロットと組み合わせて、今の悩みへの指針を得ましょう",
    crisisTitle: "あなたのそばにいます",
    crisisMessage: "今、とても辛い時期を過ごしていますね。専門のサポートがあります。",
    crisisHotline: "相談窓口",
    crisisHotlineNumber: "いのちの電話 0570-783-556",
    crisisClose: "確認しました",
    welcomeBack: "お帰りなさい！続きをお話ししましょう。",
    groundingTip: "深呼吸してみてください。周りに見えるもの5つを数えてみましょう。",
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
    tarotPrompt: "想要更深入的洞察吗？",
    tarotButton: "塔罗牌占卜",
    tarotDesc: "结合占星术和四柱，用塔罗牌为您当前的困惑提供指引",
    crisisTitle: "我们在您身边",
    crisisMessage: "您现在正经历困难时期。您并不孤单，专业支持随时可用。",
    crisisHotline: "心理援助热线",
    crisisHotlineNumber: "全国心理援助 400-161-9995",
    crisisClose: "我了解了",
    welcomeBack: "欢迎回来！让我们继续对话。",
    groundingTip: "试着深呼吸，数一数周围能看到的5样东西。",
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
    tarotPrompt: "¿Quieres percepciones más profundas?",
    tarotButton: "Lectura de Tarot",
    tarotDesc: "Combina tu astrología y saju con el tarot para guiarte en tu preocupación actual",
    crisisTitle: "Estamos contigo",
    crisisMessage: "Parece que estás pasando por un momento difícil. Hay apoyo disponible.",
    crisisHotline: "Línea de crisis",
    crisisHotlineNumber: "Teléfono de la Esperanza 717 003 717",
    crisisClose: "Entendido",
    welcomeBack: "¡Bienvenido de nuevo! Continuemos nuestra conversación.",
    groundingTip: "Respira profundo. Nombra 5 cosas que puedes ver a tu alrededor.",
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
    tarotPrompt: "Voulez-vous des aperçus plus profonds?",
    tarotButton: "Tirage de Tarot",
    tarotDesc: "Combinez votre astrologie et saju avec le tarot pour des conseils sur votre préoccupation actuelle",
    crisisTitle: "Nous sommes là pour vous",
    crisisMessage: "Vous traversez une période difficile. De l'aide est disponible.",
    crisisHotline: "Ligne de crise",
    crisisHotlineNumber: "SOS Amitié 09 72 39 40 50",
    crisisClose: "J'ai compris",
    welcomeBack: "Bon retour ! Continuons notre conversation.",
    groundingTip: "Respirez profondément. Nommez 5 choses que vous voyez autour de vous.",
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
    tarotPrompt: "Möchten Sie tiefere Einblicke?",
    tarotButton: "Tarot-Lesung",
    tarotDesc: "Kombinieren Sie Ihre Astrologie und Saju mit Tarot für Anleitungen zu Ihrem aktuellen Anliegen",
    crisisTitle: "Wir sind für Sie da",
    crisisMessage: "Sie durchleben gerade eine schwierige Zeit. Hilfe ist verfügbar.",
    crisisHotline: "Krisenhotline",
    crisisHotlineNumber: "Telefonseelsorge 0800 111 0 111",
    crisisClose: "Verstanden",
    welcomeBack: "Willkommen zurück! Lassen Sie uns weitersprechen.",
    groundingTip: "Atmen Sie tief. Zählen Sie 5 Dinge, die Sie um sich herum sehen.",
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
    tarotPrompt: "Quer insights mais profundos?",
    tarotButton: "Leitura de Tarô",
    tarotDesc: "Combine sua astrologia e saju com tarô para orientação sobre sua preocupação atual",
    crisisTitle: "Estamos com você",
    crisisMessage: "Parece que você está passando por um momento difícil. Ajuda está disponível.",
    crisisHotline: "Linha de crise",
    crisisHotlineNumber: "CVV 188",
    crisisClose: "Entendi",
    welcomeBack: "Bem-vindo de volta! Vamos continuar nossa conversa.",
    groundingTip: "Respire fundo. Nomeie 5 coisas que você pode ver ao redor.",
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
    tarotPrompt: "Хотите более глубокие озарения?",
    tarotButton: "Чтение Таро",
    tarotDesc: "Объедините свою астрологию и саджу с таро для руководства по текущей проблеме",
    crisisTitle: "Мы рядом с вами",
    crisisMessage: "Похоже, вы переживаете трудное время. Помощь доступна.",
    crisisHotline: "Линия помощи",
    crisisHotlineNumber: "8-800-2000-122",
    crisisClose: "Понятно",
    welcomeBack: "С возвращением! Продолжим наш разговор.",
    groundingTip: "Сделайте глубокий вдох. Назовите 5 вещей, которые видите вокруг.",
  },
};

// Crisis detection keywords
const CRISIS_KEYWORDS: Record<string, string[]> = {
  ko: ["죽고 싶", "자살", "끝내고 싶", "사라지고 싶", "자해", "삶이 싫"],
  en: ["kill myself", "suicide", "end it all", "want to die", "self harm"],
};

function detectCrisis(text: string, lang: LangKey): boolean {
  const keywords = CRISIS_KEYWORDS[lang] || CRISIS_KEYWORDS.en;
  const lowerText = text.toLowerCase();
  return keywords.some((kw) => lowerText.includes(kw.toLowerCase()));
}

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
  advancedAstro?: any;  // Advanced astrology features (draconic, harmonics, progressions, etc.)
  // Premium features
  userContext?: UserContext;
  chatSessionId?: string; // Existing session to continue
  onSaveMessage?: (userMsg: string, assistantMsg: string) => void; // Callback to save messages
  autoScroll?: boolean;
  // RAG session ID from /counselor/init prefetch
  ragSessionId?: string;
  // Auto-send initial seeded question (for counselor entry via query param)
  autoSendSeed?: boolean;
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
  advancedAstro,
  userContext,
  chatSessionId,
  onSaveMessage,
  autoScroll = true,
  ragSessionId,
  autoSendSeed = false,
}: ChatProps) {
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
  const [cvText, setCvText] = React.useState("");
  const [cvName, setCvName] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);
  const [usedFallback, setUsedFallback] = React.useState(false);
  const [parsingPdf, setParsingPdf] = React.useState(false);
  const [showTarotPrompt, setShowTarotPrompt] = React.useState(false);
  const [showTarotModal, setShowTarotModal] = React.useState(false);
  const [feedback, setFeedback] = React.useState<Record<string, FeedbackType>>({});
  const [showSuggestions, setShowSuggestions] = React.useState(true);
  const [followUpQuestions, setFollowUpQuestions] = React.useState<string[]>([]);
  const [showCrisisModal, setShowCrisisModal] = React.useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const seedSentRef = React.useRef(false);
  const welcomeShownRef = React.useRef(false);

  // Follow-up questions are now shown separately, not appended to response text

  // Show welcome back message for returning users (only once)
  React.useEffect(() => {
    const sessionCount = userContext?.persona?.sessionCount;
    if (sessionCount && sessionCount > 1 && !welcomeShownRef.current) {
      welcomeShownRef.current = true;
      setShowWelcomeBack(true);
      const timer = setTimeout(() => setShowWelcomeBack(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [userContext?.persona?.sessionCount]);

  // Build a 1-line returning-user context summary
  const returningSummary = React.useMemo(() => {
    const persona = userContext?.persona;
    const lastTopics = persona?.lastTopics?.slice(0, 2)?.join(", ");
    const tone = persona?.emotionalTone;
    const recurrence = persona?.recurringIssues?.slice(0, 2)?.join(", ");
    const parts = [];
    if (lastTopics) parts.push(lang === "ko" ? `최근 주제: ${lastTopics}` : `Recent topics: ${lastTopics}`);
    if (tone) parts.push(lang === "ko" ? `감정 톤: ${tone}` : `Tone: ${tone}`);
    if (recurrence) parts.push(lang === "ko" ? `반복 이슈: ${recurrence}` : `Recurring: ${recurrence}`);
    return parts.join(" · ");
  }, [userContext?.persona, lang]);

  const getLastUserMessage = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    return lastUser?.content || "";
  };

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

  const themedFollowUps = lang === "ko"
    ? {
        career: ["일자리/커리어에서 가장 중요한 변수는 뭐예요?", "지금 회사에서 바꿔야 할 한 가지는?", "이직 시기/준비 방법을 더 알려줘"],
        love: ["관계에서 내가 놓치고 있는 신호가 있을까요?", "이 사람이 진지한지 확인하는 방법은?", "지금 관계를 개선하려면 구체적으로 무엇을 할까요?"],
        health: ["어떤 생활 습관을 먼저 바꾸면 좋을까요?", "스트레스/수면에서 주의할 점은?", "이 증상에 대해 전문가 상담이 필요할까요?"],
        wealth: ["지금 재정에서 새는 부분은 무엇인가요?", "투자/저축 우선순위를 어떻게 잡을까요?", "6개월 내 돈 흐름을 안정시키는 방법은?"],
        family: ["가족과의 갈등을 풀기 위한 첫걸음은?", "지원이 필요한 가족 구성원은 누구인가요?", "대화를 시작할 때 조심할 점은?"],
      }
    : {
        career: ["What one change at work would help most?", "Is it time to switch jobs or role?", "How should I prepare for the next 6 months?"],
        love: ["What signal am I missing in this relationship?", "How do I confirm their seriousness?", "What practical step improves this connection?"],
        health: ["Which habit should I change first?", "How to reduce stress or improve sleep?", "Should I consult a professional for this?"],
        wealth: ["Where is money leaking now?", "How to prioritize invest vs save?", "How to stabilize cash flow in 6 months?"],
        family: ["What's the first step to ease family tension?", "Who needs support most right now?", "How to start a careful conversation?"],
      };

  const generateFollowUpQuestions = (lastUserMsg: string) => {
    const text = (lastUserMsg || "").toLowerCase();
    const picks: string[] = [];

    const add = (arr: string[] = []) => {
      for (const q of arr) {
        if (!picks.includes(q)) picks.push(q);
      }
    };

    // Bias by current theme
    if (theme.includes("career") || text.match(/job|work|이직|커리어|직업/)) add(themedFollowUps.career);
    if (theme.includes("love") || text.match(/love|relationship|연애|사랑|썸/)) add(themedFollowUps.love);
    if (theme.includes("health") || text.match(/health|몸|건강|스트레스|수면/)) add(themedFollowUps.health);
    if (theme.includes("wealth") || text.match(/money|finance|돈|재정|투자|주식/)) add(themedFollowUps.wealth);
    if (theme.includes("family") || text.match(/family|가족|부모|형제|자녀/)) add(themedFollowUps.family);

    // Fill with universal if needed
    const shuffledUniversal = [...universalFollowUps].sort(() => Math.random() - 0.5);
    add(shuffledUniversal);

    setFollowUpQuestions(picks.slice(0, 2));
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

  // Handle feedback click - send to API for RLHF and analytics
  const handleFeedback = async (msgId: string, type: FeedbackType) => {
    const previousFeedback = feedback[msgId];

    // Toggle off if same type clicked again
    if (previousFeedback === type) {
      setFeedback((prev) => ({ ...prev, [msgId]: null }));
      return;
    }

    // Update UI immediately
    setFeedback((prev) => ({ ...prev, [msgId]: type }));

    // Find the message content for context
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
          // Extended RLHF fields
          recordId: msgId,
          rating: type === "up" ? 5 : 1,
          userQuestion: lastUserMsg,
          consultationSummary: message?.content?.slice(0, 500),
        }),
      });

      if (response.ok) {
        console.log(`[Feedback] Sent: ${msgId} = ${type}`);
      } else {
        console.warn("[Feedback] API error:", response.status);
      }
    } catch (err) {
      console.warn("[Feedback] Failed to send:", err);
      // Keep UI state even if API fails
    }
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

  // Auto-insert returning context as a system message (once) to guide tone/recall
  React.useEffect(() => {
    if (!returningSummary) return;
    const alreadyHas = messages.some((m) => m.role === "system" && m.content.includes("Returning context"));
    if (alreadyHas) return;
    setMessages((prev) => [
      { role: "system", content: `Returning context: ${returningSummary}` },
      ...prev,
    ]);
  }, [returningSummary, messages]);

  // Open inline tarot modal instead of navigating away
  const goToTarot = () => {
    setShowTarotModal(true);
  };

  // Extract concern from recent messages for tarot context
  const extractConcernFromMessages = () => {
    const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content);
    return userMessages.slice(-2).join(" ").slice(0, 200);
  };

  React.useEffect(() => {
    const onSeed = (e: any) => {
      if (e?.detail && typeof e.detail === "string") {
        setInput(e.detail);
        if (autoSendSeed && !seedSentRef.current) {
          seedSentRef.current = true;
          // Use directText to avoid dependency on state update timing
          handleSend(e.detail);
        }
      }
    };
    window.addEventListener(seedEvent, onSeed);
    return () => window.removeEventListener(seedEvent, onSeed);
  }, [seedEvent, autoSendSeed]);

  React.useEffect(() => {
    if (!autoScroll) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, autoScroll]);

  // File upload handler (PDF + text)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("[CV Upload] File:", file.name, "Type:", file.type, "Size:", file.size);
    setCvName(file.name);

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setParsingPdf(true);
      try {
        const text = await extractTextFromPDF(file);
        console.log("[CV Upload] PDF parsed, text length:", text.length);
        if (text.length > 0) {
          setCvText(text.slice(0, 6000));
          setNotice(lang === "ko" ? `이력서 로드 완료 (${text.length}자)` : `CV loaded (${text.length} chars)`);
          setTimeout(() => setNotice(null), 3000);
        } else {
          setCvText("");
          setNotice(lang === "ko" ? "PDF에서 텍스트를 추출할 수 없습니다" : "Could not extract text from PDF");
        }
      } catch (err: any) {
        console.error("[PDF] parse error:", err);
        setCvText("");
        if (err?.message === "SCANNED_PDF") {
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
        console.log("[CV Upload] Text file loaded, length:", text.length);
        setCvText(text.slice(0, 6000));
        if (text.length > 0) {
          setNotice(lang === "ko" ? `파일 로드 완료 (${text.length}자)` : `File loaded (${text.length} chars)`);
          setTimeout(() => setNotice(null), 3000);
        }
      };
      reader.onerror = () => {
        console.error("[FileReader] error:", reader.error);
        setCvText("");
        setCvName("");
        setNotice(lang === "ko" ? "파일 읽기 실패" : "File reading failed");
      };
      reader.readAsText(file);
    }
  };

  async function handleSend(directText?: string) {
    const text = directText || input.trim();
    if (!text || loading) return;

    // Crisis detection - show support modal if needed
    if (detectCrisis(text, lang)) {
      setShowCrisisModal(true);
      // Still send the message, but show resources
    }

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
      // Advanced astrology features (draconic, harmonics, progressions, etc.)
      advancedAstro,
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

      // Mark fallback if backend signaled it
      if (res.headers.get("x-fallback") === "1") {
        setUsedFallback(true);
      }

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

        // Don't append follow-up text inline - show questions separately instead
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
            updated[lastIdx] = { ...updated[lastIdx], content: cleanContent };
          }
          return updated;
        });

        // Use AI-generated follow-ups if available, otherwise use universal pool
        if (aiFollowUps.length >= 2) {
          setFollowUpQuestions(aiFollowUps.slice(0, 2));
        } else {
          generateFollowUpQuestions(text);
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

      {/* Welcome Back Banner for returning users */}
      {showWelcomeBack && (
        <div className={styles.welcomeBackBanner}>
          <span>👋</span>
          <span>{tr.welcomeBack}</span>
        </div>
      )}

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
        lang={lang}
        profile={profile}
        initialConcern={extractConcernFromMessages()}
        theme={theme}
      />
    </div>
  );
}

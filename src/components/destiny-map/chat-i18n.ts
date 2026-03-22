export type LangKey = 'en' | 'ko' | 'ja' | 'zh' | 'es' | 'fr' | 'de' | 'pt' | 'ru'

export type Copy = {
  placeholder: string
  send: string
  thinking: string
  empty: string
  error: string
  fallbackNote: string
  safetyNote: string
  noResponse: string
  uploadCv: string
  attached: string
  parsingPdf: string
  tarotPrompt: string
  tarotButton: string
  tarotDesc: string
  crisisTitle: string
  crisisMessage: string
  crisisHotline: string
  crisisHotlineNumber: string
  crisisClose: string
  welcomeBack: string
  groundingTip: string
  newChat: string
  previousChats: string
  noHistory: string
  loadSession: string
  deleteSession: string
  confirmDelete: string
  cancel: string
  today: string
  yesterday: string
  daysAgo: string
  messages: string
}

const BASE_EN: Copy = {
  placeholder: 'Ask precisely (when/why/what)',
  send: 'Send',
  thinking: 'Looking deeply into your concerns...',
  empty: 'Ask your question directly for a more precise reading.',
  error: 'An error occurred. Please try again.',
  fallbackNote: 'Using backup response temporarily.',
  safetyNote: 'Response limited due to policy restrictions.',
  noResponse: 'No response received. Try again later.',
  uploadCv: 'Upload CV',
  attached: 'Attached:',
  parsingPdf: 'Reading PDF...',
  tarotPrompt: 'Want deeper insights?',
  tarotButton: 'Try Tarot Reading',
  tarotDesc: 'Combine astrology, saju, and tarot for deeper guidance.',
  crisisTitle: "We're Here For You",
  crisisMessage: 'It sounds like you are going through a very difficult time. Support is available.',
  crisisHotline: 'Crisis Hotline',
  crisisHotlineNumber: '988 (US) / 116 123 (UK)',
  crisisClose: 'I understand',
  welcomeBack: "Welcome back. Let's continue carefully.",
  groundingTip: 'Take a deep breath and notice 5 things you can see around you.',
  newChat: 'New Chat',
  previousChats: 'Previous Chats',
  noHistory: 'No previous conversations',
  loadSession: 'Load',
  deleteSession: 'Delete',
  confirmDelete: 'Delete this conversation?',
  cancel: 'Cancel',
  today: 'Today',
  yesterday: 'Yesterday',
  daysAgo: 'days ago',
  messages: 'messages',
}

export const CHAT_I18N: Record<LangKey, Copy> = {
  en: BASE_EN,
  ko: {
    placeholder: '언제, 왜, 무엇이 궁금한지 구체적으로 적어주세요.',
    send: '보내기',
    thinking: '당신의 상황을 깊이 읽고 있어요...',
    empty: '질문을 바로 적어주시면 더 정확하고 밀도 있게 답할 수 있어요.',
    error: '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    fallbackNote: '일시적으로 백업 응답으로 전환했습니다.',
    safetyNote: '안전 정책에 따라 일부 표현이 제한되었어요.',
    noResponse: '응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.',
    uploadCv: '이력서 업로드',
    attached: '첨부됨:',
    parsingPdf: 'PDF 읽는 중...',
    tarotPrompt: '더 깊은 통찰이 필요하신가요?',
    tarotButton: '타로 리딩 보기',
    tarotDesc: '점성술과 사주를 타로와 함께 읽어 지금 고민에 맞는 조언을 받아보세요.',
    crisisTitle: '지금 바로 도움을 받을 수 있어요',
    crisisMessage: '지금 많이 힘드시죠. 혼자 버티지 않아도 됩니다. 전문 상담과 긴급 도움을 받을 수 있어요.',
    crisisHotline: '위기 상담 전화',
    crisisHotlineNumber: '자살예방 1393 / 정신건강 1577-0199',
    crisisClose: '확인했어요',
    welcomeBack: '다시 오셨네요. 이어서 차분히 살펴볼게요.',
    groundingTip: '잠시 숨을 고르고, 지금 눈에 보이는 것 다섯 가지를 천천히 짚어보세요.',
    newChat: '새 대화',
    previousChats: '이전 대화',
    noHistory: '이전 대화가 없습니다',
    loadSession: '불러오기',
    deleteSession: '삭제',
    confirmDelete: '이 대화를 삭제할까요?',
    cancel: '취소',
    today: '오늘',
    yesterday: '어제',
    daysAgo: '일 전',
    messages: '개 메시지',
  },
  ja: {
    ...BASE_EN,
    placeholder: 'いつ、なぜ、何を知りたいかを具体的に入力してください',
    send: '送信',
    thinking: '状況を丁寧に読み解いています...',
    crisisHotlineNumber: 'いのちの電話 0570-783-556',
    today: 'Today',
    yesterday: 'Yesterday',
  },
  zh: {
    ...BASE_EN,
    placeholder: '请具体说明你想知道何时、为何、什么',
    send: '发送',
    thinking: '正在细致分析你的情况...',
  },
  es: {
    ...BASE_EN,
    placeholder: 'Pregunta con precisión (cuándo/por qué/qué)',
    send: 'Enviar',
    thinking: 'Analizando tu situación con calma...',
  },
  fr: {
    ...BASE_EN,
    placeholder: 'Pose une question précise (quand/pourquoi/quoi)',
    send: 'Envoyer',
    thinking: 'Analyse attentive de votre situation...',
  },
  de: {
    ...BASE_EN,
    placeholder: 'Frage präzise (wann/warum/was)',
    send: 'Senden',
    thinking: 'Deine Lage wird gerade sorgfältig analysiert...',
  },
  pt: {
    ...BASE_EN,
    placeholder: 'Pergunte com precisão (quando/por que/o que)',
    send: 'Enviar',
    thinking: 'Analisando sua situação com cuidado...',
  },
  ru: {
    ...BASE_EN,
    placeholder: 'Сформулируйте точно (когда/почему/что)',
    send: 'Отправить',
    thinking: 'Внимательно разбираю вашу ситуацию...',
  },
}

export const CRISIS_KEYWORDS: Record<string, string[]> = {
  ko: ['죽고 싶', '자살', '끝내고 싶', '사라지고 싶', '자해', '삶이 싫'],
  en: ['kill myself', 'suicide', 'end it all', 'want to die', 'self harm'],
}

export function detectCrisis(text: string, lang: LangKey): boolean {
  const keywords = CRISIS_KEYWORDS[lang] || CRISIS_KEYWORDS.en
  const lowerText = text.toLowerCase()
  return keywords.some((kw) => lowerText.includes(kw.toLowerCase()))
}

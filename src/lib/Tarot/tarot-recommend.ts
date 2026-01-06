import { tarotThemes } from "./tarot-spreads-data";
import { Spread, TarotTheme } from "./tarot.types";

export interface SpreadRecommendation {
  themeId: string;
  theme: TarotTheme;
  spreadId: string;
  spread: Spread;
  reason: string;
  reasonKo: string;
  matchScore: number;
}

// 테마별 키워드 매핑
const themeKeywords: Record<string, string[]> = {
  "love-relationships": [
    "연애", "사랑", "썸", "짝사랑", "이별", "결혼", "애인", "남친", "여친",
    "관계", "데이트", "고백", "재회", "헤어", "남자친구", "여자친구", "배우자",
    "좋아", "호감", "그 사람", "그사람", "상대방", "마음에 들", "설레",
    "전남친", "전여친", "ex", "다시 만날", "돌아올", "연락",
    "love", "relationship", "dating", "partner", "marriage", "breakup", "crush", "like", "ex"
  ],
  "career-work": [
    "직장", "이직", "취업", "회사", "커리어", "상사", "동료", "업무",
    "승진", "면접", "퇴사", "사업", "창업", "진로", "직업", "월급", "근무", "회사생활",
    "시험", "합격", "붙을", "떨어", "자격증", "공무원", "공시", "토익", "수능",
    "그만두", "관두", "옮기", "이직할",
    "career", "job", "work", "boss", "promotion", "interview", "office", "workplace", "exam", "test", "pass", "quit"
  ],
  "money-finance": [
    "돈", "재정", "투자", "월급", "수입", "재물", "금전", "주식", "부동산",
    "저축", "대출", "빚", "재산", "경제", "부자", "수익", "재테크", "코인", "비트",
    "재물운", "금전운", "돈이 들어", "돈 들어",
    "사야", "살까", "구매", "구입", "지출", "비싼", "가격", "물건",
    "money", "finance", "investment", "salary", "wealth", "crypto", "bitcoin", "buy", "purchase"
  ],
  "well-being-health": [
    "건강", "몸", "피곤", "스트레스", "아픔", "병원", "다이어트", "운동",
    "잠", "수면", "멘탈", "우울", "불안", "치료", "회복",
    "슬퍼", "외로워", "힘들어", "지쳐", "무서워", "화나", "짜증",
    "health", "stress", "tired", "sick", "mental", "sad", "lonely", "anxious"
  ],
  "decisions-crossroads": [
    "선택", "결정", "고민", "갈림길", "어떡해", "어쩌지", "할까 말까",
    "언제", "타이밍", "시기", "때", "시점", "기회",
    "vs", "아니면", "둘 중", "A B", "뭘", "어느", "어디",
    "decision", "choose", "choice", "should", "which", "or", "when", "timing"
  ],
  "daily-reading": [
    "오늘", "하루", "내일", "아침", "저녁", "모레", "오늘의", "하루의",
    "today", "tomorrow", "daily"
  ],
  "self-discovery": [
    "나는 누구", "나에 대해", "본질", "정체성", "자아", "나다움", "내 정체성",
    "myself", "identity", "who am i", "personality"
  ],
  "spiritual-growth": [
    "성장", "영적", "명상", "내면", "영혼", "깨달음", "수행", "수양",
    "spiritual", "growth", "meditation", "soul", "enlightenment"
  ],
  "general-insight": [
    "운세", "전반", "종합", "전체", "흐름", "에너지", "기운",
    "fortune", "general", "overall", "energy"
  ]
};

// 복잡도 키워드
const complexityKeywords = {
  simple: ["간단", "빠르게", "한마디", "핵심", "짧게", "quick", "simple", "brief"],
  detailed: ["자세히", "깊게", "분석", "종합", "상세", "detail", "deep", "thorough"]
};

// 예시 질문 프리셋 - 더 구체적이고 실제 고민처럼
export const quickQuestions = [
  { emoji: "☀️", label: "오늘 운세", labelEn: "Today", question: "오늘 하루 어떤 일이 생길까요?", questionEn: "What will happen today?" },
  { emoji: "💕", label: "썸남/썸녀", labelEn: "Crush", question: "그 사람이 나를 좋아할까요?", questionEn: "Does my crush like me back?" },
  { emoji: "💼", label: "면접 결과", labelEn: "Interview", question: "이번 면접 붙을 수 있을까요?", questionEn: "Will I pass this interview?" },
  // ========== ??? ?? (A vs B) ==========
  { keywords: ["vs", "??", "???", "? ?", "??", "? ?", "??", "??", "??", "??", "??", "?? ?", "???", "?? ??", "?? ?", "? ??", "which", "either"],
    contextKeywords: ["??", "??", "??", "??", "??", "??", "??", "??", "???", "??", "?", "???", "??", "job", "career", "company", "offer", "salary", "position", "role", "department", "team"],
    themeId: "career-work", spreadId: "career-path",
    reason: "Compare career options", reasonKo: "??? ??? ???? ??",
    priority: 85 },

  { emoji: "⚖️", label: "A vs B", labelEn: "Choice", question: "A와 B 중에 뭘 선택해야 할까요?", questionEn: "Should I choose A or B?" },
  { emoji: "🚀", label: "이직할까", labelEn: "Quit", question: "지금 회사 그만두고 이직해도 될까요?", questionEn: "Should I quit and find a new job?" },
  { emoji: "💰", label: "돈 들어올까", labelEn: "Money", question: "이번 달 돈이 들어올까요?", questionEn: "Will I receive money this month?" },
  { emoji: "📝", label: "시험 합격", labelEn: "Exam", question: "이번 시험 합격할 수 있을까요?", questionEn: "Will I pass this exam?" },
  { emoji: "💔", label: "재회 가능할까", labelEn: "Ex", question: "헤어진 사람과 다시 만날 수 있을까요?", questionEn: "Can I get back with my ex?" }
];

function calculateThemeScores(question: string): Record<string, number> {
  const normalizedQuestion = question.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [themeId, keywords] of Object.entries(themeKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      if (normalizedQuestion.includes(keyword.toLowerCase())) {
        // 더 구체적인 키워드에 가중치 부여
        const weight = keyword.length >= 3 ? 1.5 : 1.0;
        score += keyword.length * weight;
      }
    }
    scores[themeId] = score;
  }

  return scores;
}

function determineComplexity(question: string): "simple" | "normal" | "detailed" {
  const normalizedQuestion = question.toLowerCase();

  for (const keyword of complexityKeywords.simple) {
    if (normalizedQuestion.includes(keyword.toLowerCase())) return "simple";
  }
  for (const keyword of complexityKeywords.detailed) {
    if (normalizedQuestion.includes(keyword.toLowerCase())) return "detailed";
  }

  return "normal";
}

function getCardCountRange(complexity: "simple" | "normal" | "detailed"): [number, number] {
  switch (complexity) {
    case "simple": return [1, 3];
    case "detailed": return [5, 10];
    default: return [2, 5];
  }
}

// 질문 유형에 따라 카드 개수를 자동 결정 (1~10장)
export function determineCardCount(question: string): number {
  const normalizedQuestion = question.toLowerCase();

  // 1장: 간단한 예/아니오, 오늘 운세
  const oneCardPatterns = [
    "오늘", "하루", "today", "daily",
    "한마디", "핵심", "간단", "빠르게", "quick", "simple"
  ];
  for (const pattern of oneCardPatterns) {
    if (normalizedQuestion.includes(pattern)) return 1;
  }

  // 2장: 양자택일, 비교
  const twoCardPatterns = [
    "vs", "아니면", "둘 중", "A B", "어느", "뭘 선택",
    "할까 말까", "해도 될까", "해야 할까", "should i",
    "이것 저것", "이거 저거"
  ];
  for (const pattern of twoCardPatterns) {
    if (normalizedQuestion.includes(pattern)) return 2;
  }

  // 3장: 과거-현재-미래, 일반 상담
  const threeCardPatterns = [
    "흐름", "과거", "현재", "미래", "flow", "past", "present", "future",
    "좋아할까", "마음", "감정", "feelings", "like me",
    "면접", "시험", "합격", "interview", "exam", "pass",
    "재회", "다시", "돌아올", "ex", "back together"
  ];
  for (const pattern of threeCardPatterns) {
    if (normalizedQuestion.includes(pattern)) return 3;
  }

  // 4장: 관계 분석, 상황 분석
  const fourCardPatterns = [
    "이직", "퇴사", "그만두", "job change", "quit",
    "관계", "사이", "relationship",
    "원인", "해결", "조언", "cause", "solution", "advice"
  ];
  for (const pattern of fourCardPatterns) {
    if (normalizedQuestion.includes(pattern)) return 4;
  }

  // 5장: 더 깊은 분석
  const fiveCardPatterns = [
    "자세히", "깊게", "분석", "detail", "deep", "thorough",
    "종합", "전반", "overall", "comprehensive"
  ];
  for (const pattern of fiveCardPatterns) {
    if (normalizedQuestion.includes(pattern)) return 5;
  }

  // 7장: 주간 운세
  const sevenCardPatterns = [
    "이번 주", "주간", "일주일", "week", "weekly"
  ];
  for (const pattern of sevenCardPatterns) {
    if (normalizedQuestion.includes(pattern)) return 7;
  }

  // 10장: 켈틱 크로스 수준의 상세 분석
  const tenCardPatterns = [
    "인생", "전체", "모든", "life", "everything", "all aspects",
    "켈틱", "celtic", "상세 분석", "detailed analysis"
  ];
  for (const pattern of tenCardPatterns) {
    if (normalizedQuestion.includes(pattern)) return 10;
  }

  // 질문 길이에 따른 기본 카드 개수
  const questionLength = question.length;
  if (questionLength <= 10) return 1;
  if (questionLength <= 20) return 2;
  if (questionLength <= 40) return 3;
  if (questionLength <= 60) return 4;

  // 기본값: 3장 (과거-현재-미래)
  return 3;
}

// 카드 개수에 맞는 동적 스프레드 생성
export function generateDynamicSpread(question: string, cardCount?: number): {
  cardCount: number;
  positions: { title: string; titleKo: string; description: string; descriptionKo: string }[];
  layoutType: 'horizontal' | 'vertical' | 'cross' | 'circular';
} {
  const count = cardCount ?? determineCardCount(question);

  const positionsByCount: Record<number, { title: string; titleKo: string; description: string; descriptionKo: string }[]> = {
    1: [
      { title: "Answer", titleKo: "답변", description: "Direct answer to your question", descriptionKo: "질문에 대한 직접적인 답" }
    ],
    2: [
      { title: "Option A", titleKo: "선택 A", description: "First choice", descriptionKo: "첫 번째 선택" },
      { title: "Option B", titleKo: "선택 B", description: "Second choice", descriptionKo: "두 번째 선택" }
    ],
    3: [
      { title: "Past", titleKo: "과거", description: "What has led to this", descriptionKo: "이 상황을 만든 과거" },
      { title: "Present", titleKo: "현재", description: "Current situation", descriptionKo: "현재 상황" },
      { title: "Future", titleKo: "미래", description: "What's coming", descriptionKo: "다가올 미래" }
    ],
    4: [
      { title: "Situation", titleKo: "상황", description: "Current state", descriptionKo: "현재 상태" },
      { title: "Challenge", titleKo: "도전", description: "What you face", descriptionKo: "직면한 도전" },
      { title: "Advice", titleKo: "조언", description: "Guidance", descriptionKo: "가이드" },
      { title: "Outcome", titleKo: "결과", description: "Likely result", descriptionKo: "예상 결과" }
    ],
    5: [
      { title: "Present", titleKo: "현재", description: "Where you are", descriptionKo: "현재 위치" },
      { title: "Challenge", titleKo: "도전", description: "Obstacles", descriptionKo: "장애물" },
      { title: "Past", titleKo: "과거", description: "Foundation", descriptionKo: "기반" },
      { title: "Future", titleKo: "미래", description: "What's ahead", descriptionKo: "앞으로" },
      { title: "Advice", titleKo: "조언", description: "Key guidance", descriptionKo: "핵심 조언" }
    ],
    7: [
      { title: "Monday", titleKo: "월요일", description: "Start of week", descriptionKo: "한 주의 시작" },
      { title: "Tuesday", titleKo: "화요일", description: "Building momentum", descriptionKo: "모멘텀 구축" },
      { title: "Wednesday", titleKo: "수요일", description: "Midweek energy", descriptionKo: "주중 에너지" },
      { title: "Thursday", titleKo: "목요일", description: "Expansion", descriptionKo: "확장" },
      { title: "Friday", titleKo: "금요일", description: "Completion", descriptionKo: "완성" },
      { title: "Saturday", titleKo: "토요일", description: "Rest and reflect", descriptionKo: "휴식과 반성" },
      { title: "Sunday", titleKo: "일요일", description: "Preparation", descriptionKo: "준비" }
    ],
    10: [
      { title: "Present", titleKo: "현재", description: "Current situation", descriptionKo: "현재 상황" },
      { title: "Challenge", titleKo: "도전", description: "Immediate challenge", descriptionKo: "즉각적 도전" },
      { title: "Foundation", titleKo: "기반", description: "Root cause", descriptionKo: "근본 원인" },
      { title: "Past", titleKo: "과거", description: "Recent past", descriptionKo: "최근 과거" },
      { title: "Crown", titleKo: "왕관", description: "Best outcome", descriptionKo: "최선의 결과" },
      { title: "Future", titleKo: "미래", description: "Near future", descriptionKo: "가까운 미래" },
      { title: "Self", titleKo: "자신", description: "Your attitude", descriptionKo: "당신의 태도" },
      { title: "Environment", titleKo: "환경", description: "External factors", descriptionKo: "외부 요인" },
      { title: "Hopes/Fears", titleKo: "희망/두려움", description: "Your hopes and fears", descriptionKo: "희망과 두려움" },
      { title: "Outcome", titleKo: "결과", description: "Final outcome", descriptionKo: "최종 결과" }
    ]
  };

  // 정의되지 않은 카드 개수의 경우 동적 생성
  let positions = positionsByCount[count];
  if (!positions) {
    positions = [];
    for (let i = 1; i <= count; i++) {
      positions.push({
        title: `Card ${i}`,
        titleKo: `카드 ${i}`,
        description: `Position ${i}`,
        descriptionKo: `위치 ${i}`
      });
    }
  }

  // 레이아웃 타입 결정
  let layoutType: 'horizontal' | 'vertical' | 'cross' | 'circular' = 'horizontal';
  if (count === 1) layoutType = 'horizontal';
  else if (count <= 3) layoutType = 'horizontal';
  else if (count === 4) layoutType = 'cross';
  else if (count <= 6) layoutType = 'horizontal';
  else if (count === 7) layoutType = 'horizontal';
  else if (count >= 10) layoutType = 'cross';

  return { cardCount: count, positions, layoutType };
}

function getReasonKo(themeId: string, cardCount: number): string {
  const themeReasons: Record<string, string> = {
    "love-relationships": "연애와 관계에 대한 통찰",
    "career-work": "커리어와 직장에 대한 조언",
    "money-finance": "재정과 금전운에 대한 해석",
    "well-being-health": "건강과 웰빙에 대한 메시지",
    "decisions-crossroads": "선택과 결정에 대한 가이드",
    "daily-reading": "오늘 하루에 대한 메시지",
    "self-discovery": "나를 더 깊이 이해하는 리딩",
    "spiritual-growth": "영적 성장에 대한 통찰",
    "general-insight": "전반적인 운세와 흐름"
  };

  const cardCountDesc = cardCount === 1 ? "핵심만 간단히" : cardCount <= 3 ? "적절한 깊이로" : "자세하게 분석";
  return `${themeReasons[themeId] || "운세에 대한 통찰"} - ${cardCountDesc}`;
}

// 특정 질문에 특정 스프레드 직접 매칭
interface DirectMatch {
  keywords: string[];
  // 복합 키워드: 이 키워드들 중 하나라도 포함되어야 매칭 (주제 한정)
  contextKeywords?: string[];
  themeId: string;
  spreadId: string;
  reason: string;
  reasonKo: string;
  priority: number; // 높을수록 우선순위 높음
}

const directMatches: DirectMatch[] = [
  // ========== 복합 매칭 (높은 우선순위) ==========
  // 취업 + 시기 → career-path (취업 언제?)
  { keywords: ["취업", "구직", "일자리"],
    contextKeywords: ["언제", "시기", "타이밍", "when", "timing", "할 수 있", "될까", "가능"],
    themeId: "career-work", spreadId: "career-path",
    reason: "When will you get hired?", reasonKo: "취업 시기와 방향을 봐요",
    priority: 100 },
  // 이직 + 시기 → job-change (타이밍 강조)
  { keywords: ["이직", "옮기"],
    contextKeywords: ["언제", "시기", "타이밍", "when", "timing"],
    themeId: "career-work", spreadId: "job-change",
    reason: "Best timing for job change", reasonKo: "이직 적기를 봐요",
    priority: 100 },
  // 결혼 + 시기 → finding-a-partner
  { keywords: ["결혼"],
    contextKeywords: ["언제", "시기", "타이밍", "when", "timing", "할 수 있", "될까"],
    themeId: "love-relationships", spreadId: "finding-a-partner",
    reason: "When will you get married?", reasonKo: "결혼 시기를 봐요",
    priority: 100 },
  // 연애 + 시기 → finding-a-partner
  { keywords: ["연애", "사랑", "만남", "애인"],
    contextKeywords: ["언제", "시기", "시작", "when", "timing", "start", "할 수 있", "생길"],
    themeId: "love-relationships", spreadId: "finding-a-partner",
    reason: "When will love come?", reasonKo: "연애 시기를 봐요",
    priority: 100 },
  // 돈 + 언제 → abundance-path
  { keywords: ["돈", "재물", "금전", "돈이"],
    contextKeywords: ["언제", "들어올", "생길", "when", "벌", "받을"],
    themeId: "money-finance", spreadId: "abundance-path",
    reason: "When will money come?", reasonKo: "재물운 시기를 봐요",
    priority: 100 },
  // 승진 + 시기
  { keywords: ["승진"],
    contextKeywords: ["언제", "시기", "될까", "할 수 있"],
    themeId: "career-work", spreadId: "career-path",
    reason: "When will you get promoted?", reasonKo: "승진 시기를 봐요",
    priority: 100 },

  // ========== 연애 관련 ==========
  // 운명의 상대/인연 찾기
  { keywords: ["운명의 상대", "인연", "소울메이트", "soulmate", "destiny"],
    themeId: "love-relationships", spreadId: "finding-a-partner",
    reason: "Find your destined partner", reasonKo: "운명의 인연을 봐요",
    priority: 85 },
  { keywords: ["그 사람", "그사람", "좋아할까", "나를 좋아", "마음", "썸남", "썸녀", "crush", "날 어떻게", "바람"],
    themeId: "love-relationships", spreadId: "crush-feelings",
    reason: "Find out how they feel", reasonKo: "그 사람 마음을 읽어봐요",
    priority: 80 },
  { keywords: ["재회", "다시 만", "돌아올", "전남친", "전여친", "헤어진", "ex", "다시 사귈"],
    themeId: "love-relationships", spreadId: "reconciliation",
    reason: "Explore reconciliation", reasonKo: "재회 가능성을 봐요",
    priority: 80 },
  { keywords: ["우리 관계", "사이가", "사귀는", "연인", "이혼"],
    themeId: "love-relationships", spreadId: "relationship-check-in",
    reason: "Check your relationship", reasonKo: "관계 상태를 점검해요",
    priority: 75 },

  // ========== 커리어/시험 관련 ==========
  { keywords: ["취업", "구직", "일자리", "job", "hire", "employ", "직장"],
    themeId: "career-work", spreadId: "career-path",
    reason: "Check job opportunities", reasonKo: "취업/커리어 방향을 봐요",
    priority: 70 },
  { keywords: ["면접", "interview"],
    themeId: "career-work", spreadId: "interview-result",
    reason: "Check your interview chances", reasonKo: "면접 결과를 미리 봐요",
    priority: 70 },
  { keywords: ["시험", "합격", "붙을", "수능", "공시", "자격증", "exam", "test", "pass", "토익"],
    themeId: "career-work", spreadId: "exam-pass",
    reason: "Check exam success", reasonKo: "시험 합격 가능성을 봐요",
    priority: 70 },
  { keywords: ["이직", "그만두", "그만둬", "관두", "관둬", "퇴사", "quit", "옮기", "회사 떠나", "회사 나가"],
    themeId: "career-work", spreadId: "job-change",
    reason: "Should you change jobs?", reasonKo: "이직 여부를 봐요",
    priority: 70 },
  { keywords: ["승진", "promotion", "진급"],
    themeId: "career-work", spreadId: "career-path",
    reason: "Check promotion chances", reasonKo: "승진 가능성을 봐요",
    priority: 70 },
  { keywords: ["사업", "창업", "자영업", "business", "startup"],
    themeId: "career-work", spreadId: "career-path",
    reason: "Business prospects", reasonKo: "사업/창업 전망을 봐요",
    priority: 70 },

  // ========== 재정 관련 ==========
  { keywords: ["주식", "투자", "코인", "비트코인", "부동산", "stock", "invest", "crypto"],
    themeId: "money-finance", spreadId: "financial-snapshot",
    reason: "Investment outlook", reasonKo: "투자 전망을 봐요",
    priority: 70 },
  { keywords: ["돈", "재물", "금전", "월급", "수입", "money", "income"],
    themeId: "money-finance", spreadId: "abundance-path",
    reason: "Financial prospects", reasonKo: "재물운을 봐요",
    priority: 65 },

  // ========== 건강/감정 관련 ==========
  { keywords: ["건강", "아프", "병", "치료", "회복", "health", "sick"],
    themeId: "well-being-health", spreadId: "healing-path",
    reason: "Health guidance", reasonKo: "건강 상태를 봐요",
    priority: 70 },
  { keywords: ["스트레스", "우울", "불안", "멘탈", "지친", "힘들", "슬퍼", "외로워", "화나", "짜증", "무서워", "지쳐", "stress", "anxious", "tired", "sad", "lonely", "angry", "scared"],
    themeId: "well-being-health", spreadId: "mind-body-scan",
    reason: "Mental wellness check", reasonKo: "마음 상태를 봐요",
    priority: 70 },

  // ========== 일간/주간 ==========
  { keywords: ["오늘", "하루", "today"],
    themeId: "daily-reading", spreadId: "day-card",
    reason: "Your daily message", reasonKo: "오늘의 메시지",
    priority: 60 },
  { keywords: ["이번 주", "주간", "일주일", "week", "이번주"],
    themeId: "daily-reading", spreadId: "weekly-forecast",
    reason: "Your week ahead", reasonKo: "이번 주 운세를 봐요",
    priority: 60 },
  { keywords: ["아침", "오전", "morning"],
    themeId: "daily-reading", spreadId: "three-times",
    reason: "Morning guidance", reasonKo: "하루의 흐름을 봐요",
    priority: 55 },

  // ========== 자기탐색/성장 ==========
  { keywords: ["나는", "나에 대해", "내가 누구", "정체성", "myself", "who am i"],
    themeId: "self-discovery", spreadId: "identity-core",
    reason: "Discover yourself", reasonKo: "나를 더 알아봐요",
    priority: 60 },
  { keywords: ["성장", "발전", "앞으로", "미래", "growth", "future"],
    themeId: "spiritual-growth", spreadId: "path-of-growth",
    reason: "Path of growth", reasonKo: "성장의 방향을 봐요",
    priority: 55 },

  // ========== 커리어 선택 (A vs B) ==========
  { keywords: ["vs", "어느", "어디로", "둘 중", "둘중", "두 곳", "두곳", "비교", "선택", "갈까", "가야", "어느 쪽", "어느쪽", "어떤 회사", "회사 중", "둘 중에", "which", "either"],
    contextKeywords: ["회사", "직장", "이직", "취업", "면접", "오퍼", "연봉", "직무", "포지션", "부서", "팀", "커리어", "직업", "job", "career", "company", "offer", "salary", "position", "role", "department", "team"],
    themeId: "career-work", spreadId: "career-path",
    reason: "Compare career options", reasonKo: "커리어 선택을 비교하는 질문",
    priority: 85 },

  // ========== 선택/결정 ==========
  // 비교 질문 (A vs B, 살까 말까)
  { keywords: ["vs", "아니면", "둘 중", "어느", "뭘 선택", "어떤 걸", "살까 말까", "갈까 말까"],
    themeId: "decisions-crossroads", spreadId: "two-paths",
    reason: "Compare your options", reasonKo: "두 선택지를 비교해봐요",
    priority: 50 },
  // "~할까" 패턴 (선택)
  { keywords: ["할까", "갈까", "볼까", "먹을까", "살까", "마실까", "해볼까", "탈까", "입을까", "쓸까", "들을까", "읽을까", "볼까", "만날까", "말할까", "물어볼까", "신청할까", "등록할까", "시작할까", "끝낼까", "바꿀까", "고를까"],
    themeId: "decisions-crossroads", spreadId: "yes-no-why",
    reason: "Yes or No guidance", reasonKo: "해야 할지 말아야 할지",
    priority: 45 },
  // "~도 될까/되나/돼" 패턴 (허락/확인형 질문)
  { keywords: ["도 될까", "도 되나", "도 돼", "도될까", "도되나", "도돼", "면 될까", "면 되나", "면 돼", "어도 될", "어도 되", "아도 될", "아도 되", "해도 될", "해도 되", "가도 될", "가도 되", "사도 될", "사도 되", "먹어도 될", "먹어도 되", "마셔도 될", "마셔도 되", "써도 될", "써도 되", "타도 될", "타도 되", "입어도 될", "입어도 되", "봐도 될", "봐도 되", "만나도 될", "만나도 되", "해봐도 될", "해봐도 되", "시작해도 될", "시작해도 되", "그만둬도 될", "그만둬도 되", "바꿔도 될", "바꿔도 되", "신청해도 될", "신청해도 되", "등록해도 될", "등록해도 되"],
    themeId: "decisions-crossroads", spreadId: "yes-no-why",
    reason: "Yes or No guidance", reasonKo: "해도 될지 안 될지",
    priority: 50 },
  // "해야 할까/하나/해" 패턴
  { keywords: ["해야 할까", "해야 하나", "해야 돼", "해야할까", "해야하나", "해야돼", "가야 할까", "가야 하나", "가야 돼", "사야 할까", "사야 하나", "사야 돼", "먹어야 할까", "먹어야 하나", "타야 할까", "타야 하나", "봐야 할까", "봐야 하나", "만나야 할까", "만나야 하나", "바꿔야 할까", "바꿔야 하나", "그만둬야 할까", "그만둬야 하나", "시작해야 할까", "시작해야 하나"],
    themeId: "decisions-crossroads", spreadId: "yes-no-why",
    reason: "Yes or No guidance", reasonKo: "해야 할지 말아야 할지",
    priority: 50 },
  // "괜찮을까/좋을까" 패턴
  { keywords: ["괜찮을까", "괜찮나", "좋을까", "좋나", "나을까", "나을까요", "맞을까", "맞나", "될까", "될까요", "되나", "되나요", "가능할까", "가능하나", "할 수 있을까", "할수있을까"],
    themeId: "decisions-crossroads", spreadId: "yes-no-why",
    reason: "Yes or No guidance", reasonKo: "될지 안 될지",
    priority: 48 },
  // "언제"는 다른 주제 키워드 없을 때만 일반 타이밍으로
  { keywords: ["언제", "타이밍", "시기", "때가", "when", "timing"],
    themeId: "decisions-crossroads", spreadId: "timing-window",
    reason: "Find the right timing", reasonKo: "적절한 타이밍을 봐요",
    priority: 30 }, // 낮은 우선순위

  // ========== 특수 키워드 ==========
  // 로또/복권/행운
  { keywords: ["로또", "복권", "당첨", "lottery", "lucky"],
    themeId: "money-finance", spreadId: "abundance-path",
    reason: "Luck and fortune", reasonKo: "행운을 봐요",
    priority: 60 },
  // 이민/유학
  { keywords: ["이민", "유학", "해외", "외국", "abroad", "immigration"],
    themeId: "decisions-crossroads", spreadId: "two-paths",
    reason: "Big life decision", reasonKo: "큰 결정을 봐요",
    priority: 55 },
];

interface MatchResult {
  match: DirectMatch;
  score: number;
}

// 위험한 질문 감지 (자해/자살 관련)
const dangerousKeywords = [
  "자살", "죽고 싶", "죽을래", "살기 싫", "끝내고 싶", "죽어버릴",
  "자해", "목숨", "생을 마감", "세상 떠나",
  "suicide", "kill myself", "end my life", "want to die"
];

function isDangerousQuestion(question: string): boolean {
  const normalizedQuestion = question.toLowerCase();
  return dangerousKeywords.some(keyword =>
    normalizedQuestion.includes(keyword.toLowerCase())
  );
}

// 위험한 질문에 대한 특별 응답
export function checkDangerousQuestion(question: string): { isDangerous: boolean; message?: string; messageKo?: string } {
  if (isDangerousQuestion(question)) {
    return {
      isDangerous: true,
      message: "I sense you might be going through a difficult time. Please reach out to a professional who can help. Crisis helpline: 1393 (Korea) or your local emergency services.",
      messageKo: "힘든 시간을 보내고 계신 것 같아요. 전문가의 도움을 받으시길 권해드려요. 자살예방상담전화: 1393 (24시간)"
    };
  }
  return { isDangerous: false };
}

function findDirectMatch(question: string): SpreadRecommendation | null {
  const normalizedQuestion = question.toLowerCase();
  const matchResults: MatchResult[] = [];

  for (const match of directMatches) {
    // 메인 키워드 중 하나라도 매칭되는지 확인
    let mainKeywordMatched = false;
    for (const keyword of match.keywords) {
      if (normalizedQuestion.includes(keyword.toLowerCase())) {
        mainKeywordMatched = true;
        break;
      }
    }

    if (!mainKeywordMatched) continue;

    // contextKeywords가 있는 경우: 둘 다 매칭되어야 함
    if (match.contextKeywords && match.contextKeywords.length > 0) {
      let contextMatched = false;
      for (const contextKw of match.contextKeywords) {
        if (normalizedQuestion.includes(contextKw.toLowerCase())) {
          contextMatched = true;
          break;
        }
      }
      // 컨텍스트 키워드가 있는데 매칭 안 되면 스킵
      if (!contextMatched) continue;
    }

    // 매칭 성공! 결과에 추가
    matchResults.push({
      match,
      score: match.priority
    });
  }

  // 우선순위가 가장 높은 매칭 선택
  if (matchResults.length === 0) return null;

  matchResults.sort((a, b) => b.score - a.score);
  const bestMatch = matchResults[0].match;

  const theme = tarotThemes.find(t => t.id === bestMatch.themeId);
  const spread = theme?.spreads.find(s => s.id === bestMatch.spreadId);

  if (theme && spread) {
    return {
      themeId: bestMatch.themeId,
      theme,
      spreadId: bestMatch.spreadId,
      spread,
      reason: bestMatch.reason,
      reasonKo: bestMatch.reasonKo,
      matchScore: bestMatch.priority
    };
  }

  return null;
}

function getDefaultRecommendations(): SpreadRecommendation[] {
  const recommendations: SpreadRecommendation[] = [];

  const dailyTheme = tarotThemes.find(t => t.id === "daily-reading");
  if (dailyTheme) {
    const dayCard = dailyTheme.spreads.find(s => s.id === "day-card");
    if (dayCard) {
      recommendations.push({
        themeId: "daily-reading", theme: dailyTheme, spreadId: "day-card", spread: dayCard,
        reason: "Quick daily guidance", reasonKo: "오늘 하루의 메시지를 한 장으로", matchScore: 0
      });
    }
  }

  const generalTheme = tarotThemes.find(t => t.id === "general-insight");
  if (generalTheme) {
    const ppf = generalTheme.spreads.find(s => s.id === "past-present-future");
    if (ppf) {
      recommendations.push({
        themeId: "general-insight", theme: generalTheme, spreadId: "past-present-future", spread: ppf,
        reason: "Understand your timeline", reasonKo: "과거부터 미래까지 흐름 파악", matchScore: 0
      });
    }
    const celtic = generalTheme.spreads.find(s => s.id === "celtic-cross");
    if (celtic) {
      recommendations.push({
        themeId: "general-insight", theme: generalTheme, spreadId: "celtic-cross", spread: celtic,
        reason: "Deep comprehensive reading", reasonKo: "모든 측면을 깊이 있게 분석", matchScore: 0
      });
    }
  }

  return recommendations;
}

export function recommendSpreads(question: string, maxResults: number = 3): SpreadRecommendation[] {
  if (!question.trim()) return getDefaultRecommendations();

  const recommendations: SpreadRecommendation[] = [];

  // 1. 직접 매칭 우선 체크
  const directMatch = findDirectMatch(question);
  if (directMatch) {
    recommendations.push(directMatch);
  }

  // 2. 테마 기반 추천
  const themeScores = calculateThemeScores(question);
  const complexity = determineComplexity(question);
  const [minCards, maxCards] = getCardCountRange(complexity);

  const sortedThemes = Object.entries(themeScores)
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a);

  const themesToCheck = sortedThemes.length > 0
    ? sortedThemes.slice(0, 3)
    : [["general-insight", 1] as [string, number]];

  for (const [themeId, themeScore] of themesToCheck) {
    const theme = tarotThemes.find(t => t.id === themeId);
    if (!theme) continue;

    const suitableSpreads = theme.spreads
      .filter(spread => spread.cardCount >= minCards && spread.cardCount <= maxCards)
      .slice(0, 2);

    for (const spread of suitableSpreads) {
      // 이미 직접 매칭으로 추가된 스프레드는 건너뛰기
      if (recommendations.find(r => r.spreadId === spread.id)) continue;

      recommendations.push({
        themeId, theme, spreadId: spread.id, spread,
        reason: `Perfect for ${theme.category.toLowerCase()} questions`,
        reasonKo: getReasonKo(themeId, spread.cardCount),
        matchScore: themeScore
      });
    }
  }

  const uniqueRecommendations = recommendations
    .filter((rec, index, self) => index === self.findIndex(r => r.spreadId === rec.spreadId))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, maxResults);

  if (uniqueRecommendations.length < maxResults) {
    const defaults = getDefaultRecommendations();
    for (const def of defaults) {
      if (uniqueRecommendations.length >= maxResults) break;
      if (!uniqueRecommendations.find(r => r.spreadId === def.spreadId)) {
        uniqueRecommendations.push(def);
      }
    }
  }

  return uniqueRecommendations;
}

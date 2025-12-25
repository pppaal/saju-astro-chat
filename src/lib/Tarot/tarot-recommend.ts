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
    "love", "relationship", "dating", "partner", "marriage", "breakup", "crush", "like"
  ],
  "career-work": [
    "직장", "이직", "취업", "회사", "커리어", "상사", "동료", "업무",
    "승진", "면접", "퇴사", "사업", "창업", "진로", "직업", "월급", "근무", "회사생활",
    "career", "job", "work", "boss", "promotion", "interview", "office", "workplace"
  ],
  "money-finance": [
    "돈", "재정", "투자", "월급", "수입", "재물", "금전", "주식", "부동산",
    "저축", "대출", "빚", "재산", "경제", "부자", "수익", "재테크", "코인", "비트",
    "재물운", "금전운", "돈이 들어", "돈 들어",
    "money", "finance", "investment", "salary", "wealth", "crypto", "bitcoin"
  ],
  "well-being-health": [
    "건강", "몸", "피곤", "스트레스", "아픔", "병원", "다이어트", "운동",
    "잠", "수면", "멘탈", "우울", "불안", "치료", "회복",
    "health", "stress", "tired", "sick", "mental"
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
  { label: "오늘 운세", labelEn: "Today", question: "오늘 하루 어떤 일이 생길까요?", questionEn: "What will happen today?" },
  { label: "썸남/썸녀", labelEn: "Crush", question: "그 사람이 나를 좋아할까요?", questionEn: "Does my crush like me back?" },
  { label: "면접 결과", labelEn: "Interview", question: "이번 면접 붙을 수 있을까요?", questionEn: "Will I pass this interview?" },
  { label: "A vs B", labelEn: "Choice", question: "A와 B 중에 뭘 선택해야 할까요?", questionEn: "Should I choose A or B?" },
  { label: "이직할까", labelEn: "Quit", question: "지금 회사 그만두고 이직해도 될까요?", questionEn: "Should I quit and find a new job?" },
  { label: "돈 들어올까", labelEn: "Money", question: "이번 달 돈이 들어올까요?", questionEn: "Will I receive money this month?" },
  { label: "시험 합격", labelEn: "Exam", question: "이번 시험 합격할 수 있을까요?", questionEn: "Will I pass this exam?" },
  { label: "재회 가능할까", labelEn: "Ex", question: "헤어진 사람과 다시 만날 수 있을까요?", questionEn: "Can I get back with my ex?" }
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

  const themeScores = calculateThemeScores(question);
  const complexity = determineComplexity(question);
  const [minCards, maxCards] = getCardCountRange(complexity);

  const recommendations: SpreadRecommendation[] = [];

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

    // 적합한 스프레드가 있을 때만 추가 (없으면 건너뛰기)
    for (const spread of suitableSpreads) {
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

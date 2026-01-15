import { tarotThemes } from "./tarot-spreads-data";
import {
  cardCountPatterns,
  complexityKeywords,
  dangerousKeywords,
  directMatches,
  themeKeywords,
} from "./tarot-recommend.data";
import type { DirectMatch } from "./tarot-recommend.data";
import { Spread, TarotTheme } from "./tarot.types";

export { quickQuestions } from "./tarot-recommend.data";

export interface SpreadRecommendation {
  themeId: string;
  theme: TarotTheme;
  spreadId: string;
  spread: Spread;
  reason: string;
  reasonKo: string;
  matchScore: number;
}

type KeywordScore = { term: string; score: number };

type DirectMatchNormalized = Omit<DirectMatch, "keywords" | "contextKeywords"> & {
  keywords: string[];
  contextKeywords?: string[];
};

const toLower = (value: string): string => value.toLowerCase();

const themeKeywordScores = Object.fromEntries(
  Object.entries(themeKeywords).map(([themeId, keywords]) => [
    themeId,
    keywords.map((keyword) => {
      const weight = keyword.length >= 3 ? 1.5 : 1.0;
      return { term: keyword.toLowerCase(), score: keyword.length * weight };
    }),
  ])
) as Record<string, KeywordScore[]>;

const complexityKeywordsLower = {
  simple: complexityKeywords.simple.map(toLower),
  detailed: complexityKeywords.detailed.map(toLower),
};

const cardCountPatternsLower = {
  one: cardCountPatterns.one.map(toLower),
  two: cardCountPatterns.two.map(toLower),
  three: cardCountPatterns.three.map(toLower),
  four: cardCountPatterns.four.map(toLower),
  five: cardCountPatterns.five.map(toLower),
  seven: cardCountPatterns.seven.map(toLower),
  ten: cardCountPatterns.ten.map(toLower),
};

const directMatchesLower: DirectMatchNormalized[] = directMatches.map((match) => ({
  ...match,
  keywords: match.keywords.map(toLower),
  contextKeywords: match.contextKeywords ? match.contextKeywords.map(toLower) : undefined,
}));

const dangerousKeywordsLower = dangerousKeywords.map(toLower);

// 테마별 키워드 매핑
// 복잡도 키워드
// 예시 질문 프리셋 - 더 구체적이고 실제 고민처럼
function calculateThemeScores(question: string): Record<string, number> {
  const normalizedQuestion = question.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [themeId, keywords] of Object.entries(themeKeywordScores)) {
    let score = 0;
    for (const { term, score: keywordScore } of keywords) {
      if (normalizedQuestion.includes(term)) {
        score += keywordScore;
      }
    }
    scores[themeId] = score;
  }

  return scores;
}

function determineComplexity(question: string): "simple" | "normal" | "detailed" {
  const normalizedQuestion = question.toLowerCase();

  for (const keyword of complexityKeywordsLower.simple) {
    if (normalizedQuestion.includes(keyword)) return "simple";
  }
  for (const keyword of complexityKeywordsLower.detailed) {
    if (normalizedQuestion.includes(keyword)) return "detailed";
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

export function determineCardCount(question: string): number {
  const normalizedQuestion = question.toLowerCase();
  const { one, two, three, four, five, seven, ten } = cardCountPatternsLower;

  for (const pattern of one) {
    if (normalizedQuestion.includes(pattern)) return 1;
  }

  for (const pattern of two) {
    if (normalizedQuestion.includes(pattern)) return 2;
  }

  for (const pattern of three) {
    if (normalizedQuestion.includes(pattern)) return 3;
  }

  for (const pattern of four) {
    if (normalizedQuestion.includes(pattern)) return 4;
  }

  for (const pattern of five) {
    if (normalizedQuestion.includes(pattern)) return 5;
  }

  for (const pattern of seven) {
    if (normalizedQuestion.includes(pattern)) return 7;
  }

  for (const pattern of ten) {
    if (normalizedQuestion.includes(pattern)) return 10;
  }

  const questionLength = question.length;
  if (questionLength <= 10) return 1;
  if (questionLength <= 20) return 2;
  if (questionLength <= 40) return 3;
  if (questionLength <= 60) return 4;

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
interface MatchResult {
  match: DirectMatch;
  score: number;
}

// 위험한 질문 감지 (자해/자살 관련)
function isDangerousQuestion(question: string): boolean {
  const normalizedQuestion = question.toLowerCase();
  return dangerousKeywordsLower.some(keyword =>
    normalizedQuestion.includes(keyword)
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

  for (const match of directMatchesLower) {
    // 메인 키워드 중 하나라도 매칭되는지 확인
    let mainKeywordMatched = false;
    for (const keyword of match.keywords) {
      if (normalizedQuestion.includes(keyword)) {
        mainKeywordMatched = true;
        break;
      }
    }

    if (!mainKeywordMatched) continue;

    // contextKeywords가 있는 경우: 둘 다 매칭되어야 함
    if (match.contextKeywords && match.contextKeywords.length > 0) {
      let contextMatched = false;
      for (const contextKw of match.contextKeywords) {
        if (normalizedQuestion.includes(contextKw)) {
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

export interface RecommendSpreadsResult {
  recommendations: SpreadRecommendation[];
  dangerousWarning?: { message: string; messageKo: string };
}

export function recommendSpreads(question: string, maxResults?: number): SpreadRecommendation[];
export function recommendSpreads(question: string, maxResults: number, options: { checkDangerous: true }): RecommendSpreadsResult;
export function recommendSpreads(question: string, maxResults?: number, options?: { checkDangerous?: boolean }): SpreadRecommendation[] | RecommendSpreadsResult {
  const limit = maxResults ?? 3;
  // CRITICAL: 위험한 질문 체크 (자해/자살 관련)
  if (options?.checkDangerous) {
    const dangerCheck = checkDangerousQuestion(question);
    if (dangerCheck.isDangerous && dangerCheck.message && dangerCheck.messageKo) {
      return {
        recommendations: getDefaultRecommendations().slice(0, limit),
        dangerousWarning: {
          message: dangerCheck.message,
          messageKo: dangerCheck.messageKo,
        },
      };
    }
  }

  if (!question.trim()) {
    const defaults = getDefaultRecommendations();
    return options?.checkDangerous
      ? { recommendations: defaults }
      : defaults;
  }

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
    .slice(0, limit);

  if (uniqueRecommendations.length < limit) {
    const defaults = getDefaultRecommendations();
    for (const def of defaults) {
      if (uniqueRecommendations.length >= limit) break;
      if (!uniqueRecommendations.find(r => r.spreadId === def.spreadId)) {
        uniqueRecommendations.push(def);
      }
    }
  }

  return options?.checkDangerous
    ? { recommendations: uniqueRecommendations }
    : uniqueRecommendations;
}

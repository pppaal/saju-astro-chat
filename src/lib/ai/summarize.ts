// AI 대화 요약 및 인사이트 추출 모듈
// 대화 후 자동으로 요약 생성 및 PersonaMemory 업데이트
// Semantic summary: 장기 기억을 위한 의미론적 요약

import { getBackendUrl } from "@/lib/backend-url";
import { logger } from "@/lib/logger";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ConversationSummary = {
  summary: string;           // 대화 요약 (2-3문장)
  keyTopics: string[];       // 주요 주제들 (예: ["취업", "2025년"])
  emotionalTone: string;     // 감정 톤 (예: "anxious", "hopeful")
  keyInsights: string[];     // 핵심 인사이트
  growthAreas: string[];     // 성장 영역
  recurringIssues: string[]; // 반복 이슈
};

/**
 * 대화 내용을 분석하여 요약 및 인사이트 추출
 */
export async function summarizeConversation(
  messages: ChatMessage[],
  theme: string,
  locale: string = "ko"
): Promise<ConversationSummary | null> {
  if (messages.length < 2) return null;

  const userMessages = messages.filter(m => m.role === "user").map(m => m.content);
  const assistantMessages = messages.filter(m => m.role === "assistant").map(m => m.content);

  if (userMessages.length === 0) return null;

  // 간단한 로컬 분석 (API 호출 없이)
  const summary = generateLocalSummary(userMessages, assistantMessages, theme, locale);

  return summary;
}

/**
 * 로컬에서 대화 요약 생성 (빠르고 비용 없음)
 */
function generateLocalSummary(
  userMessages: string[],
  assistantMessages: string[],
  theme: string,
  locale: string
): ConversationSummary {
  // 주요 키워드 추출
  const allText = [...userMessages, ...assistantMessages].join(" ");
  const keyTopics = extractKeyTopics(allText, theme, locale);

  // 감정 톤 분석
  const emotionalTone = analyzeEmotionalTone(userMessages, locale);

  // 핵심 인사이트 추출
  const keyInsights = extractKeyInsights(assistantMessages, locale);

  // 반복 이슈 감지
  const recurringIssues = detectRecurringIssues(userMessages, locale);

  // 성장 영역 식별
  const growthAreas = identifyGrowthAreas(allText, theme, locale);

  // 요약 생성
  const summary = generateSummaryText(userMessages, theme, locale);

  return {
    summary,
    keyTopics,
    emotionalTone,
    keyInsights,
    growthAreas,
    recurringIssues,
  };
}

/**
 * 주요 주제 추출
 */
function extractKeyTopics(text: string, theme: string, locale: string): string[] {
  const topics: string[] = [];

  // 테마 기반 기본 토픽
  const themeTopics: Record<string, string[]> = {
    love: locale === "ko" ? ["연애", "결혼", "관계"] : ["love", "marriage", "relationship"],
    career: locale === "ko" ? ["취업", "이직", "커리어"] : ["job", "career", "work"],
    health: locale === "ko" ? ["건강", "체력", "웰빙"] : ["health", "wellness", "fitness"],
    wealth: locale === "ko" ? ["재물", "투자", "재정"] : ["money", "investment", "finance"],
    life: locale === "ko" ? ["인생", "방향", "목표"] : ["life", "direction", "goals"],
  };

  if (themeTopics[theme]) {
    topics.push(themeTopics[theme][0]);
  }

  // 시간 관련 키워드
  const timeKeywords = locale === "ko"
    ? {
        "2025년": "2025년",
        "올해": "올해",
        "내년": "내년",
        "이번 달": "이번 달",
        "상반기": "상반기",
        "하반기": "하반기",
      }
    : {
        "2025": "2025",
        "this year": "this year",
        "next year": "next year",
        "this month": "this month",
      };

  for (const [keyword, topic] of Object.entries(timeKeywords)) {
    if (text.includes(keyword)) {
      topics.push(topic);
    }
  }

  // 중복 제거
  return [...new Set(topics)].slice(0, 5);
}

/**
 * 감정 톤 분석
 */
function analyzeEmotionalTone(userMessages: string[], locale: string): string {
  const text = userMessages.join(" ").toLowerCase();

  const anxiousKeywords = locale === "ko"
    ? ["걱정", "불안", "두려", "무서", "힘들", "어려"]
    : ["worried", "anxious", "scared", "difficult", "hard", "stress"];

  const hopefulKeywords = locale === "ko"
    ? ["기대", "희망", "좋", "행복", "설레", "기쁘"]
    : ["hope", "excited", "happy", "looking forward", "great"];

  const curiousKeywords = locale === "ko"
    ? ["궁금", "알고 싶", "어떻", "언제", "어디"]
    : ["curious", "want to know", "how", "when", "where"];

  let anxiousCount = 0;
  let hopefulCount = 0;
  let curiousCount = 0;

  for (const keyword of anxiousKeywords) {
    if (text.includes(keyword)) anxiousCount++;
  }
  for (const keyword of hopefulKeywords) {
    if (text.includes(keyword)) hopefulCount++;
  }
  for (const keyword of curiousKeywords) {
    if (text.includes(keyword)) curiousCount++;
  }

  if (anxiousCount > hopefulCount && anxiousCount > curiousCount) {
    return "anxious";
  } else if (hopefulCount > curiousCount) {
    return "hopeful";
  } else if (curiousCount > 0) {
    return "curious";
  }

  return "neutral";
}

/**
 * 핵심 인사이트 추출
 */
function extractKeyInsights(assistantMessages: string[], locale: string): string[] {
  const insights: string[] = [];
  const text = assistantMessages.join(" ");

  // 인사이트 패턴 감지 (AI 응답에서 핵심 조언 추출)
  const patterns = locale === "ko"
    ? [
        /중요한 것은[^.]+\./g,
        /핵심은[^.]+\./g,
        /추천드리는 것은[^.]+\./g,
        /조언드리자면[^.]+\./g,
      ]
    : [
        /the key is[^.]+\./gi,
        /important thing is[^.]+\./gi,
        /I recommend[^.]+\./gi,
        /my advice is[^.]+\./gi,
      ];

  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      insights.push(...matches.slice(0, 2));
    }
  }

  return insights.slice(0, 3);
}

/**
 * 반복 이슈 감지
 */
function detectRecurringIssues(userMessages: string[], locale: string): string[] {
  const issues: string[] = [];
  const text = userMessages.join(" ");

  const issuePatterns = locale === "ko"
    ? {
        "commitment": ["결혼", "약속", "진지한 관계"],
        "career_uncertainty": ["이직", "취업", "직장"],
        "self_doubt": ["자신", "못하", "자격"],
        "relationship_anxiety": ["연락", "답장", "관심"],
      }
    : {
        "commitment": ["marriage", "commitment", "serious relationship"],
        "career_uncertainty": ["job", "career", "work"],
        "self_doubt": ["myself", "can't", "not good enough"],
        "relationship_anxiety": ["text", "reply", "attention"],
      };

  for (const [issue, keywords] of Object.entries(issuePatterns)) {
    const count = keywords.filter(k => text.includes(k)).length;
    if (count >= 2) {
      issues.push(issue);
    }
  }

  return issues;
}

/**
 * 성장 영역 식별
 */
function identifyGrowthAreas(text: string, theme: string, locale: string): string[] {
  const areas: string[] = [];

  // 테마별 성장 영역
  const themeGrowthAreas: Record<string, string> = {
    love: locale === "ko" ? "관계" : "relationships",
    career: locale === "ko" ? "커리어" : "career",
    health: locale === "ko" ? "건강" : "health",
    wealth: locale === "ko" ? "재정" : "finances",
    life: locale === "ko" ? "자기 발견" : "self-discovery",
  };

  if (themeGrowthAreas[theme]) {
    areas.push(themeGrowthAreas[theme]);
  }

  // 텍스트 기반 추가 영역 감지
  const growthKeywords = locale === "ko"
    ? {
        "자기표현": ["표현", "말하", "소통"],
        "결정력": ["결정", "선택", "고민"],
        "자신감": ["자신감", "용기", "자존"],
      }
    : {
        "self-expression": ["express", "communicate", "say"],
        "decision-making": ["decide", "choose", "dilemma"],
        "confidence": ["confidence", "courage", "self-esteem"],
      };

  for (const [area, keywords] of Object.entries(growthKeywords)) {
    if (keywords.some((k: string) => text.includes(k))) {
      areas.push(area);
    }
  }

  return [...new Set(areas)].slice(0, 3);
}

/**
 * 요약 텍스트 생성
 */
function generateSummaryText(userMessages: string[], theme: string, locale: string): string {
  const questionCount = userMessages.length;
  const firstQuestion = userMessages[0]?.slice(0, 50) || "";

  const themeNames: Record<string, { ko: string; en: string }> = {
    love: { ko: "연애/관계", en: "love/relationships" },
    career: { ko: "커리어/취업", en: "career/job" },
    health: { ko: "건강", en: "health" },
    wealth: { ko: "재물/투자", en: "wealth/investment" },
    life: { ko: "인생 전반", en: "life overall" },
    chat: { ko: "자유 주제", en: "free topic" },
  };

  const themeName = themeNames[theme] || themeNames.chat;

  if (locale === "ko") {
    return `${themeName.ko} 관련 상담. ${questionCount}개의 질문. "${firstQuestion}..."로 시작.`;
  } else {
    return `Consultation about ${themeName.en}. ${questionCount} questions. Started with "${firstQuestion}..."`;
  }
}

/**
 * AI를 사용한 고급 요약 (선택적 - 비용 발생)
 */
export async function summarizeWithAI(
  messages: ChatMessage[],
  theme: string,
  locale: string = "ko"
): Promise<ConversationSummary | null> {
  try {
    const backendUrl = getBackendUrl();
    const apiKey = process.env.ADMIN_API_TOKEN || "";

    const prompt = locale === "ko"
      ? `다음 상담 대화를 분석해주세요:

         대화:
         ${messages.map(m => `${m.role}: ${m.content}`).join("\n")}

         다음 형식으로 JSON 응답해주세요:
         {
           "summary": "2-3문장 요약",
           "keyTopics": ["주제1", "주제2"],
           "emotionalTone": "anxious/hopeful/curious/neutral 중 하나",
           "keyInsights": ["인사이트1", "인사이트2"],
           "growthAreas": ["성장영역1"],
           "recurringIssues": ["반복이슈1"]
         }`
      : `Analyze this counseling conversation:

         Conversation:
         ${messages.map(m => `${m.role}: ${m.content}`).join("\n")}

         Respond in JSON format:
         {
           "summary": "2-3 sentence summary",
           "keyTopics": ["topic1", "topic2"],
           "emotionalTone": "one of: anxious/hopeful/curious/neutral",
           "keyInsights": ["insight1", "insight2"],
           "growthAreas": ["area1"],
           "recurringIssues": ["issue1"]
         }`;

    const response = await fetch(`${backendUrl}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        prompt,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      logger.warn("[summarizeWithAI] Backend error:", response.status);
      return null;
    }

    const data = await response.json();
    const content = data.response || data.content || "";

    // JSON 파싱 시도
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as ConversationSummary;
    }

    return null;
  } catch (error) {
    logger.error("[summarizeWithAI] Error:", error);
    return null;
  }
}

/**
 * 여러 세션을 통합한 장기 기억 요약 생성
 * PersonaMemory에 저장할 semantic summary 생성
 */
export type LongTermMemory = {
  userProfile: string;          // 사용자 성격/성향 요약
  coreThemes: string[];         // 핵심 관심사
  journeyNarrative: string;     // 상담 여정 서술
  progressNotes: string[];      // 성장/변화 기록
  futureGoals: string[];        // 미래 목표/희망
  consultationStyle: string;    // 상담 스타일 선호
};

/**
 * 세션 요약들을 통합하여 장기 기억 생성
 */
export function buildLongTermMemory(
  sessions: Array<{
    summary: string | null;
    keyTopics: string[] | null;
    theme: string;
    updatedAt: Date;
  }>,
  personaMemory: {
    dominantThemes?: string[] | null;
    keyInsights?: string[] | null;
    emotionalTone?: string | null;
    growthAreas?: string[] | null;
    recurringIssues?: string[] | null;
    sessionCount?: number;
  } | null,
  locale: string = "ko"
): LongTermMemory {
  const themes = new Set<string>();
  const allTopics: string[] = [];
  const summaries: string[] = [];

  // 세션에서 정보 수집
  for (const session of sessions) {
    if (session.theme) themes.add(session.theme);
    if (session.keyTopics) allTopics.push(...session.keyTopics);
    if (session.summary) summaries.push(session.summary);
  }

  // PersonaMemory에서 추가 정보
  const dominantThemes = (personaMemory?.dominantThemes as string[]) || [];
  const insights = (personaMemory?.keyInsights as string[]) || [];
  const growthAreas = (personaMemory?.growthAreas as string[]) || [];
  const recurringIssues = (personaMemory?.recurringIssues as string[]) || [];
  const emotionalTone = personaMemory?.emotionalTone || "neutral";
  const sessionCount = personaMemory?.sessionCount || 0;

  // 핵심 테마 (중복 제거, 빈도순)
  const topicCounts = countTopicOccurrences([...allTopics, ...dominantThemes]);
  const coreThemes = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);

  // 사용자 프로필 요약
  const userProfile = locale === "ko"
    ? `${sessionCount}회 상담 경험. 감정 상태: ${emotionalTone}. 성장 관심: ${growthAreas.slice(0, 2).join(", ") || "탐색 중"}.`
    : `${sessionCount} sessions. Emotional state: ${emotionalTone}. Growth focus: ${growthAreas.slice(0, 2).join(", ") || "exploring"}.`;

  // 상담 여정 서술
  const journeyNarrative = summaries.length > 0
    ? (locale === "ko"
        ? `최근 상담: ${summaries.slice(0, 3).join(" → ")}`
        : `Recent consultations: ${summaries.slice(0, 3).join(" → ")}`)
    : (locale === "ko" ? "첫 상담 시작" : "Starting consultation journey");

  // 성장/진행 노트
  const progressNotes = insights.slice(0, 3);

  // 미래 목표 (테마에서 추론)
  const futureGoals = locale === "ko"
    ? coreThemes.map(t => themeToGoal(t, "ko"))
    : coreThemes.map(t => themeToGoal(t, "en"));

  // 상담 스타일
  const consultationStyle = locale === "ko"
    ? `주요 관심사: ${[...themes].slice(0, 3).join(", ") || "다양함"}. 반복 이슈: ${recurringIssues.slice(0, 2).join(", ") || "없음"}.`
    : `Main interests: ${[...themes].slice(0, 3).join(", ") || "various"}. Recurring issues: ${recurringIssues.slice(0, 2).join(", ") || "none"}.`;

  return {
    userProfile,
    coreThemes,
    journeyNarrative,
    progressNotes,
    futureGoals: futureGoals.filter(Boolean) as string[],
    consultationStyle,
  };
}

/**
 * 테마를 목표로 변환
 */
function themeToGoal(theme: string, locale: string): string {
  const goals: Record<string, { ko: string; en: string }> = {
    love: { ko: "행복한 관계 형성", en: "Build fulfilling relationships" },
    career: { ko: "커리어 성장", en: "Career growth" },
    health: { ko: "건강한 삶", en: "Healthy living" },
    wealth: { ko: "재정적 안정", en: "Financial stability" },
    life: { ko: "인생 방향 찾기", en: "Find life direction" },
    marriage: { ko: "결혼 준비", en: "Prepare for marriage" },
    family: { ko: "가족 관계 개선", en: "Improve family relations" },
  };

  return goals[theme]?.[locale as "ko" | "en"] || "";
}

/**
 * 토픽 출현 횟수 계산
 */
function countTopicOccurrences(topics: string[]): Record<string, number> {
  return topics.reduce((acc, topic) => {
    if (topic) {
      acc[topic] = (acc[topic] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
}

/**
 * 장기 기억을 프롬프트 문자열로 변환
 */
export function longTermMemoryToPrompt(memory: LongTermMemory, locale: string = "ko"): string {
  const parts: string[] = [];

  if (memory.userProfile) {
    parts.push(locale === "ko" ? `[프로필] ${memory.userProfile}` : `[Profile] ${memory.userProfile}`);
  }

  if (memory.coreThemes.length > 0) {
    parts.push(locale === "ko"
      ? `[핵심 관심사] ${memory.coreThemes.join(", ")}`
      : `[Core Interests] ${memory.coreThemes.join(", ")}`);
  }

  if (memory.journeyNarrative) {
    parts.push(locale === "ko" ? `[상담 여정] ${memory.journeyNarrative}` : `[Journey] ${memory.journeyNarrative}`);
  }

  if (memory.progressNotes.length > 0) {
    parts.push(locale === "ko"
      ? `[인사이트] ${memory.progressNotes.join("; ")}`
      : `[Insights] ${memory.progressNotes.join("; ")}`);
  }

  if (memory.futureGoals.length > 0) {
    parts.push(locale === "ko"
      ? `[목표] ${memory.futureGoals.join(", ")}`
      : `[Goals] ${memory.futureGoals.join(", ")}`);
  }

  return parts.join("\n");
}

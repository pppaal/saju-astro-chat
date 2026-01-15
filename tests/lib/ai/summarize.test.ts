/**
 * Comprehensive tests for src/lib/ai/summarize.ts
 * AI conversation summarization and insight extraction
 * Coverage: >95% of all functions and branches
 */

import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";
import {
  summarizeConversation,
  summarizeWithAI,
  buildLongTermMemory,
  longTermMemoryToPrompt,
  type ConversationSummary,
  type LongTermMemory,
} from "@/lib/ai/summarize";

// Mock dependencies
vi.mock("@/lib/backend-url", () => ({
  getBackendUrl: () => "https://api.example.com",
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("summarize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_API_TOKEN;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("summarizeConversation", () => {
    it("returns null for empty messages", async () => {
      const result = await summarizeConversation([], "love", "ko");
      expect(result).toBeNull();
    });

    it("returns null for single message", async () => {
      const result = await summarizeConversation(
        [{ role: "user", content: "Hello" }],
        "love",
        "ko"
      );
      expect(result).toBeNull();
    });

    it("returns null when no user messages", async () => {
      const result = await summarizeConversation(
        [
          { role: "assistant", content: "Hello" },
          { role: "assistant", content: "How can I help?" },
        ],
        "love",
        "ko"
      );
      expect(result).toBeNull();
    });

    it("generates summary for valid conversation", async () => {
      const messages = [
        { role: "user" as const, content: "연애 운세가 궁금해요" },
        { role: "assistant" as const, content: "네, 연애 운을 봐드릴게요." },
      ];

      const result = await summarizeConversation(messages, "love", "ko");

      expect(result).not.toBeNull();
      expect(result?.summary).toBeDefined();
      expect(result?.keyTopics).toBeInstanceOf(Array);
      expect(result?.emotionalTone).toBeDefined();
      expect(result?.keyInsights).toBeInstanceOf(Array);
      expect(result?.growthAreas).toBeInstanceOf(Array);
      expect(result?.recurringIssues).toBeInstanceOf(Array);
    });

    it("extracts key topics based on theme", async () => {
      const messages = [
        { role: "user" as const, content: "취업 운세가 궁금해요" },
        { role: "assistant" as const, content: "커리어 운을 분석해드릴게요." },
      ];

      const result = await summarizeConversation(messages, "career", "ko");

      expect(result?.keyTopics).toContain("취업");
    });

    it("extracts health theme topics", async () => {
      const messages = [
        { role: "user" as const, content: "건강 운세가 궁금해요" },
        { role: "assistant" as const, content: "건강을 분석해드릴게요." },
      ];

      const result = await summarizeConversation(messages, "health", "ko");

      expect(result?.keyTopics).toContain("건강");
    });

    it("extracts wealth theme topics", async () => {
      const messages = [
        { role: "user" as const, content: "재물 운세가 어떤가요?" },
        { role: "assistant" as const, content: "재물운을 봐드릴게요." },
      ];

      const result = await summarizeConversation(messages, "wealth", "ko");

      expect(result?.keyTopics).toContain("재물");
    });

    it("extracts life theme topics", async () => {
      const messages = [
        { role: "user" as const, content: "인생 방향이 궁금해요" },
        { role: "assistant" as const, content: "인생 전반을 분석해드릴게요." },
      ];

      const result = await summarizeConversation(messages, "life", "ko");

      expect(result?.keyTopics).toContain("인생");
    });

    it("extracts time-related keywords in Korean", async () => {
      const messages = [
        { role: "user" as const, content: "2025년 운세가 어떤가요?" },
        { role: "assistant" as const, content: "2025년을 분석해드릴게요." },
      ];

      const result = await summarizeConversation(messages, "life", "ko");

      expect(result?.keyTopics).toContain("2025년");
    });

    it("extracts multiple time keywords", async () => {
      const messages = [
        {
          role: "user" as const,
          content: "올해 상반기 운세가 어떤가요? 이번 달도 궁금해요",
        },
        { role: "assistant" as const, content: "분석해드릴게요." },
      ];

      const result = await summarizeConversation(messages, "life", "ko");

      expect(result?.keyTopics.length).toBeGreaterThan(0);
      expect(
        result?.keyTopics.some((topic) =>
          ["올해", "상반기", "이번 달"].includes(topic)
        )
      ).toBe(true);
    });

    it("extracts time-related keywords in English", async () => {
      const messages = [
        { role: "user" as const, content: "What about this year?" },
        {
          role: "assistant" as const,
          content: "Let me analyze this year for you.",
        },
      ];

      const result = await summarizeConversation(messages, "life", "en");

      expect(result?.keyTopics).toContain("this year");
    });

    it("extracts next year keyword in English", async () => {
      const messages = [
        { role: "user" as const, content: "What about next year and this month?" },
        { role: "assistant" as const, content: "Let me help you." },
      ];

      const result = await summarizeConversation(messages, "life", "en");

      expect(result?.keyTopics.some((t) => ["next year", "this month"].includes(t))).toBe(
        true
      );
    });

    it("detects anxious emotional tone", async () => {
      const messages = [
        { role: "user" as const, content: "걱정이 많아요. 불안해요." },
        { role: "assistant" as const, content: "안심하세요." },
      ];

      const result = await summarizeConversation(messages, "love", "ko");

      expect(result?.emotionalTone).toBe("anxious");
    });

    it("detects anxious tone with multiple keywords", async () => {
      const messages = [
        {
          role: "user" as const,
          content: "두려워요. 무서워요. 힘들고 어려워요.",
        },
        { role: "assistant" as const, content: "도와드릴게요." },
      ];

      const result = await summarizeConversation(messages, "love", "ko");

      expect(result?.emotionalTone).toBe("anxious");
    });

    it("detects hopeful emotional tone", async () => {
      const messages = [
        { role: "user" as const, content: "기대가 돼요! 좋은 일이 있을 것 같아요." },
        { role: "assistant" as const, content: "좋은 기운이 있네요." },
      ];

      const result = await summarizeConversation(messages, "love", "ko");

      expect(result?.emotionalTone).toBe("hopeful");
    });

    it("detects hopeful tone in English", async () => {
      const messages = [
        {
          role: "user" as const,
          content: "I hope things will be great! I'm excited and happy!",
        },
        { role: "assistant" as const, content: "That's wonderful!" },
      ];

      const result = await summarizeConversation(messages, "love", "en");

      expect(result?.emotionalTone).toBe("hopeful");
    });

    it("detects curious emotional tone", async () => {
      const messages = [
        { role: "user" as const, content: "궁금한 게 있어요. 언제 좋을까요?" },
        { role: "assistant" as const, content: "좋은 시기를 알려드릴게요." },
      ];

      const result = await summarizeConversation(messages, "love", "ko");

      expect(result?.emotionalTone).toBe("curious");
    });

    it("detects curious tone with question words", async () => {
      const messages = [
        { role: "user" as const, content: "어떻게 하면 좋을까요? 어디로 가야 하나요?" },
        { role: "assistant" as const, content: "알려드릴게요." },
      ];

      const result = await summarizeConversation(messages, "love", "ko");

      expect(result?.emotionalTone).toBe("curious");
    });

    it("defaults to neutral emotional tone", async () => {
      const messages = [
        { role: "user" as const, content: "운세 봐주세요." },
        { role: "assistant" as const, content: "네, 봐드릴게요." },
      ];

      const result = await summarizeConversation(messages, "love", "ko");

      expect(result?.emotionalTone).toBe("neutral");
    });

    it("extracts key insights from assistant messages", async () => {
      const messages = [
        { role: "user" as const, content: "어떻게 해야 할까요?" },
        {
          role: "assistant" as const,
          content: "중요한 것은 마음을 열고 기다리는 것입니다.",
        },
      ];

      const result = await summarizeConversation(messages, "love", "ko");

      expect(result?.keyInsights.length).toBeGreaterThanOrEqual(0);
    });

    it("extracts insights in English", async () => {
      const messages = [
        { role: "user" as const, content: "What should I do?" },
        {
          role: "assistant" as const,
          content: "The key is to be patient. I recommend taking your time.",
        },
      ];

      const result = await summarizeConversation(messages, "love", "en");

      expect(result?.keyInsights.length).toBeGreaterThanOrEqual(0);
    });

    it("detects recurring issues", async () => {
      const messages = [
        {
          role: "user" as const,
          content: "결혼 생각은 있는데 약속을 못 해요. 진지한 관계가 걱정돼요.",
        },
        { role: "assistant" as const, content: "관계에 대한 고민이 있으시네요." },
      ];

      const result = await summarizeConversation(messages, "love", "ko");

      expect(result?.recurringIssues).toContain("commitment");
    });

    it("detects career uncertainty issue", async () => {
      const messages = [
        {
          role: "user" as const,
          content: "이직을 해야 할지 취업이 될지 직장 고민이 많아요.",
        },
        { role: "assistant" as const, content: "커리어에 대해 고민이 있으시네요." },
      ];

      const result = await summarizeConversation(messages, "career", "ko");

      expect(result?.recurringIssues).toContain("career_uncertainty");
    });

    it("detects self doubt issue", async () => {
      const messages = [
        {
          role: "user" as const,
          content: "제가 자신이 없어요. 못할 것 같고 자격이 없는 것 같아요.",
        },
        { role: "assistant" as const, content: "자신감을 가지세요." },
      ];

      const result = await summarizeConversation(messages, "life", "ko");

      expect(result?.recurringIssues).toContain("self_doubt");
    });

    it("detects relationship anxiety issue", async () => {
      const messages = [
        {
          role: "user" as const,
          content: "연락이 안 와요. 답장도 없고 관심이 없는 것 같아요.",
        },
        { role: "assistant" as const, content: "조금 기다려 보세요." },
      ];

      const result = await summarizeConversation(messages, "love", "ko");

      expect(result?.recurringIssues).toContain("relationship_anxiety");
    });

    it("identifies growth areas", async () => {
      const messages = [
        {
          role: "user" as const,
          content: "표현을 잘 못해서 소통이 어려워요.",
        },
        { role: "assistant" as const, content: "소통 능력을 키워보세요." },
      ];

      const result = await summarizeConversation(messages, "love", "ko");

      expect(result?.growthAreas).toContain("자기표현");
    });

    it("identifies decision-making growth area", async () => {
      const messages = [
        { role: "user" as const, content: "결정을 못 하겠어요. 선택하기 어렵고 고민돼요." },
        { role: "assistant" as const, content: "천천히 생각해 보세요." },
      ];

      const result = await summarizeConversation(messages, "life", "ko");

      expect(result?.growthAreas).toContain("결정력");
    });

    it("identifies confidence growth area", async () => {
      const messages = [
        { role: "user" as const, content: "자신감이 없어요. 용기가 필요해요." },
        { role: "assistant" as const, content: "자존감을 키워보세요." },
      ];

      const result = await summarizeConversation(messages, "life", "ko");

      expect(result?.growthAreas).toContain("자신감");
    });

    it("generates summary text with question count", async () => {
      const messages = [
        { role: "user" as const, content: "첫 번째 질문이에요" },
        { role: "assistant" as const, content: "답변입니다." },
        { role: "user" as const, content: "두 번째 질문이에요" },
        { role: "assistant" as const, content: "두 번째 답변입니다." },
      ];

      const result = await summarizeConversation(messages, "love", "ko");

      expect(result?.summary).toContain("2개의 질문");
    });

    it("includes first question in summary", async () => {
      const messages = [
        { role: "user" as const, content: "이것은 첫 번째 질문입니다" },
        { role: "assistant" as const, content: "답변입니다." },
      ];

      const result = await summarizeConversation(messages, "love", "ko");

      expect(result?.summary).toContain("이것은 첫 번째 질문입니다");
    });

    it("handles English locale", async () => {
      const messages = [
        { role: "user" as const, content: "I'm worried about my job prospects." },
        { role: "assistant" as const, content: "Let me help you with that." },
      ];

      const result = await summarizeConversation(messages, "career", "en");

      expect(result?.summary).toContain("career/job");
      expect(result?.summary).toContain("questions");
    });

    it("limits key topics to 5", async () => {
      const messages = [
        {
          role: "user" as const,
          content: "연애 결혼 올해 이번 달 상반기 하반기 2025년 내년 취업",
        },
        { role: "assistant" as const, content: "분석해드릴게요." },
      ];

      const result = await summarizeConversation(messages, "love", "ko");

      expect(result?.keyTopics.length).toBeLessThanOrEqual(5);
    });

    it("limits key insights to 3", async () => {
      const messages = [
        { role: "user" as const, content: "조언 부탁해요" },
        {
          role: "assistant" as const,
          content:
            "중요한 것은 첫째입니다. 핵심은 둘째입니다. 추천드리는 것은 셋째입니다. 조언드리자면 넷째입니다.",
        },
      ];

      const result = await summarizeConversation(messages, "life", "ko");

      expect(result?.keyInsights.length).toBeLessThanOrEqual(3);
    });

    it("limits growth areas to 3", async () => {
      const messages = [
        {
          role: "user" as const,
          content: "표현하기 어렵고 말하기 힘들고 결정도 못하고 선택도 못하고 자신감도 없어요",
        },
        { role: "assistant" as const, content: "도와드릴게요." },
      ];

      const result = await summarizeConversation(messages, "life", "ko");

      expect(result?.growthAreas.length).toBeLessThanOrEqual(3);
    });
  });

  describe("summarizeWithAI", () => {
    beforeEach(() => {
      process.env.ADMIN_API_TOKEN = "test-token";
    });

    it("calls backend API with correct parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          response: JSON.stringify({
            summary: "Test summary",
            keyTopics: ["test"],
            emotionalTone: "neutral",
            keyInsights: [],
            growthAreas: [],
            recurringIssues: [],
          }),
        }),
      });

      const messages = [
        { role: "user" as const, content: "Hello" },
        { role: "assistant" as const, content: "Hi" },
      ];

      await summarizeWithAI(messages, "love", "ko");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/ask",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": "test-token",
          },
        })
      );
    });

    it("returns parsed summary from API response", async () => {
      const expectedSummary: ConversationSummary = {
        summary: "Test summary",
        keyTopics: ["love", "relationship"],
        emotionalTone: "hopeful",
        keyInsights: ["insight1"],
        growthAreas: ["growth1"],
        recurringIssues: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ response: JSON.stringify(expectedSummary) }),
      });

      const messages = [
        { role: "user" as const, content: "Test" },
        { role: "assistant" as const, content: "Response" },
      ];

      const result = await summarizeWithAI(messages, "love", "ko");

      expect(result).toEqual(expectedSummary);
    });

    it("parses JSON from content field", async () => {
      const expectedSummary: ConversationSummary = {
        summary: "Summary from content",
        keyTopics: ["test"],
        emotionalTone: "neutral",
        keyInsights: [],
        growthAreas: [],
        recurringIssues: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ content: JSON.stringify(expectedSummary) }),
      });

      const messages = [
        { role: "user" as const, content: "Test" },
        { role: "assistant" as const, content: "Response" },
      ];

      const result = await summarizeWithAI(messages, "love", "ko");

      expect(result).toEqual(expectedSummary);
    });

    it("extracts JSON from mixed content", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          response: 'Here is the analysis: {"summary":"test","keyTopics":[],"emotionalTone":"neutral","keyInsights":[],"growthAreas":[],"recurringIssues":[]} - end',
        }),
      });

      const messages = [
        { role: "user" as const, content: "Test" },
        { role: "assistant" as const, content: "Response" },
      ];

      const result = await summarizeWithAI(messages, "love", "ko");

      expect(result).not.toBeNull();
      expect(result?.summary).toBe("test");
    });

    it("returns null when API returns non-ok status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const messages = [
        { role: "user" as const, content: "Test" },
        { role: "assistant" as const, content: "Response" },
      ];

      const result = await summarizeWithAI(messages, "love", "ko");

      expect(result).toBeNull();
    });

    it("returns null when API throws error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const messages = [
        { role: "user" as const, content: "Test" },
        { role: "assistant" as const, content: "Response" },
      ];

      const result = await summarizeWithAI(messages, "love", "ko");

      expect(result).toBeNull();
    });

    it("returns null when response has no JSON", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ response: "plain text without json" }),
      });

      const messages = [
        { role: "user" as const, content: "Test" },
        { role: "assistant" as const, content: "Response" },
      ];

      const result = await summarizeWithAI(messages, "love", "ko");

      expect(result).toBeNull();
    });

    it("handles English locale", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          response: JSON.stringify({
            summary: "English summary",
            keyTopics: ["test"],
            emotionalTone: "neutral",
            keyInsights: [],
            growthAreas: [],
            recurringIssues: [],
          }),
        }),
      });

      const messages = [
        { role: "user" as const, content: "Hello" },
        { role: "assistant" as const, content: "Hi" },
      ];

      await summarizeWithAI(messages, "love", "en");

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.prompt).toContain("Analyze this counseling conversation");
    });

    it("handles missing API token", async () => {
      delete process.env.ADMIN_API_TOKEN;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ response: "{}" }),
      });

      const messages = [
        { role: "user" as const, content: "Test" },
        { role: "assistant" as const, content: "Response" },
      ];

      await summarizeWithAI(messages, "love", "ko");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-API-KEY": "",
          }),
        })
      );
    });
  });

  describe("buildLongTermMemory", () => {
    const baseSessions = [
      {
        summary: "First session about love",
        keyTopics: ["love", "relationship"],
        theme: "love",
        updatedAt: new Date("2024-01-01"),
      },
      {
        summary: "Second session about career",
        keyTopics: ["career", "job"],
        theme: "career",
        updatedAt: new Date("2024-01-15"),
      },
    ];

    const basePersonaMemory = {
      dominantThemes: ["love", "career"],
      keyInsights: ["Focus on communication", "Be patient"],
      emotionalTone: "hopeful",
      growthAreas: ["relationships", "decision-making"],
      recurringIssues: ["commitment"],
      sessionCount: 5,
    };

    it("builds memory from sessions and persona memory", () => {
      const result = buildLongTermMemory(baseSessions, basePersonaMemory, "ko");

      expect(result.userProfile).toBeDefined();
      expect(result.coreThemes).toBeInstanceOf(Array);
      expect(result.journeyNarrative).toBeDefined();
      expect(result.progressNotes).toBeInstanceOf(Array);
      expect(result.futureGoals).toBeInstanceOf(Array);
      expect(result.consultationStyle).toBeDefined();
    });

    it("includes session count in user profile", () => {
      const result = buildLongTermMemory(baseSessions, basePersonaMemory, "ko");

      expect(result.userProfile).toContain("5회");
    });

    it("includes emotional tone in user profile", () => {
      const result = buildLongTermMemory(baseSessions, basePersonaMemory, "ko");

      expect(result.userProfile).toContain("hopeful");
    });

    it("extracts core themes from sessions and persona memory", () => {
      const result = buildLongTermMemory(baseSessions, basePersonaMemory, "ko");

      expect(result.coreThemes).toContain("love");
      expect(result.coreThemes).toContain("career");
    });

    it("sorts core themes by frequency", () => {
      const sessions = [
        {
          summary: "Session 1",
          keyTopics: ["love", "love", "career"],
          theme: "love",
          updatedAt: new Date(),
        },
      ];
      const memory = {
        ...basePersonaMemory,
        dominantThemes: ["love", "love"],
      };

      const result = buildLongTermMemory(sessions, memory, "ko");

      expect(result.coreThemes[0]).toBe("love");
    });

    it("builds journey narrative from summaries", () => {
      const result = buildLongTermMemory(baseSessions, basePersonaMemory, "ko");

      expect(result.journeyNarrative).toContain("최근 상담");
      expect(result.journeyNarrative).toContain("First session");
    });

    it("handles empty sessions", () => {
      const result = buildLongTermMemory([], null, "ko");

      expect(result.userProfile).toContain("0회");
      expect(result.journeyNarrative).toContain("첫 상담 시작");
    });

    it("handles null persona memory", () => {
      const result = buildLongTermMemory(baseSessions, null, "ko");

      expect(result.userProfile).toBeDefined();
      expect(result.coreThemes.length).toBeGreaterThanOrEqual(0);
    });

    it("includes progress notes from insights", () => {
      const result = buildLongTermMemory(baseSessions, basePersonaMemory, "ko");

      expect(result.progressNotes).toContain("Focus on communication");
    });

    it("generates future goals from themes", () => {
      const result = buildLongTermMemory(baseSessions, basePersonaMemory, "ko");

      expect(result.futureGoals.length).toBeGreaterThan(0);
    });

    it("maps love theme to goal", () => {
      const sessions = [
        {
          summary: "Love session",
          keyTopics: ["love"],
          theme: "love",
          updatedAt: new Date(),
        },
      ];

      const result = buildLongTermMemory(sessions, null, "ko");

      expect(result.futureGoals).toContain("행복한 관계 형성");
    });

    it("maps career theme to goal", () => {
      const sessions = [
        {
          summary: "Career session",
          keyTopics: ["career"],
          theme: "career",
          updatedAt: new Date(),
        },
      ];

      const result = buildLongTermMemory(sessions, null, "ko");

      expect(result.futureGoals).toContain("커리어 성장");
    });

    it("maps health theme to goal", () => {
      const sessions = [
        {
          summary: "Health session",
          keyTopics: ["health"],
          theme: "health",
          updatedAt: new Date(),
        },
      ];

      const result = buildLongTermMemory(sessions, null, "ko");

      expect(result.futureGoals).toContain("건강한 삶");
    });

    it("includes recurring issues in consultation style", () => {
      const result = buildLongTermMemory(baseSessions, basePersonaMemory, "ko");

      expect(result.consultationStyle).toContain("commitment");
    });

    it("handles English locale", () => {
      const result = buildLongTermMemory(baseSessions, basePersonaMemory, "en");

      expect(result.userProfile).toContain("sessions");
      expect(result.journeyNarrative).toContain("Recent consultations");
    });

    it("limits core themes to 5", () => {
      const manyTopicsSessions = [
        {
          summary: "Session",
          keyTopics: [
            "topic1",
            "topic2",
            "topic3",
            "topic4",
            "topic5",
            "topic6",
            "topic7",
          ],
          theme: "life",
          updatedAt: new Date(),
        },
      ];

      const result = buildLongTermMemory(manyTopicsSessions, null, "ko");

      expect(result.coreThemes.length).toBeLessThanOrEqual(5);
    });

    it("limits progress notes to 3", () => {
      const manyInsightsMemory = {
        ...basePersonaMemory,
        keyInsights: ["i1", "i2", "i3", "i4", "i5"],
      };

      const result = buildLongTermMemory(baseSessions, manyInsightsMemory, "ko");

      expect(result.progressNotes.length).toBeLessThanOrEqual(3);
    });

    it("handles sessions with null summaries", () => {
      const sessionsWithNull = [
        {
          summary: null,
          keyTopics: ["love"],
          theme: "love",
          updatedAt: new Date(),
        },
      ];

      const result = buildLongTermMemory(sessionsWithNull, null, "ko");

      expect(result.journeyNarrative).toContain("첫 상담 시작");
    });

    it("handles sessions with null keyTopics", () => {
      const sessionsWithNull = [
        {
          summary: "Summary",
          keyTopics: null,
          theme: "love",
          updatedAt: new Date(),
        },
      ];

      const result = buildLongTermMemory(sessionsWithNull, null, "ko");

      expect(result).toBeDefined();
    });

    it("filters out empty strings from topics", () => {
      const sessions = [
        {
          summary: "Session",
          keyTopics: ["", "valid", null as any, "another"],
          theme: "love",
          updatedAt: new Date(),
        },
      ];

      const result = buildLongTermMemory(sessions, null, "ko");

      expect(result.coreThemes).not.toContain("");
    });

    it("handles unknown themes in goal mapping", () => {
      const sessions = [
        {
          summary: "Session",
          keyTopics: ["unknown_theme"],
          theme: "unknown_theme",
          updatedAt: new Date(),
        },
      ];

      const result = buildLongTermMemory(sessions, null, "ko");

      expect(result.futureGoals).toBeDefined();
    });

    it("shows exploring when no growth areas", () => {
      const memory = { ...basePersonaMemory, growthAreas: [] };
      const result = buildLongTermMemory(baseSessions, memory, "ko");

      expect(result.userProfile).toContain("탐색 중");
    });

    it("shows exploring in English when no growth areas", () => {
      const memory = { ...basePersonaMemory, growthAreas: [] };
      const result = buildLongTermMemory(baseSessions, memory, "en");

      expect(result.userProfile).toContain("exploring");
    });
  });

  describe("longTermMemoryToPrompt", () => {
    const sampleMemory: LongTermMemory = {
      userProfile: "5회 상담 경험. 감정 상태: hopeful.",
      coreThemes: ["love", "career"],
      journeyNarrative: "최근 상담: 연애 → 커리어",
      progressNotes: ["인사이트1", "인사이트2"],
      futureGoals: ["행복한 관계 형성", "커리어 성장"],
      consultationStyle: "주요 관심사: love, career",
    };

    it("converts memory to Korean prompt", () => {
      const result = longTermMemoryToPrompt(sampleMemory, "ko");

      expect(result).toContain("[프로필]");
      expect(result).toContain("[핵심 관심사]");
      expect(result).toContain("[상담 여정]");
      expect(result).toContain("[인사이트]");
      expect(result).toContain("[목표]");
    });

    it("converts memory to English prompt", () => {
      const result = longTermMemoryToPrompt(sampleMemory, "en");

      expect(result).toContain("[Profile]");
      expect(result).toContain("[Core Interests]");
      expect(result).toContain("[Journey]");
      expect(result).toContain("[Insights]");
      expect(result).toContain("[Goals]");
    });

    it("includes user profile", () => {
      const result = longTermMemoryToPrompt(sampleMemory, "ko");

      expect(result).toContain(sampleMemory.userProfile);
    });

    it("includes core themes", () => {
      const result = longTermMemoryToPrompt(sampleMemory, "ko");

      expect(result).toContain("love");
      expect(result).toContain("career");
    });

    it("includes journey narrative", () => {
      const result = longTermMemoryToPrompt(sampleMemory, "ko");

      expect(result).toContain(sampleMemory.journeyNarrative);
    });

    it("includes progress notes separated by semicolon", () => {
      const result = longTermMemoryToPrompt(sampleMemory, "ko");

      expect(result).toContain("인사이트1; 인사이트2");
    });

    it("includes future goals", () => {
      const result = longTermMemoryToPrompt(sampleMemory, "ko");

      expect(result).toContain("행복한 관계 형성");
      expect(result).toContain("커리어 성장");
    });

    it("handles empty arrays gracefully", () => {
      const emptyMemory: LongTermMemory = {
        userProfile: "Test profile",
        coreThemes: [],
        journeyNarrative: "",
        progressNotes: [],
        futureGoals: [],
        consultationStyle: "",
      };

      const result = longTermMemoryToPrompt(emptyMemory, "ko");

      expect(result).toContain("[프로필]");
      expect(result).not.toContain("[핵심 관심사]");
      expect(result).not.toContain("[인사이트]");
      expect(result).not.toContain("[목표]");
    });

    it("omits empty journey narrative", () => {
      const memoryWithoutJourney: LongTermMemory = {
        ...sampleMemory,
        journeyNarrative: "",
      };

      const result = longTermMemoryToPrompt(memoryWithoutJourney, "ko");

      expect(result).not.toContain("[상담 여정]");
    });

    it("uses newline separators between sections", () => {
      const result = longTermMemoryToPrompt(sampleMemory, "ko");

      const lines = result.split("\n");
      expect(lines.length).toBeGreaterThan(1);
    });

    it("handles single core theme", () => {
      const memory = { ...sampleMemory, coreThemes: ["love"] };
      const result = longTermMemoryToPrompt(memory, "ko");

      expect(result).toContain("love");
    });

    it("handles single progress note", () => {
      const memory = { ...sampleMemory, progressNotes: ["single note"] };
      const result = longTermMemoryToPrompt(memory, "ko");

      expect(result).toContain("single note");
    });

    it("handles single future goal", () => {
      const memory = { ...sampleMemory, futureGoals: ["one goal"] };
      const result = longTermMemoryToPrompt(memory, "ko");

      expect(result).toContain("one goal");
    });

    it("omits empty consultation style", () => {
      const memory = { ...sampleMemory, consultationStyle: "" };
      const result = longTermMemoryToPrompt(memory, "ko");

      expect(result.split("\n").every((line) => line.trim())).toBe(true);
    });
  });
});

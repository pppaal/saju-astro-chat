/**
 * Chat History Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 채팅 세션 생성 및 관리
 * - 메시지 저장 및 조회
 * - 페르소나 메모리 관리
 *
 * 실행: npm run test:integration
 * 환경변수 필요: TEST_DATABASE_URL 또는 DATABASE_URL
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from "vitest";
import {
  testPrisma,
  createTestUserInDb,
  cleanupAllTestUsers,
  checkTestDbConnection,
  connectTestDb,
  disconnectTestDb,
} from "./setup";

const hasTestDb = await checkTestDbConnection();

describe("Integration: Chat History System", () => {
  if (!hasTestDb) {
    it("skips when test database is unavailable", () => {
      expect(true).toBe(true);
    });
    return;
  }

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await cleanupAllTestUsers();
    await disconnectTestDb();
  });

  afterEach(async () => {
    await cleanupAllTestUsers();
  });

  describe("Counselor Chat Session", () => {
    it("creates a new chat session with messages", async () => {
      const user = await createTestUserInDb();

      const session = await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          theme: "career",
          messages: [
            { role: "user", content: "직장 운세가 궁금합니다", timestamp: new Date().toISOString() },
            { role: "assistant", content: "2024년 직장 운세를 살펴보겠습니다...", timestamp: new Date().toISOString() },
          ],
          messageCount: 2,
        },
      });

      expect(session).toBeDefined();
      expect(session.userId).toBe(user.id);
      expect(session.theme).toBe("career");
      expect(session.messageCount).toBe(2);
    });

    it("updates session with new messages", async () => {
      const user = await createTestUserInDb();

      const session = await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          theme: "love",
          messages: [{ role: "user", content: "연애 상담 부탁드려요" }],
          messageCount: 1,
        },
      });

      const newMessages = [
        { role: "user", content: "연애 상담 부탁드려요" },
        { role: "assistant", content: "네, 말씀해주세요." },
        { role: "user", content: "최근에 좋아하는 사람이 생겼어요" },
      ];

      const updated = await testPrisma.counselorChatSession.update({
        where: { id: session.id },
        data: {
          messages: newMessages,
          messageCount: 3,
        },
      });

      expect(updated.messageCount).toBe(3);
      const msgs = updated.messages as { role: string }[];
      expect(msgs).toHaveLength(3);
    });

    it("retrieves sessions by theme", async () => {
      const user = await createTestUserInDb();

      await testPrisma.counselorChatSession.create({
        data: { userId: user.id, theme: "career", messages: [] },
      });
      await testPrisma.counselorChatSession.create({
        data: { userId: user.id, theme: "love", messages: [] },
      });
      await testPrisma.counselorChatSession.create({
        data: { userId: user.id, theme: "career", messages: [] },
      });

      const careerSessions = await testPrisma.counselorChatSession.findMany({
        where: { userId: user.id, theme: "career" },
      });

      expect(careerSessions).toHaveLength(2);
    });

    it("stores session summary and key topics", async () => {
      const user = await createTestUserInDb();

      const session = await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          theme: "health",
          messages: [],
          summary: "건강 운세에 대한 상담",
          keyTopics: ["건강", "운동", "식습관"],
        },
      });

      expect(session.summary).toBe("건강 운세에 대한 상담");
      expect(session.keyTopics).toEqual(["건강", "운동", "식습관"]);
    });
  });

  describe("Persona Memory", () => {
    it("creates persona memory for user", async () => {
      const user = await createTestUserInDb();

      const memory = await testPrisma.personaMemory.create({
        data: {
          userId: user.id,
          persona: "counselor",
          memories: [
            { key: "name", value: "홍길동" },
            { key: "concern", value: "career_change" },
          ],
        },
      });

      expect(memory).toBeDefined();
      expect(memory.persona).toBe("counselor");
      const mems = memory.memories as { key: string; value: string }[];
      expect(mems).toHaveLength(2);
    });

    it("updates persona memory", async () => {
      const user = await createTestUserInDb();

      const memory = await testPrisma.personaMemory.create({
        data: {
          userId: user.id,
          persona: "fortune_teller",
          memories: [{ key: "birth_year", value: "1990" }],
        },
      });

      const updated = await testPrisma.personaMemory.update({
        where: { id: memory.id },
        data: {
          memories: [
            { key: "birth_year", value: "1990" },
            { key: "zodiac", value: "horse" },
            { key: "element", value: "metal" },
          ],
        },
      });

      const mems = updated.memories as { key: string }[];
      expect(mems).toHaveLength(3);
    });

    it("retrieves memories by persona type", async () => {
      const user = await createTestUserInDb();

      await testPrisma.personaMemory.create({
        data: { userId: user.id, persona: "counselor", memories: [] },
      });
      await testPrisma.personaMemory.create({
        data: { userId: user.id, persona: "fortune_teller", memories: [] },
      });
      await testPrisma.personaMemory.create({
        data: { userId: user.id, persona: "counselor", memories: [] },
      });

      const counselorMemories = await testPrisma.personaMemory.findMany({
        where: { userId: user.id, persona: "counselor" },
      });

      expect(counselorMemories).toHaveLength(2);
    });
  });

  describe("User Interaction Tracking", () => {
    it("tracks user interaction events", async () => {
      const user = await createTestUserInDb();

      const interaction = await testPrisma.userInteraction.create({
        data: {
          userId: user.id,
          interactionType: "page_view",
          context: { page: "/fortune", duration: 30 },
        },
      });

      expect(interaction).toBeDefined();
      expect(interaction.interactionType).toBe("page_view");
    });

    it("stores multiple interaction types", async () => {
      const user = await createTestUserInDb();

      const types = ["page_view", "button_click", "feature_use", "share"];

      for (const interactionType of types) {
        await testPrisma.userInteraction.create({
          data: {
            userId: user.id,
            interactionType,
            context: { type: interactionType },
          },
        });
      }

      const interactions = await testPrisma.userInteraction.findMany({
        where: { userId: user.id },
      });

      expect(interactions).toHaveLength(4);
    });

    it("retrieves interactions within date range", async () => {
      const user = await createTestUserInDb();

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      await testPrisma.userInteraction.create({
        data: {
          userId: user.id,
          interactionType: "today_action",
          context: {},
          createdAt: now,
        },
      });

      const recentInteractions = await testPrisma.userInteraction.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: yesterday },
        },
      });

      expect(recentInteractions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Section Feedback", () => {
    it("stores section feedback", async () => {
      const user = await createTestUserInDb();

      const feedback = await testPrisma.sectionFeedback.create({
        data: {
          userId: user.id,
          sectionId: "career_overview",
          feedbackType: "helpful",
          rating: 5,
        },
      });

      expect(feedback).toBeDefined();
      expect(feedback.feedbackType).toBe("helpful");
      expect(feedback.rating).toBe(5);
    });

    it("calculates average rating for section", async () => {
      const user = await createTestUserInDb();

      const ratings = [5, 4, 5, 3, 4];
      for (const rating of ratings) {
        await testPrisma.sectionFeedback.create({
          data: {
            userId: user.id,
            sectionId: "love_fortune",
            feedbackType: "rating",
            rating,
          },
        });
      }

      const feedbacks = await testPrisma.sectionFeedback.findMany({
        where: { sectionId: "love_fortune" },
      });

      const avgRating = feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbacks.length;
      expect(avgRating).toBeCloseTo(4.2, 1);
    });

    it("tracks feedback by section", async () => {
      const user = await createTestUserInDb();

      await testPrisma.sectionFeedback.create({
        data: { userId: user.id, sectionId: "section_a", feedbackType: "helpful" },
      });
      await testPrisma.sectionFeedback.create({
        data: { userId: user.id, sectionId: "section_b", feedbackType: "not_helpful" },
      });
      await testPrisma.sectionFeedback.create({
        data: { userId: user.id, sectionId: "section_a", feedbackType: "helpful" },
      });

      const sectionAFeedback = await testPrisma.sectionFeedback.findMany({
        where: { sectionId: "section_a" },
      });

      expect(sectionAFeedback).toHaveLength(2);
    });
  });

  describe("Consultation History", () => {
    it("creates consultation history entry", async () => {
      const user = await createTestUserInDb();

      const history = await testPrisma.consultationHistory.create({
        data: {
          userId: user.id,
          theme: "saju",
          summary: "2024년 사주 상담",
          content: JSON.stringify({
            question: "올해 운세",
            analysis: "금년은 발전의 해...",
          }),
        },
      });

      expect(history).toBeDefined();
      expect(history.theme).toBe("saju");
    });

    it("retrieves consultation history ordered by date", async () => {
      const user = await createTestUserInDb();

      for (let i = 1; i <= 5; i++) {
        await testPrisma.consultationHistory.create({
          data: {
            userId: user.id,
            theme: "tarot",
            summary: `Consultation ${i}`,
            content: JSON.stringify({ order: i }),
          },
        });
      }

      const histories = await testPrisma.consultationHistory.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });

      expect(histories).toHaveLength(5);
      expect(histories[0].summary).toBe("Consultation 5");
    });

    it("filters history by theme", async () => {
      const user = await createTestUserInDb();

      await testPrisma.consultationHistory.create({
        data: { userId: user.id, theme: "saju", summary: "Saju 1", content: "{}" },
      });
      await testPrisma.consultationHistory.create({
        data: { userId: user.id, theme: "tarot", summary: "Tarot 1", content: "{}" },
      });
      await testPrisma.consultationHistory.create({
        data: { userId: user.id, theme: "saju", summary: "Saju 2", content: "{}" },
      });

      const sajuHistory = await testPrisma.consultationHistory.findMany({
        where: { userId: user.id, theme: "saju" },
      });

      expect(sajuHistory).toHaveLength(2);
    });
  });
});

/**
 * Counselor Session Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 상담 세션 생성 및 관리
 * - 세션 메시지 저장
 * - 세션 상태 추적
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

describe("Integration: Counselor Session", () => {
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

  describe("Session Creation", () => {
    it("creates new counselor session", async () => {
      const user = await createTestUserInDb();

      const session = await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          counselorType: "fortune_teller",
          status: "active",
        },
      });

      expect(session.counselorType).toBe("fortune_teller");
      expect(session.status).toBe("active");
    });

    it("creates session with initial context", async () => {
      const user = await createTestUserInDb();

      const session = await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          counselorType: "life_advisor",
          status: "active",
          context: {
            topic: "career",
            userGoal: "직장 이직 상담",
            previousConsultations: 0,
          },
        },
      });

      const context = session.context as { topic: string };
      expect(context.topic).toBe("career");
    });

    it("creates session with messages", async () => {
      const user = await createTestUserInDb();

      const session = await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          counselorType: "tarot_reader",
          status: "active",
          messages: [
            { role: "system", content: "타로 리더 페르소나" },
            { role: "user", content: "오늘의 연애운" },
            { role: "assistant", content: "카드를 뽑겠습니다..." },
          ],
        },
      });

      const messages = session.messages as unknown[];
      expect(messages).toHaveLength(3);
    });

    it("creates multiple sessions for user", async () => {
      const user = await createTestUserInDb();

      const counselors = ["fortune_teller", "tarot_reader", "astrologer"];

      for (const counselorType of counselors) {
        await testPrisma.counselorChatSession.create({
          data: {
            userId: user.id,
            counselorType,
            status: "active",
          },
        });
      }

      const sessions = await testPrisma.counselorChatSession.findMany({
        where: { userId: user.id },
      });

      expect(sessions).toHaveLength(3);
    });
  });

  describe("Session Messages", () => {
    it("adds messages to session", async () => {
      const user = await createTestUserInDb();

      const session = await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          counselorType: "fortune_teller",
          status: "active",
          messages: [],
        },
      });

      const newMessages = [
        { role: "user", content: "안녕하세요" },
        { role: "assistant", content: "무엇을 도와드릴까요?" },
      ];

      const updated = await testPrisma.counselorChatSession.update({
        where: { id: session.id },
        data: { messages: newMessages },
      });

      const messages = updated.messages as unknown[];
      expect(messages).toHaveLength(2);
    });

    it("appends to existing messages", async () => {
      const user = await createTestUserInDb();

      const session = await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          counselorType: "fortune_teller",
          status: "active",
          messages: [
            { role: "user", content: "첫 번째 메시지" },
          ],
        },
      });

      const existingMessages = session.messages as unknown[];

      const updated = await testPrisma.counselorChatSession.update({
        where: { id: session.id },
        data: {
          messages: [
            ...existingMessages,
            { role: "assistant", content: "답변입니다" },
            { role: "user", content: "감사합니다" },
          ],
        },
      });

      const messages = updated.messages as unknown[];
      expect(messages).toHaveLength(3);
    });

    it("stores message with metadata", async () => {
      const user = await createTestUserInDb();

      const session = await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          counselorType: "tarot_reader",
          status: "active",
          messages: [
            {
              role: "assistant",
              content: "카드: The Fool",
              metadata: {
                cardDrawn: "The Fool",
                position: "past",
                timestamp: new Date().toISOString(),
              },
            },
          ],
        },
      });

      const messages = session.messages as Array<{ metadata: { cardDrawn: string } }>;
      expect(messages[0].metadata.cardDrawn).toBe("The Fool");
    });
  });

  describe("Session Status", () => {
    it("updates session status to completed", async () => {
      const user = await createTestUserInDb();

      const session = await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          counselorType: "fortune_teller",
          status: "active",
        },
      });

      const updated = await testPrisma.counselorChatSession.update({
        where: { id: session.id },
        data: {
          status: "completed",
          completedAt: new Date(),
        },
      });

      expect(updated.status).toBe("completed");
      expect(updated.completedAt).not.toBeNull();
    });

    it("updates session status to abandoned", async () => {
      const user = await createTestUserInDb();

      const session = await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          counselorType: "fortune_teller",
          status: "active",
        },
      });

      const updated = await testPrisma.counselorChatSession.update({
        where: { id: session.id },
        data: { status: "abandoned" },
      });

      expect(updated.status).toBe("abandoned");
    });

    it("finds active sessions", async () => {
      const user = await createTestUserInDb();

      const statuses = ["active", "active", "completed", "abandoned", "active"];

      for (let i = 0; i < statuses.length; i++) {
        await testPrisma.counselorChatSession.create({
          data: {
            userId: user.id,
            counselorType: "fortune_teller",
            status: statuses[i],
          },
        });
      }

      const activeSessions = await testPrisma.counselorChatSession.findMany({
        where: { userId: user.id, status: "active" },
      });

      expect(activeSessions).toHaveLength(3);
    });
  });

  describe("Session Retrieval", () => {
    it("retrieves session by id", async () => {
      const user = await createTestUserInDb();

      const session = await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          counselorType: "fortune_teller",
          status: "active",
        },
      });

      const found = await testPrisma.counselorChatSession.findUnique({
        where: { id: session.id },
      });

      expect(found).not.toBeNull();
      expect(found?.counselorType).toBe("fortune_teller");
    });

    it("retrieves sessions by counselor type", async () => {
      const user = await createTestUserInDb();

      const types = ["fortune_teller", "tarot_reader", "fortune_teller", "astrologer"];

      for (const type of types) {
        await testPrisma.counselorChatSession.create({
          data: {
            userId: user.id,
            counselorType: type,
            status: "active",
          },
        });
      }

      const fortuneSessions = await testPrisma.counselorChatSession.findMany({
        where: { userId: user.id, counselorType: "fortune_teller" },
      });

      expect(fortuneSessions).toHaveLength(2);
    });

    it("retrieves recent sessions first", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.counselorChatSession.create({
          data: {
            userId: user.id,
            counselorType: "fortune_teller",
            status: "completed",
            context: { order: i },
          },
        });
      }

      const sessions = await testPrisma.counselorChatSession.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 3,
      });

      const orders = sessions.map((s) => (s.context as { order: number }).order);
      expect(orders).toEqual([4, 3, 2]);
    });

    it("retrieves last active session", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 3; i++) {
        await testPrisma.counselorChatSession.create({
          data: {
            userId: user.id,
            counselorType: "fortune_teller",
            status: i < 2 ? "completed" : "active",
            context: { order: i },
          },
        });
      }

      const activeSession = await testPrisma.counselorChatSession.findFirst({
        where: { userId: user.id, status: "active" },
        orderBy: { createdAt: "desc" },
      });

      const context = activeSession?.context as { order: number };
      expect(context.order).toBe(2);
    });
  });

  describe("Session Statistics", () => {
    it("counts sessions by counselor type", async () => {
      const user = await createTestUserInDb();

      const types = ["fortune_teller", "fortune_teller", "tarot_reader", "fortune_teller"];

      for (const type of types) {
        await testPrisma.counselorChatSession.create({
          data: {
            userId: user.id,
            counselorType: type,
            status: "completed",
          },
        });
      }

      const counts = await testPrisma.counselorChatSession.groupBy({
        by: ["counselorType"],
        where: { userId: user.id },
        _count: { id: true },
      });

      const fortuneCount = counts.find((c) => c.counselorType === "fortune_teller")?._count.id;
      expect(fortuneCount).toBe(3);
    });

    it("counts sessions by status", async () => {
      const user = await createTestUserInDb();

      const statuses = ["active", "completed", "completed", "abandoned", "completed"];

      for (const status of statuses) {
        await testPrisma.counselorChatSession.create({
          data: {
            userId: user.id,
            counselorType: "fortune_teller",
            status,
          },
        });
      }

      const counts = await testPrisma.counselorChatSession.groupBy({
        by: ["status"],
        where: { userId: user.id },
        _count: { id: true },
      });

      const completedCount = counts.find((c) => c.status === "completed")?._count.id;
      expect(completedCount).toBe(3);
    });

    it("calculates average session length", async () => {
      const user = await createTestUserInDb();

      const messageCounts = [5, 10, 15, 8, 12];

      for (const count of messageCounts) {
        const messages = Array(count).fill({ role: "user", content: "test" });
        await testPrisma.counselorChatSession.create({
          data: {
            userId: user.id,
            counselorType: "fortune_teller",
            status: "completed",
            messages,
          },
        });
      }

      const sessions = await testPrisma.counselorChatSession.findMany({
        where: { userId: user.id },
      });

      const avgLength = sessions.reduce((sum, s) => sum + (s.messages as unknown[]).length, 0) / sessions.length;
      expect(avgLength).toBe(10);
    });
  });

  describe("Session Deletion", () => {
    it("deletes single session", async () => {
      const user = await createTestUserInDb();

      const session = await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          counselorType: "fortune_teller",
          status: "completed",
        },
      });

      await testPrisma.counselorChatSession.delete({
        where: { id: session.id },
      });

      const found = await testPrisma.counselorChatSession.findUnique({
        where: { id: session.id },
      });

      expect(found).toBeNull();
    });

    it("deletes old sessions", async () => {
      const user = await createTestUserInDb();
      const now = new Date();

      // Old sessions
      for (let i = 0; i < 3; i++) {
        await testPrisma.counselorChatSession.create({
          data: {
            userId: user.id,
            counselorType: "fortune_teller",
            status: "completed",
            createdAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
          },
        });
      }

      // Recent sessions
      for (let i = 0; i < 2; i++) {
        await testPrisma.counselorChatSession.create({
          data: {
            userId: user.id,
            counselorType: "fortune_teller",
            status: "completed",
            createdAt: now,
          },
        });
      }

      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      await testPrisma.counselorChatSession.deleteMany({
        where: {
          userId: user.id,
          createdAt: { lt: ninetyDaysAgo },
        },
      });

      const remaining = await testPrisma.counselorChatSession.findMany({
        where: { userId: user.id },
      });

      expect(remaining).toHaveLength(2);
    });

    it("deletes all sessions for user", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.counselorChatSession.create({
          data: {
            userId: user.id,
            counselorType: "fortune_teller",
            status: "completed",
          },
        });
      }

      await testPrisma.counselorChatSession.deleteMany({
        where: { userId: user.id },
      });

      const remaining = await testPrisma.counselorChatSession.findMany({
        where: { userId: user.id },
      });

      expect(remaining).toHaveLength(0);
    });
  });

  describe("Session Context Management", () => {
    it("updates session context", async () => {
      const user = await createTestUserInDb();

      const session = await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          counselorType: "fortune_teller",
          status: "active",
          context: { topic: "general" },
        },
      });

      const updated = await testPrisma.counselorChatSession.update({
        where: { id: session.id },
        data: {
          context: {
            topic: "career",
            specificQuestion: "이직 타이밍",
            userMood: "anxious",
          },
        },
      });

      const context = updated.context as { topic: string; specificQuestion: string };
      expect(context.topic).toBe("career");
      expect(context.specificQuestion).toBe("이직 타이밍");
    });

    it("preserves context across updates", async () => {
      const user = await createTestUserInDb();

      const session = await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          counselorType: "fortune_teller",
          status: "active",
          context: { userId: user.id, sessionStart: new Date().toISOString() },
        },
      });

      const existingContext = session.context as Record<string, unknown>;

      const updated = await testPrisma.counselorChatSession.update({
        where: { id: session.id },
        data: {
          context: {
            ...existingContext,
            lastInteraction: new Date().toISOString(),
          },
        },
      });

      const context = updated.context as { userId: string; sessionStart: string };
      expect(context.userId).toBe(user.id);
    });
  });
});

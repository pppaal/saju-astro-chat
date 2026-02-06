/**
 * Support Ticket Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 고객 지원 티켓 관리
 * - 티켓 처리 워크플로우
 * - 응답 및 해결
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

describe("Integration: Support Ticket", () => {
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

  describe("Ticket Creation", () => {
    it("creates support ticket", async () => {
      const user = await createTestUserInDb();

      const ticket = await testPrisma.supportTicket.create({
        data: {
          userId: user.id,
          subject: "결제 관련 문의",
          description: "결제가 완료되었는데 크레딧이 추가되지 않았습니다.",
          category: "payment",
          priority: "high",
          status: "open",
        },
      });

      expect(ticket.category).toBe("payment");
      expect(ticket.status).toBe("open");
    });

    it("creates ticket with attachments", async () => {
      const user = await createTestUserInDb();

      const ticket = await testPrisma.supportTicket.create({
        data: {
          userId: user.id,
          subject: "앱 오류 신고",
          description: "앱이 갑자기 종료됩니다.",
          category: "bug",
          priority: "medium",
          status: "open",
          attachments: [
            { filename: "screenshot1.png", url: "/uploads/screenshot1.png" },
            { filename: "crash_log.txt", url: "/uploads/crash_log.txt" },
          ],
        },
      });

      const attachments = ticket.attachments as { filename: string }[];
      expect(attachments).toHaveLength(2);
    });

    it("creates ticket with device info", async () => {
      const user = await createTestUserInDb();

      const ticket = await testPrisma.supportTicket.create({
        data: {
          userId: user.id,
          subject: "기능 요청",
          description: "다크 모드 지원을 원합니다.",
          category: "feature_request",
          priority: "low",
          status: "open",
          deviceInfo: {
            platform: "ios",
            osVersion: "17.2",
            appVersion: "2.5.0",
            deviceModel: "iPhone 15 Pro",
          },
        },
      });

      const deviceInfo = ticket.deviceInfo as { platform: string };
      expect(deviceInfo.platform).toBe("ios");
    });

    it("creates urgent ticket", async () => {
      const user = await createTestUserInDb();

      const ticket = await testPrisma.supportTicket.create({
        data: {
          userId: user.id,
          subject: "계정 접근 불가",
          description: "로그인이 되지 않습니다.",
          category: "account",
          priority: "urgent",
          status: "open",
        },
      });

      expect(ticket.priority).toBe("urgent");
    });
  });

  describe("Ticket Processing", () => {
    it("assigns ticket to agent", async () => {
      const user = await createTestUserInDb();

      const ticket = await testPrisma.supportTicket.create({
        data: {
          userId: user.id,
          subject: "문의",
          description: "문의 내용",
          category: "general",
          priority: "medium",
          status: "open",
        },
      });

      const updated = await testPrisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: "in_progress",
          assignedTo: "agent_001",
          assignedAt: new Date(),
        },
      });

      expect(updated.status).toBe("in_progress");
      expect(updated.assignedTo).toBe("agent_001");
    });

    it("adds ticket response", async () => {
      const user = await createTestUserInDb();

      const ticket = await testPrisma.supportTicket.create({
        data: {
          userId: user.id,
          subject: "문의",
          description: "문의 내용",
          category: "general",
          priority: "medium",
          status: "in_progress",
          assignedTo: "agent_001",
        },
      });

      const response = await testPrisma.ticketResponse.create({
        data: {
          ticketId: ticket.id,
          responderId: "agent_001",
          responderType: "agent",
          message: "안녕하세요, 문의해 주셔서 감사합니다. 확인 후 답변 드리겠습니다.",
        },
      });

      expect(response.responderType).toBe("agent");
    });

    it("user replies to ticket", async () => {
      const user = await createTestUserInDb();

      const ticket = await testPrisma.supportTicket.create({
        data: {
          userId: user.id,
          subject: "문의",
          description: "문의 내용",
          category: "general",
          priority: "medium",
          status: "in_progress",
        },
      });

      const response = await testPrisma.ticketResponse.create({
        data: {
          ticketId: ticket.id,
          responderId: user.id,
          responderType: "user",
          message: "추가 정보를 보내드립니다.",
        },
      });

      expect(response.responderType).toBe("user");
    });

    it("resolves ticket", async () => {
      const user = await createTestUserInDb();

      const ticket = await testPrisma.supportTicket.create({
        data: {
          userId: user.id,
          subject: "문의",
          description: "문의 내용",
          category: "general",
          priority: "medium",
          status: "in_progress",
        },
      });

      const updated = await testPrisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: "resolved",
          resolvedAt: new Date(),
          resolution: "크레딧이 정상적으로 추가되었습니다.",
        },
      });

      expect(updated.status).toBe("resolved");
    });

    it("closes ticket", async () => {
      const user = await createTestUserInDb();

      const ticket = await testPrisma.supportTicket.create({
        data: {
          userId: user.id,
          subject: "문의",
          description: "문의 내용",
          category: "general",
          priority: "medium",
          status: "resolved",
        },
      });

      const updated = await testPrisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: "closed",
          closedAt: new Date(),
        },
      });

      expect(updated.status).toBe("closed");
    });

    it("reopens ticket", async () => {
      const user = await createTestUserInDb();

      const ticket = await testPrisma.supportTicket.create({
        data: {
          userId: user.id,
          subject: "문의",
          description: "문의 내용",
          category: "general",
          priority: "medium",
          status: "closed",
        },
      });

      const updated = await testPrisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: "reopened",
          reopenedAt: new Date(),
          reopenReason: "문제가 재발했습니다.",
        },
      });

      expect(updated.status).toBe("reopened");
    });
  });

  describe("Ticket Retrieval", () => {
    it("retrieves user tickets", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.supportTicket.create({
          data: {
            userId: user.id,
            subject: `문의 ${i}`,
            description: `내용 ${i}`,
            category: "general",
            priority: "medium",
            status: "open",
          },
        });
      }

      const tickets = await testPrisma.supportTicket.findMany({
        where: { userId: user.id },
      });

      expect(tickets).toHaveLength(5);
    });

    it("retrieves tickets by status", async () => {
      const user = await createTestUserInDb();
      const statuses = ["open", "in_progress", "open", "resolved", "open"];

      for (let i = 0; i < statuses.length; i++) {
        await testPrisma.supportTicket.create({
          data: {
            userId: user.id,
            subject: `문의 ${i}`,
            description: `내용 ${i}`,
            category: "general",
            priority: "medium",
            status: statuses[i],
          },
        });
      }

      const openTickets = await testPrisma.supportTicket.findMany({
        where: { userId: user.id, status: "open" },
      });

      expect(openTickets).toHaveLength(3);
    });

    it("retrieves tickets by category", async () => {
      const user = await createTestUserInDb();
      const categories = ["payment", "bug", "payment", "account", "payment"];

      for (let i = 0; i < categories.length; i++) {
        await testPrisma.supportTicket.create({
          data: {
            userId: user.id,
            subject: `문의 ${i}`,
            description: `내용 ${i}`,
            category: categories[i],
            priority: "medium",
            status: "open",
          },
        });
      }

      const paymentTickets = await testPrisma.supportTicket.findMany({
        where: { userId: user.id, category: "payment" },
      });

      expect(paymentTickets).toHaveLength(3);
    });

    it("retrieves tickets by priority", async () => {
      const user = await createTestUserInDb();
      const priorities = ["low", "medium", "high", "urgent", "high"];

      for (let i = 0; i < priorities.length; i++) {
        await testPrisma.supportTicket.create({
          data: {
            userId: user.id,
            subject: `문의 ${i}`,
            description: `내용 ${i}`,
            category: "general",
            priority: priorities[i],
            status: "open",
          },
        });
      }

      const highPriority = await testPrisma.supportTicket.findMany({
        where: {
          userId: user.id,
          priority: { in: ["high", "urgent"] },
        },
      });

      expect(highPriority).toHaveLength(3);
    });

    it("retrieves ticket with responses", async () => {
      const user = await createTestUserInDb();

      const ticket = await testPrisma.supportTicket.create({
        data: {
          userId: user.id,
          subject: "문의",
          description: "내용",
          category: "general",
          priority: "medium",
          status: "in_progress",
        },
      });

      for (let i = 0; i < 3; i++) {
        await testPrisma.ticketResponse.create({
          data: {
            ticketId: ticket.id,
            responderId: i % 2 === 0 ? "agent_001" : user.id,
            responderType: i % 2 === 0 ? "agent" : "user",
            message: `응답 ${i}`,
          },
        });
      }

      const ticketWithResponses = await testPrisma.supportTicket.findUnique({
        where: { id: ticket.id },
        include: { responses: true },
      });

      expect(ticketWithResponses?.responses).toHaveLength(3);
    });
  });

  describe("Ticket Statistics", () => {
    it("counts tickets by status", async () => {
      const user = await createTestUserInDb();
      const statuses = ["open", "in_progress", "open", "resolved", "closed", "open"];

      for (let i = 0; i < statuses.length; i++) {
        await testPrisma.supportTicket.create({
          data: {
            userId: user.id,
            subject: `문의 ${i}`,
            description: `내용 ${i}`,
            category: "general",
            priority: "medium",
            status: statuses[i],
          },
        });
      }

      const counts = await testPrisma.supportTicket.groupBy({
        by: ["status"],
        where: { userId: user.id },
        _count: { id: true },
      });

      const openCount = counts.find((c) => c.status === "open")?._count.id;
      expect(openCount).toBe(3);
    });

    it("counts tickets by category", async () => {
      const user = await createTestUserInDb();
      const categories = ["payment", "bug", "payment", "feature_request", "payment", "account"];

      for (let i = 0; i < categories.length; i++) {
        await testPrisma.supportTicket.create({
          data: {
            userId: user.id,
            subject: `문의 ${i}`,
            description: `내용 ${i}`,
            category: categories[i],
            priority: "medium",
            status: "open",
          },
        });
      }

      const counts = await testPrisma.supportTicket.groupBy({
        by: ["category"],
        where: { userId: user.id },
        _count: { id: true },
      });

      const paymentCount = counts.find((c) => c.category === "payment")?._count.id;
      expect(paymentCount).toBe(3);
    });

    it("calculates average resolution time", async () => {
      const user = await createTestUserInDb();
      const resolutionTimes = [1, 2, 3, 2, 2]; // hours

      for (let i = 0; i < resolutionTimes.length; i++) {
        const createdAt = new Date();
        const resolvedAt = new Date(createdAt.getTime() + resolutionTimes[i] * 60 * 60 * 1000);

        await testPrisma.supportTicket.create({
          data: {
            userId: user.id,
            subject: `문의 ${i}`,
            description: `내용 ${i}`,
            category: "general",
            priority: "medium",
            status: "resolved",
            createdAt,
            resolvedAt,
          },
        });
      }

      const tickets = await testPrisma.supportTicket.findMany({
        where: { userId: user.id, status: "resolved" },
      });

      const totalHours = tickets.reduce((sum, t) => {
        if (t.resolvedAt && t.createdAt) {
          return sum + (t.resolvedAt.getTime() - t.createdAt.getTime()) / (60 * 60 * 1000);
        }
        return sum;
      }, 0);

      const avgHours = totalHours / tickets.length;
      expect(avgHours).toBe(2);
    });

    it("counts tickets by agent", async () => {
      const user = await createTestUserInDb();
      const agents = ["agent_1", "agent_2", "agent_1", "agent_3", "agent_1", "agent_2"];

      for (let i = 0; i < agents.length; i++) {
        await testPrisma.supportTicket.create({
          data: {
            userId: user.id,
            subject: `문의 ${i}`,
            description: `내용 ${i}`,
            category: "general",
            priority: "medium",
            status: "resolved",
            assignedTo: agents[i],
          },
        });
      }

      const counts = await testPrisma.supportTicket.groupBy({
        by: ["assignedTo"],
        where: { userId: user.id, assignedTo: { not: null } },
        _count: { id: true },
      });

      const agent1Count = counts.find((c) => c.assignedTo === "agent_1")?._count.id;
      expect(agent1Count).toBe(3);
    });
  });

  describe("Customer Satisfaction", () => {
    it("records satisfaction rating", async () => {
      const user = await createTestUserInDb();

      const ticket = await testPrisma.supportTicket.create({
        data: {
          userId: user.id,
          subject: "문의",
          description: "내용",
          category: "general",
          priority: "medium",
          status: "closed",
        },
      });

      const updated = await testPrisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          satisfactionRating: 5,
          satisfactionFeedback: "빠른 응대 감사합니다!",
          ratedAt: new Date(),
        },
      });

      expect(updated.satisfactionRating).toBe(5);
    });

    it("calculates average satisfaction", async () => {
      const user = await createTestUserInDb();
      const ratings = [5, 4, 5, 3, 5]; // avg = 4.4

      for (let i = 0; i < ratings.length; i++) {
        await testPrisma.supportTicket.create({
          data: {
            userId: user.id,
            subject: `문의 ${i}`,
            description: `내용 ${i}`,
            category: "general",
            priority: "medium",
            status: "closed",
            satisfactionRating: ratings[i],
          },
        });
      }

      const tickets = await testPrisma.supportTicket.findMany({
        where: { userId: user.id, satisfactionRating: { not: null } },
      });

      const avgRating = tickets.reduce((sum, t) => sum + (t.satisfactionRating || 0), 0) / tickets.length;
      expect(avgRating).toBe(4.4);
    });
  });

  describe("Ticket Deletion", () => {
    it("deletes ticket", async () => {
      const user = await createTestUserInDb();

      const ticket = await testPrisma.supportTicket.create({
        data: {
          userId: user.id,
          subject: "삭제 테스트",
          description: "내용",
          category: "general",
          priority: "medium",
          status: "closed",
        },
      });

      await testPrisma.supportTicket.delete({
        where: { id: ticket.id },
      });

      const found = await testPrisma.supportTicket.findUnique({
        where: { id: ticket.id },
      });

      expect(found).toBeNull();
    });
  });
});

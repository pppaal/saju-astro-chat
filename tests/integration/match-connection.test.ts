/**
 * Match Connection Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 매치 연결 생성
 * - 연결 상태 관리
 * - 연결 통계
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

describe("Integration: Match Connection", () => {
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

  async function createMatchProfile(userId: string) {
    return testPrisma.matchProfile.create({
      data: {
        userId,
        displayName: `User_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        bio: "Test profile",
        gender: "male",
        birthDate: new Date("1990-01-01"),
        isActive: true,
      },
    });
  }

  describe("Connection Creation", () => {
    it("creates match connection", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      const profile1 = await createMatchProfile(user1.id);
      const profile2 = await createMatchProfile(user2.id);

      const connection = await testPrisma.matchConnection.create({
        data: {
          user1Id: profile1.id,
          user2Id: profile2.id,
          status: "active",
          matchedAt: new Date(),
        },
      });

      expect(connection.status).toBe("active");
      expect(connection.matchedAt).not.toBeNull();
    });

    it("creates connection with compatibility score", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      const profile1 = await createMatchProfile(user1.id);
      const profile2 = await createMatchProfile(user2.id);

      const connection = await testPrisma.matchConnection.create({
        data: {
          user1Id: profile1.id,
          user2Id: profile2.id,
          status: "active",
          matchedAt: new Date(),
          compatibilityScore: 85,
          compatibilityDetails: {
            saju: 88,
            personality: 82,
            interests: 85,
          },
        },
      });

      expect(connection.compatibilityScore).toBe(85);
    });

    it("creates multiple connections for user", async () => {
      const mainUser = await createTestUserInDb();
      const mainProfile = await createMatchProfile(mainUser.id);

      for (let i = 0; i < 5; i++) {
        const other = await createTestUserInDb();
        const otherProfile = await createMatchProfile(other.id);

        await testPrisma.matchConnection.create({
          data: {
            user1Id: mainProfile.id,
            user2Id: otherProfile.id,
            status: "active",
            matchedAt: new Date(),
          },
        });
      }

      const connections = await testPrisma.matchConnection.findMany({
        where: { user1Id: mainProfile.id },
      });

      expect(connections).toHaveLength(5);
    });
  });

  describe("Connection Retrieval", () => {
    it("retrieves all connections for user", async () => {
      const mainUser = await createTestUserInDb();
      const mainProfile = await createMatchProfile(mainUser.id);

      // Connections where user is user1
      for (let i = 0; i < 3; i++) {
        const other = await createTestUserInDb();
        const otherProfile = await createMatchProfile(other.id);

        await testPrisma.matchConnection.create({
          data: {
            user1Id: mainProfile.id,
            user2Id: otherProfile.id,
            status: "active",
            matchedAt: new Date(),
          },
        });
      }

      // Connections where user is user2
      for (let i = 0; i < 2; i++) {
        const other = await createTestUserInDb();
        const otherProfile = await createMatchProfile(other.id);

        await testPrisma.matchConnection.create({
          data: {
            user1Id: otherProfile.id,
            user2Id: mainProfile.id,
            status: "active",
            matchedAt: new Date(),
          },
        });
      }

      const allConnections = await testPrisma.matchConnection.findMany({
        where: {
          OR: [{ user1Id: mainProfile.id }, { user2Id: mainProfile.id }],
        },
      });

      expect(allConnections).toHaveLength(5);
    });

    it("retrieves active connections only", async () => {
      const user1 = await createTestUserInDb();
      const profile1 = await createMatchProfile(user1.id);

      const statuses = ["active", "active", "blocked", "expired", "active"];

      for (let i = 0; i < statuses.length; i++) {
        const other = await createTestUserInDb();
        const otherProfile = await createMatchProfile(other.id);

        await testPrisma.matchConnection.create({
          data: {
            user1Id: profile1.id,
            user2Id: otherProfile.id,
            status: statuses[i],
            matchedAt: new Date(),
          },
        });
      }

      const activeConnections = await testPrisma.matchConnection.findMany({
        where: { user1Id: profile1.id, status: "active" },
      });

      expect(activeConnections).toHaveLength(3);
    });

    it("retrieves connection by both users", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      const profile1 = await createMatchProfile(user1.id);
      const profile2 = await createMatchProfile(user2.id);

      await testPrisma.matchConnection.create({
        data: {
          user1Id: profile1.id,
          user2Id: profile2.id,
          status: "active",
          matchedAt: new Date(),
        },
      });

      const connection = await testPrisma.matchConnection.findFirst({
        where: {
          OR: [
            { user1Id: profile1.id, user2Id: profile2.id },
            { user1Id: profile2.id, user2Id: profile1.id },
          ],
        },
      });

      expect(connection).not.toBeNull();
    });

    it("retrieves recent connections first", async () => {
      const mainUser = await createTestUserInDb();
      const mainProfile = await createMatchProfile(mainUser.id);

      for (let i = 0; i < 5; i++) {
        const other = await createTestUserInDb();
        const otherProfile = await createMatchProfile(other.id);

        await testPrisma.matchConnection.create({
          data: {
            user1Id: mainProfile.id,
            user2Id: otherProfile.id,
            status: "active",
            matchedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
            compatibilityScore: 90 - i * 5,
          },
        });
      }

      const connections = await testPrisma.matchConnection.findMany({
        where: { user1Id: mainProfile.id },
        orderBy: { matchedAt: "desc" },
        take: 3,
      });

      expect(connections[0].compatibilityScore).toBe(90);
    });
  });

  describe("Connection Status Updates", () => {
    it("blocks connection", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      const profile1 = await createMatchProfile(user1.id);
      const profile2 = await createMatchProfile(user2.id);

      const connection = await testPrisma.matchConnection.create({
        data: {
          user1Id: profile1.id,
          user2Id: profile2.id,
          status: "active",
          matchedAt: new Date(),
        },
      });

      const updated = await testPrisma.matchConnection.update({
        where: { id: connection.id },
        data: {
          status: "blocked",
          blockedBy: profile1.id,
          blockedAt: new Date(),
        },
      });

      expect(updated.status).toBe("blocked");
      expect(updated.blockedBy).toBe(profile1.id);
    });

    it("expires old connection", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      const profile1 = await createMatchProfile(user1.id);
      const profile2 = await createMatchProfile(user2.id);

      const connection = await testPrisma.matchConnection.create({
        data: {
          user1Id: profile1.id,
          user2Id: profile2.id,
          status: "active",
          matchedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      });

      const updated = await testPrisma.matchConnection.update({
        where: { id: connection.id },
        data: { status: "expired" },
      });

      expect(updated.status).toBe("expired");
    });

    it("unmatches connection", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      const profile1 = await createMatchProfile(user1.id);
      const profile2 = await createMatchProfile(user2.id);

      const connection = await testPrisma.matchConnection.create({
        data: {
          user1Id: profile1.id,
          user2Id: profile2.id,
          status: "active",
          matchedAt: new Date(),
        },
      });

      const updated = await testPrisma.matchConnection.update({
        where: { id: connection.id },
        data: {
          status: "unmatched",
          unmatchedBy: profile2.id,
          unmatchedAt: new Date(),
        },
      });

      expect(updated.status).toBe("unmatched");
    });
  });

  describe("Connection with Messages", () => {
    it("tracks last message time", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      const profile1 = await createMatchProfile(user1.id);
      const profile2 = await createMatchProfile(user2.id);

      const connection = await testPrisma.matchConnection.create({
        data: {
          user1Id: profile1.id,
          user2Id: profile2.id,
          status: "active",
          matchedAt: new Date(),
        },
      });

      const lastMessageTime = new Date();

      const updated = await testPrisma.matchConnection.update({
        where: { id: connection.id },
        data: { lastMessageAt: lastMessageTime },
      });

      expect(updated.lastMessageAt).not.toBeNull();
    });

    it("tracks message count", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      const profile1 = await createMatchProfile(user1.id);
      const profile2 = await createMatchProfile(user2.id);

      const connection = await testPrisma.matchConnection.create({
        data: {
          user1Id: profile1.id,
          user2Id: profile2.id,
          status: "active",
          matchedAt: new Date(),
          messageCount: 0,
        },
      });

      // Simulate messages
      for (let i = 0; i < 10; i++) {
        await testPrisma.matchConnection.update({
          where: { id: connection.id },
          data: { messageCount: { increment: 1 } },
        });
      }

      const updated = await testPrisma.matchConnection.findUnique({
        where: { id: connection.id },
      });

      expect(updated?.messageCount).toBe(10);
    });
  });

  describe("Connection Statistics", () => {
    it("counts connections by status", async () => {
      const mainUser = await createTestUserInDb();
      const mainProfile = await createMatchProfile(mainUser.id);

      const statuses = ["active", "active", "active", "blocked", "expired"];

      for (let i = 0; i < statuses.length; i++) {
        const other = await createTestUserInDb();
        const otherProfile = await createMatchProfile(other.id);

        await testPrisma.matchConnection.create({
          data: {
            user1Id: mainProfile.id,
            user2Id: otherProfile.id,
            status: statuses[i],
            matchedAt: new Date(),
          },
        });
      }

      const counts = await testPrisma.matchConnection.groupBy({
        by: ["status"],
        where: { user1Id: mainProfile.id },
        _count: { id: true },
      });

      const activeCount = counts.find((c) => c.status === "active")?._count.id;
      expect(activeCount).toBe(3);
    });

    it("calculates average compatibility score", async () => {
      const mainUser = await createTestUserInDb();
      const mainProfile = await createMatchProfile(mainUser.id);

      const scores = [80, 85, 90, 75, 70]; // avg = 80

      for (let i = 0; i < scores.length; i++) {
        const other = await createTestUserInDb();
        const otherProfile = await createMatchProfile(other.id);

        await testPrisma.matchConnection.create({
          data: {
            user1Id: mainProfile.id,
            user2Id: otherProfile.id,
            status: "active",
            matchedAt: new Date(),
            compatibilityScore: scores[i],
          },
        });
      }

      const connections = await testPrisma.matchConnection.findMany({
        where: { user1Id: mainProfile.id },
      });

      const avgScore =
        connections.reduce((sum, c) => sum + (c.compatibilityScore || 0), 0) / connections.length;

      expect(avgScore).toBe(80);
    });

    it("finds highest compatibility match", async () => {
      const mainUser = await createTestUserInDb();
      const mainProfile = await createMatchProfile(mainUser.id);

      const scores = [75, 92, 88, 65, 80];

      for (let i = 0; i < scores.length; i++) {
        const other = await createTestUserInDb();
        const otherProfile = await createMatchProfile(other.id);

        await testPrisma.matchConnection.create({
          data: {
            user1Id: mainProfile.id,
            user2Id: otherProfile.id,
            status: "active",
            matchedAt: new Date(),
            compatibilityScore: scores[i],
          },
        });
      }

      const bestMatch = await testPrisma.matchConnection.findFirst({
        where: { user1Id: mainProfile.id },
        orderBy: { compatibilityScore: "desc" },
      });

      expect(bestMatch?.compatibilityScore).toBe(92);
    });
  });

  describe("Connection Deletion", () => {
    it("deletes connection", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      const profile1 = await createMatchProfile(user1.id);
      const profile2 = await createMatchProfile(user2.id);

      const connection = await testPrisma.matchConnection.create({
        data: {
          user1Id: profile1.id,
          user2Id: profile2.id,
          status: "active",
          matchedAt: new Date(),
        },
      });

      await testPrisma.matchConnection.delete({
        where: { id: connection.id },
      });

      const found = await testPrisma.matchConnection.findUnique({
        where: { id: connection.id },
      });

      expect(found).toBeNull();
    });

    it("deletes all connections for profile", async () => {
      const mainUser = await createTestUserInDb();
      const mainProfile = await createMatchProfile(mainUser.id);

      for (let i = 0; i < 5; i++) {
        const other = await createTestUserInDb();
        const otherProfile = await createMatchProfile(other.id);

        await testPrisma.matchConnection.create({
          data: {
            user1Id: mainProfile.id,
            user2Id: otherProfile.id,
            status: "active",
            matchedAt: new Date(),
          },
        });
      }

      await testPrisma.matchConnection.deleteMany({
        where: {
          OR: [{ user1Id: mainProfile.id }, { user2Id: mainProfile.id }],
        },
      });

      const remaining = await testPrisma.matchConnection.findMany({
        where: {
          OR: [{ user1Id: mainProfile.id }, { user2Id: mainProfile.id }],
        },
      });

      expect(remaining).toHaveLength(0);
    });
  });
});

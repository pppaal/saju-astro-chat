/**
 * Multi-User Scenarios Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 다중 사용자 상호작용
 * - 사용자 간 데이터 격리
 * - 동시 작업 시나리오
 *
 * 실행: npm run test:integration
 * 환경변수 필요: TEST_DATABASE_URL 또는 DATABASE_URL
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from "vitest";
import {
  testPrisma,
  createTestUserInDb,
  createTestUserCredits,
  cleanupAllTestUsers,
  checkTestDbConnection,
  connectTestDb,
  disconnectTestDb,
} from "./setup";

const hasTestDb = await checkTestDbConnection();

describe("Integration: Multi-User Scenarios", () => {
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

  describe("Data Isolation", () => {
    it("isolates readings between users", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      // User 1 creates readings
      for (let i = 0; i < 5; i++) {
        await testPrisma.reading.create({
          data: { userId: user1.id, type: "saju", content: `User1 reading ${i}` },
        });
      }

      // User 2 creates readings
      for (let i = 0; i < 3; i++) {
        await testPrisma.reading.create({
          data: { userId: user2.id, type: "tarot", content: `User2 reading ${i}` },
        });
      }

      const user1Readings = await testPrisma.reading.findMany({
        where: { userId: user1.id },
      });

      const user2Readings = await testPrisma.reading.findMany({
        where: { userId: user2.id },
      });

      expect(user1Readings).toHaveLength(5);
      expect(user2Readings).toHaveLength(3);

      // Verify no cross-contamination
      expect(user1Readings.every((r) => r.userId === user1.id)).toBe(true);
      expect(user2Readings.every((r) => r.userId === user2.id)).toBe(true);
    });

    it("isolates credits between users", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      await createTestUserCredits(user1.id, "pro");
      await createTestUserCredits(user2.id, "starter");

      // User 1 uses credits
      await testPrisma.userCredits.update({
        where: { userId: user1.id },
        data: { usedCredits: 30 },
      });

      const user1Credits = await testPrisma.userCredits.findUnique({
        where: { userId: user1.id },
      });

      const user2Credits = await testPrisma.userCredits.findUnique({
        where: { userId: user2.id },
      });

      expect(user1Credits?.usedCredits).toBe(30);
      expect(user2Credits?.usedCredits).toBe(0);
    });

    it("isolates chat sessions between users", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      await testPrisma.counselorChatSession.create({
        data: {
          userId: user1.id,
          theme: "career",
          messages: [{ role: "user", content: "User1 message" }],
        },
      });

      await testPrisma.counselorChatSession.create({
        data: {
          userId: user2.id,
          theme: "love",
          messages: [{ role: "user", content: "User2 message" }],
        },
      });

      const user1Sessions = await testPrisma.counselorChatSession.findMany({
        where: { userId: user1.id },
      });

      const user2Sessions = await testPrisma.counselorChatSession.findMany({
        where: { userId: user2.id },
      });

      expect(user1Sessions).toHaveLength(1);
      expect(user1Sessions[0].theme).toBe("career");
      expect(user2Sessions).toHaveLength(1);
      expect(user2Sessions[0].theme).toBe("love");
    });
  });

  describe("User Comparison", () => {
    it("compares usage across multiple users", async () => {
      const users: { id: string }[] = [];

      for (let i = 0; i < 5; i++) {
        const user = await createTestUserInDb();
        users.push(user);
        await createTestUserCredits(user.id, "starter");

        // Each user uses different amount
        await testPrisma.userCredits.update({
          where: { userId: user.id },
          data: { usedCredits: (i + 1) * 5 },
        });
      }

      const allCredits = await testPrisma.userCredits.findMany({
        where: { userId: { in: users.map((u) => u.id) } },
        orderBy: { usedCredits: "desc" },
      });

      expect(allCredits[0].usedCredits).toBe(25);
      expect(allCredits[4].usedCredits).toBe(5);
    });

    it("ranks users by activity", async () => {
      const users: { id: string }[] = [];

      for (let i = 0; i < 3; i++) {
        const user = await createTestUserInDb();
        users.push(user);

        // Create different amounts of readings
        for (let j = 0; j <= i * 2; j++) {
          await testPrisma.reading.create({
            data: { userId: user.id, type: "saju", content: "{}" },
          });
        }
      }

      const userReadingCounts = await testPrisma.reading.groupBy({
        by: ["userId"],
        where: { userId: { in: users.map((u) => u.id) } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      });

      expect(userReadingCounts[0]._count.id).toBe(5);
      expect(userReadingCounts[1]._count.id).toBe(3);
      expect(userReadingCounts[2]._count.id).toBe(1);
    });
  });

  describe("Concurrent Operations", () => {
    it("handles multiple users creating readings simultaneously", async () => {
      const users: { id: string }[] = [];

      for (let i = 0; i < 10; i++) {
        users.push(await createTestUserInDb());
      }

      // Simulate concurrent reading creation
      const promises = users.map((user) =>
        testPrisma.reading.create({
          data: {
            userId: user.id,
            type: "saju",
            content: JSON.stringify({ timestamp: Date.now() }),
          },
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);

      // Verify each reading belongs to correct user
      for (let i = 0; i < users.length; i++) {
        const userReading = await testPrisma.reading.findFirst({
          where: { userId: users[i].id },
        });
        expect(userReading).not.toBeNull();
      }
    });

    it("handles concurrent credit updates", async () => {
      const users: { id: string }[] = [];

      for (let i = 0; i < 5; i++) {
        const user = await createTestUserInDb();
        users.push(user);
        await createTestUserCredits(user.id, "pro");
      }

      // Concurrent credit updates
      const updatePromises = users.map((user, index) =>
        testPrisma.userCredits.update({
          where: { userId: user.id },
          data: { usedCredits: (index + 1) * 10 },
        })
      );

      await Promise.all(updatePromises);

      // Verify all updates succeeded
      for (let i = 0; i < users.length; i++) {
        const credits = await testPrisma.userCredits.findUnique({
          where: { userId: users[i].id },
        });
        expect(credits?.usedCredits).toBe((i + 1) * 10);
      }
    });
  });

  describe("User Relationships", () => {
    it("tracks saved persons across users", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      // User1 saves User2 as a person
      await testPrisma.savedPerson.create({
        data: {
          userId: user1.id,
          name: "Friend from app",
          relationship: "friend",
          birthDate: "1990-01-01",
          gender: "male",
        },
      });

      // User2 saves User1 as a person
      await testPrisma.savedPerson.create({
        data: {
          userId: user2.id,
          name: "Another friend",
          relationship: "friend",
          birthDate: "1992-05-15",
          gender: "female",
        },
      });

      const user1SavedPeople = await testPrisma.savedPerson.findMany({
        where: { userId: user1.id },
      });

      const user2SavedPeople = await testPrisma.savedPerson.findMany({
        where: { userId: user2.id },
      });

      expect(user1SavedPeople).toHaveLength(1);
      expect(user2SavedPeople).toHaveLength(1);
    });

    it("handles compatibility checks between user-saved persons", async () => {
      const user = await createTestUserInDb();

      // Save multiple people for compatibility
      const person1 = await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: "Person A",
          relationship: "potential",
          birthDate: "1990-03-15",
          gender: "male",
        },
      });

      const person2 = await testPrisma.savedPerson.create({
        data: {
          userId: user.id,
          name: "Person B",
          relationship: "potential",
          birthDate: "1992-07-20",
          gender: "female",
        },
      });

      // Create compatibility result
      await testPrisma.compatibilityResult.create({
        data: {
          userId: user.id,
          partnerData: {
            person1Id: person1.id,
            person2Id: person2.id,
          },
          result: { overallScore: 85 },
        },
      });

      const results = await testPrisma.compatibilityResult.findMany({
        where: { userId: user.id },
      });

      expect(results).toHaveLength(1);
    });
  });

  describe("Bulk Operations", () => {
    it("creates multiple users with initial data", async () => {
      const userCount = 10;
      const users: { id: string }[] = [];

      for (let i = 0; i < userCount; i++) {
        const user = await createTestUserInDb({
          name: `Bulk User ${i + 1}`,
        });
        users.push(user);

        await createTestUserCredits(user.id, "free");

        await testPrisma.userPreferences.create({
          data: {
            userId: user.id,
            preferredLanguage: i % 2 === 0 ? "ko" : "en",
          },
        });
      }

      const allUsers = await testPrisma.user.findMany({
        where: { id: { in: users.map((u) => u.id) } },
      });

      const allCredits = await testPrisma.userCredits.findMany({
        where: { userId: { in: users.map((u) => u.id) } },
      });

      const allPrefs = await testPrisma.userPreferences.findMany({
        where: { userId: { in: users.map((u) => u.id) } },
      });

      expect(allUsers).toHaveLength(userCount);
      expect(allCredits).toHaveLength(userCount);
      expect(allPrefs).toHaveLength(userCount);
    });

    it("deletes user and cascades to all related data", async () => {
      const userData = {
        id: `cascade_test_${Date.now()}`,
        email: `cascade_${Date.now()}@test.example.com`,
        name: "Cascade Test User",
      };

      const user = await testPrisma.user.create({ data: userData });

      // Create related data
      await testPrisma.reading.create({
        data: { userId: user.id, type: "saju", content: "{}" },
      });

      await testPrisma.consultationHistory.create({
        data: { userId: user.id, theme: "test", summary: "test", content: "{}" },
      });

      // Delete user
      await testPrisma.user.delete({ where: { id: user.id } });

      // Verify cascade
      const readings = await testPrisma.reading.findMany({
        where: { userId: user.id },
      });
      const history = await testPrisma.consultationHistory.findMany({
        where: { userId: user.id },
      });

      expect(readings).toHaveLength(0);
      expect(history).toHaveLength(0);
    });
  });

  describe("Cross-User Analytics", () => {
    it("aggregates feedback across all users", async () => {
      const users: { id: string }[] = [];

      for (let i = 0; i < 5; i++) {
        users.push(await createTestUserInDb());
      }

      // Each user gives feedback
      for (const user of users) {
        await testPrisma.sectionFeedback.create({
          data: {
            userId: user.id,
            sectionId: "global_section",
            feedbackType: "helpful",
            rating: Math.floor(Math.random() * 2) + 4, // 4 or 5
          },
        });
      }

      const feedbacks = await testPrisma.sectionFeedback.findMany({
        where: { sectionId: "global_section" },
      });

      expect(feedbacks).toHaveLength(5);

      const avgRating =
        feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbacks.length;

      expect(avgRating).toBeGreaterThanOrEqual(4);
    });

    it("tracks most popular reading types across users", async () => {
      const users: { id: string }[] = [];

      for (let i = 0; i < 3; i++) {
        users.push(await createTestUserInDb());
      }

      // Different users prefer different types
      await testPrisma.reading.create({
        data: { userId: users[0].id, type: "saju", content: "{}" },
      });
      await testPrisma.reading.create({
        data: { userId: users[0].id, type: "saju", content: "{}" },
      });
      await testPrisma.reading.create({
        data: { userId: users[1].id, type: "tarot", content: "{}" },
      });
      await testPrisma.reading.create({
        data: { userId: users[2].id, type: "saju", content: "{}" },
      });

      const typeCounts = await testPrisma.reading.groupBy({
        by: ["type"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      });

      const sajuCount = typeCounts.find((t) => t.type === "saju")?._count.id;
      expect(sajuCount).toBe(3);
    });
  });
});

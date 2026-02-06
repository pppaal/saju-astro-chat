/**
 * Search and Filter Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 사용자 검색 및 필터링
 * - 콘텐츠 검색
 * - 고급 쿼리 기능
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

describe("Integration: Search and Filter", () => {
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

  describe("User Search", () => {
    it("searches users by email pattern", async () => {
      await createTestUserInDb({ email: "alice@example.com" });
      await createTestUserInDb({ email: "bob@example.com" });
      await createTestUserInDb({ email: "alice.smith@example.com" });

      const aliceUsers = await testPrisma.user.findMany({
        where: { email: { contains: "alice" } },
      });

      expect(aliceUsers).toHaveLength(2);
    });

    it("searches users by name", async () => {
      await createTestUserInDb({ name: "John Doe" });
      await createTestUserInDb({ name: "Jane Doe" });
      await createTestUserInDb({ name: "Bob Smith" });

      const doeUsers = await testPrisma.user.findMany({
        where: { name: { contains: "Doe" } },
      });

      expect(doeUsers).toHaveLength(2);
    });

    it("filters users by creation date", async () => {
      const user1 = await createTestUserInDb();

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const recentUsers = await testPrisma.user.findMany({
        where: {
          id: user1.id,
          createdAt: { gte: yesterday },
        },
      });

      expect(recentUsers).toHaveLength(1);
    });
  });

  describe("Reading Search", () => {
    it("filters readings by type", async () => {
      const user = await createTestUserInDb();

      const types = ["saju", "tarot", "saju", "dream", "saju"];

      for (const type of types) {
        await testPrisma.reading.create({
          data: { userId: user.id, type, content: "{}" },
        });
      }

      const sajuReadings = await testPrisma.reading.findMany({
        where: { userId: user.id, type: "saju" },
      });

      expect(sajuReadings).toHaveLength(3);
    });

    it("filters readings by date range", async () => {
      const user = await createTestUserInDb();

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      await testPrisma.reading.create({
        data: { userId: user.id, type: "saju", content: "{}", createdAt: now },
      });

      await testPrisma.reading.create({
        data: { userId: user.id, type: "tarot", content: "{}", createdAt: twoWeeksAgo },
      });

      const recentReadings = await testPrisma.reading.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: weekAgo },
        },
      });

      expect(recentReadings).toHaveLength(1);
    });

    it("sorts readings by date", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: "saju",
            content: JSON.stringify({ order: i }),
          },
        });
      }

      const descReadings = await testPrisma.reading.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });

      const ascReadings = await testPrisma.reading.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      });

      expect(descReadings[0].id).not.toBe(ascReadings[0].id);
    });
  });

  describe("Tarot Reading Search", () => {
    it("filters tarot readings by theme", async () => {
      const user = await createTestUserInDb();

      const themes = ["love", "career", "love", "health", "love"];

      for (const theme of themes) {
        await testPrisma.tarotReading.create({
          data: {
            userId: user.id,
            question: `${theme} question`,
            spreadId: "single",
            spreadTitle: "Single",
            cards: [],
            theme,
          },
        });
      }

      const loveReadings = await testPrisma.tarotReading.findMany({
        where: { userId: user.id, theme: "love" },
      });

      expect(loveReadings).toHaveLength(3);
    });

    it("filters by spread type", async () => {
      const user = await createTestUserInDb();

      const spreads = [
        { id: "single", title: "Single Card" },
        { id: "three-card", title: "Three Card" },
        { id: "single", title: "Single Card" },
        { id: "celtic-cross", title: "Celtic Cross" },
      ];

      for (const spread of spreads) {
        await testPrisma.tarotReading.create({
          data: {
            userId: user.id,
            question: "Test",
            spreadId: spread.id,
            spreadTitle: spread.title,
            cards: [],
          },
        });
      }

      const singleCardReadings = await testPrisma.tarotReading.findMany({
        where: { userId: user.id, spreadId: "single" },
      });

      expect(singleCardReadings).toHaveLength(2);
    });

    it("searches tarot readings by question", async () => {
      const user = await createTestUserInDb();

      const questions = [
        "Will I find love?",
        "What about my career?",
        "Is love coming my way?",
        "Health outlook?",
      ];

      for (const question of questions) {
        await testPrisma.tarotReading.create({
          data: {
            userId: user.id,
            question,
            spreadId: "single",
            spreadTitle: "Single",
            cards: [],
          },
        });
      }

      const loveQuestions = await testPrisma.tarotReading.findMany({
        where: {
          userId: user.id,
          question: { contains: "love" },
        },
      });

      expect(loveQuestions).toHaveLength(2);
    });
  });

  describe("Consultation History Search", () => {
    it("filters consultation by theme", async () => {
      const user = await createTestUserInDb();

      const themes = ["saju", "tarot", "saju", "dream"];

      for (const theme of themes) {
        await testPrisma.consultationHistory.create({
          data: {
            userId: user.id,
            theme,
            summary: `${theme} consultation`,
            content: "{}",
          },
        });
      }

      const sajuConsultations = await testPrisma.consultationHistory.findMany({
        where: { userId: user.id, theme: "saju" },
      });

      expect(sajuConsultations).toHaveLength(2);
    });

    it("searches consultation by summary", async () => {
      const user = await createTestUserInDb();

      const summaries = [
        "Career change advice",
        "Love compatibility reading",
        "Career promotion guidance",
        "Health fortune",
      ];

      for (const summary of summaries) {
        await testPrisma.consultationHistory.create({
          data: { userId: user.id, theme: "general", summary, content: "{}" },
        });
      }

      const careerConsultations = await testPrisma.consultationHistory.findMany({
        where: {
          userId: user.id,
          summary: { contains: "Career" },
        },
      });

      expect(careerConsultations).toHaveLength(2);
    });
  });

  describe("Saved Person Search", () => {
    it("filters by relationship type", async () => {
      const user = await createTestUserInDb();

      const people = [
        { name: "Person 1", relationship: "friend" },
        { name: "Person 2", relationship: "family" },
        { name: "Person 3", relationship: "friend" },
        { name: "Person 4", relationship: "colleague" },
      ];

      for (const person of people) {
        await testPrisma.savedPerson.create({
          data: {
            userId: user.id,
            name: person.name,
            relationship: person.relationship,
            birthDate: "1990-01-01",
            gender: "male",
          },
        });
      }

      const friends = await testPrisma.savedPerson.findMany({
        where: { userId: user.id, relationship: "friend" },
      });

      expect(friends).toHaveLength(2);
    });

    it("searches saved person by name", async () => {
      const user = await createTestUserInDb();

      const names = ["김철수", "이영희", "김민수", "박지연"];

      for (const name of names) {
        await testPrisma.savedPerson.create({
          data: {
            userId: user.id,
            name,
            relationship: "friend",
            birthDate: "1990-01-01",
            gender: "male",
          },
        });
      }

      const kimPeople = await testPrisma.savedPerson.findMany({
        where: {
          userId: user.id,
          name: { startsWith: "김" },
        },
      });

      expect(kimPeople).toHaveLength(2);
    });

    it("filters by gender", async () => {
      const user = await createTestUserInDb();

      await testPrisma.savedPerson.create({
        data: { userId: user.id, name: "P1", relationship: "friend", birthDate: "1990-01-01", gender: "male" },
      });
      await testPrisma.savedPerson.create({
        data: { userId: user.id, name: "P2", relationship: "friend", birthDate: "1990-01-01", gender: "female" },
      });
      await testPrisma.savedPerson.create({
        data: { userId: user.id, name: "P3", relationship: "friend", birthDate: "1990-01-01", gender: "male" },
      });

      const malePeople = await testPrisma.savedPerson.findMany({
        where: { userId: user.id, gender: "male" },
      });

      expect(malePeople).toHaveLength(2);
    });
  });

  describe("Calendar Date Search", () => {
    it("filters by date range", async () => {
      const user = await createTestUserInDb();

      const dates = ["2024-06-01", "2024-06-15", "2024-07-01", "2024-07-15"];

      for (const date of dates) {
        await testPrisma.savedCalendarDate.create({
          data: { userId: user.id, date, title: `Event on ${date}` },
        });
      }

      const juneDates = await testPrisma.savedCalendarDate.findMany({
        where: {
          userId: user.id,
          date: { gte: "2024-06-01", lt: "2024-07-01" },
        },
      });

      expect(juneDates).toHaveLength(2);
    });

    it("filters by category", async () => {
      const user = await createTestUserInDb();

      const events = [
        { date: "2024-06-01", category: "holiday" },
        { date: "2024-06-15", category: "personal" },
        { date: "2024-06-20", category: "holiday" },
        { date: "2024-06-25", category: "work" },
      ];

      for (const event of events) {
        await testPrisma.savedCalendarDate.create({
          data: {
            userId: user.id,
            date: event.date,
            title: "Event",
            category: event.category,
          },
        });
      }

      const holidays = await testPrisma.savedCalendarDate.findMany({
        where: { userId: user.id, category: "holiday" },
      });

      expect(holidays).toHaveLength(2);
    });

    it("filters important dates only", async () => {
      const user = await createTestUserInDb();

      await testPrisma.savedCalendarDate.create({
        data: { userId: user.id, date: "2024-06-01", title: "Important", isImportant: true },
      });
      await testPrisma.savedCalendarDate.create({
        data: { userId: user.id, date: "2024-06-02", title: "Normal", isImportant: false },
      });
      await testPrisma.savedCalendarDate.create({
        data: { userId: user.id, date: "2024-06-03", title: "Also Important", isImportant: true },
      });

      const importantDates = await testPrisma.savedCalendarDate.findMany({
        where: { userId: user.id, isImportant: true },
      });

      expect(importantDates).toHaveLength(2);
    });
  });

  describe("Combined Filters", () => {
    it("applies multiple filters to readings", async () => {
      const user = await createTestUserInDb();

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Recent saju
      await testPrisma.reading.create({
        data: { userId: user.id, type: "saju", content: "{}", createdAt: now },
      });

      // Old saju
      await testPrisma.reading.create({
        data: { userId: user.id, type: "saju", content: "{}", createdAt: twoWeeksAgo },
      });

      // Recent tarot
      await testPrisma.reading.create({
        data: { userId: user.id, type: "tarot", content: "{}", createdAt: now },
      });

      const recentSaju = await testPrisma.reading.findMany({
        where: {
          userId: user.id,
          type: "saju",
          createdAt: { gte: weekAgo },
        },
      });

      expect(recentSaju).toHaveLength(1);
    });

    it("applies OR conditions", async () => {
      const user = await createTestUserInDb();

      await testPrisma.reading.create({
        data: { userId: user.id, type: "saju", content: "{}" },
      });
      await testPrisma.reading.create({
        data: { userId: user.id, type: "tarot", content: "{}" },
      });
      await testPrisma.reading.create({
        data: { userId: user.id, type: "dream", content: "{}" },
      });

      const sajuOrTarot = await testPrisma.reading.findMany({
        where: {
          userId: user.id,
          OR: [{ type: "saju" }, { type: "tarot" }],
        },
      });

      expect(sajuOrTarot).toHaveLength(2);
    });

    it("excludes with NOT condition", async () => {
      const user = await createTestUserInDb();

      await testPrisma.reading.create({
        data: { userId: user.id, type: "saju", content: "{}" },
      });
      await testPrisma.reading.create({
        data: { userId: user.id, type: "tarot", content: "{}" },
      });
      await testPrisma.reading.create({
        data: { userId: user.id, type: "dream", content: "{}" },
      });

      const notSaju = await testPrisma.reading.findMany({
        where: {
          userId: user.id,
          NOT: { type: "saju" },
        },
      });

      expect(notSaju).toHaveLength(2);
    });
  });

  describe("Pagination", () => {
    it("paginates large result sets", async () => {
      const user = await createTestUserInDb();

      // Create 50 readings
      for (let i = 0; i < 50; i++) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: "saju",
            content: JSON.stringify({ index: i }),
          },
        });
      }

      const page1 = await testPrisma.reading.findMany({
        where: { userId: user.id },
        take: 10,
        skip: 0,
        orderBy: { createdAt: "asc" },
      });

      const page3 = await testPrisma.reading.findMany({
        where: { userId: user.id },
        take: 10,
        skip: 20,
        orderBy: { createdAt: "asc" },
      });

      expect(page1).toHaveLength(10);
      expect(page3).toHaveLength(10);

      const page1Index = JSON.parse(page1[0].content as string).index;
      const page3Index = JSON.parse(page3[0].content as string).index;

      expect(page3Index).toBe(page1Index + 20);
    });

    it("handles cursor-based pagination", async () => {
      const user = await createTestUserInDb();

      // Create 20 readings
      for (let i = 0; i < 20; i++) {
        await testPrisma.reading.create({
          data: { userId: user.id, type: "saju", content: "{}" },
        });
      }

      const firstBatch = await testPrisma.reading.findMany({
        where: { userId: user.id },
        take: 5,
        orderBy: { id: "asc" },
      });

      const lastId = firstBatch[firstBatch.length - 1].id;

      const secondBatch = await testPrisma.reading.findMany({
        where: { userId: user.id },
        take: 5,
        skip: 1,
        cursor: { id: lastId },
        orderBy: { id: "asc" },
      });

      expect(secondBatch).toHaveLength(5);
      expect(secondBatch[0].id).not.toBe(lastId);
    });
  });
});

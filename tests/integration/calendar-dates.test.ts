/**
 * Calendar Dates Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 저장된 날짜 관리
 * - 특별 날짜 추적
 * - 날짜별 운세 연동
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

describe("Integration: Calendar Dates", () => {
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

  describe("Date Creation", () => {
    it("saves calendar date with note", async () => {
      const user = await createTestUserInDb();

      const savedDate = await testPrisma.savedCalendarDate.create({
        data: {
          userId: user.id,
          date: new Date("2024-06-15"),
          note: "중요한 미팅",
          type: "event",
        },
      });

      expect(savedDate.note).toBe("중요한 미팅");
      expect(savedDate.type).toBe("event");
    });

    it("saves birthday date", async () => {
      const user = await createTestUserInDb();

      const birthday = await testPrisma.savedCalendarDate.create({
        data: {
          userId: user.id,
          date: new Date("1990-05-15"),
          note: "내 생일",
          type: "birthday",
          isRecurring: true,
        },
      });

      expect(birthday.type).toBe("birthday");
      expect(birthday.isRecurring).toBe(true);
    });

    it("saves anniversary date", async () => {
      const user = await createTestUserInDb();

      const anniversary = await testPrisma.savedCalendarDate.create({
        data: {
          userId: user.id,
          date: new Date("2020-03-14"),
          note: "결혼 기념일",
          type: "anniversary",
          isRecurring: true,
        },
      });

      expect(anniversary.type).toBe("anniversary");
    });

    it("saves fortune check date", async () => {
      const user = await createTestUserInDb();

      const fortuneDate = await testPrisma.savedCalendarDate.create({
        data: {
          userId: user.id,
          date: new Date("2024-07-01"),
          note: "운세 좋은 날 - 투자하기 좋음",
          type: "fortune",
          metadata: {
            fortuneType: "wealth",
            score: 95,
          },
        },
      });

      const meta = fortuneDate.metadata as { score: number };
      expect(meta.score).toBe(95);
    });

    it("saves multiple dates for user", async () => {
      const user = await createTestUserInDb();

      const dates = [
        { date: "2024-06-01", type: "event" },
        { date: "2024-06-15", type: "birthday" },
        { date: "2024-07-01", type: "fortune" },
        { date: "2024-08-10", type: "anniversary" },
      ];

      for (const d of dates) {
        await testPrisma.savedCalendarDate.create({
          data: {
            userId: user.id,
            date: new Date(d.date),
            type: d.type,
            note: `Note for ${d.type}`,
          },
        });
      }

      const savedDates = await testPrisma.savedCalendarDate.findMany({
        where: { userId: user.id },
      });

      expect(savedDates).toHaveLength(4);
    });
  });

  describe("Date Retrieval", () => {
    it("retrieves dates by month", async () => {
      const user = await createTestUserInDb();

      // June dates
      for (let i = 1; i <= 5; i++) {
        await testPrisma.savedCalendarDate.create({
          data: {
            userId: user.id,
            date: new Date(`2024-06-${String(i).padStart(2, "0")}`),
            type: "event",
            note: `June event ${i}`,
          },
        });
      }

      // July dates
      for (let i = 1; i <= 3; i++) {
        await testPrisma.savedCalendarDate.create({
          data: {
            userId: user.id,
            date: new Date(`2024-07-${String(i).padStart(2, "0")}`),
            type: "event",
            note: `July event ${i}`,
          },
        });
      }

      const juneStart = new Date("2024-06-01");
      const juneEnd = new Date("2024-06-30");

      const juneDates = await testPrisma.savedCalendarDate.findMany({
        where: {
          userId: user.id,
          date: {
            gte: juneStart,
            lte: juneEnd,
          },
        },
      });

      expect(juneDates).toHaveLength(5);
    });

    it("retrieves dates by type", async () => {
      const user = await createTestUserInDb();

      const entries = [
        { type: "birthday", count: 3 },
        { type: "anniversary", count: 2 },
        { type: "event", count: 5 },
      ];

      for (const entry of entries) {
        for (let i = 0; i < entry.count; i++) {
          await testPrisma.savedCalendarDate.create({
            data: {
              userId: user.id,
              date: new Date(`2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}-15`),
              type: entry.type,
              note: `${entry.type} ${i}`,
            },
          });
        }
      }

      const birthdays = await testPrisma.savedCalendarDate.findMany({
        where: { userId: user.id, type: "birthday" },
      });

      expect(birthdays).toHaveLength(3);
    });

    it("retrieves recurring dates", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.savedCalendarDate.create({
          data: {
            userId: user.id,
            date: new Date(`2024-06-${String(i + 1).padStart(2, "0")}`),
            type: "event",
            isRecurring: i < 2,
            note: `Event ${i}`,
          },
        });
      }

      const recurringDates = await testPrisma.savedCalendarDate.findMany({
        where: { userId: user.id, isRecurring: true },
      });

      expect(recurringDates).toHaveLength(2);
    });

    it("retrieves upcoming dates", async () => {
      const user = await createTestUserInDb();
      const now = new Date();

      // Past dates
      for (let i = 1; i <= 3; i++) {
        await testPrisma.savedCalendarDate.create({
          data: {
            userId: user.id,
            date: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
            type: "event",
            note: `Past ${i}`,
          },
        });
      }

      // Future dates
      for (let i = 1; i <= 4; i++) {
        await testPrisma.savedCalendarDate.create({
          data: {
            userId: user.id,
            date: new Date(now.getTime() + i * 24 * 60 * 60 * 1000),
            type: "event",
            note: `Future ${i}`,
          },
        });
      }

      const upcomingDates = await testPrisma.savedCalendarDate.findMany({
        where: {
          userId: user.id,
          date: { gte: now },
        },
        orderBy: { date: "asc" },
      });

      expect(upcomingDates).toHaveLength(4);
    });
  });

  describe("Date Updates", () => {
    it("updates date note", async () => {
      const user = await createTestUserInDb();

      const savedDate = await testPrisma.savedCalendarDate.create({
        data: {
          userId: user.id,
          date: new Date("2024-06-15"),
          type: "event",
          note: "원래 메모",
        },
      });

      const updated = await testPrisma.savedCalendarDate.update({
        where: { id: savedDate.id },
        data: { note: "수정된 메모" },
      });

      expect(updated.note).toBe("수정된 메모");
    });

    it("updates date type", async () => {
      const user = await createTestUserInDb();

      const savedDate = await testPrisma.savedCalendarDate.create({
        data: {
          userId: user.id,
          date: new Date("2024-06-15"),
          type: "event",
          note: "Test",
        },
      });

      const updated = await testPrisma.savedCalendarDate.update({
        where: { id: savedDate.id },
        data: { type: "anniversary" },
      });

      expect(updated.type).toBe("anniversary");
    });

    it("toggles recurring status", async () => {
      const user = await createTestUserInDb();

      const savedDate = await testPrisma.savedCalendarDate.create({
        data: {
          userId: user.id,
          date: new Date("2024-06-15"),
          type: "birthday",
          isRecurring: false,
          note: "Test",
        },
      });

      const updated = await testPrisma.savedCalendarDate.update({
        where: { id: savedDate.id },
        data: { isRecurring: true },
      });

      expect(updated.isRecurring).toBe(true);
    });

    it("updates metadata", async () => {
      const user = await createTestUserInDb();

      const savedDate = await testPrisma.savedCalendarDate.create({
        data: {
          userId: user.id,
          date: new Date("2024-06-15"),
          type: "fortune",
          note: "Test",
          metadata: { score: 80 },
        },
      });

      const updated = await testPrisma.savedCalendarDate.update({
        where: { id: savedDate.id },
        data: {
          metadata: { score: 95, revised: true },
        },
      });

      const meta = updated.metadata as { score: number; revised: boolean };
      expect(meta.score).toBe(95);
      expect(meta.revised).toBe(true);
    });
  });

  describe("Date Deletion", () => {
    it("deletes single date", async () => {
      const user = await createTestUserInDb();

      const savedDate = await testPrisma.savedCalendarDate.create({
        data: {
          userId: user.id,
          date: new Date("2024-06-15"),
          type: "event",
          note: "Delete me",
        },
      });

      await testPrisma.savedCalendarDate.delete({
        where: { id: savedDate.id },
      });

      const found = await testPrisma.savedCalendarDate.findUnique({
        where: { id: savedDate.id },
      });

      expect(found).toBeNull();
    });

    it("deletes dates by type", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 3; i++) {
        await testPrisma.savedCalendarDate.create({
          data: {
            userId: user.id,
            date: new Date("2024-06-15"),
            type: "fortune",
            note: `Fortune ${i}`,
          },
        });
      }

      for (let i = 0; i < 2; i++) {
        await testPrisma.savedCalendarDate.create({
          data: {
            userId: user.id,
            date: new Date("2024-06-15"),
            type: "event",
            note: `Event ${i}`,
          },
        });
      }

      await testPrisma.savedCalendarDate.deleteMany({
        where: { userId: user.id, type: "fortune" },
      });

      const remaining = await testPrisma.savedCalendarDate.findMany({
        where: { userId: user.id },
      });

      expect(remaining).toHaveLength(2);
      expect(remaining.every((d) => d.type === "event")).toBe(true);
    });

    it("deletes old dates", async () => {
      const user = await createTestUserInDb();
      const now = new Date();

      // Old dates
      for (let i = 1; i <= 3; i++) {
        await testPrisma.savedCalendarDate.create({
          data: {
            userId: user.id,
            date: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
            type: "event",
            note: `Old ${i}`,
          },
        });
      }

      // Recent dates
      for (let i = 1; i <= 2; i++) {
        await testPrisma.savedCalendarDate.create({
          data: {
            userId: user.id,
            date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
            type: "event",
            note: `Recent ${i}`,
          },
        });
      }

      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      await testPrisma.savedCalendarDate.deleteMany({
        where: {
          userId: user.id,
          date: { lt: ninetyDaysAgo },
          isRecurring: false,
        },
      });

      const remaining = await testPrisma.savedCalendarDate.findMany({
        where: { userId: user.id },
      });

      expect(remaining).toHaveLength(2);
    });
  });

  describe("Calendar Statistics", () => {
    it("counts dates by type", async () => {
      const user = await createTestUserInDb();

      const types = ["birthday", "birthday", "anniversary", "event", "event", "event", "fortune"];

      for (let i = 0; i < types.length; i++) {
        await testPrisma.savedCalendarDate.create({
          data: {
            userId: user.id,
            date: new Date(`2024-${String(i + 1).padStart(2, "0")}-15`),
            type: types[i],
            note: `${types[i]} ${i}`,
          },
        });
      }

      const counts = await testPrisma.savedCalendarDate.groupBy({
        by: ["type"],
        where: { userId: user.id },
        _count: { id: true },
      });

      const eventCount = counts.find((c) => c.type === "event")?._count.id;
      expect(eventCount).toBe(3);
    });

    it("counts dates by month", async () => {
      const user = await createTestUserInDb();

      const months = [6, 6, 6, 7, 7, 8];

      for (let i = 0; i < months.length; i++) {
        await testPrisma.savedCalendarDate.create({
          data: {
            userId: user.id,
            date: new Date(`2024-${String(months[i]).padStart(2, "0")}-15`),
            type: "event",
            note: `Month ${months[i]}`,
          },
        });
      }

      const allDates = await testPrisma.savedCalendarDate.findMany({
        where: { userId: user.id },
      });

      const monthCounts: Record<number, number> = {};
      for (const d of allDates) {
        const month = d.date.getMonth() + 1;
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      }

      expect(monthCounts[6]).toBe(3);
      expect(monthCounts[7]).toBe(2);
    });
  });
});

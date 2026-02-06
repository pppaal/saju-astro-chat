/**
 * Fortune Types Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 다양한 운세 유형 저장
 * - 운세 카테고리 관리
 * - 운세 히스토리 추적
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

describe("Integration: Fortune Types", () => {
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

  describe("Daily Fortune", () => {
    it("stores daily fortune with detailed scores", async () => {
      const user = await createTestUserInDb();

      const fortune = await testPrisma.fortune.create({
        data: {
          userId: user.id,
          type: "daily",
          content: JSON.stringify({
            date: "2024-06-15",
            scores: {
              love: 85,
              career: 72,
              wealth: 68,
              health: 90,
              overall: 79,
            },
            advice: "오늘은 새로운 시작에 좋은 날입니다.",
            luckyItems: {
              color: "파란색",
              number: 7,
              direction: "동쪽",
            },
          }),
        },
      });

      expect(fortune.type).toBe("daily");

      const content = JSON.parse(fortune.content as string);
      expect(content.scores.overall).toBe(79);
    });

    it("stores consecutive daily fortunes", async () => {
      const user = await createTestUserInDb();

      for (let i = 1; i <= 7; i++) {
        await testPrisma.fortune.create({
          data: {
            userId: user.id,
            type: "daily",
            content: JSON.stringify({
              date: `2024-06-${String(i).padStart(2, "0")}`,
              dayNumber: i,
            }),
          },
        });
      }

      const fortunes = await testPrisma.fortune.findMany({
        where: { userId: user.id, type: "daily" },
      });

      expect(fortunes).toHaveLength(7);
    });
  });

  describe("Weekly Fortune", () => {
    it("stores weekly fortune overview", async () => {
      const user = await createTestUserInDb();

      const fortune = await testPrisma.fortune.create({
        data: {
          userId: user.id,
          type: "weekly",
          content: JSON.stringify({
            weekOf: "2024-06-10",
            theme: "성장과 발전의 주간",
            dailyHighlights: [
              { day: "월", focus: "career" },
              { day: "화", focus: "love" },
              { day: "수", focus: "health" },
              { day: "목", focus: "wealth" },
              { day: "금", focus: "social" },
              { day: "토", focus: "rest" },
              { day: "일", focus: "reflection" },
            ],
            bestDay: "금요일",
            cautionDay: "화요일",
          }),
        },
      });

      const content = JSON.parse(fortune.content as string);
      expect(content.dailyHighlights).toHaveLength(7);
      expect(content.bestDay).toBe("금요일");
    });
  });

  describe("Monthly Fortune", () => {
    it("stores monthly fortune with weekly breakdown", async () => {
      const user = await createTestUserInDb();

      const fortune = await testPrisma.fortune.create({
        data: {
          userId: user.id,
          type: "monthly",
          content: JSON.stringify({
            month: "2024-06",
            overallTheme: "변화의 달",
            weeklyScores: [75, 80, 72, 88],
            keyDates: ["2024-06-05", "2024-06-15", "2024-06-21"],
            areas: {
              career: { score: 80, advice: "승진 기회가 있습니다" },
              love: { score: 75, advice: "소통이 중요합니다" },
              health: { score: 70, advice: "휴식을 취하세요" },
              wealth: { score: 85, advice: "투자에 좋은 시기입니다" },
            },
          }),
        },
      });

      const content = JSON.parse(fortune.content as string);
      expect(content.weeklyScores).toHaveLength(4);
      expect(content.areas.career.score).toBe(80);
    });
  });

  describe("Yearly Fortune", () => {
    it("stores yearly fortune with quarterly outlook", async () => {
      const user = await createTestUserInDb();

      const fortune = await testPrisma.fortune.create({
        data: {
          userId: user.id,
          type: "yearly",
          content: JSON.stringify({
            year: 2024,
            yearlyTheme: "도약의 해",
            quarterlyOutlook: [
              { q: 1, theme: "준비", score: 70 },
              { q: 2, theme: "실행", score: 80 },
              { q: 3, theme: "수확", score: 85 },
              { q: 4, theme: "정리", score: 75 },
            ],
            luckyMonths: [3, 6, 9],
            cautionMonths: [2, 8],
            yearlyAdvice: "꾸준함이 성공의 열쇠입니다",
          }),
        },
      });

      const content = JSON.parse(fortune.content as string);
      expect(content.quarterlyOutlook).toHaveLength(4);
      expect(content.luckyMonths).toContain(6);
    });
  });

  describe("Special Event Fortune", () => {
    it("stores fortune for special dates", async () => {
      const user = await createTestUserInDb();

      const fortune = await testPrisma.fortune.create({
        data: {
          userId: user.id,
          type: "special",
          content: JSON.stringify({
            event: "birthday",
            date: "2024-05-15",
            birthdayFortune: {
              yearAhead: "성공적인 한 해가 될 것입니다",
              luckyNumbers: [3, 7, 12],
              challenges: ["인내심 기르기"],
              opportunities: ["새로운 인연", "재정적 성장"],
            },
          }),
        },
      });

      const content = JSON.parse(fortune.content as string);
      expect(content.event).toBe("birthday");
      expect(content.birthdayFortune.luckyNumbers).toHaveLength(3);
    });

    it("stores fortune for holidays", async () => {
      const user = await createTestUserInDb();

      const holidays = [
        { name: "설날", date: "2024-02-10" },
        { name: "추석", date: "2024-09-17" },
        { name: "동지", date: "2024-12-21" },
      ];

      for (const holiday of holidays) {
        await testPrisma.fortune.create({
          data: {
            userId: user.id,
            type: "special",
            content: JSON.stringify({
              event: "holiday",
              holidayName: holiday.name,
              date: holiday.date,
              fortune: `${holiday.name}의 특별한 운세입니다`,
            }),
          },
        });
      }

      const fortunes = await testPrisma.fortune.findMany({
        where: { userId: user.id, type: "special" },
      });

      expect(fortunes).toHaveLength(3);
    });
  });

  describe("Career Fortune", () => {
    it("stores detailed career fortune", async () => {
      const user = await createTestUserInDb();

      const fortune = await testPrisma.fortune.create({
        data: {
          userId: user.id,
          type: "career",
          content: JSON.stringify({
            period: "2024-Q2",
            overallOutlook: "성장",
            aspects: {
              promotion: { probability: 75, timing: "6월 중순" },
              jobChange: { advisable: false, reason: "현 직장에서 기회가 있음" },
              business: { score: 80, advice: "파트너십 주의" },
              skills: ["리더십", "커뮤니케이션"],
            },
            monthlyTrend: [70, 80, 85],
          }),
        },
      });

      const content = JSON.parse(fortune.content as string);
      expect(content.aspects.promotion.probability).toBe(75);
    });
  });

  describe("Love Fortune", () => {
    it("stores detailed love fortune", async () => {
      const user = await createTestUserInDb();

      const fortune = await testPrisma.fortune.create({
        data: {
          userId: user.id,
          type: "love",
          content: JSON.stringify({
            period: "2024-06",
            relationshipStatus: "single",
            forecast: {
              meetingChance: 80,
              bestDays: [5, 15, 22],
              compatibleSigns: ["게자리", "물고기자리"],
              advice: "적극적으로 나서세요",
            },
            communicationTips: ["진심을 표현하세요", "경청이 중요합니다"],
          }),
        },
      });

      const content = JSON.parse(fortune.content as string);
      expect(content.forecast.meetingChance).toBe(80);
    });
  });

  describe("Fortune Retrieval and Analysis", () => {
    it("retrieves fortunes by type", async () => {
      const user = await createTestUserInDb();

      const types = ["daily", "daily", "weekly", "monthly", "daily"];

      for (const type of types) {
        await testPrisma.fortune.create({
          data: {
            userId: user.id,
            type,
            content: JSON.stringify({ type }),
          },
        });
      }

      const dailyFortunes = await testPrisma.fortune.findMany({
        where: { userId: user.id, type: "daily" },
      });

      expect(dailyFortunes).toHaveLength(3);
    });

    it("retrieves fortunes in date order", async () => {
      const user = await createTestUserInDb();

      for (let i = 5; i >= 1; i--) {
        await testPrisma.fortune.create({
          data: {
            userId: user.id,
            type: "daily",
            content: JSON.stringify({ order: i }),
          },
        });
      }

      const fortunes = await testPrisma.fortune.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      });

      const orders = fortunes.map((f) => JSON.parse(f.content as string).order);
      expect(orders).toEqual([5, 4, 3, 2, 1]);
    });

    it("counts fortunes by type", async () => {
      const user = await createTestUserInDb();

      const types = ["daily", "daily", "daily", "weekly", "weekly", "monthly"];

      for (const type of types) {
        await testPrisma.fortune.create({
          data: {
            userId: user.id,
            type,
            content: "{}",
          },
        });
      }

      const counts = await testPrisma.fortune.groupBy({
        by: ["type"],
        where: { userId: user.id },
        _count: { id: true },
      });

      const dailyCount = counts.find((c) => c.type === "daily")?._count.id;
      expect(dailyCount).toBe(3);
    });
  });

  describe("Fortune Updates", () => {
    it("updates fortune content", async () => {
      const user = await createTestUserInDb();

      const fortune = await testPrisma.fortune.create({
        data: {
          userId: user.id,
          type: "daily",
          content: JSON.stringify({ score: 70 }),
        },
      });

      const updated = await testPrisma.fortune.update({
        where: { id: fortune.id },
        data: {
          content: JSON.stringify({ score: 85, revised: true }),
        },
      });

      const content = JSON.parse(updated.content as string);
      expect(content.score).toBe(85);
      expect(content.revised).toBe(true);
    });
  });
});

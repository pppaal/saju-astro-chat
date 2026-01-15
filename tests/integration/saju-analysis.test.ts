/**
 * Saju Analysis Integration Tests
 * Tests the full Saju analysis pipeline end-to-end
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  testPrisma,
  createTestUserInDb,
  cleanupAllTestUsers,
  checkTestDbConnection,
  connectTestDb,
  disconnectTestDb,
} from "./setup";
import { calculateSajuData } from "@/lib/Saju/saju";
import { generateComprehensiveReport } from "@/lib/Saju/comprehensiveReport";

const hasTestDb = await checkTestDbConnection();

describe("Saju Analysis Integration", () => {
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

  describe("Full Saju Analysis Pipeline", () => {
    it("should perform complete Saju analysis for a user", async () => {
      const user = await createTestUserInDb({
        birthDate: "1990-05-15",
        birthTime: "14:30",
        gender: "male",
      });

      const result = calculateSajuData(
        "1990-05-15",
        "14:30",
        "male",
        "solar",
        "Asia/Seoul"
      );

      expect(result).toBeDefined();
      expect(result.yearPillar).toBeDefined();
      expect(result.monthPillar).toBeDefined();
      expect(result.dayPillar).toBeDefined();
      expect(result.timePillar).toBeDefined();
      expect(result.yearPillar.heavenlyStem).toBeTruthy();
      expect(result.yearPillar.earthlyBranch).toBeTruthy();
    });

    it("should generate personality report from Saju analysis", async () => {
      const user = await createTestUserInDb({
        birthDate: "1985-03-20",
        birthTime: "10:00",
        gender: "female",
      });

      const sajuResult = calculateSajuData(
        "1985-03-20",
        "10:00",
        "female",
        "solar",
        "Asia/Seoul"
      );

      const report = generateComprehensiveReport({
        year: {
          stem: sajuResult.pillars.year.heavenlyStem.name,
          branch: sajuResult.pillars.year.earthlyBranch.name,
        },
        month: {
          stem: sajuResult.pillars.month.heavenlyStem.name,
          branch: sajuResult.pillars.month.earthlyBranch.name,
        },
        day: {
          stem: sajuResult.pillars.day.heavenlyStem.name,
          branch: sajuResult.pillars.day.earthlyBranch.name,
        },
        hour: {
          stem: sajuResult.pillars.time.heavenlyStem.name,
          branch: sajuResult.pillars.time.earthlyBranch.name,
        },
      });

      expect(report).toBeDefined();
      expect(report.summary).toBeTruthy();
      expect(report.dayMaster).toBeDefined();
      expect(report.elementBalance).toBeDefined();
      expect(report.overall).toBeDefined();
    });

    it("should handle different birth times consistently", async () => {
      const morning = calculateSajuData(
        "1990-01-01",
        "06:00",
        "male",
        "solar",
        "Asia/Seoul"
      );

      const evening = calculateSajuData(
        "1990-01-01",
        "18:00",
        "male",
        "solar",
        "Asia/Seoul"
      );

      expect(morning.yearPillar).toEqual(evening.yearPillar);
      expect(morning.monthPillar).toEqual(evening.monthPillar);
      expect(morning.dayPillar).toEqual(evening.dayPillar);
      expect(morning.timePillar).not.toEqual(evening.timePillar);
    });

    it("should handle leap month correctly", async () => {
      const result = calculateSajuData(
        "2020-04-15",
        "12:00",
        "female",
        "lunar",
        "Asia/Seoul",
        true
      );

      expect(result).toBeDefined();
      expect(result.yearPillar).toBeDefined();
    });

    it("should analyze different genders with same birth data", async () => {
      const male = calculateSajuData(
        "1995-06-10",
        "15:30",
        "male",
        "solar",
        "Asia/Seoul"
      );
      const female = calculateSajuData(
        "1995-06-10",
        "15:30",
        "female",
        "solar",
        "Asia/Seoul"
      );

      expect(male.yearPillar).toEqual(female.yearPillar);
      expect(male.monthPillar).toEqual(female.monthPillar);
      expect(male.dayPillar).toEqual(female.dayPillar);
      expect(male.timePillar).toEqual(female.timePillar);
    });
  });

  describe("Saju Data Persistence", () => {
    it("should save and retrieve Saju reading", async () => {
      const user = await createTestUserInDb({
        birthDate: "1992-08-25",
        birthTime: "09:15",
      });

      const sajuResult = calculateSajuData(
        "1992-08-25",
        "09:15",
        "male",
        "solar",
        "Asia/Seoul"
      );

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "saju",
          content: JSON.stringify(sajuResult),
        },
      });

      expect(reading).toBeDefined();
      expect(reading.type).toBe("saju");
      expect(reading.userId).toBe(user.id);

      const retrieved = await testPrisma.reading.findFirst({
        where: { userId: user.id, type: "saju" },
      });

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(reading.id);

      const parsedResult = JSON.parse(retrieved?.content as string);
      expect(parsedResult.yearPillar).toEqual(sajuResult.yearPillar);
    });

    it("should store multiple readings for same user", async () => {
      const user = await createTestUserInDb();

      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "saju",
          content: JSON.stringify({ test: "reading1" }),
        },
      });

      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: "saju",
          content: JSON.stringify({ test: "reading2" }),
        },
      });

      const readings = await testPrisma.reading.findMany({
        where: { userId: user.id, type: "saju" },
      });

      expect(readings.length).toBe(2);
    });
  });

  describe("Saju Edge Cases", () => {
    it("should handle year boundaries correctly", async () => {
      const newYear = calculateSajuData(
        "2000-01-01",
        "00:00",
        "male",
        "solar",
        "Asia/Seoul"
      );

      const oldYear = calculateSajuData(
        "1999-12-31",
        "23:59",
        "male",
        "solar",
        "Asia/Seoul"
      );

      expect(newYear.yearPillar).not.toEqual(oldYear.yearPillar);
    });

    it("should handle early morning hours (子時)", async () => {
      const midnight = calculateSajuData(
        "2000-06-15",
        "00:30",
        "female",
        "solar",
        "Asia/Seoul"
      );

      expect(midnight.timePillar).toBeDefined();
      expect(midnight.timePillar.earthlyBranch.name).toBeTruthy();
    });

    it("should validate input data ranges", async () => {
      const validResult = calculateSajuData(
        "1990-12-31",
        "23:59",
        "male",
        "solar",
        "Asia/Seoul"
      );

      expect(validResult).toBeDefined();
    });
  });
});


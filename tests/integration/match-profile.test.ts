/**
 * Match Profile Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 매칭 프로필 생성 및 관리
 * - 프로필 검색 및 필터링
 * - 프로필 활성화/비활성화
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

describe("Integration: Match Profile", () => {
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

  describe("Profile Creation", () => {
    it("creates basic match profile", async () => {
      const user = await createTestUserInDb();

      const profile = await testPrisma.matchProfile.create({
        data: {
          userId: user.id,
          displayName: "테스트유저",
          bio: "안녕하세요!",
          gender: "male",
          birthDate: new Date("1990-05-15"),
          isActive: true,
        },
      });

      expect(profile.displayName).toBe("테스트유저");
      expect(profile.isActive).toBe(true);
    });

    it("creates profile with preferences", async () => {
      const user = await createTestUserInDb();

      const profile = await testPrisma.matchProfile.create({
        data: {
          userId: user.id,
          displayName: "매칭유저",
          bio: "소개글입니다",
          gender: "female",
          birthDate: new Date("1992-08-20"),
          isActive: true,
          preferences: {
            ageRange: { min: 25, max: 35 },
            genderPreference: "male",
            distance: 50,
            interests: ["여행", "음악", "독서"],
          },
        },
      });

      const prefs = profile.preferences as { ageRange: { min: number } };
      expect(prefs.ageRange.min).toBe(25);
    });

    it("creates profile with photos", async () => {
      const user = await createTestUserInDb();

      const profile = await testPrisma.matchProfile.create({
        data: {
          userId: user.id,
          displayName: "사진유저",
          bio: "프로필입니다",
          gender: "male",
          birthDate: new Date("1988-03-10"),
          isActive: true,
          photos: [
            "https://example.com/photo1.jpg",
            "https://example.com/photo2.jpg",
            "https://example.com/photo3.jpg",
          ],
        },
      });

      expect(profile.photos).toHaveLength(3);
    });

    it("creates profile with saju info", async () => {
      const user = await createTestUserInDb();

      const profile = await testPrisma.matchProfile.create({
        data: {
          userId: user.id,
          displayName: "사주유저",
          bio: "사주 정보 포함",
          gender: "female",
          birthDate: new Date("1990-01-01"),
          birthTime: "14:30",
          isActive: true,
          sajuInfo: {
            fourPillars: { year: "庚午", month: "戊寅" },
            element: "fire",
            personality: "활발하고 적극적",
          },
        },
      });

      const saju = profile.sajuInfo as { element: string };
      expect(saju.element).toBe("fire");
    });
  });

  describe("Profile Retrieval", () => {
    it("retrieves profile by userId", async () => {
      const user = await createTestUserInDb();

      await testPrisma.matchProfile.create({
        data: {
          userId: user.id,
          displayName: "찾기테스트",
          bio: "Test",
          gender: "male",
          birthDate: new Date("1990-01-01"),
          isActive: true,
        },
      });

      const profile = await testPrisma.matchProfile.findUnique({
        where: { userId: user.id },
      });

      expect(profile?.displayName).toBe("찾기테스트");
    });

    it("retrieves active profiles only", async () => {
      const profiles: string[] = [];

      for (let i = 0; i < 5; i++) {
        const user = await createTestUserInDb();

        const profile = await testPrisma.matchProfile.create({
          data: {
            userId: user.id,
            displayName: `User ${i}`,
            bio: "Test",
            gender: i % 2 === 0 ? "male" : "female",
            birthDate: new Date("1990-01-01"),
            isActive: i < 3,
          },
        });
        profiles.push(profile.id);
      }

      const activeProfiles = await testPrisma.matchProfile.findMany({
        where: { id: { in: profiles }, isActive: true },
      });

      expect(activeProfiles).toHaveLength(3);
    });

    it("retrieves profiles by gender", async () => {
      const profiles: string[] = [];

      for (let i = 0; i < 6; i++) {
        const user = await createTestUserInDb();

        const profile = await testPrisma.matchProfile.create({
          data: {
            userId: user.id,
            displayName: `User ${i}`,
            bio: "Test",
            gender: i < 4 ? "female" : "male",
            birthDate: new Date("1990-01-01"),
            isActive: true,
          },
        });
        profiles.push(profile.id);
      }

      const femaleProfiles = await testPrisma.matchProfile.findMany({
        where: { id: { in: profiles }, gender: "female" },
      });

      expect(femaleProfiles).toHaveLength(4);
    });

    it("retrieves profiles by age range", async () => {
      const profiles: string[] = [];
      const birthYears = [1985, 1990, 1995, 2000, 1988];

      for (let i = 0; i < birthYears.length; i++) {
        const user = await createTestUserInDb();

        const profile = await testPrisma.matchProfile.create({
          data: {
            userId: user.id,
            displayName: `User ${i}`,
            bio: "Test",
            gender: "male",
            birthDate: new Date(`${birthYears[i]}-06-15`),
            isActive: true,
          },
        });
        profiles.push(profile.id);
      }

      const minDate = new Date("1988-01-01");
      const maxDate = new Date("1996-12-31");

      const ageRangeProfiles = await testPrisma.matchProfile.findMany({
        where: {
          id: { in: profiles },
          birthDate: { gte: minDate, lte: maxDate },
        },
      });

      expect(ageRangeProfiles).toHaveLength(3); // 1990, 1995, 1988
    });
  });

  describe("Profile Updates", () => {
    it("updates display name", async () => {
      const user = await createTestUserInDb();

      const profile = await testPrisma.matchProfile.create({
        data: {
          userId: user.id,
          displayName: "원래이름",
          bio: "Test",
          gender: "male",
          birthDate: new Date("1990-01-01"),
          isActive: true,
        },
      });

      const updated = await testPrisma.matchProfile.update({
        where: { id: profile.id },
        data: { displayName: "새이름" },
      });

      expect(updated.displayName).toBe("새이름");
    });

    it("updates bio", async () => {
      const user = await createTestUserInDb();

      const profile = await testPrisma.matchProfile.create({
        data: {
          userId: user.id,
          displayName: "Test",
          bio: "원래 소개글",
          gender: "female",
          birthDate: new Date("1990-01-01"),
          isActive: true,
        },
      });

      const updated = await testPrisma.matchProfile.update({
        where: { id: profile.id },
        data: { bio: "새로운 소개글입니다. 더 자세하게 작성했어요!" },
      });

      expect(updated.bio).toContain("새로운");
    });

    it("updates photos array", async () => {
      const user = await createTestUserInDb();

      const profile = await testPrisma.matchProfile.create({
        data: {
          userId: user.id,
          displayName: "Test",
          bio: "Test",
          gender: "male",
          birthDate: new Date("1990-01-01"),
          isActive: true,
          photos: ["photo1.jpg"],
        },
      });

      const updated = await testPrisma.matchProfile.update({
        where: { id: profile.id },
        data: {
          photos: ["photo1.jpg", "photo2.jpg", "photo3.jpg", "photo4.jpg"],
        },
      });

      expect(updated.photos).toHaveLength(4);
    });

    it("deactivates profile", async () => {
      const user = await createTestUserInDb();

      const profile = await testPrisma.matchProfile.create({
        data: {
          userId: user.id,
          displayName: "Test",
          bio: "Test",
          gender: "male",
          birthDate: new Date("1990-01-01"),
          isActive: true,
        },
      });

      const updated = await testPrisma.matchProfile.update({
        where: { id: profile.id },
        data: { isActive: false },
      });

      expect(updated.isActive).toBe(false);
    });

    it("updates preferences", async () => {
      const user = await createTestUserInDb();

      const profile = await testPrisma.matchProfile.create({
        data: {
          userId: user.id,
          displayName: "Test",
          bio: "Test",
          gender: "female",
          birthDate: new Date("1990-01-01"),
          isActive: true,
          preferences: { ageRange: { min: 25, max: 30 } },
        },
      });

      const updated = await testPrisma.matchProfile.update({
        where: { id: profile.id },
        data: {
          preferences: {
            ageRange: { min: 28, max: 38 },
            distance: 100,
          },
        },
      });

      const prefs = updated.preferences as { ageRange: { min: number; max: number } };
      expect(prefs.ageRange.max).toBe(38);
    });
  });

  describe("Profile Deletion", () => {
    it("deletes profile", async () => {
      const user = await createTestUserInDb();

      const profile = await testPrisma.matchProfile.create({
        data: {
          userId: user.id,
          displayName: "Delete Me",
          bio: "Test",
          gender: "male",
          birthDate: new Date("1990-01-01"),
          isActive: true,
        },
      });

      await testPrisma.matchProfile.delete({
        where: { id: profile.id },
      });

      const found = await testPrisma.matchProfile.findUnique({
        where: { id: profile.id },
      });

      expect(found).toBeNull();
    });
  });

  describe("Profile Statistics", () => {
    it("counts profiles by gender", async () => {
      const profiles: string[] = [];

      for (let i = 0; i < 7; i++) {
        const user = await createTestUserInDb();

        const profile = await testPrisma.matchProfile.create({
          data: {
            userId: user.id,
            displayName: `User ${i}`,
            bio: "Test",
            gender: i < 4 ? "male" : "female",
            birthDate: new Date("1990-01-01"),
            isActive: true,
          },
        });
        profiles.push(profile.id);
      }

      const counts = await testPrisma.matchProfile.groupBy({
        by: ["gender"],
        where: { id: { in: profiles } },
        _count: { id: true },
      });

      const maleCount = counts.find((c) => c.gender === "male")?._count.id;
      expect(maleCount).toBe(4);
    });

    it("counts active vs inactive profiles", async () => {
      const profiles: string[] = [];

      for (let i = 0; i < 5; i++) {
        const user = await createTestUserInDb();

        const profile = await testPrisma.matchProfile.create({
          data: {
            userId: user.id,
            displayName: `User ${i}`,
            bio: "Test",
            gender: "male",
            birthDate: new Date("1990-01-01"),
            isActive: i < 3,
          },
        });
        profiles.push(profile.id);
      }

      const counts = await testPrisma.matchProfile.groupBy({
        by: ["isActive"],
        where: { id: { in: profiles } },
        _count: { id: true },
      });

      const activeCount = counts.find((c) => c.isActive === true)?._count.id;
      expect(activeCount).toBe(3);
    });
  });

  describe("Profile with User Data", () => {
    it("retrieves profile with user info", async () => {
      const user = await createTestUserInDb();

      await testPrisma.matchProfile.create({
        data: {
          userId: user.id,
          displayName: "WithUser",
          bio: "Test",
          gender: "male",
          birthDate: new Date("1990-01-01"),
          isActive: true,
        },
      });

      const profile = await testPrisma.matchProfile.findUnique({
        where: { userId: user.id },
        include: { user: true },
      });

      expect(profile?.user).toBeDefined();
      expect(profile?.user.id).toBe(user.id);
    });
  });
});

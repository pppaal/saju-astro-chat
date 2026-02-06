/**
 * App Version Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 앱 버전 관리
 * - 강제 업데이트
 * - 버전 호환성
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

describe("Integration: App Version", () => {
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

  describe("Version Management", () => {
    it("creates app version", async () => {
      const version = await testPrisma.appVersion.create({
        data: {
          version: "2.5.0",
          platform: "ios",
          minOsVersion: "14.0",
          releaseDate: new Date(),
          isActive: true,
          isMandatory: false,
        },
      });

      expect(version.version).toBe("2.5.0");
      expect(version.platform).toBe("ios");
    });

    it("creates mandatory update version", async () => {
      const version = await testPrisma.appVersion.create({
        data: {
          version: "3.0.0",
          platform: "android",
          minOsVersion: "10.0",
          releaseDate: new Date(),
          isActive: true,
          isMandatory: true,
          mandatoryMessage: "중요 보안 업데이트가 포함되어 있습니다.",
        },
      });

      expect(version.isMandatory).toBe(true);
    });

    it("creates version with release notes", async () => {
      const version = await testPrisma.appVersion.create({
        data: {
          version: "2.6.0",
          platform: "ios",
          minOsVersion: "14.0",
          releaseDate: new Date(),
          isActive: true,
          isMandatory: false,
          releaseNotes: {
            ko: [
              "새로운 타로 카드 디자인",
              "성능 개선",
              "버그 수정",
            ],
            en: [
              "New tarot card design",
              "Performance improvements",
              "Bug fixes",
            ],
          },
        },
      });

      const notes = version.releaseNotes as { ko: string[] };
      expect(notes.ko).toHaveLength(3);
    });

    it("creates version with feature flags", async () => {
      const version = await testPrisma.appVersion.create({
        data: {
          version: "2.7.0",
          platform: "ios",
          minOsVersion: "15.0",
          releaseDate: new Date(),
          isActive: true,
          isMandatory: false,
          features: {
            darkMode: true,
            newHomePage: true,
            betaChat: false,
          },
        },
      });

      const features = version.features as { darkMode: boolean };
      expect(features.darkMode).toBe(true);
    });

    it("creates deprecated version", async () => {
      const version = await testPrisma.appVersion.create({
        data: {
          version: "1.0.0",
          platform: "ios",
          minOsVersion: "12.0",
          releaseDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          isActive: false,
          isDeprecated: true,
          deprecatedAt: new Date(),
          deprecationMessage: "이 버전은 더 이상 지원되지 않습니다.",
        },
      });

      expect(version.isDeprecated).toBe(true);
    });
  });

  describe("Version Retrieval", () => {
    it("retrieves latest version by platform", async () => {
      const versions = ["2.4.0", "2.5.0", "2.6.0"];

      for (let i = 0; i < versions.length; i++) {
        await testPrisma.appVersion.create({
          data: {
            version: versions[i],
            platform: "ios",
            minOsVersion: "14.0",
            releaseDate: new Date(Date.now() - (versions.length - i) * 24 * 60 * 60 * 1000),
            isActive: true,
            isMandatory: false,
          },
        });
      }

      const latest = await testPrisma.appVersion.findFirst({
        where: { platform: "ios", isActive: true },
        orderBy: { releaseDate: "desc" },
      });

      expect(latest?.version).toBe("2.6.0");
    });

    it("retrieves active versions", async () => {
      const statuses = [true, false, true, false, true];

      for (let i = 0; i < statuses.length; i++) {
        await testPrisma.appVersion.create({
          data: {
            version: `1.${i}.0`,
            platform: "android",
            minOsVersion: "10.0",
            releaseDate: new Date(),
            isActive: statuses[i],
            isMandatory: false,
          },
        });
      }

      const active = await testPrisma.appVersion.findMany({
        where: { platform: "android", isActive: true },
      });

      expect(active).toHaveLength(3);
    });

    it("retrieves mandatory versions", async () => {
      const mandatory = [false, true, false, true, false];

      for (let i = 0; i < mandatory.length; i++) {
        await testPrisma.appVersion.create({
          data: {
            version: `2.${i}.0`,
            platform: "ios",
            minOsVersion: "14.0",
            releaseDate: new Date(),
            isActive: true,
            isMandatory: mandatory[i],
          },
        });
      }

      const mandatoryVersions = await testPrisma.appVersion.findMany({
        where: { platform: "ios", isMandatory: true },
      });

      expect(mandatoryVersions).toHaveLength(2);
    });

    it("retrieves versions by release date range", async () => {
      const now = new Date();

      for (let i = 0; i < 10; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i * 7);

        await testPrisma.appVersion.create({
          data: {
            version: `3.${i}.0`,
            platform: "ios",
            minOsVersion: "14.0",
            releaseDate: date,
            isActive: true,
            isMandatory: false,
          },
        });
      }

      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recent = await testPrisma.appVersion.findMany({
        where: {
          platform: "ios",
          releaseDate: { gte: thirtyDaysAgo },
        },
      });

      expect(recent).toHaveLength(5);
    });
  });

  describe("Version Comparison", () => {
    it("checks if update is available", async () => {
      await testPrisma.appVersion.create({
        data: {
          version: "2.5.0",
          platform: "ios",
          minOsVersion: "14.0",
          releaseDate: new Date(),
          isActive: true,
          isMandatory: false,
        },
      });

      const currentVersion = "2.4.0";
      const latest = await testPrisma.appVersion.findFirst({
        where: { platform: "ios", isActive: true },
        orderBy: { releaseDate: "desc" },
      });

      const isUpdateAvailable = latest?.version !== currentVersion;
      expect(isUpdateAvailable).toBe(true);
    });

    it("checks if mandatory update is needed", async () => {
      await testPrisma.appVersion.create({
        data: {
          version: "3.0.0",
          platform: "ios",
          minOsVersion: "14.0",
          releaseDate: new Date(),
          isActive: true,
          isMandatory: true,
          minRequiredVersion: "2.5.0",
        },
      });

      const currentVersion = "2.4.0";
      const latest = await testPrisma.appVersion.findFirst({
        where: { platform: "ios", isActive: true, isMandatory: true },
        orderBy: { releaseDate: "desc" },
      });

      // Simple version comparison (in real app, use semver)
      const needsMandatoryUpdate = latest && latest.minRequiredVersion &&
        currentVersion < latest.minRequiredVersion;

      expect(needsMandatoryUpdate).toBe(true);
    });
  });

  describe("Version Statistics", () => {
    it("counts users by version", async () => {
      const versions = ["2.4.0", "2.5.0", "2.4.0", "2.6.0", "2.4.0"];

      for (let i = 0; i < versions.length; i++) {
        const user = await createTestUserInDb();
        await testPrisma.userAppVersion.create({
          data: {
            userId: user.id,
            version: versions[i],
            platform: "ios",
            lastUsedAt: new Date(),
          },
        });
      }

      const counts = await testPrisma.userAppVersion.groupBy({
        by: ["version"],
        _count: { id: true },
      });

      const v240Count = counts.find((c) => c.version === "2.4.0")?._count.id;
      expect(v240Count).toBe(3);
    });

    it("counts users by platform", async () => {
      const platforms = ["ios", "android", "ios", "android", "ios", "ios"];

      for (let i = 0; i < platforms.length; i++) {
        const user = await createTestUserInDb();
        await testPrisma.userAppVersion.create({
          data: {
            userId: user.id,
            version: "2.5.0",
            platform: platforms[i],
            lastUsedAt: new Date(),
          },
        });
      }

      const counts = await testPrisma.userAppVersion.groupBy({
        by: ["platform"],
        _count: { id: true },
      });

      const iosCount = counts.find((c) => c.platform === "ios")?._count.id;
      expect(iosCount).toBe(4);
    });

    it("finds users on deprecated versions", async () => {
      // Create deprecated version
      await testPrisma.appVersion.create({
        data: {
          version: "1.0.0",
          platform: "ios",
          minOsVersion: "12.0",
          releaseDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          isActive: false,
          isDeprecated: true,
        },
      });

      // Users on deprecated version
      for (let i = 0; i < 3; i++) {
        const user = await createTestUserInDb();
        await testPrisma.userAppVersion.create({
          data: {
            userId: user.id,
            version: "1.0.0",
            platform: "ios",
            lastUsedAt: new Date(),
          },
        });
      }

      // Users on current version
      for (let i = 0; i < 2; i++) {
        const user = await createTestUserInDb();
        await testPrisma.userAppVersion.create({
          data: {
            userId: user.id,
            version: "2.5.0",
            platform: "ios",
            lastUsedAt: new Date(),
          },
        });
      }

      const deprecatedUsers = await testPrisma.userAppVersion.findMany({
        where: { version: "1.0.0" },
      });

      expect(deprecatedUsers).toHaveLength(3);
    });
  });

  describe("Version Updates", () => {
    it("marks version as mandatory", async () => {
      const version = await testPrisma.appVersion.create({
        data: {
          version: "2.8.0",
          platform: "ios",
          minOsVersion: "14.0",
          releaseDate: new Date(),
          isActive: true,
          isMandatory: false,
        },
      });

      const updated = await testPrisma.appVersion.update({
        where: { id: version.id },
        data: {
          isMandatory: true,
          mandatoryMessage: "보안 취약점 수정",
        },
      });

      expect(updated.isMandatory).toBe(true);
    });

    it("deprecates old version", async () => {
      const version = await testPrisma.appVersion.create({
        data: {
          version: "1.5.0",
          platform: "ios",
          minOsVersion: "13.0",
          releaseDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
          isActive: true,
          isMandatory: false,
        },
      });

      const updated = await testPrisma.appVersion.update({
        where: { id: version.id },
        data: {
          isActive: false,
          isDeprecated: true,
          deprecatedAt: new Date(),
        },
      });

      expect(updated.isDeprecated).toBe(true);
    });

    it("updates release notes", async () => {
      const version = await testPrisma.appVersion.create({
        data: {
          version: "2.9.0",
          platform: "ios",
          minOsVersion: "14.0",
          releaseDate: new Date(),
          isActive: true,
          isMandatory: false,
          releaseNotes: { ko: ["초기 릴리스"] },
        },
      });

      const updated = await testPrisma.appVersion.update({
        where: { id: version.id },
        data: {
          releaseNotes: {
            ko: ["초기 릴리스", "핫픽스: 로그인 오류 수정"],
          },
        },
      });

      const notes = updated.releaseNotes as { ko: string[] };
      expect(notes.ko).toHaveLength(2);
    });
  });

  describe("Version Deletion", () => {
    it("deletes version", async () => {
      const version = await testPrisma.appVersion.create({
        data: {
          version: "0.0.1-test",
          platform: "ios",
          minOsVersion: "14.0",
          releaseDate: new Date(),
          isActive: false,
          isMandatory: false,
        },
      });

      await testPrisma.appVersion.delete({
        where: { id: version.id },
      });

      const found = await testPrisma.appVersion.findUnique({
        where: { id: version.id },
      });

      expect(found).toBeNull();
    });
  });
});

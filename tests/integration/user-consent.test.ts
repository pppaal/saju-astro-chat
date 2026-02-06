/**
 * User Consent Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 사용자 동의 관리
 * - 개인정보 처리 동의
 * - 마케팅 동의
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

describe("Integration: User Consent", () => {
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

  describe("Consent Recording", () => {
    it("records terms of service consent", async () => {
      const user = await createTestUserInDb();

      const consent = await testPrisma.userConsent.create({
        data: {
          userId: user.id,
          consentType: "terms_of_service",
          version: "1.0",
          isGranted: true,
          grantedAt: new Date(),
          ipAddress: "192.168.1.100",
        },
      });

      expect(consent.consentType).toBe("terms_of_service");
      expect(consent.isGranted).toBe(true);
    });

    it("records privacy policy consent", async () => {
      const user = await createTestUserInDb();

      const consent = await testPrisma.userConsent.create({
        data: {
          userId: user.id,
          consentType: "privacy_policy",
          version: "2.0",
          isGranted: true,
          grantedAt: new Date(),
          ipAddress: "192.168.1.100",
        },
      });

      expect(consent.consentType).toBe("privacy_policy");
    });

    it("records marketing consent", async () => {
      const user = await createTestUserInDb();

      const consent = await testPrisma.userConsent.create({
        data: {
          userId: user.id,
          consentType: "marketing",
          version: "1.0",
          isGranted: true,
          grantedAt: new Date(),
          channels: ["email", "push", "sms"],
        },
      });

      const channels = consent.channels as string[];
      expect(channels).toContain("email");
    });

    it("records data collection consent", async () => {
      const user = await createTestUserInDb();

      const consent = await testPrisma.userConsent.create({
        data: {
          userId: user.id,
          consentType: "data_collection",
          version: "1.0",
          isGranted: true,
          grantedAt: new Date(),
          scope: {
            analytics: true,
            personalization: true,
            thirdParty: false,
          },
        },
      });

      const scope = consent.scope as { analytics: boolean };
      expect(scope.analytics).toBe(true);
    });

    it("records declined consent", async () => {
      const user = await createTestUserInDb();

      const consent = await testPrisma.userConsent.create({
        data: {
          userId: user.id,
          consentType: "marketing",
          version: "1.0",
          isGranted: false,
          declinedAt: new Date(),
        },
      });

      expect(consent.isGranted).toBe(false);
    });
  });

  describe("Consent Updates", () => {
    it("withdraws consent", async () => {
      const user = await createTestUserInDb();

      const consent = await testPrisma.userConsent.create({
        data: {
          userId: user.id,
          consentType: "marketing",
          version: "1.0",
          isGranted: true,
          grantedAt: new Date(),
        },
      });

      const updated = await testPrisma.userConsent.update({
        where: { id: consent.id },
        data: {
          isGranted: false,
          withdrawnAt: new Date(),
          withdrawalReason: "Too many emails",
        },
      });

      expect(updated.isGranted).toBe(false);
      expect(updated.withdrawnAt).not.toBeNull();
    });

    it("re-grants consent", async () => {
      const user = await createTestUserInDb();

      const consent = await testPrisma.userConsent.create({
        data: {
          userId: user.id,
          consentType: "marketing",
          version: "1.0",
          isGranted: false,
          declinedAt: new Date(),
        },
      });

      const updated = await testPrisma.userConsent.update({
        where: { id: consent.id },
        data: {
          isGranted: true,
          grantedAt: new Date(),
          declinedAt: null,
        },
      });

      expect(updated.isGranted).toBe(true);
    });

    it("updates consent version", async () => {
      const user = await createTestUserInDb();

      const consent = await testPrisma.userConsent.create({
        data: {
          userId: user.id,
          consentType: "terms_of_service",
          version: "1.0",
          isGranted: true,
          grantedAt: new Date(),
        },
      });

      // Create new consent for updated version
      const newConsent = await testPrisma.userConsent.create({
        data: {
          userId: user.id,
          consentType: "terms_of_service",
          version: "2.0",
          isGranted: true,
          grantedAt: new Date(),
          previousConsentId: consent.id,
        },
      });

      expect(newConsent.version).toBe("2.0");
      expect(newConsent.previousConsentId).toBe(consent.id);
    });

    it("updates marketing channels", async () => {
      const user = await createTestUserInDb();

      const consent = await testPrisma.userConsent.create({
        data: {
          userId: user.id,
          consentType: "marketing",
          version: "1.0",
          isGranted: true,
          grantedAt: new Date(),
          channels: ["email", "push", "sms"],
        },
      });

      const updated = await testPrisma.userConsent.update({
        where: { id: consent.id },
        data: {
          channels: ["email"],
          updatedAt: new Date(),
        },
      });

      const channels = updated.channels as string[];
      expect(channels).toHaveLength(1);
    });
  });

  describe("Consent Retrieval", () => {
    it("retrieves user consents", async () => {
      const user = await createTestUserInDb();
      const types = ["terms_of_service", "privacy_policy", "marketing", "data_collection"];

      for (const type of types) {
        await testPrisma.userConsent.create({
          data: {
            userId: user.id,
            consentType: type,
            version: "1.0",
            isGranted: true,
            grantedAt: new Date(),
          },
        });
      }

      const consents = await testPrisma.userConsent.findMany({
        where: { userId: user.id },
      });

      expect(consents).toHaveLength(4);
    });

    it("retrieves consents by type", async () => {
      const types = ["marketing", "marketing", "terms_of_service", "marketing"];

      for (let i = 0; i < types.length; i++) {
        const user = await createTestUserInDb();
        await testPrisma.userConsent.create({
          data: {
            userId: user.id,
            consentType: types[i],
            version: "1.0",
            isGranted: true,
            grantedAt: new Date(),
          },
        });
      }

      const marketingConsents = await testPrisma.userConsent.findMany({
        where: { consentType: "marketing", isGranted: true },
      });

      expect(marketingConsents).toHaveLength(3);
    });

    it("retrieves latest consent version", async () => {
      const user = await createTestUserInDb();

      await testPrisma.userConsent.create({
        data: {
          userId: user.id,
          consentType: "terms_of_service",
          version: "1.0",
          isGranted: true,
          grantedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        },
      });

      await testPrisma.userConsent.create({
        data: {
          userId: user.id,
          consentType: "terms_of_service",
          version: "2.0",
          isGranted: true,
          grantedAt: new Date(),
        },
      });

      const latest = await testPrisma.userConsent.findFirst({
        where: { userId: user.id, consentType: "terms_of_service" },
        orderBy: { grantedAt: "desc" },
      });

      expect(latest?.version).toBe("2.0");
    });

    it("checks if consent is granted", async () => {
      const user = await createTestUserInDb();

      await testPrisma.userConsent.create({
        data: {
          userId: user.id,
          consentType: "marketing",
          version: "1.0",
          isGranted: true,
          grantedAt: new Date(),
        },
      });

      const consent = await testPrisma.userConsent.findFirst({
        where: {
          userId: user.id,
          consentType: "marketing",
          isGranted: true,
        },
      });

      expect(consent).not.toBeNull();
    });
  });

  describe("Consent Expiration", () => {
    it("checks expired consents", async () => {
      const user = await createTestUserInDb();
      const now = new Date();

      // Expired consent
      await testPrisma.userConsent.create({
        data: {
          userId: user.id,
          consentType: "marketing",
          version: "1.0",
          isGranted: true,
          grantedAt: new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
        },
      });

      // Valid consent
      await testPrisma.userConsent.create({
        data: {
          userId: user.id,
          consentType: "privacy_policy",
          version: "1.0",
          isGranted: true,
          grantedAt: new Date(),
          expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      const expired = await testPrisma.userConsent.findMany({
        where: {
          userId: user.id,
          expiresAt: { lt: now },
        },
      });

      expect(expired).toHaveLength(1);
    });

    it("finds consents expiring soon", async () => {
      const user = await createTestUserInDb();
      const now = new Date();

      // Expiring in 7 days
      await testPrisma.userConsent.create({
        data: {
          userId: user.id,
          consentType: "marketing",
          version: "1.0",
          isGranted: true,
          grantedAt: new Date(),
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Expiring in 60 days
      await testPrisma.userConsent.create({
        data: {
          userId: user.id,
          consentType: "terms_of_service",
          version: "1.0",
          isGranted: true,
          grantedAt: new Date(),
          expiresAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
        },
      });

      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const expiringSoon = await testPrisma.userConsent.findMany({
        where: {
          userId: user.id,
          expiresAt: { lte: thirtyDaysFromNow, gt: now },
        },
      });

      expect(expiringSoon).toHaveLength(1);
    });
  });

  describe("Consent Statistics", () => {
    it("counts consents by type", async () => {
      const types = ["marketing", "terms_of_service", "marketing", "privacy_policy", "marketing"];

      for (let i = 0; i < types.length; i++) {
        const user = await createTestUserInDb();
        await testPrisma.userConsent.create({
          data: {
            userId: user.id,
            consentType: types[i],
            version: "1.0",
            isGranted: true,
            grantedAt: new Date(),
          },
        });
      }

      const counts = await testPrisma.userConsent.groupBy({
        by: ["consentType"],
        _count: { id: true },
      });

      const marketingCount = counts.find((c) => c.consentType === "marketing")?._count.id;
      expect(marketingCount).toBe(3);
    });

    it("calculates consent rate", async () => {
      const grantedStatuses = [true, true, false, true, false, true, true, true, false, true];

      for (let i = 0; i < grantedStatuses.length; i++) {
        const user = await createTestUserInDb();
        await testPrisma.userConsent.create({
          data: {
            userId: user.id,
            consentType: "marketing",
            version: "1.0",
            isGranted: grantedStatuses[i],
            grantedAt: grantedStatuses[i] ? new Date() : null,
            declinedAt: grantedStatuses[i] ? null : new Date(),
          },
        });
      }

      const total = await testPrisma.userConsent.count({
        where: { consentType: "marketing" },
      });

      const granted = await testPrisma.userConsent.count({
        where: { consentType: "marketing", isGranted: true },
      });

      const consentRate = (granted / total) * 100;
      expect(consentRate).toBe(70);
    });

    it("counts withdrawals", async () => {
      const withdrawnStatuses = [false, true, false, true, true, false, false, true, false, false];

      for (let i = 0; i < withdrawnStatuses.length; i++) {
        const user = await createTestUserInDb();
        await testPrisma.userConsent.create({
          data: {
            userId: user.id,
            consentType: "marketing",
            version: "1.0",
            isGranted: !withdrawnStatuses[i],
            grantedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            withdrawnAt: withdrawnStatuses[i] ? new Date() : null,
          },
        });
      }

      const withdrawals = await testPrisma.userConsent.count({
        where: { consentType: "marketing", withdrawnAt: { not: null } },
      });

      expect(withdrawals).toBe(4);
    });
  });

  describe("Consent History", () => {
    it("tracks consent history", async () => {
      const user = await createTestUserInDb();

      const history = await testPrisma.consentHistory.create({
        data: {
          userId: user.id,
          consentType: "marketing",
          action: "granted",
          version: "1.0",
          timestamp: new Date(),
          ipAddress: "192.168.1.100",
        },
      });

      expect(history.action).toBe("granted");
    });

    it("retrieves consent history", async () => {
      const user = await createTestUserInDb();
      const actions = ["granted", "withdrawn", "granted", "withdrawn"];

      for (let i = 0; i < actions.length; i++) {
        await testPrisma.consentHistory.create({
          data: {
            userId: user.id,
            consentType: "marketing",
            action: actions[i],
            version: "1.0",
            timestamp: new Date(Date.now() - (actions.length - i) * 24 * 60 * 60 * 1000),
          },
        });
      }

      const history = await testPrisma.consentHistory.findMany({
        where: { userId: user.id },
        orderBy: { timestamp: "desc" },
      });

      expect(history).toHaveLength(4);
    });
  });

  describe("Consent Deletion", () => {
    it("deletes consent", async () => {
      const user = await createTestUserInDb();

      const consent = await testPrisma.userConsent.create({
        data: {
          userId: user.id,
          consentType: "marketing",
          version: "1.0",
          isGranted: true,
          grantedAt: new Date(),
        },
      });

      await testPrisma.userConsent.delete({
        where: { id: consent.id },
      });

      const found = await testPrisma.userConsent.findUnique({
        where: { id: consent.id },
      });

      expect(found).toBeNull();
    });
  });
});

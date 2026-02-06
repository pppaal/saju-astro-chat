/**
 * Content Purchase Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 프리미엄 콘텐츠 구매
 * - 접근 권한 관리
 * - 구매 내역 조회
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

describe("Integration: Content Purchase", () => {
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

  describe("Purchase Recording", () => {
    it("records content purchase", async () => {
      const user = await createTestUserInDb();

      const purchase = await testPrisma.contentPurchase.create({
        data: {
          userId: user.id,
          contentType: "detailed_saju",
          contentId: "saju_report_2024",
          amount: 9900,
          currency: "KRW",
          status: "completed",
        },
      });

      expect(purchase.contentType).toBe("detailed_saju");
      expect(purchase.amount).toBe(9900);
    });

    it("records purchase with credit payment", async () => {
      const user = await createTestUserInDb();

      const purchase = await testPrisma.contentPurchase.create({
        data: {
          userId: user.id,
          contentType: "tarot_reading",
          contentId: "tarot_celtic",
          amount: 0,
          currency: "KRW",
          status: "completed",
          paymentMethod: "credits",
          creditsUsed: 50,
        },
      });

      expect(purchase.creditsUsed).toBe(50);
      expect(purchase.paymentMethod).toBe("credits");
    });

    it("records purchase with card payment", async () => {
      const user = await createTestUserInDb();

      const purchase = await testPrisma.contentPurchase.create({
        data: {
          userId: user.id,
          contentType: "premium_reading",
          contentId: "reading_001",
          amount: 15000,
          currency: "KRW",
          status: "completed",
          paymentMethod: "card",
          paymentDetails: {
            provider: "stripe",
            transactionId: "pi_12345",
            cardLast4: "4242",
          },
        },
      });

      const details = purchase.paymentDetails as { cardLast4: string };
      expect(details.cardLast4).toBe("4242");
    });

    it("records multiple purchases for user", async () => {
      const user = await createTestUserInDb();

      const contents = [
        { type: "detailed_saju", id: "saju_1", amount: 9900 },
        { type: "compatibility", id: "compat_1", amount: 5900 },
        { type: "yearly_forecast", id: "yearly_2024", amount: 19900 },
      ];

      for (const content of contents) {
        await testPrisma.contentPurchase.create({
          data: {
            userId: user.id,
            contentType: content.type,
            contentId: content.id,
            amount: content.amount,
            currency: "KRW",
            status: "completed",
          },
        });
      }

      const purchases = await testPrisma.contentPurchase.findMany({
        where: { userId: user.id },
      });

      expect(purchases).toHaveLength(3);
    });
  });

  describe("Access Management", () => {
    it("grants content access after purchase", async () => {
      const user = await createTestUserInDb();

      // Record purchase
      await testPrisma.contentPurchase.create({
        data: {
          userId: user.id,
          contentType: "premium_saju",
          contentId: "saju_detailed",
          amount: 9900,
          currency: "KRW",
          status: "completed",
        },
      });

      // Grant access
      const access = await testPrisma.contentAccess.create({
        data: {
          userId: user.id,
          contentType: "premium_saju",
          contentId: "saju_detailed",
          accessGranted: true,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      expect(access.accessGranted).toBe(true);
    });

    it("grants lifetime access", async () => {
      const user = await createTestUserInDb();

      const access = await testPrisma.contentAccess.create({
        data: {
          userId: user.id,
          contentType: "lifetime_bundle",
          contentId: "bundle_all",
          accessGranted: true,
          expiresAt: null,
          isLifetime: true,
        },
      });

      expect(access.isLifetime).toBe(true);
      expect(access.expiresAt).toBeNull();
    });

    it("grants time-limited access", async () => {
      const user = await createTestUserInDb();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const access = await testPrisma.contentAccess.create({
        data: {
          userId: user.id,
          contentType: "monthly_fortune",
          contentId: "fortune_feb_2024",
          accessGranted: true,
          expiresAt,
        },
      });

      expect(access.expiresAt).toEqual(expiresAt);
    });
  });

  describe("Access Verification", () => {
    it("verifies valid access", async () => {
      const user = await createTestUserInDb();

      await testPrisma.contentAccess.create({
        data: {
          userId: user.id,
          contentType: "premium_saju",
          contentId: "saju_detailed",
          accessGranted: true,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      const access = await testPrisma.contentAccess.findFirst({
        where: {
          userId: user.id,
          contentType: "premium_saju",
          accessGranted: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      });

      expect(access).not.toBeNull();
    });

    it("identifies expired access", async () => {
      const user = await createTestUserInDb();

      await testPrisma.contentAccess.create({
        data: {
          userId: user.id,
          contentType: "monthly_fortune",
          contentId: "fortune_old",
          accessGranted: true,
          expiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      });

      const validAccess = await testPrisma.contentAccess.findFirst({
        where: {
          userId: user.id,
          contentType: "monthly_fortune",
          accessGranted: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      });

      expect(validAccess).toBeNull();
    });

    it("retrieves all valid accesses", async () => {
      const user = await createTestUserInDb();

      const accesses = [
        { type: "saju", expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
        { type: "tarot", expires: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        { type: "fortune", expires: null },
        { type: "compat", expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      ];

      for (let i = 0; i < accesses.length; i++) {
        await testPrisma.contentAccess.create({
          data: {
            userId: user.id,
            contentType: accesses[i].type,
            contentId: `content_${i}`,
            accessGranted: true,
            expiresAt: accesses[i].expires,
          },
        });
      }

      const validAccesses = await testPrisma.contentAccess.findMany({
        where: {
          userId: user.id,
          accessGranted: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      });

      expect(validAccesses).toHaveLength(3);
    });
  });

  describe("Purchase History", () => {
    it("retrieves purchase history", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.contentPurchase.create({
          data: {
            userId: user.id,
            contentType: "reading",
            contentId: `reading_${i}`,
            amount: 5000 + i * 1000,
            currency: "KRW",
            status: "completed",
          },
        });
      }

      const history = await testPrisma.contentPurchase.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });

      expect(history).toHaveLength(5);
    });

    it("calculates total spending", async () => {
      const user = await createTestUserInDb();

      const amounts = [9900, 5900, 19900, 3900, 15000];

      for (let i = 0; i < amounts.length; i++) {
        await testPrisma.contentPurchase.create({
          data: {
            userId: user.id,
            contentType: "various",
            contentId: `content_${i}`,
            amount: amounts[i],
            currency: "KRW",
            status: "completed",
          },
        });
      }

      const purchases = await testPrisma.contentPurchase.findMany({
        where: { userId: user.id, status: "completed" },
      });

      const totalSpent = purchases.reduce((sum, p) => sum + p.amount, 0);
      expect(totalSpent).toBe(54600);
    });

    it("filters by purchase status", async () => {
      const user = await createTestUserInDb();

      const statuses = ["completed", "completed", "refunded", "pending", "completed"];

      for (let i = 0; i < statuses.length; i++) {
        await testPrisma.contentPurchase.create({
          data: {
            userId: user.id,
            contentType: "content",
            contentId: `item_${i}`,
            amount: 5000,
            currency: "KRW",
            status: statuses[i],
          },
        });
      }

      const completed = await testPrisma.contentPurchase.findMany({
        where: { userId: user.id, status: "completed" },
      });

      expect(completed).toHaveLength(3);
    });
  });

  describe("Statistics", () => {
    it("counts purchases by content type", async () => {
      const users: string[] = [];
      const types = ["saju", "tarot", "saju", "fortune", "tarot", "saju"];

      for (let i = 0; i < types.length; i++) {
        const user = await createTestUserInDb();
        users.push(user.id);

        await testPrisma.contentPurchase.create({
          data: {
            userId: user.id,
            contentType: types[i],
            contentId: `content_${i}`,
            amount: 5000,
            currency: "KRW",
            status: "completed",
          },
        });
      }

      const counts = await testPrisma.contentPurchase.groupBy({
        by: ["contentType"],
        where: { userId: { in: users } },
        _count: { id: true },
      });

      const sajuCount = counts.find((c) => c.contentType === "saju")?._count.id;
      expect(sajuCount).toBe(3);
    });

    it("calculates revenue by type", async () => {
      const users: string[] = [];

      const purchases = [
        { type: "saju", amount: 9900 },
        { type: "tarot", amount: 5900 },
        { type: "saju", amount: 9900 },
        { type: "fortune", amount: 3900 },
        { type: "saju", amount: 9900 },
      ];

      for (let i = 0; i < purchases.length; i++) {
        const user = await createTestUserInDb();
        users.push(user.id);

        await testPrisma.contentPurchase.create({
          data: {
            userId: user.id,
            contentType: purchases[i].type,
            contentId: `content_${i}`,
            amount: purchases[i].amount,
            currency: "KRW",
            status: "completed",
          },
        });
      }

      const sajuPurchases = await testPrisma.contentPurchase.findMany({
        where: { userId: { in: users }, contentType: "saju" },
      });

      const sajuRevenue = sajuPurchases.reduce((sum, p) => sum + p.amount, 0);
      expect(sajuRevenue).toBe(29700);
    });
  });

  describe("Refunds", () => {
    it("processes refund", async () => {
      const user = await createTestUserInDb();

      const purchase = await testPrisma.contentPurchase.create({
        data: {
          userId: user.id,
          contentType: "premium_saju",
          contentId: "saju_001",
          amount: 9900,
          currency: "KRW",
          status: "completed",
        },
      });

      const refunded = await testPrisma.contentPurchase.update({
        where: { id: purchase.id },
        data: {
          status: "refunded",
          refundedAt: new Date(),
          refundReason: "고객 요청",
        },
      });

      expect(refunded.status).toBe("refunded");
    });

    it("revokes access on refund", async () => {
      const user = await createTestUserInDb();

      const access = await testPrisma.contentAccess.create({
        data: {
          userId: user.id,
          contentType: "premium_saju",
          contentId: "saju_001",
          accessGranted: true,
        },
      });

      const revoked = await testPrisma.contentAccess.update({
        where: { id: access.id },
        data: {
          accessGranted: false,
          revokedAt: new Date(),
          revokeReason: "환불 처리",
        },
      });

      expect(revoked.accessGranted).toBe(false);
    });
  });

  describe("Cleanup", () => {
    it("deletes expired access records", async () => {
      const user = await createTestUserInDb();
      const now = new Date();

      for (let i = 0; i < 3; i++) {
        await testPrisma.contentAccess.create({
          data: {
            userId: user.id,
            contentType: "old_content",
            contentId: `old_${i}`,
            accessGranted: true,
            expiresAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
          },
        });
      }

      for (let i = 0; i < 2; i++) {
        await testPrisma.contentAccess.create({
          data: {
            userId: user.id,
            contentType: "new_content",
            contentId: `new_${i}`,
            accessGranted: true,
            expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }

      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      await testPrisma.contentAccess.deleteMany({
        where: {
          userId: user.id,
          expiresAt: { lt: ninetyDaysAgo },
        },
      });

      const remaining = await testPrisma.contentAccess.findMany({
        where: { userId: user.id },
      });

      expect(remaining).toHaveLength(2);
    });
  });
});

/**
 * In-App Purchase Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 인앱 결제 기록
 * - 영수증 검증
 * - 구매 복원
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

describe("Integration: In-App Purchase", () => {
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
    it("records consumable purchase", async () => {
      const user = await createTestUserInDb();

      const purchase = await testPrisma.inAppPurchase.create({
        data: {
          userId: user.id,
          productId: "credits_100",
          productType: "consumable",
          platform: "ios",
          transactionId: `txn_${Date.now()}`,
          amount: 4900,
          currency: "KRW",
          status: "completed",
          purchasedAt: new Date(),
        },
      });

      expect(purchase.productType).toBe("consumable");
      expect(purchase.status).toBe("completed");
    });

    it("records non-consumable purchase", async () => {
      const user = await createTestUserInDb();

      const purchase = await testPrisma.inAppPurchase.create({
        data: {
          userId: user.id,
          productId: "premium_theme_pack",
          productType: "non_consumable",
          platform: "android",
          transactionId: `txn_${Date.now()}`,
          amount: 9900,
          currency: "KRW",
          status: "completed",
          purchasedAt: new Date(),
        },
      });

      expect(purchase.productType).toBe("non_consumable");
    });

    it("records subscription purchase", async () => {
      const user = await createTestUserInDb();

      const purchase = await testPrisma.inAppPurchase.create({
        data: {
          userId: user.id,
          productId: "premium_monthly",
          productType: "subscription",
          platform: "ios",
          transactionId: `sub_${Date.now()}`,
          originalTransactionId: `orig_${Date.now()}`,
          amount: 9900,
          currency: "KRW",
          status: "completed",
          purchasedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      expect(purchase.productType).toBe("subscription");
      expect(purchase.expiresAt).not.toBeNull();
    });

    it("records purchase with receipt", async () => {
      const user = await createTestUserInDb();

      const purchase = await testPrisma.inAppPurchase.create({
        data: {
          userId: user.id,
          productId: "credits_500",
          productType: "consumable",
          platform: "ios",
          transactionId: `txn_${Date.now()}`,
          amount: 19900,
          currency: "KRW",
          status: "completed",
          purchasedAt: new Date(),
          receiptData: "base64_encoded_receipt_data_here",
          receiptVerified: true,
          verifiedAt: new Date(),
        },
      });

      expect(purchase.receiptVerified).toBe(true);
    });

    it("records pending purchase", async () => {
      const user = await createTestUserInDb();

      const purchase = await testPrisma.inAppPurchase.create({
        data: {
          userId: user.id,
          productId: "premium_yearly",
          productType: "subscription",
          platform: "android",
          transactionId: `pending_${Date.now()}`,
          amount: 99000,
          currency: "KRW",
          status: "pending",
          purchasedAt: new Date(),
        },
      });

      expect(purchase.status).toBe("pending");
    });
  });

  describe("Receipt Verification", () => {
    it("marks receipt as verified", async () => {
      const user = await createTestUserInDb();

      const purchase = await testPrisma.inAppPurchase.create({
        data: {
          userId: user.id,
          productId: "credits_100",
          productType: "consumable",
          platform: "ios",
          transactionId: `txn_${Date.now()}`,
          amount: 4900,
          currency: "KRW",
          status: "pending",
          purchasedAt: new Date(),
          receiptData: "pending_receipt",
        },
      });

      const updated = await testPrisma.inAppPurchase.update({
        where: { id: purchase.id },
        data: {
          status: "completed",
          receiptVerified: true,
          verifiedAt: new Date(),
        },
      });

      expect(updated.receiptVerified).toBe(true);
      expect(updated.status).toBe("completed");
    });

    it("marks receipt as failed", async () => {
      const user = await createTestUserInDb();

      const purchase = await testPrisma.inAppPurchase.create({
        data: {
          userId: user.id,
          productId: "credits_100",
          productType: "consumable",
          platform: "ios",
          transactionId: `txn_${Date.now()}`,
          amount: 4900,
          currency: "KRW",
          status: "pending",
          purchasedAt: new Date(),
        },
      });

      const updated = await testPrisma.inAppPurchase.update({
        where: { id: purchase.id },
        data: {
          status: "failed",
          receiptVerified: false,
          failureReason: "Invalid receipt",
        },
      });

      expect(updated.status).toBe("failed");
    });
  });

  describe("Purchase Retrieval", () => {
    it("retrieves user purchases", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.inAppPurchase.create({
          data: {
            userId: user.id,
            productId: `product_${i}`,
            productType: "consumable",
            platform: "ios",
            transactionId: `txn_${Date.now()}_${i}`,
            amount: 4900,
            currency: "KRW",
            status: "completed",
            purchasedAt: new Date(),
          },
        });
      }

      const purchases = await testPrisma.inAppPurchase.findMany({
        where: { userId: user.id },
      });

      expect(purchases).toHaveLength(5);
    });

    it("retrieves purchases by platform", async () => {
      const user = await createTestUserInDb();
      const platforms = ["ios", "android", "ios", "android", "ios"];

      for (let i = 0; i < platforms.length; i++) {
        await testPrisma.inAppPurchase.create({
          data: {
            userId: user.id,
            productId: `product_${i}`,
            productType: "consumable",
            platform: platforms[i],
            transactionId: `txn_${Date.now()}_${i}`,
            amount: 4900,
            currency: "KRW",
            status: "completed",
            purchasedAt: new Date(),
          },
        });
      }

      const iosPurchases = await testPrisma.inAppPurchase.findMany({
        where: { userId: user.id, platform: "ios" },
      });

      expect(iosPurchases).toHaveLength(3);
    });

    it("retrieves purchases by product type", async () => {
      const user = await createTestUserInDb();
      const types = ["consumable", "subscription", "consumable", "non_consumable", "consumable"];

      for (let i = 0; i < types.length; i++) {
        await testPrisma.inAppPurchase.create({
          data: {
            userId: user.id,
            productId: `product_${i}`,
            productType: types[i],
            platform: "ios",
            transactionId: `txn_${Date.now()}_${i}`,
            amount: 4900,
            currency: "KRW",
            status: "completed",
            purchasedAt: new Date(),
          },
        });
      }

      const consumables = await testPrisma.inAppPurchase.findMany({
        where: { userId: user.id, productType: "consumable" },
      });

      expect(consumables).toHaveLength(3);
    });

    it("retrieves active subscriptions", async () => {
      const user = await createTestUserInDb();
      const now = new Date();

      // Active subscription
      await testPrisma.inAppPurchase.create({
        data: {
          userId: user.id,
          productId: "premium_monthly",
          productType: "subscription",
          platform: "ios",
          transactionId: `sub_active_${Date.now()}`,
          amount: 9900,
          currency: "KRW",
          status: "completed",
          purchasedAt: new Date(),
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Expired subscription
      await testPrisma.inAppPurchase.create({
        data: {
          userId: user.id,
          productId: "premium_monthly",
          productType: "subscription",
          platform: "ios",
          transactionId: `sub_expired_${Date.now()}`,
          amount: 9900,
          currency: "KRW",
          status: "completed",
          purchasedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        },
      });

      const active = await testPrisma.inAppPurchase.findMany({
        where: {
          userId: user.id,
          productType: "subscription",
          expiresAt: { gt: now },
        },
      });

      expect(active).toHaveLength(1);
    });
  });

  describe("Purchase Restoration", () => {
    it("records restored purchase", async () => {
      const user = await createTestUserInDb();

      const purchase = await testPrisma.inAppPurchase.create({
        data: {
          userId: user.id,
          productId: "premium_lifetime",
          productType: "non_consumable",
          platform: "ios",
          transactionId: `restore_${Date.now()}`,
          originalTransactionId: `orig_${Date.now() - 365 * 24 * 60 * 60 * 1000}`,
          amount: 0,
          currency: "KRW",
          status: "restored",
          purchasedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          restoredAt: new Date(),
        },
      });

      expect(purchase.status).toBe("restored");
      expect(purchase.restoredAt).not.toBeNull();
    });

    it("retrieves restorable purchases", async () => {
      const user = await createTestUserInDb();

      // Non-consumable (restorable)
      await testPrisma.inAppPurchase.create({
        data: {
          userId: user.id,
          productId: "theme_pack",
          productType: "non_consumable",
          platform: "ios",
          transactionId: `nc_${Date.now()}`,
          amount: 9900,
          currency: "KRW",
          status: "completed",
          purchasedAt: new Date(),
        },
      });

      // Consumable (not restorable)
      await testPrisma.inAppPurchase.create({
        data: {
          userId: user.id,
          productId: "credits_100",
          productType: "consumable",
          platform: "ios",
          transactionId: `c_${Date.now()}`,
          amount: 4900,
          currency: "KRW",
          status: "completed",
          purchasedAt: new Date(),
        },
      });

      // Subscription (restorable)
      await testPrisma.inAppPurchase.create({
        data: {
          userId: user.id,
          productId: "premium_monthly",
          productType: "subscription",
          platform: "ios",
          transactionId: `sub_${Date.now()}`,
          amount: 9900,
          currency: "KRW",
          status: "completed",
          purchasedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const restorable = await testPrisma.inAppPurchase.findMany({
        where: {
          userId: user.id,
          productType: { in: ["non_consumable", "subscription"] },
          status: "completed",
        },
      });

      expect(restorable).toHaveLength(2);
    });
  });

  describe("Purchase Statistics", () => {
    it("calculates total revenue", async () => {
      const user = await createTestUserInDb();
      const amounts = [4900, 9900, 19900, 4900, 9900]; // 49500 total

      for (let i = 0; i < amounts.length; i++) {
        await testPrisma.inAppPurchase.create({
          data: {
            userId: user.id,
            productId: `product_${i}`,
            productType: "consumable",
            platform: "ios",
            transactionId: `txn_${Date.now()}_${i}`,
            amount: amounts[i],
            currency: "KRW",
            status: "completed",
            purchasedAt: new Date(),
          },
        });
      }

      const purchases = await testPrisma.inAppPurchase.findMany({
        where: { userId: user.id, status: "completed" },
      });

      const totalRevenue = purchases.reduce((sum, p) => sum + p.amount, 0);
      expect(totalRevenue).toBe(49500);
    });

    it("counts purchases by product", async () => {
      const user = await createTestUserInDb();
      const products = ["credits_100", "credits_500", "credits_100", "premium_monthly", "credits_100"];

      for (let i = 0; i < products.length; i++) {
        await testPrisma.inAppPurchase.create({
          data: {
            userId: user.id,
            productId: products[i],
            productType: "consumable",
            platform: "ios",
            transactionId: `txn_${Date.now()}_${i}`,
            amount: 4900,
            currency: "KRW",
            status: "completed",
            purchasedAt: new Date(),
          },
        });
      }

      const counts = await testPrisma.inAppPurchase.groupBy({
        by: ["productId"],
        where: { userId: user.id },
        _count: { id: true },
      });

      const credits100Count = counts.find((c) => c.productId === "credits_100")?._count.id;
      expect(credits100Count).toBe(3);
    });

    it("calculates revenue by platform", async () => {
      const purchases = [
        { platform: "ios", amount: 9900 },
        { platform: "android", amount: 4900 },
        { platform: "ios", amount: 19900 },
        { platform: "android", amount: 9900 },
        { platform: "ios", amount: 4900 },
      ];

      for (let i = 0; i < purchases.length; i++) {
        const user = await createTestUserInDb();
        await testPrisma.inAppPurchase.create({
          data: {
            userId: user.id,
            productId: `product_${i}`,
            productType: "consumable",
            platform: purchases[i].platform,
            transactionId: `txn_${Date.now()}_${i}`,
            amount: purchases[i].amount,
            currency: "KRW",
            status: "completed",
            purchasedAt: new Date(),
          },
        });
      }

      const iosPurchases = await testPrisma.inAppPurchase.findMany({
        where: { platform: "ios", status: "completed" },
      });

      const iosRevenue = iosPurchases.reduce((sum, p) => sum + p.amount, 0);
      expect(iosRevenue).toBe(34700);
    });
  });

  describe("Refund Processing", () => {
    it("records refund", async () => {
      const user = await createTestUserInDb();

      const purchase = await testPrisma.inAppPurchase.create({
        data: {
          userId: user.id,
          productId: "credits_100",
          productType: "consumable",
          platform: "ios",
          transactionId: `txn_${Date.now()}`,
          amount: 4900,
          currency: "KRW",
          status: "completed",
          purchasedAt: new Date(),
        },
      });

      const updated = await testPrisma.inAppPurchase.update({
        where: { id: purchase.id },
        data: {
          status: "refunded",
          refundedAt: new Date(),
          refundReason: "User requested",
        },
      });

      expect(updated.status).toBe("refunded");
    });
  });

  describe("Purchase Deletion", () => {
    it("deletes purchase", async () => {
      const user = await createTestUserInDb();

      const purchase = await testPrisma.inAppPurchase.create({
        data: {
          userId: user.id,
          productId: "test_product",
          productType: "consumable",
          platform: "ios",
          transactionId: `txn_${Date.now()}`,
          amount: 100,
          currency: "KRW",
          status: "failed",
          purchasedAt: new Date(),
        },
      });

      await testPrisma.inAppPurchase.delete({
        where: { id: purchase.id },
      });

      const found = await testPrisma.inAppPurchase.findUnique({
        where: { id: purchase.id },
      });

      expect(found).toBeNull();
    });
  });
});

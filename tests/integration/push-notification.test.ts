/**
 * Push Notification Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 푸시 구독 관리
 * - 알림 설정 저장
 * - 구독 토큰 관리
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

describe("Integration: Push Notification", () => {
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

  describe("Push Subscription Creation", () => {
    it("creates push subscription for user", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: `https://fcm.googleapis.com/fcm/send/${Date.now()}`,
          p256dh: "test_p256dh_key",
          auth: "test_auth_key",
        },
      });

      expect(subscription).toBeDefined();
      expect(subscription.endpoint).toContain("fcm.googleapis.com");
    });

    it("creates subscription with device info", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: `https://push.example.com/${Date.now()}`,
          p256dh: "key_p256dh",
          auth: "key_auth",
          deviceType: "mobile",
          deviceName: "iPhone 15",
          browser: "Safari",
        },
      });

      expect(subscription.deviceType).toBe("mobile");
      expect(subscription.deviceName).toBe("iPhone 15");
    });

    it("creates multiple subscriptions for same user", async () => {
      const user = await createTestUserInDb();

      const devices = ["mobile", "desktop", "tablet"];

      for (const device of devices) {
        await testPrisma.pushSubscription.create({
          data: {
            userId: user.id,
            endpoint: `https://push.example.com/${device}_${Date.now()}`,
            p256dh: `key_${device}`,
            auth: `auth_${device}`,
            deviceType: device,
          },
        });
      }

      const subscriptions = await testPrisma.pushSubscription.findMany({
        where: { userId: user.id },
      });

      expect(subscriptions).toHaveLength(3);
    });

    it("creates subscription with expiration", async () => {
      const user = await createTestUserInDb();
      const expirationTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const subscription = await testPrisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: `https://push.example.com/${Date.now()}`,
          p256dh: "key_p256dh",
          auth: "key_auth",
          expirationTime,
        },
      });

      expect(subscription.expirationTime?.getTime()).toBeCloseTo(expirationTime.getTime(), -3);
    });
  });

  describe("Push Subscription Retrieval", () => {
    it("retrieves all subscriptions for user", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 3; i++) {
        await testPrisma.pushSubscription.create({
          data: {
            userId: user.id,
            endpoint: `https://push.example.com/${i}_${Date.now()}`,
            p256dh: `key_${i}`,
            auth: `auth_${i}`,
          },
        });
      }

      const subscriptions = await testPrisma.pushSubscription.findMany({
        where: { userId: user.id },
      });

      expect(subscriptions).toHaveLength(3);
    });

    it("retrieves subscription by endpoint", async () => {
      const user = await createTestUserInDb();
      const endpoint = `https://push.example.com/unique_${Date.now()}`;

      await testPrisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint,
          p256dh: "key",
          auth: "auth",
        },
      });

      const subscription = await testPrisma.pushSubscription.findFirst({
        where: { endpoint },
      });

      expect(subscription).not.toBeNull();
      expect(subscription?.userId).toBe(user.id);
    });

    it("retrieves active subscriptions only", async () => {
      const user = await createTestUserInDb();
      const now = new Date();

      // Active subscription
      await testPrisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: `https://push.example.com/active_${Date.now()}`,
          p256dh: "key",
          auth: "auth",
          expirationTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      });

      // Expired subscription
      await testPrisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: `https://push.example.com/expired_${Date.now()}`,
          p256dh: "key",
          auth: "auth",
          expirationTime: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
      });

      const activeSubscriptions = await testPrisma.pushSubscription.findMany({
        where: {
          userId: user.id,
          OR: [
            { expirationTime: null },
            { expirationTime: { gt: now } },
          ],
        },
      });

      expect(activeSubscriptions).toHaveLength(1);
    });

    it("retrieves subscriptions by device type", async () => {
      const user = await createTestUserInDb();

      const devices = ["mobile", "mobile", "desktop", "mobile"];

      for (let i = 0; i < devices.length; i++) {
        await testPrisma.pushSubscription.create({
          data: {
            userId: user.id,
            endpoint: `https://push.example.com/${i}_${Date.now()}`,
            p256dh: `key_${i}`,
            auth: `auth_${i}`,
            deviceType: devices[i],
          },
        });
      }

      const mobileSubscriptions = await testPrisma.pushSubscription.findMany({
        where: { userId: user.id, deviceType: "mobile" },
      });

      expect(mobileSubscriptions).toHaveLength(3);
    });
  });

  describe("Push Subscription Updates", () => {
    it("updates subscription keys", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: `https://push.example.com/${Date.now()}`,
          p256dh: "old_key",
          auth: "old_auth",
        },
      });

      const updated = await testPrisma.pushSubscription.update({
        where: { id: subscription.id },
        data: {
          p256dh: "new_key",
          auth: "new_auth",
        },
      });

      expect(updated.p256dh).toBe("new_key");
      expect(updated.auth).toBe("new_auth");
    });

    it("updates device information", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: `https://push.example.com/${Date.now()}`,
          p256dh: "key",
          auth: "auth",
          deviceName: "Old Device",
        },
      });

      const updated = await testPrisma.pushSubscription.update({
        where: { id: subscription.id },
        data: { deviceName: "New Device" },
      });

      expect(updated.deviceName).toBe("New Device");
    });

    it("extends subscription expiration", async () => {
      const user = await createTestUserInDb();
      const originalExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const subscription = await testPrisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: `https://push.example.com/${Date.now()}`,
          p256dh: "key",
          auth: "auth",
          expirationTime: originalExpiry,
        },
      });

      const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const updated = await testPrisma.pushSubscription.update({
        where: { id: subscription.id },
        data: { expirationTime: newExpiry },
      });

      expect(updated.expirationTime!.getTime()).toBeGreaterThan(originalExpiry.getTime());
    });
  });

  describe("Push Subscription Deletion", () => {
    it("deletes subscription by id", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: `https://push.example.com/${Date.now()}`,
          p256dh: "key",
          auth: "auth",
        },
      });

      await testPrisma.pushSubscription.delete({
        where: { id: subscription.id },
      });

      const found = await testPrisma.pushSubscription.findUnique({
        where: { id: subscription.id },
      });

      expect(found).toBeNull();
    });

    it("deletes subscription by endpoint", async () => {
      const user = await createTestUserInDb();
      const endpoint = `https://push.example.com/delete_${Date.now()}`;

      await testPrisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint,
          p256dh: "key",
          auth: "auth",
        },
      });

      await testPrisma.pushSubscription.deleteMany({
        where: { endpoint },
      });

      const found = await testPrisma.pushSubscription.findFirst({
        where: { endpoint },
      });

      expect(found).toBeNull();
    });

    it("deletes all subscriptions for user", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.pushSubscription.create({
          data: {
            userId: user.id,
            endpoint: `https://push.example.com/${i}_${Date.now()}`,
            p256dh: `key_${i}`,
            auth: `auth_${i}`,
          },
        });
      }

      await testPrisma.pushSubscription.deleteMany({
        where: { userId: user.id },
      });

      const remaining = await testPrisma.pushSubscription.findMany({
        where: { userId: user.id },
      });

      expect(remaining).toHaveLength(0);
    });

    it("cleans up expired subscriptions", async () => {
      const user = await createTestUserInDb();
      const now = new Date();

      // Expired subscriptions
      for (let i = 0; i < 3; i++) {
        await testPrisma.pushSubscription.create({
          data: {
            userId: user.id,
            endpoint: `https://push.example.com/expired_${i}_${Date.now()}`,
            p256dh: `key_${i}`,
            auth: `auth_${i}`,
            expirationTime: new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000),
          },
        });
      }

      // Active subscription
      await testPrisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: `https://push.example.com/active_${Date.now()}`,
          p256dh: "key",
          auth: "auth",
          expirationTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      });

      await testPrisma.pushSubscription.deleteMany({
        where: {
          userId: user.id,
          expirationTime: { lt: now },
        },
      });

      const remaining = await testPrisma.pushSubscription.findMany({
        where: { userId: user.id },
      });

      expect(remaining).toHaveLength(1);
    });
  });

  describe("Push Subscription Statistics", () => {
    it("counts subscriptions by device type", async () => {
      const users: string[] = [];

      for (let i = 0; i < 5; i++) {
        const user = await createTestUserInDb();
        users.push(user.id);

        await testPrisma.pushSubscription.create({
          data: {
            userId: user.id,
            endpoint: `https://push.example.com/${i}_${Date.now()}`,
            p256dh: `key_${i}`,
            auth: `auth_${i}`,
            deviceType: i < 3 ? "mobile" : "desktop",
          },
        });
      }

      const counts = await testPrisma.pushSubscription.groupBy({
        by: ["deviceType"],
        where: { userId: { in: users } },
        _count: { id: true },
      });

      const mobileCount = counts.find((c) => c.deviceType === "mobile")?._count.id;
      expect(mobileCount).toBe(3);
    });

    it("counts total subscriptions per user", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 4; i++) {
        await testPrisma.pushSubscription.create({
          data: {
            userId: user.id,
            endpoint: `https://push.example.com/${i}_${Date.now()}`,
            p256dh: `key_${i}`,
            auth: `auth_${i}`,
          },
        });
      }

      const count = await testPrisma.pushSubscription.count({
        where: { userId: user.id },
      });

      expect(count).toBe(4);
    });
  });

  describe("Multi-User Subscription Isolation", () => {
    it("isolates subscriptions between users", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      await testPrisma.pushSubscription.create({
        data: {
          userId: user1.id,
          endpoint: `https://push.example.com/user1_${Date.now()}`,
          p256dh: "key1",
          auth: "auth1",
        },
      });

      await testPrisma.pushSubscription.create({
        data: {
          userId: user2.id,
          endpoint: `https://push.example.com/user2_${Date.now()}`,
          p256dh: "key2",
          auth: "auth2",
        },
      });

      const user1Subs = await testPrisma.pushSubscription.findMany({
        where: { userId: user1.id },
      });

      const user2Subs = await testPrisma.pushSubscription.findMany({
        where: { userId: user2.id },
      });

      expect(user1Subs).toHaveLength(1);
      expect(user2Subs).toHaveLength(1);
      expect(user1Subs[0].endpoint).not.toBe(user2Subs[0].endpoint);
    });
  });
});

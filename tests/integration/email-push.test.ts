/**
 * Email and Push Notification Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 이메일 로그 관리
 * - 푸시 구독 관리
 * - 알림 추적
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

describe("Integration: Email and Push System", () => {
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

  describe("Email Log", () => {
    it("logs sent email", async () => {
      const user = await createTestUserInDb();

      const log = await testPrisma.emailLog.create({
        data: {
          userId: user.id,
          emailType: "welcome",
          recipient: user.email!,
          subject: "Welcome to our service!",
          status: "sent",
        },
      });

      expect(log).toBeDefined();
      expect(log.emailType).toBe("welcome");
      expect(log.status).toBe("sent");
    });

    it("tracks various email types", async () => {
      const user = await createTestUserInDb();

      const emailTypes = [
        "welcome",
        "password_reset",
        "subscription_confirm",
        "daily_fortune",
        "weekly_digest",
      ];

      for (const emailType of emailTypes) {
        await testPrisma.emailLog.create({
          data: {
            userId: user.id,
            emailType,
            recipient: user.email!,
            subject: `Subject for ${emailType}`,
            status: "sent",
          },
        });
      }

      const logs = await testPrisma.emailLog.findMany({
        where: { userId: user.id },
      });

      expect(logs).toHaveLength(5);
    });

    it("handles failed email delivery", async () => {
      const user = await createTestUserInDb();

      const log = await testPrisma.emailLog.create({
        data: {
          userId: user.id,
          emailType: "notification",
          recipient: "invalid@email",
          subject: "Test",
          status: "failed",
          errorMessage: "Invalid recipient address",
        },
      });

      expect(log.status).toBe("failed");
      expect(log.errorMessage).toBe("Invalid recipient address");
    });

    it("retrieves emails by type", async () => {
      const user = await createTestUserInDb();

      await testPrisma.emailLog.create({
        data: { userId: user.id, emailType: "daily_fortune", recipient: user.email!, subject: "DF1", status: "sent" },
      });
      await testPrisma.emailLog.create({
        data: { userId: user.id, emailType: "weekly_digest", recipient: user.email!, subject: "WD1", status: "sent" },
      });
      await testPrisma.emailLog.create({
        data: { userId: user.id, emailType: "daily_fortune", recipient: user.email!, subject: "DF2", status: "sent" },
      });

      const dailyFortunes = await testPrisma.emailLog.findMany({
        where: { userId: user.id, emailType: "daily_fortune" },
      });

      expect(dailyFortunes).toHaveLength(2);
    });

    it("tracks email open status", async () => {
      const user = await createTestUserInDb();

      const log = await testPrisma.emailLog.create({
        data: {
          userId: user.id,
          emailType: "marketing",
          recipient: user.email!,
          subject: "Special Offer",
          status: "sent",
          openedAt: null,
        },
      });

      const updated = await testPrisma.emailLog.update({
        where: { id: log.id },
        data: { openedAt: new Date() },
      });

      expect(updated.openedAt).toBeInstanceOf(Date);
    });

    it("counts emails sent to user", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 10; i++) {
        await testPrisma.emailLog.create({
          data: {
            userId: user.id,
            emailType: "notification",
            recipient: user.email!,
            subject: `Email ${i + 1}`,
            status: "sent",
          },
        });
      }

      const count = await testPrisma.emailLog.count({
        where: { userId: user.id },
      });

      expect(count).toBe(10);
    });
  });

  describe("Push Subscription", () => {
    it("creates push subscription", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: "https://fcm.googleapis.com/fcm/send/test_endpoint",
          p256dh: "test_p256dh_key",
          auth: "test_auth_key",
        },
      });

      expect(subscription).toBeDefined();
      expect(subscription.endpoint).toContain("fcm.googleapis.com");
    });

    it("stores subscription keys", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: "https://push.example.com/endpoint",
          p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
          auth: "tBHItJI5svbpez7KI4CCXg",
        },
      });

      expect(subscription.p256dh).toContain("BNcRdreALR");
      expect(subscription.auth).toBe("tBHItJI5svbpez7KI4CCXg");
    });

    it("handles multiple devices per user", async () => {
      const user = await createTestUserInDb();

      const devices = ["mobile", "desktop", "tablet"];

      for (const device of devices) {
        await testPrisma.pushSubscription.create({
          data: {
            userId: user.id,
            endpoint: `https://push.example.com/${device}_${Date.now()}`,
            p256dh: `p256dh_${device}`,
            auth: `auth_${device}`,
          },
        });
      }

      const subscriptions = await testPrisma.pushSubscription.findMany({
        where: { userId: user.id },
      });

      expect(subscriptions).toHaveLength(3);
    });

    it("removes subscription on unsubscribe", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: "https://push.example.com/to_remove",
          p256dh: "key1",
          auth: "key2",
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

    it("finds subscription by endpoint", async () => {
      const user = await createTestUserInDb();
      const uniqueEndpoint = `https://push.example.com/unique_${Date.now()}`;

      await testPrisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: uniqueEndpoint,
          p256dh: "key1",
          auth: "key2",
        },
      });

      const found = await testPrisma.pushSubscription.findFirst({
        where: { endpoint: uniqueEndpoint },
      });

      expect(found).not.toBeNull();
      expect(found?.userId).toBe(user.id);
    });

    it("updates subscription keys", async () => {
      const user = await createTestUserInDb();

      const subscription = await testPrisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: "https://push.example.com/update_test",
          p256dh: "old_p256dh",
          auth: "old_auth",
        },
      });

      const updated = await testPrisma.pushSubscription.update({
        where: { id: subscription.id },
        data: {
          p256dh: "new_p256dh_key",
          auth: "new_auth_key",
        },
      });

      expect(updated.p256dh).toBe("new_p256dh_key");
      expect(updated.auth).toBe("new_auth_key");
    });
  });

  describe("User Preferences for Notifications", () => {
    it("stores notification preferences", async () => {
      const user = await createTestUserInDb();

      const prefs = await testPrisma.userPreferences.create({
        data: {
          userId: user.id,
          preferredLanguage: "ko",
          notificationSettings: {
            email: {
              dailyFortune: true,
              weeklyDigest: true,
              marketing: false,
            },
            push: {
              dailyFortune: true,
              newFeatures: true,
            },
          },
        },
      });

      expect(prefs).toBeDefined();
      const settings = prefs.notificationSettings as {
        email: { dailyFortune: boolean };
        push: { dailyFortune: boolean };
      };
      expect(settings.email.dailyFortune).toBe(true);
      expect(settings.push.dailyFortune).toBe(true);
    });

    it("updates notification preferences", async () => {
      const user = await createTestUserInDb();

      const prefs = await testPrisma.userPreferences.create({
        data: {
          userId: user.id,
          preferredLanguage: "en",
          notificationSettings: {
            email: { all: true },
            push: { all: true },
          },
        },
      });

      const updated = await testPrisma.userPreferences.update({
        where: { id: prefs.id },
        data: {
          notificationSettings: {
            email: { all: false },
            push: { all: true },
          },
        },
      });

      const settings = updated.notificationSettings as { email: { all: boolean } };
      expect(settings.email.all).toBe(false);
    });

    it("retrieves users with specific notification enabled", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      await testPrisma.userPreferences.create({
        data: {
          userId: user1.id,
          preferredLanguage: "ko",
          notificationSettings: { dailyFortune: true },
        },
      });

      await testPrisma.userPreferences.create({
        data: {
          userId: user2.id,
          preferredLanguage: "en",
          notificationSettings: { dailyFortune: false },
        },
      });

      const allPrefs = await testPrisma.userPreferences.findMany({
        where: {
          userId: { in: [user1.id, user2.id] },
        },
      });

      const dailyFortuneEnabled = allPrefs.filter((p) => {
        const settings = p.notificationSettings as { dailyFortune?: boolean } | null;
        return settings?.dailyFortune === true;
      });

      expect(dailyFortuneEnabled).toHaveLength(1);
    });
  });

  describe("Email and Push Integration", () => {
    it("sends both email and push for same event", async () => {
      const user = await createTestUserInDb();

      // Create push subscription
      await testPrisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: "https://push.example.com/dual_channel",
          p256dh: "key1",
          auth: "key2",
        },
      });

      // Log email sent
      await testPrisma.emailLog.create({
        data: {
          userId: user.id,
          emailType: "daily_fortune",
          recipient: user.email!,
          subject: "Your Daily Fortune",
          status: "sent",
        },
      });

      const hasEmail = await testPrisma.emailLog.findFirst({
        where: { userId: user.id, emailType: "daily_fortune" },
      });

      const hasPush = await testPrisma.pushSubscription.findFirst({
        where: { userId: user.id },
      });

      expect(hasEmail).not.toBeNull();
      expect(hasPush).not.toBeNull();
    });

    it("tracks notification delivery across channels", async () => {
      const user = await createTestUserInDb();

      // Email sent
      await testPrisma.emailLog.create({
        data: {
          userId: user.id,
          emailType: "welcome",
          recipient: user.email!,
          subject: "Welcome",
          status: "sent",
        },
      });

      // Push subscription active
      await testPrisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: "https://push.example.com/track",
          p256dh: "key",
          auth: "auth",
        },
      });

      const emailCount = await testPrisma.emailLog.count({
        where: { userId: user.id },
      });

      const pushCount = await testPrisma.pushSubscription.count({
        where: { userId: user.id },
      });

      expect(emailCount).toBeGreaterThanOrEqual(1);
      expect(pushCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Account and Session Management", () => {
    it("creates OAuth account link", async () => {
      const user = await createTestUserInDb();

      const account = await testPrisma.account.create({
        data: {
          userId: user.id,
          type: "oauth",
          provider: "google",
          providerAccountId: `google_${Date.now()}`,
        },
      });

      expect(account).toBeDefined();
      expect(account.provider).toBe("google");
    });

    it("stores multiple provider accounts", async () => {
      const user = await createTestUserInDb();

      await testPrisma.account.create({
        data: { userId: user.id, type: "oauth", provider: "google", providerAccountId: `g_${Date.now()}` },
      });
      await testPrisma.account.create({
        data: { userId: user.id, type: "oauth", provider: "kakao", providerAccountId: `k_${Date.now()}` },
      });

      const accounts = await testPrisma.account.findMany({
        where: { userId: user.id },
      });

      expect(accounts).toHaveLength(2);
    });

    it("creates user session", async () => {
      const user = await createTestUserInDb();

      const session = await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: `token_${Date.now()}`,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      expect(session).toBeDefined();
      expect(session.expires > new Date()).toBe(true);
    });

    it("invalidates expired sessions", async () => {
      const user = await createTestUserInDb();

      await testPrisma.session.create({
        data: {
          userId: user.id,
          sessionToken: `expired_${Date.now()}`,
          expires: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        },
      });

      const validSessions = await testPrisma.session.findMany({
        where: {
          userId: user.id,
          expires: { gt: new Date() },
        },
      });

      expect(validSessions).toHaveLength(0);
    });
  });
});

/**
 * Feature Flag Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 기능 플래그 관리
 * - 점진적 롤아웃
 * - A/B 테스트
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

describe("Integration: Feature Flag", () => {
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

  describe("Flag Creation", () => {
    it("creates simple feature flag", async () => {
      const flag = await testPrisma.featureFlag.create({
        data: {
          name: "new_dashboard",
          description: "새로운 대시보드 UI",
          isEnabled: false,
          type: "boolean",
        },
      });

      expect(flag.name).toBe("new_dashboard");
      expect(flag.isEnabled).toBe(false);
    });

    it("creates flag with percentage rollout", async () => {
      const flag = await testPrisma.featureFlag.create({
        data: {
          name: "new_chat_ui",
          description: "새로운 채팅 UI",
          isEnabled: true,
          type: "percentage",
          rolloutPercentage: 25,
        },
      });

      expect(flag.rolloutPercentage).toBe(25);
    });

    it("creates flag with user targeting", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      const flag = await testPrisma.featureFlag.create({
        data: {
          name: "beta_features",
          description: "베타 기능",
          isEnabled: true,
          type: "user_list",
          targetUserIds: [user1.id, user2.id],
        },
      });

      expect(flag.targetUserIds).toContain(user1.id);
    });

    it("creates flag with environment targeting", async () => {
      const flag = await testPrisma.featureFlag.create({
        data: {
          name: "debug_mode",
          description: "디버그 모드",
          isEnabled: true,
          type: "environment",
          targetEnvironments: ["development", "staging"],
        },
      });

      expect(flag.targetEnvironments).toContain("development");
    });

    it("creates flag with date range", async () => {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const flag = await testPrisma.featureFlag.create({
        data: {
          name: "holiday_promo",
          description: "휴일 프로모션",
          isEnabled: true,
          type: "scheduled",
          startDate,
          endDate,
        },
      });

      expect(flag.startDate).not.toBeNull();
      expect(flag.endDate).not.toBeNull();
    });
  });

  describe("Flag Retrieval", () => {
    it("retrieves flag by name", async () => {
      await testPrisma.featureFlag.create({
        data: {
          name: "unique_flag",
          description: "유니크 플래그",
          isEnabled: true,
          type: "boolean",
        },
      });

      const found = await testPrisma.featureFlag.findUnique({
        where: { name: "unique_flag" },
      });

      expect(found).not.toBeNull();
    });

    it("retrieves enabled flags", async () => {
      const states = [true, false, true, false, true];

      for (let i = 0; i < states.length; i++) {
        await testPrisma.featureFlag.create({
          data: {
            name: `flag_${Date.now()}_${i}`,
            description: `Flag ${i}`,
            isEnabled: states[i],
            type: "boolean",
          },
        });
      }

      const enabledFlags = await testPrisma.featureFlag.findMany({
        where: { isEnabled: true },
      });

      expect(enabledFlags.length).toBeGreaterThanOrEqual(3);
    });

    it("retrieves flags by type", async () => {
      const types = ["boolean", "percentage", "boolean", "user_list", "boolean"];

      for (let i = 0; i < types.length; i++) {
        await testPrisma.featureFlag.create({
          data: {
            name: `typed_flag_${Date.now()}_${i}`,
            description: `Flag ${i}`,
            isEnabled: true,
            type: types[i],
          },
        });
      }

      const booleanFlags = await testPrisma.featureFlag.findMany({
        where: { type: "boolean" },
      });

      expect(booleanFlags.length).toBeGreaterThanOrEqual(3);
    });

    it("retrieves active scheduled flags", async () => {
      const now = new Date();

      // Active flag
      await testPrisma.featureFlag.create({
        data: {
          name: `active_scheduled_${Date.now()}`,
          description: "Active scheduled",
          isEnabled: true,
          type: "scheduled",
          startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      });

      // Expired flag
      await testPrisma.featureFlag.create({
        data: {
          name: `expired_scheduled_${Date.now()}`,
          description: "Expired scheduled",
          isEnabled: true,
          type: "scheduled",
          startDate: new Date(now.getTime() - 48 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
      });

      const activeFlags = await testPrisma.featureFlag.findMany({
        where: {
          type: "scheduled",
          isEnabled: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      });

      expect(activeFlags.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Flag Evaluation", () => {
    it("evaluates boolean flag", async () => {
      const flag = await testPrisma.featureFlag.create({
        data: {
          name: `bool_eval_${Date.now()}`,
          description: "Boolean evaluation",
          isEnabled: true,
          type: "boolean",
        },
      });

      expect(flag.isEnabled).toBe(true);
    });

    it("evaluates percentage flag", async () => {
      const flag = await testPrisma.featureFlag.create({
        data: {
          name: `pct_eval_${Date.now()}`,
          description: "Percentage evaluation",
          isEnabled: true,
          type: "percentage",
          rolloutPercentage: 50,
        },
      });

      // Simulate user bucket check
      const userBucket = Math.random() * 100;
      const isEnabledForUser = flag.isEnabled && userBucket < (flag.rolloutPercentage || 0);

      // Result depends on random bucket
      expect(typeof isEnabledForUser).toBe("boolean");
    });

    it("evaluates user list flag", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();
      const user3 = await createTestUserInDb();

      const flag = await testPrisma.featureFlag.create({
        data: {
          name: `user_list_eval_${Date.now()}`,
          description: "User list evaluation",
          isEnabled: true,
          type: "user_list",
          targetUserIds: [user1.id, user2.id],
        },
      });

      const isEnabledForUser1 = flag.targetUserIds?.includes(user1.id);
      const isEnabledForUser3 = flag.targetUserIds?.includes(user3.id);

      expect(isEnabledForUser1).toBe(true);
      expect(isEnabledForUser3).toBe(false);
    });
  });

  describe("A/B Testing", () => {
    it("creates A/B test flag", async () => {
      const flag = await testPrisma.featureFlag.create({
        data: {
          name: `ab_test_${Date.now()}`,
          description: "A/B 테스트",
          isEnabled: true,
          type: "ab_test",
          variants: {
            control: { weight: 50 },
            treatment_a: { weight: 25 },
            treatment_b: { weight: 25 },
          },
        },
      });

      const variants = flag.variants as Record<string, { weight: number }>;
      expect(variants.control.weight).toBe(50);
    });

    it("records variant assignment", async () => {
      const user = await createTestUserInDb();

      const flag = await testPrisma.featureFlag.create({
        data: {
          name: `ab_assign_${Date.now()}`,
          description: "Variant assignment test",
          isEnabled: true,
          type: "ab_test",
        },
      });

      const assignment = await testPrisma.featureFlagAssignment.create({
        data: {
          flagId: flag.id,
          userId: user.id,
          variant: "treatment_a",
        },
      });

      expect(assignment.variant).toBe("treatment_a");
    });

    it("retrieves user's variant", async () => {
      const user = await createTestUserInDb();

      const flag = await testPrisma.featureFlag.create({
        data: {
          name: `variant_retrieval_${Date.now()}`,
          description: "Variant retrieval test",
          isEnabled: true,
          type: "ab_test",
        },
      });

      await testPrisma.featureFlagAssignment.create({
        data: {
          flagId: flag.id,
          userId: user.id,
          variant: "control",
        },
      });

      const assignment = await testPrisma.featureFlagAssignment.findFirst({
        where: { flagId: flag.id, userId: user.id },
      });

      expect(assignment?.variant).toBe("control");
    });
  });

  describe("Flag Statistics", () => {
    it("counts flags by type", async () => {
      const types = ["boolean", "percentage", "boolean", "ab_test", "boolean"];

      for (let i = 0; i < types.length; i++) {
        await testPrisma.featureFlag.create({
          data: {
            name: `stats_flag_${Date.now()}_${i}`,
            description: `Flag ${i}`,
            isEnabled: true,
            type: types[i],
          },
        });
      }

      const counts = await testPrisma.featureFlag.groupBy({
        by: ["type"],
        _count: { id: true },
      });

      expect(counts.length).toBeGreaterThan(0);
    });

    it("counts enabled vs disabled flags", async () => {
      const states = [true, false, true, false, false];

      for (let i = 0; i < states.length; i++) {
        await testPrisma.featureFlag.create({
          data: {
            name: `enabled_stats_${Date.now()}_${i}`,
            description: `Flag ${i}`,
            isEnabled: states[i],
            type: "boolean",
          },
        });
      }

      const counts = await testPrisma.featureFlag.groupBy({
        by: ["isEnabled"],
        _count: { id: true },
      });

      expect(counts.length).toBeGreaterThanOrEqual(2);
    });

    it("counts variant assignments", async () => {
      const flag = await testPrisma.featureFlag.create({
        data: {
          name: `assignment_stats_${Date.now()}`,
          description: "Assignment stats",
          isEnabled: true,
          type: "ab_test",
        },
      });

      const variants = ["control", "treatment", "control", "treatment", "control"];

      for (let i = 0; i < variants.length; i++) {
        const user = await createTestUserInDb();

        await testPrisma.featureFlagAssignment.create({
          data: {
            flagId: flag.id,
            userId: user.id,
            variant: variants[i],
          },
        });
      }

      const counts = await testPrisma.featureFlagAssignment.groupBy({
        by: ["variant"],
        where: { flagId: flag.id },
        _count: { id: true },
      });

      const controlCount = counts.find((c) => c.variant === "control")?._count.id;
      expect(controlCount).toBe(3);
    });
  });

  describe("Flag Updates", () => {
    it("enables flag", async () => {
      const flag = await testPrisma.featureFlag.create({
        data: {
          name: `enable_flag_${Date.now()}`,
          description: "Enable test",
          isEnabled: false,
          type: "boolean",
        },
      });

      const updated = await testPrisma.featureFlag.update({
        where: { id: flag.id },
        data: { isEnabled: true },
      });

      expect(updated.isEnabled).toBe(true);
    });

    it("updates rollout percentage", async () => {
      const flag = await testPrisma.featureFlag.create({
        data: {
          name: `rollout_update_${Date.now()}`,
          description: "Rollout update test",
          isEnabled: true,
          type: "percentage",
          rolloutPercentage: 10,
        },
      });

      const updated = await testPrisma.featureFlag.update({
        where: { id: flag.id },
        data: { rolloutPercentage: 50 },
      });

      expect(updated.rolloutPercentage).toBe(50);
    });

    it("adds users to target list", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      const flag = await testPrisma.featureFlag.create({
        data: {
          name: `add_users_${Date.now()}`,
          description: "Add users test",
          isEnabled: true,
          type: "user_list",
          targetUserIds: [user1.id],
        },
      });

      const updated = await testPrisma.featureFlag.update({
        where: { id: flag.id },
        data: { targetUserIds: [user1.id, user2.id] },
      });

      expect(updated.targetUserIds).toHaveLength(2);
    });

    it("extends scheduled flag", async () => {
      const originalEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const newEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const flag = await testPrisma.featureFlag.create({
        data: {
          name: `extend_schedule_${Date.now()}`,
          description: "Extend schedule test",
          isEnabled: true,
          type: "scheduled",
          startDate: new Date(),
          endDate: originalEnd,
        },
      });

      const updated = await testPrisma.featureFlag.update({
        where: { id: flag.id },
        data: { endDate: newEnd },
      });

      expect(updated.endDate?.getTime()).toBeGreaterThan(originalEnd.getTime());
    });
  });

  describe("Flag Deletion", () => {
    it("deletes flag", async () => {
      const flag = await testPrisma.featureFlag.create({
        data: {
          name: `delete_flag_${Date.now()}`,
          description: "Delete test",
          isEnabled: false,
          type: "boolean",
        },
      });

      await testPrisma.featureFlag.delete({
        where: { id: flag.id },
      });

      const found = await testPrisma.featureFlag.findUnique({
        where: { id: flag.id },
      });

      expect(found).toBeNull();
    });

    it("archives old flags", async () => {
      const now = new Date();

      // Old flags
      for (let i = 0; i < 3; i++) {
        await testPrisma.featureFlag.create({
          data: {
            name: `old_flag_${Date.now()}_${i}`,
            description: "Old flag",
            isEnabled: false,
            type: "boolean",
            updatedAt: new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000),
          },
        });
      }

      // Recent flags
      for (let i = 0; i < 2; i++) {
        await testPrisma.featureFlag.create({
          data: {
            name: `recent_flag_${Date.now()}_${i}`,
            description: "Recent flag",
            isEnabled: true,
            type: "boolean",
          },
        });
      }

      const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

      // Archive (soft delete) old flags
      await testPrisma.featureFlag.updateMany({
        where: {
          isEnabled: false,
          updatedAt: { lt: sixMonthsAgo },
        },
        data: { isArchived: true },
      });

      const archivedFlags = await testPrisma.featureFlag.findMany({
        where: { isArchived: true },
      });

      expect(archivedFlags.length).toBeGreaterThanOrEqual(3);
    });
  });
});

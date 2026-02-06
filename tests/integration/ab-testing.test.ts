/**
 * A/B Testing Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - A/B 테스트 실험 관리
 * - 사용자 그룹 할당
 * - 결과 분석
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

describe("Integration: A/B Testing", () => {
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

  describe("Experiment Creation", () => {
    it("creates A/B test experiment", async () => {
      const experiment = await testPrisma.abExperiment.create({
        data: {
          name: "new_homepage_design",
          description: "Testing new homepage layout",
          status: "active",
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          targetPercentage: 50,
        },
      });

      expect(experiment.name).toBe("new_homepage_design");
      expect(experiment.status).toBe("active");
    });

    it("creates experiment with multiple variants", async () => {
      const experiment = await testPrisma.abExperiment.create({
        data: {
          name: "button_color_test",
          description: "Testing button colors",
          status: "active",
          startDate: new Date(),
          variants: {
            control: { color: "blue", weight: 33 },
            variant_a: { color: "green", weight: 33 },
            variant_b: { color: "red", weight: 34 },
          },
        },
      });

      const variants = experiment.variants as Record<string, { color: string }>;
      expect(Object.keys(variants)).toHaveLength(3);
    });

    it("creates experiment with targeting rules", async () => {
      const experiment = await testPrisma.abExperiment.create({
        data: {
          name: "premium_feature_test",
          description: "Testing premium features for specific users",
          status: "active",
          startDate: new Date(),
          targetingRules: {
            userType: ["premium", "trial"],
            platforms: ["ios", "android"],
            minAppVersion: "2.5.0",
          },
        },
      });

      const rules = experiment.targetingRules as { userType: string[] };
      expect(rules.userType).toContain("premium");
    });

    it("creates experiment with success metrics", async () => {
      const experiment = await testPrisma.abExperiment.create({
        data: {
          name: "checkout_flow_test",
          description: "Testing new checkout flow",
          status: "active",
          startDate: new Date(),
          successMetrics: {
            primary: "conversion_rate",
            secondary: ["time_to_purchase", "cart_abandonment"],
            minimumSampleSize: 1000,
          },
        },
      });

      const metrics = experiment.successMetrics as { primary: string };
      expect(metrics.primary).toBe("conversion_rate");
    });
  });

  describe("User Assignment", () => {
    it("assigns user to experiment variant", async () => {
      const user = await createTestUserInDb();

      const experiment = await testPrisma.abExperiment.create({
        data: {
          name: "test_experiment",
          status: "active",
          startDate: new Date(),
        },
      });

      const assignment = await testPrisma.abAssignment.create({
        data: {
          userId: user.id,
          experimentId: experiment.id,
          variant: "control",
          assignedAt: new Date(),
        },
      });

      expect(assignment.variant).toBe("control");
    });

    it("ensures consistent user assignment", async () => {
      const user = await createTestUserInDb();

      const experiment = await testPrisma.abExperiment.create({
        data: {
          name: "consistency_test",
          status: "active",
          startDate: new Date(),
        },
      });

      await testPrisma.abAssignment.create({
        data: {
          userId: user.id,
          experimentId: experiment.id,
          variant: "variant_a",
          assignedAt: new Date(),
        },
      });

      const assignment = await testPrisma.abAssignment.findFirst({
        where: { userId: user.id, experimentId: experiment.id },
      });

      expect(assignment?.variant).toBe("variant_a");
    });

    it("assigns users to multiple experiments", async () => {
      const user = await createTestUserInDb();
      const experimentNames = ["exp1", "exp2", "exp3"];

      for (const name of experimentNames) {
        const experiment = await testPrisma.abExperiment.create({
          data: {
            name,
            status: "active",
            startDate: new Date(),
          },
        });

        await testPrisma.abAssignment.create({
          data: {
            userId: user.id,
            experimentId: experiment.id,
            variant: Math.random() > 0.5 ? "control" : "treatment",
            assignedAt: new Date(),
          },
        });
      }

      const assignments = await testPrisma.abAssignment.findMany({
        where: { userId: user.id },
      });

      expect(assignments).toHaveLength(3);
    });

    it("tracks assignment source", async () => {
      const user = await createTestUserInDb();

      const experiment = await testPrisma.abExperiment.create({
        data: {
          name: "source_tracking_test",
          status: "active",
          startDate: new Date(),
        },
      });

      const assignment = await testPrisma.abAssignment.create({
        data: {
          userId: user.id,
          experimentId: experiment.id,
          variant: "control",
          assignedAt: new Date(),
          source: "automatic",
          deviceId: "device-123",
        },
      });

      expect(assignment.source).toBe("automatic");
    });
  });

  describe("Event Tracking", () => {
    it("records experiment event", async () => {
      const user = await createTestUserInDb();

      const experiment = await testPrisma.abExperiment.create({
        data: {
          name: "event_tracking_test",
          status: "active",
          startDate: new Date(),
        },
      });

      const event = await testPrisma.abEvent.create({
        data: {
          userId: user.id,
          experimentId: experiment.id,
          variant: "treatment",
          eventType: "button_click",
          eventData: { buttonId: "cta_main" },
          timestamp: new Date(),
        },
      });

      expect(event.eventType).toBe("button_click");
    });

    it("records conversion event", async () => {
      const user = await createTestUserInDb();

      const experiment = await testPrisma.abExperiment.create({
        data: {
          name: "conversion_test",
          status: "active",
          startDate: new Date(),
        },
      });

      const event = await testPrisma.abEvent.create({
        data: {
          userId: user.id,
          experimentId: experiment.id,
          variant: "variant_a",
          eventType: "conversion",
          eventData: {
            value: 29.99,
            currency: "USD",
            productId: "premium_monthly",
          },
          timestamp: new Date(),
        },
      });

      const data = event.eventData as { value: number };
      expect(data.value).toBe(29.99);
    });

    it("tracks multiple events per user", async () => {
      const user = await createTestUserInDb();

      const experiment = await testPrisma.abExperiment.create({
        data: {
          name: "multi_event_test",
          status: "active",
          startDate: new Date(),
        },
      });

      const eventTypes = ["page_view", "button_click", "form_submit", "conversion"];

      for (const eventType of eventTypes) {
        await testPrisma.abEvent.create({
          data: {
            userId: user.id,
            experimentId: experiment.id,
            variant: "control",
            eventType,
            timestamp: new Date(),
          },
        });
      }

      const events = await testPrisma.abEvent.findMany({
        where: { userId: user.id, experimentId: experiment.id },
      });

      expect(events).toHaveLength(4);
    });
  });

  describe("Results Analysis", () => {
    it("calculates conversion rate by variant", async () => {
      const experiment = await testPrisma.abExperiment.create({
        data: {
          name: "conversion_rate_test",
          status: "active",
          startDate: new Date(),
        },
      });

      // Create users and events
      const variants = ["control", "control", "treatment", "treatment", "treatment"];
      const converted = [true, false, true, true, false];

      for (let i = 0; i < variants.length; i++) {
        const user = await createTestUserInDb();
        await testPrisma.abAssignment.create({
          data: {
            userId: user.id,
            experimentId: experiment.id,
            variant: variants[i],
            assignedAt: new Date(),
          },
        });

        if (converted[i]) {
          await testPrisma.abEvent.create({
            data: {
              userId: user.id,
              experimentId: experiment.id,
              variant: variants[i],
              eventType: "conversion",
              timestamp: new Date(),
            },
          });
        }
      }

      const controlAssignments = await testPrisma.abAssignment.count({
        where: { experimentId: experiment.id, variant: "control" },
      });

      const controlConversions = await testPrisma.abEvent.count({
        where: {
          experimentId: experiment.id,
          variant: "control",
          eventType: "conversion",
        },
      });

      const controlRate = (controlConversions / controlAssignments) * 100;
      expect(controlRate).toBe(50);
    });

    it("counts users per variant", async () => {
      const experiment = await testPrisma.abExperiment.create({
        data: {
          name: "user_count_test",
          status: "active",
          startDate: new Date(),
        },
      });

      const variantAssignments = ["control", "control", "treatment", "treatment", "treatment"];

      for (const variant of variantAssignments) {
        const user = await createTestUserInDb();
        await testPrisma.abAssignment.create({
          data: {
            userId: user.id,
            experimentId: experiment.id,
            variant,
            assignedAt: new Date(),
          },
        });
      }

      const counts = await testPrisma.abAssignment.groupBy({
        by: ["variant"],
        where: { experimentId: experiment.id },
        _count: { id: true },
      });

      const controlCount = counts.find((c) => c.variant === "control")?._count.id;
      const treatmentCount = counts.find((c) => c.variant === "treatment")?._count.id;

      expect(controlCount).toBe(2);
      expect(treatmentCount).toBe(3);
    });

    it("retrieves experiment results", async () => {
      const experiment = await testPrisma.abExperiment.create({
        data: {
          name: "results_test",
          status: "completed",
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(),
          results: {
            winner: "treatment",
            controlConversionRate: 5.2,
            treatmentConversionRate: 7.8,
            improvement: 50,
            statisticalSignificance: 0.95,
            sampleSize: { control: 5000, treatment: 5000 },
          },
        },
      });

      const results = experiment.results as { winner: string; improvement: number };
      expect(results.winner).toBe("treatment");
      expect(results.improvement).toBe(50);
    });
  });

  describe("Experiment Lifecycle", () => {
    it("starts experiment", async () => {
      const experiment = await testPrisma.abExperiment.create({
        data: {
          name: "lifecycle_start_test",
          status: "draft",
          startDate: new Date(),
        },
      });

      const started = await testPrisma.abExperiment.update({
        where: { id: experiment.id },
        data: {
          status: "active",
          startedAt: new Date(),
        },
      });

      expect(started.status).toBe("active");
    });

    it("pauses experiment", async () => {
      const experiment = await testPrisma.abExperiment.create({
        data: {
          name: "lifecycle_pause_test",
          status: "active",
          startDate: new Date(),
        },
      });

      const paused = await testPrisma.abExperiment.update({
        where: { id: experiment.id },
        data: {
          status: "paused",
          pausedAt: new Date(),
          pauseReason: "Unexpected results detected",
        },
      });

      expect(paused.status).toBe("paused");
    });

    it("completes experiment", async () => {
      const experiment = await testPrisma.abExperiment.create({
        data: {
          name: "lifecycle_complete_test",
          status: "active",
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      });

      const completed = await testPrisma.abExperiment.update({
        where: { id: experiment.id },
        data: {
          status: "completed",
          endDate: new Date(),
          completedAt: new Date(),
        },
      });

      expect(completed.status).toBe("completed");
    });

    it("archives experiment", async () => {
      const experiment = await testPrisma.abExperiment.create({
        data: {
          name: "lifecycle_archive_test",
          status: "completed",
          startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      });

      const archived = await testPrisma.abExperiment.update({
        where: { id: experiment.id },
        data: {
          status: "archived",
          archivedAt: new Date(),
        },
      });

      expect(archived.status).toBe("archived");
    });
  });

  describe("Experiment Queries", () => {
    it("retrieves active experiments", async () => {
      const statuses = ["active", "draft", "active", "completed", "active"];

      for (let i = 0; i < statuses.length; i++) {
        await testPrisma.abExperiment.create({
          data: {
            name: `exp_${i}`,
            status: statuses[i],
            startDate: new Date(),
          },
        });
      }

      const active = await testPrisma.abExperiment.findMany({
        where: { status: "active" },
      });

      expect(active).toHaveLength(3);
    });

    it("retrieves user's experiments", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 4; i++) {
        const experiment = await testPrisma.abExperiment.create({
          data: {
            name: `user_exp_${i}`,
            status: "active",
            startDate: new Date(),
          },
        });

        await testPrisma.abAssignment.create({
          data: {
            userId: user.id,
            experimentId: experiment.id,
            variant: i % 2 === 0 ? "control" : "treatment",
            assignedAt: new Date(),
          },
        });
      }

      const userExperiments = await testPrisma.abAssignment.findMany({
        where: { userId: user.id },
        include: { experiment: true },
      });

      expect(userExperiments).toHaveLength(4);
    });

    it("finds experiments by date range", async () => {
      const now = new Date();

      for (let i = 0; i < 5; i++) {
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - i * 10);

        await testPrisma.abExperiment.create({
          data: {
            name: `date_exp_${i}`,
            status: "active",
            startDate,
          },
        });
      }

      const twentyDaysAgo = new Date(now);
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

      const recent = await testPrisma.abExperiment.findMany({
        where: { startDate: { gte: twentyDaysAgo } },
      });

      expect(recent).toHaveLength(3);
    });
  });

  describe("Experiment Deletion", () => {
    it("deletes experiment", async () => {
      const experiment = await testPrisma.abExperiment.create({
        data: {
          name: "delete_test",
          status: "draft",
          startDate: new Date(),
        },
      });

      await testPrisma.abExperiment.delete({
        where: { id: experiment.id },
      });

      const found = await testPrisma.abExperiment.findUnique({
        where: { id: experiment.id },
      });

      expect(found).toBeNull();
    });
  });
});

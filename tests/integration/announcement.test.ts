/**
 * Announcement Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 공지사항 관리
 * - 읽음 상태 추적
 * - 공지 스케줄링
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

describe("Integration: Announcement", () => {
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

  describe("Announcement Creation", () => {
    it("creates basic announcement", async () => {
      const announcement = await testPrisma.announcement.create({
        data: {
          title: "서비스 업데이트 안내",
          content: "새로운 기능이 추가되었습니다.",
          type: "info",
          isActive: true,
        },
      });

      expect(announcement.title).toBe("서비스 업데이트 안내");
      expect(announcement.type).toBe("info");
    });

    it("creates urgent announcement", async () => {
      const announcement = await testPrisma.announcement.create({
        data: {
          title: "긴급 점검 안내",
          content: "서버 점검이 예정되어 있습니다.",
          type: "urgent",
          isActive: true,
          priority: 1,
        },
      });

      expect(announcement.type).toBe("urgent");
      expect(announcement.priority).toBe(1);
    });

    it("creates scheduled announcement", async () => {
      const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const announcement = await testPrisma.announcement.create({
        data: {
          title: "이벤트 공지",
          content: "특별 이벤트가 시작됩니다.",
          type: "event",
          isActive: false,
          startDate,
          endDate,
        },
      });

      expect(announcement.startDate).toEqual(startDate);
      expect(announcement.endDate).toEqual(endDate);
    });

    it("creates announcement with target audience", async () => {
      const announcement = await testPrisma.announcement.create({
        data: {
          title: "프리미엄 회원 전용 공지",
          content: "프리미엄 회원 특별 혜택 안내",
          type: "info",
          isActive: true,
          targetAudience: {
            subscriptionTypes: ["premium", "pro"],
            minCredits: 100,
          },
        },
      });

      const target = announcement.targetAudience as { subscriptionTypes: string[] };
      expect(target.subscriptionTypes).toContain("premium");
    });

    it("creates announcement with action button", async () => {
      const announcement = await testPrisma.announcement.create({
        data: {
          title: "새로운 기능 출시",
          content: "지금 바로 확인해보세요!",
          type: "feature",
          isActive: true,
          actionButton: {
            text: "자세히 보기",
            url: "/features/new",
          },
        },
      });

      const action = announcement.actionButton as { text: string; url: string };
      expect(action.text).toBe("자세히 보기");
    });
  });

  describe("Announcement Retrieval", () => {
    it("retrieves active announcements", async () => {
      const states = [true, false, true, false, true];

      for (let i = 0; i < states.length; i++) {
        await testPrisma.announcement.create({
          data: {
            title: `Announcement ${i}`,
            content: `Content ${i}`,
            type: "info",
            isActive: states[i],
          },
        });
      }

      const activeAnnouncements = await testPrisma.announcement.findMany({
        where: { isActive: true },
      });

      expect(activeAnnouncements.length).toBeGreaterThanOrEqual(3);
    });

    it("retrieves announcements by type", async () => {
      const types = ["info", "urgent", "info", "event", "info"];

      for (let i = 0; i < types.length; i++) {
        await testPrisma.announcement.create({
          data: {
            title: `Type Announcement ${i}`,
            content: `Content ${i}`,
            type: types[i],
            isActive: true,
          },
        });
      }

      const infoAnnouncements = await testPrisma.announcement.findMany({
        where: { type: "info" },
      });

      expect(infoAnnouncements.length).toBeGreaterThanOrEqual(3);
    });

    it("retrieves announcements by priority", async () => {
      const priorities = [3, 1, 2, 1, 3];

      for (let i = 0; i < priorities.length; i++) {
        await testPrisma.announcement.create({
          data: {
            title: `Priority Announcement ${i}`,
            content: `Content ${i}`,
            type: "info",
            isActive: true,
            priority: priorities[i],
          },
        });
      }

      const highPriority = await testPrisma.announcement.findMany({
        where: { priority: 1 },
      });

      expect(highPriority.length).toBeGreaterThanOrEqual(2);
    });

    it("retrieves currently active scheduled announcements", async () => {
      const now = new Date();

      // Currently active
      await testPrisma.announcement.create({
        data: {
          title: "Active Scheduled",
          content: "Currently showing",
          type: "event",
          isActive: true,
          startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      });

      // Not yet started
      await testPrisma.announcement.create({
        data: {
          title: "Future Scheduled",
          content: "Not showing yet",
          type: "event",
          isActive: true,
          startDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        },
      });

      // Already ended
      await testPrisma.announcement.create({
        data: {
          title: "Past Scheduled",
          content: "No longer showing",
          type: "event",
          isActive: true,
          startDate: new Date(now.getTime() - 48 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
      });

      const currentlyActive = await testPrisma.announcement.findMany({
        where: {
          isActive: true,
          OR: [
            { startDate: null, endDate: null },
            {
              startDate: { lte: now },
              endDate: { gte: now },
            },
          ],
        },
      });

      expect(currentlyActive.length).toBeGreaterThanOrEqual(1);
    });

    it("retrieves announcements ordered by priority", async () => {
      for (let i = 1; i <= 5; i++) {
        await testPrisma.announcement.create({
          data: {
            title: `Priority ${i}`,
            content: `Content`,
            type: "info",
            isActive: true,
            priority: i,
          },
        });
      }

      const ordered = await testPrisma.announcement.findMany({
        where: { isActive: true },
        orderBy: { priority: "asc" },
        take: 3,
      });

      expect(ordered[0].priority).toBeLessThanOrEqual(ordered[1].priority || 999);
    });
  });

  describe("Read Status Tracking", () => {
    it("marks announcement as read", async () => {
      const user = await createTestUserInDb();

      const announcement = await testPrisma.announcement.create({
        data: {
          title: "Read Test",
          content: "Content",
          type: "info",
          isActive: true,
        },
      });

      const readStatus = await testPrisma.announcementRead.create({
        data: {
          announcementId: announcement.id,
          userId: user.id,
        },
      });

      expect(readStatus.announcementId).toBe(announcement.id);
    });

    it("retrieves unread announcements for user", async () => {
      const user = await createTestUserInDb();

      const announcements: string[] = [];

      for (let i = 0; i < 5; i++) {
        const ann = await testPrisma.announcement.create({
          data: {
            title: `Unread Test ${i}`,
            content: "Content",
            type: "info",
            isActive: true,
          },
        });
        announcements.push(ann.id);
      }

      // Mark first 2 as read
      for (let i = 0; i < 2; i++) {
        await testPrisma.announcementRead.create({
          data: {
            announcementId: announcements[i],
            userId: user.id,
          },
        });
      }

      const readIds = await testPrisma.announcementRead.findMany({
        where: { userId: user.id },
        select: { announcementId: true },
      });

      const readAnnIds = readIds.map((r) => r.announcementId);

      const unread = await testPrisma.announcement.findMany({
        where: {
          id: { in: announcements },
          id: { notIn: readAnnIds },
        },
      });

      expect(unread.length).toBe(3);
    });

    it("counts read status", async () => {
      const announcement = await testPrisma.announcement.create({
        data: {
          title: "Read Count Test",
          content: "Content",
          type: "info",
          isActive: true,
        },
      });

      for (let i = 0; i < 10; i++) {
        const user = await createTestUserInDb();

        await testPrisma.announcementRead.create({
          data: {
            announcementId: announcement.id,
            userId: user.id,
          },
        });
      }

      const readCount = await testPrisma.announcementRead.count({
        where: { announcementId: announcement.id },
      });

      expect(readCount).toBe(10);
    });
  });

  describe("Announcement Statistics", () => {
    it("counts announcements by type", async () => {
      const types = ["info", "urgent", "info", "event", "info", "urgent"];

      for (let i = 0; i < types.length; i++) {
        await testPrisma.announcement.create({
          data: {
            title: `Stats ${i}`,
            content: "Content",
            type: types[i],
            isActive: true,
          },
        });
      }

      const counts = await testPrisma.announcement.groupBy({
        by: ["type"],
        _count: { id: true },
      });

      expect(counts.length).toBeGreaterThan(0);
    });

    it("counts active vs inactive", async () => {
      const states = [true, false, true, true, false];

      for (let i = 0; i < states.length; i++) {
        await testPrisma.announcement.create({
          data: {
            title: `Active Stats ${i}`,
            content: "Content",
            type: "info",
            isActive: states[i],
          },
        });
      }

      const counts = await testPrisma.announcement.groupBy({
        by: ["isActive"],
        _count: { id: true },
      });

      expect(counts.length).toBeGreaterThanOrEqual(2);
    });

    it("calculates read rate", async () => {
      const announcement = await testPrisma.announcement.create({
        data: {
          title: "Read Rate Test",
          content: "Content",
          type: "info",
          isActive: true,
        },
      });

      const totalUsers = 10;
      const readUsers = 7;

      for (let i = 0; i < readUsers; i++) {
        const user = await createTestUserInDb();

        await testPrisma.announcementRead.create({
          data: {
            announcementId: announcement.id,
            userId: user.id,
          },
        });
      }

      const readCount = await testPrisma.announcementRead.count({
        where: { announcementId: announcement.id },
      });

      const readRate = (readCount / totalUsers) * 100;
      expect(readRate).toBe(70);
    });
  });

  describe("Announcement Updates", () => {
    it("updates content", async () => {
      const announcement = await testPrisma.announcement.create({
        data: {
          title: "Original Title",
          content: "Original content",
          type: "info",
          isActive: true,
        },
      });

      const updated = await testPrisma.announcement.update({
        where: { id: announcement.id },
        data: {
          title: "Updated Title",
          content: "Updated content",
        },
      });

      expect(updated.title).toBe("Updated Title");
    });

    it("deactivates announcement", async () => {
      const announcement = await testPrisma.announcement.create({
        data: {
          title: "Deactivate Test",
          content: "Content",
          type: "info",
          isActive: true,
        },
      });

      const updated = await testPrisma.announcement.update({
        where: { id: announcement.id },
        data: { isActive: false },
      });

      expect(updated.isActive).toBe(false);
    });

    it("extends schedule", async () => {
      const originalEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const newEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const announcement = await testPrisma.announcement.create({
        data: {
          title: "Extend Test",
          content: "Content",
          type: "event",
          isActive: true,
          startDate: new Date(),
          endDate: originalEnd,
        },
      });

      const updated = await testPrisma.announcement.update({
        where: { id: announcement.id },
        data: { endDate: newEnd },
      });

      expect(updated.endDate?.getTime()).toBeGreaterThan(originalEnd.getTime());
    });

    it("changes priority", async () => {
      const announcement = await testPrisma.announcement.create({
        data: {
          title: "Priority Change",
          content: "Content",
          type: "info",
          isActive: true,
          priority: 5,
        },
      });

      const updated = await testPrisma.announcement.update({
        where: { id: announcement.id },
        data: { priority: 1 },
      });

      expect(updated.priority).toBe(1);
    });
  });

  describe("Announcement Deletion", () => {
    it("deletes announcement", async () => {
      const announcement = await testPrisma.announcement.create({
        data: {
          title: "Delete Test",
          content: "Content",
          type: "info",
          isActive: true,
        },
      });

      await testPrisma.announcement.delete({
        where: { id: announcement.id },
      });

      const found = await testPrisma.announcement.findUnique({
        where: { id: announcement.id },
      });

      expect(found).toBeNull();
    });

    it("deletes old announcements", async () => {
      const now = new Date();

      // Old announcements
      for (let i = 0; i < 3; i++) {
        await testPrisma.announcement.create({
          data: {
            title: `Old ${i}`,
            content: "Content",
            type: "info",
            isActive: false,
            endDate: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
          },
        });
      }

      // Recent announcements
      for (let i = 0; i < 2; i++) {
        await testPrisma.announcement.create({
          data: {
            title: `Recent ${i}`,
            content: "Content",
            type: "info",
            isActive: true,
          },
        });
      }

      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      await testPrisma.announcement.deleteMany({
        where: {
          isActive: false,
          endDate: { lt: ninetyDaysAgo },
        },
      });

      const oldRemaining = await testPrisma.announcement.findMany({
        where: {
          isActive: false,
          endDate: { lt: ninetyDaysAgo },
        },
      });

      expect(oldRemaining).toHaveLength(0);
    });
  });
});

/**
 * User Blocks Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 사용자 차단 관리
 * - 차단 목록 조회
 * - 차단 해제 처리
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

describe("Integration: User Blocks", () => {
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

  describe("Block Creation", () => {
    it("creates user block", async () => {
      const blocker = await createTestUserInDb();
      const blocked = await createTestUserInDb();

      const block = await testPrisma.userBlock.create({
        data: {
          blockerId: blocker.id,
          blockedId: blocked.id,
          reason: "spam",
        },
      });

      expect(block).toBeDefined();
      expect(block.blockerId).toBe(blocker.id);
      expect(block.blockedId).toBe(blocked.id);
    });

    it("creates block with reason", async () => {
      const blocker = await createTestUserInDb();
      const blocked = await createTestUserInDb();

      const block = await testPrisma.userBlock.create({
        data: {
          blockerId: blocker.id,
          blockedId: blocked.id,
          reason: "harassment",
          notes: "반복적인 불쾌한 메시지",
        },
      });

      expect(block.reason).toBe("harassment");
      expect(block.notes).toContain("불쾌한");
    });

    it("creates multiple blocks by same user", async () => {
      const blocker = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        const blocked = await createTestUserInDb();
        await testPrisma.userBlock.create({
          data: {
            blockerId: blocker.id,
            blockedId: blocked.id,
            reason: "spam",
          },
        });
      }

      const blocks = await testPrisma.userBlock.findMany({
        where: { blockerId: blocker.id },
      });

      expect(blocks).toHaveLength(5);
    });

    it("creates block with expiration", async () => {
      const blocker = await createTestUserInDb();
      const blocked = await createTestUserInDb();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const block = await testPrisma.userBlock.create({
        data: {
          blockerId: blocker.id,
          blockedId: blocked.id,
          reason: "temporary",
          expiresAt,
        },
      });

      expect(block.expiresAt?.getTime()).toBeCloseTo(expiresAt.getTime(), -3);
    });
  });

  describe("Block Check", () => {
    it("checks if user is blocked", async () => {
      const blocker = await createTestUserInDb();
      const blocked = await createTestUserInDb();

      await testPrisma.userBlock.create({
        data: {
          blockerId: blocker.id,
          blockedId: blocked.id,
          reason: "spam",
        },
      });

      const isBlocked = await testPrisma.userBlock.findFirst({
        where: {
          blockerId: blocker.id,
          blockedId: blocked.id,
        },
      });

      expect(isBlocked).not.toBeNull();
    });

    it("checks mutual block status", async () => {
      const user1 = await createTestUserInDb();
      const user2 = await createTestUserInDb();

      // user1 blocks user2
      await testPrisma.userBlock.create({
        data: {
          blockerId: user1.id,
          blockedId: user2.id,
          reason: "spam",
        },
      });

      // Check if either blocks the other
      const anyBlock = await testPrisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: user1.id, blockedId: user2.id },
            { blockerId: user2.id, blockedId: user1.id },
          ],
        },
      });

      expect(anyBlock).not.toBeNull();
    });

    it("checks active blocks only", async () => {
      const blocker = await createTestUserInDb();
      const blocked = await createTestUserInDb();
      const now = new Date();

      // Expired block
      await testPrisma.userBlock.create({
        data: {
          blockerId: blocker.id,
          blockedId: blocked.id,
          reason: "temporary",
          expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
      });

      const activeBlock = await testPrisma.userBlock.findFirst({
        where: {
          blockerId: blocker.id,
          blockedId: blocked.id,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
      });

      expect(activeBlock).toBeNull();
    });
  });

  describe("Block List Retrieval", () => {
    it("retrieves all blocked users", async () => {
      const blocker = await createTestUserInDb();
      const blockedIds: string[] = [];

      for (let i = 0; i < 4; i++) {
        const blocked = await createTestUserInDb();
        blockedIds.push(blocked.id);
        await testPrisma.userBlock.create({
          data: {
            blockerId: blocker.id,
            blockedId: blocked.id,
            reason: "spam",
          },
        });
      }

      const blocks = await testPrisma.userBlock.findMany({
        where: { blockerId: blocker.id },
      });

      expect(blocks).toHaveLength(4);
      expect(blocks.every((b) => blockedIds.includes(b.blockedId))).toBe(true);
    });

    it("retrieves users who blocked me", async () => {
      const target = await createTestUserInDb();

      for (let i = 0; i < 3; i++) {
        const blocker = await createTestUserInDb();
        await testPrisma.userBlock.create({
          data: {
            blockerId: blocker.id,
            blockedId: target.id,
            reason: "spam",
          },
        });
      }

      const blockedByOthers = await testPrisma.userBlock.findMany({
        where: { blockedId: target.id },
      });

      expect(blockedByOthers).toHaveLength(3);
    });

    it("retrieves blocks by reason", async () => {
      const blocker = await createTestUserInDb();
      const reasons = ["spam", "spam", "harassment", "scam", "spam"];

      for (let i = 0; i < reasons.length; i++) {
        const blocked = await createTestUserInDb();
        await testPrisma.userBlock.create({
          data: {
            blockerId: blocker.id,
            blockedId: blocked.id,
            reason: reasons[i],
          },
        });
      }

      const spamBlocks = await testPrisma.userBlock.findMany({
        where: { blockerId: blocker.id, reason: "spam" },
      });

      expect(spamBlocks).toHaveLength(3);
    });
  });

  describe("Block Removal", () => {
    it("unblocks user", async () => {
      const blocker = await createTestUserInDb();
      const blocked = await createTestUserInDb();

      const block = await testPrisma.userBlock.create({
        data: {
          blockerId: blocker.id,
          blockedId: blocked.id,
          reason: "spam",
        },
      });

      await testPrisma.userBlock.delete({
        where: { id: block.id },
      });

      const found = await testPrisma.userBlock.findUnique({
        where: { id: block.id },
      });

      expect(found).toBeNull();
    });

    it("unblocks by blocker and blocked combination", async () => {
      const blocker = await createTestUserInDb();
      const blocked = await createTestUserInDb();

      await testPrisma.userBlock.create({
        data: {
          blockerId: blocker.id,
          blockedId: blocked.id,
          reason: "spam",
        },
      });

      await testPrisma.userBlock.deleteMany({
        where: {
          blockerId: blocker.id,
          blockedId: blocked.id,
        },
      });

      const remaining = await testPrisma.userBlock.findFirst({
        where: {
          blockerId: blocker.id,
          blockedId: blocked.id,
        },
      });

      expect(remaining).toBeNull();
    });

    it("removes all blocks for user", async () => {
      const blocker = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        const blocked = await createTestUserInDb();
        await testPrisma.userBlock.create({
          data: {
            blockerId: blocker.id,
            blockedId: blocked.id,
            reason: "spam",
          },
        });
      }

      await testPrisma.userBlock.deleteMany({
        where: { blockerId: blocker.id },
      });

      const remaining = await testPrisma.userBlock.findMany({
        where: { blockerId: blocker.id },
      });

      expect(remaining).toHaveLength(0);
    });
  });

  describe("Block Statistics", () => {
    it("counts total blocks by user", async () => {
      const blocker = await createTestUserInDb();

      for (let i = 0; i < 7; i++) {
        const blocked = await createTestUserInDb();
        await testPrisma.userBlock.create({
          data: {
            blockerId: blocker.id,
            blockedId: blocked.id,
            reason: "spam",
          },
        });
      }

      const count = await testPrisma.userBlock.count({
        where: { blockerId: blocker.id },
      });

      expect(count).toBe(7);
    });

    it("counts blocks by reason", async () => {
      const blocker = await createTestUserInDb();
      const reasons = ["spam", "harassment", "spam", "scam", "harassment", "spam"];

      for (let i = 0; i < reasons.length; i++) {
        const blocked = await createTestUserInDb();
        await testPrisma.userBlock.create({
          data: {
            blockerId: blocker.id,
            blockedId: blocked.id,
            reason: reasons[i],
          },
        });
      }

      const counts = await testPrisma.userBlock.groupBy({
        by: ["reason"],
        where: { blockerId: blocker.id },
        _count: { id: true },
      });

      const spamCount = counts.find((c) => c.reason === "spam")?._count.id;
      expect(spamCount).toBe(3);
    });

    it("identifies most blocked users", async () => {
      const target1 = await createTestUserInDb();
      const target2 = await createTestUserInDb();

      // 5 users block target1
      for (let i = 0; i < 5; i++) {
        const blocker = await createTestUserInDb();
        await testPrisma.userBlock.create({
          data: {
            blockerId: blocker.id,
            blockedId: target1.id,
            reason: "spam",
          },
        });
      }

      // 2 users block target2
      for (let i = 0; i < 2; i++) {
        const blocker = await createTestUserInDb();
        await testPrisma.userBlock.create({
          data: {
            blockerId: blocker.id,
            blockedId: target2.id,
            reason: "spam",
          },
        });
      }

      const blockCounts = await testPrisma.userBlock.groupBy({
        by: ["blockedId"],
        where: { blockedId: { in: [target1.id, target2.id] } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      });

      expect(blockCounts[0].blockedId).toBe(target1.id);
      expect(blockCounts[0]._count.id).toBe(5);
    });
  });

  describe("Block Expiration", () => {
    it("finds expired blocks", async () => {
      const blocker = await createTestUserInDb();
      const now = new Date();

      // Expired blocks
      for (let i = 0; i < 3; i++) {
        const blocked = await createTestUserInDb();
        await testPrisma.userBlock.create({
          data: {
            blockerId: blocker.id,
            blockedId: blocked.id,
            reason: "temporary",
            expiresAt: new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000),
          },
        });
      }

      // Active blocks
      for (let i = 0; i < 2; i++) {
        const blocked = await createTestUserInDb();
        await testPrisma.userBlock.create({
          data: {
            blockerId: blocker.id,
            blockedId: blocked.id,
            reason: "permanent",
            expiresAt: null,
          },
        });
      }

      const expiredBlocks = await testPrisma.userBlock.findMany({
        where: {
          blockerId: blocker.id,
          expiresAt: { lt: now },
        },
      });

      expect(expiredBlocks).toHaveLength(3);
    });

    it("cleans up expired blocks", async () => {
      const blocker = await createTestUserInDb();
      const now = new Date();

      // Expired blocks
      for (let i = 0; i < 3; i++) {
        const blocked = await createTestUserInDb();
        await testPrisma.userBlock.create({
          data: {
            blockerId: blocker.id,
            blockedId: blocked.id,
            reason: "temporary",
            expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          },
        });
      }

      // Permanent block
      const permanentBlocked = await createTestUserInDb();
      await testPrisma.userBlock.create({
        data: {
          blockerId: blocker.id,
          blockedId: permanentBlocked.id,
          reason: "permanent",
        },
      });

      await testPrisma.userBlock.deleteMany({
        where: {
          blockerId: blocker.id,
          expiresAt: { lt: now },
        },
      });

      const remaining = await testPrisma.userBlock.findMany({
        where: { blockerId: blocker.id },
      });

      expect(remaining).toHaveLength(1);
      expect(remaining[0].reason).toBe("permanent");
    });
  });

  describe("Block Impact on Interactions", () => {
    it("filters blocked users from results", async () => {
      const user = await createTestUserInDb();
      const allUsers: string[] = [];

      for (let i = 0; i < 5; i++) {
        const other = await createTestUserInDb();
        allUsers.push(other.id);

        if (i < 2) {
          await testPrisma.userBlock.create({
            data: {
              blockerId: user.id,
              blockedId: other.id,
              reason: "spam",
            },
          });
        }
      }

      const blocks = await testPrisma.userBlock.findMany({
        where: { blockerId: user.id },
        select: { blockedId: true },
      });

      const blockedIds = blocks.map((b) => b.blockedId);

      const visibleUsers = allUsers.filter((id) => !blockedIds.includes(id));
      expect(visibleUsers).toHaveLength(3);
    });
  });
});

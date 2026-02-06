/**
 * User Bookmark Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 북마크 저장 및 관리
 * - 폴더 구조
 * - 북마크 검색
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

describe("Integration: User Bookmark", () => {
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

  describe("Bookmark Creation", () => {
    it("creates reading bookmark", async () => {
      const user = await createTestUserInDb();

      const bookmark = await testPrisma.bookmark.create({
        data: {
          userId: user.id,
          title: "2024년 운세 풀이",
          type: "reading",
          contentId: "reading_123",
          url: "/readings/123",
        },
      });

      expect(bookmark.type).toBe("reading");
      expect(bookmark.title).toBe("2024년 운세 풀이");
    });

    it("creates article bookmark with notes", async () => {
      const user = await createTestUserInDb();

      const bookmark = await testPrisma.bookmark.create({
        data: {
          userId: user.id,
          title: "사주 기초 이론",
          type: "article",
          contentId: "article_456",
          url: "/articles/456",
          notes: "나중에 다시 읽어볼 것",
        },
      });

      expect(bookmark.notes).toBe("나중에 다시 읽어볼 것");
    });

    it("creates bookmark with tags", async () => {
      const user = await createTestUserInDb();

      const bookmark = await testPrisma.bookmark.create({
        data: {
          userId: user.id,
          title: "궁합 분석 결과",
          type: "compatibility",
          contentId: "compat_789",
          url: "/compatibility/789",
          tags: ["궁합", "연애", "중요"],
        },
      });

      const tags = bookmark.tags as string[];
      expect(tags).toContain("궁합");
    });

    it("creates bookmark in folder", async () => {
      const user = await createTestUserInDb();

      const folder = await testPrisma.bookmarkFolder.create({
        data: {
          userId: user.id,
          name: "중요 운세",
          color: "#FF5733",
        },
      });

      const bookmark = await testPrisma.bookmark.create({
        data: {
          userId: user.id,
          title: "이번 달 운세",
          type: "fortune",
          contentId: "fortune_101",
          url: "/fortune/101",
          folderId: folder.id,
        },
      });

      expect(bookmark.folderId).toBe(folder.id);
    });

    it("creates bookmark with thumbnail", async () => {
      const user = await createTestUserInDb();

      const bookmark = await testPrisma.bookmark.create({
        data: {
          userId: user.id,
          title: "타로 리딩 결과",
          type: "tarot",
          contentId: "tarot_202",
          url: "/tarot/202",
          thumbnailUrl: "/images/tarot_card.jpg",
        },
      });

      expect(bookmark.thumbnailUrl).toContain("tarot");
    });
  });

  describe("Bookmark Retrieval", () => {
    it("retrieves user bookmarks", async () => {
      const user = await createTestUserInDb();

      for (let i = 0; i < 5; i++) {
        await testPrisma.bookmark.create({
          data: {
            userId: user.id,
            title: `북마크 ${i}`,
            type: "reading",
            contentId: `content_${i}`,
            url: `/content/${i}`,
          },
        });
      }

      const bookmarks = await testPrisma.bookmark.findMany({
        where: { userId: user.id },
      });

      expect(bookmarks).toHaveLength(5);
    });

    it("retrieves bookmarks by type", async () => {
      const user = await createTestUserInDb();
      const types = ["reading", "article", "reading", "tarot", "reading"];

      for (let i = 0; i < types.length; i++) {
        await testPrisma.bookmark.create({
          data: {
            userId: user.id,
            title: `타입 북마크 ${i}`,
            type: types[i],
            contentId: `content_${i}`,
            url: `/content/${i}`,
          },
        });
      }

      const readings = await testPrisma.bookmark.findMany({
        where: { userId: user.id, type: "reading" },
      });

      expect(readings).toHaveLength(3);
    });

    it("retrieves bookmarks by folder", async () => {
      const user = await createTestUserInDb();

      const folder = await testPrisma.bookmarkFolder.create({
        data: {
          userId: user.id,
          name: "테스트 폴더",
        },
      });

      for (let i = 0; i < 3; i++) {
        await testPrisma.bookmark.create({
          data: {
            userId: user.id,
            title: `폴더 북마크 ${i}`,
            type: "reading",
            contentId: `content_${i}`,
            url: `/content/${i}`,
            folderId: folder.id,
          },
        });
      }

      // Bookmarks without folder
      for (let i = 0; i < 2; i++) {
        await testPrisma.bookmark.create({
          data: {
            userId: user.id,
            title: `일반 북마크 ${i}`,
            type: "reading",
            contentId: `general_${i}`,
            url: `/general/${i}`,
          },
        });
      }

      const folderBookmarks = await testPrisma.bookmark.findMany({
        where: { userId: user.id, folderId: folder.id },
      });

      expect(folderBookmarks).toHaveLength(3);
    });

    it("retrieves recent bookmarks", async () => {
      const user = await createTestUserInDb();
      const now = new Date();

      for (let i = 0; i < 10; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        await testPrisma.bookmark.create({
          data: {
            userId: user.id,
            title: `최근 북마크 ${i}`,
            type: "reading",
            contentId: `recent_${i}`,
            url: `/recent/${i}`,
            createdAt: date,
          },
        });
      }

      const recent = await testPrisma.bookmark.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      expect(recent).toHaveLength(5);
    });

    it("searches bookmarks by title", async () => {
      const user = await createTestUserInDb();

      const titles = [
        "2024년 운세",
        "2024년 사주 분석",
        "타로 리딩",
        "2024년 궁합",
        "꿈 해몽",
      ];

      for (let i = 0; i < titles.length; i++) {
        await testPrisma.bookmark.create({
          data: {
            userId: user.id,
            title: titles[i],
            type: "reading",
            contentId: `search_${i}`,
            url: `/search/${i}`,
          },
        });
      }

      const results = await testPrisma.bookmark.findMany({
        where: {
          userId: user.id,
          title: { contains: "2024" },
        },
      });

      expect(results).toHaveLength(3);
    });

    it("retrieves bookmarks by tag", async () => {
      const user = await createTestUserInDb();

      const tagSets = [
        ["운세", "중요"],
        ["사주", "기초"],
        ["운세", "월간"],
        ["타로", "연애"],
        ["운세", "2024"],
      ];

      for (let i = 0; i < tagSets.length; i++) {
        await testPrisma.bookmark.create({
          data: {
            userId: user.id,
            title: `태그 북마크 ${i}`,
            type: "reading",
            contentId: `tag_${i}`,
            url: `/tag/${i}`,
            tags: tagSets[i],
          },
        });
      }

      const bookmarks = await testPrisma.bookmark.findMany({
        where: { userId: user.id },
      });

      const fortuneTagged = bookmarks.filter((b) => {
        const tags = b.tags as string[] | null;
        return tags?.includes("운세");
      });

      expect(fortuneTagged).toHaveLength(3);
    });
  });

  describe("Bookmark Folders", () => {
    it("creates folder", async () => {
      const user = await createTestUserInDb();

      const folder = await testPrisma.bookmarkFolder.create({
        data: {
          userId: user.id,
          name: "중요 자료",
          color: "#3498db",
          icon: "star",
        },
      });

      expect(folder.name).toBe("중요 자료");
      expect(folder.color).toBe("#3498db");
    });

    it("creates nested folders", async () => {
      const user = await createTestUserInDb();

      const parentFolder = await testPrisma.bookmarkFolder.create({
        data: {
          userId: user.id,
          name: "운세",
        },
      });

      const childFolder = await testPrisma.bookmarkFolder.create({
        data: {
          userId: user.id,
          name: "2024년",
          parentId: parentFolder.id,
        },
      });

      expect(childFolder.parentId).toBe(parentFolder.id);
    });

    it("retrieves folders with bookmark count", async () => {
      const user = await createTestUserInDb();

      const folder = await testPrisma.bookmarkFolder.create({
        data: {
          userId: user.id,
          name: "카운트 폴더",
        },
      });

      for (let i = 0; i < 5; i++) {
        await testPrisma.bookmark.create({
          data: {
            userId: user.id,
            title: `카운트 북마크 ${i}`,
            type: "reading",
            contentId: `count_${i}`,
            url: `/count/${i}`,
            folderId: folder.id,
          },
        });
      }

      const count = await testPrisma.bookmark.count({
        where: { folderId: folder.id },
      });

      expect(count).toBe(5);
    });

    it("orders folders", async () => {
      const user = await createTestUserInDb();

      const orders = [3, 1, 2];
      const names = ["기타", "중요", "최근"];

      for (let i = 0; i < orders.length; i++) {
        await testPrisma.bookmarkFolder.create({
          data: {
            userId: user.id,
            name: names[i],
            order: orders[i],
          },
        });
      }

      const folders = await testPrisma.bookmarkFolder.findMany({
        where: { userId: user.id },
        orderBy: { order: "asc" },
      });

      expect(folders[0].name).toBe("중요");
    });
  });

  describe("Bookmark Statistics", () => {
    it("counts bookmarks by type", async () => {
      const user = await createTestUserInDb();

      const types = ["reading", "article", "reading", "tarot", "reading", "article"];

      for (let i = 0; i < types.length; i++) {
        await testPrisma.bookmark.create({
          data: {
            userId: user.id,
            title: `통계 북마크 ${i}`,
            type: types[i],
            contentId: `stat_${i}`,
            url: `/stat/${i}`,
          },
        });
      }

      const counts = await testPrisma.bookmark.groupBy({
        by: ["type"],
        where: { userId: user.id },
        _count: { id: true },
      });

      const readingCount = counts.find((c) => c.type === "reading")?._count.id;
      expect(readingCount).toBe(3);
    });

    it("calculates folder usage", async () => {
      const user = await createTestUserInDb();

      const folders: string[] = [];
      for (let i = 0; i < 3; i++) {
        const folder = await testPrisma.bookmarkFolder.create({
          data: {
            userId: user.id,
            name: `폴더 ${i}`,
          },
        });
        folders.push(folder.id);
      }

      // Different bookmark counts per folder
      const counts = [5, 3, 2];
      for (let i = 0; i < folders.length; i++) {
        for (let j = 0; j < counts[i]; j++) {
          await testPrisma.bookmark.create({
            data: {
              userId: user.id,
              title: `사용량 북마크 ${i}_${j}`,
              type: "reading",
              contentId: `usage_${i}_${j}`,
              url: `/usage/${i}/${j}`,
              folderId: folders[i],
            },
          });
        }
      }

      const folderCounts = await testPrisma.bookmark.groupBy({
        by: ["folderId"],
        where: { userId: user.id, folderId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      });

      expect(folderCounts[0]._count.id).toBe(5);
    });
  });

  describe("Bookmark Updates", () => {
    it("updates bookmark title", async () => {
      const user = await createTestUserInDb();

      const bookmark = await testPrisma.bookmark.create({
        data: {
          userId: user.id,
          title: "원래 제목",
          type: "reading",
          contentId: "update_1",
          url: "/update/1",
        },
      });

      const updated = await testPrisma.bookmark.update({
        where: { id: bookmark.id },
        data: { title: "수정된 제목" },
      });

      expect(updated.title).toBe("수정된 제목");
    });

    it("moves bookmark to folder", async () => {
      const user = await createTestUserInDb();

      const folder = await testPrisma.bookmarkFolder.create({
        data: {
          userId: user.id,
          name: "이동할 폴더",
        },
      });

      const bookmark = await testPrisma.bookmark.create({
        data: {
          userId: user.id,
          title: "이동할 북마크",
          type: "reading",
          contentId: "move_1",
          url: "/move/1",
        },
      });

      const updated = await testPrisma.bookmark.update({
        where: { id: bookmark.id },
        data: { folderId: folder.id },
      });

      expect(updated.folderId).toBe(folder.id);
    });

    it("updates bookmark notes", async () => {
      const user = await createTestUserInDb();

      const bookmark = await testPrisma.bookmark.create({
        data: {
          userId: user.id,
          title: "메모 북마크",
          type: "reading",
          contentId: "note_1",
          url: "/note/1",
        },
      });

      const updated = await testPrisma.bookmark.update({
        where: { id: bookmark.id },
        data: { notes: "새로운 메모 추가" },
      });

      expect(updated.notes).toBe("새로운 메모 추가");
    });

    it("updates bookmark tags", async () => {
      const user = await createTestUserInDb();

      const bookmark = await testPrisma.bookmark.create({
        data: {
          userId: user.id,
          title: "태그 북마크",
          type: "reading",
          contentId: "tags_1",
          url: "/tags/1",
          tags: ["기존"],
        },
      });

      const updated = await testPrisma.bookmark.update({
        where: { id: bookmark.id },
        data: { tags: ["기존", "새로운", "태그"] },
      });

      const tags = updated.tags as string[];
      expect(tags).toHaveLength(3);
    });
  });

  describe("Bookmark Deletion", () => {
    it("deletes single bookmark", async () => {
      const user = await createTestUserInDb();

      const bookmark = await testPrisma.bookmark.create({
        data: {
          userId: user.id,
          title: "삭제할 북마크",
          type: "reading",
          contentId: "delete_1",
          url: "/delete/1",
        },
      });

      await testPrisma.bookmark.delete({
        where: { id: bookmark.id },
      });

      const found = await testPrisma.bookmark.findUnique({
        where: { id: bookmark.id },
      });

      expect(found).toBeNull();
    });

    it("deletes all bookmarks in folder", async () => {
      const user = await createTestUserInDb();

      const folder = await testPrisma.bookmarkFolder.create({
        data: {
          userId: user.id,
          name: "삭제할 폴더",
        },
      });

      for (let i = 0; i < 5; i++) {
        await testPrisma.bookmark.create({
          data: {
            userId: user.id,
            title: `폴더 내 북마크 ${i}`,
            type: "reading",
            contentId: `folder_delete_${i}`,
            url: `/folder_delete/${i}`,
            folderId: folder.id,
          },
        });
      }

      await testPrisma.bookmark.deleteMany({
        where: { folderId: folder.id },
      });

      const remaining = await testPrisma.bookmark.findMany({
        where: { folderId: folder.id },
      });

      expect(remaining).toHaveLength(0);
    });

    it("deletes folder and moves bookmarks", async () => {
      const user = await createTestUserInDb();

      const folder = await testPrisma.bookmarkFolder.create({
        data: {
          userId: user.id,
          name: "삭제할 폴더",
        },
      });

      for (let i = 0; i < 3; i++) {
        await testPrisma.bookmark.create({
          data: {
            userId: user.id,
            title: `이동할 북마크 ${i}`,
            type: "reading",
            contentId: `move_out_${i}`,
            url: `/move_out/${i}`,
            folderId: folder.id,
          },
        });
      }

      // Move bookmarks out of folder
      await testPrisma.bookmark.updateMany({
        where: { folderId: folder.id },
        data: { folderId: null },
      });

      // Delete folder
      await testPrisma.bookmarkFolder.delete({
        where: { id: folder.id },
      });

      const orphanedBookmarks = await testPrisma.bookmark.findMany({
        where: { userId: user.id, folderId: null },
      });

      expect(orphanedBookmarks).toHaveLength(3);
    });
  });
});

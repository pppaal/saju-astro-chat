/**
 * FAQ Content Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - FAQ 콘텐츠 관리
 * - 카테고리 및 검색
 * - 조회수 추적
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

describe("Integration: FAQ Content", () => {
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

  describe("FAQ Creation", () => {
    it("creates basic FAQ", async () => {
      const faq = await testPrisma.faq.create({
        data: {
          question: "사주 풀이는 어떻게 받나요?",
          answer: "생년월일과 태어난 시간을 입력하면 AI가 자동으로 사주를 분석해드립니다.",
          category: "usage",
          order: 1,
          isActive: true,
        },
      });

      expect(faq.question).toContain("사주 풀이");
      expect(faq.category).toBe("usage");
    });

    it("creates FAQ with tags", async () => {
      const faq = await testPrisma.faq.create({
        data: {
          question: "프리미엄 구독의 혜택은 무엇인가요?",
          answer: "무제한 사주 풀이, 상세 운세, 궁합 분석 등을 이용하실 수 있습니다.",
          category: "subscription",
          order: 1,
          isActive: true,
          tags: ["premium", "subscription", "benefits"],
        },
      });

      const tags = faq.tags as string[];
      expect(tags).toContain("premium");
    });

    it("creates FAQ with related links", async () => {
      const faq = await testPrisma.faq.create({
        data: {
          question: "결제는 어떻게 하나요?",
          answer: "설정 > 구독 메뉴에서 결제하실 수 있습니다.",
          category: "payment",
          order: 1,
          isActive: true,
          relatedLinks: [
            { title: "구독 페이지", url: "/settings/subscription" },
            { title: "가격 안내", url: "/pricing" },
          ],
        },
      });

      const links = faq.relatedLinks as { title: string; url: string }[];
      expect(links).toHaveLength(2);
    });

    it("creates multilingual FAQ", async () => {
      const faq = await testPrisma.faq.create({
        data: {
          question: "How do I get my fortune reading?",
          answer: "Enter your birth date and time, and our AI will analyze your fortune.",
          category: "usage",
          order: 1,
          isActive: true,
          language: "en",
        },
      });

      expect(faq.language).toBe("en");
    });

    it("creates FAQ with media", async () => {
      const faq = await testPrisma.faq.create({
        data: {
          question: "앱 사용 방법이 궁금해요",
          answer: "아래 튜토리얼 영상을 참고해주세요.",
          category: "tutorial",
          order: 1,
          isActive: true,
          media: {
            type: "video",
            url: "https://example.com/tutorial.mp4",
            thumbnail: "https://example.com/thumbnail.jpg",
          },
        },
      });

      const media = faq.media as { type: string };
      expect(media.type).toBe("video");
    });
  });

  describe("FAQ Retrieval", () => {
    it("retrieves FAQs by category", async () => {
      const categories = ["usage", "payment", "usage", "account", "usage"];

      for (let i = 0; i < categories.length; i++) {
        await testPrisma.faq.create({
          data: {
            question: `질문 ${i}`,
            answer: `답변 ${i}`,
            category: categories[i],
            order: i,
            isActive: true,
          },
        });
      }

      const usageFaqs = await testPrisma.faq.findMany({
        where: { category: "usage" },
      });

      expect(usageFaqs).toHaveLength(3);
    });

    it("retrieves active FAQs only", async () => {
      const statuses = [true, false, true, false, true];

      for (let i = 0; i < statuses.length; i++) {
        await testPrisma.faq.create({
          data: {
            question: `활성화 질문 ${i}`,
            answer: `답변 ${i}`,
            category: "general",
            order: i,
            isActive: statuses[i],
          },
        });
      }

      const activeFaqs = await testPrisma.faq.findMany({
        where: { isActive: true },
      });

      expect(activeFaqs).toHaveLength(3);
    });

    it("retrieves FAQs in order", async () => {
      const orders = [3, 1, 4, 2, 5];

      for (let i = 0; i < orders.length; i++) {
        await testPrisma.faq.create({
          data: {
            question: `순서 질문 ${orders[i]}`,
            answer: `답변`,
            category: "general",
            order: orders[i],
            isActive: true,
          },
        });
      }

      const orderedFaqs = await testPrisma.faq.findMany({
        where: { category: "general" },
        orderBy: { order: "asc" },
      });

      expect(orderedFaqs[0].order).toBe(1);
      expect(orderedFaqs[4].order).toBe(5);
    });

    it("retrieves FAQs by language", async () => {
      const languages = ["ko", "en", "ko", "ja", "ko"];

      for (let i = 0; i < languages.length; i++) {
        await testPrisma.faq.create({
          data: {
            question: `언어 질문 ${i}`,
            answer: `답변 ${i}`,
            category: "general",
            order: i,
            isActive: true,
            language: languages[i],
          },
        });
      }

      const koreanFaqs = await testPrisma.faq.findMany({
        where: { language: "ko" },
      });

      expect(koreanFaqs).toHaveLength(3);
    });

    it("searches FAQs by keyword", async () => {
      await testPrisma.faq.create({
        data: {
          question: "구독 취소는 어떻게 하나요?",
          answer: "설정에서 구독을 취소할 수 있습니다.",
          category: "subscription",
          order: 1,
          isActive: true,
        },
      });

      await testPrisma.faq.create({
        data: {
          question: "결제 수단을 변경하고 싶어요",
          answer: "결제 설정에서 변경 가능합니다.",
          category: "payment",
          order: 1,
          isActive: true,
        },
      });

      await testPrisma.faq.create({
        data: {
          question: "구독 혜택이 뭔가요?",
          answer: "프리미엄 기능을 이용할 수 있습니다.",
          category: "subscription",
          order: 2,
          isActive: true,
        },
      });

      const searchResults = await testPrisma.faq.findMany({
        where: {
          OR: [
            { question: { contains: "구독" } },
            { answer: { contains: "구독" } },
          ],
        },
      });

      expect(searchResults).toHaveLength(2);
    });
  });

  describe("FAQ Categories", () => {
    it("creates FAQ category", async () => {
      const category = await testPrisma.faqCategory.create({
        data: {
          name: "결제",
          slug: "payment",
          description: "결제 및 구독 관련 FAQ",
          icon: "credit-card",
          order: 1,
          isActive: true,
        },
      });

      expect(category.slug).toBe("payment");
    });

    it("retrieves categories with FAQ count", async () => {
      const category = await testPrisma.faqCategory.create({
        data: {
          name: "사용법",
          slug: "usage",
          order: 1,
          isActive: true,
        },
      });

      for (let i = 0; i < 5; i++) {
        await testPrisma.faq.create({
          data: {
            question: `사용법 질문 ${i}`,
            answer: `답변 ${i}`,
            category: category.slug,
            categoryId: category.id,
            order: i,
            isActive: true,
          },
        });
      }

      const faqs = await testPrisma.faq.findMany({
        where: { categoryId: category.id },
      });

      expect(faqs).toHaveLength(5);
    });

    it("orders categories", async () => {
      const orders = [3, 1, 2];
      const names = ["기타", "시작하기", "결제"];

      for (let i = 0; i < orders.length; i++) {
        await testPrisma.faqCategory.create({
          data: {
            name: names[i],
            slug: `cat_${orders[i]}`,
            order: orders[i],
            isActive: true,
          },
        });
      }

      const categories = await testPrisma.faqCategory.findMany({
        orderBy: { order: "asc" },
      });

      expect(categories[0].name).toBe("시작하기");
    });
  });

  describe("FAQ View Tracking", () => {
    it("increments view count", async () => {
      const faq = await testPrisma.faq.create({
        data: {
          question: "조회수 테스트",
          answer: "답변",
          category: "general",
          order: 1,
          isActive: true,
          viewCount: 0,
        },
      });

      const updated = await testPrisma.faq.update({
        where: { id: faq.id },
        data: { viewCount: { increment: 1 } },
      });

      expect(updated.viewCount).toBe(1);
    });

    it("tracks user FAQ views", async () => {
      const user = await createTestUserInDb();

      const faq = await testPrisma.faq.create({
        data: {
          question: "사용자 조회 테스트",
          answer: "답변",
          category: "general",
          order: 1,
          isActive: true,
        },
      });

      const view = await testPrisma.faqView.create({
        data: {
          userId: user.id,
          faqId: faq.id,
        },
      });

      expect(view.userId).toBe(user.id);
      expect(view.faqId).toBe(faq.id);
    });

    it("finds most viewed FAQs", async () => {
      const viewCounts = [100, 50, 200, 75, 150];

      for (let i = 0; i < viewCounts.length; i++) {
        await testPrisma.faq.create({
          data: {
            question: `인기 질문 ${i}`,
            answer: `답변 ${i}`,
            category: "general",
            order: i,
            isActive: true,
            viewCount: viewCounts[i],
          },
        });
      }

      const popular = await testPrisma.faq.findMany({
        where: { category: "general" },
        orderBy: { viewCount: "desc" },
        take: 3,
      });

      expect(popular[0].viewCount).toBe(200);
      expect(popular[1].viewCount).toBe(150);
    });
  });

  describe("FAQ Helpfulness", () => {
    it("records helpfulness vote", async () => {
      const user = await createTestUserInDb();

      const faq = await testPrisma.faq.create({
        data: {
          question: "도움됨 테스트",
          answer: "답변",
          category: "general",
          order: 1,
          isActive: true,
          helpfulCount: 0,
          notHelpfulCount: 0,
        },
      });

      await testPrisma.faqHelpfulness.create({
        data: {
          userId: user.id,
          faqId: faq.id,
          isHelpful: true,
        },
      });

      const updated = await testPrisma.faq.update({
        where: { id: faq.id },
        data: { helpfulCount: { increment: 1 } },
      });

      expect(updated.helpfulCount).toBe(1);
    });

    it("calculates helpfulness ratio", async () => {
      const faq = await testPrisma.faq.create({
        data: {
          question: "비율 테스트",
          answer: "답변",
          category: "general",
          order: 1,
          isActive: true,
          helpfulCount: 80,
          notHelpfulCount: 20,
        },
      });

      const total = faq.helpfulCount + faq.notHelpfulCount;
      const ratio = (faq.helpfulCount / total) * 100;

      expect(ratio).toBe(80);
    });

    it("finds FAQs needing improvement", async () => {
      const helpfulness = [
        { helpful: 90, notHelpful: 10 },
        { helpful: 30, notHelpful: 70 },
        { helpful: 80, notHelpful: 20 },
        { helpful: 20, notHelpful: 80 },
        { helpful: 70, notHelpful: 30 },
      ];

      for (let i = 0; i < helpfulness.length; i++) {
        await testPrisma.faq.create({
          data: {
            question: `개선 필요 ${i}`,
            answer: `답변 ${i}`,
            category: "general",
            order: i,
            isActive: true,
            helpfulCount: helpfulness[i].helpful,
            notHelpfulCount: helpfulness[i].notHelpful,
          },
        });
      }

      const faqs = await testPrisma.faq.findMany({
        where: { category: "general" },
      });

      const needsImprovement = faqs.filter((f) => {
        const total = f.helpfulCount + f.notHelpfulCount;
        return total > 0 && f.helpfulCount / total < 0.5;
      });

      expect(needsImprovement).toHaveLength(2);
    });
  });

  describe("FAQ Updates", () => {
    it("updates FAQ content", async () => {
      const faq = await testPrisma.faq.create({
        data: {
          question: "업데이트 테스트",
          answer: "원래 답변",
          category: "general",
          order: 1,
          isActive: true,
        },
      });

      const updated = await testPrisma.faq.update({
        where: { id: faq.id },
        data: {
          answer: "수정된 답변",
          updatedAt: new Date(),
        },
      });

      expect(updated.answer).toBe("수정된 답변");
    });

    it("reorders FAQs", async () => {
      const faqs: string[] = [];

      for (let i = 0; i < 5; i++) {
        const faq = await testPrisma.faq.create({
          data: {
            question: `순서 변경 ${i}`,
            answer: `답변 ${i}`,
            category: "reorder",
            order: i + 1,
            isActive: true,
          },
        });
        faqs.push(faq.id);
      }

      // Move item 5 to position 1
      await testPrisma.faq.update({
        where: { id: faqs[4] },
        data: { order: 0 },
      });

      const reordered = await testPrisma.faq.findMany({
        where: { category: "reorder" },
        orderBy: { order: "asc" },
      });

      expect(reordered[0].id).toBe(faqs[4]);
    });

    it("deactivates FAQ", async () => {
      const faq = await testPrisma.faq.create({
        data: {
          question: "비활성화 테스트",
          answer: "답변",
          category: "general",
          order: 1,
          isActive: true,
        },
      });

      const updated = await testPrisma.faq.update({
        where: { id: faq.id },
        data: { isActive: false },
      });

      expect(updated.isActive).toBe(false);
    });
  });

  describe("FAQ Deletion", () => {
    it("deletes FAQ", async () => {
      const faq = await testPrisma.faq.create({
        data: {
          question: "삭제 테스트",
          answer: "답변",
          category: "general",
          order: 1,
          isActive: true,
        },
      });

      await testPrisma.faq.delete({
        where: { id: faq.id },
      });

      const found = await testPrisma.faq.findUnique({
        where: { id: faq.id },
      });

      expect(found).toBeNull();
    });

    it("deletes category and FAQs", async () => {
      const category = await testPrisma.faqCategory.create({
        data: {
          name: "삭제할 카테고리",
          slug: "delete_cat",
          order: 1,
          isActive: true,
        },
      });

      for (let i = 0; i < 3; i++) {
        await testPrisma.faq.create({
          data: {
            question: `삭제될 질문 ${i}`,
            answer: `답변 ${i}`,
            category: category.slug,
            categoryId: category.id,
            order: i,
            isActive: true,
          },
        });
      }

      await testPrisma.faq.deleteMany({
        where: { categoryId: category.id },
      });

      await testPrisma.faqCategory.delete({
        where: { id: category.id },
      });

      const remaining = await testPrisma.faq.findMany({
        where: { categoryId: category.id },
      });

      expect(remaining).toHaveLength(0);
    });
  });
});

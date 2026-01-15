/**
 * Tarot Spreads Data Tests
 *
 * Tests for tarot themes and spreads configuration
 */


import { tarotThemes } from "@/lib/Tarot/tarot-spreads-data";

describe("tarotThemes", () => {
  it("has 9 theme categories", () => {
    expect(tarotThemes).toHaveLength(9);
  });

  it("each theme has required properties", () => {
    tarotThemes.forEach((theme) => {
      expect(theme).toHaveProperty("id");
      expect(theme).toHaveProperty("category");
      expect(theme).toHaveProperty("categoryKo");
      expect(theme).toHaveProperty("description");
      expect(theme).toHaveProperty("descriptionKo");
      expect(theme).toHaveProperty("spreads");
      expect(Array.isArray(theme.spreads)).toBe(true);
    });
  });

  describe("Theme categories", () => {
    const expectedCategories = [
      "general-insight",
      "love-relationships",
      "career-work",
      "money-finance",
      "well-being-health",
      "spiritual-growth",
      "decisions-crossroads",
      "self-discovery",
      "daily-reading",
    ];

    it("includes general-insight theme", () => {
      const theme = tarotThemes.find((t) => t.id === "general-insight");
      expect(theme).toBeDefined();
      expect(theme?.category).toBe("General Insight");
      expect(theme?.categoryKo).toBe("전반 운세");
    });

    it("includes love-relationships theme", () => {
      const theme = tarotThemes.find((t) => t.id === "love-relationships");
      expect(theme).toBeDefined();
      expect(theme?.category).toBe("Love & Relationships");
      expect(theme?.categoryKo).toBe("연애·관계");
    });

    it("includes career-work theme", () => {
      const theme = tarotThemes.find((t) => t.id === "career-work");
      expect(theme).toBeDefined();
      expect(theme?.category).toBe("Career & Work");
      expect(theme?.categoryKo).toBe("직장·커리어");
    });

    it("includes daily-reading theme", () => {
      const theme = tarotThemes.find((t) => t.id === "daily-reading");
      expect(theme).toBeDefined();
      expect(theme?.category).toBe("Daily Reading");
      expect(theme?.categoryKo).toBe("오늘의 운세");
    });
  });

  describe("Spreads structure", () => {
    it("each spread has required properties", () => {
      tarotThemes.forEach((theme) => {
        theme.spreads.forEach((spread) => {
          expect(spread).toHaveProperty("id");
          expect(spread).toHaveProperty("title");
          expect(spread).toHaveProperty("titleKo");
          expect(spread).toHaveProperty("cardCount");
          expect(spread).toHaveProperty("description");
          expect(spread).toHaveProperty("descriptionKo");
          expect(spread).toHaveProperty("positions");
          expect(Array.isArray(spread.positions)).toBe(true);
        });
      });
    });

    it("cardCount matches positions length", () => {
      tarotThemes.forEach((theme) => {
        theme.spreads.forEach((spread) => {
          expect(spread.positions.length).toBe(spread.cardCount);
        });
      });
    });

    it("each position has title and titleKo", () => {
      tarotThemes.forEach((theme) => {
        theme.spreads.forEach((spread) => {
          spread.positions.forEach((position) => {
            expect(position).toHaveProperty("title");
            expect(position).toHaveProperty("titleKo");
          });
        });
      });
    });
  });

  describe("General Insight spreads", () => {
    const theme = tarotThemes.find((t) => t.id === "general-insight");

    it("has quick-reading (1 card)", () => {
      const spread = theme?.spreads.find((s) => s.id === "quick-reading");
      expect(spread).toBeDefined();
      expect(spread?.cardCount).toBe(1);
      expect(spread?.titleKo).toBe("빠른 리딩");
    });

    it("has past-present-future (3 cards)", () => {
      const spread = theme?.spreads.find((s) => s.id === "past-present-future");
      expect(spread).toBeDefined();
      expect(spread?.cardCount).toBe(3);
      expect(spread?.titleKo).toBe("과거, 현재, 미래");
    });

    it("has celtic-cross (10 cards)", () => {
      const spread = theme?.spreads.find((s) => s.id === "celtic-cross");
      expect(spread).toBeDefined();
      expect(spread?.cardCount).toBe(10);
      expect(spread?.titleKo).toBe("켈틱 크로스");
    });
  });

  describe("Love & Relationships spreads", () => {
    const theme = tarotThemes.find((t) => t.id === "love-relationships");

    it("has crush-feelings spread", () => {
      const spread = theme?.spreads.find((s) => s.id === "crush-feelings");
      expect(spread).toBeDefined();
      expect(spread?.titleKo).toBe("그 사람 마음");
      expect(spread?.cardCount).toBe(3);
    });

    it("has reconciliation spread", () => {
      const spread = theme?.spreads.find((s) => s.id === "reconciliation");
      expect(spread).toBeDefined();
      expect(spread?.titleKo).toBe("재회 가능성");
      expect(spread?.cardCount).toBe(4);
    });

    it("has relationship-cross spread", () => {
      const spread = theme?.spreads.find((s) => s.id === "relationship-cross");
      expect(spread).toBeDefined();
      expect(spread?.cardCount).toBe(5);
    });
  });

  describe("Career spreads", () => {
    const theme = tarotThemes.find((t) => t.id === "career-work");

    it("has interview-result spread", () => {
      const spread = theme?.spreads.find((s) => s.id === "interview-result");
      expect(spread).toBeDefined();
      expect(spread?.titleKo).toBe("면접 결과");
    });

    it("has job-change spread", () => {
      const spread = theme?.spreads.find((s) => s.id === "job-change");
      expect(spread).toBeDefined();
      expect(spread?.titleKo).toBe("이직할까");
    });

    it("has exam-pass spread", () => {
      const spread = theme?.spreads.find((s) => s.id === "exam-pass");
      expect(spread).toBeDefined();
      expect(spread?.titleKo).toBe("시험 합격");
    });
  });

  describe("Daily Reading spreads", () => {
    const theme = tarotThemes.find((t) => t.id === "daily-reading");

    it("has day-card (1 card)", () => {
      const spread = theme?.spreads.find((s) => s.id === "day-card");
      expect(spread).toBeDefined();
      expect(spread?.cardCount).toBe(1);
    });

    it("has weekly-forecast (7 cards)", () => {
      const spread = theme?.spreads.find((s) => s.id === "weekly-forecast");
      expect(spread).toBeDefined();
      expect(spread?.cardCount).toBe(7);
      expect(spread?.positions.map((p) => p.titleKo)).toEqual([
        "월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"
      ]);
    });

    it("has three-times spread for day journey", () => {
      const spread = theme?.spreads.find((s) => s.id === "three-times");
      expect(spread).toBeDefined();
      expect(spread?.cardCount).toBe(3);
      expect(spread?.positions.map((p) => p.titleKo)).toEqual(["아침", "낮", "저녁"]);
    });
  });

  describe("Decisions spreads", () => {
    const theme = tarotThemes.find((t) => t.id === "decisions-crossroads");

    it("has two-paths (6 cards)", () => {
      const spread = theme?.spreads.find((s) => s.id === "two-paths");
      expect(spread).toBeDefined();
      expect(spread?.cardCount).toBe(6);
      expect(spread?.titleKo).toBe("A vs B");
    });

    it("has yes-no-why (3 cards)", () => {
      const spread = theme?.spreads.find((s) => s.id === "yes-no-why");
      expect(spread).toBeDefined();
      expect(spread?.cardCount).toBe(3);
      expect(spread?.titleKo).toBe("할까 말까");
    });
  });

  describe("Card count distribution", () => {
    it("has 1-card spreads", () => {
      const oneCardSpreads = tarotThemes.flatMap((t) =>
        t.spreads.filter((s) => s.cardCount === 1)
      );
      expect(oneCardSpreads.length).toBeGreaterThan(0);
    });

    it("has 3-card spreads", () => {
      const threeCardSpreads = tarotThemes.flatMap((t) =>
        t.spreads.filter((s) => s.cardCount === 3)
      );
      expect(threeCardSpreads.length).toBeGreaterThan(0);
    });

    it("has no spread with more than 10 cards", () => {
      const allSpreads = tarotThemes.flatMap((t) => t.spreads);
      const maxCards = Math.max(...allSpreads.map((s) => s.cardCount));
      expect(maxCards).toBeLessThanOrEqual(10);
    });
  });

  describe("Bilingual content", () => {
    it("all Korean category names are present", () => {
      tarotThemes.forEach((theme) => {
        expect(theme.categoryKo).toBeDefined();
        expect(theme.categoryKo.length).toBeGreaterThan(0);
      });
    });

    it("all Korean spread titles are present", () => {
      tarotThemes.forEach((theme) => {
        theme.spreads.forEach((spread) => {
          expect(spread.titleKo).toBeDefined();
          expect(spread.titleKo.length).toBeGreaterThan(0);
        });
      });
    });

    it("all Korean position titles are present", () => {
      tarotThemes.forEach((theme) => {
        theme.spreads.forEach((spread) => {
          spread.positions.forEach((position) => {
            expect(position.titleKo).toBeDefined();
            expect(position.titleKo.length).toBeGreaterThan(0);
          });
        });
      });
    });
  });
});

describe("Spread ID uniqueness", () => {
  it("all spread IDs are unique within themes", () => {
    tarotThemes.forEach((theme) => {
      const ids = theme.spreads.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  it("all theme IDs are unique", () => {
    const ids = tarotThemes.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

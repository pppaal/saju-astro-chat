
import {
  tarotCounselors,
  getCounselorById,
  defaultCounselor,
  recommendCounselorByTheme,
  getCounselorPromptHint,
  type TarotCounselor,
} from "@/lib/Tarot/tarot-counselors";

describe("tarot-counselors", () => {
  describe("tarotCounselors array", () => {
    it("has 5 counselors", () => {
      expect(tarotCounselors).toHaveLength(5);
    });

    it("each counselor has all required properties", () => {
      tarotCounselors.forEach((counselor) => {
        expect(counselor.id).toBeDefined();
        expect(counselor.name).toBeDefined();
        expect(counselor.nameKo).toBeDefined();
        expect(counselor.title).toBeDefined();
        expect(counselor.titleKo).toBeDefined();
        expect(counselor.avatar).toBeDefined();
        expect(counselor.personality).toBeDefined();
        expect(counselor.personalityKo).toBeDefined();
        expect(counselor.style).toBeDefined();
        expect(counselor.styleKo).toBeDefined();
        expect(counselor.greeting).toBeDefined();
        expect(counselor.greetingKo).toBeDefined();
        expect(counselor.color).toBeDefined();
        expect(counselor.gradient).toBeDefined();
        expect(counselor.specialty).toBeInstanceOf(Array);
        expect(counselor.specialtyKo).toBeInstanceOf(Array);
      });
    });

    it("has unique counselor IDs", () => {
      const ids = tarotCounselors.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("includes expected counselors", () => {
      const ids = tarotCounselors.map((c) => c.id);
      expect(ids).toContain("mystic-luna");
      expect(ids).toContain("sage-marcus");
      expect(ids).toContain("warm-aria");
      expect(ids).toContain("bold-raven");
      expect(ids).toContain("cheerful-sunny");
    });

    it("each counselor has valid hex color", () => {
      const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
      tarotCounselors.forEach((counselor) => {
        expect(counselor.color).toMatch(hexColorRegex);
      });
    });

    it("each counselor has valid gradient CSS", () => {
      tarotCounselors.forEach((counselor) => {
        expect(counselor.gradient).toContain("linear-gradient");
      });
    });
  });

  describe("getCounselorById", () => {
    it("returns correct counselor for valid ID", () => {
      const luna = getCounselorById("mystic-luna");
      expect(luna).toBeDefined();
      expect(luna?.name).toBe("Luna");
      expect(luna?.nameKo).toBe("루나");
    });

    it("returns undefined for invalid ID", () => {
      const result = getCounselorById("nonexistent");
      expect(result).toBeUndefined();
    });

    it("returns all counselors by their IDs", () => {
      expect(getCounselorById("mystic-luna")?.name).toBe("Luna");
      expect(getCounselorById("sage-marcus")?.name).toBe("Marcus");
      expect(getCounselorById("warm-aria")?.name).toBe("Aria");
      expect(getCounselorById("bold-raven")?.name).toBe("Raven");
      expect(getCounselorById("cheerful-sunny")?.name).toBe("Sunny");
    });
  });

  describe("defaultCounselor", () => {
    it("is defined and is Luna", () => {
      expect(defaultCounselor).toBeDefined();
      expect(defaultCounselor.id).toBe("mystic-luna");
      expect(defaultCounselor.name).toBe("Luna");
    });

    it("has all required properties", () => {
      expect(defaultCounselor.id).toBeDefined();
      expect(defaultCounselor.name).toBeDefined();
      expect(defaultCounselor.nameKo).toBeDefined();
      expect(defaultCounselor.color).toBeDefined();
      expect(defaultCounselor.gradient).toBeDefined();
    });
  });

  describe("recommendCounselorByTheme", () => {
    it("recommends Aria for love-relationships theme", () => {
      const counselor = recommendCounselorByTheme("love-relationships");
      expect(counselor.id).toBe("warm-aria");
    });

    it("recommends Marcus for career-work theme", () => {
      const counselor = recommendCounselorByTheme("career-work");
      expect(counselor.id).toBe("sage-marcus");
    });

    it("recommends Marcus for money-finance theme", () => {
      const counselor = recommendCounselorByTheme("money-finance");
      expect(counselor.id).toBe("sage-marcus");
    });

    it("recommends Aria for well-being-health theme", () => {
      const counselor = recommendCounselorByTheme("well-being-health");
      expect(counselor.id).toBe("warm-aria");
    });

    it("recommends Marcus for decisions-crossroads theme", () => {
      const counselor = recommendCounselorByTheme("decisions-crossroads");
      expect(counselor.id).toBe("sage-marcus");
    });

    it("recommends Sunny for daily-reading theme", () => {
      const counselor = recommendCounselorByTheme("daily-reading");
      expect(counselor.id).toBe("cheerful-sunny");
    });

    it("recommends Luna for self-discovery theme", () => {
      const counselor = recommendCounselorByTheme("self-discovery");
      expect(counselor.id).toBe("mystic-luna");
    });

    it("recommends Luna for spiritual-growth theme", () => {
      const counselor = recommendCounselorByTheme("spiritual-growth");
      expect(counselor.id).toBe("mystic-luna");
    });

    it("recommends Luna for general-insight theme", () => {
      const counselor = recommendCounselorByTheme("general-insight");
      expect(counselor.id).toBe("mystic-luna");
    });

    it("defaults to Luna for unknown themes", () => {
      const counselor = recommendCounselorByTheme("unknown-theme");
      expect(counselor.id).toBe("mystic-luna");
    });

    it("returns a valid TarotCounselor object", () => {
      const counselor = recommendCounselorByTheme("love-relationships");
      expect(counselor.id).toBeDefined();
      expect(counselor.name).toBeDefined();
      expect(counselor.greeting).toBeDefined();
    });
  });

  describe("getCounselorPromptHint", () => {
    it("returns Korean hint for Luna", () => {
      const luna = getCounselorById("mystic-luna")!;
      const hint = getCounselorPromptHint(luna, true);
      expect(hint).toContain("차분");
      expect(hint).toContain("직관");
    });

    it("returns English hint for Luna", () => {
      const luna = getCounselorById("mystic-luna")!;
      const hint = getCounselorPromptHint(luna, false);
      expect(hint).toContain("intuition");
    });

    it("returns Korean hint for Marcus", () => {
      const marcus = getCounselorById("sage-marcus")!;
      const hint = getCounselorPromptHint(marcus, true);
      expect(hint).toContain("직설");
      expect(hint).toContain("실용");
    });

    it("returns English hint for Marcus", () => {
      const marcus = getCounselorById("sage-marcus")!;
      const hint = getCounselorPromptHint(marcus, false);
      expect(hint).toContain("Direct");
      expect(hint).toContain("practical");
    });

    it("returns Korean hint for Aria", () => {
      const aria = getCounselorById("warm-aria")!;
      const hint = getCounselorPromptHint(aria, true);
      expect(hint).toContain("따뜻");
      expect(hint).toContain("공감");
    });

    it("returns Korean hint for Raven", () => {
      const raven = getCounselorById("bold-raven")!;
      const hint = getCounselorPromptHint(raven, true);
      expect(hint).toContain("솔직");
      expect(hint).toContain("날카");
    });

    it("returns Korean hint for Sunny", () => {
      const sunny = getCounselorById("cheerful-sunny")!;
      const hint = getCounselorPromptHint(sunny, true);
      expect(hint).toContain("밝");
      expect(hint).toContain("희망");
    });

    it("returns empty string for unknown counselor", () => {
      const fakeCounselor: TarotCounselor = {
        id: "unknown",
        name: "Unknown",
        nameKo: "알수없음",
        title: "Unknown",
        titleKo: "알수없음",
        avatar: "?",
        personality: "",
        personalityKo: "",
        style: "",
        styleKo: "",
        greeting: "",
        greetingKo: "",
        color: "#000000",
        gradient: "",
        specialty: [],
        specialtyKo: [],
      };
      const hint = getCounselorPromptHint(fakeCounselor, true);
      expect(hint).toBe("");
    });
  });

  describe("counselor specialties", () => {
    it("Luna specializes in love, destiny, spiritual", () => {
      const luna = getCounselorById("mystic-luna")!;
      expect(luna.specialty).toContain("love");
      expect(luna.specialty).toContain("destiny");
      expect(luna.specialty).toContain("spiritual");
    });

    it("Marcus specializes in career, decisions, money", () => {
      const marcus = getCounselorById("sage-marcus")!;
      expect(marcus.specialty).toContain("career");
      expect(marcus.specialty).toContain("decisions");
      expect(marcus.specialty).toContain("money");
    });

    it("Aria specializes in love, relationships, healing", () => {
      const aria = getCounselorById("warm-aria")!;
      expect(aria.specialty).toContain("love");
      expect(aria.specialty).toContain("relationships");
      expect(aria.specialty).toContain("healing");
    });

    it("Raven specializes in shadow-work, truth, transformation", () => {
      const raven = getCounselorById("bold-raven")!;
      expect(raven.specialty).toContain("shadow-work");
      expect(raven.specialty).toContain("truth");
      expect(raven.specialty).toContain("transformation");
    });

    it("Sunny specializes in daily, motivation, new-beginnings", () => {
      const sunny = getCounselorById("cheerful-sunny")!;
      expect(sunny.specialty).toContain("daily");
      expect(sunny.specialty).toContain("motivation");
      expect(sunny.specialty).toContain("new-beginnings");
    });
  });
});

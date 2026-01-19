/**
 * Karma Data Tests
 * Tests for karma tab data objects: dayMaster, fiveElements, shinsal, northNode, saturn
 */

import { describe, it, expect } from "vitest";
import {
  dayMasterSimple,
  fiveElementsSimple,
  shinsalSimple,
  northNodeSimple,
  saturnSimple,
} from "@/components/destiny-map/fun-insights/tabs/data/karma-data";

describe("Karma Data Module", () => {
  describe("dayMasterSimple", () => {
    const dayMasters = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];

    it("contains all 10 day masters", () => {
      expect(Object.keys(dayMasterSimple)).toHaveLength(10);
      for (const dm of dayMasters) {
        expect(dayMasterSimple).toHaveProperty(dm);
      }
    });

    it("each day master has required properties", () => {
      for (const dm of dayMasters) {
        const info = dayMasterSimple[dm];
        expect(info).toHaveProperty("emoji");
        expect(info).toHaveProperty("simpleKo");
        expect(info).toHaveProperty("simpleEn");
        expect(info).toHaveProperty("metaphorKo");
        expect(info).toHaveProperty("metaphorEn");
        expect(info).toHaveProperty("strengthKo");
        expect(info).toHaveProperty("strengthEn");
        expect(info).toHaveProperty("watchOutKo");
        expect(info).toHaveProperty("watchOutEn");
        expect(info).toHaveProperty("luckyColorKo");
        expect(info).toHaveProperty("luckyColorEn");
      }
    });

    it("emojis are non-empty strings", () => {
      for (const dm of dayMasters) {
        expect(dayMasterSimple[dm].emoji).toBeTruthy();
        expect(typeof dayMasterSimple[dm].emoji).toBe("string");
      }
    });

    describe("갑 (Big Tree)", () => {
      it("has correct emoji and names", () => {
        const info = dayMasterSimple["갑"];
        expect(info.emoji).toBe("🌳");
        expect(info.simpleKo).toBe("큰 나무 아이");
        expect(info.simpleEn).toBe("Big Tree Kid");
      });

      it("has leadership-related descriptions", () => {
        const info = dayMasterSimple["갑"];
        expect(info.strengthKo).toContain("리더십");
        expect(info.strengthEn.toLowerCase()).toContain("leader");
      });
    });

    describe("병 (Sun)", () => {
      it("has correct emoji", () => {
        expect(dayMasterSimple["병"].emoji).toBe("☀️");
      });

      it("has sun-related metaphor", () => {
        const info = dayMasterSimple["병"];
        expect(info.metaphorKo).toContain("태양");
        expect(info.metaphorEn.toLowerCase()).toContain("sun");
      });
    });

    describe("임 (Ocean)", () => {
      it("has correct emoji", () => {
        expect(dayMasterSimple["임"].emoji).toBe("🌊");
      });

      it("has water-related descriptions", () => {
        const info = dayMasterSimple["임"];
        expect(info.simpleKo).toContain("바다");
        expect(info.simpleEn.toLowerCase()).toContain("ocean");
      });
    });

    describe("metal elements (경, 신)", () => {
      it("경 has sword emoji", () => {
        expect(dayMasterSimple["경"].emoji).toBe("⚔️");
      });

      it("신 has gem emoji", () => {
        expect(dayMasterSimple["신"].emoji).toBe("💎");
      });
    });

    it("all Korean and English texts are non-empty", () => {
      for (const dm of dayMasters) {
        const info = dayMasterSimple[dm];
        expect(info.simpleKo.length).toBeGreaterThan(0);
        expect(info.simpleEn.length).toBeGreaterThan(0);
        expect(info.metaphorKo.length).toBeGreaterThan(0);
        expect(info.metaphorEn.length).toBeGreaterThan(0);
        expect(info.strengthKo.length).toBeGreaterThan(0);
        expect(info.strengthEn.length).toBeGreaterThan(0);
        expect(info.watchOutKo.length).toBeGreaterThan(0);
        expect(info.watchOutEn.length).toBeGreaterThan(0);
        expect(info.luckyColorKo.length).toBeGreaterThan(0);
        expect(info.luckyColorEn.length).toBeGreaterThan(0);
      }
    });
  });

  describe("fiveElementsSimple", () => {
    const elements = ["wood", "fire", "earth", "metal", "water"];

    it("contains all 5 elements", () => {
      expect(Object.keys(fiveElementsSimple)).toHaveLength(5);
      for (const el of elements) {
        expect(fiveElementsSimple).toHaveProperty(el);
      }
    });

    it("each element has required properties", () => {
      for (const el of elements) {
        const info = fiveElementsSimple[el];
        expect(info).toHaveProperty("emoji");
        expect(info).toHaveProperty("nameKo");
        expect(info).toHaveProperty("nameEn");
        expect(info).toHaveProperty("simpleKo");
        expect(info).toHaveProperty("simpleEn");
        expect(info).toHaveProperty("likeKo");
        expect(info).toHaveProperty("likeEn");
        expect(info).toHaveProperty("tooMuchKo");
        expect(info).toHaveProperty("tooMuchEn");
        expect(info).toHaveProperty("tooLittleKo");
        expect(info).toHaveProperty("tooLittleEn");
      }
    });

    describe("wood element", () => {
      it("has correct emoji and contains growth theme", () => {
        const info = fiveElementsSimple.wood;
        expect(info.emoji).toBe("🌳");
        expect(info.nameKo).toContain("木");
        expect(info.simpleKo).toContain("자라");
        expect(info.likeKo).toContain("봄");
        expect(info.likeEn.toLowerCase()).toContain("spring");
      });
    });

    describe("fire element", () => {
      it("has correct emoji and contains passion theme", () => {
        const info = fiveElementsSimple.fire;
        expect(info.emoji).toBe("🔥");
        expect(info.nameKo).toContain("火");
        expect(info.simpleKo).toContain("열정");
        expect(info.likeKo).toContain("여름");
        expect(info.likeEn.toLowerCase()).toContain("summer");
      });
    });

    describe("earth element", () => {
      it("has correct emoji and contains stability theme", () => {
        const info = fiveElementsSimple.earth;
        expect(info.emoji).toBe("🏔️");
        expect(info.nameKo).toContain("土");
        expect(info.simpleKo).toContain("안정");
      });
    });

    describe("metal element", () => {
      it("has correct emoji and contains decisiveness theme", () => {
        const info = fiveElementsSimple.metal;
        expect(info.emoji).toBe("⚔️");
        expect(info.nameKo).toContain("金");
        expect(info.simpleKo).toContain("결단");
        expect(info.likeKo).toContain("가을");
        expect(info.likeEn.toLowerCase()).toContain("autumn");
      });
    });

    describe("water element", () => {
      it("has correct emoji and contains wisdom theme", () => {
        const info = fiveElementsSimple.water;
        expect(info.emoji).toBe("💧");
        expect(info.nameKo).toContain("水");
        expect(info.simpleKo).toContain("지혜");
        expect(info.likeKo).toContain("겨울");
        expect(info.likeEn.toLowerCase()).toContain("winter");
      });
    });

    it("each element has balanced too much and too little descriptions", () => {
      for (const el of elements) {
        const info = fiveElementsSimple[el];
        expect(info.tooMuchKo).toContain("너무 많으면");
        expect(info.tooMuchEn.toLowerCase()).toContain("too much");
        expect(info.tooLittleKo).toContain("부족하면");
        expect(info.tooLittleEn.toLowerCase()).toContain("too little");
      }
    });
  });

  describe("shinsalSimple", () => {
    const shinsalKeys = Object.keys(shinsalSimple);

    it("contains expected shinsal entries", () => {
      expect(shinsalKeys.length).toBeGreaterThan(10);

      // Lucky shinsals
      expect(shinsalSimple).toHaveProperty("천을귀인");
      expect(shinsalSimple).toHaveProperty("천덕귀인");
      expect(shinsalSimple).toHaveProperty("문창귀인");
      expect(shinsalSimple).toHaveProperty("역마살");

      // Challenging shinsals
      expect(shinsalSimple).toHaveProperty("도화살");
      expect(shinsalSimple).toHaveProperty("백호살");
      expect(shinsalSimple).toHaveProperty("공망");
    });

    it("each shinsal has required properties", () => {
      for (const key of shinsalKeys) {
        const info = shinsalSimple[key];
        expect(info).toHaveProperty("emoji");
        expect(info).toHaveProperty("typeKo");
        expect(info).toHaveProperty("typeEn");
        expect(info).toHaveProperty("simpleKo");
        expect(info).toHaveProperty("simpleEn");
        expect(info).toHaveProperty("storyKo");
        expect(info).toHaveProperty("storyEn");
        expect(info).toHaveProperty("adviceKo");
        expect(info).toHaveProperty("adviceEn");
        expect(info).toHaveProperty("isLucky");
        expect(typeof info.isLucky).toBe("boolean");
      }
    });

    describe("lucky shinsals", () => {
      const luckyShinsals = ["천을귀인", "천덕귀인", "문창귀인", "역마살", "화개살", "장성살"];

      it("lucky shinsals have isLucky: true", () => {
        for (const name of luckyShinsals) {
          expect(shinsalSimple[name].isLucky).toBe(true);
        }
      });
    });

    describe("challenging shinsals", () => {
      const challengingShinsals = ["도화살", "백호살", "공망", "겁살", "양인살"];

      it("challenging shinsals have isLucky: false", () => {
        for (const name of challengingShinsals) {
          expect(shinsalSimple[name].isLucky).toBe(false);
        }
      });
    });

    describe("천을귀인 (Angel Star)", () => {
      it("has correct emoji and properties", () => {
        const info = shinsalSimple["천을귀인"];
        expect(info.emoji).toBe("👼");
        expect(info.typeKo).toBe("천사의 별");
        expect(info.typeEn).toBe("Angel Star");
        expect(info.isLucky).toBe(true);
      });

      it("contains helper theme in story", () => {
        const info = shinsalSimple["천을귀인"];
        expect(info.storyKo).toContain("도와");
        expect(info.storyEn.toLowerCase()).toContain("help");
      });
    });

    describe("역마살 (Traveler Star)", () => {
      it("has travel-related content", () => {
        const info = shinsalSimple["역마살"];
        expect(info.emoji).toBe("✈️");
        expect(info.storyKo).toContain("여행");
        expect(info.storyEn.toLowerCase()).toContain("travel");
        expect(info.isLucky).toBe(true);
      });
    });

    describe("도화살 (Charm Star)", () => {
      it("has charm-related content but is challenging", () => {
        const info = shinsalSimple["도화살"];
        expect(info.emoji).toBe("🌸");
        expect(info.simpleKo).toContain("매력");
        expect(info.simpleEn.toLowerCase()).toContain("charm");
        expect(info.isLucky).toBe(false); // Can cause complications
      });
    });

    it("all texts are non-empty strings", () => {
      for (const key of shinsalKeys) {
        const info = shinsalSimple[key];
        expect(info.emoji.length).toBeGreaterThan(0);
        expect(info.typeKo.length).toBeGreaterThan(0);
        expect(info.typeEn.length).toBeGreaterThan(0);
        expect(info.simpleKo.length).toBeGreaterThan(0);
        expect(info.simpleEn.length).toBeGreaterThan(0);
        expect(info.storyKo.length).toBeGreaterThan(0);
        expect(info.storyEn.length).toBeGreaterThan(0);
        expect(info.adviceKo.length).toBeGreaterThan(0);
        expect(info.adviceEn.length).toBeGreaterThan(0);
      }
    });
  });

  describe("northNodeSimple", () => {
    const houses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    it("contains all 12 houses", () => {
      expect(Object.keys(northNodeSimple)).toHaveLength(12);
      for (const house of houses) {
        expect(northNodeSimple).toHaveProperty(String(house));
      }
    });

    it("each house has required properties", () => {
      for (const house of houses) {
        const info = northNodeSimple[house];
        expect(info).toHaveProperty("emoji");
        expect(info).toHaveProperty("titleKo");
        expect(info).toHaveProperty("titleEn");
        expect(info).toHaveProperty("simpleKo");
        expect(info).toHaveProperty("simpleEn");
        expect(info).toHaveProperty("lessonKo");
        expect(info).toHaveProperty("lessonEn");
        expect(info).toHaveProperty("tipKo");
        expect(info).toHaveProperty("tipEn");
      }
    });

    describe("House 1 (Self)", () => {
      it("has correct theme", () => {
        const info = northNodeSimple[1];
        expect(info.emoji).toBe("🦸");
        expect(info.titleKo).toContain("영웅");
        expect(info.titleEn.toLowerCase()).toContain("hero");
        expect(info.simpleKo).toContain("나");
      });
    });

    describe("House 4 (Home)", () => {
      it("has home/family theme", () => {
        const info = northNodeSimple[4];
        expect(info.emoji).toBe("🏠");
        expect(info.titleKo).toContain("집");
        expect(info.simpleKo).toContain("가족");
        expect(info.simpleEn.toLowerCase()).toContain("family");
      });
    });

    describe("House 7 (Partnership)", () => {
      it("has partnership theme", () => {
        const info = northNodeSimple[7];
        expect(info.emoji).toBe("🤝");
        expect(info.simpleKo).toContain("파트너십");
        expect(info.simpleEn.toLowerCase()).toContain("partnership");
      });
    });

    describe("House 10 (Career)", () => {
      it("has career/success theme", () => {
        const info = northNodeSimple[10];
        expect(info.emoji).toBe("🏆");
        expect(info.simpleKo).toContain("사회적 역할");
        expect(info.tipKo).toContain("커리어");
      });
    });

    describe("House 12 (Spirituality)", () => {
      it("has spiritual theme", () => {
        const info = northNodeSimple[12];
        expect(info.emoji).toBe("🧘");
        expect(info.titleKo).toContain("영혼");
        expect(info.simpleKo).toContain("영적");
        expect(info.tipKo).toContain("명상");
      });
    });

    it("all texts are non-empty", () => {
      for (const house of houses) {
        const info = northNodeSimple[house];
        expect(info.emoji.length).toBeGreaterThan(0);
        expect(info.titleKo.length).toBeGreaterThan(0);
        expect(info.titleEn.length).toBeGreaterThan(0);
        expect(info.simpleKo.length).toBeGreaterThan(0);
        expect(info.simpleEn.length).toBeGreaterThan(0);
        expect(info.lessonKo.length).toBeGreaterThan(0);
        expect(info.lessonEn.length).toBeGreaterThan(0);
        expect(info.tipKo.length).toBeGreaterThan(0);
        expect(info.tipEn.length).toBeGreaterThan(0);
      }
    });
  });

  describe("saturnSimple", () => {
    const houses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    it("contains all 12 houses", () => {
      expect(Object.keys(saturnSimple)).toHaveLength(12);
      for (const house of houses) {
        expect(saturnSimple).toHaveProperty(String(house));
      }
    });

    it("each house has required properties", () => {
      for (const house of houses) {
        const info = saturnSimple[house];
        expect(info).toHaveProperty("emoji");
        expect(info).toHaveProperty("lessonKo");
        expect(info).toHaveProperty("lessonEn");
        expect(info).toHaveProperty("challengeKo");
        expect(info).toHaveProperty("challengeEn");
        expect(info).toHaveProperty("rewardKo");
        expect(info).toHaveProperty("rewardEn");
      }
    });

    describe("House 1 (Self-confidence)", () => {
      it("has correct theme", () => {
        const info = saturnSimple[1];
        expect(info.emoji).toBe("🪨");
        expect(info.lessonKo).toContain("자신");
        expect(info.challengeKo).toContain("자신감");
        expect(info.rewardKo).toContain("자아");
      });
    });

    describe("House 2 (Finances)", () => {
      it("has money theme", () => {
        const info = saturnSimple[2];
        expect(info.emoji).toBe("💸");
        expect(info.lessonKo).toContain("돈");
        expect(info.challengeKo).toContain("재정");
        expect(info.rewardKo).toContain("재정");
      });
    });

    describe("House 7 (Relationships)", () => {
      it("has relationship theme", () => {
        const info = saturnSimple[7];
        expect(info.emoji).toBe("💍");
        expect(info.lessonKo).toContain("관계");
        expect(info.challengeKo).toContain("관계");
        expect(info.rewardKo).toContain("파트너십");
      });
    });

    describe("House 10 (Career)", () => {
      it("has career/responsibility theme", () => {
        const info = saturnSimple[10];
        expect(info.emoji).toBe("🏔️");
        expect(info.lessonKo).toContain("책임");
        expect(info.challengeKo).toContain("성공");
        expect(info.rewardKo).toContain("존경");
      });
    });

    describe("House 12 (Spirituality)", () => {
      it("has inner/spiritual theme", () => {
        const info = saturnSimple[12];
        expect(info.emoji).toBe("🌙");
        expect(info.lessonKo).toContain("영혼");
        expect(info.challengeKo).toContain("고독");
        expect(info.rewardKo).toContain("영적");
      });
    });

    it("all texts are non-empty", () => {
      for (const house of houses) {
        const info = saturnSimple[house];
        expect(info.emoji.length).toBeGreaterThan(0);
        expect(info.lessonKo.length).toBeGreaterThan(0);
        expect(info.lessonEn.length).toBeGreaterThan(0);
        expect(info.challengeKo.length).toBeGreaterThan(0);
        expect(info.challengeEn.length).toBeGreaterThan(0);
        expect(info.rewardKo.length).toBeGreaterThan(0);
        expect(info.rewardEn.length).toBeGreaterThan(0);
      }
    });

    it("Saturn patterns show challenge before reward", () => {
      // Saturn represents lessons learned through challenges
      for (const house of houses) {
        const info = saturnSimple[house];
        // Challenge should describe difficulty
        expect(info.challengeKo.length).toBeGreaterThan(0);
        expect(info.challengeEn.length).toBeGreaterThan(0);
        // Reward should describe positive outcome
        expect(info.rewardKo.length).toBeGreaterThan(0);
        expect(info.rewardEn.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Data consistency", () => {
    it("all data objects use consistent language keys (Ko/En)", () => {
      // Check dayMasterSimple
      for (const key of Object.keys(dayMasterSimple)) {
        const info = dayMasterSimple[key];
        expect(Object.keys(info).some(k => k.endsWith("Ko"))).toBe(true);
        expect(Object.keys(info).some(k => k.endsWith("En"))).toBe(true);
      }

      // Check fiveElementsSimple
      for (const key of Object.keys(fiveElementsSimple)) {
        const info = fiveElementsSimple[key];
        expect(Object.keys(info).some(k => k.endsWith("Ko"))).toBe(true);
        expect(Object.keys(info).some(k => k.endsWith("En"))).toBe(true);
      }

      // Check shinsalSimple
      for (const key of Object.keys(shinsalSimple)) {
        const info = shinsalSimple[key];
        expect(Object.keys(info).some(k => k.endsWith("Ko"))).toBe(true);
        expect(Object.keys(info).some(k => k.endsWith("En"))).toBe(true);
      }
    });

    it("all emojis are valid (non-empty strings)", () => {
      const allData = [
        ...Object.values(dayMasterSimple),
        ...Object.values(fiveElementsSimple),
        ...Object.values(shinsalSimple),
        ...Object.values(northNodeSimple),
        ...Object.values(saturnSimple),
      ];

      for (const item of allData) {
        expect(typeof item.emoji).toBe("string");
        expect(item.emoji.length).toBeGreaterThan(0);
      }
    });
  });
});

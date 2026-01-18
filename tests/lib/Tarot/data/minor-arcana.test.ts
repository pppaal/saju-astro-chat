/**
 * Minor Arcana Cards Data Tests
 * Tests for Tarot minor arcana card data validation (all four suits)
 */

import { describe, it, expect } from "vitest";
import { wandsCards } from "@/lib/Tarot/data/suit-wands";
import { cupsCards } from "@/lib/Tarot/data/suit-cups";
import { swordsCards } from "@/lib/Tarot/data/suit-swords";
import { pentaclesCards } from "@/lib/Tarot/data/suit-pentacles";

describe("Minor Arcana Cards", () => {
  const allMinorCards = [...wandsCards, ...cupsCards, ...swordsCards, ...pentaclesCards];

  describe("Collection Structure", () => {
    it("has 56 minor arcana cards total (14 per suit)", () => {
      expect(allMinorCards).toHaveLength(56);
    });

    it("each suit has 14 cards", () => {
      expect(wandsCards).toHaveLength(14);
      expect(cupsCards).toHaveLength(14);
      expect(swordsCards).toHaveLength(14);
      expect(pentaclesCards).toHaveLength(14);
    });

    it("all cards have unique ids", () => {
      const ids = allMinorCards.map((card) => card.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(56);
    });

    it("ids start from 22 (after major arcana)", () => {
      const minId = Math.min(...allMinorCards.map((c) => c.id));
      expect(minId).toBe(22);
    });

    it("ids end at 77", () => {
      const maxId = Math.max(...allMinorCards.map((c) => c.id));
      expect(maxId).toBe(77);
    });
  });

  describe("Wands Suit", () => {
    it("all wands cards have suit 'wands'", () => {
      wandsCards.forEach((card) => {
        expect(card.suit).toBe("wands");
      });
    });

    it("all wands cards have arcana 'minor'", () => {
      wandsCards.forEach((card) => {
        expect(card.arcana).toBe("minor");
      });
    });

    it("starts with Ace of Wands", () => {
      expect(wandsCards[0].name).toBe("Ace of Wands");
    });

    it("ends with King of Wands", () => {
      expect(wandsCards[13].name).toBe("King of Wands");
    });

    it("contains all court cards", () => {
      const names = wandsCards.map((c) => c.name);
      expect(names).toContain("Page of Wands");
      expect(names).toContain("Knight of Wands");
      expect(names).toContain("Queen of Wands");
      expect(names).toContain("King of Wands");
    });

    it("contains numbered cards 2-10", () => {
      const names = wandsCards.map((c) => c.name);
      for (let i = 2; i <= 10; i++) {
        expect(names).toContain(`${numberToWord(i)} of Wands`);
      }
    });
  });

  describe("Cups Suit", () => {
    it("all cups cards have suit 'cups'", () => {
      cupsCards.forEach((card) => {
        expect(card.suit).toBe("cups");
      });
    });

    it("all cups cards have arcana 'minor'", () => {
      cupsCards.forEach((card) => {
        expect(card.arcana).toBe("minor");
      });
    });

    it("starts with Ace of Cups", () => {
      expect(cupsCards[0].name).toBe("Ace of Cups");
    });

    it("ends with King of Cups", () => {
      expect(cupsCards[13].name).toBe("King of Cups");
    });

    it("contains all court cards", () => {
      const names = cupsCards.map((c) => c.name);
      expect(names).toContain("Page of Cups");
      expect(names).toContain("Knight of Cups");
      expect(names).toContain("Queen of Cups");
      expect(names).toContain("King of Cups");
    });
  });

  describe("Swords Suit", () => {
    it("all swords cards have suit 'swords'", () => {
      swordsCards.forEach((card) => {
        expect(card.suit).toBe("swords");
      });
    });

    it("all swords cards have arcana 'minor'", () => {
      swordsCards.forEach((card) => {
        expect(card.arcana).toBe("minor");
      });
    });

    it("starts with Ace of Swords", () => {
      expect(swordsCards[0].name).toBe("Ace of Swords");
    });

    it("ends with King of Swords", () => {
      expect(swordsCards[13].name).toBe("King of Swords");
    });

    it("contains all court cards", () => {
      const names = swordsCards.map((c) => c.name);
      expect(names).toContain("Page of Swords");
      expect(names).toContain("Knight of Swords");
      expect(names).toContain("Queen of Swords");
      expect(names).toContain("King of Swords");
    });
  });

  describe("Pentacles Suit", () => {
    it("all pentacles cards have suit 'pentacles'", () => {
      pentaclesCards.forEach((card) => {
        expect(card.suit).toBe("pentacles");
      });
    });

    it("all pentacles cards have arcana 'minor'", () => {
      pentaclesCards.forEach((card) => {
        expect(card.arcana).toBe("minor");
      });
    });

    it("starts with Ace of Pentacles", () => {
      expect(pentaclesCards[0].name).toBe("Ace of Pentacles");
    });

    it("ends with King of Pentacles", () => {
      expect(pentaclesCards[13].name).toBe("King of Pentacles");
    });

    it("contains all court cards", () => {
      const names = pentaclesCards.map((c) => c.name);
      expect(names).toContain("Page of Pentacles");
      expect(names).toContain("Knight of Pentacles");
      expect(names).toContain("Queen of Pentacles");
      expect(names).toContain("King of Pentacles");
    });
  });

  describe("Card Structure (All Minor)", () => {
    it("every card has required properties", () => {
      allMinorCards.forEach((card) => {
        expect(card).toHaveProperty("id");
        expect(card).toHaveProperty("name");
        expect(card).toHaveProperty("nameKo");
        expect(card).toHaveProperty("arcana");
        expect(card).toHaveProperty("suit");
        expect(card).toHaveProperty("image");
        expect(card).toHaveProperty("upright");
        expect(card).toHaveProperty("reversed");
      });
    });

    it("every card has valid image path", () => {
      allMinorCards.forEach((card) => {
        expect(card.image).toMatch(/^\/cards\/\d+\.jpg$/);
      });
    });

    it("image path matches card id", () => {
      allMinorCards.forEach((card) => {
        expect(card.image).toBe(`/cards/${card.id}.jpg`);
      });
    });
  });

  describe("Upright/Reversed Properties", () => {
    it("every card has upright keywords", () => {
      allMinorCards.forEach((card) => {
        expect(Array.isArray(card.upright.keywords)).toBe(true);
        expect(card.upright.keywords.length).toBeGreaterThan(0);
      });
    });

    it("every card has Korean keywords", () => {
      allMinorCards.forEach((card) => {
        expect(Array.isArray(card.upright.keywordsKo)).toBe(true);
        expect(card.upright.keywordsKo.length).toBeGreaterThan(0);
      });
    });

    it("every card has meaning text", () => {
      allMinorCards.forEach((card) => {
        expect(typeof card.upright.meaning).toBe("string");
        expect(card.upright.meaning.length).toBeGreaterThan(50);
        expect(typeof card.reversed.meaning).toBe("string");
        expect(card.reversed.meaning.length).toBeGreaterThan(50);
      });
    });

    it("every card has Korean meaning text", () => {
      allMinorCards.forEach((card) => {
        expect(typeof card.upright.meaningKo).toBe("string");
        expect(card.upright.meaningKo.length).toBeGreaterThan(30);
        expect(typeof card.reversed.meaningKo).toBe("string");
        expect(card.reversed.meaningKo.length).toBeGreaterThan(30);
      });
    });

    it("every card has advice", () => {
      allMinorCards.forEach((card) => {
        expect(typeof card.upright.advice).toBe("string");
        expect(card.upright.advice.length).toBeGreaterThan(5);
        expect(typeof card.reversed.advice).toBe("string");
        expect(card.reversed.advice.length).toBeGreaterThan(5);
      });
    });

    it("upright and reversed meanings are different", () => {
      allMinorCards.forEach((card) => {
        expect(card.upright.meaning).not.toBe(card.reversed.meaning);
      });
    });
  });

  describe("Korean Translations", () => {
    it("all cards have Korean names", () => {
      allMinorCards.forEach((card) => {
        expect(card.nameKo.length).toBeGreaterThan(0);
      });
    });

    it("Korean names contain suit names", () => {
      wandsCards.forEach((card) => {
        expect(card.nameKo).toContain("완드");
      });
      cupsCards.forEach((card) => {
        expect(card.nameKo).toContain("컵");
      });
      swordsCards.forEach((card) => {
        expect(card.nameKo).toContain("소드");
      });
      pentaclesCards.forEach((card) => {
        expect(card.nameKo).toContain("펜타클");
      });
    });
  });

  describe("Suit Element Associations", () => {
    it("Wands cards relate to fire/passion themes", () => {
      const aceWands = wandsCards[0];
      const hasFireTheme =
        aceWands.upright.keywords.some((k) =>
          ["inspiration", "passion", "energy", "creation"].includes(k.toLowerCase())
        ) ||
        aceWands.upright.meaning.toLowerCase().includes("fire") ||
        aceWands.upright.meaning.toLowerCase().includes("passion");
      expect(hasFireTheme).toBe(true);
    });

    it("Cups cards relate to water/emotion themes", () => {
      const aceCups = cupsCards[0];
      const hasWaterTheme =
        aceCups.upright.keywords.some((k) =>
          ["love", "emotion", "intuition", "feelings"].includes(k.toLowerCase())
        ) ||
        aceCups.upright.meaning.toLowerCase().includes("emotion") ||
        aceCups.upright.meaning.toLowerCase().includes("love");
      expect(hasWaterTheme).toBe(true);
    });

    it("Swords cards relate to air/intellect themes", () => {
      const aceSwords = swordsCards[0];
      const hasAirTheme =
        aceSwords.upright.keywords.some((k) =>
          ["clarity", "truth", "intellect", "thought", "mental"].includes(k.toLowerCase())
        ) ||
        aceSwords.upright.meaning.toLowerCase().includes("truth") ||
        aceSwords.upright.meaning.toLowerCase().includes("clarity");
      expect(hasAirTheme).toBe(true);
    });

    it("Pentacles cards relate to earth/material themes", () => {
      const acePentacles = pentaclesCards[0];
      const hasEarthTheme =
        acePentacles.upright.keywords.some((k) =>
          ["prosperity", "abundance", "material", "wealth", "opportunity"].includes(k.toLowerCase())
        ) ||
        acePentacles.upright.meaning.toLowerCase().includes("material") ||
        acePentacles.upright.meaning.toLowerCase().includes("abundance");
      expect(hasEarthTheme).toBe(true);
    });
  });
});

// Helper function to convert number to word for card names
function numberToWord(num: number): string {
  const words: Record<number, string> = {
    2: "Two",
    3: "Three",
    4: "Four",
    5: "Five",
    6: "Six",
    7: "Seven",
    8: "Eight",
    9: "Nine",
    10: "Ten",
  };
  return words[num] || String(num);
}

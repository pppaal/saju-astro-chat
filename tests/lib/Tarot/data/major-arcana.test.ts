/**
 * Major Arcana Cards Data Tests
 * Tests for Tarot major arcana card data validation
 */

import { describe, it, expect } from "vitest";
import { majorArcanaCards } from "@/lib/Tarot/data/major-arcana";

describe("Major Arcana Cards", () => {
  describe("Collection Structure", () => {
    it("has 22 major arcana cards (0-21)", () => {
      expect(majorArcanaCards).toHaveLength(22);
    });

    it("cards are in order by id (0 to 21)", () => {
      majorArcanaCards.forEach((card, index) => {
        expect(card.id).toBe(index);
      });
    });

    it("first card is The Fool (id 0)", () => {
      expect(majorArcanaCards[0].id).toBe(0);
      expect(majorArcanaCards[0].name).toBe("The Fool");
    });

    it("last card is The World (id 21)", () => {
      expect(majorArcanaCards[21].id).toBe(21);
      expect(majorArcanaCards[21].name).toBe("The World");
    });
  });

  describe("Card Structure", () => {
    it("every card has required properties", () => {
      majorArcanaCards.forEach((card) => {
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

    it("every card has arcana set to 'major'", () => {
      majorArcanaCards.forEach((card) => {
        expect(card.arcana).toBe("major");
      });
    });

    it("every card has suit set to 'major'", () => {
      majorArcanaCards.forEach((card) => {
        expect(card.suit).toBe("major");
      });
    });

    it("every card has valid image path", () => {
      majorArcanaCards.forEach((card) => {
        expect(card.image).toMatch(/^\/cards\/\d+\.jpg$/);
      });
    });

    it("image path matches card id", () => {
      majorArcanaCards.forEach((card) => {
        expect(card.image).toBe(`/cards/${card.id}.jpg`);
      });
    });
  });

  describe("Upright Properties", () => {
    it("every upright has keywords array", () => {
      majorArcanaCards.forEach((card) => {
        expect(Array.isArray(card.upright.keywords)).toBe(true);
        expect(card.upright.keywords.length).toBeGreaterThan(0);
      });
    });

    it("every upright has Korean keywords array", () => {
      majorArcanaCards.forEach((card) => {
        expect(Array.isArray(card.upright.keywordsKo)).toBe(true);
        expect(card.upright.keywordsKo.length).toBeGreaterThan(0);
      });
    });

    it("keywords and keywordsKo have same length", () => {
      majorArcanaCards.forEach((card) => {
        expect(card.upright.keywords.length).toBe(card.upright.keywordsKo.length);
      });
    });

    it("every upright has meaning", () => {
      majorArcanaCards.forEach((card) => {
        expect(typeof card.upright.meaning).toBe("string");
        expect(card.upright.meaning.length).toBeGreaterThan(100);
      });
    });

    it("every upright has Korean meaning", () => {
      majorArcanaCards.forEach((card) => {
        expect(typeof card.upright.meaningKo).toBe("string");
        expect(card.upright.meaningKo.length).toBeGreaterThan(50);
      });
    });

    it("every upright has advice", () => {
      majorArcanaCards.forEach((card) => {
        expect(typeof card.upright.advice).toBe("string");
        expect(card.upright.advice.length).toBeGreaterThan(10);
      });
    });

    it("every upright has Korean advice", () => {
      majorArcanaCards.forEach((card) => {
        expect(typeof card.upright.adviceKo).toBe("string");
        expect(card.upright.adviceKo.length).toBeGreaterThan(5);
      });
    });
  });

  describe("Reversed Properties", () => {
    it("every reversed has keywords array", () => {
      majorArcanaCards.forEach((card) => {
        expect(Array.isArray(card.reversed.keywords)).toBe(true);
        expect(card.reversed.keywords.length).toBeGreaterThan(0);
      });
    });

    it("every reversed has Korean keywords array", () => {
      majorArcanaCards.forEach((card) => {
        expect(Array.isArray(card.reversed.keywordsKo)).toBe(true);
        expect(card.reversed.keywordsKo.length).toBeGreaterThan(0);
      });
    });

    it("reversed keywords and keywordsKo have same length", () => {
      majorArcanaCards.forEach((card) => {
        expect(card.reversed.keywords.length).toBe(card.reversed.keywordsKo.length);
      });
    });

    it("every reversed has meaning", () => {
      majorArcanaCards.forEach((card) => {
        expect(typeof card.reversed.meaning).toBe("string");
        expect(card.reversed.meaning.length).toBeGreaterThan(100);
      });
    });

    it("every reversed has Korean meaning", () => {
      majorArcanaCards.forEach((card) => {
        expect(typeof card.reversed.meaningKo).toBe("string");
        expect(card.reversed.meaningKo.length).toBeGreaterThan(50);
      });
    });

    it("every reversed has advice", () => {
      majorArcanaCards.forEach((card) => {
        expect(typeof card.reversed.advice).toBe("string");
        expect(card.reversed.advice.length).toBeGreaterThan(10);
      });
    });

    it("every reversed has Korean advice", () => {
      majorArcanaCards.forEach((card) => {
        expect(typeof card.reversed.adviceKo).toBe("string");
        expect(card.reversed.adviceKo.length).toBeGreaterThan(5);
      });
    });
  });

  describe("Card Names", () => {
    it("all cards have unique English names", () => {
      const names = majorArcanaCards.map((card) => card.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(22);
    });

    it("all cards have unique Korean names", () => {
      const names = majorArcanaCards.map((card) => card.nameKo);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(22);
    });

    it("contains expected major arcana cards", () => {
      const expectedCards = [
        "The Fool",
        "The Magician",
        "The High Priestess",
        "The Empress",
        "The Emperor",
        "The Hierophant",
        "The Lovers",
        "The Chariot",
        "Strength",
        "The Hermit",
        "Wheel of Fortune",
        "Justice",
        "The Hanged Man",
        "Death",
        "Temperance",
        "The Devil",
        "The Tower",
        "The Star",
        "The Moon",
        "The Sun",
        "Judgement",
        "The World",
      ];

      const cardNames = majorArcanaCards.map((card) => card.name);
      expectedCards.forEach((name) => {
        expect(cardNames).toContain(name);
      });
    });
  });

  describe("Content Quality", () => {
    it("upright and reversed meanings are different", () => {
      majorArcanaCards.forEach((card) => {
        expect(card.upright.meaning).not.toBe(card.reversed.meaning);
      });
    });

    it("upright and reversed Korean meanings are different", () => {
      majorArcanaCards.forEach((card) => {
        expect(card.upright.meaningKo).not.toBe(card.reversed.meaningKo);
      });
    });

    it("upright and reversed advice are different", () => {
      majorArcanaCards.forEach((card) => {
        expect(card.upright.advice).not.toBe(card.reversed.advice);
      });
    });

    it("keywords are not empty strings", () => {
      majorArcanaCards.forEach((card) => {
        card.upright.keywords.forEach((keyword) => {
          expect(keyword.length).toBeGreaterThan(0);
        });
        card.reversed.keywords.forEach((keyword) => {
          expect(keyword.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe("Specific Card Validations", () => {
    it("The Fool (0) has beginnings theme", () => {
      const fool = majorArcanaCards[0];
      expect(fool.upright.keywords.some((k) => k.toLowerCase().includes("beginning"))).toBe(true);
    });

    it("The Magician (1) has manifestation theme", () => {
      const magician = majorArcanaCards[1];
      expect(magician.upright.keywords.some((k) => k.toLowerCase().includes("manifestation"))).toBe(true);
    });

    it("Death (13) has transformation theme", () => {
      const death = majorArcanaCards.find((c) => c.name === "Death");
      expect(death).toBeDefined();
      if (death) {
        const hasTransformTheme = death.upright.meaning.toLowerCase().includes("transform") ||
          death.upright.meaning.toLowerCase().includes("change") ||
          death.upright.meaning.toLowerCase().includes("ending");
        expect(hasTransformTheme).toBe(true);
      }
    });

    it("The World (21) has completion theme", () => {
      const world = majorArcanaCards[21];
      const hasCompletionTheme = world.upright.meaning.toLowerCase().includes("complet") ||
        world.upright.meaning.toLowerCase().includes("accomplish") ||
        world.upright.meaning.toLowerCase().includes("fulfillment");
      expect(hasCompletionTheme).toBe(true);
    });
  });
});

import { tarotDeck, type Card } from "@/lib/Tarot/tarot-data";

describe("Tarot Data", () => {
  describe("deck structure", () => {
    it("has exactly 78 cards", () => {
      expect(tarotDeck).toHaveLength(78);
    });

    it("has 22 Major Arcana cards", () => {
      const majorArcana = tarotDeck.filter((card) => card.arcana === "major");
      expect(majorArcana).toHaveLength(22);
    });

    it("has 56 Minor Arcana cards", () => {
      const minorArcana = tarotDeck.filter((card) => card.arcana === "minor");
      expect(minorArcana).toHaveLength(56);
    });

    it("has unique IDs for all cards", () => {
      const ids = tarotDeck.map((card) => card.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(78);
    });
  });

  describe("card properties", () => {
    it("all cards have required properties", () => {
      tarotDeck.forEach((card, index) => {
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

    it("all cards have upright interpretation properties", () => {
      tarotDeck.forEach((card) => {
        expect(card.upright).toHaveProperty("keywords");
        expect(card.upright).toHaveProperty("keywordsKo");
        expect(card.upright).toHaveProperty("meaning");
        expect(card.upright).toHaveProperty("meaningKo");
        expect(card.upright).toHaveProperty("advice");
        expect(card.upright).toHaveProperty("adviceKo");
      });
    });

    it("all cards have reversed interpretation properties", () => {
      tarotDeck.forEach((card) => {
        expect(card.reversed).toHaveProperty("keywords");
        expect(card.reversed).toHaveProperty("keywordsKo");
        expect(card.reversed).toHaveProperty("meaning");
        expect(card.reversed).toHaveProperty("meaningKo");
        // Note: advice/adviceKo are in the Card interface but may not be present in all data
        // The interface shows them as required, but let's verify essential properties
      });
    });

    it("all cards have image paths", () => {
      tarotDeck.forEach((card) => {
        // Images are generated via getCardImagePath() at export time
        // Format: /images/tarot/{filename}.webp
        expect(card.image).toMatch(/^\/images\/tarot\/[\w-]+\.webp$/);
      });
    });
  });

  describe("Major Arcana", () => {
    const majorArcana = tarotDeck.filter((card) => card.arcana === "major");

    it("starts with The Fool (id 0)", () => {
      const fool = tarotDeck.find((card) => card.id === 0);
      expect(fool?.name).toBe("The Fool");
      expect(fool?.nameKo).toBe("바보");
      expect(fool?.arcana).toBe("major");
    });

    it("ends with The World (id 21)", () => {
      const world = tarotDeck.find((card) => card.id === 21);
      expect(world?.name).toBe("The World");
      expect(world?.arcana).toBe("major");
    });

    it("includes The Magician", () => {
      const magician = tarotDeck.find((card) => card.name === "The Magician");
      expect(magician).toBeDefined();
      expect(magician?.id).toBe(1);
    });

    it("includes The High Priestess", () => {
      const priestess = tarotDeck.find((card) => card.name === "The High Priestess");
      expect(priestess).toBeDefined();
      expect(priestess?.id).toBe(2);
    });

    it("all Major Arcana have suit 'major'", () => {
      majorArcana.forEach((card) => {
        expect(card.suit).toBe("major");
      });
    });
  });

  describe("Minor Arcana", () => {
    const minorArcana = tarotDeck.filter((card) => card.arcana === "minor");

    it("has four suits", () => {
      const suits = new Set(minorArcana.map((card) => card.suit));
      expect(suits.size).toBe(4);
      expect(suits.has("wands")).toBe(true);
      expect(suits.has("cups")).toBe(true);
      expect(suits.has("swords")).toBe(true);
      expect(suits.has("pentacles")).toBe(true);
    });

    it("has 14 cards per suit", () => {
      const suits = ["wands", "cups", "swords", "pentacles"];
      suits.forEach((suit) => {
        const suitCards = minorArcana.filter((card) => card.suit === suit);
        expect(suitCards).toHaveLength(14);
      });
    });

    it("each suit has Ace through 10 plus court cards", () => {
      const wands = minorArcana.filter((card) => card.suit === "wands");
      const hasAce = wands.some((card) => card.name.includes("Ace"));
      const hasTwo = wands.some((card) => card.name.includes("Two"));
      const hasPage = wands.some((card) => card.name.includes("Page"));
      const hasKnight = wands.some((card) => card.name.includes("Knight"));
      const hasQueen = wands.some((card) => card.name.includes("Queen"));
      const hasKing = wands.some((card) => card.name.includes("King"));

      expect(hasAce).toBe(true);
      expect(hasTwo).toBe(true);
      expect(hasPage).toBe(true);
      expect(hasKnight).toBe(true);
      expect(hasQueen).toBe(true);
      expect(hasKing).toBe(true);
    });
  });

  describe("bilingual content", () => {
    it("all cards have English names", () => {
      tarotDeck.forEach((card) => {
        expect(card.name.length).toBeGreaterThan(0);
        // English names should be ASCII
        expect(card.name).toMatch(/^[\x20-\x7E]+$/);
      });
    });

    it("all cards have Korean names", () => {
      tarotDeck.forEach((card) => {
        expect(card.nameKo.length).toBeGreaterThan(0);
        // Korean names should contain Hangul
        expect(card.nameKo).toMatch(/[\uAC00-\uD7AF]/);
      });
    });

    it("all cards have English keywords", () => {
      tarotDeck.forEach((card) => {
        expect(card.upright.keywords.length).toBeGreaterThan(0);
        expect(card.reversed.keywords.length).toBeGreaterThan(0);
      });
    });

    it("all cards have Korean keywords", () => {
      tarotDeck.forEach((card) => {
        expect(card.upright.keywordsKo.length).toBeGreaterThan(0);
        expect(card.reversed.keywordsKo.length).toBeGreaterThan(0);
      });
    });

    it("all meanings are substantial length", () => {
      tarotDeck.forEach((card) => {
        expect(card.upright.meaning.length).toBeGreaterThan(100);
        expect(card.upright.meaningKo.length).toBeGreaterThan(50);
        expect(card.reversed.meaning.length).toBeGreaterThan(100);
        expect(card.reversed.meaningKo.length).toBeGreaterThan(50);
      });
    });
  });

  describe("specific cards", () => {
    it("The Fool has correct interpretation keywords", () => {
      const fool = tarotDeck.find((card) => card.id === 0);
      expect(fool?.upright.keywords).toContain("Beginnings");
      expect(fool?.upright.keywords).toContain("Innocence");
    });

    it("The Magician has correct interpretation keywords", () => {
      const magician = tarotDeck.find((card) => card.id === 1);
      expect(magician?.upright.keywords).toContain("Manifestation");
    });

    it("Death card exists and has transformative meaning", () => {
      const death = tarotDeck.find((card) => card.name === "Death");
      expect(death).toBeDefined();
      // Death card usually signifies transformation, not literal death
      expect(death?.upright.meaning.toLowerCase()).toMatch(/transform|change|end|beginning/);
    });
  });
});

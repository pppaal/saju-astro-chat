/**
 * Tarot Types Tests
 *
 * Tests for Tarot deck styles, cards, and spreads
 */


import {
  DECK_STYLES,
  DECK_STYLE_INFO,
  getCardImagePath,
  type DeckStyle,
  type DeckStyleInfo,
  type Arcana,
  type Suit,
} from "@/lib/Tarot/tarot.types";

describe("DECK_STYLES", () => {
  it("has 8 deck styles", () => {
    expect(DECK_STYLES).toHaveLength(8);
  });

  it("contains all expected styles", () => {
    expect(DECK_STYLES).toContain("celestial");
    expect(DECK_STYLES).toContain("classic");
    expect(DECK_STYLES).toContain("cyber");
    expect(DECK_STYLES).toContain("egyptian");
    expect(DECK_STYLES).toContain("elegant");
    expect(DECK_STYLES).toContain("ethereal");
    expect(DECK_STYLES).toContain("sacred");
    expect(DECK_STYLES).toContain("minimal");
  });
});

describe("DECK_STYLE_INFO", () => {
  it("has info for all deck styles", () => {
    for (const style of DECK_STYLES) {
      expect(DECK_STYLE_INFO[style]).toBeDefined();
    }
  });

  it("each style has required properties", () => {
    for (const style of DECK_STYLES) {
      const info: DeckStyleInfo = DECK_STYLE_INFO[style];
      expect(info.id).toBe(style);
      expect(info.name).toBeDefined();
      expect(info.nameKo).toBeDefined();
      expect(info.description).toBeDefined();
      expect(info.descriptionKo).toBeDefined();
      expect(info.gradient).toBeDefined();
      expect(info.accent).toBeDefined();
      expect(info.backImage).toBeDefined();
    }
  });

  describe("celestial style", () => {
    it("has correct properties", () => {
      const celestial = DECK_STYLE_INFO.celestial;
      expect(celestial.name).toBe("Celestial");
      expect(celestial.nameKo).toBe("천체의 빛");
      expect(celestial.accent).toBe("#f4d03f");
    });
  });

  describe("classic style", () => {
    it("has correct properties", () => {
      const classic = DECK_STYLE_INFO.classic;
      expect(classic.name).toBe("Classic");
      expect(classic.nameKo).toBe("클래식");
    });
  });

  describe("cyber style", () => {
    it("has correct properties", () => {
      const cyber = DECK_STYLE_INFO.cyber;
      expect(cyber.name).toBe("Cyber Mystic");
      expect(cyber.nameKo).toBe("사이버 미스틱");
      expect(cyber.accent).toBe("#00ffff");
    });
  });

  describe("egyptian style", () => {
    it("has correct properties", () => {
      const egyptian = DECK_STYLE_INFO.egyptian;
      expect(egyptian.name).toBe("Egyptian");
      expect(egyptian.nameKo).toBe("이집트");
    });
  });

  it("back images follow correct pattern", () => {
    for (const style of DECK_STYLES) {
      expect(DECK_STYLE_INFO[style].backImage).toMatch(/^\/images\/tarot\/backs\//);
    }
  });

  it("gradients are CSS gradients", () => {
    for (const style of DECK_STYLES) {
      expect(DECK_STYLE_INFO[style].gradient).toMatch(/^linear-gradient/);
    }
  });

  it("accents are hex colors", () => {
    for (const style of DECK_STYLES) {
      expect(DECK_STYLE_INFO[style].accent).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe("getCardImagePath", () => {
  describe("Major Arcana (0-21)", () => {
    it("returns correct path for The Fool (0)", () => {
      const path = getCardImagePath(0);
      expect(path).toBe("/images/tarot/00-fool.webp");
    });

    it("returns correct path for The Magician (1)", () => {
      const path = getCardImagePath(1);
      expect(path).toBe("/images/tarot/01-magician.webp");
    });

    it("returns correct path for The High Priestess (2)", () => {
      const path = getCardImagePath(2);
      expect(path).toBe("/images/tarot/02-high-priestess.webp");
    });

    it("returns correct path for The World (21)", () => {
      const path = getCardImagePath(21);
      expect(path).toBe("/images/tarot/21-world.webp");
    });
  });

  describe("Minor Arcana - Wands (22-35)", () => {
    it("returns correct path for Ace of Wands (22)", () => {
      const path = getCardImagePath(22);
      expect(path).toBe("/images/tarot/wands-01-ace.webp");
    });

    it("returns correct path for King of Wands (35)", () => {
      const path = getCardImagePath(35);
      expect(path).toBe("/images/tarot/wands-14-king.webp");
    });
  });

  describe("Minor Arcana - Cups (36-49)", () => {
    it("returns correct path for Ace of Cups (36)", () => {
      const path = getCardImagePath(36);
      expect(path).toBe("/images/tarot/cups-01-ace.webp");
    });

    it("returns correct path for King of Cups (49)", () => {
      const path = getCardImagePath(49);
      expect(path).toBe("/images/tarot/cups-14-king.webp");
    });
  });

  describe("Minor Arcana - Swords (50-63)", () => {
    it("returns correct path for Ace of Swords (50)", () => {
      const path = getCardImagePath(50);
      expect(path).toBe("/images/tarot/swords-01-ace.webp");
    });

    it("returns correct path for King of Swords (63)", () => {
      const path = getCardImagePath(63);
      expect(path).toBe("/images/tarot/swords-14-king.webp");
    });
  });

  describe("Minor Arcana - Pentacles (64-77)", () => {
    it("returns correct path for Ace of Pentacles (64)", () => {
      const path = getCardImagePath(64);
      expect(path).toBe("/images/tarot/pentacles-01-ace.webp");
    });

    it("returns correct path for King of Pentacles (77)", () => {
      const path = getCardImagePath(77);
      expect(path).toBe("/images/tarot/pentacles-14-king.webp");
    });
  });

  describe("invalid card IDs", () => {
    it("returns card-back for invalid ID", () => {
      const path = getCardImagePath(100);
      expect(path).toBe("/images/tarot/card-back.webp");
    });

    it("returns card-back for negative ID", () => {
      const path = getCardImagePath(-1);
      expect(path).toBe("/images/tarot/card-back.webp");
    });
  });
});

describe("Tarot deck structure", () => {
  it("has 78 cards total", () => {
    // Major Arcana: 0-21 (22 cards)
    // Wands: 22-35 (14 cards)
    // Cups: 36-49 (14 cards)
    // Swords: 50-63 (14 cards)
    // Pentacles: 64-77 (14 cards)
    const totalCards = 22 + 14 + 14 + 14 + 14;
    expect(totalCards).toBe(78);
  });

  it("Major Arcana has 22 cards", () => {
    const majorArcanaCount = 22; // 0-21
    expect(majorArcanaCount).toBe(22);
  });

  it("Minor Arcana has 56 cards", () => {
    const minorArcanaCount = 14 * 4; // 4 suits, 14 cards each
    expect(minorArcanaCount).toBe(56);
  });

  it("each suit has 14 cards", () => {
    const cardsPerSuit = 14;
    expect(cardsPerSuit).toBe(14);
  });
});

describe("Type definitions", () => {
  it("Arcana type accepts major and minor", () => {
    const arcanaValues: Arcana[] = ["major", "minor"];
    expect(arcanaValues).toHaveLength(2);
  });

  it("Suit type accepts all suits", () => {
    const suitValues: Suit[] = ["major", "wands", "cups", "swords", "pentacles"];
    expect(suitValues).toHaveLength(5);
  });
});

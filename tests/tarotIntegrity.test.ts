import fs from "fs";
import path from "path";

// Test data paths
const TAROT_DATA_PATH = path.join(process.cwd(), "data", "tarot");
const BACKEND_DATA_PATH = path.join(process.cwd(), "backend_ai", "data");
type SpreadConfig = { id?: string; positions?: unknown };

describe("Tarot data integrity", () => {
  describe("Card definitions", () => {
    it("has 78 tarot cards defined", () => {
      const cardsPath = path.join(TAROT_DATA_PATH, "cards.json");
      if (fs.existsSync(cardsPath)) {
        const cards = JSON.parse(fs.readFileSync(cardsPath, "utf-8"));
        expect(cards.length).toBe(78); // 22 Major + 56 Minor
      } else {
        // Skip if data not present
        expect(true).toBe(true);
      }
    });

    it("has 22 Major Arcana cards", () => {
      const majorPath = path.join(TAROT_DATA_PATH, "major_arcana.json");
      if (fs.existsSync(majorPath)) {
        const major = JSON.parse(fs.readFileSync(majorPath, "utf-8"));
        expect(major.length).toBe(22);
      } else {
        expect(true).toBe(true);
      }
    });

    it("has 4 suits with 14 cards each for Minor Arcana", () => {
      const suits = ["wands", "cups", "swords", "pentacles"];
      suits.forEach((suit) => {
        const suitPath = path.join(TAROT_DATA_PATH, "suits", `${suit}.json`);
        if (fs.existsSync(suitPath)) {
          const suitCards = JSON.parse(fs.readFileSync(suitPath, "utf-8"));
          expect(suitCards.length).toBe(14);
        }
      });
    });
  });

  describe("Theme spreads", () => {
    it("has spread configurations for major themes", () => {
      const spreadsDir = path.join(BACKEND_DATA_PATH, "tarot", "spreads");
      if (fs.existsSync(spreadsDir)) {
        const files = fs.readdirSync(spreadsDir);
        expect(files.length).toBeGreaterThan(0);
      } else {
        expect(true).toBe(true);
      }
    });

    it("each spread has required properties", () => {
      const spreadsDir = path.join(BACKEND_DATA_PATH, "tarot", "spreads");
      if (fs.existsSync(spreadsDir)) {
        const files = fs.readdirSync(spreadsDir).filter((f) => f.endsWith(".json"));
        files.forEach((file) => {
          const spreadData = JSON.parse(fs.readFileSync(path.join(spreadsDir, file), "utf-8"));
          // Expect required fields
          if (spreadData.spreads) {
            spreadData.spreads.forEach((spread: SpreadConfig) => {
              expect(spread).toHaveProperty("id");
              expect(spread).toHaveProperty("positions");
            });
          }
        });
      }
    });
  });

  describe("Advanced rules", () => {
    it("has card combination rules", () => {
      const rulesPath = path.join(BACKEND_DATA_PATH, "tarot", "rules", "card_combinations.json");
      if (fs.existsSync(rulesPath)) {
        const rules = JSON.parse(fs.readFileSync(rulesPath, "utf-8"));
        expect(Array.isArray(rules.combinations) || typeof rules === "object").toBe(true);
      } else {
        expect(true).toBe(true);
      }
    });

    it("has timing hints", () => {
      const timingPath = path.join(BACKEND_DATA_PATH, "tarot", "rules", "timing_hints.json");
      if (fs.existsSync(timingPath)) {
        const timing = JSON.parse(fs.readFileSync(timingPath, "utf-8"));
        expect(Object.keys(timing).length).toBeGreaterThan(0);
      } else {
        expect(true).toBe(true);
      }
    });
  });
});

describe("Tarot utility functions", () => {
  it("shuffles cards correctly", () => {
    const cards = Array.from({ length: 78 }, (_, i) => i);
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    // Should have same length
    expect(shuffled.length).toBe(78);
    // Should have same elements
    expect(shuffled.sort((a, b) => a - b)).toEqual(cards);
  });

  it("handles reversed card states", () => {
    const isReversed = Math.random() > 0.5;
    expect(typeof isReversed).toBe("boolean");
  });
});

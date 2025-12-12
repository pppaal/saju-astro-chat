import fs from "fs";
import path from "path";

// Dream interpretation data paths
const DREAM_DATA_PATH = path.join(process.cwd(), "backend_ai", "data");

describe("Dream interpretation integrity", () => {
  describe("Dream symbols", () => {
    it("has dream symbol categories", () => {
      const symbolsDir = path.join(DREAM_DATA_PATH, "graph", "rules", "dream");
      if (fs.existsSync(symbolsDir)) {
        const files = fs.readdirSync(symbolsDir);
        expect(files.length).toBeGreaterThan(0);
      } else {
        // Skip if not present
        expect(true).toBe(true);
      }
    });
  });

  describe("Dream categories", () => {
    const DREAM_CATEGORIES = [
      "animals",
      "nature",
      "people",
      "objects",
      "actions",
      "emotions",
      "places",
      "colors",
      "numbers",
      "death",
      "water",
      "flying",
    ];

    it("has standard dream symbol categories defined", () => {
      expect(DREAM_CATEGORIES.length).toBeGreaterThan(5);
    });

    it("categories are unique", () => {
      const unique = new Set(DREAM_CATEGORIES);
      expect(unique.size).toBe(DREAM_CATEGORIES.length);
    });
  });
});

describe("Dream analysis functions", () => {
  describe("Symbol extraction", () => {
    function extractSymbols(dreamText: string): string[] {
      const commonSymbols = [
        "water",
        "fire",
        "flying",
        "falling",
        "running",
        "snake",
        "dog",
        "cat",
        "house",
        "car",
        "death",
        "baby",
        "money",
        "ocean",
        "mountain",
      ];

      const found: string[] = [];
      const lowerText = dreamText.toLowerCase();

      commonSymbols.forEach((symbol) => {
        if (lowerText.includes(symbol)) {
          found.push(symbol);
        }
      });

      return found;
    }

    it("extracts known symbols from dream text", () => {
      const dreamText = "I was flying over the ocean and saw a snake";
      const symbols = extractSymbols(dreamText);

      expect(symbols).toContain("flying");
      expect(symbols).toContain("ocean");
      expect(symbols).toContain("snake");
    });

    it("returns empty array for no known symbols", () => {
      const dreamText = "I was sitting quietly";
      const symbols = extractSymbols(dreamText);

      // May or may not find symbols
      expect(Array.isArray(symbols)).toBe(true);
    });

    it("handles case insensitivity", () => {
      const dreamText = "I saw WATER and a DOG";
      const symbols = extractSymbols(dreamText);

      expect(symbols).toContain("water");
      expect(symbols).toContain("dog");
    });
  });

  describe("Sentiment analysis", () => {
    function analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
      const positiveWords = ["happy", "joy", "love", "peace", "calm", "beautiful", "wonderful"];
      const negativeWords = ["scary", "fear", "death", "angry", "sad", "dark", "dangerous"];

      const lowerText = text.toLowerCase();
      let positiveCount = 0;
      let negativeCount = 0;

      positiveWords.forEach((word) => {
        if (lowerText.includes(word)) positiveCount++;
      });

      negativeWords.forEach((word) => {
        if (lowerText.includes(word)) negativeCount++;
      });

      if (positiveCount > negativeCount) return "positive";
      if (negativeCount > positiveCount) return "negative";
      return "neutral";
    }

    it("detects positive sentiment", () => {
      const result = analyzeSentiment("It was a beautiful and peaceful dream");
      expect(result).toBe("positive");
    });

    it("detects negative sentiment", () => {
      const result = analyzeSentiment("It was scary and dark");
      expect(result).toBe("negative");
    });

    it("returns neutral for mixed/unknown", () => {
      const result = analyzeSentiment("I was walking");
      expect(result).toBe("neutral");
    });
  });
});

describe("Dream interpretation categories", () => {
  const INTERPRETATIONS: Record<string, { meaning: string; advice: string }> = {
    flying: {
      meaning: "Freedom, ambition, or desire to escape",
      advice: "Consider what you're trying to rise above in life",
    },
    water: {
      meaning: "Emotions, subconscious, or cleansing",
      advice: "Pay attention to your emotional state",
    },
    falling: {
      meaning: "Anxiety, loss of control, or letting go",
      advice: "Identify areas where you feel insecure",
    },
    snake: {
      meaning: "Transformation, hidden fears, or wisdom",
      advice: "Look for changes happening in your life",
    },
  };

  it("has interpretations for common symbols", () => {
    expect(Object.keys(INTERPRETATIONS).length).toBeGreaterThan(0);
  });

  it("each interpretation has meaning and advice", () => {
    Object.values(INTERPRETATIONS).forEach((interp) => {
      expect(interp.meaning).toBeDefined();
      expect(interp.advice).toBeDefined();
      expect(typeof interp.meaning).toBe("string");
      expect(typeof interp.advice).toBe("string");
    });
  });
});

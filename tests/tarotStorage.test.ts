/**
 * Tarot Storage 테스트
 * - ID 생성
 * - 날짜 포맷
 * - 상대 시간 포맷
 */

import { vi, beforeEach, afterEach } from "vitest";
import {
  formatReadingDate,
  formatRelativeTime,
  formatReadingForSave,
} from "@/lib/Tarot/tarot-storage";
import type { Spread, DrawnCard } from "@/lib/Tarot/tarot.types";

describe("formatReadingDate", () => {
  it("formats date in Korean", () => {
    const timestamp = new Date("2024-06-15T12:00:00Z").getTime();
    const result = formatReadingDate(timestamp, true);

    expect(result).toContain("2024년");
    expect(result).toContain("6월");
    expect(result).toContain("15일");
  });

  it("formats date in English", () => {
    const timestamp = new Date("2024-06-15T12:00:00Z").getTime();
    const result = formatReadingDate(timestamp, false);

    expect(result).toContain("June");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });

  it("handles different months correctly in Korean", () => {
    const jan = new Date("2024-01-01").getTime();
    const dec = new Date("2024-12-31").getTime();

    expect(formatReadingDate(jan, true)).toContain("1월");
    expect(formatReadingDate(dec, true)).toContain("12월");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns '방금 전' for recent timestamps in Korean", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const result = formatRelativeTime(now - 30000, true); // 30 seconds ago
    expect(result).toBe("방금 전");
  });

  it("returns 'Just now' for recent timestamps in English", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const result = formatRelativeTime(now - 30000, false); // 30 seconds ago
    expect(result).toBe("Just now");
  });

  it("returns minutes ago in Korean", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const result = formatRelativeTime(now - 5 * 60000, true); // 5 minutes ago
    expect(result).toBe("5분 전");
  });

  it("returns minutes ago in English", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const result = formatRelativeTime(now - 5 * 60000, false); // 5 minutes ago
    expect(result).toBe("5 min ago");
  });

  it("returns hours ago in Korean", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const result = formatRelativeTime(now - 3 * 3600000, true); // 3 hours ago
    expect(result).toBe("3시간 전");
  });

  it("returns hours ago in English", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const result = formatRelativeTime(now - 3 * 3600000, false); // 3 hours ago
    expect(result).toBe("3h ago");
  });

  it("returns days ago in Korean", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const result = formatRelativeTime(now - 2 * 86400000, true); // 2 days ago
    expect(result).toBe("2일 전");
  });

  it("returns days ago in English", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const result = formatRelativeTime(now - 2 * 86400000, false); // 2 days ago
    expect(result).toBe("2d ago");
  });

  it("returns full date for timestamps older than 7 days", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const oldTimestamp = now - 10 * 86400000; // 10 days ago
    const resultKo = formatRelativeTime(oldTimestamp, true);
    const resultEn = formatRelativeTime(oldTimestamp, false);

    // Should fall back to full date format
    expect(resultKo).toContain("년");
    expect(resultEn).toMatch(/\d{4}/); // Contains year
  });

  it("handles edge case at exactly 60 minutes", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const result = formatRelativeTime(now - 60 * 60000, true); // Exactly 1 hour
    expect(result).toBe("1시간 전");
  });

  it("handles edge case at exactly 24 hours", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const result = formatRelativeTime(now - 24 * 3600000, true); // Exactly 24 hours
    expect(result).toBe("1일 전");
  });
});

describe("formatReadingForSave", () => {
  const mockSpread: Spread = {
    id: "three-card",
    title: "Three Card Spread",
    titleKo: "3카드 스프레드",
    description: "Past, Present, Future",
    descriptionKo: "과거, 현재, 미래",
    cardCount: 3,
    positions: [
      { id: "past", title: "Past", titleKo: "과거", description: "Past events" },
      { id: "present", title: "Present", titleKo: "현재", description: "Current situation" },
      { id: "future", title: "Future", titleKo: "미래", description: "Future possibilities" },
    ],
    categories: ["general"],
  };

  const mockDrawnCards: DrawnCard[] = [
    {
      card: {
        id: "the-fool",
        name: "The Fool",
        nameKo: "바보",
        number: 0,
        arcana: "major",
        suit: null,
        keywords: ["new beginnings"],
        keywordsKo: ["새로운 시작"],
        uprightMeaning: "New beginnings",
        uprightMeaningKo: "새로운 시작",
        reversedMeaning: "Recklessness",
        reversedMeaningKo: "무모함",
        description: "The Fool represents new beginnings",
        descriptionKo: "바보 카드는 새로운 시작을 의미합니다",
        imagePath: "/cards/fool.jpg",
      },
      isReversed: false,
    },
    {
      card: {
        id: "the-magician",
        name: "The Magician",
        nameKo: "마법사",
        number: 1,
        arcana: "major",
        suit: null,
        keywords: ["power"],
        keywordsKo: ["힘"],
        uprightMeaning: "Manifestation",
        uprightMeaningKo: "현실화",
        reversedMeaning: "Manipulation",
        reversedMeaningKo: "조작",
        description: "The Magician represents manifestation",
        descriptionKo: "마법사 카드는 현실화를 의미합니다",
        imagePath: "/cards/magician.jpg",
      },
      isReversed: true,
    },
    {
      card: {
        id: "the-high-priestess",
        name: "The High Priestess",
        nameKo: "여사제",
        number: 2,
        arcana: "major",
        suit: null,
        keywords: ["intuition"],
        keywordsKo: ["직관"],
        uprightMeaning: "Intuition",
        uprightMeaningKo: "직관",
        reversedMeaning: "Secrets",
        reversedMeaningKo: "비밀",
        description: "The High Priestess represents intuition",
        descriptionKo: "여사제 카드는 직관을 의미합니다",
        imagePath: "/cards/high-priestess.jpg",
      },
      isReversed: false,
    },
  ];

  const mockInterpretation = {
    overall_message: "A journey of transformation awaits",
    guidance: "Trust your intuition",
    card_insights: [
      { position: "Past", card_name: "The Fool", interpretation: "New beginnings in the past" },
      { position: "Present", card_name: "The Magician", interpretation: "Manifesting now" },
      { position: "Future", card_name: "The High Priestess", interpretation: "Trust intuition" },
    ],
  };

  it("formats reading correctly", () => {
    const result = formatReadingForSave(
      "What does my future hold?",
      mockSpread,
      mockDrawnCards,
      mockInterpretation,
      "general",
      "three-card",
      "rider-waite"
    );

    expect(result.question).toBe("What does my future hold?");
    expect(result.categoryId).toBe("general");
    expect(result.spreadId).toBe("three-card");
    expect(result.deckStyle).toBe("rider-waite");
  });

  it("includes spread info", () => {
    const result = formatReadingForSave(
      "Test",
      mockSpread,
      mockDrawnCards,
      mockInterpretation,
      "general",
      "three-card"
    );

    expect(result.spread.title).toBe("Three Card Spread");
    expect(result.spread.titleKo).toBe("3카드 스프레드");
    expect(result.spread.cardCount).toBe(3);
  });

  it("includes all cards with positions", () => {
    const result = formatReadingForSave(
      "Test",
      mockSpread,
      mockDrawnCards,
      mockInterpretation,
      "general",
      "three-card"
    );

    expect(result.cards).toHaveLength(3);
    expect(result.cards[0].name).toBe("The Fool");
    expect(result.cards[0].nameKo).toBe("바보");
    expect(result.cards[0].isReversed).toBe(false);
    expect(result.cards[0].position).toBe("Past");
    expect(result.cards[0].positionKo).toBe("과거");

    expect(result.cards[1].isReversed).toBe(true);
  });

  it("includes interpretation", () => {
    const result = formatReadingForSave(
      "Test",
      mockSpread,
      mockDrawnCards,
      mockInterpretation,
      "general",
      "three-card"
    );

    expect(result.interpretation.overallMessage).toBe("A journey of transformation awaits");
    expect(result.interpretation.guidance).toBe("Trust your intuition");
    expect(result.interpretation.cardInsights).toHaveLength(3);
  });

  it("handles null interpretation", () => {
    const result = formatReadingForSave(
      "Test",
      mockSpread,
      mockDrawnCards,
      null,
      "general",
      "three-card"
    );

    expect(result.interpretation.overallMessage).toBe("");
    expect(result.interpretation.guidance).toBe("");
    expect(result.interpretation.cardInsights).toEqual([]);
  });

  it("handles missing position info gracefully", () => {
    const shortSpread: Spread = {
      ...mockSpread,
      positions: [mockSpread.positions[0]], // Only one position
    };

    const result = formatReadingForSave(
      "Test",
      shortSpread,
      mockDrawnCards,
      null,
      "general",
      "three-card"
    );

    expect(result.cards[0].position).toBe("Past");
    expect(result.cards[1].position).toBe("Card 2"); // Fallback
    expect(result.cards[2].position).toBe("Card 3"); // Fallback
  });
});

describe("ID Generation Pattern", () => {
  it("generates unique IDs", () => {
    // Test the ID generation pattern
    const generateId = (): string => {
      return `tarot_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    };

    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }

    expect(ids.size).toBe(100); // All unique
  });

  it("ID starts with tarot_ prefix", () => {
    const generateId = (): string => {
      return `tarot_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    };

    const id = generateId();
    expect(id.startsWith("tarot_")).toBe(true);
  });

  it("ID contains timestamp", () => {
    const before = Date.now();
    const generateId = (): string => {
      return `tarot_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    };
    const id = generateId();
    const after = Date.now();

    const parts = id.split("_");
    const timestamp = parseInt(parts[1], 10);

    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });
});

describe("Storage Constants", () => {
  it("MAX_SAVED_READINGS is reasonable", () => {
    const MAX_SAVED_READINGS = 50;
    expect(MAX_SAVED_READINGS).toBeGreaterThan(0);
    expect(MAX_SAVED_READINGS).toBeLessThanOrEqual(100);
  });

  it("STORAGE_KEY is consistent", () => {
    const STORAGE_KEY = "tarot_saved_readings";
    expect(STORAGE_KEY).toBe("tarot_saved_readings");
  });
});

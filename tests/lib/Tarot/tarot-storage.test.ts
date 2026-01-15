import { vi, beforeEach } from "vitest";
import {
  formatReadingForSave,
  formatReadingDate,
  formatRelativeTime,
  type SavedTarotReading,
} from "@/lib/Tarot/tarot-storage";
import type { Spread, DrawnCard } from "@/lib/Tarot/tarot.types";

// Note: getSavedReadings, saveReading, deleteReading, getReadingById, getReadingsCount
// use localStorage which is not available in Node.js test environment
// They would need jsdom or similar to test properly

describe("tarot-storage", () => {
  describe("formatReadingForSave", () => {
    const mockSpread: Spread = {
      id: "test-spread",
      title: "Test Spread",
      titleKo: "테스트 스프레드",
      description: "A test spread",
      descriptionKo: "테스트 스프레드입니다",
      cardCount: 3,
      positions: [
        { title: "Past", titleKo: "과거", description: "Past events", descriptionKo: "과거 사건" },
        { title: "Present", titleKo: "현재", description: "Current situation", descriptionKo: "현재 상황" },
        { title: "Future", titleKo: "미래", description: "Future outcome", descriptionKo: "미래 결과" },
      ],
    };

    const mockDrawnCards: DrawnCard[] = [
      {
        card: {
          id: 0,
          name: "The Fool",
          nameKo: "광대",
          arcana: "major",
          suit: null,
          image: "/images/tarot/fool.png",
          upright: {
            keywords: ["new beginnings", "innocence"],
            keywordsKo: ["새로운 시작", "순수함"],
            meaning: "New beginnings",
            meaningKo: "새로운 시작",
          },
          reversed: {
            keywords: ["recklessness", "risk"],
            keywordsKo: ["무모함", "위험"],
            meaning: "Recklessness",
            meaningKo: "무모함",
          },
        },
        isReversed: false,
      },
      {
        card: {
          id: 1,
          name: "The Magician",
          nameKo: "마법사",
          arcana: "major",
          suit: null,
          image: "/images/tarot/magician.png",
          upright: {
            keywords: ["skill", "manifestation"],
            keywordsKo: ["기술", "실현"],
            meaning: "Manifestation",
            meaningKo: "실현",
          },
          reversed: {
            keywords: ["manipulation", "trickery"],
            keywordsKo: ["조작", "속임"],
            meaning: "Manipulation",
            meaningKo: "조작",
          },
        },
        isReversed: true,
      },
      {
        card: {
          id: 2,
          name: "The High Priestess",
          nameKo: "여교황",
          arcana: "major",
          suit: null,
          image: "/images/tarot/high-priestess.png",
          upright: {
            keywords: ["intuition", "mystery"],
            keywordsKo: ["직관", "신비"],
            meaning: "Intuition",
            meaningKo: "직관",
          },
          reversed: {
            keywords: ["secrets", "withdrawal"],
            keywordsKo: ["비밀", "철회"],
            meaning: "Hidden truths",
            meaningKo: "숨겨진 진실",
          },
        },
        isReversed: false,
      },
    ];

    const mockInterpretation = {
      overall_message: "A journey of transformation awaits",
      guidance: "Trust your intuition",
      card_insights: [
        { position: "Past", card_name: "The Fool", interpretation: "You started fresh" },
        { position: "Present", card_name: "The Magician", interpretation: "Beware manipulation" },
        { position: "Future", card_name: "The High Priestess", interpretation: "Trust intuition" },
      ],
    };

    it("formats reading with all data correctly", () => {
      const result = formatReadingForSave(
        "What does my future hold?",
        mockSpread,
        mockDrawnCards,
        mockInterpretation,
        "general-insight",
        "three-card",
        "classic"
      );

      expect(result.question).toBe("What does my future hold?");
      expect(result.categoryId).toBe("general-insight");
      expect(result.spreadId).toBe("three-card");
      expect(result.deckStyle).toBe("classic");
    });

    it("formats spread info correctly", () => {
      const result = formatReadingForSave(
        "Test",
        mockSpread,
        mockDrawnCards,
        mockInterpretation,
        "test",
        "test"
      );

      expect(result.spread.title).toBe("Test Spread");
      expect(result.spread.titleKo).toBe("테스트 스프레드");
      expect(result.spread.cardCount).toBe(3);
    });

    it("formats cards correctly", () => {
      const result = formatReadingForSave(
        "Test",
        mockSpread,
        mockDrawnCards,
        mockInterpretation,
        "test",
        "test"
      );

      expect(result.cards).toHaveLength(3);

      // First card
      expect(result.cards[0].name).toBe("The Fool");
      expect(result.cards[0].nameKo).toBe("광대");
      expect(result.cards[0].isReversed).toBe(false);
      expect(result.cards[0].position).toBe("Past");
      expect(result.cards[0].positionKo).toBe("과거");

      // Second card (reversed)
      expect(result.cards[1].name).toBe("The Magician");
      expect(result.cards[1].isReversed).toBe(true);
      expect(result.cards[1].position).toBe("Present");
    });

    it("formats interpretation correctly", () => {
      const result = formatReadingForSave(
        "Test",
        mockSpread,
        mockDrawnCards,
        mockInterpretation,
        "test",
        "test"
      );

      expect(result.interpretation.overallMessage).toBe("A journey of transformation awaits");
      expect(result.interpretation.guidance).toBe("Trust your intuition");
      expect(result.interpretation.cardInsights).toHaveLength(3);
      expect(result.interpretation.cardInsights[0].position).toBe("Past");
      expect(result.interpretation.cardInsights[0].cardName).toBe("The Fool");
    });

    it("handles null interpretation", () => {
      const result = formatReadingForSave(
        "Test",
        mockSpread,
        mockDrawnCards,
        null,
        "test",
        "test"
      );

      expect(result.interpretation.overallMessage).toBe("");
      expect(result.interpretation.guidance).toBe("");
      expect(result.interpretation.cardInsights).toEqual([]);
    });

    it("handles missing positions gracefully", () => {
      const shortSpread: Spread = {
        ...mockSpread,
        positions: [mockSpread.positions[0]], // Only one position
      };

      const result = formatReadingForSave(
        "Test",
        shortSpread,
        mockDrawnCards,
        mockInterpretation,
        "test",
        "test"
      );

      expect(result.cards[0].position).toBe("Past");
      expect(result.cards[1].position).toBe("Card 2"); // Fallback
      expect(result.cards[2].position).toBe("Card 3"); // Fallback
    });

    it("handles optional deckStyle", () => {
      const result = formatReadingForSave(
        "Test",
        mockSpread,
        mockDrawnCards,
        mockInterpretation,
        "test",
        "test"
        // No deckStyle
      );

      expect(result.deckStyle).toBeUndefined();
    });
  });

  describe("formatReadingDate", () => {
    it("formats date in Korean", () => {
      const timestamp = new Date(2024, 5, 15).getTime(); // June 15, 2024
      const result = formatReadingDate(timestamp, true);
      expect(result).toBe("2024년 6월 15일");
    });

    it("formats date in English", () => {
      const timestamp = new Date(2024, 5, 15).getTime(); // June 15, 2024
      const result = formatReadingDate(timestamp, false);
      expect(result).toContain("June");
      expect(result).toContain("15");
      expect(result).toContain("2024");
    });

    it("handles different months correctly", () => {
      const january = new Date(2024, 0, 1).getTime();
      const december = new Date(2024, 11, 31).getTime();

      expect(formatReadingDate(january, true)).toBe("2024년 1월 1일");
      expect(formatReadingDate(december, true)).toBe("2024년 12월 31일");
    });
  });

  describe("formatRelativeTime", () => {
    it("returns '방금 전' / 'Just now' for less than 1 minute", () => {
      const now = Date.now();
      expect(formatRelativeTime(now, true)).toBe("방금 전");
      expect(formatRelativeTime(now, false)).toBe("Just now");
    });

    it("returns minutes ago for less than 1 hour", () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      expect(formatRelativeTime(fiveMinutesAgo, true)).toBe("5분 전");
      expect(formatRelativeTime(fiveMinutesAgo, false)).toBe("5 min ago");

      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
      expect(formatRelativeTime(thirtyMinutesAgo, true)).toBe("30분 전");
      expect(formatRelativeTime(thirtyMinutesAgo, false)).toBe("30 min ago");
    });

    it("returns hours ago for less than 1 day", () => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      expect(formatRelativeTime(twoHoursAgo, true)).toBe("2시간 전");
      expect(formatRelativeTime(twoHoursAgo, false)).toBe("2h ago");

      const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
      expect(formatRelativeTime(twelveHoursAgo, true)).toBe("12시간 전");
      expect(formatRelativeTime(twelveHoursAgo, false)).toBe("12h ago");
    });

    it("returns days ago for less than 1 week", () => {
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      expect(formatRelativeTime(threeDaysAgo, true)).toBe("3일 전");
      expect(formatRelativeTime(threeDaysAgo, false)).toBe("3d ago");

      const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;
      expect(formatRelativeTime(sixDaysAgo, true)).toBe("6일 전");
      expect(formatRelativeTime(sixDaysAgo, false)).toBe("6d ago");
    });

    it("returns formatted date for 1 week or more", () => {
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const resultKo = formatRelativeTime(twoWeeksAgo, true);
      const resultEn = formatRelativeTime(twoWeeksAgo, false);

      // Should fall back to formatReadingDate
      expect(resultKo).toMatch(/\d{4}년 \d{1,2}월 \d{1,2}일/);
      expect(resultEn).toMatch(/[A-Za-z]+ \d{1,2}, \d{4}/);
    });

    it("handles edge case at 59 minutes", () => {
      const fiftyNineMinutesAgo = Date.now() - 59 * 60 * 1000;
      expect(formatRelativeTime(fiftyNineMinutesAgo, true)).toBe("59분 전");
    });

    it("handles edge case at 23 hours", () => {
      const twentyThreeHoursAgo = Date.now() - 23 * 60 * 60 * 1000;
      expect(formatRelativeTime(twentyThreeHoursAgo, true)).toBe("23시간 전");
    });
  });
});

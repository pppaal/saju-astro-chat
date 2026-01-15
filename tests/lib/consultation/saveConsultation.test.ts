/**
 * Comprehensive Tests for consultation/saveConsultation.ts
 * Tests consultation save, persona memory management, and helper utilities
 * Coverage: saveConsultation, getPersonaMemory, extractSummary, updatePersonaMemory
 */

import { vi, beforeEach, describe, it, expect } from "vitest";
import {
  saveConsultation,
  getPersonaMemory,
  extractSummary,
} from "@/lib/consultation/saveConsultation";
import { Prisma } from "@prisma/client";

// Mock dependencies
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    consultationHistory: {
      create: vi.fn(),
    },
    personaMemory: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("saveConsultation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("extractSummary", () => {
    it("returns empty string for empty input", () => {
      expect(extractSummary("")).toBe("");
    });

    it("returns empty string for null-like input", () => {
      expect(extractSummary(null as unknown as string)).toBe("");
      expect(extractSummary(undefined as unknown as string)).toBe("");
    });

    it("extracts first sentence as summary", () => {
      const report = "This is the first sentence. This is the second sentence.";
      const result = extractSummary(report);

      expect(result).toContain("This is the first sentence");
    });

    it("combines two sentences if first is short", () => {
      const report = "Short first. This is a longer second sentence with more content.";
      const result = extractSummary(report);

      expect(result).toContain("Short first");
      expect(result).toContain("This is a longer");
    });

    it("handles Korean sentences", () => {
      const report = "첫 번째 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다.";
      const result = extractSummary(report);

      expect(result).toContain("첫 번째 문장입니다");
    });

    it("respects maxLength parameter", () => {
      const report = "This is a very long first sentence that goes on and on and on. And here is more.";
      const result = extractSummary(report, 50);

      expect(result.length).toBeLessThanOrEqual(50);
    });

    it("adds ellipsis when truncated", () => {
      const report = "This is a very long first sentence that goes on and on and on forever and ever.";
      const result = extractSummary(report, 30);

      expect(result).toContain("...");
    });

    it("handles report without sentence terminators", () => {
      const report = "This report has no periods or question marks";
      const result = extractSummary(report, 100);

      expect(result).toBe("This report has no periods or question marks");
    });

    it("handles exclamation marks as sentence terminators", () => {
      const report = "Exciting news! Here is the detail.";
      const result = extractSummary(report);

      expect(result).toContain("Exciting news");
    });

    it("handles question marks as sentence terminators", () => {
      const report = "What happened? Let me explain.";
      const result = extractSummary(report);

      expect(result).toContain("What happened");
    });

    it("handles Chinese period (。) as sentence terminator", () => {
      const report = "第一句话。 第二句话。";
      const result = extractSummary(report);

      expect(result).toContain("第一句话");
    });

    it("does not add second sentence if first is already long", () => {
      const report = "This is a very long first sentence that already contains enough content and information to be a complete summary on its own. And here is more.";
      const result = extractSummary(report, 200);

      // Should only contain first sentence since it's >= 80 chars
      const sentences = result.split(". ");
      expect(sentences.length).toBe(1);
    });

    it("handles report with only whitespace", () => {
      const report = "   ";
      const result = extractSummary(report, 100);

      // Empty after filtering, should return slice
      expect(result).toBe("   ");
    });

    it("uses default maxLength of 200", () => {
      const longReport = "A".repeat(300);
      const result = extractSummary(longReport);

      expect(result.length).toBeLessThanOrEqual(200);
    });

    it("handles mixed punctuation", () => {
      const report = "Hello! How are you? I'm doing great. Thanks for asking!";
      const result = extractSummary(report);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("preserves special characters in summary", () => {
      const report = "Special chars: @#$% are here. More content follows.";
      const result = extractSummary(report);

      expect(result).toContain("@#$%");
    });

    it("handles newlines in report", () => {
      const report = "First paragraph.\n\nSecond paragraph with more content.";
      const result = extractSummary(report);

      expect(result).toBeDefined();
    });
  });

  describe("saveConsultation", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("creates consultation with minimal required data", async () => {
      const { prisma } = await import("@/lib/db/prisma");

      const mockConsultation = {
        id: "consultation-123",
        userId: "user-123",
        theme: "love",
        summary: "Test summary",
        fullReport: "Full report content",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.consultationHistory.create).mockResolvedValueOnce(mockConsultation as never);
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.personaMemory.create).mockResolvedValueOnce({} as never);

      const result = await saveConsultation({
        userId: "user-123",
        theme: "love",
        summary: "Test summary",
        fullReport: "Full report content",
      });

      expect(result.success).toBe(true);
      expect(result.consultationId).toBe("consultation-123");
      expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-123",
          theme: "love",
          summary: "Test summary",
          fullReport: "Full report content",
          locale: "ko", // default locale
        }),
      });
    });

    it("creates consultation with all optional parameters", async () => {
      const { prisma } = await import("@/lib/db/prisma");

      const mockConsultation = {
        id: "consultation-456",
        userId: "user-456",
        theme: "career",
        summary: "Career summary",
        fullReport: "Career report",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.consultationHistory.create).mockResolvedValueOnce(mockConsultation as never);
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.personaMemory.create).mockResolvedValueOnce({} as never);

      const jungQuotes = ["Quote 1", "Quote 2"];
      const signals = { positive: true, warning: false };

      const result = await saveConsultation({
        userId: "user-456",
        theme: "career",
        summary: "Career summary",
        fullReport: "Career report",
        jungQuotes,
        signals,
        userQuestion: "Will I get promoted?",
        locale: "en",
      });

      expect(result.success).toBe(true);
      expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-456",
          theme: "career",
          jungQuotes: jungQuotes as unknown as Prisma.InputJsonValue,
          signals: signals as unknown as Prisma.InputJsonValue,
          userQuestion: "Will I get promoted?",
          locale: "en",
        }),
      });
    });

    it("handles null jungQuotes and signals as JsonNull", async () => {
      const { prisma } = await import("@/lib/db/prisma");

      vi.mocked(prisma.consultationHistory.create).mockResolvedValueOnce({
        id: "consultation-789",
      } as never);
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.personaMemory.create).mockResolvedValueOnce({} as never);

      await saveConsultation({
        userId: "user-789",
        theme: "health",
        summary: "Health summary",
        fullReport: "Health report",
        jungQuotes: undefined,
        signals: null,
      });

      expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jungQuotes: Prisma.JsonNull,
          signals: Prisma.JsonNull,
          userQuestion: null,
        }),
      });
    });

    it("handles undefined userQuestion as null", async () => {
      const { prisma } = await import("@/lib/db/prisma");

      vi.mocked(prisma.consultationHistory.create).mockResolvedValueOnce({
        id: "consultation-no-question",
      } as never);
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.personaMemory.create).mockResolvedValueOnce({} as never);

      await saveConsultation({
        userId: "user-123",
        theme: "life",
        summary: "Summary",
        fullReport: "Report",
        userQuestion: undefined,
      });

      expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userQuestion: null,
        }),
      });
    });

    it("handles empty string userQuestion as empty string", async () => {
      const { prisma } = await import("@/lib/db/prisma");

      vi.mocked(prisma.consultationHistory.create).mockResolvedValueOnce({
        id: "consultation-empty-q",
      } as never);
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.personaMemory.create).mockResolvedValueOnce({} as never);

      await saveConsultation({
        userId: "user-123",
        theme: "life",
        summary: "Summary",
        fullReport: "Report",
        userQuestion: "",
      });

      expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userQuestion: null, // empty string becomes null
        }),
      });
    });

    it("returns false on error", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      const { saveConsultation } = await import("@/lib/consultation/saveConsultation");
      const { logger } = await import("@/lib/logger");

      vi.mocked(prisma.consultationHistory.create).mockRejectedValueOnce(
        new Error("Database error")
      );

      const result = await saveConsultation({
        userId: "user-123",
        theme: "love",
        summary: "Test",
        fullReport: "Report",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(logger.error).toHaveBeenCalled();
    });

    it("updates existing persona memory", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      const { saveConsultation } = await import("@/lib/consultation/saveConsultation");

      vi.mocked(prisma.consultationHistory.create).mockResolvedValueOnce({
        id: "consultation-789",
      } as never);

      const existingMemory = {
        userId: "user-123",
        dominantThemes: ["career"],
        lastTopics: ["career", "health"],
        sessionCount: 5,
      };

      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValueOnce(existingMemory as never);
      vi.mocked(prisma.personaMemory.update).mockResolvedValueOnce({} as never);

      await saveConsultation({
        userId: "user-123",
        theme: "love",
        summary: "Love summary",
        fullReport: "Love report",
      });

      expect(prisma.personaMemory.update).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        data: expect.objectContaining({
          dominantThemes: expect.arrayContaining(["career", "love"]),
          lastTopics: expect.arrayContaining(["love"]),
          sessionCount: 6,
        }),
      });
    });

    it("creates new persona memory for new user", async () => {
      const { prisma } = await import("@/lib/db/prisma");

      vi.mocked(prisma.consultationHistory.create).mockResolvedValueOnce({
        id: "consultation-new",
      } as never);
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.personaMemory.create).mockResolvedValueOnce({} as never);

      await saveConsultation({
        userId: "new-user",
        theme: "life",
        summary: "First session",
        fullReport: "First report",
      });

      expect(prisma.personaMemory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "new-user",
          dominantThemes: ["life"],
          lastTopics: ["life"],
          sessionCount: 1,
        }),
      });
    });

    it("maintains unique themes in dominantThemes", async () => {
      const { prisma } = await import("@/lib/db/prisma");

      const existingMemory = {
        userId: "user-repeat",
        dominantThemes: ["love", "career"],
        lastTopics: ["career"],
        sessionCount: 5,
      };

      vi.mocked(prisma.consultationHistory.create).mockResolvedValueOnce({
        id: "consultation-repeat",
      } as never);
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValueOnce(existingMemory as never);
      vi.mocked(prisma.personaMemory.update).mockResolvedValueOnce({} as never);

      await saveConsultation({
        userId: "user-repeat",
        theme: "love", // already exists
        summary: "Love again",
        fullReport: "Love report again",
      });

      expect(prisma.personaMemory.update).toHaveBeenCalledWith({
        where: { userId: "user-repeat" },
        data: expect.objectContaining({
          dominantThemes: ["love", "career"], // no duplicates
          lastTopics: ["love", "career"], // love moved to front
          sessionCount: 6,
        }),
      });
    });

    it("limits lastTopics to 10 items", async () => {
      const { prisma } = await import("@/lib/db/prisma");

      const existingMemory = {
        userId: "user-many-topics",
        dominantThemes: ["theme1"],
        lastTopics: ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10"],
        sessionCount: 10,
      };

      vi.mocked(prisma.consultationHistory.create).mockResolvedValueOnce({
        id: "consultation-11th",
      } as never);
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValueOnce(existingMemory as never);
      vi.mocked(prisma.personaMemory.update).mockResolvedValueOnce({} as never);

      await saveConsultation({
        userId: "user-many-topics",
        theme: "new-theme",
        summary: "New theme",
        fullReport: "New theme report",
      });

      const updateCall = vi.mocked(prisma.personaMemory.update).mock.calls[0][0];
      const lastTopics = updateCall.data.lastTopics as string[];

      expect(lastTopics.length).toBe(10); // capped at 10
      expect(lastTopics[0]).toBe("new-theme"); // newest first
      expect(lastTopics).not.toContain("t10"); // oldest removed
    });

    it("continues on persona memory update error", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      const { logger } = await import("@/lib/logger");

      vi.mocked(prisma.consultationHistory.create).mockResolvedValueOnce({
        id: "consultation-mem-error",
      } as never);
      vi.mocked(prisma.personaMemory.findUnique).mockRejectedValueOnce(
        new Error("Memory error")
      );

      const result = await saveConsultation({
        userId: "user-123",
        theme: "love",
        summary: "Test",
        fullReport: "Report",
      });

      // Still returns success even if memory update fails
      expect(result.success).toBe(true);
      expect(result.consultationId).toBe("consultation-mem-error");
      expect(logger.error).toHaveBeenCalled();
    });

    it("handles consultation create error gracefully", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      const { logger } = await import("@/lib/logger");

      const dbError = new Error("Database connection failed");
      vi.mocked(prisma.consultationHistory.create).mockRejectedValueOnce(dbError);

      const result = await saveConsultation({
        userId: "user-123",
        theme: "love",
        summary: "Test",
        fullReport: "Report",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(dbError);
      expect(result.consultationId).toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith("[saveConsultation error]", dbError);
    });

    it("handles complex jungQuotes data structure", async () => {
      const { prisma } = await import("@/lib/db/prisma");

      const complexQuotes = {
        quotes: ["Quote 1", "Quote 2"],
        context: { book: "Man and His Symbols", page: 123 },
        relevance: 0.95,
      };

      vi.mocked(prisma.consultationHistory.create).mockResolvedValueOnce({
        id: "consultation-complex",
      } as never);
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.personaMemory.create).mockResolvedValueOnce({} as never);

      await saveConsultation({
        userId: "user-123",
        theme: "psychology",
        summary: "Psychology analysis",
        fullReport: "Full psychology report",
        jungQuotes: complexQuotes,
      });

      expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jungQuotes: complexQuotes as unknown as Prisma.InputJsonValue,
        }),
      });
    });

    it("handles complex signals data structure", async () => {
      const { prisma } = await import("@/lib/db/prisma");

      const complexSignals = {
        positive: ["good", "excellent"],
        negative: ["warning"],
        neutral: ["note"],
        score: 85,
        metadata: { analyzed: true },
      };

      vi.mocked(prisma.consultationHistory.create).mockResolvedValueOnce({
        id: "consultation-signals",
      } as never);
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.personaMemory.create).mockResolvedValueOnce({} as never);

      await saveConsultation({
        userId: "user-123",
        theme: "fortune",
        summary: "Fortune reading",
        fullReport: "Full fortune report",
        signals: complexSignals,
      });

      expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          signals: complexSignals as unknown as Prisma.InputJsonValue,
        }),
      });
    });

    it("handles persona memory with null or empty themes array", async () => {
      const { prisma } = await import("@/lib/db/prisma");

      const existingMemory = {
        userId: "user-empty-themes",
        dominantThemes: null,
        lastTopics: null,
        sessionCount: 0,
      };

      vi.mocked(prisma.consultationHistory.create).mockResolvedValueOnce({
        id: "consultation-empty-themes",
      } as never);
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValueOnce(existingMemory as never);
      vi.mocked(prisma.personaMemory.update).mockResolvedValueOnce({} as never);

      await saveConsultation({
        userId: "user-empty-themes",
        theme: "first-theme",
        summary: "First",
        fullReport: "First report",
      });

      expect(prisma.personaMemory.update).toHaveBeenCalledWith({
        where: { userId: "user-empty-themes" },
        data: expect.objectContaining({
          dominantThemes: ["first-theme"],
          lastTopics: ["first-theme"],
          sessionCount: 1,
        }),
      });
    });
  });

  describe("getPersonaMemory (mocked)", () => {
    it("returns persona memory when found", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      const { getPersonaMemory } = await import("@/lib/consultation/saveConsultation");

      const mockMemory = {
        userId: "user-123",
        dominantThemes: ["love", "career"],
        lastTopics: ["career"],
        sessionCount: 10,
      };

      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValueOnce(mockMemory as never);

      const result = await getPersonaMemory("user-123");

      expect(result).toEqual(mockMemory);
      expect(prisma.personaMemory.findUnique).toHaveBeenCalledWith({
        where: { userId: "user-123" },
      });
    });

    it("returns null when not found", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      const { getPersonaMemory } = await import("@/lib/consultation/saveConsultation");

      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValueOnce(null);

      const result = await getPersonaMemory("nonexistent-user");

      expect(result).toBeNull();
    });

    it("returns null on error", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      const { getPersonaMemory } = await import("@/lib/consultation/saveConsultation");
      const { logger } = await import("@/lib/logger");

      vi.mocked(prisma.personaMemory.findUnique).mockRejectedValueOnce(
        new Error("Database error")
      );

      const result = await getPersonaMemory("user-123");

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});

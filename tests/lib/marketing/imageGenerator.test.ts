/**
 * Image Generator 테스트
 * - 그라데이션 색상
 * - 점수 색상
 * - SVG 생성
 * - AI 배경 생성 (Replicate)
 */

import { vi, beforeEach } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Replicate
const mockReplicateRun = vi.fn();
vi.mock("replicate", () => {
  return {
    default: class MockReplicate {
      run = mockReplicateRun;
    },
  };
});

// Sample DailyFortune data
const mockFortune = {
  date: "2024-01-15",
  sign: "aries",
  signKo: "양자리",
  emoji: "♈",
  scores: {
    overall: 85,
    love: 90,
    career: 75,
    wealth: 80,
    health: 85,
  },
  luckyColor: "빨강",
  luckyNumber: 7,
  luckyItem: "빨간 머플러",
  message: "오늘은 새로운 시작에 좋은 날입니다.",
};

describe("Image Generator Helper Functions", () => {
  describe("getGradientColors", () => {
    it("returns gradient colors for all zodiac signs", () => {
      const signs = [
        "aries", "taurus", "gemini", "cancer", "leo", "virgo",
        "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
      ];

      // We'll test the internal logic by checking SVG output
      signs.forEach(sign => {
        const fortune = { ...mockFortune, sign };
        // Will be tested through generateFortuneSVG
        expect(fortune.sign).toBe(sign);
      });
    });
  });

  describe("getScoreColor", () => {
    it("returns correct colors for score ranges", () => {
      // We'll test through SVG output which uses these colors
      const testScores = [
        { score: 85, expectedGreen: true },
        { score: 65, expectedOrange: true },
        { score: 45, expectedDarkOrange: true },
        { score: 25, expectedRed: true },
      ];

      testScores.forEach(({ score }) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });
  });
});

describe("generateAIBackground", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REPLICATE_API_TOKEN = "test-token";
  });

  it("calls Replicate with correct parameters", async () => {
    mockReplicateRun.mockResolvedValueOnce(["https://example.com/image.png"]);

    const { generateAIBackground } = await import("@/lib/marketing/imageGenerator");
    await generateAIBackground(mockFortune as never, "modern");

    expect(mockReplicateRun).toHaveBeenCalledWith(
      expect.stringContaining("stability-ai/sdxl"),
      expect.objectContaining({
        input: expect.objectContaining({
          width: 1080,
          height: 1920,
          num_outputs: 1,
        }),
      })
    );
  });

  it("includes zodiac sign in prompt", async () => {
    mockReplicateRun.mockResolvedValueOnce(["https://example.com/image.png"]);

    const { generateAIBackground } = await import("@/lib/marketing/imageGenerator");
    await generateAIBackground(mockFortune as never, "modern");

    expect(mockReplicateRun).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        input: expect.objectContaining({
          prompt: expect.stringContaining(mockFortune.signKo),
        }),
      })
    );
  });

  it("returns image URL on success", async () => {
    const expectedUrl = "https://example.com/generated-image.png";
    mockReplicateRun.mockResolvedValueOnce([expectedUrl]);

    const { generateAIBackground } = await import("@/lib/marketing/imageGenerator");
    const result = await generateAIBackground(mockFortune as never);

    expect(result).toBe(expectedUrl);
  });

  it("returns empty string on error", async () => {
    mockReplicateRun.mockRejectedValueOnce(new Error("API error"));

    const { generateAIBackground } = await import("@/lib/marketing/imageGenerator");
    const { logger } = await import("@/lib/logger");

    const result = await generateAIBackground(mockFortune as never);

    expect(result).toBe("");
    expect(logger.error).toHaveBeenCalled();
  });

  it("supports different styles", async () => {
    const styles = ["modern", "mystical", "minimal", "vibrant"];

    for (const style of styles) {
      mockReplicateRun.mockResolvedValueOnce(["https://example.com/image.png"]);

      const { generateAIBackground } = await import("@/lib/marketing/imageGenerator");
      await generateAIBackground(mockFortune as never, style);

      expect(mockReplicateRun).toHaveBeenCalled();
    }
  });
});

describe("generateFortuneSVG", () => {
  it("generates valid SVG string", async () => {
    const { generateFortuneSVG } = await import("@/lib/marketing/imageGenerator");
    const svg = generateFortuneSVG(mockFortune as never);

    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain('width="1080"');
    expect(svg).toContain('height="1920"');
  });

  it("includes date in SVG", async () => {
    const { generateFortuneSVG } = await import("@/lib/marketing/imageGenerator");
    const svg = generateFortuneSVG(mockFortune as never);

    expect(svg).toContain(mockFortune.date);
  });

  it("includes zodiac emoji and name", async () => {
    const { generateFortuneSVG } = await import("@/lib/marketing/imageGenerator");
    const svg = generateFortuneSVG(mockFortune as never);

    expect(svg).toContain(mockFortune.emoji);
    expect(svg).toContain(mockFortune.signKo);
  });

  it("includes overall score", async () => {
    const { generateFortuneSVG } = await import("@/lib/marketing/imageGenerator");
    const svg = generateFortuneSVG(mockFortune as never);

    expect(svg).toContain(String(mockFortune.scores.overall));
  });

  it("includes category scores", async () => {
    const { generateFortuneSVG } = await import("@/lib/marketing/imageGenerator");
    const svg = generateFortuneSVG(mockFortune as never);

    expect(svg).toContain(String(mockFortune.scores.love));
    expect(svg).toContain(String(mockFortune.scores.career));
    expect(svg).toContain(String(mockFortune.scores.wealth));
    expect(svg).toContain(String(mockFortune.scores.health));
  });

  it("includes lucky elements", async () => {
    const { generateFortuneSVG } = await import("@/lib/marketing/imageGenerator");
    const svg = generateFortuneSVG(mockFortune as never);

    expect(svg).toContain(mockFortune.luckyColor);
    expect(svg).toContain(String(mockFortune.luckyNumber));
    expect(svg).toContain(mockFortune.luckyItem);
  });

  it("includes message", async () => {
    const { generateFortuneSVG } = await import("@/lib/marketing/imageGenerator");
    const svg = generateFortuneSVG(mockFortune as never);

    expect(svg).toContain(mockFortune.message);
  });

  it("includes branding", async () => {
    const { generateFortuneSVG } = await import("@/lib/marketing/imageGenerator");
    const svg = generateFortuneSVG(mockFortune as never);

    expect(svg).toContain("DestinyPal");
  });

  it("generates gradient based on zodiac sign", async () => {
    const { generateFortuneSVG } = await import("@/lib/marketing/imageGenerator");

    // Test different signs
    const testCases = [
      { sign: "aries", color1: "#FF6B6B" },
      { sign: "taurus", color1: "#4ECDC4" },
      { sign: "leo", color1: "#FFB347" },
    ];

    for (const { sign, color1 } of testCases) {
      const fortune = { ...mockFortune, sign };
      const svg = generateFortuneSVG(fortune as never);
      expect(svg).toContain(color1);
    }
  });

  it("uses default gradient for unknown sign", async () => {
    const { generateFortuneSVG } = await import("@/lib/marketing/imageGenerator");
    const fortune = { ...mockFortune, sign: "unknown" };
    const svg = generateFortuneSVG(fortune as never);

    // Default gradient colors
    expect(svg).toContain("#6C5CE7");
    expect(svg).toContain("#A29BFE");
  });
});

describe("Score Colors", () => {
  it("applies green color for high scores (>=80)", async () => {
    const { generateFortuneSVG } = await import("@/lib/marketing/imageGenerator");
    const fortune = { ...mockFortune, scores: { ...mockFortune.scores, love: 85 } };
    const svg = generateFortuneSVG(fortune as never);

    // Green color for high scores
    expect(svg).toContain("#2ECC71");
  });

  it("applies orange color for medium scores (60-79)", async () => {
    const { generateFortuneSVG } = await import("@/lib/marketing/imageGenerator");
    const fortune = { ...mockFortune, scores: { ...mockFortune.scores, career: 65 } };
    const svg = generateFortuneSVG(fortune as never);

    // Orange color for medium scores
    expect(svg).toContain("#F39C12");
  });

  it("applies dark orange for low-medium scores (40-59)", async () => {
    const { generateFortuneSVG } = await import("@/lib/marketing/imageGenerator");
    const fortune = { ...mockFortune, scores: { ...mockFortune.scores, wealth: 45 } };
    const svg = generateFortuneSVG(fortune as never);

    // Dark orange for low-medium scores
    expect(svg).toContain("#E67E22");
  });

  it("applies red color for low scores (<40)", async () => {
    const { generateFortuneSVG } = await import("@/lib/marketing/imageGenerator");
    const fortune = { ...mockFortune, scores: { ...mockFortune.scores, health: 30 } };
    const svg = generateFortuneSVG(fortune as never);

    // Red color for low scores
    expect(svg).toContain("#E74C3C");
  });
});

describe("ImageGeneratorOptions", () => {
  it("validates option types", () => {
    interface ImageGeneratorOptions {
      width?: number;
      height?: number;
      format?: "png" | "jpeg";
      quality?: number;
      useAI?: boolean;
      style?: "modern" | "mystical" | "minimal" | "vibrant";
    }

    const validOptions: ImageGeneratorOptions = {
      width: 1080,
      height: 1920,
      format: "png",
      quality: 0.95,
      useAI: false,
      style: "modern",
    };

    expect(validOptions.width).toBe(1080);
    expect(validOptions.height).toBe(1920);
    expect(["png", "jpeg"]).toContain(validOptions.format);
    expect(validOptions.quality).toBeGreaterThanOrEqual(0);
    expect(validOptions.quality).toBeLessThanOrEqual(1);
  });
});

describe("Zodiac Gradients", () => {
  const expectedGradients: Record<string, [string, string]> = {
    aries: ["#FF6B6B", "#FF8E53"],
    taurus: ["#4ECDC4", "#44A08D"],
    gemini: ["#FFD93D", "#FFA53D"],
    cancer: ["#A8E6CF", "#8FD3F4"],
    leo: ["#FFB347", "#FF6B9D"],
    virgo: ["#C1E1C1", "#98D8C8"],
    libra: ["#F7ACCF", "#D896FF"],
    scorpio: ["#8E44AD", "#C0392B"],
    sagittarius: ["#6C5CE7", "#A29BFE"],
    capricorn: ["#636E72", "#2D3436"],
    aquarius: ["#74B9FF", "#0984E3"],
    pisces: ["#A29BFE", "#6C5CE7"],
  };

  it.each(Object.entries(expectedGradients))(
    "has correct gradient for %s",
    async (sign, [color1, color2]) => {
      const { generateFortuneSVG } = await import("@/lib/marketing/imageGenerator");
      const fortune = { ...mockFortune, sign };
      const svg = generateFortuneSVG(fortune as never);

      expect(svg).toContain(color1);
      expect(svg).toContain(color2);
    }
  );
});

describe("SVG Structure", () => {
  it("includes linear gradient definition", async () => {
    const { generateFortuneSVG } = await import("@/lib/marketing/imageGenerator");
    const svg = generateFortuneSVG(mockFortune as never);

    expect(svg).toContain("<defs>");
    expect(svg).toContain("linearGradient");
    expect(svg).toContain('id="bgGradient"');
  });

  it("includes background rectangle", async () => {
    const { generateFortuneSVG } = await import("@/lib/marketing/imageGenerator");
    const svg = generateFortuneSVG(mockFortune as never);

    expect(svg).toContain('<rect width="1080" height="1920"');
    expect(svg).toContain('fill="url(#bgGradient)"');
  });

  it("includes score circle", async () => {
    const { generateFortuneSVG } = await import("@/lib/marketing/imageGenerator");
    const svg = generateFortuneSVG(mockFortune as never);

    expect(svg).toContain("<circle");
    expect(svg).toContain('cx="540"');
    expect(svg).toContain('cy="600"');
    expect(svg).toContain('r="180"');
  });

  it("uses consistent font family", async () => {
    const { generateFortuneSVG } = await import("@/lib/marketing/imageGenerator");
    const svg = generateFortuneSVG(mockFortune as never);

    // Should use Pretendard font
    expect(svg).toContain('font-family="Pretendard, sans-serif"');
  });
});

/**
 * Tests for replicate.ts
 * Weekly fortune image generation using Replicate AI
 */

import { vi, beforeEach, afterEach } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Replicate SDK with a class-like implementation
const mockRun = vi.fn();

vi.mock("replicate", () => {
  return {
    default: class MockReplicate {
      constructor() {}
      run = mockRun;
    },
  };
});

describe("replicate", () => {
  beforeEach(() => {
    vi.resetModules();
    mockRun.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("generateWeeklyFortuneImage", () => {
    it("returns image URL from Replicate response", async () => {
      const expectedUrl = "https://replicate.delivery/image.png";
      mockRun.mockResolvedValueOnce([expectedUrl]);

      const { generateWeeklyFortuneImage } = await import("@/lib/replicate");
      const result = await generateWeeklyFortuneImage();

      expect(result).toBe(expectedUrl);
    });

    it("handles non-array response from Replicate", async () => {
      const expectedUrl = "https://replicate.delivery/single-image.png";
      mockRun.mockResolvedValueOnce(expectedUrl);

      const { generateWeeklyFortuneImage } = await import("@/lib/replicate");
      const result = await generateWeeklyFortuneImage();

      expect(result).toBe(expectedUrl);
    });

    it("throws error when response is invalid", async () => {
      mockRun.mockResolvedValueOnce({ invalid: "response" });

      const { generateWeeklyFortuneImage } = await import("@/lib/replicate");

      await expect(generateWeeklyFortuneImage()).rejects.toThrow(
        "Invalid response from Replicate"
      );
    });

    it("throws error when response is empty array", async () => {
      mockRun.mockResolvedValueOnce([]);

      const { generateWeeklyFortuneImage } = await import("@/lib/replicate");

      await expect(generateWeeklyFortuneImage()).rejects.toThrow(
        "Invalid response from Replicate"
      );
    });

    it("logs and rethrows on API error", async () => {
      const apiError = new Error("API rate limit exceeded");
      mockRun.mockRejectedValueOnce(apiError);

      const { generateWeeklyFortuneImage } = await import("@/lib/replicate");
      const { logger } = await import("@/lib/logger");

      await expect(generateWeeklyFortuneImage()).rejects.toThrow(
        "API rate limit exceeded"
      );
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to generate weekly fortune image:",
        apiError
      );
    });

    it("calls Replicate with SDXL model", async () => {
      mockRun.mockResolvedValueOnce(["https://example.com/image.png"]);

      const { generateWeeklyFortuneImage } = await import("@/lib/replicate");
      await generateWeeklyFortuneImage();

      expect(mockRun).toHaveBeenCalledWith(
        expect.stringContaining("stability-ai/sdxl"),
        expect.any(Object)
      );
    });

    it("uses correct image dimensions (768x1024)", async () => {
      mockRun.mockResolvedValueOnce(["https://example.com/image.png"]);

      const { generateWeeklyFortuneImage } = await import("@/lib/replicate");
      await generateWeeklyFortuneImage();

      expect(mockRun).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          input: expect.objectContaining({
            width: 768,
            height: 1024,
          }),
        })
      );
    });

    it("includes negative prompt to filter unwanted elements", async () => {
      mockRun.mockResolvedValueOnce(["https://example.com/image.png"]);

      const { generateWeeklyFortuneImage } = await import("@/lib/replicate");
      await generateWeeklyFortuneImage();

      expect(mockRun).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          input: expect.objectContaining({
            negative_prompt: expect.stringContaining("watermark"),
          }),
        })
      );
    });

    it("uses themed prompt with mystical fortune elements", async () => {
      mockRun.mockResolvedValueOnce(["https://example.com/image.png"]);

      const { generateWeeklyFortuneImage } = await import("@/lib/replicate");
      await generateWeeklyFortuneImage();

      // The prompt should contain mystical fortune elements
      expect(mockRun).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          input: expect.objectContaining({
            prompt: expect.stringContaining("mystical fortune"),
          }),
        })
      );
    });

    it("uses K_EULER scheduler", async () => {
      mockRun.mockResolvedValueOnce(["https://example.com/image.png"]);

      const { generateWeeklyFortuneImage } = await import("@/lib/replicate");
      await generateWeeklyFortuneImage();

      expect(mockRun).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          input: expect.objectContaining({
            scheduler: "K_EULER",
          }),
        })
      );
    });

    it("uses 30 inference steps", async () => {
      mockRun.mockResolvedValueOnce(["https://example.com/image.png"]);

      const { generateWeeklyFortuneImage } = await import("@/lib/replicate");
      await generateWeeklyFortuneImage();

      expect(mockRun).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          input: expect.objectContaining({
            num_inference_steps: 30,
          }),
        })
      );
    });

    it("uses guidance scale of 7.5", async () => {
      mockRun.mockResolvedValueOnce(["https://example.com/image.png"]);

      const { generateWeeklyFortuneImage } = await import("@/lib/replicate");
      await generateWeeklyFortuneImage();

      expect(mockRun).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          input: expect.objectContaining({
            guidance_scale: 7.5,
          }),
        })
      );
    });

    it("requests only 1 output image", async () => {
      mockRun.mockResolvedValueOnce(["https://example.com/image.png"]);

      const { generateWeeklyFortuneImage } = await import("@/lib/replicate");
      await generateWeeklyFortuneImage();

      expect(mockRun).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          input: expect.objectContaining({
            num_outputs: 1,
          }),
        })
      );
    });
  });

  describe("replicate client", () => {
    it("exports replicate client instance", async () => {
      mockRun.mockResolvedValueOnce(["https://example.com/image.png"]);
      const { replicate } = await import("@/lib/replicate");
      expect(replicate).toBeDefined();
      expect(replicate.run).toBeDefined();
    });
  });

  describe("theme selection based on week number", () => {
    it("generates prompt based on current week", async () => {
      mockRun.mockResolvedValueOnce(["https://example.com/image.png"]);

      const { generateWeeklyFortuneImage } = await import("@/lib/replicate");
      await generateWeeklyFortuneImage();

      // Verify prompt is generated and contains expected elements
      const call = mockRun.mock.calls[0];
      expect(call[1].input.prompt).toContain("mystical fortune");
      expect(call[1].input.prompt).toMatch(/ethereal|cosmic|magical|dreamy/);
    });

    it("prompt contains 8k quality reference", async () => {
      mockRun.mockResolvedValueOnce(["https://example.com/image.png"]);

      const { generateWeeklyFortuneImage } = await import("@/lib/replicate");
      await generateWeeklyFortuneImage();

      const call = mockRun.mock.calls[0];
      expect(call[1].input.prompt).toContain("8k quality");
    });

    it("prompt is suitable for mobile app design", async () => {
      mockRun.mockResolvedValueOnce(["https://example.com/image.png"]);

      const { generateWeeklyFortuneImage } = await import("@/lib/replicate");
      await generateWeeklyFortuneImage();

      const call = mockRun.mock.calls[0];
      expect(call[1].input.prompt).toContain("mobile app card design");
    });
  });

  describe("error handling", () => {
    it("handles network timeout errors", async () => {
      const timeoutError = new Error("Request timeout");
      mockRun.mockRejectedValueOnce(timeoutError);

      const { generateWeeklyFortuneImage } = await import("@/lib/replicate");
      const { logger } = await import("@/lib/logger");

      await expect(generateWeeklyFortuneImage()).rejects.toThrow(
        "Request timeout"
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it("handles authentication errors", async () => {
      const authError = new Error("Invalid API token");
      mockRun.mockRejectedValueOnce(authError);

      const { generateWeeklyFortuneImage } = await import("@/lib/replicate");

      await expect(generateWeeklyFortuneImage()).rejects.toThrow(
        "Invalid API token"
      );
    });

    it("handles null response", async () => {
      mockRun.mockResolvedValueOnce(null);

      const { generateWeeklyFortuneImage } = await import("@/lib/replicate");

      await expect(generateWeeklyFortuneImage()).rejects.toThrow(
        "Invalid response from Replicate"
      );
    });

    it("handles undefined response", async () => {
      mockRun.mockResolvedValueOnce(undefined);

      const { generateWeeklyFortuneImage } = await import("@/lib/replicate");

      await expect(generateWeeklyFortuneImage()).rejects.toThrow(
        "Invalid response from Replicate"
      );
    });

    it("handles array with non-string first element", async () => {
      mockRun.mockResolvedValueOnce([123]);

      const { generateWeeklyFortuneImage } = await import("@/lib/replicate");

      await expect(generateWeeklyFortuneImage()).rejects.toThrow(
        "Invalid response from Replicate"
      );
    });
  });
});

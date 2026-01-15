/**
 * Tests for socialMediaPoster.ts
 * Social Media Auto-Posting System (Instagram, Twitter/X)
 */

import { vi, beforeEach } from "vitest";
import type { DailyFortune } from "@/lib/marketing/dailyFortuneGenerator";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock generateShareText
vi.mock("@/lib/marketing/dailyFortuneGenerator", async () => {
  const actual = await vi.importActual("@/lib/marketing/dailyFortuneGenerator");
  return {
    ...actual,
    generateShareText: vi.fn((fortune: DailyFortune) =>
      `${fortune.signKo} ${fortune.emoji} 오늘의 운세 ${fortune.scores.overall}점 #운세`
    ),
  };
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("socialMediaPoster", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    mockFetch.mockReset();
    process.env = { ...originalEnv };
  });

  describe("postToInstagram", () => {
    it("successfully posts to Instagram", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "container_123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "post_456" }),
        });

      const { postToInstagram } = await import("@/lib/marketing/socialMediaPoster");

      const result = await postToInstagram(
        "https://example.com/image.jpg",
        "Test caption",
        {
          accessToken: "test_token",
          instagramAccountId: "test_account",
        }
      );

      expect(result.success).toBe(true);
      expect(result.platform).toBe("instagram");
      expect(result.postId).toBe("post_456");
      expect(result.url).toContain("instagram.com/p/post_456");
    });

    it("calls Facebook Graph API with correct parameters", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "container_123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "post_456" }),
        });

      const { postToInstagram } = await import("@/lib/marketing/socialMediaPoster");

      await postToInstagram(
        "https://example.com/image.jpg",
        "Test caption",
        {
          accessToken: "test_token",
          instagramAccountId: "account_789",
        }
      );

      // First call: create container
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        "https://graph.facebook.com/v18.0/account_789/media",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image_url: "https://example.com/image.jpg",
            caption: "Test caption",
            access_token: "test_token",
          }),
        })
      );

      // Second call: publish
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "https://graph.facebook.com/v18.0/account_789/media_publish",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            creation_id: "container_123",
            access_token: "test_token",
          }),
        })
      );
    });

    it("handles container creation failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Invalid token" }),
      });

      const { postToInstagram } = await import("@/lib/marketing/socialMediaPoster");
      const { logger } = await import("@/lib/logger");

      const result = await postToInstagram(
        "https://example.com/image.jpg",
        "Test caption",
        {
          accessToken: "invalid_token",
          instagramAccountId: "test_account",
        }
      );

      expect(result.success).toBe(false);
      expect(result.platform).toBe("instagram");
      expect(result.error).toContain("Instagram container creation failed");
      expect(logger.error).toHaveBeenCalled();
    });

    it("handles publish failure", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "container_123" }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: "Publish failed" }),
        });

      const { postToInstagram } = await import("@/lib/marketing/socialMediaPoster");
      const { logger } = await import("@/lib/logger");

      const result = await postToInstagram(
        "https://example.com/image.jpg",
        "Test caption",
        {
          accessToken: "test_token",
          instagramAccountId: "test_account",
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Instagram publish failed");
      expect(logger.error).toHaveBeenCalled();
    });

    it("handles network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { postToInstagram } = await import("@/lib/marketing/socialMediaPoster");

      const result = await postToInstagram(
        "https://example.com/image.jpg",
        "Test caption",
        {
          accessToken: "test_token",
          instagramAccountId: "test_account",
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });

  describe("postToInstagramStory", () => {
    it("successfully posts to Instagram Story", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "story_container_123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "story_456" }),
        });

      const { postToInstagramStory } = await import("@/lib/marketing/socialMediaPoster");

      const result = await postToInstagramStory(
        "https://example.com/story.jpg",
        {
          accessToken: "test_token",
          instagramAccountId: "test_account",
        }
      );

      expect(result.success).toBe(true);
      expect(result.platform).toBe("instagram");
      expect(result.postId).toBe("story_456");
    });

    it("calls API with STORIES media type", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "story_container" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "story_post" }),
        });

      const { postToInstagramStory } = await import("@/lib/marketing/socialMediaPoster");

      await postToInstagramStory("https://example.com/story.jpg", {
        accessToken: "token",
        instagramAccountId: "account",
      });

      const firstCall = mockFetch.mock.calls[0];
      const body = JSON.parse(firstCall[1].body);

      expect(body.media_type).toBe("STORIES");
      expect(body.image_url).toBe("https://example.com/story.jpg");
    });

    it("handles story container creation failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Container failed" }),
      });

      const { postToInstagramStory } = await import("@/lib/marketing/socialMediaPoster");

      const result = await postToInstagramStory(
        "https://example.com/story.jpg",
        {
          accessToken: "test_token",
          instagramAccountId: "test_account",
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Instagram story container failed");
    });

    it("handles story publish failure", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "container_123" }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: "Publish failed" }),
        });

      const { postToInstagramStory } = await import("@/lib/marketing/socialMediaPoster");

      const result = await postToInstagramStory(
        "https://example.com/story.jpg",
        {
          accessToken: "test_token",
          instagramAccountId: "test_account",
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Instagram story publish failed");
    });
  });

  describe("postToTwitter", () => {
    it("successfully posts to Twitter", async () => {
      // Mock image download
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      });

      // Mock media upload
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ media_id_string: "media_123" }),
      });

      // Mock tweet creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: "tweet_456" } }),
      });

      const { postToTwitter } = await import("@/lib/marketing/socialMediaPoster");

      const result = await postToTwitter(
        "https://example.com/image.jpg",
        "Test tweet",
        {
          apiKey: "api_key",
          apiSecret: "api_secret",
          accessToken: "access_token",
          accessTokenSecret: "access_secret",
        }
      );

      expect(result.success).toBe(true);
      expect(result.platform).toBe("twitter");
      expect(result.postId).toBe("tweet_456");
      expect(result.url).toContain("twitter.com/i/web/status/tweet_456");
    });

    it("truncates text to 280 characters", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(8),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ media_id_string: "media_123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: "tweet_456" } }),
        });

      const { postToTwitter } = await import("@/lib/marketing/socialMediaPoster");

      const longText = "a".repeat(300);
      await postToTwitter(
        "https://example.com/image.jpg",
        longText,
        {
          apiKey: "api_key",
          apiSecret: "api_secret",
          accessToken: "access_token",
          accessTokenSecret: "access_secret",
        }
      );

      // Check tweet creation call
      const tweetCall = mockFetch.mock.calls[2];
      const body = JSON.parse(tweetCall[1].body);
      expect(body.text.length).toBeLessThanOrEqual(280);
    });

    it("handles media upload failure", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(8),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: "Upload failed" }),
        });

      const { postToTwitter } = await import("@/lib/marketing/socialMediaPoster");

      const result = await postToTwitter(
        "https://example.com/image.jpg",
        "Test tweet",
        {
          apiKey: "api_key",
          apiSecret: "api_secret",
          accessToken: "access_token",
          accessTokenSecret: "access_secret",
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Twitter media upload failed");
    });

    it("handles tweet creation failure", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(8),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ media_id_string: "media_123" }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: "Tweet failed" }),
        });

      const { postToTwitter } = await import("@/lib/marketing/socialMediaPoster");

      const result = await postToTwitter(
        "https://example.com/image.jpg",
        "Test tweet",
        {
          apiKey: "api_key",
          apiSecret: "api_secret",
          accessToken: "access_token",
          accessTokenSecret: "access_secret",
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Twitter post failed");
    });
  });

  describe("postToAllPlatforms", () => {
    it("posts to Instagram when config provided", async () => {
      // Mock Instagram calls
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "container_1" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "post_1" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "story_container_1" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "story_1" }),
        });

      const { postToAllPlatforms } = await import("@/lib/marketing/socialMediaPoster");

      const fortune: DailyFortune = {
        date: "2024-01-15",
        sign: "aries",
        signKo: "양자리",
        emoji: "♈",
        scores: { love: 80, career: 75, wealth: 85, health: 90, overall: 82 },
        luckyColor: "빨강",
        luckyNumber: 7,
        luckyItem: "향수",
        message: "좋은 날",
        advice: "자신감을 가지세요",
        hashtags: ["#양자리"],
      };

      const results = await postToAllPlatforms(
        fortune,
        "https://example.com/image.jpg",
        {
          instagram: {
            accessToken: "ig_token",
            instagramAccountId: "ig_account",
          },
        }
      );

      expect(results.length).toBe(2); // Post + Story
      expect(results[0].platform).toBe("instagram");
      expect(results[1].platform).toBe("instagram");
    });

    it("posts to Twitter when config provided", async () => {
      // Mock Twitter calls
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(8),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ media_id_string: "media_123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: "tweet_456" } }),
        });

      const { postToAllPlatforms } = await import("@/lib/marketing/socialMediaPoster");

      const fortune: DailyFortune = {
        date: "2024-01-15",
        sign: "taurus",
        signKo: "황소자리",
        emoji: "♉",
        scores: { love: 70, career: 65, wealth: 80, health: 75, overall: 72 },
        luckyColor: "초록",
        luckyNumber: 3,
        luckyItem: "식물",
        message: "안정적인 하루",
        advice: "차분하게",
        hashtags: ["#황소자리"],
      };

      const results = await postToAllPlatforms(
        fortune,
        "https://example.com/image.jpg",
        {
          twitter: {
            apiKey: "api_key",
            apiSecret: "api_secret",
            accessToken: "access_token",
            accessTokenSecret: "access_secret",
          },
        }
      );

      expect(results.length).toBe(1);
      expect(results[0].platform).toBe("twitter");
    });

    it("returns empty array when no configs provided", async () => {
      const { postToAllPlatforms } = await import("@/lib/marketing/socialMediaPoster");

      const fortune: DailyFortune = {
        date: "2024-01-15",
        sign: "cancer",
        signKo: "게자리",
        emoji: "♋",
        scores: { love: 95, career: 85, wealth: 78, health: 88, overall: 86 },
        luckyColor: "은색",
        luckyNumber: 2,
        luckyItem: "조개",
        message: "감성적인 날",
        advice: "가족 시간",
        hashtags: ["#게자리"],
      };

      const results = await postToAllPlatforms(fortune, "https://example.com/image.jpg", {});

      expect(results.length).toBe(0);
    });
  });

  describe("loadSocialMediaConfig", () => {
    it("loads Instagram config from environment", async () => {
      process.env.INSTAGRAM_ACCESS_TOKEN = "ig_token_123";
      process.env.INSTAGRAM_ACCOUNT_ID = "ig_account_456";

      const { loadSocialMediaConfig } = await import("@/lib/marketing/socialMediaPoster");

      const config = loadSocialMediaConfig();

      expect(config.instagram).toBeDefined();
      expect(config.instagram?.accessToken).toBe("ig_token_123");
      expect(config.instagram?.instagramAccountId).toBe("ig_account_456");
    });

    it("loads Twitter config from environment", async () => {
      process.env.TWITTER_API_KEY = "twitter_key";
      process.env.TWITTER_API_SECRET = "twitter_secret";
      process.env.TWITTER_ACCESS_TOKEN = "twitter_access";
      process.env.TWITTER_ACCESS_TOKEN_SECRET = "twitter_access_secret";

      const { loadSocialMediaConfig } = await import("@/lib/marketing/socialMediaPoster");

      const config = loadSocialMediaConfig();

      expect(config.twitter).toBeDefined();
      expect(config.twitter?.apiKey).toBe("twitter_key");
      expect(config.twitter?.apiSecret).toBe("twitter_secret");
      expect(config.twitter?.accessToken).toBe("twitter_access");
      expect(config.twitter?.accessTokenSecret).toBe("twitter_access_secret");
    });

    it("returns empty config when no env vars set", async () => {
      delete process.env.INSTAGRAM_ACCESS_TOKEN;
      delete process.env.INSTAGRAM_ACCOUNT_ID;
      delete process.env.TWITTER_API_KEY;
      delete process.env.TWITTER_API_SECRET;
      delete process.env.TWITTER_ACCESS_TOKEN;
      delete process.env.TWITTER_ACCESS_TOKEN_SECRET;

      const { loadSocialMediaConfig } = await import("@/lib/marketing/socialMediaPoster");

      const config = loadSocialMediaConfig();

      expect(config.instagram).toBeUndefined();
      expect(config.twitter).toBeUndefined();
    });

    it("does not load Instagram config when only token is set", async () => {
      process.env.INSTAGRAM_ACCESS_TOKEN = "ig_token";
      delete process.env.INSTAGRAM_ACCOUNT_ID;

      const { loadSocialMediaConfig } = await import("@/lib/marketing/socialMediaPoster");

      const config = loadSocialMediaConfig();

      expect(config.instagram).toBeUndefined();
    });

    it("does not load Instagram config when only account ID is set", async () => {
      delete process.env.INSTAGRAM_ACCESS_TOKEN;
      process.env.INSTAGRAM_ACCOUNT_ID = "ig_account";

      const { loadSocialMediaConfig } = await import("@/lib/marketing/socialMediaPoster");

      const config = loadSocialMediaConfig();

      expect(config.instagram).toBeUndefined();
    });

    it("does not load Twitter config when missing any required field", async () => {
      process.env.TWITTER_API_KEY = "key";
      process.env.TWITTER_API_SECRET = "secret";
      process.env.TWITTER_ACCESS_TOKEN = "token";
      delete process.env.TWITTER_ACCESS_TOKEN_SECRET;

      const { loadSocialMediaConfig } = await import("@/lib/marketing/socialMediaPoster");

      const config = loadSocialMediaConfig();

      expect(config.twitter).toBeUndefined();
    });

    it("loads both configs when all env vars are set", async () => {
      process.env.INSTAGRAM_ACCESS_TOKEN = "ig_token";
      process.env.INSTAGRAM_ACCOUNT_ID = "ig_account";
      process.env.TWITTER_API_KEY = "twitter_key";
      process.env.TWITTER_API_SECRET = "twitter_secret";
      process.env.TWITTER_ACCESS_TOKEN = "twitter_access";
      process.env.TWITTER_ACCESS_TOKEN_SECRET = "twitter_access_secret";

      const { loadSocialMediaConfig } = await import("@/lib/marketing/socialMediaPoster");

      const config = loadSocialMediaConfig();

      expect(config.instagram).toBeDefined();
      expect(config.twitter).toBeDefined();
    });
  });
});

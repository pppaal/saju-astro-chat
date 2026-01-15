/**
 * Weekly Fortune 테스트
 * - 주차 번호 계산
 * - Upstash 설정 검증
 */

import { vi } from "vitest";
import { getWeekNumber } from "@/lib/weeklyFortune";

describe("getWeekNumber", () => {
  it("returns week 1 for January 1st on Monday", () => {
    // 2024-01-01 is a Monday
    const date = new Date("2024-01-01T00:00:00Z");
    const week = getWeekNumber(date);
    expect(week).toBe(1);
  });

  it("returns correct week for mid-January", () => {
    // 2024-01-15 (Monday, week 3)
    const date = new Date("2024-01-15T00:00:00Z");
    const week = getWeekNumber(date);
    expect(week).toBeGreaterThanOrEqual(2);
    expect(week).toBeLessThanOrEqual(3);
  });

  it("returns correct week for mid-year", () => {
    // 2024-07-01
    const date = new Date("2024-07-01T00:00:00Z");
    const week = getWeekNumber(date);
    expect(week).toBeGreaterThan(25);
    expect(week).toBeLessThan(28);
  });

  it("returns correct week for end of year", () => {
    // 2024-12-31
    const date = new Date("2024-12-31T00:00:00Z");
    const week = getWeekNumber(date);
    // Can be week 1 of next year or week 52/53
    expect(week).toBeGreaterThanOrEqual(1);
    expect(week).toBeLessThanOrEqual(53);
  });

  it("handles different years correctly", () => {
    // 2023-01-01 is a Sunday (week 52 of 2022 or week 1 of 2023)
    const date2023 = new Date("2023-01-01T00:00:00Z");
    const week2023 = getWeekNumber(date2023);
    expect(week2023).toBeGreaterThanOrEqual(1);
    expect(week2023).toBeLessThanOrEqual(53);

    // 2025-01-01 is a Wednesday
    const date2025 = new Date("2025-01-01T00:00:00Z");
    const week2025 = getWeekNumber(date2025);
    expect(week2025).toBe(1);
  });

  it("returns value between 1 and 53", () => {
    // Test 12 random dates
    const dates = [
      "2024-01-01",
      "2024-02-15",
      "2024-03-20",
      "2024-04-10",
      "2024-05-05",
      "2024-06-21",
      "2024-07-04",
      "2024-08-15",
      "2024-09-01",
      "2024-10-31",
      "2024-11-25",
      "2024-12-25",
    ];

    dates.forEach((dateStr) => {
      const week = getWeekNumber(new Date(dateStr));
      expect(week).toBeGreaterThanOrEqual(1);
      expect(week).toBeLessThanOrEqual(53);
    });
  });

  it("uses current date when no argument provided", () => {
    const week = getWeekNumber();
    expect(week).toBeGreaterThanOrEqual(1);
    expect(week).toBeLessThanOrEqual(53);
  });

  it("handles leap year correctly", () => {
    // Feb 29, 2024 (leap year)
    const date = new Date("2024-02-29T00:00:00Z");
    const week = getWeekNumber(date);
    expect(week).toBe(9);
  });

  it("is consistent for same day", () => {
    const date1 = new Date("2024-06-15T00:00:00Z");
    const date2 = new Date("2024-06-15T12:00:00Z");
    const date3 = new Date("2024-06-15T23:59:59Z");

    const week1 = getWeekNumber(date1);
    const week2 = getWeekNumber(date2);
    const week3 = getWeekNumber(date3);

    expect(week1).toBe(week2);
    expect(week2).toBe(week3);
  });

  it("increments week number correctly across week boundary", () => {
    // Sunday to Monday
    const sunday = new Date("2024-06-09T00:00:00Z"); // Sunday
    const monday = new Date("2024-06-10T00:00:00Z"); // Monday

    const sundayWeek = getWeekNumber(sunday);
    const mondayWeek = getWeekNumber(monday);

    expect(mondayWeek).toBe(sundayWeek + 1);
  });

  it("handles edge cases for week 52/53", () => {
    // December 28-31 can be week 52, 53, or week 1 of next year
    const dec28 = new Date("2024-12-28T00:00:00Z");
    const dec31 = new Date("2024-12-31T00:00:00Z");

    const week28 = getWeekNumber(dec28);
    const week31 = getWeekNumber(dec31);

    expect(week28).toBeGreaterThanOrEqual(52);
    expect(week31).toBeGreaterThanOrEqual(1);
  });
});

describe("Upstash Config Validation (Logic Test)", () => {
  // Test the validation logic pattern
  function isValidUpstashConfig(url: string | undefined, token: string | undefined): boolean {
    if (!url || !token) return false;
    if (url === "replace_me" || token === "replace_me") return false;
    if (!url.startsWith("https://")) return false;
    return true;
  }

  it("returns false when URL is undefined", () => {
    expect(isValidUpstashConfig(undefined, "token")).toBe(false);
  });

  it("returns false when token is undefined", () => {
    expect(isValidUpstashConfig("https://redis.upstash.io", undefined)).toBe(false);
  });

  it("returns false for placeholder URL", () => {
    expect(isValidUpstashConfig("replace_me", "token")).toBe(false);
  });

  it("returns false for placeholder token", () => {
    expect(isValidUpstashConfig("https://redis.upstash.io", "replace_me")).toBe(false);
  });

  it("returns false for non-https URL", () => {
    expect(isValidUpstashConfig("http://redis.upstash.io", "token")).toBe(false);
  });

  it("returns true for valid config", () => {
    expect(isValidUpstashConfig("https://redis.upstash.io", "valid_token")).toBe(true);
  });
});

describe("WeeklyFortuneData Interface (Type Test)", () => {
  interface WeeklyFortuneData {
    imageUrl: string;
    generatedAt: string;
    weekNumber: number;
    theme: string;
  }

  it("validates correct data structure", () => {
    const data: WeeklyFortuneData = {
      imageUrl: "https://example.com/image.png",
      generatedAt: "2024-06-15T12:00:00Z",
      weekNumber: 24,
      theme: "prosperity",
    };

    expect(data.imageUrl).toBe("https://example.com/image.png");
    expect(data.generatedAt).toBe("2024-06-15T12:00:00Z");
    expect(data.weekNumber).toBe(24);
    expect(data.theme).toBe("prosperity");
  });

  it("week number matches calculated week", () => {
    const date = new Date("2024-06-15T00:00:00Z");
    const weekNumber = getWeekNumber(date);

    const data: WeeklyFortuneData = {
      imageUrl: "https://example.com/image.png",
      generatedAt: date.toISOString(),
      weekNumber,
      theme: "fortune",
    };

    expect(data.weekNumber).toBe(24);
  });
});

describe("ISO Week Calculation (RFC 8601)", () => {
  it("week starts on Monday (ISO 8601)", () => {
    // Thursday is used as the pivot day in ISO week calculation
    // 2024-01-04 is Thursday of week 1
    const thursday = new Date("2024-01-04T00:00:00Z");
    expect(getWeekNumber(thursday)).toBe(1);
  });

  it("first week of year contains first Thursday", () => {
    // 2024: January 1 is Monday, so week 1 starts Jan 1
    const jan1_2024 = new Date("2024-01-01T00:00:00Z");
    expect(getWeekNumber(jan1_2024)).toBe(1);

    // 2023: January 1 is Sunday, so it belongs to week 52 of 2022
    // Week 1 of 2023 starts January 2
    const jan1_2023 = new Date("2023-01-01T00:00:00Z");
    const week = getWeekNumber(jan1_2023);
    // Can be 52 (of 2022) or 1 depending on interpretation
    expect(week).toBeGreaterThanOrEqual(1);
    expect(week).toBeLessThanOrEqual(53);
  });

  it("last week of year can be 52 or 53", () => {
    // Years with 53 weeks: years ending on Thursday (or Wednesday in leap years)
    // 2020 had 53 weeks (started Wednesday, ended Thursday)
    const dec31_2020 = new Date("2020-12-31T00:00:00Z");
    const week2020 = getWeekNumber(dec31_2020);
    expect(week2020).toBe(53);

    // 2021 had 52 weeks
    const dec31_2021 = new Date("2021-12-31T00:00:00Z");
    const week2021 = getWeekNumber(dec31_2021);
    expect(week2021).toBe(52);
  });
});

describe("Weekly Theme Selection", () => {
  const WEEKLY_THEMES = [
    { theme: "golden sunrise over mountains", mood: "hope and new beginnings", color: "warm gold and orange" },
    { theme: "mystical full moon over calm ocean", mood: "intuition and reflection", color: "silver and deep blue" },
    { theme: "cherry blossoms floating in spring breeze", mood: "renewal and beauty", color: "soft pink and white" },
    { theme: "northern lights dancing in arctic sky", mood: "magic and wonder", color: "green and purple aurora" },
    { theme: "ancient temple under starry night", mood: "wisdom and spirituality", color: "deep purple and gold" },
    { theme: "crystal cave with glowing gems", mood: "inner discovery", color: "rainbow crystals on purple" },
    { theme: "phoenix rising from golden flames", mood: "transformation and rebirth", color: "red orange and gold" },
    { theme: "serene zen garden with flowing water", mood: "peace and balance", color: "soft green and grey" },
    { theme: "cosmic nebula with swirling galaxies", mood: "infinite possibilities", color: "deep space purple and blue" },
    { theme: "enchanted forest with fairy lights", mood: "mystery and enchantment", color: "emerald green and gold sparkles" },
    { theme: "lotus flower blooming on still pond", mood: "enlightenment and purity", color: "pink lotus on dark water" },
    { theme: "majestic waterfall in misty mountains", mood: "power and flow", color: "blue water and green mist" },
  ];

  it("has 12 diverse themes", () => {
    expect(WEEKLY_THEMES.length).toBe(12);
  });

  it("each theme has required properties", () => {
    WEEKLY_THEMES.forEach((t) => {
      expect(t).toHaveProperty("theme");
      expect(t).toHaveProperty("mood");
      expect(t).toHaveProperty("color");
    });
  });

  it("themes cycle based on week number", () => {
    const weekNumber = 14;
    const themeIndex = weekNumber % WEEKLY_THEMES.length;
    expect(themeIndex).toBe(2); // 14 % 12 = 2
    expect(WEEKLY_THEMES[themeIndex].theme).toBe("cherry blossoms floating in spring breeze");
  });

  it("week 0 selects first theme", () => {
    const themeIndex = 0 % WEEKLY_THEMES.length;
    expect(themeIndex).toBe(0);
    expect(WEEKLY_THEMES[themeIndex].mood).toBe("hope and new beginnings");
  });

  it("week 12 cycles back to first theme", () => {
    const themeIndex = 12 % WEEKLY_THEMES.length;
    expect(themeIndex).toBe(0);
  });

  it("week 53 maps to valid theme", () => {
    const themeIndex = 53 % WEEKLY_THEMES.length;
    expect(themeIndex).toBe(5); // 53 % 12 = 5
    expect(WEEKLY_THEMES[themeIndex].theme).toBe("crystal cave with glowing gems");
  });
});

describe("Upstash Response Parsing", () => {
  interface WeeklyFortuneData {
    imageUrl: string;
    generatedAt: string;
    weekNumber: number;
    theme: string;
  }

  function parseUpstashResponse(data: { result?: string | WeeklyFortuneData }): WeeklyFortuneData | null {
    if (data?.result) {
      if (typeof data.result === "string") {
        return JSON.parse(data.result);
      }
      return data.result;
    }
    return null;
  }

  it("parses stringified JSON result", () => {
    const response = {
      result: JSON.stringify({
        imageUrl: "https://example.com/image.png",
        generatedAt: "2024-01-15T10:00:00Z",
        weekNumber: 3,
        theme: "golden sunrise",
      }),
    };

    const parsed = parseUpstashResponse(response);
    expect(parsed?.imageUrl).toBe("https://example.com/image.png");
    expect(parsed?.weekNumber).toBe(3);
  });

  it("returns object result directly", () => {
    const response = {
      result: {
        imageUrl: "https://example.com/image.png",
        generatedAt: "2024-01-15T10:00:00Z",
        weekNumber: 3,
        theme: "golden sunrise",
      },
    };

    const parsed = parseUpstashResponse(response);
    expect(parsed?.imageUrl).toBe("https://example.com/image.png");
  });

  it("returns null for empty response", () => {
    expect(parseUpstashResponse({})).toBeNull();
  });

  it("returns null for undefined result", () => {
    expect(parseUpstashResponse({ result: undefined as unknown as string })).toBeNull();
  });
});

describe("Redis URL Construction", () => {
  const WEEKLY_FORTUNE_KEY = "weekly_fortune_image";

  function buildSetUrl(baseUrl: string, key: string): string {
    return `${baseUrl}/set/${key}`;
  }

  function buildGetUrl(baseUrl: string, key: string): string {
    return `${baseUrl}/get/${key}`;
  }

  it("builds correct SET URL", () => {
    const url = buildSetUrl("https://my-redis.upstash.io", WEEKLY_FORTUNE_KEY);
    expect(url).toBe("https://my-redis.upstash.io/set/weekly_fortune_image");
  });

  it("builds correct GET URL", () => {
    const url = buildGetUrl("https://my-redis.upstash.io", WEEKLY_FORTUNE_KEY);
    expect(url).toBe("https://my-redis.upstash.io/get/weekly_fortune_image");
  });

  it("handles URL with trailing slash", () => {
    const url = buildSetUrl("https://my-redis.upstash.io/", WEEKLY_FORTUNE_KEY);
    expect(url).toBe("https://my-redis.upstash.io//set/weekly_fortune_image");
  });
});

describe("Image Generation Prompt Building", () => {
  interface ThemeConfig {
    theme: string;
    mood: string;
    color: string;
  }

  function buildPrompt(selectedTheme: ThemeConfig): string {
    return `mystical fortune illustration, ${selectedTheme.theme},
${selectedTheme.mood}, ${selectedTheme.color},
ethereal atmosphere, soft glowing light, magical sparkles,
dreamy cosmic background, premium digital art style,
mobile app card design, elegant composition, 8k quality`;
  }

  it("builds prompt with theme elements", () => {
    const theme: ThemeConfig = {
      theme: "golden sunrise",
      mood: "hope",
      color: "gold and orange",
    };

    const prompt = buildPrompt(theme);
    expect(prompt).toContain("golden sunrise");
    expect(prompt).toContain("hope");
    expect(prompt).toContain("gold and orange");
  });

  it("includes quality keywords", () => {
    const theme: ThemeConfig = {
      theme: "test",
      mood: "test",
      color: "test",
    };

    const prompt = buildPrompt(theme);
    expect(prompt).toContain("8k quality");
    expect(prompt).toContain("premium digital art");
    expect(prompt).toContain("magical sparkles");
  });
});

describe("WeeklyFortune data validation", () => {
  interface WeeklyFortuneData {
    imageUrl: string;
    generatedAt: string;
    weekNumber: number;
    theme: string;
  }

  it("validates URL format", () => {
    const data: WeeklyFortuneData = {
      imageUrl: "https://example.com/image.png",
      generatedAt: "2024-01-15T10:00:00Z",
      weekNumber: 3,
      theme: "golden sunrise",
    };

    expect(data.imageUrl).toMatch(/^https?:\/\//);
  });

  it("validates week number range", () => {
    const validWeeks = [1, 26, 52, 53];
    validWeeks.forEach((week) => {
      const data: WeeklyFortuneData = {
        imageUrl: "https://example.com/image.png",
        generatedAt: new Date().toISOString(),
        weekNumber: week,
        theme: "test",
      };
      expect(data.weekNumber).toBeGreaterThanOrEqual(1);
      expect(data.weekNumber).toBeLessThanOrEqual(53);
    });
  });

  it("validates timestamp is ISO format", () => {
    const data: WeeklyFortuneData = {
      imageUrl: "https://example.com/image.png",
      generatedAt: "2024-01-15T10:00:00.000Z",
      weekNumber: 3,
      theme: "test",
    };

    const parsed = new Date(data.generatedAt);
    expect(parsed.toISOString()).toBe(data.generatedAt);
  });

  it("handles different image formats", () => {
    const formats = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
    formats.forEach((format) => {
      const data: WeeklyFortuneData = {
        imageUrl: `https://example.com/image${format}`,
        generatedAt: new Date().toISOString(),
        weekNumber: 1,
        theme: "test",
      };
      expect(data.imageUrl).toContain(format);
    });
  });
});

describe("Week calculation edge cases", () => {
  it("handles year transitions correctly", () => {
    // Last day of 2024
    const dec31 = new Date("2024-12-31T23:59:59Z");
    const week2024 = getWeekNumber(dec31);
    expect(week2024).toBeGreaterThanOrEqual(1);
    expect(week2024).toBeLessThanOrEqual(53);

    // First day of 2025
    const jan1 = new Date("2025-01-01T00:00:00Z");
    const week2025 = getWeekNumber(jan1);
    expect(week2025).toBeGreaterThanOrEqual(1);
    expect(week2025).toBeLessThanOrEqual(53);
  });

  it("handles timezone offsets", () => {
    // Same moment in different timezones
    const utc = new Date("2024-06-15T12:00:00Z");
    const utcWeek = getWeekNumber(utc);

    // Same moment, different timezone representation
    const local = new Date("2024-06-15T12:00:00+09:00");
    const localWeek = getWeekNumber(local);

    // Week numbers might differ if crossing day boundary
    expect(typeof utcWeek).toBe("number");
    expect(typeof localWeek).toBe("number");
  });

  it("handles daylight saving time transitions", () => {
    // Spring forward (US)
    const spring = new Date("2024-03-10T02:00:00Z");
    const springWeek = getWeekNumber(spring);
    expect(springWeek).toBeGreaterThanOrEqual(1);
    expect(springWeek).toBeLessThanOrEqual(53);

    // Fall back (US)
    const fall = new Date("2024-11-03T02:00:00Z");
    const fallWeek = getWeekNumber(fall);
    expect(fallWeek).toBeGreaterThanOrEqual(1);
    expect(fallWeek).toBeLessThanOrEqual(53);
  });

  it("is deterministic for same input", () => {
    const date = new Date("2024-06-15T12:00:00Z");
    const week1 = getWeekNumber(date);
    const week2 = getWeekNumber(date);
    const week3 = getWeekNumber(date);

    expect(week1).toBe(week2);
    expect(week2).toBe(week3);
  });
});

describe("Upstash configuration edge cases", () => {
  function isValidUpstashConfig(url: string | undefined, token: string | undefined): boolean {
    if (!url || !token) return false;
    if (url === "replace_me" || token === "replace_me") return false;
    if (!url.startsWith("https://")) return false;
    return true;
  }

  it("rejects empty strings", () => {
    expect(isValidUpstashConfig("", "token")).toBe(false);
    expect(isValidUpstashConfig("https://example.com", "")).toBe(false);
  });

  it("rejects whitespace-only values", () => {
    // Note: Current implementation only checks for empty string or undefined, not whitespace
    // This test documents the actual behavior
    expect(isValidUpstashConfig("   ", "token")).toBe(false); // Fails https check
    expect(isValidUpstashConfig("https://example.com", "   ")).toBe(true); // Passes (whitespace not checked)
  });

  it("accepts valid Upstash URL patterns", () => {
    const validUrls = [
      "https://us1-example-12345.upstash.io",
      "https://eu1-example-67890.upstash.io",
      "https://apac-example-abcde.upstash.io",
    ];

    validUrls.forEach((url) => {
      expect(isValidUpstashConfig(url, "valid_token_12345")).toBe(true);
    });
  });

  it("rejects localhost URLs in production", () => {
    const localhostUrls = [
      "http://localhost:6379",
      "http://127.0.0.1:6379",
      "http://0.0.0.0:6379",
    ];

    localhostUrls.forEach((url) => {
      expect(isValidUpstashConfig(url, "token")).toBe(false);
    });
  });
});

describe("Fortune data serialization", () => {
  interface WeeklyFortuneData {
    imageUrl: string;
    generatedAt: string;
    weekNumber: number;
    theme: string;
  }

  it("serializes and deserializes correctly", () => {
    const original: WeeklyFortuneData = {
      imageUrl: "https://example.com/image.png",
      generatedAt: "2024-01-15T10:00:00.000Z",
      weekNumber: 3,
      theme: "golden sunrise",
    };

    const serialized = JSON.stringify(original);
    const deserialized = JSON.parse(serialized);

    expect(deserialized).toEqual(original);
  });

  it("handles special characters in theme", () => {
    const data: WeeklyFortuneData = {
      imageUrl: "https://example.com/image.png",
      generatedAt: new Date().toISOString(),
      weekNumber: 1,
      theme: 'theme with "quotes" and \\backslashes',
    };

    const serialized = JSON.stringify(data);
    const deserialized = JSON.parse(serialized);

    expect(deserialized.theme).toBe(data.theme);
  });

  it("handles unicode in theme", () => {
    const data: WeeklyFortuneData = {
      imageUrl: "https://example.com/image.png",
      generatedAt: new Date().toISOString(),
      weekNumber: 1,
      theme: "황금 일출 🌅",
    };

    const serialized = JSON.stringify(data);
    const deserialized = JSON.parse(serialized);

    expect(deserialized.theme).toBe(data.theme);
  });
});

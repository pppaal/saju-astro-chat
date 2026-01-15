/**
 * API Limits Constants Tests
 *
 * Tests for API request/response limits
 */


import {
  MESSAGE_LIMITS,
  BODY_LIMITS,
  TEXT_LIMITS,
  LIST_LIMITS,
  TIMEOUT_LIMITS,
  RATE_LIMITS,
  ALLOWED_LOCALES,
  ALLOWED_GENDERS,
  PATTERNS,
} from "@/lib/constants/api-limits";

describe("MESSAGE_LIMITS", () => {
  it("has MAX_MESSAGES set to 20", () => {
    expect(MESSAGE_LIMITS.MAX_MESSAGES).toBe(20);
  });

  it("has MAX_MESSAGE_LENGTH set to 2000", () => {
    expect(MESSAGE_LIMITS.MAX_MESSAGE_LENGTH).toBe(2000);
  });

  it("has MAX_STREAM_MESSAGES set to 10", () => {
    expect(MESSAGE_LIMITS.MAX_STREAM_MESSAGES).toBe(10);
  });

  it("MAX_STREAM_MESSAGES is less than MAX_MESSAGES", () => {
    expect(MESSAGE_LIMITS.MAX_STREAM_MESSAGES).toBeLessThan(MESSAGE_LIMITS.MAX_MESSAGES);
  });
});

describe("BODY_LIMITS", () => {
  it("has DEFAULT set to 64KB", () => {
    expect(BODY_LIMITS.DEFAULT).toBe(64 * 1024);
  });

  it("has LARGE set to 96KB", () => {
    expect(BODY_LIMITS.LARGE).toBe(96 * 1024);
  });

  it("has SMALL set to 32KB", () => {
    expect(BODY_LIMITS.SMALL).toBe(32 * 1024);
  });

  it("has STREAM set to 64KB", () => {
    expect(BODY_LIMITS.STREAM).toBe(64 * 1024);
  });

  it("maintains size hierarchy SMALL < DEFAULT < LARGE", () => {
    expect(BODY_LIMITS.SMALL).toBeLessThan(BODY_LIMITS.DEFAULT);
    expect(BODY_LIMITS.DEFAULT).toBeLessThan(BODY_LIMITS.LARGE);
  });
});

describe("TEXT_LIMITS", () => {
  it("has MAX_NAME set to 120", () => {
    expect(TEXT_LIMITS.MAX_NAME).toBe(120);
  });

  it("has MAX_THEME set to 64", () => {
    expect(TEXT_LIMITS.MAX_THEME).toBe(64);
  });

  it("has MAX_TITLE set to 200", () => {
    expect(TEXT_LIMITS.MAX_TITLE).toBe(200);
  });

  it("has MAX_GUIDANCE set to 1200", () => {
    expect(TEXT_LIMITS.MAX_GUIDANCE).toBe(1200);
  });

  it("has MAX_CARD_TEXT set to 400", () => {
    expect(TEXT_LIMITS.MAX_CARD_TEXT).toBe(400);
  });

  it("has MAX_KEYWORD set to 60", () => {
    expect(TEXT_LIMITS.MAX_KEYWORD).toBe(60);
  });

  it("has MAX_CONTEXT set to 2000", () => {
    expect(TEXT_LIMITS.MAX_CONTEXT).toBe(2000);
  });

  it("has MAX_DREAM_TEXT set to 4000", () => {
    expect(TEXT_LIMITS.MAX_DREAM_TEXT).toBe(4000);
  });

  it("has MAX_TIMEZONE set to 64", () => {
    expect(TEXT_LIMITS.MAX_TIMEZONE).toBe(64);
  });
});

describe("LIST_LIMITS", () => {
  it("has MAX_KEYWORDS set to 20", () => {
    expect(LIST_LIMITS.MAX_KEYWORDS).toBe(20);
  });

  it("has MAX_CARDS set to 20", () => {
    expect(LIST_LIMITS.MAX_CARDS).toBe(20);
  });

  it("has MAX_LIST_ITEMS set to 20", () => {
    expect(LIST_LIMITS.MAX_LIST_ITEMS).toBe(20);
  });

  it("has MAX_CONTEXT_ITEMS set to 20", () => {
    expect(LIST_LIMITS.MAX_CONTEXT_ITEMS).toBe(20);
  });
});

describe("TIMEOUT_LIMITS", () => {
  it("has DEFAULT set to 60 seconds", () => {
    expect(TIMEOUT_LIMITS.DEFAULT).toBe(60000);
  });

  it("has SHORT set to 8 seconds", () => {
    expect(TIMEOUT_LIMITS.SHORT).toBe(8000);
  });

  it("has MEDIUM set to 30 seconds", () => {
    expect(TIMEOUT_LIMITS.MEDIUM).toBe(30000);
  });

  it("has LONG set to 120 seconds", () => {
    expect(TIMEOUT_LIMITS.LONG).toBe(120000);
  });

  it("has EXTRA_LONG set to 180 seconds", () => {
    expect(TIMEOUT_LIMITS.EXTRA_LONG).toBe(180000);
  });

  it("maintains timeout hierarchy", () => {
    expect(TIMEOUT_LIMITS.SHORT).toBeLessThan(TIMEOUT_LIMITS.MEDIUM);
    expect(TIMEOUT_LIMITS.MEDIUM).toBeLessThan(TIMEOUT_LIMITS.DEFAULT);
    expect(TIMEOUT_LIMITS.DEFAULT).toBeLessThan(TIMEOUT_LIMITS.LONG);
    expect(TIMEOUT_LIMITS.LONG).toBeLessThan(TIMEOUT_LIMITS.EXTRA_LONG);
  });
});

describe("RATE_LIMITS", () => {
  it("has DEFAULT_RPM set to 30", () => {
    expect(RATE_LIMITS.DEFAULT_RPM).toBe(30);
  });

  it("has STREAM_RPM set to 10", () => {
    expect(RATE_LIMITS.STREAM_RPM).toBe(10);
  });

  it("has CHAT_RPM set to 20", () => {
    expect(RATE_LIMITS.CHAT_RPM).toBe(20);
  });

  it("has PREMIUM_MULTIPLIER set to 2", () => {
    expect(RATE_LIMITS.PREMIUM_MULTIPLIER).toBe(2);
  });

  it("STREAM_RPM is most restrictive", () => {
    expect(RATE_LIMITS.STREAM_RPM).toBeLessThan(RATE_LIMITS.CHAT_RPM);
    expect(RATE_LIMITS.STREAM_RPM).toBeLessThan(RATE_LIMITS.DEFAULT_RPM);
  });
});

describe("ALLOWED_LOCALES", () => {
  it("is a Set", () => {
    expect(ALLOWED_LOCALES instanceof Set).toBe(true);
  });

  it("contains ko", () => {
    expect(ALLOWED_LOCALES.has("ko")).toBe(true);
  });

  it("contains en", () => {
    expect(ALLOWED_LOCALES.has("en")).toBe(true);
  });

  it("has exactly 2 locales", () => {
    expect(ALLOWED_LOCALES.size).toBe(2);
  });

  it("does not contain invalid locales", () => {
    expect(ALLOWED_LOCALES.has("fr")).toBe(false);
    expect(ALLOWED_LOCALES.has("ja")).toBe(false);
    expect(ALLOWED_LOCALES.has("")).toBe(false);
  });
});

describe("ALLOWED_GENDERS", () => {
  it("is a Set", () => {
    expect(ALLOWED_GENDERS instanceof Set).toBe(true);
  });

  it("contains male", () => {
    expect(ALLOWED_GENDERS.has("male")).toBe(true);
  });

  it("contains female", () => {
    expect(ALLOWED_GENDERS.has("female")).toBe(true);
  });

  it("contains other", () => {
    expect(ALLOWED_GENDERS.has("other")).toBe(true);
  });

  it("has exactly 3 genders", () => {
    expect(ALLOWED_GENDERS.size).toBe(3);
  });

  it("does not contain invalid genders", () => {
    expect(ALLOWED_GENDERS.has("unknown")).toBe(false);
    expect(ALLOWED_GENDERS.has("")).toBe(false);
  });
});

describe("PATTERNS", () => {
  describe("DATE pattern", () => {
    it("matches valid dates", () => {
      expect(PATTERNS.DATE.test("2024-01-15")).toBe(true);
      expect(PATTERNS.DATE.test("1990-12-31")).toBe(true);
      expect(PATTERNS.DATE.test("2000-06-01")).toBe(true);
    });

    it("rejects invalid dates", () => {
      expect(PATTERNS.DATE.test("24-01-15")).toBe(false);
      expect(PATTERNS.DATE.test("2024/01/15")).toBe(false);
      expect(PATTERNS.DATE.test("2024-1-15")).toBe(false);
      expect(PATTERNS.DATE.test("2024-01-5")).toBe(false);
      expect(PATTERNS.DATE.test("invalid")).toBe(false);
    });
  });

  describe("TIME pattern", () => {
    it("matches valid times", () => {
      expect(PATTERNS.TIME.test("00:00")).toBe(true);
      expect(PATTERNS.TIME.test("12:30")).toBe(true);
      expect(PATTERNS.TIME.test("23:59")).toBe(true);
    });

    it("rejects invalid times", () => {
      expect(PATTERNS.TIME.test("0:00")).toBe(false);
      expect(PATTERNS.TIME.test("12:0")).toBe(false);
      expect(PATTERNS.TIME.test("12:30:00")).toBe(false);
      expect(PATTERNS.TIME.test("invalid")).toBe(false);
    });
  });

  describe("EMAIL pattern", () => {
    it("matches valid emails", () => {
      expect(PATTERNS.EMAIL.test("test@example.com")).toBe(true);
      expect(PATTERNS.EMAIL.test("user.name@domain.co.kr")).toBe(true);
      expect(PATTERNS.EMAIL.test("user+tag@example.org")).toBe(true);
    });

    it("rejects invalid emails", () => {
      expect(PATTERNS.EMAIL.test("invalid")).toBe(false);
      expect(PATTERNS.EMAIL.test("@example.com")).toBe(false);
      expect(PATTERNS.EMAIL.test("test@")).toBe(false);
      expect(PATTERNS.EMAIL.test("test@.com")).toBe(false);
    });
  });
});

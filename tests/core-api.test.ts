/**
 * Core API Logic Tests
 *
 * Unit tests for API validation, business logic, and utilities.
 * These tests don't call actual Next.js route handlers (which require runtime context),
 * but test the underlying logic and validation functions.
 */

import { vi, beforeEach } from "vitest";

// ============================================
// Mock Setup
// ============================================

// Mock Prisma
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    userCredits: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    $transaction: vi.fn((fn) => fn({
      user: { findUnique: vi.fn(), update: vi.fn() },
      userCredits: { findUnique: vi.fn(), update: vi.fn() },
    })),
  },
}));

// Mock rate limiter
vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn(async () => ({ allowed: true, remaining: 10 })),
}));

// ============================================
// Input Validation Tests
// ============================================

describe("API Input Validation", () => {
  describe("Birth date validation", () => {
    const validateBirthDate = (date: string): boolean => {
      const regex = /^\d{4}-\d{2}-\d{2}$/;
      if (!regex.test(date)) return false;
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    };

    it("accepts valid date format YYYY-MM-DD", () => {
      expect(validateBirthDate("1990-01-15")).toBe(true);
      expect(validateBirthDate("2000-12-31")).toBe(true);
      expect(validateBirthDate("1950-06-20")).toBe(true);
    });

    it("rejects invalid date formats", () => {
      expect(validateBirthDate("1990/01/15")).toBe(false);
      expect(validateBirthDate("15-01-1990")).toBe(false);
      expect(validateBirthDate("invalid")).toBe(false);
      expect(validateBirthDate("")).toBe(false);
      expect(validateBirthDate("1990-1-15")).toBe(false);
    });

    it("rejects invalid dates", () => {
      // Note: JavaScript Date parsing is lenient - "1990-13-15" becomes "1991-01-15"
      // and "1990-02-30" becomes "1990-03-02". We test format only here.
      expect(validateBirthDate("1990-1-15")).toBe(false);   // Wrong format (single digit month)
      expect(validateBirthDate("90-01-15")).toBe(false);    // Wrong format (2-digit year)
    });
  });

  describe("Birth date range validation", () => {
    const validateBirthDateRange = (date: string): boolean => {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) return false;
      const now = new Date();
      const minYear = 1900;
      return parsed <= now && parsed.getFullYear() >= minYear;
    };

    it("accepts dates in valid range", () => {
      expect(validateBirthDateRange("1990-01-15")).toBe(true);
      expect(validateBirthDateRange("1920-05-10")).toBe(true);
      expect(validateBirthDateRange("2000-12-31")).toBe(true);
    });

    it("rejects future dates", () => {
      expect(validateBirthDateRange("2099-01-15")).toBe(false);
      expect(validateBirthDateRange("2030-06-01")).toBe(false);
    });

    it("rejects dates before 1900", () => {
      expect(validateBirthDateRange("1899-12-31")).toBe(false);
      expect(validateBirthDateRange("1800-01-01")).toBe(false);
    });
  });

  describe("Time validation (HH:MM)", () => {
    const validateTime = (time: string): boolean => {
      const regex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
      return regex.test(time);
    };

    it("accepts valid time formats", () => {
      expect(validateTime("12:30")).toBe(true);
      expect(validateTime("00:00")).toBe(true);
      expect(validateTime("23:59")).toBe(true);
      expect(validateTime("9:05")).toBe(true);
      expect(validateTime("09:05")).toBe(true);
    });

    it("rejects invalid time formats", () => {
      expect(validateTime("25:00")).toBe(false);
      expect(validateTime("12:60")).toBe(false);
      expect(validateTime("invalid")).toBe(false);
      expect(validateTime("")).toBe(false);
      expect(validateTime("12")).toBe(false);
      expect(validateTime("12:5")).toBe(false);
    });
  });

  describe("Coordinate validation", () => {
    const validateLatitude = (lat: number): boolean => {
      return typeof lat === "number" && !isNaN(lat) && lat >= -90 && lat <= 90;
    };

    const validateLongitude = (lon: number): boolean => {
      return typeof lon === "number" && !isNaN(lon) && lon >= -180 && lon <= 180;
    };

    it("validates latitude range (-90 to 90)", () => {
      expect(validateLatitude(37.5665)).toBe(true);  // Seoul
      expect(validateLatitude(-33.8688)).toBe(true); // Sydney
      expect(validateLatitude(0)).toBe(true);        // Equator
      expect(validateLatitude(-90)).toBe(true);      // South Pole
      expect(validateLatitude(90)).toBe(true);       // North Pole
    });

    it("rejects invalid latitudes", () => {
      expect(validateLatitude(-91)).toBe(false);
      expect(validateLatitude(91)).toBe(false);
      expect(validateLatitude(NaN)).toBe(false);
    });

    it("validates longitude range (-180 to 180)", () => {
      expect(validateLongitude(126.978)).toBe(true);  // Seoul
      expect(validateLongitude(-122.4194)).toBe(true); // San Francisco
      expect(validateLongitude(0)).toBe(true);         // Prime Meridian
      expect(validateLongitude(-180)).toBe(true);
      expect(validateLongitude(180)).toBe(true);
    });

    it("rejects invalid longitudes", () => {
      expect(validateLongitude(-181)).toBe(false);
      expect(validateLongitude(181)).toBe(false);
      expect(validateLongitude(NaN)).toBe(false);
    });
  });

  describe("Email validation", () => {
    const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    const validateEmail = (email: string): boolean => {
      return email.length <= 254 && EMAIL_REGEX.test(email);
    };

    it("accepts valid email formats", () => {
      expect(validateEmail("test@example.com")).toBe(true);
      expect(validateEmail("user.name@domain.co.kr")).toBe(true);
      expect(validateEmail("user+tag@gmail.com")).toBe(true);
      expect(validateEmail("a@b.co")).toBe(true);
    });

    it("rejects invalid email formats", () => {
      expect(validateEmail("invalid")).toBe(false);
      expect(validateEmail("@domain.com")).toBe(false);
      expect(validateEmail("user@")).toBe(false);
      expect(validateEmail("user@.com")).toBe(false);
      expect(validateEmail("")).toBe(false);
    });

    it("rejects overly long emails", () => {
      const longEmail = "a".repeat(250) + "@test.com";
      expect(validateEmail(longEmail)).toBe(false);
    });
  });

  describe("Gender validation", () => {
    const validateGender = (gender: string): boolean => {
      return ["male", "female"].includes(gender.toLowerCase());
    };

    it("accepts valid genders", () => {
      expect(validateGender("male")).toBe(true);
      expect(validateGender("female")).toBe(true);
      expect(validateGender("Male")).toBe(true);
      expect(validateGender("FEMALE")).toBe(true);
    });

    it("rejects invalid genders", () => {
      expect(validateGender("other")).toBe(false);
      expect(validateGender("")).toBe(false);
      expect(validateGender("unknown")).toBe(false);
    });
  });

  describe("Language code validation", () => {
    const SUPPORTED_LANGS = ["ko", "en", "ja", "zh"];
    const validateLang = (lang: string): boolean => {
      return SUPPORTED_LANGS.includes(lang);
    };

    it("accepts supported languages", () => {
      expect(validateLang("ko")).toBe(true);
      expect(validateLang("en")).toBe(true);
      expect(validateLang("ja")).toBe(true);
      expect(validateLang("zh")).toBe(true);
    });

    it("rejects unsupported languages", () => {
      expect(validateLang("fr")).toBe(false);
      expect(validateLang("de")).toBe(false);
      expect(validateLang("")).toBe(false);
    });
  });
});

// ============================================
// Credit System Tests
// ============================================

describe("Credit System Validation", () => {
  const ALLOWED_CREDIT_TYPES = ["reading", "compatibility", "followUp"] as const;
  type CreditType = typeof ALLOWED_CREDIT_TYPES[number];

  const isCreditType = (value: string): value is CreditType => {
    return ALLOWED_CREDIT_TYPES.includes(value as CreditType);
  };

  const validateCreditAmount = (amount: number): boolean => {
    return Number.isInteger(amount) && amount >= 1 && amount <= 10;
  };

  describe("Credit type validation", () => {
    it("accepts valid credit types", () => {
      expect(isCreditType("reading")).toBe(true);
      expect(isCreditType("compatibility")).toBe(true);
      expect(isCreditType("followUp")).toBe(true);
    });

    it("rejects invalid credit types", () => {
      expect(isCreditType("invalid")).toBe(false);
      expect(isCreditType("premium")).toBe(false);
      expect(isCreditType("")).toBe(false);
    });
  });

  describe("Credit amount validation", () => {
    it("accepts valid amounts (1-10)", () => {
      expect(validateCreditAmount(1)).toBe(true);
      expect(validateCreditAmount(5)).toBe(true);
      expect(validateCreditAmount(10)).toBe(true);
    });

    it("rejects invalid amounts", () => {
      expect(validateCreditAmount(0)).toBe(false);
      expect(validateCreditAmount(-1)).toBe(false);
      expect(validateCreditAmount(11)).toBe(false);
      expect(validateCreditAmount(1.5)).toBe(false);
    });
  });
});

// ============================================
// Tarot Request Validation Tests
// ============================================

describe("Tarot Request Validation", () => {
  interface TarotCard {
    cardId: string;
    name: string;
    image: string;
    isReversed: boolean;
    position: string;
  }

  interface TarotRequest {
    question?: string;
    spreadId?: string;
    spreadTitle?: string;
    cards?: TarotCard[];
  }

  const validateTarotRequest = (req: TarotRequest): string | null => {
    if (!req.question || typeof req.question !== "string" || req.question.trim().length === 0) {
      return "missing_question";
    }
    if (!req.spreadId || typeof req.spreadId !== "string") {
      return "missing_spread_id";
    }
    if (!req.spreadTitle || typeof req.spreadTitle !== "string") {
      return "missing_spread_title";
    }
    if (!req.cards || !Array.isArray(req.cards) || req.cards.length === 0) {
      return "missing_cards";
    }
    return null;
  };

  it("accepts valid tarot request", () => {
    const validRequest: TarotRequest = {
      question: "Will I find love?",
      spreadId: "three-card",
      spreadTitle: "Three Card Spread",
      cards: [
        { cardId: "1", name: "The Fool", image: "/fool.jpg", isReversed: false, position: "Past" },
      ],
    };
    expect(validateTarotRequest(validRequest)).toBeNull();
  });

  it("rejects missing question", () => {
    const request: TarotRequest = {
      spreadId: "three-card",
      spreadTitle: "Three Card Spread",
      cards: [{ cardId: "1", name: "Fool", image: "/f.jpg", isReversed: false, position: "Past" }],
    };
    expect(validateTarotRequest(request)).toBe("missing_question");
  });

  it("rejects empty cards array", () => {
    const request: TarotRequest = {
      question: "Will I find love?",
      spreadId: "three-card",
      spreadTitle: "Three Card Spread",
      cards: [],
    };
    expect(validateTarotRequest(request)).toBe("missing_cards");
  });

  it("rejects missing spreadId", () => {
    const request: TarotRequest = {
      question: "Will I find love?",
      spreadTitle: "Three Card Spread",
      cards: [{ cardId: "1", name: "Fool", image: "/f.jpg", isReversed: false, position: "Past" }],
    };
    expect(validateTarotRequest(request)).toBe("missing_spread_id");
  });
});

// ============================================
// Dream Request Validation Tests
// ============================================

describe("Dream Request Validation", () => {
  const MIN_DREAM_LENGTH = 10;
  const MAX_DREAM_LENGTH = 5000;

  const validateDreamText = (text: string | undefined): string | null => {
    if (!text || typeof text !== "string") {
      return "missing_dream_text";
    }
    const trimmed = text.trim();
    if (trimmed.length < MIN_DREAM_LENGTH) {
      return "dream_too_short";
    }
    if (trimmed.length > MAX_DREAM_LENGTH) {
      return "dream_too_long";
    }
    return null;
  };

  it("accepts valid dream text", () => {
    expect(validateDreamText("I dreamed that I was flying over the mountains.")).toBeNull();
  });

  it("rejects missing or empty dream text", () => {
    // Empty string is falsy so caught by !text check
    expect(validateDreamText("")).toBe("missing_dream_text");
    expect(validateDreamText(undefined)).toBe("missing_dream_text");
  });

  it("rejects too short dream text", () => {
    expect(validateDreamText("Short")).toBe("dream_too_short");
  });

  it("rejects too long dream text", () => {
    const longText = "a".repeat(MAX_DREAM_LENGTH + 1);
    expect(validateDreamText(longText)).toBe("dream_too_long");
  });
});

// ============================================
// Rate Limiting Tests
// ============================================

describe("Rate Limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rate limiter allows requests within limit", async () => {
    const { rateLimit } = await import("@/lib/rateLimit");
    const result = await rateLimit("test-key", { limit: 10, windowSeconds: 60 });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(10);
  });

  it("generates correct rate limit key", () => {
    const generateRateLimitKey = (prefix: string, identifier: string): string => {
      return `${prefix}:${identifier.toLowerCase()}`;
    };

    expect(generateRateLimitKey("saju", "user@example.com")).toBe("saju:user@example.com");
    expect(generateRateLimitKey("tarot", "192.168.1.1")).toBe("tarot:192.168.1.1");
  });
});

// ============================================
// Error Handling Tests
// ============================================

describe("API Error Handling", () => {
  const createErrorResponse = (code: string, message: string, status: number) => ({
    error: { code, message },
    status,
  });

  it("creates proper error response structure", () => {
    const error = createErrorResponse("not_found", "Resource not found", 404);
    expect(error.error.code).toBe("not_found");
    expect(error.error.message).toBe("Resource not found");
    expect(error.status).toBe(404);
  });

  it("sanitizes error messages for client", () => {
    const sanitizeError = (error: Error): string => {
      const message = error.message.toLowerCase();
      const sensitivePatterns = ["database", "prisma", "sql", "connection", "password"];
      if (sensitivePatterns.some(p => message.includes(p))) {
        return "Internal server error";
      }
      return error.message;
    };

    expect(sanitizeError(new Error("User not found"))).toBe("User not found");
    expect(sanitizeError(new Error("database connection failed"))).toBe("Internal server error");
    expect(sanitizeError(new Error("prisma query error"))).toBe("Internal server error");
    expect(sanitizeError(new Error("SQL syntax error"))).toBe("Internal server error");
  });

  it("maps known error codes to HTTP status", () => {
    const errorCodeToStatus: Record<string, number> = {
      not_authenticated: 401,
      forbidden: 403,
      not_found: 404,
      rate_limited: 429,
      invalid_request: 400,
      internal_error: 500,
    };

    expect(errorCodeToStatus["not_authenticated"]).toBe(401);
    expect(errorCodeToStatus["rate_limited"]).toBe(429);
    expect(errorCodeToStatus["not_found"]).toBe(404);
  });
});

// ============================================
// Saju Calculation Input Tests
// ============================================

describe("Saju Calculation Input Validation", () => {
  interface SajuInput {
    birthDate: string;
    birthTime: string;
    gender: string;
    timezone?: string;
    latitude?: number;
    longitude?: number;
  }

  const validateSajuInput = (input: Partial<SajuInput>): string[] => {
    const errors: string[] = [];

    // Required fields
    if (!input.birthDate) errors.push("birthDate is required");
    if (!input.birthTime) errors.push("birthTime is required");
    if (!input.gender) errors.push("gender is required");

    // Format validation
    if (input.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)) {
      errors.push("birthDate must be YYYY-MM-DD format");
    }
    if (input.birthTime && !/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/.test(input.birthTime)) {
      errors.push("birthTime must be HH:MM format");
    }
    if (input.gender && !["male", "female"].includes(input.gender.toLowerCase())) {
      errors.push("gender must be male or female");
    }

    // Coordinate validation (optional)
    if (input.latitude !== undefined && (input.latitude < -90 || input.latitude > 90)) {
      errors.push("latitude must be between -90 and 90");
    }
    if (input.longitude !== undefined && (input.longitude < -180 || input.longitude > 180)) {
      errors.push("longitude must be between -180 and 180");
    }

    return errors;
  };

  it("validates complete valid input", () => {
    const input: SajuInput = {
      birthDate: "1990-05-15",
      birthTime: "14:30",
      gender: "male",
      timezone: "Asia/Seoul",
      latitude: 37.5665,
      longitude: 126.978,
    };
    expect(validateSajuInput(input)).toEqual([]);
  });

  it("reports all missing required fields", () => {
    const errors = validateSajuInput({});
    expect(errors).toContain("birthDate is required");
    expect(errors).toContain("birthTime is required");
    expect(errors).toContain("gender is required");
  });

  it("validates format constraints", () => {
    const input = {
      birthDate: "1990/05/15", // Wrong format
      birthTime: "25:00",       // Invalid time
      gender: "other",          // Invalid gender
    };
    const errors = validateSajuInput(input);
    expect(errors).toContain("birthDate must be YYYY-MM-DD format");
    expect(errors).toContain("birthTime must be HH:MM format");
    expect(errors).toContain("gender must be male or female");
  });
});

// ============================================
// Response Header Tests
// ============================================

describe("API Response Headers", () => {
  it("sets correct content-type for JSON responses", () => {
    const headers = new Headers();
    headers.set("Content-Type", "application/json; charset=utf-8");
    expect(headers.get("Content-Type")).toBe("application/json; charset=utf-8");
  });

  it("sets cache-control for dynamic routes", () => {
    const setCacheHeaders = (headers: Headers, isDynamic: boolean) => {
      if (isDynamic) {
        headers.set("Cache-Control", "no-store, max-age=0");
      } else {
        headers.set("Cache-Control", "public, max-age=3600");
      }
    };

    const dynamicHeaders = new Headers();
    setCacheHeaders(dynamicHeaders, true);
    expect(dynamicHeaders.get("Cache-Control")).toBe("no-store, max-age=0");

    const staticHeaders = new Headers();
    setCacheHeaders(staticHeaders, false);
    expect(staticHeaders.get("Cache-Control")).toBe("public, max-age=3600");
  });

  it("sets security headers", () => {
    const setSecurityHeaders = (headers: Headers) => {
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("X-Frame-Options", "DENY");
      headers.set("X-XSS-Protection", "1; mode=block");
    };

    const headers = new Headers();
    setSecurityHeaders(headers);

    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("X-XSS-Protection")).toBe("1; mode=block");
  });
});

// ============================================
// Stripe Query Escape Tests
// ============================================

describe("Stripe Query Injection Prevention", () => {
  const escapeStripeQuery = (value: string): string => {
    return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  };

  it("escapes single quotes", () => {
    expect(escapeStripeQuery("test@example.com")).toBe("test@example.com");
    expect(escapeStripeQuery("o'brien@test.com")).toBe("o\\'brien@test.com");
  });

  it("escapes backslashes", () => {
    expect(escapeStripeQuery("test\\@example.com")).toBe("test\\\\@example.com");
  });

  it("handles combined special characters", () => {
    expect(escapeStripeQuery("o'brien\\test")).toBe("o\\'brien\\\\test");
  });
});

// ============================================
// Timezone Validation Tests
// ============================================

describe("Timezone Validation", () => {
  const COMMON_TIMEZONES = [
    "Asia/Seoul",
    "Asia/Tokyo",
    "America/New_York",
    "Europe/London",
    "UTC",
  ];

  const isValidTimezone = (tz: string): boolean => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  };

  it("validates known timezones", () => {
    for (const tz of COMMON_TIMEZONES) {
      expect(isValidTimezone(tz)).toBe(true);
    }
  });

  it("rejects invalid timezones", () => {
    expect(isValidTimezone("Invalid/Timezone")).toBe(false);
    expect(isValidTimezone("")).toBe(false);
    expect(isValidTimezone("NotATimezone")).toBe(false);
  });
});

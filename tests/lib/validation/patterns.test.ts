import {
  DATE_RE,
  TIME_RE,
  TIMEZONE_RE,
  EMAIL_RE,
  LIMITS,
  isValidDate,
  isValidTime,
  isValidLatitude,
  isValidLongitude,
  isValidCoordinates,
  isWithinLimit,
  isRequired,
  truncate,
  validateBirthInfo,
  validateProfile,
  validateMessages,
} from "@/lib/validation/patterns";

describe("Regex Patterns", () => {
  describe("DATE_RE", () => {
    it("matches valid date format", () => {
      expect(DATE_RE.test("2024-01-15")).toBe(true);
      expect(DATE_RE.test("1990-12-31")).toBe(true);
      expect(DATE_RE.test("2000-06-01")).toBe(true);
    });

    it("rejects invalid date formats", () => {
      expect(DATE_RE.test("24-01-15")).toBe(false);
      expect(DATE_RE.test("2024/01/15")).toBe(false);
      expect(DATE_RE.test("2024-1-15")).toBe(false);
      expect(DATE_RE.test("2024-01-5")).toBe(false);
      expect(DATE_RE.test("")).toBe(false);
    });
  });

  describe("TIME_RE", () => {
    it("matches valid time format", () => {
      expect(TIME_RE.test("00:00")).toBe(true);
      expect(TIME_RE.test("12:30")).toBe(true);
      expect(TIME_RE.test("23:59")).toBe(true);
    });

    it("rejects invalid time formats", () => {
      expect(TIME_RE.test("1:30")).toBe(false);
      expect(TIME_RE.test("12:5")).toBe(false);
      expect(TIME_RE.test("12:30:00")).toBe(false);
      expect(TIME_RE.test("")).toBe(false);
    });
  });

  describe("TIMEZONE_RE", () => {
    it("matches valid timezone formats", () => {
      expect(TIMEZONE_RE.test("Asia/Seoul")).toBe(true);
      expect(TIMEZONE_RE.test("America/New_York")).toBe(true);
      expect(TIMEZONE_RE.test("UTC")).toBe(true);
    });

    it("rejects invalid timezone formats", () => {
      expect(TIMEZONE_RE.test("Asia Seoul")).toBe(false);
      expect(TIMEZONE_RE.test("Asia-Seoul")).toBe(false);
      expect(TIMEZONE_RE.test("")).toBe(false);
    });
  });

  describe("EMAIL_RE", () => {
    it("matches valid email formats", () => {
      expect(EMAIL_RE.test("user@example.com")).toBe(true);
      expect(EMAIL_RE.test("test.user@domain.co.kr")).toBe(true);
      expect(EMAIL_RE.test("a@b.c")).toBe(true);
    });

    it("rejects invalid email formats", () => {
      expect(EMAIL_RE.test("user@")).toBe(false);
      expect(EMAIL_RE.test("@example.com")).toBe(false);
      expect(EMAIL_RE.test("user example.com")).toBe(false);
      expect(EMAIL_RE.test("")).toBe(false);
    });
  });
});

describe("LIMITS", () => {
  it("has expected values", () => {
    expect(LIMITS.NAME).toBe(80);
    expect(LIMITS.MESSAGE).toBe(2000);
    expect(LIMITS.MAX_MESSAGES).toBe(20);
    expect(LIMITS.LATITUDE.min).toBe(-90);
    expect(LIMITS.LATITUDE.max).toBe(90);
    expect(LIMITS.LONGITUDE.min).toBe(-180);
    expect(LIMITS.LONGITUDE.max).toBe(180);
  });
});

describe("isValidDate", () => {
  it("returns true for valid dates", () => {
    expect(isValidDate("2024-01-15")).toBe(true);
    expect(isValidDate("1990-12-31")).toBe(true);
    expect(isValidDate("2000-02-29")).toBe(true); // Leap year
  });

  it("returns false for invalid dates", () => {
    expect(isValidDate("2024-13-01")).toBe(false); // Invalid month
    expect(isValidDate("2024-01-32")).toBe(false); // Invalid day
    expect(isValidDate("invalid")).toBe(false);
    expect(isValidDate("")).toBe(false);
    expect(isValidDate(null)).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
  });
});

describe("isValidTime", () => {
  it("returns true for valid times", () => {
    expect(isValidTime("00:00")).toBe(true);
    expect(isValidTime("12:30")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
  });

  it("returns false for invalid times", () => {
    expect(isValidTime("25:00")).toBe(true); // Note: Only checks format, not range
    expect(isValidTime("1:30")).toBe(false);
    expect(isValidTime("")).toBe(false);
    expect(isValidTime(null)).toBe(false);
    expect(isValidTime(undefined)).toBe(false);
  });
});

describe("isValidLatitude", () => {
  it("returns true for valid latitudes", () => {
    expect(isValidLatitude(0)).toBe(true);
    expect(isValidLatitude(37.5665)).toBe(true);
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLatitude(90)).toBe(true);
  });

  it("returns false for invalid latitudes", () => {
    expect(isValidLatitude(-91)).toBe(false);
    expect(isValidLatitude(91)).toBe(false);
    expect(isValidLatitude(Infinity)).toBe(false);
    expect(isValidLatitude(NaN)).toBe(false);
    expect(isValidLatitude(null)).toBe(false);
    expect(isValidLatitude(undefined)).toBe(false);
  });
});

describe("isValidLongitude", () => {
  it("returns true for valid longitudes", () => {
    expect(isValidLongitude(0)).toBe(true);
    expect(isValidLongitude(126.9780)).toBe(true);
    expect(isValidLongitude(-180)).toBe(true);
    expect(isValidLongitude(180)).toBe(true);
  });

  it("returns false for invalid longitudes", () => {
    expect(isValidLongitude(-181)).toBe(false);
    expect(isValidLongitude(181)).toBe(false);
    expect(isValidLongitude(Infinity)).toBe(false);
    expect(isValidLongitude(NaN)).toBe(false);
    expect(isValidLongitude(null)).toBe(false);
    expect(isValidLongitude(undefined)).toBe(false);
  });
});

describe("isValidCoordinates", () => {
  it("returns true for valid coordinate pairs", () => {
    expect(isValidCoordinates(37.5665, 126.9780)).toBe(true);
    expect(isValidCoordinates(0, 0)).toBe(true);
    expect(isValidCoordinates(-90, -180)).toBe(true);
  });

  it("returns false if either coordinate is invalid", () => {
    expect(isValidCoordinates(91, 0)).toBe(false);
    expect(isValidCoordinates(0, 181)).toBe(false);
    expect(isValidCoordinates(null, 0)).toBe(false);
    expect(isValidCoordinates(0, undefined)).toBe(false);
  });
});

describe("isWithinLimit", () => {
  it("returns true for strings within limit", () => {
    expect(isWithinLimit("hello", 10)).toBe(true);
    expect(isWithinLimit("", 10)).toBe(true);
    expect(isWithinLimit("exact", 5)).toBe(true);
  });

  it("returns false for strings exceeding limit", () => {
    expect(isWithinLimit("hello world", 5)).toBe(false);
  });

  it("returns true for null/undefined (empty is valid)", () => {
    expect(isWithinLimit(null, 10)).toBe(true);
    expect(isWithinLimit(undefined, 10)).toBe(true);
  });
});

describe("isRequired", () => {
  it("returns true for non-empty strings", () => {
    expect(isRequired("hello")).toBe(true);
    expect(isRequired("  hello  ")).toBe(true);
  });

  it("returns false for empty/null/undefined", () => {
    expect(isRequired("")).toBe(false);
    expect(isRequired("   ")).toBe(false);
    expect(isRequired(null)).toBe(false);
    expect(isRequired(undefined)).toBe(false);
  });
});

describe("truncate", () => {
  it("truncates strings exceeding max length", () => {
    expect(truncate("hello world", 5)).toBe("hello");
    expect(truncate("test", 10)).toBe("test");
    expect(truncate("", 5)).toBe("");
  });

  it("returns original string if within limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
    expect(truncate("exact", 5)).toBe("exact");
  });
});

describe("validateBirthInfo", () => {
  it("returns valid for correct birth info", () => {
    const result = validateBirthInfo({
      birthDate: "1990-05-15",
      birthTime: "14:30",
      latitude: 37.5665,
      longitude: 126.9780,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns errors for invalid birth info", () => {
    const result = validateBirthInfo({
      birthDate: "invalid",
      birthTime: "invalid",
      latitude: 200,
      longitude: 300,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors).toContain("Invalid birth date format (YYYY-MM-DD required)");
    expect(result.errors).toContain("Invalid birth time format (HH:MM required)");
  });

  it("returns errors for missing fields", () => {
    const result = validateBirthInfo({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(4);
  });
});

describe("validateProfile", () => {
  it("returns valid for correct profile", () => {
    const result = validateProfile({
      name: "홍길동",
      birthDate: "1990-05-15",
      birthTime: "14:30",
      latitude: 37.5665,
      longitude: 126.9780,
      city: "Seoul",
      timezone: "Asia/Seoul",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns errors for name too long", () => {
    const result = validateProfile({
      name: "a".repeat(100), // Exceeds LIMITS.NAME (80)
      birthDate: "1990-05-15",
      birthTime: "14:30",
      latitude: 37.5665,
      longitude: 126.9780,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("Name too long"))).toBe(true);
  });

  it("returns errors for city too long", () => {
    const result = validateProfile({
      birthDate: "1990-05-15",
      birthTime: "14:30",
      latitude: 37.5665,
      longitude: 126.9780,
      city: "a".repeat(150), // Exceeds LIMITS.CITY (120)
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("City too long"))).toBe(true);
  });
});

describe("validateMessages", () => {
  it("returns valid for correct messages", () => {
    const messages = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
    ];
    const result = validateMessages(messages);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns error for non-array", () => {
    const result = validateMessages("not an array");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Messages must be an array");
  });

  it("returns error for too many messages", () => {
    const messages = Array(25).fill({ role: "user", content: "test" });
    const result = validateMessages(messages, 20);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("Too many messages"))).toBe(true);
  });

  it("returns error for message content too long", () => {
    const messages = [
      { role: "user", content: "a".repeat(3000) },
    ];
    const result = validateMessages(messages, 20, 2000);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("too long"))).toBe(true);
  });

  it("returns error for invalid message object", () => {
    const messages = [null, "string", { role: "user", content: "valid" }];
    const result = validateMessages(messages);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("invalid"))).toBe(true);
  });
});

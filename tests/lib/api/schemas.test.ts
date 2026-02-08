/**
 * API Schemas Tests
 *
 * Tests for Zod validation schemas
 */


import {
  LocaleSchema,
  DateStringSchema,
  TimeStringSchema,
  TimezoneSchema,
  BirthDataSchema,
  GenderSchema,
  DestinyMapRequestSchema,
  TarotCardSchema,
  TarotInterpretRequestSchema,
  DreamRequestSchema,
  IChingReadingRequestSchema,
  ApiErrorSchema,
  FeedbackRequestSchema,
  ConsultationThemeSchema,
  parseBody,
  safeParseBody,
} from "@/lib/api/schemas";

describe("LocaleSchema", () => {
  it("accepts valid locales", () => {
    const locales = ["ko", "en", "ja", "zh", "es", "vi", "th", "id", "de", "fr"];
    for (const locale of locales) {
      expect(LocaleSchema.safeParse(locale).success).toBe(true);
    }
  });

  it("rejects invalid locales", () => {
    expect(LocaleSchema.safeParse("invalid").success).toBe(false);
    expect(LocaleSchema.safeParse("").success).toBe(false);
    expect(LocaleSchema.safeParse(123).success).toBe(false);
  });
});

describe("DateStringSchema", () => {
  it("accepts valid date format", () => {
    expect(DateStringSchema.safeParse("2024-01-15").success).toBe(true);
    expect(DateStringSchema.safeParse("1990-12-31").success).toBe(true);
    expect(DateStringSchema.safeParse("2000-06-01").success).toBe(true);
  });

  it("rejects invalid date format", () => {
    expect(DateStringSchema.safeParse("01-15-2024").success).toBe(false);
    expect(DateStringSchema.safeParse("2024/01/15").success).toBe(false);
    expect(DateStringSchema.safeParse("2024-1-15").success).toBe(false);
    expect(DateStringSchema.safeParse("not-a-date").success).toBe(false);
  });
});

describe("TimeStringSchema", () => {
  it("accepts valid time format", () => {
    expect(TimeStringSchema.safeParse("14:30").success).toBe(true);
    expect(TimeStringSchema.safeParse("00:00").success).toBe(true);
    expect(TimeStringSchema.safeParse("23:59").success).toBe(true);
  });

  it("accepts single digit hours and AM/PM format", () => {
    // Schema uses [01]?\d which allows single digit hours
    expect(TimeStringSchema.safeParse("2:30").success).toBe(true);
    expect(TimeStringSchema.safeParse("2:30 PM").success).toBe(true);
    expect(TimeStringSchema.safeParse("9:00 AM").success).toBe(true);
  });

  it("rejects invalid time format", () => {
    expect(TimeStringSchema.safeParse("14:3").success).toBe(false);
    expect(TimeStringSchema.safeParse("14:30:00").success).toBe(false);
    expect(TimeStringSchema.safeParse("25:00").success).toBe(false);
    expect(TimeStringSchema.safeParse("not-a-time").success).toBe(false);
  });
});

describe("TimezoneSchema", () => {
  it("accepts valid timezones", () => {
    expect(TimezoneSchema.safeParse("Asia/Seoul").success).toBe(true);
    expect(TimezoneSchema.safeParse("America/New_York").success).toBe(true);
    expect(TimezoneSchema.safeParse("UTC").success).toBe(true);
    expect(TimezoneSchema.safeParse("Europe/London").success).toBe(true);
  });

  it("rejects invalid timezones", () => {
    expect(TimezoneSchema.safeParse("Invalid/Timezone").success).toBe(false);
    expect(TimezoneSchema.safeParse("Not_A_Timezone").success).toBe(false);
  });
});

describe("BirthDataSchema", () => {
  const validBirthData = {
    year: 1990,
    month: 5,
    day: 15,
    hour: 14,
    minute: 30,
    latitude: 37.5665,
    longitude: 126.978,
  };

  it("accepts valid birth data", () => {
    expect(BirthDataSchema.safeParse(validBirthData).success).toBe(true);
  });

  it("accepts optional timezone", () => {
    const withTimezone = { ...validBirthData, timezone: "Asia/Seoul" };
    expect(BirthDataSchema.safeParse(withTimezone).success).toBe(true);
  });

  it("validates year range", () => {
    expect(BirthDataSchema.safeParse({ ...validBirthData, year: 1899 }).success).toBe(false);
    expect(BirthDataSchema.safeParse({ ...validBirthData, year: 2101 }).success).toBe(false);
    expect(BirthDataSchema.safeParse({ ...validBirthData, year: 1900 }).success).toBe(true);
    expect(BirthDataSchema.safeParse({ ...validBirthData, year: 2100 }).success).toBe(true);
  });

  it("validates month range", () => {
    expect(BirthDataSchema.safeParse({ ...validBirthData, month: 0 }).success).toBe(false);
    expect(BirthDataSchema.safeParse({ ...validBirthData, month: 13 }).success).toBe(false);
    expect(BirthDataSchema.safeParse({ ...validBirthData, month: 1 }).success).toBe(true);
    expect(BirthDataSchema.safeParse({ ...validBirthData, month: 12 }).success).toBe(true);
  });

  it("validates day range", () => {
    expect(BirthDataSchema.safeParse({ ...validBirthData, day: 0 }).success).toBe(false);
    expect(BirthDataSchema.safeParse({ ...validBirthData, day: 32 }).success).toBe(false);
    expect(BirthDataSchema.safeParse({ ...validBirthData, day: 1 }).success).toBe(true);
    expect(BirthDataSchema.safeParse({ ...validBirthData, day: 31 }).success).toBe(true);
  });

  it("validates hour range", () => {
    expect(BirthDataSchema.safeParse({ ...validBirthData, hour: -1 }).success).toBe(false);
    expect(BirthDataSchema.safeParse({ ...validBirthData, hour: 24 }).success).toBe(false);
    expect(BirthDataSchema.safeParse({ ...validBirthData, hour: 0 }).success).toBe(true);
    expect(BirthDataSchema.safeParse({ ...validBirthData, hour: 23 }).success).toBe(true);
  });

  it("validates minute range", () => {
    expect(BirthDataSchema.safeParse({ ...validBirthData, minute: -1 }).success).toBe(false);
    expect(BirthDataSchema.safeParse({ ...validBirthData, minute: 60 }).success).toBe(false);
    expect(BirthDataSchema.safeParse({ ...validBirthData, minute: 0 }).success).toBe(true);
    expect(BirthDataSchema.safeParse({ ...validBirthData, minute: 59 }).success).toBe(true);
  });

  it("validates latitude range", () => {
    expect(BirthDataSchema.safeParse({ ...validBirthData, latitude: -91 }).success).toBe(false);
    expect(BirthDataSchema.safeParse({ ...validBirthData, latitude: 91 }).success).toBe(false);
    expect(BirthDataSchema.safeParse({ ...validBirthData, latitude: -90 }).success).toBe(true);
    expect(BirthDataSchema.safeParse({ ...validBirthData, latitude: 90 }).success).toBe(true);
  });

  it("validates longitude range", () => {
    expect(BirthDataSchema.safeParse({ ...validBirthData, longitude: -181 }).success).toBe(false);
    expect(BirthDataSchema.safeParse({ ...validBirthData, longitude: 181 }).success).toBe(false);
    expect(BirthDataSchema.safeParse({ ...validBirthData, longitude: -180 }).success).toBe(true);
    expect(BirthDataSchema.safeParse({ ...validBirthData, longitude: 180 }).success).toBe(true);
  });
});

describe("GenderSchema", () => {
  it("accepts valid genders", () => {
    expect(GenderSchema.safeParse("male").success).toBe(true);
    expect(GenderSchema.safeParse("female").success).toBe(true);
  });

  it("rejects invalid genders", () => {
    expect(GenderSchema.safeParse("other").success).toBe(false);
    expect(GenderSchema.safeParse("").success).toBe(false);
    expect(GenderSchema.safeParse(null).success).toBe(false);
  });
});

describe("DestinyMapRequestSchema", () => {
  const validRequest = {
    birthDate: "1990-05-15",
    birthTime: "14:30",
    latitude: 37.5665,
    longitude: 126.978,
    timezone: "Asia/Seoul",
  };

  it("accepts valid request", () => {
    expect(DestinyMapRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it("applies default language", () => {
    const result = DestinyMapRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe("ko");
    }
  });

  it("accepts optional gender and theme", () => {
    const withOptionals = {
      ...validRequest,
      gender: "male",
      theme: "love",
    };
    expect(DestinyMapRequestSchema.safeParse(withOptionals).success).toBe(true);
  });

  it("rejects missing required fields", () => {
    expect(DestinyMapRequestSchema.safeParse({}).success).toBe(false);

    const { birthDate, ...noBirthDate } = validRequest;
    expect(DestinyMapRequestSchema.safeParse(noBirthDate).success).toBe(false);
  });
});

describe("TarotCardSchema", () => {
  it("accepts valid card", () => {
    const card = { name: "The Fool", is_reversed: false };
    expect(TarotCardSchema.safeParse(card).success).toBe(true);
  });

  it("applies default is_reversed", () => {
    const card = { name: "The Magician" };
    const result = TarotCardSchema.safeParse(card);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_reversed).toBe(false);
    }
  });

  it("accepts optional position", () => {
    const card = { name: "The Fool", is_reversed: true, position: "Past" };
    expect(TarotCardSchema.safeParse(card).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(TarotCardSchema.safeParse({ name: "" }).success).toBe(false);
  });
});

describe("TarotInterpretRequestSchema", () => {
  const validRequest = {
    cards: [{ name: "The Fool" }, { name: "The Magician" }],
  };

  it("accepts valid request", () => {
    expect(TarotInterpretRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it("applies defaults", () => {
    const result = TarotInterpretRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("general");
      expect(result.data.spread_id).toBe("three_card");
      expect(result.data.language).toBe("ko");
    }
  });

  it("validates card count", () => {
    expect(TarotInterpretRequestSchema.safeParse({ cards: [] }).success).toBe(false);

    const tooManyCards = { cards: Array(11).fill({ name: "Card" }) };
    expect(TarotInterpretRequestSchema.safeParse(tooManyCards).success).toBe(false);
  });

  it("accepts optional fields", () => {
    const withOptionals = {
      ...validRequest,
      user_question: "What does my future hold?",
      birthdate: "1990-05-15",
      saju_context: { element: "wood" },
    };
    expect(TarotInterpretRequestSchema.safeParse(withOptionals).success).toBe(true);
  });

  it("validates user_question length", () => {
    const longQuestion = { ...validRequest, user_question: "a".repeat(501) };
    expect(TarotInterpretRequestSchema.safeParse(longQuestion).success).toBe(false);
  });
});

describe("DreamRequestSchema", () => {
  it("accepts valid dream request", () => {
    const request = { dream: "I had a vivid dream about flying over mountains." };
    expect(DreamRequestSchema.safeParse(request).success).toBe(true);
  });

  it("applies default locale", () => {
    const request = { dream: "A beautiful dream about the ocean." };
    const result = DreamRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.locale).toBe("ko");
    }
  });

  it("validates dream length", () => {
    expect(DreamRequestSchema.safeParse({ dream: "short" }).success).toBe(false);
    expect(DreamRequestSchema.safeParse({ dream: "a".repeat(2001) }).success).toBe(false);
  });

  it("accepts optional fields", () => {
    const request = {
      dream: "I dreamed about a beautiful garden with flowers.",
      symbols: ["garden", "flowers"],
      emotions: ["peaceful", "happy"],
      themes: ["nature"],
      context: ["stress relief"],
    };
    expect(DreamRequestSchema.safeParse(request).success).toBe(true);
  });

  it("accepts optional birth data", () => {
    const request = {
      dream: "A meaningful dream about my childhood home.",
      birth: {
        year: 1990,
        month: 5,
        day: 15,
        hour: 14,
        minute: 30,
        latitude: 37.5665,
        longitude: 126.978,
      },
    };
    expect(DreamRequestSchema.safeParse(request).success).toBe(true);
  });
});

describe("IChingReadingRequestSchema", () => {
  it("accepts valid request", () => {
    expect(IChingReadingRequestSchema.safeParse({}).success).toBe(true);
  });

  it("applies defaults", () => {
    const result = IChingReadingRequestSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.theme).toBe("general");
      expect(result.data.locale).toBe("ko");
    }
  });

  it("accepts optional fields", () => {
    const request = {
      question: "Should I change careers?",
      theme: "career",
      sajuElement: "wood",
    };
    expect(IChingReadingRequestSchema.safeParse(request).success).toBe(true);
  });

  it("validates question length", () => {
    const longQuestion = { question: "a".repeat(501) };
    expect(IChingReadingRequestSchema.safeParse(longQuestion).success).toBe(false);
  });
});

describe("ApiErrorSchema", () => {
  it("accepts valid error object", () => {
    const error = {
      code: "VALIDATION_ERROR",
      message: "Invalid input",
      status: 400,
    };
    expect(ApiErrorSchema.safeParse(error).success).toBe(true);
  });

  it("accepts optional details", () => {
    const error = {
      code: "VALIDATION_ERROR",
      message: "Invalid input",
      status: 400,
      details: { field: "email", reason: "invalid format" },
    };
    expect(ApiErrorSchema.safeParse(error).success).toBe(true);
  });

  it("rejects missing required fields", () => {
    expect(ApiErrorSchema.safeParse({ code: "ERROR" }).success).toBe(false);
    expect(ApiErrorSchema.safeParse({ message: "Error" }).success).toBe(false);
    expect(ApiErrorSchema.safeParse({ status: 500 }).success).toBe(false);
  });
});

describe("FeedbackRequestSchema", () => {
  const validFeedback = {
    record_id: "rec_123",
    rating: 5,
  };

  it("accepts valid feedback", () => {
    expect(FeedbackRequestSchema.safeParse(validFeedback).success).toBe(true);
  });

  it("validates rating range", () => {
    expect(FeedbackRequestSchema.safeParse({ ...validFeedback, rating: 0 }).success).toBe(false);
    expect(FeedbackRequestSchema.safeParse({ ...validFeedback, rating: 6 }).success).toBe(false);
    expect(FeedbackRequestSchema.safeParse({ ...validFeedback, rating: 1 }).success).toBe(true);
    expect(FeedbackRequestSchema.safeParse({ ...validFeedback, rating: 5 }).success).toBe(true);
  });

  it("accepts optional fields", () => {
    const withOptionals = {
      ...validFeedback,
      user_id: "user_123",
      feedback: "Great reading!",
      theme: "love",
    };
    expect(FeedbackRequestSchema.safeParse(withOptionals).success).toBe(true);
  });

  it("validates feedback length", () => {
    const longFeedback = { ...validFeedback, feedback: "a".repeat(1001) };
    expect(FeedbackRequestSchema.safeParse(longFeedback).success).toBe(false);
  });

  it("rejects empty record_id", () => {
    expect(FeedbackRequestSchema.safeParse({ ...validFeedback, record_id: "" }).success).toBe(false);
  });
});

describe("ConsultationThemeSchema", () => {
  it("accepts valid themes", () => {
    const themes = [
      "daily", "love", "career", "health", "wealth",
      "life_path", "spiritual", "family", "dream", "iching"
    ];
    for (const theme of themes) {
      expect(ConsultationThemeSchema.safeParse(theme).success).toBe(true);
    }
  });

  it("rejects invalid themes", () => {
    expect(ConsultationThemeSchema.safeParse("invalid").success).toBe(false);
    expect(ConsultationThemeSchema.safeParse("").success).toBe(false);
    expect(ConsultationThemeSchema.safeParse(null).success).toBe(false);
  });
});

describe("parseBody", () => {
  it("returns parsed data for valid input", () => {
    const result = parseBody(LocaleSchema, "ko");
    expect(result).toBe("ko");
  });

  it("throws error for invalid input", () => {
    expect(() => parseBody(LocaleSchema, "invalid")).toThrow("Validation failed");
  });

  it("includes field path in error message", () => {
    try {
      parseBody(BirthDataSchema, { year: "not-a-number" });
    } catch (e) {
      expect((e as Error).message).toContain("year");
    }
  });
});

describe("safeParseBody", () => {
  it("returns parsed data for valid input", () => {
    const result = safeParseBody(LocaleSchema, "ko");
    expect(result).toBe("ko");
  });

  it("returns null for invalid input", () => {
    const result = safeParseBody(LocaleSchema, "invalid");
    expect(result).toBeNull();
  });

  it("does not throw for invalid input", () => {
    expect(() => safeParseBody(LocaleSchema, "invalid")).not.toThrow();
  });
});

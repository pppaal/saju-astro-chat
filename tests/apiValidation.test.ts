/**
 * API 입력 유효성 검증 테스트
 * - 날짜/시간 형식 검증
 * - 좌표 범위 검증
 * - Locale 화이트리스트
 * - 텍스트 길이 제한
 * - 이메일 형식
 */



// 날짜 형식 검증 (YYYY-MM-DD)
function isValidDateString(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(year, month - 1, day);

  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

// 시간 형식 검증 (HH:MM)
function isValidTimeString(time: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(time)) return false;

  const [hour, minute] = time.split(":").map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

// 위도 검증 (-90 ~ 90)
function isValidLatitude(lat: number): boolean {
  return typeof lat === "number" && !isNaN(lat) && lat >= -90 && lat <= 90;
}

// 경도 검증 (-180 ~ 180)
function isValidLongitude(lng: number): boolean {
  return typeof lng === "number" && !isNaN(lng) && lng >= -180 && lng <= 180;
}

// Locale 화이트리스트
const ALLOWED_LOCALES = ["ko", "en", "ja", "zh", "es", "fr", "de", "pt", "ru"] as const;
type Locale = (typeof ALLOWED_LOCALES)[number];

function isValidLocale(locale: string): locale is Locale {
  return ALLOWED_LOCALES.includes(locale as Locale);
}

function sanitizeLocale(locale: string): Locale {
  return isValidLocale(locale) ? locale : "en";
}

// 텍스트 길이 검증
function validateTextLength(
  text: string,
  min: number,
  max: number
): { valid: boolean; error?: string } {
  if (text.length < min) {
    return { valid: false, error: `minimum_length_${min}` };
  }
  if (text.length > max) {
    return { valid: false, error: `maximum_length_${max}` };
  }
  return { valid: true };
}

// 이메일 형식 검증
function isValidEmail(email: string): boolean {
  // 간단한 이메일 정규식
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 사용자 이름 검증
function isValidUsername(name: string): boolean {
  // 2-50자, 특수문자 제한
  return /^[\w가-힣\s]{2,50}$/.test(name);
}

describe("API Validation: Date Format", () => {
  it("accepts valid date format", () => {
    expect(isValidDateString("2024-06-15")).toBe(true);
    expect(isValidDateString("1990-01-01")).toBe(true);
    expect(isValidDateString("2000-12-31")).toBe(true);
  });

  it("rejects invalid date format", () => {
    expect(isValidDateString("2024/06/15")).toBe(false);
    expect(isValidDateString("06-15-2024")).toBe(false);
    expect(isValidDateString("2024-6-15")).toBe(false);
    expect(isValidDateString("20240615")).toBe(false);
  });

  it("rejects invalid dates", () => {
    expect(isValidDateString("2024-02-30")).toBe(false); // 2월 30일 없음
    expect(isValidDateString("2024-13-01")).toBe(false); // 13월 없음
    expect(isValidDateString("2024-00-01")).toBe(false); // 0월 없음
  });

  it("handles leap year correctly", () => {
    expect(isValidDateString("2024-02-29")).toBe(true); // 윤년
    expect(isValidDateString("2023-02-29")).toBe(false); // 비윤년
  });
});

describe("API Validation: Time Format", () => {
  it("accepts valid time format", () => {
    expect(isValidTimeString("00:00")).toBe(true);
    expect(isValidTimeString("12:30")).toBe(true);
    expect(isValidTimeString("23:59")).toBe(true);
  });

  it("rejects invalid time format", () => {
    expect(isValidTimeString("24:00")).toBe(false);
    expect(isValidTimeString("12:60")).toBe(false);
    expect(isValidTimeString("1:30")).toBe(false);
    expect(isValidTimeString("12:5")).toBe(false);
    expect(isValidTimeString("12-30")).toBe(false);
  });

  it("rejects non-numeric time", () => {
    expect(isValidTimeString("ab:cd")).toBe(false);
    expect(isValidTimeString("")).toBe(false);
  });
});

describe("API Validation: Coordinates", () => {
  it("accepts valid latitude", () => {
    expect(isValidLatitude(0)).toBe(true);
    expect(isValidLatitude(90)).toBe(true);
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLatitude(37.5665)).toBe(true); // Seoul
  });

  it("rejects invalid latitude", () => {
    expect(isValidLatitude(91)).toBe(false);
    expect(isValidLatitude(-91)).toBe(false);
    expect(isValidLatitude(NaN)).toBe(false);
    expect(isValidLatitude(Infinity)).toBe(false);
  });

  it("accepts valid longitude", () => {
    expect(isValidLongitude(0)).toBe(true);
    expect(isValidLongitude(180)).toBe(true);
    expect(isValidLongitude(-180)).toBe(true);
    expect(isValidLongitude(126.978)).toBe(true); // Seoul
  });

  it("rejects invalid longitude", () => {
    expect(isValidLongitude(181)).toBe(false);
    expect(isValidLongitude(-181)).toBe(false);
    expect(isValidLongitude(NaN)).toBe(false);
  });
});

describe("API Validation: Locale", () => {
  it("accepts allowed locales", () => {
    expect(isValidLocale("ko")).toBe(true);
    expect(isValidLocale("en")).toBe(true);
    expect(isValidLocale("ja")).toBe(true);
    expect(isValidLocale("zh")).toBe(true);
  });

  it("rejects invalid locales", () => {
    expect(isValidLocale("kr")).toBe(false); // ko가 맞음
    expect(isValidLocale("jp")).toBe(false); // ja가 맞음
    expect(isValidLocale("cn")).toBe(false); // zh가 맞음
    expect(isValidLocale("")).toBe(false);
  });

  it("sanitizes to default locale", () => {
    expect(sanitizeLocale("ko")).toBe("ko");
    expect(sanitizeLocale("invalid")).toBe("en");
    expect(sanitizeLocale("'; DROP TABLE users;")).toBe("en");
  });
});

describe("API Validation: Text Length", () => {
  it("accepts text within limits", () => {
    expect(validateTextLength("Hello", 1, 100)).toEqual({ valid: true });
    expect(validateTextLength("가나다라마바사", 5, 20)).toEqual({ valid: true });
  });

  it("rejects text below minimum", () => {
    expect(validateTextLength("Hi", 5, 100)).toEqual({
      valid: false,
      error: "minimum_length_5",
    });
  });

  it("rejects text above maximum", () => {
    expect(validateTextLength("A".repeat(101), 1, 100)).toEqual({
      valid: false,
      error: "maximum_length_100",
    });
  });

  it("handles edge cases", () => {
    expect(validateTextLength("", 0, 100)).toEqual({ valid: true });
    expect(validateTextLength("", 1, 100)).toEqual({
      valid: false,
      error: "minimum_length_1",
    });
  });
});

describe("API Validation: Email", () => {
  it("accepts valid email formats", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("user.name@example.co.kr")).toBe(true);
    expect(isValidEmail("user+tag@example.com")).toBe(true);
  });

  it("rejects invalid email formats", () => {
    expect(isValidEmail("userexample.com")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
    expect(isValidEmail("user @example.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("API Validation: Username", () => {
  it("accepts valid usernames", () => {
    expect(isValidUsername("홍길동")).toBe(true);
    expect(isValidUsername("John Doe")).toBe(true);
    expect(isValidUsername("user123")).toBe(true);
  });

  it("rejects too short names", () => {
    expect(isValidUsername("A")).toBe(false);
  });

  it("rejects too long names", () => {
    expect(isValidUsername("A".repeat(51))).toBe(false);
  });

  it("rejects special characters", () => {
    expect(isValidUsername("user<script>")).toBe(false);
    expect(isValidUsername("user@name")).toBe(false);
  });
});

describe("API Validation: Birth Info", () => {
  interface BirthInfo {
    date: string;
    time: string;
    latitude: number;
    longitude: number;
    timezone?: string;
  }

  function validateBirthInfo(info: BirthInfo): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!isValidDateString(info.date)) {
      errors.push("invalid_date");
    }

    if (!isValidTimeString(info.time)) {
      errors.push("invalid_time");
    }

    if (!isValidLatitude(info.latitude)) {
      errors.push("invalid_latitude");
    }

    if (!isValidLongitude(info.longitude)) {
      errors.push("invalid_longitude");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  it("validates complete birth info", () => {
    const result = validateBirthInfo({
      date: "1990-05-15",
      time: "14:30",
      latitude: 37.5665,
      longitude: 126.978,
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("collects multiple errors", () => {
    const result = validateBirthInfo({
      date: "invalid",
      time: "25:00",
      latitude: 100,
      longitude: 200,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("invalid_date");
    expect(result.errors).toContain("invalid_time");
    expect(result.errors).toContain("invalid_latitude");
    expect(result.errors).toContain("invalid_longitude");
  });
});

describe("API Validation: Dream Text", () => {
  const MIN_DREAM_LENGTH = 10;
  const MAX_DREAM_LENGTH = 5000;

  function validateDreamText(text: string): { valid: boolean; error?: string } {
    const trimmed = text.trim();

    if (trimmed.length < MIN_DREAM_LENGTH) {
      return { valid: false, error: "dream_too_short" };
    }

    if (trimmed.length > MAX_DREAM_LENGTH) {
      return { valid: false, error: "dream_too_long" };
    }

    return { valid: true };
  }

  it("accepts valid dream description", () => {
    const dream = "I had a dream about flying over mountains and seeing a golden sunset.";
    expect(validateDreamText(dream)).toEqual({ valid: true });
  });

  it("rejects too short dream", () => {
    expect(validateDreamText("dream")).toEqual({
      valid: false,
      error: "dream_too_short",
    });
  });

  it("rejects too long dream", () => {
    expect(validateDreamText("x".repeat(5001))).toEqual({
      valid: false,
      error: "dream_too_long",
    });
  });

  it("trims whitespace before validation", () => {
    expect(validateDreamText("   dream   ")).toEqual({
      valid: false,
      error: "dream_too_short",
    });
  });
});

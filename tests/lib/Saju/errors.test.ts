// tests/lib/Saju/errors.test.ts
// Tests for Saju error classes

import { describe, it, expect } from "vitest";
import {
  // Error classes
  SajuError,
  SajuCalculationError,
  LunarConversionError,
  CompatibilityError,
  InterpretationError,
  SajuDataError,
  SajuCacheError,
  // Type guards
  isSajuError,
  isCalculationError,
  isLunarConversionError,
  isCompatibilityError,
  // Helpers
  wrapSajuError,
  wrapSajuErrorAsync,
  getErrorMessage,
} from "@/lib/Saju/errors";

// ============================================================
// Base SajuError Tests
// ============================================================

describe("SajuError", () => {
  it("should create error with code and message", () => {
    const error = new SajuError("TEST_CODE", "Test message");

    expect(error.code).toBe("TEST_CODE");
    expect(error.message).toBe("Test message");
    expect(error.name).toBe("SajuError");
  });

  it("should include details if provided", () => {
    const error = new SajuError("TEST_CODE", "Test message", { foo: "bar" });

    expect(error.details).toEqual({ foo: "bar" });
  });

  it("should serialize to JSON", () => {
    const error = new SajuError("TEST_CODE", "Test message", { foo: "bar" });
    const json = error.toJSON();

    expect(json.name).toBe("SajuError");
    expect(json.code).toBe("TEST_CODE");
    expect(json.message).toBe("Test message");
    expect(json.details).toEqual({ foo: "bar" });
  });

  it("should be instanceof Error", () => {
    const error = new SajuError("TEST_CODE", "Test");
    expect(error instanceof Error).toBe(true);
  });
});

// ============================================================
// SajuCalculationError Tests
// ============================================================

describe("SajuCalculationError", () => {
  it("should create error with CALCULATION_ERROR code", () => {
    const error = new SajuCalculationError("Calculation failed");

    expect(error.code).toBe("CALCULATION_ERROR");
    expect(error.name).toBe("SajuCalculationError");
  });

  describe("static factory methods", () => {
    it("invalidInput should create error with field and value", () => {
      const error = SajuCalculationError.invalidInput("birthDate", "invalid");

      expect(error.message).toContain("birthDate");
      expect(error.details).toEqual({ field: "birthDate", value: "invalid" });
    });

    it("missingData should create error with field", () => {
      const error = SajuCalculationError.missingData("birthTime");

      expect(error.message).toContain("birthTime");
      expect(error.details).toEqual({ field: "birthTime" });
    });

    it("outOfRange should create error with range info", () => {
      const error = SajuCalculationError.outOfRange("hour", 25, 0, 23);

      expect(error.message).toContain("25");
      expect(error.message).toContain("0");
      expect(error.message).toContain("23");
      expect(error.details).toEqual({ field: "hour", value: 25, min: 0, max: 23 });
    });
  });
});

// ============================================================
// LunarConversionError Tests
// ============================================================

describe("LunarConversionError", () => {
  it("should create error with LUNAR_CONVERSION_ERROR code", () => {
    const error = new LunarConversionError("Conversion failed");

    expect(error.code).toBe("LUNAR_CONVERSION_ERROR");
    expect(error.name).toBe("LunarConversionError");
  });

  describe("static factory methods", () => {
    it("unsupportedDate should create error with date", () => {
      const error = LunarConversionError.unsupportedDate("1800-01-01");

      expect(error.message).toContain("1800-01-01");
      expect(error.details).toEqual({ date: "1800-01-01" });
    });

    it("invalidLunarDate should create error with date parts", () => {
      const error = LunarConversionError.invalidLunarDate(2024, 13, 32);

      expect(error.message).toContain("2024-13-32");
      expect(error.details).toEqual({ year: 2024, month: 13, day: 32 });
    });
  });
});

// ============================================================
// CompatibilityError Tests
// ============================================================

describe("CompatibilityError", () => {
  it("should create error with COMPATIBILITY_ERROR code", () => {
    const error = new CompatibilityError("Compatibility failed");

    expect(error.code).toBe("COMPATIBILITY_ERROR");
    expect(error.name).toBe("CompatibilityError");
  });

  describe("static factory methods", () => {
    it("missingPillars should create error with person", () => {
      const error = CompatibilityError.missingPillars("person1");

      expect(error.message).toContain("person1");
      expect(error.details).toEqual({ person: "person1" });
    });

    it("incompatibleData should create error with reason", () => {
      const error = CompatibilityError.incompatibleData("Different formats");

      expect(error.message).toContain("Different formats");
      expect(error.details).toEqual({ reason: "Different formats" });
    });
  });
});

// ============================================================
// InterpretationError Tests
// ============================================================

describe("InterpretationError", () => {
  it("should create error with INTERPRETATION_ERROR code", () => {
    const error = new InterpretationError("Interpretation failed");

    expect(error.code).toBe("INTERPRETATION_ERROR");
    expect(error.name).toBe("InterpretationError");
  });

  describe("static factory methods", () => {
    it("unknownGeokguk should create error", () => {
      const error = InterpretationError.unknownGeokguk("unknown_type");

      expect(error.message).toContain("unknown_type");
      expect(error.details).toEqual({ geokguk: "unknown_type" });
    });

    it("unknownShinsal should create error", () => {
      const error = InterpretationError.unknownShinsal("unknown_shinsal");

      expect(error.message).toContain("unknown_shinsal");
      expect(error.details).toEqual({ shinsal: "unknown_shinsal" });
    });

    it("missingInterpretation should create error", () => {
      const error = InterpretationError.missingInterpretation("geokguk", "정관격");

      expect(error.message).toContain("geokguk");
      expect(error.message).toContain("정관격");
      expect(error.details).toEqual({ type: "geokguk", key: "정관격" });
    });
  });
});

// ============================================================
// SajuDataError Tests
// ============================================================

describe("SajuDataError", () => {
  it("should create error with DATA_ERROR code", () => {
    const error = new SajuDataError("Data error");

    expect(error.code).toBe("DATA_ERROR");
    expect(error.name).toBe("SajuDataError");
  });

  describe("static factory methods", () => {
    it("fileNotFound should create error with path", () => {
      const error = SajuDataError.fileNotFound("/path/to/file.json");

      expect(error.message).toContain("/path/to/file.json");
      expect(error.details).toEqual({ path: "/path/to/file.json" });
    });

    it("invalidFormat should create error with path and reason", () => {
      const error = SajuDataError.invalidFormat("/path/to/file.json", "Missing field");

      expect(error.message).toContain("/path/to/file.json");
      expect(error.message).toContain("Missing field");
    });

    it("missingField should create error with source and field", () => {
      const error = SajuDataError.missingField("geokguk.json", "description");

      expect(error.message).toContain("description");
      expect(error.message).toContain("geokguk.json");
    });
  });
});

// ============================================================
// SajuCacheError Tests
// ============================================================

describe("SajuCacheError", () => {
  it("should create error with CACHE_ERROR code", () => {
    const error = new SajuCacheError("Cache error");

    expect(error.code).toBe("CACHE_ERROR");
    expect(error.name).toBe("SajuCacheError");
  });

  describe("static factory methods", () => {
    it("serializationFailed should create error", () => {
      const error = SajuCacheError.serializationFailed("key123", "Circular reference");

      expect(error.message).toContain("serialize");
      expect(error.details).toEqual({ key: "key123", reason: "Circular reference" });
    });

    it("deserializationFailed should create error", () => {
      const error = SajuCacheError.deserializationFailed("key123", "Invalid JSON");

      expect(error.message).toContain("deserialize");
      expect(error.details).toEqual({ key: "key123", reason: "Invalid JSON" });
    });
  });
});

// ============================================================
// Type Guard Tests
// ============================================================

describe("Error Type Guards", () => {
  describe("isSajuError", () => {
    it("should return true for SajuError instances", () => {
      expect(isSajuError(new SajuError("CODE", "msg"))).toBe(true);
      expect(isSajuError(new SajuCalculationError("msg"))).toBe(true);
      expect(isSajuError(new LunarConversionError("msg"))).toBe(true);
    });

    it("should return false for non-SajuError", () => {
      expect(isSajuError(new Error("msg"))).toBe(false);
      expect(isSajuError("string")).toBe(false);
      expect(isSajuError(null)).toBe(false);
    });
  });

  describe("isCalculationError", () => {
    it("should return true only for SajuCalculationError", () => {
      expect(isCalculationError(new SajuCalculationError("msg"))).toBe(true);
      expect(isCalculationError(new SajuError("CODE", "msg"))).toBe(false);
    });
  });

  describe("isLunarConversionError", () => {
    it("should return true only for LunarConversionError", () => {
      expect(isLunarConversionError(new LunarConversionError("msg"))).toBe(true);
      expect(isLunarConversionError(new SajuError("CODE", "msg"))).toBe(false);
    });
  });

  describe("isCompatibilityError", () => {
    it("should return true only for CompatibilityError", () => {
      expect(isCompatibilityError(new CompatibilityError("msg"))).toBe(true);
      expect(isCompatibilityError(new SajuError("CODE", "msg"))).toBe(false);
    });
  });
});

// ============================================================
// Error Wrapper Tests
// ============================================================

describe("wrapSajuError", () => {
  it("should return result for successful function", () => {
    const result = wrapSajuError(() => "success", "test context");
    expect(result).toBe("success");
  });

  it("should re-throw SajuError unchanged", () => {
    const originalError = new SajuCalculationError("Original");

    expect(() => {
      wrapSajuError(() => {
        throw originalError;
      }, "test context");
    }).toThrow(originalError);
  });

  it("should wrap standard Error", () => {
    expect(() => {
      wrapSajuError(() => {
        throw new Error("Standard error");
      }, "test context");
    }).toThrow(SajuError);
  });

  it("should wrap unknown errors", () => {
    expect(() => {
      wrapSajuError(() => {
        throw "string error";
      }, "test context");
    }).toThrow(SajuError);
  });

  it("should include context in wrapped error", () => {
    try {
      wrapSajuError(() => {
        throw new Error("Original message");
      }, "my context");
    } catch (error) {
      expect((error as SajuError).message).toContain("my context");
    }
  });
});

describe("wrapSajuErrorAsync", () => {
  it("should return result for successful async function", async () => {
    const result = await wrapSajuErrorAsync(async () => "success", "test context");
    expect(result).toBe("success");
  });

  it("should re-throw SajuError unchanged", async () => {
    const originalError = new SajuCalculationError("Original");

    await expect(
      wrapSajuErrorAsync(async () => {
        throw originalError;
      }, "test context")
    ).rejects.toThrow(originalError);
  });

  it("should wrap standard Error", async () => {
    await expect(
      wrapSajuErrorAsync(async () => {
        throw new Error("Standard error");
      }, "test context")
    ).rejects.toThrow(SajuError);
  });
});

// ============================================================
// Error Message Tests
// ============================================================

describe("getErrorMessage", () => {
  it("should return Korean message for ko locale", () => {
    const error = new SajuCalculationError("Test");
    const message = getErrorMessage(error, "ko");

    expect(message).toContain("사주");
  });

  it("should return English message for en locale", () => {
    const error = new SajuCalculationError("Test");
    const message = getErrorMessage(error, "en");

    expect(message).toContain("Saju");
  });

  it("should return error message for unknown code", () => {
    const error = new SajuError("UNKNOWN_CODE_12345", "Custom message");
    const message = getErrorMessage(error, "ko");

    expect(message).toBe("Custom message");
  });

  it("should handle all error types", () => {
    const errors = [
      new SajuCalculationError("Test"),
      new LunarConversionError("Test"),
      new CompatibilityError("Test"),
      new InterpretationError("Test"),
      new SajuDataError("Test"),
      new SajuCacheError("Test"),
    ];

    errors.forEach((error) => {
      expect(getErrorMessage(error, "ko")).toBeTruthy();
      expect(getErrorMessage(error, "en")).toBeTruthy();
    });
  });
});

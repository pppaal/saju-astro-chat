/**
 * Tests for API Validation utilities
 * src/lib/api/validation.ts
 */
import { describe, it, expect } from "vitest";
import {
  validateFields,
  Patterns,
  CommonValidators,
  validateDestinyMapInput,
  validateTarotInput,
  validateDreamInput,
  validateBirthData,
  validateCompatibilityInput,
} from "@/lib/api/validation";

describe("validateFields", () => {
  describe("Required fields", () => {
    it("should fail when required field is missing", () => {
      const result = validateFields({}, { name: { required: true } });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("name is required");
    });

    it("should fail when required field is empty string", () => {
      const result = validateFields({ name: "" }, { name: { required: true } });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("name is required");
    });

    it("should fail when required field is null", () => {
      const result = validateFields({ name: null }, { name: { required: true } });
      expect(result.valid).toBe(false);
    });

    it("should pass when required field is present", () => {
      const result = validateFields({ name: "John" }, { name: { required: true } });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Type validation", () => {
    it("should validate string type", () => {
      const result = validateFields({ name: 123 }, { name: { type: "string" } });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("name must be a string");
    });

    it("should validate number type", () => {
      const result = validateFields({ age: "25" }, { age: { type: "number" } });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("age must be a number");
    });

    it("should validate boolean type", () => {
      const result = validateFields({ active: "true" }, { active: { type: "boolean" } });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("active must be a boolean");
    });

    it("should validate array type", () => {
      const result = validateFields({ items: "not-array" }, { items: { type: "array" } });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("items must be a array");
    });

    it("should validate object type", () => {
      const result = validateFields({ data: "string" }, { data: { type: "object" } });
      expect(result.valid).toBe(false);
    });
  });

  describe("Numeric range validation", () => {
    it("should fail when number is below min", () => {
      const result = validateFields({ age: 5 }, { age: { type: "number", min: 18 } });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("age must be at least 18");
    });

    it("should fail when number is above max", () => {
      const result = validateFields({ age: 150 }, { age: { type: "number", max: 120 } });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("age must be at most 120");
    });

    it("should pass when number is within range", () => {
      const result = validateFields({ age: 25 }, { age: { type: "number", min: 18, max: 120 } });
      expect(result.valid).toBe(true);
    });
  });

  describe("String length validation", () => {
    it("should fail when string is too short", () => {
      const result = validateFields({ name: "Jo" }, { name: { type: "string", minLength: 3 } });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("name must be at least 3 characters");
    });

    it("should fail when string is too long", () => {
      const result = validateFields({ name: "A".repeat(100) }, { name: { type: "string", maxLength: 50 } });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("name must be at most 50 characters");
    });

    it("should pass when string length is within range", () => {
      const result = validateFields({ name: "John" }, { name: { type: "string", minLength: 2, maxLength: 50 } });
      expect(result.valid).toBe(true);
    });
  });

  describe("Pattern validation", () => {
    it("should fail when pattern does not match", () => {
      const result = validateFields({ email: "invalid" }, { email: { type: "string", pattern: Patterns.EMAIL } });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("email has invalid format");
    });

    it("should pass when pattern matches", () => {
      const result = validateFields({ email: "test@example.com" }, { email: { type: "string", pattern: Patterns.EMAIL } });
      expect(result.valid).toBe(true);
    });
  });

  describe("Array length validation", () => {
    it("should fail when array has too few items", () => {
      const result = validateFields({ items: [1] }, { items: { type: "array", min: 2 } });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("items must have at least 2 items");
    });

    it("should fail when array has too many items", () => {
      const result = validateFields({ items: [1, 2, 3, 4, 5] }, { items: { type: "array", max: 3 } });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("items must have at most 3 items");
    });
  });

  describe("Enum validation", () => {
    it("should fail when value is not in enum", () => {
      const result = validateFields({ status: "unknown" }, { status: { enum: ["active", "inactive"] } });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("status must be one of: active, inactive");
    });

    it("should pass when value is in enum", () => {
      const result = validateFields({ status: "active" }, { status: { enum: ["active", "inactive"] } });
      expect(result.valid).toBe(true);
    });
  });

  describe("Custom validation", () => {
    it("should use custom validator function", () => {
      const result = validateFields(
        { age: 15 },
        { age: { custom: (v) => (v as number) < 18 ? "Must be 18 or older" : null } }
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Must be 18 or older");
    });

    it("should pass custom validation", () => {
      const result = validateFields(
        { age: 25 },
        { age: { custom: (v) => (v as number) < 18 ? "Must be 18 or older" : null } }
      );
      expect(result.valid).toBe(true);
    });
  });
});

describe("Patterns", () => {
  describe("EMAIL pattern", () => {
    it("should match valid emails", () => {
      expect(Patterns.EMAIL.test("test@example.com")).toBe(true);
      expect(Patterns.EMAIL.test("user.name@domain.co.kr")).toBe(true);
    });

    it("should reject invalid emails", () => {
      expect(Patterns.EMAIL.test("invalid")).toBe(false);
      expect(Patterns.EMAIL.test("@domain.com")).toBe(false);
      expect(Patterns.EMAIL.test("user@")).toBe(false);
    });
  });

  describe("DATE pattern", () => {
    it("should match valid dates", () => {
      expect(Patterns.DATE.test("2024-01-15")).toBe(true);
      expect(Patterns.DATE.test("1990-12-31")).toBe(true);
    });

    it("should reject invalid dates", () => {
      expect(Patterns.DATE.test("24-01-15")).toBe(false);
      expect(Patterns.DATE.test("2024/01/15")).toBe(false);
    });
  });

  describe("TIME pattern", () => {
    it("should match valid times", () => {
      expect(Patterns.TIME.test("14:30")).toBe(true);
      expect(Patterns.TIME.test("09:05:30")).toBe(true);
    });

    it("should reject invalid times", () => {
      expect(Patterns.TIME.test("2:30")).toBe(false);
      expect(Patterns.TIME.test("14-30")).toBe(false);
    });
  });

  describe("UUID pattern", () => {
    it("should match valid UUIDs", () => {
      expect(Patterns.UUID.test("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
      expect(Patterns.UUID.test("A550E840-E29B-41D4-A716-446655440000")).toBe(true);
    });

    it("should reject invalid UUIDs", () => {
      expect(Patterns.UUID.test("550e8400-e29b-41d4-a716")).toBe(false);
      expect(Patterns.UUID.test("not-a-uuid")).toBe(false);
    });
  });
});

describe("CommonValidators", () => {
  describe("birthDate validator", () => {
    it("should accept valid birth date", () => {
      const result = validateFields({ birthDate: "1990-05-15" }, { birthDate: CommonValidators.birthDate });
      expect(result.valid).toBe(true);
    });

    it("should reject invalid date format", () => {
      const result = validateFields({ birthDate: "05/15/1990" }, { birthDate: CommonValidators.birthDate });
      expect(result.valid).toBe(false);
    });

    it("should reject year before 1900", () => {
      const result = validateFields({ birthDate: "1850-05-15" }, { birthDate: CommonValidators.birthDate });
      expect(result.valid).toBe(false);
    });

    it("should reject year after 2100", () => {
      const result = validateFields({ birthDate: "2150-05-15" }, { birthDate: CommonValidators.birthDate });
      expect(result.valid).toBe(false);
    });
  });

  describe("latitude validator", () => {
    it("should accept valid latitude", () => {
      const result = validateFields({ latitude: 37.5665 }, { latitude: CommonValidators.latitude });
      expect(result.valid).toBe(true);
    });

    it("should reject latitude below -90", () => {
      const result = validateFields({ latitude: -91 }, { latitude: CommonValidators.latitude });
      expect(result.valid).toBe(false);
    });

    it("should reject latitude above 90", () => {
      const result = validateFields({ latitude: 91 }, { latitude: CommonValidators.latitude });
      expect(result.valid).toBe(false);
    });
  });

  describe("longitude validator", () => {
    it("should accept valid longitude", () => {
      const result = validateFields({ longitude: 126.978 }, { longitude: CommonValidators.longitude });
      expect(result.valid).toBe(true);
    });

    it("should reject longitude below -180", () => {
      const result = validateFields({ longitude: -181 }, { longitude: CommonValidators.longitude });
      expect(result.valid).toBe(false);
    });

    it("should reject longitude above 180", () => {
      const result = validateFields({ longitude: 181 }, { longitude: CommonValidators.longitude });
      expect(result.valid).toBe(false);
    });
  });

  describe("dreamText validator", () => {
    it("should accept valid dream text", () => {
      const result = validateFields(
        { dream: "I dreamed about flying over mountains and seas." },
        { dream: CommonValidators.dreamText }
      );
      expect(result.valid).toBe(true);
    });

    it("should reject too short dream text", () => {
      const result = validateFields({ dream: "Short" }, { dream: CommonValidators.dreamText });
      expect(result.valid).toBe(false);
    });

    it("should reject script injection", () => {
      const result = validateFields(
        { dream: "Normal dream text <script>alert('xss')</script>" },
        { dream: CommonValidators.dreamText }
      );
      expect(result.valid).toBe(false);
    });
  });
});

describe("Domain validators", () => {
  describe("validateDestinyMapInput", () => {
    const validInput = {
      birthDate: "1990-05-15",
      birthTime: "14:30",
      latitude: 37.5665,
      longitude: 126.978,
      theme: "life",
      lang: "ko",
    };

    it("should accept valid destiny map input", () => {
      const result = validateDestinyMapInput(validInput);
      expect(result.valid).toBe(true);
    });

    it("should reject invalid theme", () => {
      const result = validateDestinyMapInput({ ...validInput, theme: "invalid" });
      expect(result.valid).toBe(false);
    });

    it("should reject missing birth date", () => {
      const { birthDate, ...inputWithoutDate } = validInput;
      const result = validateDestinyMapInput(inputWithoutDate);
      expect(result.valid).toBe(false);
    });
  });

  describe("validateTarotInput", () => {
    const validInput = {
      category: "love",
      spreadId: "celtic_cross",
      cards: [1, 5, 10],
      language: "ko",
    };

    it("should accept valid tarot input", () => {
      const result = validateTarotInput(validInput);
      expect(result.valid).toBe(true);
    });

    it("should reject empty cards array", () => {
      const result = validateTarotInput({ ...validInput, cards: [] });
      expect(result.valid).toBe(false);
    });

    it("should reject too many cards", () => {
      const result = validateTarotInput({ ...validInput, cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] });
      expect(result.valid).toBe(false);
    });
  });

  describe("validateDreamInput", () => {
    it("should accept valid dream input", () => {
      const result = validateDreamInput({
        dream: "I had a vivid dream about flying over mountains and meeting strange creatures.",
        locale: "ko",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject too short dream", () => {
      const result = validateDreamInput({ dream: "Short", locale: "ko" });
      expect(result.valid).toBe(false);
    });
  });

  describe("validateBirthData", () => {
    const validData = {
      birthDate: "1990-05-15",
      birthTime: "14:30",
      latitude: 37.5665,
      longitude: 126.978,
      timezone: "Asia/Seoul",
      language: "ko",
    };

    it("should accept valid birth data", () => {
      const result = validateBirthData(validData);
      expect(result.valid).toBe(true);
    });

    it("should reject invalid timezone format", () => {
      const result = validateBirthData({ ...validData, timezone: "GMT+9" });
      expect(result.valid).toBe(false);
    });
  });

  describe("validateCompatibilityInput", () => {
    const validInput = {
      person1: {
        birthDate: "1990-05-15",
        birthTime: "14:30",
        latitude: 37.5665,
        longitude: 126.978,
      },
      person2: {
        birthDate: "1992-08-20",
        birthTime: "10:00",
        latitude: 35.1796,
        longitude: 129.0756,
      },
    };

    it("should accept valid compatibility input", () => {
      const result = validateCompatibilityInput(validInput);
      expect(result.valid).toBe(true);
    });

    it("should reject missing person1", () => {
      const { person1, ...inputWithoutPerson1 } = validInput;
      const result = validateCompatibilityInput(inputWithoutPerson1);
      expect(result.valid).toBe(false);
    });

    it("should reject invalid person2 data", () => {
      const result = validateCompatibilityInput({
        ...validInput,
        person2: { ...validInput.person2, latitude: 200 },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("person2"))).toBe(true);
    });
  });
});

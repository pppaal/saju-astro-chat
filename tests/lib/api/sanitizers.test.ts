/**
 * Tests for src/lib/api/sanitizers.ts
 * Input sanitization utilities
 */
import { describe, it, expect } from "vitest";
import {
  isRecord,
  cleanStringArray,
  normalizeMessages,
  sanitizeString,
  sanitizeNumber,
  sanitizeBoolean,
  sanitizeHtml,
  sanitizeEnum,
} from "@/lib/api/sanitizers";

describe("API Sanitizers", () => {
  describe("isRecord", () => {
    it("should return true for plain objects", () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ key: "value" })).toBe(true);
      expect(isRecord({ nested: { obj: true } })).toBe(true);
    });

    it("should return false for null", () => {
      expect(isRecord(null)).toBe(false);
    });

    it("should return false for arrays", () => {
      expect(isRecord([])).toBe(false);
      expect(isRecord([1, 2, 3])).toBe(false);
    });

    it("should return false for primitives", () => {
      expect(isRecord("string")).toBe(false);
      expect(isRecord(123)).toBe(false);
      expect(isRecord(true)).toBe(false);
      expect(isRecord(undefined)).toBe(false);
    });
  });

  describe("cleanStringArray", () => {
    it("should clean valid string arrays", () => {
      const result = cleanStringArray(["hello", "world"]);
      expect(result).toEqual(["hello", "world"]);
    });

    it("should return empty array for non-array input", () => {
      expect(cleanStringArray(null)).toEqual([]);
      expect(cleanStringArray("string")).toEqual([]);
      expect(cleanStringArray(123)).toEqual([]);
      expect(cleanStringArray({})).toEqual([]);
    });

    it("should filter out non-string values", () => {
      const result = cleanStringArray(["valid", 123, null, "also valid"]);
      expect(result).toEqual(["valid", "also valid"]);
    });

    it("should trim whitespace", () => {
      const result = cleanStringArray(["  hello  ", "  world  "]);
      expect(result).toEqual(["hello", "world"]);
    });

    it("should filter out empty strings after trim", () => {
      const result = cleanStringArray(["hello", "   ", "", "world"]);
      expect(result).toEqual(["hello", "world"]);
    });

    it("should limit array length", () => {
      const input = Array(30).fill("item");
      const result = cleanStringArray(input, 10);
      expect(result).toHaveLength(10);
    });

    it("should truncate long strings", () => {
      const longString = "a".repeat(100);
      const result = cleanStringArray([longString], 20, 10);
      expect(result[0]).toHaveLength(10);
    });
  });

  describe("normalizeMessages", () => {
    it("should normalize valid messages", () => {
      const messages = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there" },
      ];
      const result = normalizeMessages(messages);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ role: "user", content: "Hello" });
      expect(result[1]).toEqual({ role: "assistant", content: "Hi there" });
    });

    it("should return empty array for non-array input", () => {
      expect(normalizeMessages(null)).toEqual([]);
      expect(normalizeMessages("string")).toEqual([]);
      expect(normalizeMessages({})).toEqual([]);
    });

    it("should filter out invalid roles", () => {
      const messages = [
        { role: "user", content: "Valid" },
        { role: "invalid", content: "Invalid role" },
        { role: "system", content: "System" },
      ];
      const result = normalizeMessages(messages);

      expect(result).toHaveLength(2);
      expect(result.map((m) => m.role)).toEqual(["user", "system"]);
    });

    it("should filter out empty content", () => {
      const messages = [
        { role: "user", content: "Valid" },
        { role: "user", content: "" },
        { role: "user", content: "   " },
      ];
      const result = normalizeMessages(messages);

      expect(result).toHaveLength(1);
    });

    it("should trim content whitespace", () => {
      const messages = [{ role: "user", content: "  Hello  " }];
      const result = normalizeMessages(messages);

      expect(result[0].content).toBe("Hello");
    });

    it("should limit number of messages", () => {
      const messages = Array(30)
        .fill(null)
        .map(() => ({ role: "user" as const, content: "Message" }));
      const result = normalizeMessages(messages, { maxMessages: 10 });

      expect(result).toHaveLength(10);
    });

    it("should truncate long content", () => {
      const longContent = "a".repeat(3000);
      const messages = [{ role: "user", content: longContent }];
      const result = normalizeMessages(messages, { maxLength: 100 });

      expect(result[0].content).toHaveLength(100);
    });

    it("should use custom allowed roles", () => {
      const messages = [
        { role: "user", content: "User" },
        { role: "assistant", content: "Assistant" },
        { role: "system", content: "System" },
      ];
      const result = normalizeMessages(messages, {
        allowedRoles: new Set(["user"] as const),
      });

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe("user");
    });

    it("should filter out non-object messages", () => {
      const messages = [
        { role: "user", content: "Valid" },
        "invalid",
        null,
        123,
      ];
      const result = normalizeMessages(messages);

      expect(result).toHaveLength(1);
    });
  });

  describe("sanitizeString", () => {
    it("should return trimmed string", () => {
      expect(sanitizeString("  hello  ", 100)).toBe("hello");
    });

    it("should truncate long strings", () => {
      const long = "a".repeat(100);
      expect(sanitizeString(long, 10)).toHaveLength(10);
    });

    it("should return default for non-strings", () => {
      expect(sanitizeString(null, 100)).toBe("");
      expect(sanitizeString(123, 100)).toBe("");
      expect(sanitizeString(undefined, 100)).toBe("");
    });

    it("should use custom default value", () => {
      expect(sanitizeString(null, 100, "default")).toBe("default");
    });

    it("should return default for empty string after trim", () => {
      expect(sanitizeString("   ", 100, "default")).toBe("default");
    });
  });

  describe("sanitizeNumber", () => {
    it("should return number within range", () => {
      expect(sanitizeNumber(50, 0, 100, 0)).toBe(50);
    });

    it("should clamp to minimum", () => {
      expect(sanitizeNumber(-10, 0, 100, 0)).toBe(0);
    });

    it("should clamp to maximum", () => {
      expect(sanitizeNumber(150, 0, 100, 0)).toBe(100);
    });

    it("should return default for non-numbers", () => {
      expect(sanitizeNumber("50", 0, 100, 25)).toBe(25);
      expect(sanitizeNumber(null, 0, 100, 25)).toBe(25);
      expect(sanitizeNumber(undefined, 0, 100, 25)).toBe(25);
    });

    it("should return default for NaN and Infinity", () => {
      expect(sanitizeNumber(NaN, 0, 100, 25)).toBe(25);
      expect(sanitizeNumber(Infinity, 0, 100, 25)).toBe(25);
      expect(sanitizeNumber(-Infinity, 0, 100, 25)).toBe(25);
    });
  });

  describe("sanitizeBoolean", () => {
    it("should return boolean values as-is", () => {
      expect(sanitizeBoolean(true)).toBe(true);
      expect(sanitizeBoolean(false)).toBe(false);
    });

    it("should return default for non-booleans", () => {
      expect(sanitizeBoolean("true")).toBe(false);
      expect(sanitizeBoolean(1)).toBe(false);
      expect(sanitizeBoolean(null)).toBe(false);
    });

    it("should use custom default value", () => {
      expect(sanitizeBoolean("not a bool", true)).toBe(true);
    });
  });

  describe("sanitizeHtml", () => {
    it("should remove script tags", () => {
      const input = 'Hello <script>alert("xss")</script> World';
      expect(sanitizeHtml(input, 1000)).toBe("Hello  World");
    });

    it("should remove HTML tags", () => {
      const input = "<div><p>Hello</p></div>";
      expect(sanitizeHtml(input, 1000)).toBe("Hello");
    });

    it("should remove dangerous characters", () => {
      const input = "Hello <> {} World";
      expect(sanitizeHtml(input, 1000)).toBe("Hello   World");
    });

    it("should truncate long strings", () => {
      const input = "a".repeat(100);
      expect(sanitizeHtml(input, 10)).toHaveLength(10);
    });

    it("should return default for non-strings", () => {
      expect(sanitizeHtml(null, 1000)).toBe("");
      expect(sanitizeHtml(123, 1000)).toBe("");
    });

    it("should trim whitespace", () => {
      expect(sanitizeHtml("  hello  ", 1000)).toBe("hello");
    });

    it("should handle nested script tags", () => {
      const input = '<script type="text/javascript">evil()</script>Safe';
      expect(sanitizeHtml(input, 1000)).toBe("Safe");
    });
  });

  describe("sanitizeEnum", () => {
    it("should return valid enum value", () => {
      const allowed = ["a", "b", "c"] as const;
      expect(sanitizeEnum("a", allowed, "a")).toBe("a");
      expect(sanitizeEnum("b", allowed, "a")).toBe("b");
    });

    it("should return default for invalid value", () => {
      const allowed = ["a", "b", "c"] as const;
      expect(sanitizeEnum("x", allowed, "a")).toBe("a");
    });

    it("should return default for non-string values", () => {
      const allowed = ["a", "b", "c"] as const;
      expect(sanitizeEnum(123, allowed, "a")).toBe("a");
      expect(sanitizeEnum(null, allowed, "a")).toBe("a");
    });

    it("should work with longer enum values", () => {
      const allowed = ["light", "dark", "system"] as const;
      expect(sanitizeEnum("dark", allowed, "light")).toBe("dark");
      expect(sanitizeEnum("invalid", allowed, "light")).toBe("light");
    });
  });
});

/**
 * Text Guards Tests
 *
 * Tests for text sanitization and content filtering
 */

import { beforeEach } from "vitest";
import {
  FORBIDDEN_PATTERNS,
  PROMPT_BUDGET_CHARS,
  cleanText,
  guardText,
  containsForbidden,
  safetyMessage,
} from "@/lib/textGuards";

// Helper to reset regex lastIndex (global flag issue)
const testPattern = (pattern: RegExp, text: string): boolean => {
  pattern.lastIndex = 0;
  return pattern.test(text);
};

describe("FORBIDDEN_PATTERNS", () => {
  beforeEach(() => {
    // Reset all pattern lastIndex before each test
    FORBIDDEN_PATTERNS.forEach((p) => (p.lastIndex = 0));
  });

  it("has expected number of patterns", () => {
    expect(FORBIDDEN_PATTERNS.length).toBe(5);
  });

  it("detects PII patterns", () => {
    const piiPattern = FORBIDDEN_PATTERNS[0];
    expect(testPattern(piiPattern, "my ssn is 123")).toBe(true);
    expect(testPattern(piiPattern, "social security number")).toBe(true);
    expect(testPattern(piiPattern, "phone number")).toBe(true);
    expect(testPattern(piiPattern, "email address")).toBe(true);
  });

  it("detects finance patterns", () => {
    const financePattern = FORBIDDEN_PATTERNS[1];
    expect(testPattern(financePattern, "bitcoin investment")).toBe(true);
    expect(testPattern(financePattern, "crypto trading")).toBe(true);
    expect(testPattern(financePattern, "stock market")).toBe(true);
    expect(testPattern(financePattern, "forex trading")).toBe(true);
  });

  it("detects medical patterns", () => {
    const medicalPattern = FORBIDDEN_PATTERNS[2];
    expect(testPattern(medicalPattern, "diagnosis")).toBe(true);
    expect(testPattern(medicalPattern, "prescription")).toBe(true);
    expect(testPattern(medicalPattern, "medical advice")).toBe(true);
  });

  it("detects gambling patterns", () => {
    const gamblingPattern = FORBIDDEN_PATTERNS[3];
    expect(testPattern(gamblingPattern, "casino gambling")).toBe(true);
    expect(testPattern(gamblingPattern, "betting odds")).toBe(true);
    expect(testPattern(gamblingPattern, "poker game")).toBe(true);
  });

  it("detects self-harm patterns", () => {
    const selfHarmPattern = FORBIDDEN_PATTERNS[4];
    expect(testPattern(selfHarmPattern, "self-harm")).toBe(true);
    expect(testPattern(selfHarmPattern, "suicide")).toBe(true);
  });
});

describe("PROMPT_BUDGET_CHARS", () => {
  it("is set to 15000", () => {
    expect(PROMPT_BUDGET_CHARS).toBe(15000);
  });
});

describe("cleanText", () => {
  it("removes script tags", () => {
    const input = "<script>alert('xss')</script>Hello";
    expect(cleanText(input)).toBe("Hello");
  });

  it("removes HTML tags", () => {
    const input = "<p>Hello</p><div>World</div>";
    // Tags are removed, text concatenated
    expect(cleanText(input)).toBe("HelloWorld");
  });

  it("removes dangerous characters like braces", () => {
    const input = "Hello {World}";
    // Braces are removed, content preserved
    expect(cleanText(input)).toBe("Hello World");
  });

  it("collapses multiple spaces", () => {
    const input = "Hello    World";
    expect(cleanText(input)).toBe("Hello World");
  });

  it("trims whitespace", () => {
    const input = "  Hello World  ";
    expect(cleanText(input)).toBe("Hello World");
  });

  it("respects max length (default 1800)", () => {
    const input = "a".repeat(2000);
    expect(cleanText(input).length).toBe(1800);
  });

  it("respects custom max length", () => {
    const input = "a".repeat(200);
    expect(cleanText(input, 100).length).toBe(100);
  });

  it("handles empty/null input", () => {
    expect(cleanText("")).toBe("");
    expect(cleanText(null as unknown as string)).toBe("");
    expect(cleanText(undefined as unknown as string)).toBe("");
  });
});

describe("guardText", () => {
  it("cleans text first", () => {
    const input = "<script>alert('xss')</script>Hello";
    expect(guardText(input)).toBe("Hello");
  });

  it("filters PII terms", () => {
    const input = "Please give me your phone number";
    const result = guardText(input);
    expect(result).toContain("[filtered]");
    expect(result).not.toContain("phone number");
  });

  it("filters finance terms", () => {
    const input = "Tell me about bitcoin investment";
    const result = guardText(input);
    expect(result).toContain("[filtered]");
  });

  it("filters medical terms", () => {
    const input = "I need a diagnosis for my condition";
    const result = guardText(input);
    expect(result).toContain("[filtered]");
  });

  it("preserves safe text", () => {
    const input = "What is my fortune for today?";
    expect(guardText(input)).toBe("What is my fortune for today?");
  });

  it("respects max length", () => {
    const input = "a".repeat(2000);
    expect(guardText(input, 100).length).toBe(100);
  });
});

describe("containsForbidden", () => {
  beforeEach(() => {
    // Reset all pattern lastIndex before each test
    FORBIDDEN_PATTERNS.forEach((p) => (p.lastIndex = 0));
  });

  it("returns true for PII content", () => {
    FORBIDDEN_PATTERNS.forEach((p) => (p.lastIndex = 0));
    expect(containsForbidden("my social security number")).toBe(true);
  });

  it("returns true for email content", () => {
    FORBIDDEN_PATTERNS.forEach((p) => (p.lastIndex = 0));
    expect(containsForbidden("my email is test@test.com")).toBe(true);
  });

  it("returns true for finance content", () => {
    FORBIDDEN_PATTERNS.forEach((p) => (p.lastIndex = 0));
    expect(containsForbidden("invest in bitcoin")).toBe(true);
  });

  it("returns true for crypto content", () => {
    FORBIDDEN_PATTERNS.forEach((p) => (p.lastIndex = 0));
    expect(containsForbidden("crypto trading tips")).toBe(true);
  });

  it("returns true for medical content", () => {
    FORBIDDEN_PATTERNS.forEach((p) => (p.lastIndex = 0));
    expect(containsForbidden("give me a diagnosis")).toBe(true);
  });

  it("returns true for prescription content", () => {
    FORBIDDEN_PATTERNS.forEach((p) => (p.lastIndex = 0));
    expect(containsForbidden("prescription medicine")).toBe(true);
  });

  it("returns true for gambling content", () => {
    FORBIDDEN_PATTERNS.forEach((p) => (p.lastIndex = 0));
    expect(containsForbidden("casino betting")).toBe(true);
  });

  it("returns true for self-harm content", () => {
    FORBIDDEN_PATTERNS.forEach((p) => (p.lastIndex = 0));
    expect(containsForbidden("self-harm")).toBe(true);
  });

  it("returns false for safe content", () => {
    FORBIDDEN_PATTERNS.forEach((p) => (p.lastIndex = 0));
    expect(containsForbidden("What is my fortune?")).toBe(false);
    FORBIDDEN_PATTERNS.forEach((p) => (p.lastIndex = 0));
    expect(containsForbidden("Tell me about my zodiac sign")).toBe(false);
    FORBIDDEN_PATTERNS.forEach((p) => (p.lastIndex = 0));
    expect(containsForbidden("Daily horoscope please")).toBe(false);
  });
});

describe("safetyMessage", () => {
  it("returns Korean message for ko locale", () => {
    expect(safetyMessage("ko")).toContain("규제");
    expect(safetyMessage("ko-KR")).toContain("규제");
  });

  it("returns Japanese message for ja locale", () => {
    expect(safetyMessage("ja")).toContain("規制");
    expect(safetyMessage("ja-JP")).toContain("規制");
  });

  it("returns Chinese message for zh locale", () => {
    expect(safetyMessage("zh")).toContain("该主题");
    expect(safetyMessage("zh-CN")).toContain("该主题");
  });

  it("returns Spanish message for es locale", () => {
    expect(safetyMessage("es")).toContain("restringido");
    expect(safetyMessage("es-ES")).toContain("restringido");
  });

  it("returns French message for fr locale", () => {
    expect(safetyMessage("fr")).toContain("restreint");
    expect(safetyMessage("fr-FR")).toContain("restreint");
  });

  it("returns German message for de locale", () => {
    expect(safetyMessage("de")).toContain("Eingeschränkt");
  });

  it("returns Portuguese message for pt locale", () => {
    expect(safetyMessage("pt")).toContain("restrito");
  });

  it("returns Russian message for ru locale", () => {
    expect(safetyMessage("ru")).toContain("ограничена");
  });

  it("returns English message for en locale", () => {
    expect(safetyMessage("en")).toContain("can't be handled");
  });

  it("returns English message for unknown locale", () => {
    expect(safetyMessage("xyz")).toContain("can't be handled");
  });

  it("handles empty/null locale", () => {
    expect(safetyMessage("")).toContain("can't be handled");
    expect(safetyMessage(null as unknown as string)).toContain("can't be handled");
  });
});

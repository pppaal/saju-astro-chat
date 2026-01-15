/**
 * Extract Summary Tests
 *
 * Tests for summary extraction utility
 */


import { extractSummary } from "@/lib/consultation/saveConsultation";

describe("extractSummary", () => {
  it("returns empty string for empty input", () => {
    expect(extractSummary("")).toBe("");
  });

  it("returns empty string for undefined input", () => {
    // @ts-expect-error Testing undefined input
    expect(extractSummary(undefined)).toBe("");
  });

  it("extracts first sentence", () => {
    const text = "This is the first sentence. This is the second sentence.";
    const result = extractSummary(text);
    expect(result).toContain("first sentence");
  });

  it("combines two sentences if first is short", () => {
    const text = "Short. Second sentence here. Third sentence.";
    const result = extractSummary(text);
    expect(result).toContain("Short");
    expect(result).toContain("Second");
  });

  it("respects maxLength parameter", () => {
    const text = "This is a very long sentence that goes on and on. And another long sentence.";
    const result = extractSummary(text, 50);
    expect(result.length).toBeLessThanOrEqual(50);
  });

  it("adds ellipsis when truncated", () => {
    const text = "This is a very long sentence that needs to be truncated because it exceeds the maximum length allowed.";
    const result = extractSummary(text, 50);
    expect(result.endsWith("...")).toBe(true);
  });

  it("handles text without sentence endings", () => {
    const text = "This is text without any period at the end";
    const result = extractSummary(text, 100);
    expect(result).toBe("This is text without any period at the end");
  });

  it("handles exclamation marks as sentence endings", () => {
    const text = "What a great day! This is wonderful.";
    const result = extractSummary(text);
    expect(result).toContain("great day");
  });

  it("handles question marks as sentence endings", () => {
    const text = "Is this working? Yes it is.";
    const result = extractSummary(text);
    expect(result).toContain("working");
  });

  it("handles Korean period (。) as sentence ending", () => {
    const text = "이것은 첫 번째 문장입니다。 이것은 두 번째 문장입니다。";
    const result = extractSummary(text);
    expect(result).toContain("첫 번째");
  });

  it("returns original text if shorter than maxLength", () => {
    const text = "Short text.";
    const result = extractSummary(text, 200);
    expect(result).toBe("Short text.");
  });

  it("uses default maxLength of 200", () => {
    const longText = "A".repeat(300);
    const result = extractSummary(longText);
    expect(result.length).toBeLessThanOrEqual(200);
  });

  it("handles multiple sentence endings correctly", () => {
    const text = "First! Second? Third.";
    const result = extractSummary(text);
    expect(result.length).toBeGreaterThan(0);
  });

  it("handles whitespace after sentence endings", () => {
    const text = "First sentence.   Second sentence.";
    const result = extractSummary(text);
    expect(result).toContain("First sentence");
  });

  it("handles long first sentence only", () => {
    const text = "This is a very very long first sentence that takes up a lot of space but there is no second sentence.";
    const result = extractSummary(text);
    expect(result).toContain("long first sentence");
  });
});

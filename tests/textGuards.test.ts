/**
 * Text Guards 테스트
 * - 금지 패턴 감지
 * - 텍스트 클리닝
 * - XSS 방지
 * - 다국어 안전 메시지
 */


import {
  cleanText,
  guardText,
  containsForbidden,
  safetyMessage,
  FORBIDDEN_PATTERNS,
  PROMPT_BUDGET_CHARS,
} from "@/lib/textGuards";

describe("Text Guards: Forbidden Pattern Detection", () => {
  it("detects PII patterns", () => {
    expect(containsForbidden("What is my SSN?")).toBe(true);
    expect(containsForbidden("Tell me his phone number")).toBe(true);
    expect(containsForbidden("Share your email address")).toBe(true);
    expect(containsForbidden("What's your passport number")).toBe(true);
  });

  it("detects finance patterns", () => {
    expect(containsForbidden("Should I invest in bitcoin?")).toBe(true);
    expect(containsForbidden("Give me stock tips")).toBe(true);
    expect(containsForbidden("Best forex strategy")).toBe(true);
    expect(containsForbidden("Crypto trading advice")).toBe(true);
  });

  it("detects medical patterns", () => {
    expect(containsForbidden("Give me a diagnosis")).toBe(true);
    expect(containsForbidden("What prescription should I take")).toBe(true);
    expect(containsForbidden("I need medical advice")).toBe(true);
  });

  it("detects gambling patterns", () => {
    expect(containsForbidden("Best casino strategy")).toBe(true);
    expect(containsForbidden("Betting odds for today")).toBe(true);
    expect(containsForbidden("Play poker online")).toBe(true);
  });

  it("detects self-harm patterns", () => {
    expect(containsForbidden("I want to harm myself")).toBe(true);
    expect(containsForbidden("thinking about suicide")).toBe(true);
    expect(containsForbidden("end my life")).toBe(true);
  });

  it("allows safe content", () => {
    expect(containsForbidden("What does my saju say about love?")).toBe(false);
    expect(containsForbidden("Tell me about my career fortune")).toBe(false);
    expect(containsForbidden("오늘의 운세를 알려주세요")).toBe(false);
  });
});

describe("Text Guards: Text Cleaning", () => {
  it("removes script tags", () => {
    const input = "Hello <script>alert('xss')</script> World";
    expect(cleanText(input)).toBe("Hello World");
  });

  it("removes HTML tags", () => {
    const input = "<div><p>Hello</p></div>";
    expect(cleanText(input)).toBe("Hello");
  });

  it("removes special characters", () => {
    const input = "Hello {world} <test>";
    expect(cleanText(input)).toBe("Hello world test");
  });

  it("collapses multiple spaces", () => {
    const input = "Hello    World   Test";
    expect(cleanText(input)).toBe("Hello World Test");
  });

  it("trims whitespace", () => {
    const input = "   Hello World   ";
    expect(cleanText(input)).toBe("Hello World");
  });

  it("respects max length", () => {
    const input = "A".repeat(2000);
    expect(cleanText(input, 100).length).toBe(100);
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanText(null as unknown as string)).toBe("");
    expect(cleanText(undefined as unknown as string)).toBe("");
  });

  it("converts numbers to string", () => {
    expect(cleanText(12345 as unknown as string)).toBe("12345");
  });
});

describe("Text Guards: Guard Text (Filter + Clean)", () => {
  it("filters forbidden words", () => {
    const input = "Tell me about bitcoin investment";
    const result = guardText(input);
    expect(result).toContain("[filtered]");
    expect(result).not.toContain("bitcoin");
    expect(result).not.toContain("investment");
  });

  it("cleans and filters together", () => {
    const input = "<script>alert()</script> Check my SSN please";
    const result = guardText(input);
    expect(result).not.toContain("<script>");
    expect(result).toContain("[filtered]");
  });

  it("preserves safe content", () => {
    const input = "What is my love fortune today?";
    expect(guardText(input)).toBe("What is my love fortune today?");
  });

  it("respects max length", () => {
    const input = "A".repeat(2000);
    expect(guardText(input, 500).length).toBeLessThanOrEqual(500);
  });
});

describe("Text Guards: Safety Messages", () => {
  it("returns Korean message for ko locale", () => {
    const msg = safetyMessage("ko");
    expect(msg).toContain("규제");
    expect(msg).toContain("주제");
  });

  it("returns Japanese message for ja locale", () => {
    const msg = safetyMessage("ja");
    expect(msg).toContain("規制");
  });

  it("returns Chinese message for zh locale", () => {
    const msg = safetyMessage("zh");
    expect(msg).toContain("主题");
  });

  it("returns Spanish message for es locale", () => {
    const msg = safetyMessage("es");
    expect(msg).toContain("restringido");
  });

  it("returns French message for fr locale", () => {
    const msg = safetyMessage("fr");
    expect(msg).toContain("restreint");
  });

  it("returns German message for de locale", () => {
    const msg = safetyMessage("de");
    expect(msg).toContain("Eingeschränktes");
  });

  it("returns Portuguese message for pt locale", () => {
    const msg = safetyMessage("pt");
    expect(msg).toContain("restrito");
  });

  it("returns Russian message for ru locale", () => {
    const msg = safetyMessage("ru");
    expect(msg).toContain("ограничена");
  });

  it("returns English as default", () => {
    const msg = safetyMessage("en");
    expect(msg).toContain("can't be handled");
  });

  it("handles locale variants", () => {
    expect(safetyMessage("ko-KR")).toContain("규제");
    expect(safetyMessage("en-US")).toContain("can't be handled");
    expect(safetyMessage("ja-JP")).toContain("規制");
  });

  it("handles empty/null locale", () => {
    expect(safetyMessage("")).toContain("can't be handled");
    expect(safetyMessage(null as unknown as string)).toContain("can't be handled");
  });
});

describe("Text Guards: Constants", () => {
  it("has reasonable prompt budget", () => {
    expect(PROMPT_BUDGET_CHARS).toBeGreaterThan(10000);
    expect(PROMPT_BUDGET_CHARS).toBeLessThan(50000);
  });

  it("has multiple forbidden patterns", () => {
    expect(FORBIDDEN_PATTERNS.length).toBeGreaterThan(0);
    expect(Array.isArray(FORBIDDEN_PATTERNS)).toBe(true);
  });

  it("all patterns are RegExp", () => {
    FORBIDDEN_PATTERNS.forEach((pattern) => {
      expect(pattern).toBeInstanceOf(RegExp);
    });
  });
});

describe("Text Guards: Edge Cases", () => {
  it("handles mixed case in forbidden patterns", () => {
    expect(containsForbidden("BITCOIN")).toBe(true);
    expect(containsForbidden("Bitcoin")).toBe(true);
    expect(containsForbidden("bitcoin")).toBe(true);
  });

  it("handles multiple forbidden words", () => {
    const input = "Tell me about bitcoin and give me a diagnosis";
    const result = guardText(input);
    expect((result.match(/\[filtered\]/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it("handles unicode content", () => {
    const korean = "안녕하세요 오늘 운세 알려주세요";
    expect(cleanText(korean)).toBe(korean);
    expect(containsForbidden(korean)).toBe(false);
  });

  it("handles emoji", () => {
    const withEmoji = "What's my fortune? 🌟✨";
    expect(cleanText(withEmoji)).toBe(withEmoji);
  });

  it("handles nested HTML", () => {
    const nested = "<div><span><b>Hello</b></span></div>";
    expect(cleanText(nested)).toBe("Hello");
  });

  it("handles malformed HTML", () => {
    const malformed = "<div>Hello<span>World";
    const result = cleanText(malformed);
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });
});

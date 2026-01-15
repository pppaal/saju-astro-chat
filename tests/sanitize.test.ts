/**
 * Sanitize 테스트
 * - sanitizeLocaleText 함수 테스트
 * - 언어별 문자 필터링
 * - JSON 보존 로직
 * - 특수 문자 처리
 */


import { sanitizeLocaleText } from "@/lib/destiny-map/sanitize";

describe("sanitizeLocaleText: Korean (ko)", () => {
  it("preserves Korean Hangul characters", () => {
    const input = "안녕하세요 오늘의 운세입니다";
    const result = sanitizeLocaleText(input, "ko");
    expect(result).toBe(input);
  });

  it("preserves Korean with ASCII", () => {
    const input = "Hello 안녕 123";
    const result = sanitizeLocaleText(input, "ko");
    expect(result).toBe(input);
  });

  it("preserves CJK Hanja characters for Korean", () => {
    // Korean text often uses Chinese characters (Hanja) for traditional terms
    const input = "四柱八字 사주팔자";
    const result = sanitizeLocaleText(input, "ko");
    expect(result).toBe(input);
  });

  it("removes emojis from Korean text", () => {
    const input = "안녕하세요 😀 좋은 하루";
    const result = sanitizeLocaleText(input, "ko");
    expect(result).toBe("안녕하세요  좋은 하루");
  });

  it("preserves newlines and tabs in Korean", () => {
    const input = "첫째줄\n둘째줄\t탭";
    const result = sanitizeLocaleText(input, "ko");
    expect(result).toBe(input);
  });
});

describe("sanitizeLocaleText: Japanese (ja)", () => {
  it("preserves Hiragana", () => {
    const input = "こんにちは";
    const result = sanitizeLocaleText(input, "ja");
    expect(result).toBe(input);
  });

  it("preserves Katakana", () => {
    const input = "カタカナ";
    const result = sanitizeLocaleText(input, "ja");
    expect(result).toBe(input);
  });

  it("preserves Kanji", () => {
    const input = "日本語";
    const result = sanitizeLocaleText(input, "ja");
    expect(result).toBe(input);
  });

  it("preserves mixed Japanese text (period may be filtered)", () => {
    const input = "今日は良い日ですHello 123";
    const result = sanitizeLocaleText(input, "ja");
    expect(result).toBe(input);
    // Note: Japanese ideographic period (。U+3002) is outside allowed ranges
    // The regex allows: ASCII, Hiragana, Katakana, Katakana extensions, and CJK
  });

  it("preserves Katakana extensions", () => {
    // Katakana Phonetic Extensions (U+31F0-U+31FF)
    const input = "ㇰㇱㇲ";
    const result = sanitizeLocaleText(input, "ja");
    expect(result).toBe(input);
  });
});

describe("sanitizeLocaleText: Chinese (zh)", () => {
  it("preserves Simplified Chinese", () => {
    const input = "你好世界";
    const result = sanitizeLocaleText(input, "zh");
    expect(result).toBe(input);
  });

  it("preserves Traditional Chinese", () => {
    const input = "傳統中文";
    const result = sanitizeLocaleText(input, "zh");
    expect(result).toBe(input);
  });

  it("preserves mixed Chinese and ASCII", () => {
    const input = "Hello 你好 123";
    const result = sanitizeLocaleText(input, "zh");
    expect(result).toBe(input);
  });
});

describe("sanitizeLocaleText: Spanish (es)", () => {
  it("preserves Spanish with accents", () => {
    const input = "¡Hola! ¿Cómo estás?";
    const result = sanitizeLocaleText(input, "es");
    expect(result).toBe(input);
  });

  it("preserves ñ character", () => {
    const input = "España mañana";
    const result = sanitizeLocaleText(input, "es");
    expect(result).toBe(input);
  });

  it("preserves Latin extended characters", () => {
    const input = "áéíóú ÁÉÍÓÚ üö";
    const result = sanitizeLocaleText(input, "es");
    expect(result).toBe(input);
  });

  it("removes characters outside Latin-1", () => {
    const input = "Hola 你好";
    const result = sanitizeLocaleText(input, "es");
    expect(result).toBe("Hola ");
  });
});

describe("sanitizeLocaleText: Default / English", () => {
  it("preserves basic ASCII", () => {
    const input = "Hello, World! 123";
    const result = sanitizeLocaleText(input, "en");
    expect(result).toBe(input);
  });

  it("preserves extended Unicode for default locale", () => {
    // Default allows most BMP printable chars
    const input = "Hello 世界 مرحبا";
    const result = sanitizeLocaleText(input, "en");
    expect(result).toBe(input);
  });

  it("uses default regex for unknown locale", () => {
    const input = "Test 테스트";
    const result = sanitizeLocaleText(input, "unknown");
    expect(result).toBe(input);
  });
});

describe("sanitizeLocaleText: JSON Preservation", () => {
  it("does not alter JSON starting with {", () => {
    const input = '{"key": "value 😀"}';
    const result = sanitizeLocaleText(input, "ko");
    expect(result).toBe(input);
  });

  it("does not alter JSON containing lifeTimeline", () => {
    const input = 'some text with "lifeTimeline" key 😀';
    const result = sanitizeLocaleText(input, "ko");
    expect(result).toBe(input);
  });

  it("does not alter JSON containing categoryAnalysis", () => {
    const input = 'some text with "categoryAnalysis" data 😀';
    const result = sanitizeLocaleText(input, "ko");
    expect(result).toBe(input);
  });

  it("preserves complex JSON structure", () => {
    const input = `{
      "lifeTimeline": [
        {"age": 25, "event": "결혼 🎉"}
      ],
      "categoryAnalysis": {
        "career": "좋음"
      }
    }`;
    const result = sanitizeLocaleText(input, "ko");
    expect(result).toBe(input);
  });
});

describe("sanitizeLocaleText: Edge Cases", () => {
  it("returns empty string for empty input", () => {
    expect(sanitizeLocaleText("", "ko")).toBe("");
  });

  it("returns null/undefined as-is", () => {
    // @ts-expect-error - testing null handling
    expect(sanitizeLocaleText(null, "ko")).toBe(null);
    // @ts-expect-error - testing undefined handling
    expect(sanitizeLocaleText(undefined, "ko")).toBe(undefined);
  });

  it("preserves whitespace only text", () => {
    const input = "   \t\n  ";
    const result = sanitizeLocaleText(input, "ko");
    expect(result).toBe(input);
  });

  it("handles control characters correctly", () => {
    // Tab (0x09), LF (0x0A), CR (0x0D) should be preserved
    const input = "line1\tline2\nline3\rline4";
    const result = sanitizeLocaleText(input, "ko");
    expect(result).toBe(input);
  });

  it("removes null bytes and other control chars", () => {
    const input = "hello\x00world\x01test";
    const result = sanitizeLocaleText(input, "ko");
    // All control chars outside allowed set (0x09, 0x0A, 0x0D, 0x20-0x7E) are removed
    expect(result).toBe("helloworldtest");
  });

  it("handles very long strings", () => {
    const longString = "가".repeat(10000);
    const result = sanitizeLocaleText(longString, "ko");
    expect(result).toBe(longString);
  });

  it("handles mixed language content based on target locale", () => {
    const input = "English 日本語 한국어 中文";

    // Korean locale keeps Hangul + CJK but Japanese-specific chars may be affected
    const koResult = sanitizeLocaleText(input, "ko");
    expect(koResult).toContain("한국어");
    expect(koResult).toContain("中文");

    // Japanese locale keeps all CJK + kana
    const jaResult = sanitizeLocaleText(input, "ja");
    expect(jaResult).toContain("日本語");
  });
});

describe("sanitizeLocaleText: Security", () => {
  it("handles HTML-like content (not removed, just chars filtered)", () => {
    // This function doesn't strip HTML, just invalid chars
    const input = "<script>alert('xss')</script>";
    const result = sanitizeLocaleText(input, "ko");
    // Should preserve ASCII chars including < and >
    expect(result).toBe(input);
  });

  it("handles SQL-like content", () => {
    const input = "'; DROP TABLE users; --";
    const result = sanitizeLocaleText(input, "en");
    // Should preserve ASCII
    expect(result).toBe(input);
  });

  it("handles Unicode normalization edge cases", () => {
    // Combining characters
    const input = "café"; // e + combining acute
    const result = sanitizeLocaleText(input, "es");
    expect(result.length).toBeGreaterThan(0);
  });
});

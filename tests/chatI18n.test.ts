/**
 * Chat i18n 테스트
 * - CHAT_I18N 번역 완성도
 * - detectCrisis 함수
 * - LangKey 타입 지원
 */

import { describe, it, expect } from "vitest";
import {
  CHAT_I18N,
  CRISIS_KEYWORDS,
  detectCrisis,
  type LangKey,
  type Copy,
} from "@/components/destiny-map/chat-i18n";

describe("CHAT_I18N", () => {
  const supportedLanguages: LangKey[] = ["en", "ko", "ja", "zh", "es", "fr", "de", "pt", "ru"];

  it("supports all expected languages", () => {
    supportedLanguages.forEach((lang) => {
      expect(CHAT_I18N[lang]).toBeDefined();
    });
  });

  it("has all required keys for English", () => {
    const requiredKeys: (keyof Copy)[] = [
      "placeholder",
      "send",
      "thinking",
      "empty",
      "error",
      "fallbackNote",
      "safetyNote",
      "noResponse",
      "uploadCv",
      "attached",
      "parsingPdf",
      "tarotPrompt",
      "tarotButton",
      "tarotDesc",
      "crisisTitle",
      "crisisMessage",
      "crisisHotline",
      "crisisHotlineNumber",
      "crisisClose",
      "welcomeBack",
      "groundingTip",
      "newChat",
      "previousChats",
      "noHistory",
      "loadSession",
      "deleteSession",
      "confirmDelete",
      "cancel",
      "today",
      "yesterday",
      "daysAgo",
      "messages",
    ];

    requiredKeys.forEach((key) => {
      expect(CHAT_I18N.en[key]).toBeDefined();
      expect(typeof CHAT_I18N.en[key]).toBe("string");
      expect(CHAT_I18N.en[key].length).toBeGreaterThan(0);
    });
  });

  it("has all required keys for Korean", () => {
    const requiredKeys: (keyof Copy)[] = [
      "placeholder",
      "send",
      "thinking",
      "empty",
      "error",
    ];

    requiredKeys.forEach((key) => {
      expect(CHAT_I18N.ko[key]).toBeDefined();
      expect(typeof CHAT_I18N.ko[key]).toBe("string");
      expect(CHAT_I18N.ko[key].length).toBeGreaterThan(0);
    });
  });

  it("has same key structure across all languages", () => {
    const englishKeys = Object.keys(CHAT_I18N.en) as (keyof Copy)[];

    supportedLanguages.forEach((lang) => {
      englishKeys.forEach((key) => {
        expect(CHAT_I18N[lang][key]).toBeDefined();
        expect(typeof CHAT_I18N[lang][key]).toBe("string");
      });
    });
  });

  it("has non-empty crisis hotline numbers for all languages", () => {
    supportedLanguages.forEach((lang) => {
      expect(CHAT_I18N[lang].crisisHotlineNumber).toBeDefined();
      expect(CHAT_I18N[lang].crisisHotlineNumber.length).toBeGreaterThan(0);
    });
  });

  it("Korean crisis hotline includes expected numbers", () => {
    const koHotline = CHAT_I18N.ko.crisisHotlineNumber;
    expect(koHotline).toContain("1393");
  });

  it("Japanese crisis hotline includes expected numbers", () => {
    const jaHotline = CHAT_I18N.ja.crisisHotlineNumber;
    expect(jaHotline).toContain("0570");
  });

  it("US crisis hotline includes 988", () => {
    const enHotline = CHAT_I18N.en.crisisHotlineNumber;
    expect(enHotline).toContain("988");
  });

  describe("placeholder messages", () => {
    it("English placeholder asks for specific input", () => {
      expect(CHAT_I18N.en.placeholder.toLowerCase()).toContain("when");
    });

    it("Korean placeholder asks for specific input", () => {
      expect(CHAT_I18N.ko.placeholder).toContain("언제");
    });

    it("Japanese placeholder asks for specific input", () => {
      expect(CHAT_I18N.ja.placeholder).toContain("いつ");
    });
  });

  describe("error messages", () => {
    it("English error message is user-friendly", () => {
      expect(CHAT_I18N.en.error.toLowerCase()).toContain("error");
      expect(CHAT_I18N.en.error.toLowerCase()).toContain("try");
    });

    it("Korean error message is user-friendly", () => {
      expect(CHAT_I18N.ko.error).toContain("오류");
    });
  });

  describe("session management", () => {
    it("has session-related translations", () => {
      supportedLanguages.forEach((lang) => {
        expect(CHAT_I18N[lang].newChat).toBeDefined();
        expect(CHAT_I18N[lang].previousChats).toBeDefined();
        expect(CHAT_I18N[lang].loadSession).toBeDefined();
        expect(CHAT_I18N[lang].deleteSession).toBeDefined();
      });
    });
  });

  describe("time labels", () => {
    it("has time-related translations", () => {
      supportedLanguages.forEach((lang) => {
        expect(CHAT_I18N[lang].today).toBeDefined();
        expect(CHAT_I18N[lang].yesterday).toBeDefined();
        expect(CHAT_I18N[lang].daysAgo).toBeDefined();
      });
    });

    it("Korean time labels are in Korean", () => {
      expect(CHAT_I18N.ko.today).toBe("오늘");
      expect(CHAT_I18N.ko.yesterday).toBe("어제");
    });
  });
});

describe("CRISIS_KEYWORDS", () => {
  it("has keywords for Korean", () => {
    expect(CRISIS_KEYWORDS.ko).toBeDefined();
    expect(CRISIS_KEYWORDS.ko.length).toBeGreaterThan(0);
  });

  it("has keywords for English", () => {
    expect(CRISIS_KEYWORDS.en).toBeDefined();
    expect(CRISIS_KEYWORDS.en.length).toBeGreaterThan(0);
  });

  it("Korean keywords include expected phrases", () => {
    expect(CRISIS_KEYWORDS.ko).toContain("자살");
    expect(CRISIS_KEYWORDS.ko).toContain("죽고 싶");
  });

  it("English keywords include expected phrases", () => {
    expect(CRISIS_KEYWORDS.en).toContain("suicide");
    expect(CRISIS_KEYWORDS.en).toContain("kill myself");
  });
});

describe("detectCrisis", () => {
  describe("Korean detection", () => {
    it("detects 자살 keyword", () => {
      expect(detectCrisis("자살하고 싶어요", "ko")).toBe(true);
    });

    it("detects 죽고 싶 keyword", () => {
      expect(detectCrisis("너무 힘들어서 죽고 싶어요", "ko")).toBe(true);
    });

    it("detects 끝내고 싶 keyword", () => {
      expect(detectCrisis("모든 것을 끝내고 싶어", "ko")).toBe(true);
    });

    it("does not false positive on normal text", () => {
      expect(detectCrisis("오늘 날씨가 좋네요", "ko")).toBe(false);
      expect(detectCrisis("직장을 구하고 있어요", "ko")).toBe(false);
    });

    it("does not detect partial matches", () => {
      // "죽" alone should not trigger (not in keywords)
      expect(detectCrisis("죽순을 먹었어요", "ko")).toBe(false);
    });
  });

  describe("English detection", () => {
    it("detects suicide keyword", () => {
      expect(detectCrisis("I'm thinking about suicide", "en")).toBe(true);
    });

    it("detects kill myself keyword", () => {
      expect(detectCrisis("I want to kill myself", "en")).toBe(true);
    });

    it("detects want to die keyword", () => {
      expect(detectCrisis("I just want to die", "en")).toBe(true);
    });

    it("detects end it all keyword", () => {
      expect(detectCrisis("I want to end it all", "en")).toBe(true);
    });

    it("detects self harm keyword", () => {
      expect(detectCrisis("I've been thinking about self harm", "en")).toBe(true);
    });

    it("does not false positive on normal text", () => {
      expect(detectCrisis("The weather is nice today", "en")).toBe(false);
      expect(detectCrisis("I'm looking for a job", "en")).toBe(false);
    });

    it("is case insensitive", () => {
      expect(detectCrisis("I WANT TO KILL MYSELF", "en")).toBe(true);
      expect(detectCrisis("SUICIDE is not the answer", "en")).toBe(true);
    });
  });

  describe("fallback behavior", () => {
    it("uses English keywords for unsupported languages", () => {
      // Japanese uses English fallback since no Japanese keywords defined
      expect(detectCrisis("I want to kill myself", "ja")).toBe(true);
    });

    it("uses English keywords for French", () => {
      expect(detectCrisis("suicide", "fr")).toBe(true);
    });

    it("uses English keywords for German", () => {
      expect(detectCrisis("want to die", "de")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      expect(detectCrisis("", "en")).toBe(false);
      expect(detectCrisis("", "ko")).toBe(false);
    });

    it("handles whitespace-only string", () => {
      expect(detectCrisis("   ", "en")).toBe(false);
    });

    it("handles very long text", () => {
      const longText = "This is a normal message. ".repeat(100);
      expect(detectCrisis(longText, "en")).toBe(false);
    });

    it("handles text with keyword at start", () => {
      expect(detectCrisis("suicide prevention is important", "en")).toBe(true);
    });

    it("handles text with keyword at end", () => {
      expect(detectCrisis("Let's talk about suicide", "en")).toBe(true);
    });

    it("handles multiple keywords in same text", () => {
      expect(detectCrisis("suicide and self harm", "en")).toBe(true);
    });
  });
});

describe("LangKey type coverage", () => {
  it("all LangKeys are valid keys in CHAT_I18N", () => {
    const langKeys: LangKey[] = ["en", "ko", "ja", "zh", "es", "fr", "de", "pt", "ru"];

    langKeys.forEach((key) => {
      expect(CHAT_I18N[key]).toBeDefined();
    });
  });
});

describe("Copy type completeness", () => {
  it("all Copy fields have translations in English", () => {
    const copy = CHAT_I18N.en;

    // Check that no fields are undefined or empty
    Object.entries(copy).forEach(([key, value]) => {
      expect(value).toBeDefined();
      expect(value).not.toBe("");
    });
  });

  it("English is the most complete translation", () => {
    const englishKeyCount = Object.keys(CHAT_I18N.en).length;

    Object.keys(CHAT_I18N).forEach((lang) => {
      const langKeyCount = Object.keys(CHAT_I18N[lang as LangKey]).length;
      expect(langKeyCount).toBe(englishKeyCount);
    });
  });
});

describe("Grounding and Crisis Support", () => {
  it("has grounding tips in all languages", () => {
    const langs: LangKey[] = ["en", "ko", "ja", "zh", "es", "fr", "de", "pt", "ru"];

    langs.forEach((lang) => {
      expect(CHAT_I18N[lang].groundingTip).toBeDefined();
      expect(CHAT_I18N[lang].groundingTip.length).toBeGreaterThan(10);
    });
  });

  it("grounding tips mention breathing or observation", () => {
    // English
    expect(
      CHAT_I18N.en.groundingTip.toLowerCase().includes("breath") ||
      CHAT_I18N.en.groundingTip.toLowerCase().includes("see")
    ).toBe(true);

    // Korean
    expect(
      CHAT_I18N.ko.groundingTip.includes("숨") ||
      CHAT_I18N.ko.groundingTip.includes("보이는")
    ).toBe(true);
  });

  it("has welcome back messages", () => {
    const langs: LangKey[] = ["en", "ko", "ja", "zh", "es", "fr", "de", "pt", "ru"];

    langs.forEach((lang) => {
      expect(CHAT_I18N[lang].welcomeBack).toBeDefined();
      expect(CHAT_I18N[lang].welcomeBack.length).toBeGreaterThan(5);
    });
  });
});

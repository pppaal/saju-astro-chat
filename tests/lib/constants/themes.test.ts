/**
 * Theme Constants Tests
 *
 * Tests for theme descriptions and utilities
 */


import {
  THEME_DESCRIPTIONS,
  VALID_THEMES,
  getThemeDescription,
  buildThemeContext,
  isValidTheme,
  type ThemeKey,
} from "@/lib/constants/themes";

describe("THEME_DESCRIPTIONS", () => {
  it("contains all valid themes", () => {
    const themes = Object.keys(THEME_DESCRIPTIONS) as ThemeKey[];
    expect(themes).toHaveLength(11);
    expect(themes).toContain("love");
    expect(themes).toContain("career");
    expect(themes).toContain("wealth");
    expect(themes).toContain("health");
    expect(themes).toContain("family");
    expect(themes).toContain("today");
    expect(themes).toContain("month");
    expect(themes).toContain("year");
    expect(themes).toContain("newyear");
    expect(themes).toContain("life");
    expect(themes).toContain("chat");
  });

  it("has ko and en descriptions for each theme", () => {
    for (const theme of Object.keys(THEME_DESCRIPTIONS) as ThemeKey[]) {
      expect(THEME_DESCRIPTIONS[theme].ko).toBeDefined();
      expect(THEME_DESCRIPTIONS[theme].en).toBeDefined();
      expect(typeof THEME_DESCRIPTIONS[theme].ko).toBe("string");
      expect(typeof THEME_DESCRIPTIONS[theme].en).toBe("string");
    }
  });

  it("love theme has correct descriptions", () => {
    expect(THEME_DESCRIPTIONS.love.ko).toContain("연애");
    expect(THEME_DESCRIPTIONS.love.en).toContain("Love");
  });

  it("career theme has correct descriptions", () => {
    expect(THEME_DESCRIPTIONS.career.ko).toContain("직업");
    expect(THEME_DESCRIPTIONS.career.en).toContain("Career");
  });
});

describe("VALID_THEMES", () => {
  it("contains 11 themes", () => {
    expect(VALID_THEMES).toHaveLength(11);
  });

  it("matches THEME_DESCRIPTIONS keys", () => {
    const descriptionKeys = Object.keys(THEME_DESCRIPTIONS);
    expect(VALID_THEMES.length).toBe(descriptionKeys.length);
    for (const theme of VALID_THEMES) {
      expect(descriptionKeys).toContain(theme);
    }
  });
});

describe("getThemeDescription", () => {
  it("returns correct description for valid themes", () => {
    expect(getThemeDescription("love")).toEqual(THEME_DESCRIPTIONS.love);
    expect(getThemeDescription("career")).toEqual(THEME_DESCRIPTIONS.career);
    expect(getThemeDescription("wealth")).toEqual(THEME_DESCRIPTIONS.wealth);
  });

  it("returns chat description for invalid themes", () => {
    expect(getThemeDescription("invalid")).toEqual(THEME_DESCRIPTIONS.chat);
    expect(getThemeDescription("")).toEqual(THEME_DESCRIPTIONS.chat);
    expect(getThemeDescription("unknown")).toEqual(THEME_DESCRIPTIONS.chat);
  });
});

describe("buildThemeContext", () => {
  it("builds Korean context string", () => {
    const context = buildThemeContext("love", "ko");
    expect(context).toContain("현재 상담 테마");
    expect(context).toContain("love");
    expect(context).toContain("연애");
    expect(context).toContain("이 테마에 맞춰");
  });

  it("builds English context string", () => {
    const context = buildThemeContext("love", "en");
    expect(context).toContain("Current theme");
    expect(context).toContain("love");
    expect(context).toContain("Love");
    expect(context).toContain("Focus your answer");
  });

  it("handles career theme in Korean", () => {
    const context = buildThemeContext("career", "ko");
    expect(context).toContain("career");
    expect(context).toContain("직업");
  });

  it("handles career theme in English", () => {
    const context = buildThemeContext("career", "en");
    expect(context).toContain("career");
    expect(context).toContain("Career");
  });

  it("falls back to chat description for invalid theme", () => {
    const context = buildThemeContext("invalid", "ko");
    expect(context).toContain("invalid");
    expect(context).toContain(THEME_DESCRIPTIONS.chat.ko);
  });
});

describe("isValidTheme", () => {
  it("returns true for valid themes", () => {
    expect(isValidTheme("love")).toBe(true);
    expect(isValidTheme("career")).toBe(true);
    expect(isValidTheme("wealth")).toBe(true);
    expect(isValidTheme("health")).toBe(true);
    expect(isValidTheme("family")).toBe(true);
    expect(isValidTheme("today")).toBe(true);
    expect(isValidTheme("month")).toBe(true);
    expect(isValidTheme("year")).toBe(true);
    expect(isValidTheme("newyear")).toBe(true);
    expect(isValidTheme("life")).toBe(true);
    expect(isValidTheme("chat")).toBe(true);
  });

  it("returns false for invalid themes", () => {
    expect(isValidTheme("invalid")).toBe(false);
    expect(isValidTheme("")).toBe(false);
    expect(isValidTheme("unknown")).toBe(false);
    expect(isValidTheme("LOVE")).toBe(false); // case sensitive
    expect(isValidTheme("Career")).toBe(false);
  });
});

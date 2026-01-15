/**
 * Email Base Template Tests
 *
 * Tests for email base template wrapper
 */


import { wrapInBaseTemplate, type BaseTemplateProps } from "@/lib/email/templates/base";

describe("wrapInBaseTemplate", () => {
  it("returns valid HTML document", () => {
    const result = wrapInBaseTemplate({
      locale: "en",
      content: "<p>Test content</p>",
    });

    expect(result).toContain("<!DOCTYPE html>");
    expect(result).toContain("<html");
    expect(result).toContain("</html>");
    expect(result).toContain("<head>");
    expect(result).toContain("</head>");
    expect(result).toContain("<body>");
    expect(result).toContain("</body>");
  });

  it("includes content in body", () => {
    const content = "<p>Hello World</p>";
    const result = wrapInBaseTemplate({
      locale: "en",
      content,
    });

    expect(result).toContain(content);
  });

  it("sets correct locale in html tag for English", () => {
    const result = wrapInBaseTemplate({
      locale: "en",
      content: "<p>Test</p>",
    });

    expect(result).toContain('lang="en"');
  });

  it("sets correct locale in html tag for Korean", () => {
    const result = wrapInBaseTemplate({
      locale: "ko",
      content: "<p>Test</p>",
    });

    expect(result).toContain('lang="ko"');
  });

  it("includes English tagline for English locale", () => {
    const result = wrapInBaseTemplate({
      locale: "en",
      content: "<p>Test</p>",
    });

    expect(result).toContain("Your Destiny Guide");
  });

  it("includes Korean tagline for Korean locale", () => {
    const result = wrapInBaseTemplate({
      locale: "ko",
      content: "<p>Test</p>",
    });

    expect(result).toContain("당신의 운명을 안내합니다");
  });

  it("includes preheader when provided", () => {
    const result = wrapInBaseTemplate({
      locale: "en",
      content: "<p>Test</p>",
      preheader: "This is a preheader text",
    });

    expect(result).toContain("This is a preheader text");
    expect(result).toContain('style="display:none');
  });

  it("does not include preheader when not provided", () => {
    const result = wrapInBaseTemplate({
      locale: "en",
      content: "<p>Test</p>",
    });

    expect(result).not.toContain('style="display:none;max-height:0;overflow:hidden;mso-hide:all"');
  });

  it("includes DestinyPal branding", () => {
    const result = wrapInBaseTemplate({
      locale: "en",
      content: "<p>Test</p>",
    });

    expect(result).toContain("DestinyPal");
    expect(result).toContain("destinypal.me");
  });

  it("includes CSS styles", () => {
    const result = wrapInBaseTemplate({
      locale: "en",
      content: "<p>Test</p>",
    });

    expect(result).toContain("<style>");
    expect(result).toContain("</style>");
    expect(result).toContain(".wrapper");
    expect(result).toContain(".container");
    expect(result).toContain(".header");
    expect(result).toContain(".content");
    expect(result).toContain(".footer");
  });

  it("includes footer with unsubscribe message in English", () => {
    const result = wrapInBaseTemplate({
      locale: "en",
      content: "<p>Test</p>",
    });

    expect(result).toContain("This email was sent by DestinyPal");
    expect(result).toContain("To unsubscribe, update your notification settings");
  });

  it("includes footer with unsubscribe message in Korean", () => {
    const result = wrapInBaseTemplate({
      locale: "ko",
      content: "<p>Test</p>",
    });

    expect(result).toContain("이 이메일은 DestinyPal에서 발송되었습니다");
    expect(result).toContain("더 이상 이메일을 받고 싶지 않으시면");
  });

  it("includes meta viewport for mobile", () => {
    const result = wrapInBaseTemplate({
      locale: "en",
      content: "<p>Test</p>",
    });

    expect(result).toContain('name="viewport"');
    expect(result).toContain("width=device-width");
  });

  it("includes UTF-8 charset", () => {
    const result = wrapInBaseTemplate({
      locale: "en",
      content: "<p>Test</p>",
    });

    expect(result).toContain('charset="UTF-8"');
  });

  it("includes gradient styling for header and button", () => {
    const result = wrapInBaseTemplate({
      locale: "en",
      content: "<p>Test</p>",
    });

    expect(result).toContain("linear-gradient");
    expect(result).toContain("#8B5CF6"); // Purple color
    expect(result).toContain("#6366F1"); // Indigo color
  });
});

describe("BaseTemplateProps type", () => {
  it("accepts valid props with content and locale", () => {
    const props: BaseTemplateProps = {
      locale: "en",
      content: "<p>Test</p>",
    };

    expect(props.locale).toBe("en");
    expect(props.content).toBe("<p>Test</p>");
  });

  it("accepts optional preheader", () => {
    const props: BaseTemplateProps = {
      locale: "ko",
      content: "<p>Test</p>",
      preheader: "Preheader text",
    };

    expect(props.preheader).toBe("Preheader text");
  });
});

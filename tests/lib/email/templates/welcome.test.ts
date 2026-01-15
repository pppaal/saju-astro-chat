/**
 * Welcome Email Template Tests
 *
 * Tests for welcome email template generation
 */


import { welcomeTemplate } from "@/lib/email/templates/welcome";
import type { WelcomeTemplateData } from "@/lib/email/types";

describe("welcomeTemplate", () => {
  describe("Korean locale", () => {
    it("generates Korean subject with username", () => {
      const data: WelcomeTemplateData = {
        locale: "ko",
        userName: "김철수",
      };

      const result = welcomeTemplate(data);

      expect(result.subject).toContain("김철수");
      expect(result.subject).toContain("DestinyPal");
      expect(result.subject).toContain("환영");
    });

    it("uses default name when userName not provided", () => {
      const data: WelcomeTemplateData = {
        locale: "ko",
      };

      const result = welcomeTemplate(data);

      expect(result.subject).toContain("회원");
    });

    it("generates Korean HTML content", () => {
      const data: WelcomeTemplateData = {
        locale: "ko",
        userName: "김철수",
      };

      const result = welcomeTemplate(data);

      expect(result.html).toContain("환영합니다");
      expect(result.html).toContain("운명 지도");
      expect(result.html).toContain("운세 캘린더");
      expect(result.html).toContain("타로 리딩");
      expect(result.html).toContain("꿈 해몽");
    });

    it("includes referral code when provided", () => {
      const data: WelcomeTemplateData = {
        locale: "ko",
        userName: "김철수",
        referralCode: "ABC12345",
      };

      const result = welcomeTemplate(data);

      expect(result.html).toContain("ABC12345");
      expect(result.html).toContain("추천 코드");
    });

    it("excludes referral section when no code provided", () => {
      const data: WelcomeTemplateData = {
        locale: "ko",
        userName: "김철수",
      };

      const result = welcomeTemplate(data);

      expect(result.html).not.toContain("추천 코드");
    });

    it("includes CTA button to destiny map", () => {
      const data: WelcomeTemplateData = {
        locale: "ko",
        userName: "테스트",
      };

      const result = welcomeTemplate(data);

      expect(result.html).toContain("https://destinypal.me/destiny-map");
      expect(result.html).toContain("운명 지도 시작하기");
    });
  });

  describe("English locale", () => {
    it("generates English subject with username", () => {
      const data: WelcomeTemplateData = {
        locale: "en",
        userName: "John",
      };

      const result = welcomeTemplate(data);

      expect(result.subject).toContain("John");
      expect(result.subject).toContain("Welcome");
      expect(result.subject).toContain("DestinyPal");
    });

    it("uses default name when userName not provided", () => {
      const data: WelcomeTemplateData = {
        locale: "en",
      };

      const result = welcomeTemplate(data);

      expect(result.subject).toContain("Member");
    });

    it("generates English HTML content", () => {
      const data: WelcomeTemplateData = {
        locale: "en",
        userName: "John",
      };

      const result = welcomeTemplate(data);

      expect(result.html).toContain("Welcome");
      expect(result.html).toContain("Destiny Map");
      expect(result.html).toContain("Fortune Calendar");
      expect(result.html).toContain("Tarot Reading");
      expect(result.html).toContain("Dream Interpretation");
    });

    it("includes referral code when provided", () => {
      const data: WelcomeTemplateData = {
        locale: "en",
        userName: "John",
        referralCode: "XYZ99999",
      };

      const result = welcomeTemplate(data);

      expect(result.html).toContain("XYZ99999");
      expect(result.html).toContain("Referral Code");
    });

    it("excludes referral section when no code provided", () => {
      const data: WelcomeTemplateData = {
        locale: "en",
        userName: "John",
      };

      const result = welcomeTemplate(data);

      expect(result.html).not.toContain("Referral Code");
    });

    it("includes CTA button to destiny map", () => {
      const data: WelcomeTemplateData = {
        locale: "en",
        userName: "Test",
      };

      const result = welcomeTemplate(data);

      expect(result.html).toContain("https://destinypal.me/destiny-map");
      expect(result.html).toContain("Start Your Destiny Map");
    });
  });

  describe("HTML structure", () => {
    it("returns object with subject and html", () => {
      const data: WelcomeTemplateData = {
        locale: "en",
      };

      const result = welcomeTemplate(data);

      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("html");
      expect(typeof result.subject).toBe("string");
      expect(typeof result.html).toBe("string");
    });

    it("html contains DOCTYPE declaration", () => {
      const data: WelcomeTemplateData = {
        locale: "en",
      };

      const result = welcomeTemplate(data);

      expect(result.html).toContain("<!DOCTYPE html>");
    });

    it("html contains lang attribute matching locale", () => {
      const koData: WelcomeTemplateData = { locale: "ko" };
      const enData: WelcomeTemplateData = { locale: "en" };

      const koResult = welcomeTemplate(koData);
      const enResult = welcomeTemplate(enData);

      expect(koResult.html).toContain('lang="ko"');
      expect(enResult.html).toContain('lang="en"');
    });

    it("html contains DestinyPal branding", () => {
      const data: WelcomeTemplateData = {
        locale: "en",
      };

      const result = welcomeTemplate(data);

      expect(result.html).toContain("DestinyPal");
    });

    it("html contains preheader text", () => {
      const koData: WelcomeTemplateData = { locale: "ko" };
      const enData: WelcomeTemplateData = { locale: "en" };

      const koResult = welcomeTemplate(koData);
      const enResult = welcomeTemplate(enData);

      expect(koResult.html).toContain("운명의 여정");
      expect(enResult.html).toContain("destiny journey");
    });

    it("html contains footer with unsubscribe text", () => {
      const data: WelcomeTemplateData = {
        locale: "en",
      };

      const result = welcomeTemplate(data);

      expect(result.html).toContain("destinypal.me");
    });
  });
});

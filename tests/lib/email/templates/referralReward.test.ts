/**
 * Referral Reward Email Template Tests
 *
 * Tests for referral reward email template generation
 */


import { referralRewardTemplate } from "@/lib/email/templates/referralReward";
import type { ReferralRewardTemplateData } from "@/lib/email/types";

describe("referralRewardTemplate", () => {
  describe("Korean locale", () => {
    it("generates Korean subject with credits amount", () => {
      const data: ReferralRewardTemplateData = {
        locale: "ko",
        userName: "김철수",
        creditsAwarded: 3,
      };

      const result = referralRewardTemplate(data);

      expect(result.subject).toContain("축하합니다");
      expect(result.subject).toContain("3");
      expect(result.subject).toContain("크레딧");
    });

    it("generates Korean HTML content", () => {
      const data: ReferralRewardTemplateData = {
        locale: "ko",
        userName: "김철수",
        creditsAwarded: 3,
      };

      const result = referralRewardTemplate(data);

      expect(result.html).toContain("추천 보상이 지급되었습니다");
      expect(result.html).toContain("친구 추천 감사합니다");
      expect(result.html).toContain("+3 크레딧");
    });

    it("includes referred user name when provided", () => {
      const data: ReferralRewardTemplateData = {
        locale: "ko",
        userName: "김철수",
        creditsAwarded: 3,
        referredUserName: "이영희",
      };

      const result = referralRewardTemplate(data);

      expect(result.html).toContain("이영희");
      expect(result.html).toContain("가입했습니다");
    });

    it("shows generic message when referred user name not provided", () => {
      const data: ReferralRewardTemplateData = {
        locale: "ko",
        userName: "김철수",
        creditsAwarded: 3,
      };

      const result = referralRewardTemplate(data);

      expect(result.html).toContain("새로운 친구가 가입했습니다");
    });

    it("uses default name when userName not provided", () => {
      const data: ReferralRewardTemplateData = {
        locale: "ko",
        creditsAwarded: 3,
      };

      const result = referralRewardTemplate(data);

      expect(result.html).toContain("회원");
    });

    it("includes referral program info", () => {
      const data: ReferralRewardTemplateData = {
        locale: "ko",
        creditsAwarded: 3,
      };

      const result = referralRewardTemplate(data);

      expect(result.html).toContain("더 많은 보상");
      expect(result.html).toContain("가입하면 3 크레딧");
      expect(result.html).toContain("무제한");
    });

    it("includes CTA button to referral page", () => {
      const data: ReferralRewardTemplateData = {
        locale: "ko",
        creditsAwarded: 3,
      };

      const result = referralRewardTemplate(data);

      expect(result.html).toContain("https://destinypal.me/referral");
      expect(result.html).toContain("친구 더 초대하기");
    });
  });

  describe("English locale", () => {
    it("generates English subject with credits amount", () => {
      const data: ReferralRewardTemplateData = {
        locale: "en",
        userName: "John",
        creditsAwarded: 3,
      };

      const result = referralRewardTemplate(data);

      expect(result.subject).toContain("Congratulations");
      expect(result.subject).toContain("3");
      expect(result.subject).toContain("credits");
    });

    it("generates English HTML content", () => {
      const data: ReferralRewardTemplateData = {
        locale: "en",
        userName: "John",
        creditsAwarded: 3,
      };

      const result = referralRewardTemplate(data);

      expect(result.html).toContain("Referral Reward Received");
      expect(result.html).toContain("spreading the word");
      expect(result.html).toContain("+3 Credits");
    });

    it("includes referred user name when provided", () => {
      const data: ReferralRewardTemplateData = {
        locale: "en",
        userName: "John",
        creditsAwarded: 3,
        referredUserName: "Jane",
      };

      const result = referralRewardTemplate(data);

      expect(result.html).toContain("Jane");
      expect(result.html).toContain("joined");
    });

    it("shows generic message when referred user name not provided", () => {
      const data: ReferralRewardTemplateData = {
        locale: "en",
        userName: "John",
        creditsAwarded: 3,
      };

      const result = referralRewardTemplate(data);

      expect(result.html).toContain("A new friend joined");
    });

    it("uses default name when userName not provided", () => {
      const data: ReferralRewardTemplateData = {
        locale: "en",
        creditsAwarded: 3,
      };

      const result = referralRewardTemplate(data);

      expect(result.html).toContain("Member");
    });

    it("includes referral program info", () => {
      const data: ReferralRewardTemplateData = {
        locale: "en",
        creditsAwarded: 3,
      };

      const result = referralRewardTemplate(data);

      expect(result.html).toContain("Earn More Rewards");
      expect(result.html).toContain("3 credits when a friend signs up");
      expect(result.html).toContain("No limit");
    });

    it("includes CTA button to referral page", () => {
      const data: ReferralRewardTemplateData = {
        locale: "en",
        creditsAwarded: 3,
      };

      const result = referralRewardTemplate(data);

      expect(result.html).toContain("https://destinypal.me/referral");
      expect(result.html).toContain("Invite More Friends");
    });
  });

  describe("HTML structure", () => {
    it("returns object with subject and html", () => {
      const data: ReferralRewardTemplateData = {
        locale: "en",
        creditsAwarded: 5,
      };

      const result = referralRewardTemplate(data);

      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("html");
      expect(typeof result.subject).toBe("string");
      expect(typeof result.html).toBe("string");
    });

    it("includes preheader with credits amount", () => {
      const koData: ReferralRewardTemplateData = {
        locale: "ko",
        creditsAwarded: 3,
      };
      const enData: ReferralRewardTemplateData = {
        locale: "en",
        creditsAwarded: 5,
      };

      const koResult = referralRewardTemplate(koData);
      const enResult = referralRewardTemplate(enData);

      expect(koResult.html).toContain("3 크레딧이 지급");
      expect(enResult.html).toContain("5 credits have been added");
    });

    it("includes green success styling", () => {
      const data: ReferralRewardTemplateData = {
        locale: "en",
        creditsAwarded: 3,
      };

      const result = referralRewardTemplate(data);

      expect(result.html).toContain("#10B981"); // Green border
      expect(result.html).toContain("#ECFDF5"); // Light green background
    });
  });

  describe("Different credit amounts", () => {
    it("handles single credit", () => {
      const data: ReferralRewardTemplateData = {
        locale: "en",
        creditsAwarded: 1,
      };

      const result = referralRewardTemplate(data);

      expect(result.subject).toContain("1 credits");
      expect(result.html).toContain("+1 Credits");
    });

    it("handles larger credit amounts", () => {
      const data: ReferralRewardTemplateData = {
        locale: "en",
        creditsAwarded: 10,
      };

      const result = referralRewardTemplate(data);

      expect(result.subject).toContain("10 credits");
      expect(result.html).toContain("+10 Credits");
    });
  });
});

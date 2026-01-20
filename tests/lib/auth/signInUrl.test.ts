/**
 * SignInUrl Tests
 * Tests for sign-in URL building utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buildSignInUrl, DEFAULT_SIGNIN_PATH } from "@/lib/auth/signInUrl";

describe("buildSignInUrl", () => {
  describe("DEFAULT_SIGNIN_PATH", () => {
    it("exports default sign-in path", () => {
      expect(DEFAULT_SIGNIN_PATH).toBe("/auth/signin");
    });
  });

  describe("without callback URL", () => {
    it("uses window location when available and no callback provided", () => {
      // In happy-dom environment, window exists
      // The function will use window.location as the callback
      const result = buildSignInUrl();

      expect(result).toContain("/auth/signin");
      // When window exists, it adds a callbackUrl
      expect(result).toContain("callbackUrl=");
    });

    it("uses custom window location when set", () => {
      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        value: {
          pathname: "/dashboard",
          search: "?tab=profile",
          hash: "#section",
        },
        writable: true,
        configurable: true,
      });

      const result = buildSignInUrl();

      expect(result).toContain("/auth/signin");
      expect(result).toContain("callbackUrl=");
      expect(result).toContain(encodeURIComponent("/dashboard"));

      Object.defineProperty(window, "location", {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });
  });

  describe("with callback URL", () => {
    it("builds URL with relative callback", () => {
      const result = buildSignInUrl("/profile");

      expect(result).toBe("/auth/signin?callbackUrl=%2Fprofile%3FauthRefresh%3D1");
    });

    it("builds URL with callback containing query params", () => {
      const result = buildSignInUrl("/page?existing=param");

      expect(result).toContain("/auth/signin");
      expect(result).toContain("callbackUrl=");
      expect(result).toContain(encodeURIComponent("authRefresh=1"));
    });

    it("builds URL with absolute callback", () => {
      const result = buildSignInUrl("https://example.com/page");

      expect(result).toContain("/auth/signin");
      expect(result).toContain("callbackUrl=");
      expect(result).toContain(encodeURIComponent("https://example.com"));
    });

    it("preserves hash in callback URL", () => {
      const result = buildSignInUrl("/page#section");

      expect(result).toContain("callbackUrl=");
      expect(result).toContain(encodeURIComponent("#section"));
    });

    it("does not add authRefresh if already present", () => {
      const result = buildSignInUrl("/page?authRefresh=1");

      const decoded = decodeURIComponent(result);
      const matches = decoded.match(/authRefresh/g);
      expect(matches).toHaveLength(1);
    });
  });

  describe("edge cases", () => {
    it("handles empty string callback - uses window.location", () => {
      // In happy-dom, window exists so empty string triggers fallback to window.location
      const result = buildSignInUrl("");

      expect(result).toContain("/auth/signin");
      // Empty string is falsy, so it falls back to window.location
    });

    it("handles root path callback", () => {
      const result = buildSignInUrl("/");

      expect(result).toContain("/auth/signin");
      expect(result).toContain("callbackUrl=");
    });
  });
});

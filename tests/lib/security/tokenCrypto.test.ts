/**
 * Token Crypto Tests
 *
 * Tests for token encryption and decryption utilities
 */

import { vi, beforeEach, afterEach } from "vitest";

describe("tokenCrypto", () => {
  const originalEnv = process.env.TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    // Reset module cache before each test
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original env
    process.env.TOKEN_ENCRYPTION_KEY = originalEnv;
  });

  describe("without encryption key", () => {
    beforeEach(() => {
      delete process.env.TOKEN_ENCRYPTION_KEY;
    });

    it("hasTokenEncryptionKey returns false", async () => {
      const { hasTokenEncryptionKey } = await import("@/lib/security/tokenCrypto");
      expect(hasTokenEncryptionKey()).toBe(false);
    });

    it("encryptToken returns value as-is", async () => {
      const { encryptToken } = await import("@/lib/security/tokenCrypto");
      expect(encryptToken("test-token")).toBe("test-token");
    });

    it("encryptToken returns null for null input", async () => {
      const { encryptToken } = await import("@/lib/security/tokenCrypto");
      expect(encryptToken(null)).toBeNull();
      expect(encryptToken(undefined)).toBeNull();
    });

    it("decryptToken returns value as-is", async () => {
      const { decryptToken } = await import("@/lib/security/tokenCrypto");
      expect(decryptToken("test-token")).toBe("test-token");
    });

    it("decryptToken returns null for null input", async () => {
      const { decryptToken } = await import("@/lib/security/tokenCrypto");
      expect(decryptToken(null)).toBeNull();
      expect(decryptToken(undefined)).toBeNull();
    });
  });

  describe("with 32-byte base64 encryption key", () => {
    // Generate a valid 32-byte key encoded as base64
    const validKey = Buffer.from("a".repeat(32)).toString("base64");

    beforeEach(() => {
      process.env.TOKEN_ENCRYPTION_KEY = validKey;
    });

    it("hasTokenEncryptionKey returns true", async () => {
      const { hasTokenEncryptionKey } = await import("@/lib/security/tokenCrypto");
      expect(hasTokenEncryptionKey()).toBe(true);
    });

    it("encrypts and decrypts token successfully", async () => {
      const { encryptToken, decryptToken } = await import("@/lib/security/tokenCrypto");
      const token = "my-secret-token-12345";

      const encrypted = encryptToken(token);
      expect(encrypted).not.toBeNull();
      expect(encrypted).not.toBe(token);
      expect(encrypted).toContain("."); // Should be in format: iv.tag.data

      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(token);
    });

    it("encrypted token has three parts separated by dots", async () => {
      const { encryptToken } = await import("@/lib/security/tokenCrypto");
      const encrypted = encryptToken("test");
      expect(encrypted).not.toBeNull();
      const parts = encrypted!.split(".");
      expect(parts).toHaveLength(3);
    });

    it("each encryption produces different ciphertext", async () => {
      const { encryptToken } = await import("@/lib/security/tokenCrypto");
      const token = "same-token";

      const encrypted1 = encryptToken(token);
      const encrypted2 = encryptToken(token);

      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe("with 32+ character UTF-8 encryption key", () => {
    const utf8Key = "this-is-a-32-plus-character-key!";

    beforeEach(() => {
      process.env.TOKEN_ENCRYPTION_KEY = utf8Key;
    });

    it("hasTokenEncryptionKey returns true", async () => {
      const { hasTokenEncryptionKey } = await import("@/lib/security/tokenCrypto");
      expect(hasTokenEncryptionKey()).toBe(true);
    });

    it("encrypts and decrypts correctly", async () => {
      const { encryptToken, decryptToken } = await import("@/lib/security/tokenCrypto");
      const token = "test-utf8-key-encryption";

      const encrypted = encryptToken(token);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(token);
    });
  });

  describe("decryptToken error handling", () => {
    const validKey = Buffer.from("a".repeat(32)).toString("base64");

    beforeEach(() => {
      process.env.TOKEN_ENCRYPTION_KEY = validKey;
    });

    it("returns null for invalid format (missing parts)", async () => {
      const { decryptToken } = await import("@/lib/security/tokenCrypto");
      expect(decryptToken("invalid-format")).toBeNull();
      expect(decryptToken("only.two")).toBeNull();
    });

    it("returns null for corrupted ciphertext", async () => {
      const { decryptToken } = await import("@/lib/security/tokenCrypto");
      expect(decryptToken("YWJj.YWJj.YWJj")).toBeNull(); // Invalid base64 values
    });

    it("returns null for tampered data", async () => {
      const { encryptToken, decryptToken } = await import("@/lib/security/tokenCrypto");
      const encrypted = encryptToken("original-token");

      // Tamper with the encrypted data
      const parts = encrypted!.split(".");
      parts[2] = "AAAA" + parts[2].slice(4); // Modify the ciphertext
      const tampered = parts.join(".");

      expect(decryptToken(tampered)).toBeNull();
    });
  });

  describe("edge cases", () => {
    const validKey = Buffer.from("b".repeat(32)).toString("base64");

    beforeEach(() => {
      process.env.TOKEN_ENCRYPTION_KEY = validKey;
    });

    it("handles empty string token", async () => {
      const { encryptToken } = await import("@/lib/security/tokenCrypto");
      expect(encryptToken("")).toBeNull();
    });

    it("handles unicode tokens", async () => {
      const { encryptToken, decryptToken } = await import("@/lib/security/tokenCrypto");
      const unicodeToken = "한글토큰🔐테스트";

      const encrypted = encryptToken(unicodeToken);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(unicodeToken);
    });

    it("handles long tokens", async () => {
      const { encryptToken, decryptToken } = await import("@/lib/security/tokenCrypto");
      const longToken = "x".repeat(10000);

      const encrypted = encryptToken(longToken);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(longToken);
    });

    it("handles special characters", async () => {
      const { encryptToken, decryptToken } = await import("@/lib/security/tokenCrypto");
      const specialToken = '!@#$%^&*()[]{}|\\:";\'<>,.?/~`';

      const encrypted = encryptToken(specialToken);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(specialToken);
    });
  });
});

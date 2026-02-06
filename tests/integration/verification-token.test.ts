/**
 * Verification Token Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 이메일 인증 토큰 관리
 * - 토큰 만료 처리
 * - 토큰 검증
 *
 * 실행: npm run test:integration
 * 환경변수 필요: TEST_DATABASE_URL 또는 DATABASE_URL
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from "vitest";
import {
  testPrisma,
  checkTestDbConnection,
  connectTestDb,
  disconnectTestDb,
} from "./setup";

const hasTestDb = await checkTestDbConnection();

describe("Integration: Verification Token", () => {
  if (!hasTestDb) {
    it("skips when test database is unavailable", () => {
      expect(true).toBe(true);
    });
    return;
  }

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  afterEach(async () => {
    // Clean up test tokens
    await testPrisma.verificationToken.deleteMany({
      where: { identifier: { startsWith: "test_" } },
    });
  });

  describe("Token Creation", () => {
    it("creates verification token", async () => {
      const token = await testPrisma.verificationToken.create({
        data: {
          identifier: `test_${Date.now()}@example.com`,
          token: `token_${Date.now()}`,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      expect(token).toBeDefined();
      expect(token.identifier).toContain("test_");
      expect(token.expires).toBeInstanceOf(Date);
    });

    it("creates token with custom expiry", async () => {
      const oneHourLater = new Date(Date.now() + 60 * 60 * 1000);

      const token = await testPrisma.verificationToken.create({
        data: {
          identifier: `test_short_${Date.now()}@example.com`,
          token: `short_token_${Date.now()}`,
          expires: oneHourLater,
        },
      });

      expect(token.expires.getTime()).toBeCloseTo(oneHourLater.getTime(), -3);
    });

    it("generates unique tokens for same identifier", async () => {
      const identifier = `test_multi_${Date.now()}@example.com`;

      const token1 = await testPrisma.verificationToken.create({
        data: {
          identifier,
          token: `token_1_${Date.now()}`,
          expires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const token2 = await testPrisma.verificationToken.create({
        data: {
          identifier,
          token: `token_2_${Date.now()}`,
          expires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      expect(token1.token).not.toBe(token2.token);
    });
  });

  describe("Token Verification", () => {
    it("finds token by identifier and token value", async () => {
      const identifier = `test_find_${Date.now()}@example.com`;
      const tokenValue = `find_token_${Date.now()}`;

      await testPrisma.verificationToken.create({
        data: {
          identifier,
          token: tokenValue,
          expires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const found = await testPrisma.verificationToken.findUnique({
        where: {
          identifier_token: { identifier, token: tokenValue },
        },
      });

      expect(found).not.toBeNull();
      expect(found?.identifier).toBe(identifier);
    });

    it("validates token is not expired", async () => {
      const identifier = `test_valid_${Date.now()}@example.com`;
      const tokenValue = `valid_token_${Date.now()}`;

      await testPrisma.verificationToken.create({
        data: {
          identifier,
          token: tokenValue,
          expires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const token = await testPrisma.verificationToken.findUnique({
        where: {
          identifier_token: { identifier, token: tokenValue },
        },
      });

      const isValid = token && token.expires > new Date();
      expect(isValid).toBe(true);
    });

    it("detects expired token", async () => {
      const identifier = `test_expired_${Date.now()}@example.com`;
      const tokenValue = `expired_token_${Date.now()}`;

      await testPrisma.verificationToken.create({
        data: {
          identifier,
          token: tokenValue,
          expires: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
      });

      const token = await testPrisma.verificationToken.findUnique({
        where: {
          identifier_token: { identifier, token: tokenValue },
        },
      });

      const isValid = token && token.expires > new Date();
      expect(isValid).toBe(false);
    });
  });

  describe("Token Consumption", () => {
    it("deletes token after use", async () => {
      const identifier = `test_consume_${Date.now()}@example.com`;
      const tokenValue = `consume_token_${Date.now()}`;

      await testPrisma.verificationToken.create({
        data: {
          identifier,
          token: tokenValue,
          expires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      // Use and delete token
      await testPrisma.verificationToken.delete({
        where: {
          identifier_token: { identifier, token: tokenValue },
        },
      });

      const found = await testPrisma.verificationToken.findUnique({
        where: {
          identifier_token: { identifier, token: tokenValue },
        },
      });

      expect(found).toBeNull();
    });

    it("prevents token reuse", async () => {
      const identifier = `test_reuse_${Date.now()}@example.com`;
      const tokenValue = `reuse_token_${Date.now()}`;

      await testPrisma.verificationToken.create({
        data: {
          identifier,
          token: tokenValue,
          expires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      // First use - delete
      await testPrisma.verificationToken.delete({
        where: {
          identifier_token: { identifier, token: tokenValue },
        },
      });

      // Second attempt should fail
      const secondAttempt = await testPrisma.verificationToken.findUnique({
        where: {
          identifier_token: { identifier, token: tokenValue },
        },
      });

      expect(secondAttempt).toBeNull();
    });
  });

  describe("Token Cleanup", () => {
    it("removes all expired tokens", async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const future = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Create expired tokens
      for (let i = 0; i < 5; i++) {
        await testPrisma.verificationToken.create({
          data: {
            identifier: `test_cleanup_expired_${i}_${Date.now()}@example.com`,
            token: `expired_${i}_${Date.now()}`,
            expires: past,
          },
        });
      }

      // Create valid tokens
      for (let i = 0; i < 3; i++) {
        await testPrisma.verificationToken.create({
          data: {
            identifier: `test_cleanup_valid_${i}_${Date.now()}@example.com`,
            token: `valid_${i}_${Date.now()}`,
            expires: future,
          },
        });
      }

      // Delete expired
      await testPrisma.verificationToken.deleteMany({
        where: {
          identifier: { startsWith: "test_cleanup" },
          expires: { lt: now },
        },
      });

      const remaining = await testPrisma.verificationToken.findMany({
        where: { identifier: { startsWith: "test_cleanup" } },
      });

      expect(remaining).toHaveLength(3);
    });
  });
});

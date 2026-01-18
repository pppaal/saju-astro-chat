/**
 * Prisma Client Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptAccountData } from "@/lib/db/prisma";

vi.mock("@/lib/security/tokenCrypto", () => ({
  encryptToken: vi.fn((token: string) => `encrypted_${token}`),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => ({
    $queryRaw: vi.fn(),
    $disconnect: vi.fn(),
    $connect: vi.fn(),
  })),
}));

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: vi.fn(),
}));

vi.mock("pg", () => ({
  Pool: vi.fn(() => ({
    connect: vi.fn(),
  })),
}));

describe("Prisma Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("encryptAccountData", () => {
    it("processes access_token field", () => {
      const data = {
        access_token: "secret_access",
        provider: "google",
      };

      const result = encryptAccountData(data);

      expect(result).toHaveProperty("access_token");
      expect(result.provider).toBe("google");
    });

    it("processes refresh_token field", () => {
      const data = {
        refresh_token: "secret_refresh",
        provider: "google",
      };

      const result = encryptAccountData(data);

      expect(result).toHaveProperty("refresh_token");
    });

    it("processes id_token field", () => {
      const data = {
        id_token: "secret_id",
        provider: "google",
      };

      const result = encryptAccountData(data);

      expect(result).toHaveProperty("id_token");
    });

    it("processes all token types", () => {
      const data = {
        access_token: "access",
        refresh_token: "refresh",
        id_token: "id",
        provider: "google",
      };

      const result = encryptAccountData(data);

      expect(result).toHaveProperty("access_token");
      expect(result).toHaveProperty("refresh_token");
      expect(result).toHaveProperty("id_token");
      expect(result.provider).toBe("google");
    });

    it("handles data without tokens", () => {
      const data = {
        provider: "google",
        userId: "123",
      };

      const result = encryptAccountData(data);

      expect(result).toEqual(data);
    });

    it("handles null data", () => {
      const result = encryptAccountData(null);
      expect(result).toBeNull();
    });

    it("handles undefined data", () => {
      const result = encryptAccountData(undefined);
      expect(result).toBeUndefined();
    });

    it("handles non-object data", () => {
      const result = encryptAccountData("string");
      expect(result).toBe("string");
    });

    it("preserves other fields", () => {
      const data = {
        access_token: "token",
        userId: "123",
        email: "test@example.com",
        createdAt: new Date(),
      };

      const result = encryptAccountData(data);

      expect(result.userId).toBe("123");
      expect(result.email).toBe("test@example.com");
      expect(result.createdAt).toBe(data.createdAt);
    });

    it("handles non-string token values", () => {
      const data = {
        access_token: 12345,
        provider: "google",
      };

      const result = encryptAccountData(data);

      expect(result.access_token).toBe(12345);
    });
  });
});

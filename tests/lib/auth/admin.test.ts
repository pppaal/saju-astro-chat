/**
 * Admin Auth Tests
 * Tests for admin authentication utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/authOptions", () => ({
  authOptions: {},
}));

import { isAdminEmail, requireAdminSession } from "@/lib/auth/admin";
import { getServerSession } from "next-auth";

describe("isAdminEmail", () => {
  const originalEnv = process.env.ADMIN_EMAILS;

  afterEach(() => {
    process.env.ADMIN_EMAILS = originalEnv;
  });

  it("returns false for undefined email", () => {
    process.env.ADMIN_EMAILS = "admin@test.com";
    expect(isAdminEmail(undefined)).toBe(false);
  });

  it("returns false for null email", () => {
    process.env.ADMIN_EMAILS = "admin@test.com";
    expect(isAdminEmail(null)).toBe(false);
  });

  it("returns false for empty string email", () => {
    process.env.ADMIN_EMAILS = "admin@test.com";
    expect(isAdminEmail("")).toBe(false);
  });

  it("returns true for admin email", () => {
    process.env.ADMIN_EMAILS = "admin@test.com";
    expect(isAdminEmail("admin@test.com")).toBe(true);
  });

  it("is case-insensitive", () => {
    process.env.ADMIN_EMAILS = "admin@test.com";
    expect(isAdminEmail("ADMIN@TEST.COM")).toBe(true);
    expect(isAdminEmail("Admin@Test.Com")).toBe(true);
  });

  it("trims whitespace", () => {
    process.env.ADMIN_EMAILS = "admin@test.com";
    expect(isAdminEmail("  admin@test.com  ")).toBe(true);
  });

  it("handles multiple admin emails", () => {
    process.env.ADMIN_EMAILS = "admin1@test.com,admin2@test.com,admin3@test.com";

    expect(isAdminEmail("admin1@test.com")).toBe(true);
    expect(isAdminEmail("admin2@test.com")).toBe(true);
    expect(isAdminEmail("admin3@test.com")).toBe(true);
    expect(isAdminEmail("nonadmin@test.com")).toBe(false);
  });

  it("handles admin emails with whitespace", () => {
    process.env.ADMIN_EMAILS = "admin1@test.com , admin2@test.com , admin3@test.com";

    expect(isAdminEmail("admin1@test.com")).toBe(true);
    expect(isAdminEmail("admin2@test.com")).toBe(true);
    expect(isAdminEmail("admin3@test.com")).toBe(true);
  });

  it("returns false when ADMIN_EMAILS is not set", () => {
    delete process.env.ADMIN_EMAILS;
    expect(isAdminEmail("admin@test.com")).toBe(false);
  });

  it("returns false when ADMIN_EMAILS is empty", () => {
    process.env.ADMIN_EMAILS = "";
    expect(isAdminEmail("admin@test.com")).toBe(false);
  });

  it("returns false for non-admin email", () => {
    process.env.ADMIN_EMAILS = "admin@test.com";
    expect(isAdminEmail("user@test.com")).toBe(false);
  });
});

describe("requireAdminSession", () => {
  const originalEnv = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_EMAILS = "admin@test.com";
  });

  afterEach(() => {
    process.env.ADMIN_EMAILS = originalEnv;
  });

  it("returns null when no session exists", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const result = await requireAdminSession();

    expect(result).toBeNull();
  });

  it("returns null when session has no user", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as any);

    const result = await requireAdminSession();

    expect(result).toBeNull();
  });

  it("returns null when user has no email", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { name: "Test User" },
    } as any);

    const result = await requireAdminSession();

    expect(result).toBeNull();
  });

  it("returns null for non-admin user", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: "user@test.com" },
    } as any);

    const result = await requireAdminSession();

    expect(result).toBeNull();
  });

  it("returns session for admin user", async () => {
    const mockSession = {
      user: { email: "admin@test.com", name: "Admin" },
    };
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);

    const result = await requireAdminSession();

    expect(result).toEqual(mockSession);
  });

  it("is case-insensitive for admin check", async () => {
    const mockSession = {
      user: { email: "ADMIN@TEST.COM" },
    };
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);

    const result = await requireAdminSession();

    expect(result).toEqual(mockSession);
  });
});

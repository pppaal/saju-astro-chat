/**
 * Tests for userProfile.ts
 * User profile storage utility with localStorage and API sync
 */

import { vi, beforeEach, afterEach } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] || null),
  };
})();

describe("userProfile", () => {
  const STORAGE_KEY = "destinypal_user_profile";

  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    localStorageMock.clear();
    vi.clearAllMocks();

    // Set up window and localStorage
    Object.defineProperty(global, "window", {
      value: { localStorage: localStorageMock },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    // Clean up
    vi.unstubAllGlobals();
  });

  describe("getUserProfile", () => {
    it("returns empty object when not in browser", async () => {
      // @ts-expect-error - simulating server-side
      delete global.window;

      const { getUserProfile } = await import("@/lib/userProfile");
      const result = getUserProfile();

      expect(result).toEqual({});
    });

    it("returns empty object when localStorage is empty", async () => {
      const { getUserProfile } = await import("@/lib/userProfile");
      const result = getUserProfile();

      expect(result).toEqual({});
    });

    it("returns parsed profile from localStorage", async () => {
      const profile = {
        birthDate: "1990-01-15",
        birthTime: "14:30",
        birthCity: "Seoul, KR",
        gender: "Male",
      };
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(profile));

      const { getUserProfile } = await import("@/lib/userProfile");
      const result = getUserProfile();

      expect(result).toEqual(profile);
    });

    it("returns empty object on JSON parse error", async () => {
      localStorageMock.setItem(STORAGE_KEY, "invalid json {");

      const { getUserProfile } = await import("@/lib/userProfile");
      const result = getUserProfile();

      expect(result).toEqual({});
    });
  });

  describe("saveUserProfile", () => {
    it("saves new profile to localStorage", async () => {
      const { saveUserProfile } = await import("@/lib/userProfile");
      const profile = { birthDate: "1990-01-15", birthTime: "14:30" };

      saveUserProfile(profile);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.any(String)
      );

      const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(saved.birthDate).toBe("1990-01-15");
      expect(saved.birthTime).toBe("14:30");
      expect(saved.updatedAt).toBeDefined();
    });

    it("merges with existing profile", async () => {
      vi.resetModules();
      // First set up existing data in mock storage
      const existingData = { birthDate: "1990-01-15", name: "John" };

      // Override getItem to return existing data
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(existingData));

      const { saveUserProfile } = await import("@/lib/userProfile");
      saveUserProfile({ birthTime: "14:30" });

      // Get the last saved value
      const lastCall = localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1];
      const saved = JSON.parse(lastCall[1]);

      expect(saved.birthDate).toBe("1990-01-15");
      expect(saved.name).toBe("John");
      expect(saved.birthTime).toBe("14:30");
    });

    it("overwrites existing fields with new values", async () => {
      vi.resetModules();
      const existingData = { birthDate: "1990-01-15", birthTime: "10:00" };

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(existingData));

      const { saveUserProfile } = await import("@/lib/userProfile");
      saveUserProfile({ birthTime: "14:30" });

      const lastCall = localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1];
      const saved = JSON.parse(lastCall[1]);

      expect(saved.birthTime).toBe("14:30");
    });

    it("adds updatedAt timestamp", async () => {
      const { saveUserProfile } = await import("@/lib/userProfile");
      const before = new Date().toISOString();

      saveUserProfile({ birthDate: "1990-01-15" });

      const savedJson = localStorageMock.setItem.mock.calls[0][1];
      const saved = JSON.parse(savedJson);
      const after = new Date().toISOString();

      expect(saved.updatedAt).toBeDefined();
      expect(saved.updatedAt >= before).toBe(true);
      expect(saved.updatedAt <= after).toBe(true);
    });

    it("logs warning on localStorage error", async () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error("Storage quota exceeded");
      });

      const { saveUserProfile } = await import("@/lib/userProfile");
      const { logger } = await import("@/lib/logger");

      saveUserProfile({ birthDate: "1990-01-15" });

      expect(logger.warn).toHaveBeenCalledWith(
        "Failed to save user profile:",
        expect.any(Error)
      );
    });
  });

  describe("fetchAndSyncUserProfile", () => {
    it("calls /api/me/profile endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { name: "John" } }),
      });

      const { fetchAndSyncUserProfile } = await import("@/lib/userProfile");
      await fetchAndSyncUserProfile();

      expect(mockFetch).toHaveBeenCalledWith("/api/me/profile", { cache: "no-store" });
    });

    it("returns local profile when API fails", async () => {
      const localProfile = { birthDate: "1990-01-15" };
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(localProfile));

      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      const { fetchAndSyncUserProfile } = await import("@/lib/userProfile");
      const result = await fetchAndSyncUserProfile();

      expect(result).toEqual(localProfile);
    });

    it("returns local profile when user is null", async () => {
      const localProfile = { birthDate: "1990-01-15" };
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(localProfile));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: null }),
      });

      const { fetchAndSyncUserProfile } = await import("@/lib/userProfile");
      const result = await fetchAndSyncUserProfile();

      expect(result).toEqual(localProfile);
    });

    it("converts API response to UserProfile format", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            name: "John",
            birthDate: "1990-01-15",
            birthTime: "14:30",
            birthCity: "Seoul, KR",
            gender: "M",
            tzId: "Asia/Seoul",
          },
        }),
      });

      const { fetchAndSyncUserProfile } = await import("@/lib/userProfile");
      const result = await fetchAndSyncUserProfile();

      expect(result.name).toBe("John");
      expect(result.birthDate).toBe("1990-01-15");
      expect(result.birthTime).toBe("14:30");
      expect(result.birthCity).toBe("Seoul, KR");
      expect(result.gender).toBe("Male");
      expect(result.timezone).toBe("Asia/Seoul");
      expect(result.updatedAt).toBeDefined();
    });

    it("converts gender F to Female", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { gender: "F", birthDate: "1990-01-15" },
        }),
      });

      const { fetchAndSyncUserProfile } = await import("@/lib/userProfile");
      const result = await fetchAndSyncUserProfile();

      expect(result.gender).toBe("Female");
    });

    it("sets gender to undefined for unknown values", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { gender: "X", birthDate: "1990-01-15" },
        }),
      });

      const { fetchAndSyncUserProfile } = await import("@/lib/userProfile");
      const result = await fetchAndSyncUserProfile();

      expect(result.gender).toBeUndefined();
    });

    it("syncs profile to localStorage when has data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { birthDate: "1990-01-15", birthTime: "14:30" },
        }),
      });

      const { fetchAndSyncUserProfile } = await import("@/lib/userProfile");
      await fetchAndSyncUserProfile();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.any(String)
      );
    });

    it("does not sync to localStorage when no data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { email: "test@test.com" }, // No birth info or name
        }),
      });

      const { fetchAndSyncUserProfile } = await import("@/lib/userProfile");
      await fetchAndSyncUserProfile();

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it("returns local profile on fetch error", async () => {
      const localProfile = { birthDate: "1990-01-15" };
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(localProfile));

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { fetchAndSyncUserProfile } = await import("@/lib/userProfile");
      const result = await fetchAndSyncUserProfile();

      expect(result).toEqual(localProfile);
    });
  });

  describe("getStoredBirthDate", () => {
    it("returns birthDate from profile", async () => {
      const profile = { birthDate: "1990-01-15", name: "John" };
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(profile));

      const { getStoredBirthDate } = await import("@/lib/userProfile");
      const result = getStoredBirthDate();

      expect(result).toBe("1990-01-15");
    });

    it("returns undefined when no birthDate", async () => {
      const profile = { name: "John" };
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(profile));

      const { getStoredBirthDate } = await import("@/lib/userProfile");
      const result = getStoredBirthDate();

      expect(result).toBeUndefined();
    });

    it("returns undefined when no profile", async () => {
      const { getStoredBirthDate } = await import("@/lib/userProfile");
      const result = getStoredBirthDate();

      expect(result).toBeUndefined();
    });
  });

  describe("hasCompleteProfile", () => {
    it("returns true when both birthDate and birthTime exist", async () => {
      const profile = { birthDate: "1990-01-15", birthTime: "14:30" };
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(profile));

      const { hasCompleteProfile } = await import("@/lib/userProfile");
      const result = hasCompleteProfile();

      expect(result).toBe(true);
    });

    it("returns false when only birthDate exists", async () => {
      const profile = { birthDate: "1990-01-15" };
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(profile));

      const { hasCompleteProfile } = await import("@/lib/userProfile");
      const result = hasCompleteProfile();

      expect(result).toBe(false);
    });

    it("returns false when only birthTime exists", async () => {
      const profile = { birthTime: "14:30" };
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(profile));

      const { hasCompleteProfile } = await import("@/lib/userProfile");
      const result = hasCompleteProfile();

      expect(result).toBe(false);
    });

    it("returns false when neither exists", async () => {
      const profile = { name: "John" };
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(profile));

      const { hasCompleteProfile } = await import("@/lib/userProfile");
      const result = hasCompleteProfile();

      expect(result).toBe(false);
    });

    it("returns false when profile is empty", async () => {
      const { hasCompleteProfile } = await import("@/lib/userProfile");
      const result = hasCompleteProfile();

      expect(result).toBe(false);
    });
  });

  describe("clearUserProfile", () => {
    it("removes profile from localStorage", async () => {
      const profile = { birthDate: "1990-01-15" };
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(profile));

      const { clearUserProfile } = await import("@/lib/userProfile");
      clearUserProfile();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it("does not throw on localStorage error", async () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error("Storage error");
      });

      const { clearUserProfile } = await import("@/lib/userProfile");

      expect(() => clearUserProfile()).not.toThrow();
    });
  });
});

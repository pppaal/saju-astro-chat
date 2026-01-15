/**
 * User Profile 테스트
 * - localStorage 저장/조회
 * - 프로필 병합
 * - 완성도 체크
 */


import { vi, beforeEach, afterEach } from "vitest";
import {
  getUserProfile,
  saveUserProfile,
  getStoredBirthDate,
  hasCompleteProfile,
  clearUserProfile,
  type UserProfile,
} from "@/lib/userProfile";

// localStorage 모킹
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
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });

describe("getUserProfile", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("returns empty object when no profile stored", () => {
    const profile = getUserProfile();
    expect(profile).toEqual({});
  });

  it("returns stored profile", () => {
    const stored: UserProfile = {
      name: "홍길동",
      birthDate: "1990-05-15",
      birthTime: "14:30",
    };
    localStorageMock.setItem("destinypal_user_profile", JSON.stringify(stored));

    const profile = getUserProfile();

    expect(profile.name).toBe("홍길동");
    expect(profile.birthDate).toBe("1990-05-15");
    expect(profile.birthTime).toBe("14:30");
  });

  it("handles invalid JSON gracefully", () => {
    localStorageMock.getItem = vi.fn(() => "not valid json");

    const profile = getUserProfile();

    expect(profile).toEqual({});
  });

  it("handles localStorage error gracefully", () => {
    localStorageMock.getItem = vi.fn(() => {
      throw new Error("Storage error");
    });

    const profile = getUserProfile();

    expect(profile).toEqual({});
  });
});

describe("saveUserProfile", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Reset getItem to normal behavior
    localStorageMock.getItem = vi.fn((key: string) => {
      const store: Record<string, string> = {};
      return store[key] || null;
    });
  });

  it("saves profile to localStorage", () => {
    const profile: UserProfile = {
      name: "Test User",
      birthDate: "2000-01-01",
    };

    saveUserProfile(profile);

    expect(localStorageMock.setItem).toHaveBeenCalled();
    const savedArg = localStorageMock.setItem.mock.calls[0][1];
    const saved = JSON.parse(savedArg);
    expect(saved.name).toBe("Test User");
    expect(saved.birthDate).toBe("2000-01-01");
  });

  it("adds updatedAt timestamp", () => {
    saveUserProfile({ name: "Test" });

    const savedArg = localStorageMock.setItem.mock.calls[0][1];
    const saved = JSON.parse(savedArg);
    expect(saved.updatedAt).toBeDefined();
    expect(new Date(saved.updatedAt).getTime()).not.toBeNaN();
  });

  it("merges with existing profile", () => {
    const existing = { name: "Existing", birthDate: "1990-01-01" };
    localStorageMock.getItem = vi.fn(() => JSON.stringify(existing));

    saveUserProfile({ birthTime: "10:00" });

    const savedArg = localStorageMock.setItem.mock.calls[0][1];
    const saved = JSON.parse(savedArg);
    expect(saved.name).toBe("Existing");
    expect(saved.birthDate).toBe("1990-01-01");
    expect(saved.birthTime).toBe("10:00");
  });

  it("overwrites existing fields when provided", () => {
    const existing = { name: "Old Name", birthDate: "1990-01-01" };
    localStorageMock.getItem = vi.fn(() => JSON.stringify(existing));

    saveUserProfile({ name: "New Name" });

    const savedArg = localStorageMock.setItem.mock.calls[0][1];
    const saved = JSON.parse(savedArg);
    expect(saved.name).toBe("New Name");
    expect(saved.birthDate).toBe("1990-01-01");
  });
});

describe("getStoredBirthDate", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("returns birthDate from profile", () => {
    const stored = { birthDate: "1995-06-15" };
    localStorageMock.getItem = vi.fn(() => JSON.stringify(stored));

    const birthDate = getStoredBirthDate();

    expect(birthDate).toBe("1995-06-15");
  });

  it("returns undefined when no birthDate", () => {
    localStorageMock.getItem = vi.fn(() => JSON.stringify({ name: "Test" }));

    const birthDate = getStoredBirthDate();

    expect(birthDate).toBeUndefined();
  });

  it("returns undefined when no profile", () => {
    localStorageMock.getItem = vi.fn(() => null);

    const birthDate = getStoredBirthDate();

    expect(birthDate).toBeUndefined();
  });
});

describe("hasCompleteProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when both birthDate and birthTime exist", () => {
    const stored = { birthDate: "1990-01-01", birthTime: "14:30" };
    localStorageMock.getItem = vi.fn(() => JSON.stringify(stored));

    expect(hasCompleteProfile()).toBe(true);
  });

  it("returns false when only birthDate exists", () => {
    const stored = { birthDate: "1990-01-01" };
    localStorageMock.getItem = vi.fn(() => JSON.stringify(stored));

    expect(hasCompleteProfile()).toBe(false);
  });

  it("returns false when only birthTime exists", () => {
    const stored = { birthTime: "14:30" };
    localStorageMock.getItem = vi.fn(() => JSON.stringify(stored));

    expect(hasCompleteProfile()).toBe(false);
  });

  it("returns false when neither exists", () => {
    localStorageMock.getItem = vi.fn(() => JSON.stringify({ name: "Test" }));

    expect(hasCompleteProfile()).toBe(false);
  });

  it("returns false for empty profile", () => {
    localStorageMock.getItem = vi.fn(() => null);

    expect(hasCompleteProfile()).toBe(false);
  });
});

describe("clearUserProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes profile from localStorage", () => {
    clearUserProfile();

    expect(localStorageMock.removeItem).toHaveBeenCalledWith("destinypal_user_profile");
  });
});

describe("UserProfile interface", () => {
  it("accepts all valid gender values", () => {
    const profiles: UserProfile[] = [
      { gender: "Male" },
      { gender: "Female" },
      { gender: "Other" },
      { gender: "Prefer not to say" },
    ];

    profiles.forEach((profile) => {
      expect(profile.gender).toBeDefined();
    });
  });

  it("accepts valid date and time formats", () => {
    const profile: UserProfile = {
      birthDate: "1990-12-31",
      birthTime: "23:59",
      timezone: "Asia/Seoul",
    };

    expect(profile.birthDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(profile.birthTime).toMatch(/^\d{2}:\d{2}$/);
  });

  it("accepts coordinates", () => {
    const profile: UserProfile = {
      latitude: 37.5665,
      longitude: 126.978,
    };

    expect(profile.latitude).toBeGreaterThanOrEqual(-90);
    expect(profile.latitude).toBeLessThanOrEqual(90);
    expect(profile.longitude).toBeGreaterThanOrEqual(-180);
    expect(profile.longitude).toBeLessThanOrEqual(180);
  });
});

describe("Profile validation scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles Korean names", () => {
    const profile: UserProfile = { name: "홍길동" };
    localStorageMock.getItem = vi.fn(() => JSON.stringify(profile));

    const retrieved = getUserProfile();
    expect(retrieved.name).toBe("홍길동");
  });

  it("handles city with country code", () => {
    const profile: UserProfile = { birthCity: "Seoul, KR" };
    localStorageMock.getItem = vi.fn(() => JSON.stringify(profile));

    const retrieved = getUserProfile();
    expect(retrieved.birthCity).toBe("Seoul, KR");
  });

  it("handles ISO timestamp in updatedAt", () => {
    const profile: UserProfile = { updatedAt: "2024-01-15T10:30:00.000Z" };
    localStorageMock.getItem = vi.fn(() => JSON.stringify(profile));

    const retrieved = getUserProfile();
    expect(new Date(retrieved.updatedAt!).toISOString()).toBe("2024-01-15T10:30:00.000Z");
  });

  it("handles all fields together", () => {
    const fullProfile: UserProfile = {
      name: "Test User",
      birthDate: "1990-05-15",
      birthTime: "14:30",
      birthCity: "Tokyo, JP",
      gender: "Male",
      timezone: "Asia/Tokyo",
      latitude: 35.6762,
      longitude: 139.6503,
      updatedAt: new Date().toISOString(),
    };

    localStorageMock.getItem = vi.fn(() => JSON.stringify(fullProfile));

    const retrieved = getUserProfile();
    expect(retrieved.name).toBe(fullProfile.name);
    expect(retrieved.birthDate).toBe(fullProfile.birthDate);
    expect(retrieved.birthTime).toBe(fullProfile.birthTime);
    expect(retrieved.birthCity).toBe(fullProfile.birthCity);
    expect(retrieved.gender).toBe(fullProfile.gender);
    expect(retrieved.timezone).toBe(fullProfile.timezone);
    expect(retrieved.latitude).toBe(fullProfile.latitude);
    expect(retrieved.longitude).toBe(fullProfile.longitude);
  });
});

describe("Profile edge cases", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("handles partial profile updates", () => {
    // Initial profile
    const initial: UserProfile = {
      name: "John",
      birthDate: "1990-01-01",
    };
    localStorageMock.getItem = vi.fn(() => JSON.stringify(initial));

    // Update only time
    saveUserProfile({ birthTime: "10:30" });

    const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(saved.name).toBe("John");
    expect(saved.birthDate).toBe("1990-01-01");
    expect(saved.birthTime).toBe("10:30");
  });

  it("handles empty string values", () => {
    const profile: UserProfile = {
      name: "",
      birthDate: "",
      birthTime: "",
    };

    localStorageMock.getItem = vi.fn(() => JSON.stringify(profile));
    const retrieved = getUserProfile();

    expect(retrieved.name).toBe("");
    expect(retrieved.birthDate).toBe("");
  });

  it("handles undefined vs missing fields", () => {
    const profile = {
      name: "Test",
      birthDate: undefined,
    };

    localStorageMock.getItem = vi.fn(() => JSON.stringify(profile));
    const retrieved = getUserProfile();

    expect(retrieved.name).toBe("Test");
    expect(retrieved.birthDate).toBeUndefined();
  });

  it("handles special characters in city names", () => {
    const cities = [
      "São Paulo, BR",
      "Saint-Étienne, FR",
      "Москва, RU",
      "北京, CN",
    ];

    cities.forEach((city) => {
      saveUserProfile({ birthCity: city });
      const saved = JSON.parse(localStorageMock.setItem.mock.calls.pop()![1]);
      expect(saved.birthCity).toBe(city);
    });
  });

  it("handles extreme coordinate values", () => {
    const profile: UserProfile = {
      latitude: 90, // North Pole
      longitude: 180, // Date line
    };

    saveUserProfile(profile);
    const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);

    expect(saved.latitude).toBe(90);
    expect(saved.longitude).toBe(180);
  });

  it("handles negative coordinates", () => {
    const profile: UserProfile = {
      latitude: -33.8688, // Sydney
      longitude: -151.2093,
    };

    saveUserProfile(profile);
    const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);

    expect(saved.latitude).toBe(-33.8688);
    expect(saved.longitude).toBe(-151.2093);
  });

  it("handles very long names", () => {
    const longName = "A".repeat(200);
    saveUserProfile({ name: longName });

    const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(saved.name).toBe(longName);
  });

  it("handles midnight birth time", () => {
    saveUserProfile({ birthTime: "00:00" });
    const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(saved.birthTime).toBe("00:00");
  });

  it("handles end of day birth time", () => {
    saveUserProfile({ birthTime: "23:59" });
    const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(saved.birthTime).toBe("23:59");
  });

  it("handles leap day birth date", () => {
    saveUserProfile({ birthDate: "1992-02-29" });
    const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(saved.birthDate).toBe("1992-02-29");
  });
});

describe("Profile completeness validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires both date and time for completeness", () => {
    const incomplete1 = { birthDate: "1990-01-01" };
    localStorageMock.getItem = vi.fn(() => JSON.stringify(incomplete1));
    expect(hasCompleteProfile()).toBe(false);

    const incomplete2 = { birthTime: "14:30" };
    localStorageMock.getItem = vi.fn(() => JSON.stringify(incomplete2));
    expect(hasCompleteProfile()).toBe(false);
  });

  it("considers empty strings as incomplete", () => {
    const profile = { birthDate: "", birthTime: "" };
    localStorageMock.getItem = vi.fn(() => JSON.stringify(profile));
    expect(hasCompleteProfile()).toBe(false);
  });

  it("validates complete profile with minimal data", () => {
    const profile = { birthDate: "1990-01-01", birthTime: "14:30" };
    localStorageMock.getItem = vi.fn(() => JSON.stringify(profile));
    expect(hasCompleteProfile()).toBe(true);
  });
});

describe("localStorage error scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles quota exceeded error on save", () => {
    localStorageMock.setItem = vi.fn(() => {
      throw new Error("QuotaExceededError");
    });

    // Should not throw
    expect(() => saveUserProfile({ name: "Test" })).not.toThrow();
  });

  it("handles disabled localStorage", () => {
    localStorageMock.getItem = vi.fn(() => {
      throw new Error("localStorage is not available");
    });

    const profile = getUserProfile();
    expect(profile).toEqual({});
  });

  it("handles corrupted data gracefully", () => {
    localStorageMock.getItem = vi.fn(() => "{invalid json");

    const profile = getUserProfile();
    expect(profile).toEqual({});
  });

  it("handles null prototype object", () => {
    const nullProtoData = Object.create(null);
    nullProtoData.name = "Test";
    nullProtoData.birthDate = "1990-01-01";

    localStorageMock.getItem = vi.fn(() => JSON.stringify(nullProtoData));

    const profile = getUserProfile();
    expect(profile.name).toBe("Test");
  });
});

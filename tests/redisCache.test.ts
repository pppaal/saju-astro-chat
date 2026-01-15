/**
 * Redis Cache 테스트
 * - makeCacheKey 함수 테스트
 * - 캐시 키 생성 로직
 * - 정렬 일관성
 */


import { makeCacheKey } from "@/lib/redis-cache";

describe("makeCacheKey: Basic Functionality", () => {
  it("generates key with prefix and params", () => {
    const key = makeCacheKey("saju", { year: 1990, month: 1, day: 15 });
    expect(key).toContain("saju:");
    expect(key).toContain("year:1990");
    expect(key).toContain("month:1");
    expect(key).toContain("day:15");
  });

  it("generates consistent keys for same params", () => {
    const params = { a: 1, b: 2, c: 3 };
    const key1 = makeCacheKey("test", params);
    const key2 = makeCacheKey("test", params);
    expect(key1).toBe(key2);
  });

  it("handles empty params", () => {
    const key = makeCacheKey("empty", {});
    expect(key).toBe("empty:");
  });

  it("handles single param", () => {
    const key = makeCacheKey("single", { id: "abc" });
    expect(key).toBe("single:id:abc");
  });
});

describe("makeCacheKey: Sorting", () => {
  it("sorts keys alphabetically for consistency", () => {
    // Different order should produce same key
    const key1 = makeCacheKey("test", { z: 1, a: 2, m: 3 });
    const key2 = makeCacheKey("test", { a: 2, m: 3, z: 1 });
    const key3 = makeCacheKey("test", { m: 3, z: 1, a: 2 });

    expect(key1).toBe(key2);
    expect(key2).toBe(key3);
    expect(key1).toBe("test:a:2|m:3|z:1");
  });

  it("sorts numeric keys correctly (as strings)", () => {
    const key = makeCacheKey("numeric", { "2": "b", "1": "a", "10": "c" });
    // Sorted alphabetically as strings: "1", "10", "2"
    expect(key).toBe("numeric:1:a|10:c|2:b");
  });
});

describe("makeCacheKey: Value Types", () => {
  it("handles string values", () => {
    const key = makeCacheKey("str", { name: "홍길동" });
    expect(key).toBe("str:name:홍길동");
  });

  it("handles number values", () => {
    const key = makeCacheKey("num", { count: 42 });
    expect(key).toBe("num:count:42");
  });

  it("handles boolean values", () => {
    const key = makeCacheKey("bool", { active: true, inactive: false });
    expect(key).toContain("active:true");
    expect(key).toContain("inactive:false");
  });

  it("handles null values", () => {
    const key = makeCacheKey("null", { value: null });
    expect(key).toBe("null:value:null");
  });

  it("handles undefined values", () => {
    const key = makeCacheKey("undef", { value: undefined });
    expect(key).toBe("undef:value:undefined");
  });

  it("handles object values (toString)", () => {
    const key = makeCacheKey("obj", { data: { nested: true } });
    expect(key).toBe("obj:data:[object Object]");
  });

  it("handles array values (toString)", () => {
    const key = makeCacheKey("arr", { items: [1, 2, 3] });
    expect(key).toBe("arr:items:1,2,3");
  });
});

describe("makeCacheKey: Real World Examples", () => {
  it("generates saju cache key", () => {
    const key = makeCacheKey("saju:report", {
      year: 1990,
      month: 5,
      day: 15,
      hour: 14,
      gender: "male",
      calendar: "solar",
    });

    // All parts should be present, sorted
    expect(key).toContain("saju:report:");
    expect(key).toContain("calendar:solar");
    expect(key).toContain("day:15");
    expect(key).toContain("gender:male");
    expect(key).toContain("hour:14");
    expect(key).toContain("month:5");
    expect(key).toContain("year:1990");
  });

  it("generates astrology cache key", () => {
    const key = makeCacheKey("astrology:chart", {
      lat: 37.566,
      lon: 126.978,
      date: "1990-05-15",
      time: "14:30",
    });

    expect(key).toContain("astrology:chart:");
    expect(key).toContain("date:1990-05-15");
    expect(key).toContain("lat:37.566");
    expect(key).toContain("lon:126.978");
    expect(key).toContain("time:14:30");
  });

  it("generates user-specific cache key", () => {
    const key = makeCacheKey("user:fortune", {
      userId: "user123",
      date: "2024-01-15",
      type: "daily",
    });

    expect(key).toBe("user:fortune:date:2024-01-15|type:daily|userId:user123");
  });

  it("generates compatibility cache key", () => {
    const key = makeCacheKey("compat", {
      user1: "abc123",
      user2: "xyz789",
    });

    expect(key).toBe("compat:user1:abc123|user2:xyz789");
  });
});

describe("makeCacheKey: Special Characters", () => {
  it("handles special characters in values", () => {
    const key = makeCacheKey("special", { name: "홍:길|동" });
    expect(key).toBe("special:name:홍:길|동");
  });

  it("handles spaces in values", () => {
    const key = makeCacheKey("space", { text: "hello world" });
    expect(key).toBe("space:text:hello world");
  });

  it("handles unicode in values", () => {
    const key = makeCacheKey("unicode", { emoji: "😀🎉" });
    expect(key).toBe("unicode:emoji:😀🎉");
  });

  it("handles newlines in values", () => {
    const key = makeCacheKey("newline", { text: "line1\nline2" });
    expect(key).toBe("newline:text:line1\nline2");
  });
});

describe("makeCacheKey: Edge Cases", () => {
  it("handles very long keys", () => {
    const longValue = "A".repeat(1000);
    const key = makeCacheKey("long", { value: longValue });
    expect(key.startsWith("long:")).toBe(true);
    expect(key.length).toBeGreaterThan(1000);
  });

  it("handles many parameters", () => {
    const params: Record<string, number> = {};
    for (let i = 0; i < 100; i++) {
      params[`param${i}`] = i;
    }
    const key = makeCacheKey("many", params);
    expect(key.startsWith("many:")).toBe(true);
    // All params should be included
    expect(key.split("|").length).toBe(100);
  });

  it("handles empty string values", () => {
    const key = makeCacheKey("empty", { value: "" });
    expect(key).toBe("empty:value:");
  });

  it("handles keys that look like numbers", () => {
    const key = makeCacheKey("numkey", { "123": "value" });
    expect(key).toBe("numkey:123:value");
  });
});

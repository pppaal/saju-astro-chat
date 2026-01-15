/**
 * DataRedactor 테스트
 * - 이름 해싱
 * - 이름 마스킹
 * - 텍스트 내 이름 마스킹
 * - 이메일 마스킹
 * - 페이로드 마스킹
 * - 점성술 입력 마스킹
 */


import {
  DataRedactor,
  hashName,
  maskDisplayName,
  maskTextWithName,
  maskEmail,
  maskPayload,
  maskAstrologyInput,
} from "@/lib/security";

describe("DataRedactor: hashName", () => {
  it("hashes name consistently", () => {
    const hash1 = hashName("홍길동");
    const hash2 = hashName("홍길동");
    expect(hash1).toBe(hash2);
  });

  it("returns 12 character hex string", () => {
    const hash = hashName("테스트");
    expect(hash).toMatch(/^[a-f0-9]{12}$/);
    expect(hash).toHaveLength(12);
  });

  it("returns 'anon' for empty/undefined name", () => {
    expect(hashName(undefined)).toBe("anon");
    expect(hashName("")).toBe("anon");
  });

  it("produces different hashes for different names", () => {
    const hash1 = hashName("홍길동");
    const hash2 = hashName("김철수");
    expect(hash1).not.toBe(hash2);
  });

  it("static method works same as function", () => {
    expect(DataRedactor.hashName("테스트")).toBe(hashName("테스트"));
  });
});

describe("DataRedactor: maskDisplayName", () => {
  it("masks Korean name", () => {
    expect(maskDisplayName("홍길동")).toBe("홍***");
  });

  it("masks English name", () => {
    expect(maskDisplayName("John")).toBe("J***");
  });

  it("masks single character name", () => {
    expect(maskDisplayName("홍")).toBe("홍***");
  });

  it("returns undefined for empty/undefined", () => {
    expect(maskDisplayName(undefined)).toBeUndefined();
    expect(maskDisplayName("")).toBeUndefined();
  });

  it("trims whitespace before masking", () => {
    expect(maskDisplayName("  홍길동  ")).toBe("홍***");
  });

  it("static method works same as function", () => {
    expect(DataRedactor.maskDisplayName("테스트")).toBe(maskDisplayName("테스트"));
  });
});

describe("DataRedactor: maskTextWithName", () => {
  it("masks name in text", () => {
    expect(maskTextWithName("홍길동님 안녕하세요", "홍길동")).toBe("***님 안녕하세요");
  });

  it("masks multiple occurrences", () => {
    expect(maskTextWithName("홍길동의 운세, 홍길동에게", "홍길동")).toBe("***의 운세, ***에게");
  });

  it("returns original text if no name provided", () => {
    expect(maskTextWithName("테스트 텍스트", undefined)).toBe("테스트 텍스트");
    expect(maskTextWithName("테스트 텍스트", "")).toBe("테스트 텍스트");
  });

  it("returns original text if empty", () => {
    expect(maskTextWithName("", "홍길동")).toBe("");
  });

  it("handles special regex characters in name", () => {
    // Names with special regex chars should be escaped
    expect(maskTextWithName("test.name is here", "test.name")).toBe("*** is here");
    expect(maskTextWithName("(name) is here", "(name)")).toBe("*** is here");
  });

  it("returns text unchanged if name not found", () => {
    expect(maskTextWithName("Hello World", "홍길동")).toBe("Hello World");
  });

  it("static method works same as function", () => {
    expect(DataRedactor.maskTextWithName("테스트", "테")).toBe(maskTextWithName("테스트", "테"));
  });
});

describe("DataRedactor: maskEmail", () => {
  it("masks email address", () => {
    expect(maskEmail("user@example.com")).toBe("us***@***");
  });

  it("masks short local part", () => {
    expect(maskEmail("a@b.com")).toBe("a***@***");
  });

  it("returns masked placeholder for empty/undefined", () => {
    expect(maskEmail(undefined)).toBe("***@***");
    expect(maskEmail("")).toBe("***@***");
  });

  it("handles email without @ sign", () => {
    expect(maskEmail("invalid-email")).toBe("in***@***");
  });

  it("static method works same as function", () => {
    expect(DataRedactor.maskEmail("test@test.com")).toBe(maskEmail("test@test.com"));
  });
});

describe("DataRedactor: maskPayload", () => {
  it("masks name field", () => {
    const result = maskPayload({ name: "홍길동" });
    expect(result.name).toBe("홍***");
  });

  it("masks birthDate field", () => {
    const result = maskPayload({ birthDate: "1990-01-15" });
    expect(result.birthDate).toBe("****-**-**");
  });

  it("masks birthTime field", () => {
    const result = maskPayload({ birthTime: "14:30" });
    expect(result.birthTime).toBe("**:**");
  });

  it("masks email field", () => {
    const result = maskPayload({ email: "user@example.com" });
    expect(result.email).toBe("us***@***");
  });

  it("truncates latitude to 3 decimal places", () => {
    const result = maskPayload({ latitude: 37.123456789 });
    expect(result.latitude).toBe("37.123");
  });

  it("truncates longitude to 3 decimal places", () => {
    const result = maskPayload({ longitude: 127.987654321 });
    expect(result.longitude).toBe("127.988");
  });

  it("handles string latitude/longitude", () => {
    const result = maskPayload({ latitude: "37.5", longitude: "127.0" });
    expect(result.latitude).toBe("37.500");
    expect(result.longitude).toBe("127.000");
  });

  it("preserves unmasked fields", () => {
    const result = maskPayload({ name: "홍길동", otherField: "value" });
    expect(result.name).toBe("홍***");
    expect(result.otherField).toBe("value");
  });

  it("returns masked object for null/undefined", () => {
    expect(maskPayload(null)).toEqual({ _masked: true });
    expect(maskPayload(undefined)).toEqual({ _masked: true });
  });

  it("returns masked object for non-object", () => {
    expect(maskPayload("string")).toEqual({ _masked: true });
    expect(maskPayload(123)).toEqual({ _masked: true });
  });

  it("handles invalid latitude gracefully", () => {
    const result = maskPayload({ latitude: "not-a-number" });
    expect(result.latitude).toBeUndefined();
  });

  it("static method works same as function", () => {
    const input = { name: "테스트", email: "test@test.com" };
    expect(DataRedactor.maskPayload(input)).toEqual(maskPayload(input));
  });
});

describe("DataRedactor: maskAstrologyInput", () => {
  it("masks name with first char and asterisks", () => {
    const result = maskAstrologyInput({ name: "홍길동" });
    expect(result.name).toBe("홍***");
  });

  it("masks birthDate", () => {
    const result = maskAstrologyInput({ birthDate: "1990-01-15" });
    expect(result.birthDate).toBe("****-**-**");
  });

  it("masks birthTime", () => {
    const result = maskAstrologyInput({ birthTime: "14:30" });
    expect(result.birthTime).toBe("**:**");
  });

  it("truncates latitude to 2 decimal places", () => {
    const result = maskAstrologyInput({ latitude: 37.566123 });
    expect(result.latitude).toBe("37.57");
  });

  it("truncates longitude to 2 decimal places", () => {
    const result = maskAstrologyInput({ longitude: 126.978123 });
    expect(result.longitude).toBe("126.98");
  });

  it("returns undefined for missing fields", () => {
    const result = maskAstrologyInput({});
    expect(result.name).toBeUndefined();
    expect(result.birthDate).toBeUndefined();
    expect(result.birthTime).toBeUndefined();
    expect(result.latitude).toBeUndefined();
    expect(result.longitude).toBeUndefined();
  });

  it("handles empty name", () => {
    const result = maskAstrologyInput({ name: "" });
    // Empty string: first char is undefined, so result is "undefined***" or "***"
    // Actual: name[0] is undefined when name is "", so "undefined" + "***"
    // But the implementation uses `input.name[0] ?? ""` which gives "" for empty string
    // name[0] of "" is undefined, and undefined ?? "" = "", so result is "***"
    // However, if input.name is truthy checked first with `input.name ? ...`, empty string is falsy
    expect(result.name).toBeUndefined(); // Empty string is falsy
  });

  it("static method works same as function", () => {
    const input = { name: "테스트", latitude: 37.5, longitude: 127.0 };
    expect(DataRedactor.maskAstrologyInput(input)).toEqual(maskAstrologyInput(input));
  });
});

describe("DataRedactor: Edge Cases", () => {
  it("handles Unicode emoji in names (may be partial due to surrogate pairs)", () => {
    // Emoji are surrogate pairs in JS, slice(0,1) gets only first code unit
    const result = maskDisplayName("😀길동");
    // Result will be first code unit + "***"
    expect(result).toContain("***");
    expect(result?.length).toBeGreaterThan(3);
  });

  it("handles very long names", () => {
    const longName = "A".repeat(1000);
    expect(maskDisplayName(longName)).toBe("A***");
    expect(hashName(longName)).toHaveLength(12);
  });

  it("handles names with newlines", () => {
    expect(maskDisplayName("홍\n길동")).toBe("홍***");
  });

  it("handles mixed content in text masking", () => {
    const text = "안녕하세요 John님, 오늘 John의 운세입니다.";
    expect(maskTextWithName(text, "John")).toBe("안녕하세요 ***님, 오늘 ***의 운세입니다.");
  });

  it("preserves case sensitivity in text masking", () => {
    const text = "Hello JOHN and john";
    expect(maskTextWithName(text, "JOHN")).toBe("Hello *** and john");
    expect(maskTextWithName(text, "john")).toBe("Hello JOHN and ***");
  });
});

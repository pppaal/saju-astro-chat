import { describe, expect, it } from "vitest";
import { sanitizeLocaleText, maskTextWithName } from "@/lib/destiny-map/sanitize";

describe("sanitizeLocaleText", () => {
  it("keeps Korean and ASCII, removes control chars", () => {
    const raw = "테스트 글자 ABC\u0007";
    expect(sanitizeLocaleText(raw, "ko")).toBe("테스트 글자 ABC");
  });

  it("keeps accented Latin for es", () => {
    const raw = "mañana será mejor";
    expect(sanitizeLocaleText(raw, "es")).toBe(raw);
  });

  it("does not touch JSON payloads", () => {
    const raw = '{"lifeTimeline":[1,2],"categoryAnalysis":"ok"}';
    expect(sanitizeLocaleText(raw, "en")).toBe(raw);
  });
});

describe("maskTextWithName", () => {
  it("masks provided name everywhere", () => {
    const raw = "Hello Alice. Alice, welcome!";
    expect(maskTextWithName(raw, "Alice")).toBe("Hello ***. ***, welcome!");
  });

  it("returns original text when name missing", () => {
    const raw = "Hello world";
    expect(maskTextWithName(raw, "")).toBe(raw);
  });
});

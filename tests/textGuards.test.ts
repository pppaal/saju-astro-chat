const test = require("node:test");
const assert = require("node:assert/strict");
const { cleanText, guardText, containsForbidden, FORBIDDEN_PATTERNS } = require("../src/lib/textGuards");

test("cleanText strips HTML/script and trims/limits", () => {
  const raw = `<script>alert('x')</script><b>Hello</b>   world`;
  const cleaned = cleanText(raw, 20);
  assert.equal(cleaned, "Hello world");
});

test("guardText filters forbidden keywords", () => {
  const raw = "phone number ssn investment diagnosis";
  const guarded = guardText(raw, 200);
  assert.ok(!FORBIDDEN_PATTERNS.some((p: RegExp) => p.test(guarded)));
});

test("guardText clamps length", () => {
  const long = "a".repeat(5000);
  const guarded = guardText(long, 100);
  assert.equal(guarded.length, 100);
});

test("containsForbidden catches regulated/PII topics", () => {
  const samples = [
    "passport number 123",
    "loan and mortgage refinance",
    "medical diagnosis request",
    "gambling sportsbook tips",
    "self-harm thoughts",
  ];
  for (const text of samples) {
    assert.equal(containsForbidden(text), true, `should flag: ${text}`);
  }
});

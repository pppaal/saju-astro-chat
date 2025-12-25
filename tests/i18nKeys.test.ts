const test = require("node:test");
const assert = require("node:assert/strict");
const { DICTS, SUPPORTED_LOCALES } = require("../src/i18n/I18nProvider");

type Dict = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === "object" && !Array.isArray(value);
};

function flattenKeys(obj: Dict, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    if (isRecord(v)) {
      return flattenKeys(v, path);
    }
    return [path];
  });
}

const base = DICTS.en;
const baseKeys = new Set(flattenKeys(base));

for (const locale of SUPPORTED_LOCALES) {
  if (locale === "en") continue;
  test(`i18n keys match for ${locale}`, () => {
    const keys = new Set(flattenKeys(DICTS[locale]));
    const missing = [...baseKeys].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !baseKeys.has(k));
    assert.deepEqual(missing, [], `Missing keys in ${locale}`);
    assert.deepEqual(extra, [], `Extra keys in ${locale}`);
  });
}

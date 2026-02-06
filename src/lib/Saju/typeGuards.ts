// src/lib/Saju/typeGuards.ts
// Runtime type guards for Saju domain objects

import type {
  FiveElement,
  YinYang,
  SibsinKind,
  PillarKind,
  StemBranchInfo,
  PillarGanjiData,
  PillarData,
  SajuPillars,
  SimplePillar,
  DaeunData,
  RelationHit,
  ShinsalHit,
  Ganji,
  JijangganData,
  JijangganSlot,
} from "./types";
import {
  VALID_STEMS,
  VALID_BRANCHES,
  VALID_ELEMENTS,
  VALID_YIN_YANG,
  VALID_SIBSIN,
  VALID_PILLAR_KINDS,
} from "./validation";

// ============================================================
// Primitive Type Guards
// ============================================================

/**
 * Check if value is a valid FiveElement
 */
export function isFiveElement(value: unknown): value is FiveElement {
  return typeof value === "string" && VALID_ELEMENTS.includes(value as FiveElement);
}

/**
 * Check if value is a valid YinYang
 */
export function isYinYang(value: unknown): value is YinYang {
  return typeof value === "string" && VALID_YIN_YANG.includes(value as YinYang);
}

/**
 * Check if value is a valid SibsinKind
 */
export function isSibsinKind(value: unknown): value is SibsinKind {
  return typeof value === "string" && VALID_SIBSIN.includes(value as SibsinKind);
}

/**
 * Check if value is a valid PillarKind
 */
export function isPillarKind(value: unknown): value is PillarKind {
  return typeof value === "string" && VALID_PILLAR_KINDS.includes(value as PillarKind);
}

/**
 * Check if value is a valid Heavenly Stem (천간)
 */
export function isHeavenlyStem(value: unknown): value is (typeof VALID_STEMS)[number] {
  return typeof value === "string" && VALID_STEMS.includes(value as (typeof VALID_STEMS)[number]);
}

/**
 * Check if value is a valid Earthly Branch (지지)
 */
export function isEarthlyBranch(value: unknown): value is (typeof VALID_BRANCHES)[number] {
  return typeof value === "string" && VALID_BRANCHES.includes(value as (typeof VALID_BRANCHES)[number]);
}

// ============================================================
// Object Type Guards
// ============================================================

/**
 * Check if value is a valid Ganji object
 */
export function isGanji(value: unknown): value is Ganji {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;

  return (
    typeof obj.stem === "string" &&
    typeof obj.branch === "string" &&
    isHeavenlyStem(obj.stem) &&
    isEarthlyBranch(obj.branch)
  );
}

/**
 * Check if value is a valid StemBranchInfo object
 */
export function isStemBranchInfo(value: unknown): value is StemBranchInfo {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;

  return (
    typeof obj.name === "string" &&
    isFiveElement(obj.element) &&
    (isYinYang(obj.yin_yang) || isYinYang(obj.yinYang))
  );
}

/**
 * Check if value is a valid JijangganSlot
 */
export function isJijangganSlot(value: unknown): value is JijangganSlot {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;

  return (
    typeof obj.name === "string" &&
    (typeof obj.sibsin === "string" || isSibsinKind(obj.sibsin))
  );
}

/**
 * Check if value is a valid JijangganData
 */
export function isJijangganData(value: unknown): value is JijangganData {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;

  // At least one slot should exist
  const hasValidSlot =
    (obj.chogi === undefined || isJijangganSlot(obj.chogi)) &&
    (obj.junggi === undefined || isJijangganSlot(obj.junggi)) &&
    (obj.jeonggi === undefined || isJijangganSlot(obj.jeonggi));

  return hasValidSlot;
}

/**
 * Check if value is a valid PillarGanjiData
 */
export function isPillarGanjiData(value: unknown): value is PillarGanjiData {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;

  return (
    typeof obj.name === "string" &&
    isFiveElement(obj.element) &&
    isYinYang(obj.yin_yang) &&
    (typeof obj.sibsin === "string" || isSibsinKind(obj.sibsin))
  );
}

/**
 * Check if value is a valid PillarData
 */
export function isPillarData(value: unknown): value is PillarData {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;

  return (
    isPillarGanjiData(obj.heavenlyStem) &&
    isPillarGanjiData(obj.earthlyBranch) &&
    isJijangganData(obj.jijanggan)
  );
}

/**
 * Check if value is a valid SimplePillar
 */
export function isSimplePillar(value: unknown): value is SimplePillar {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;

  // Check for either stem/branch or heavenlyStem/earthlyBranch
  const hasStemBranch = typeof obj.stem === "string" && typeof obj.branch === "string";
  const hasHeavenlyEarthly =
    typeof obj.heavenlyStem === "string" && typeof obj.earthlyBranch === "string";

  return hasStemBranch || hasHeavenlyEarthly;
}

/**
 * Check if value is a valid SajuPillars object
 */
export function isSajuPillars(value: unknown): value is SajuPillars {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;

  // Check for new format (year, month, day, time)
  const hasNewFormat =
    isPillarData(obj.year) &&
    isPillarData(obj.month) &&
    isPillarData(obj.day) &&
    isPillarData(obj.time);

  // Check for legacy format (yearPillar, monthPillar, dayPillar, timePillar)
  const hasLegacyFormat =
    isPillarData(obj.yearPillar) &&
    isPillarData(obj.monthPillar) &&
    isPillarData(obj.dayPillar) &&
    isPillarData(obj.timePillar);

  return hasNewFormat || hasLegacyFormat;
}

/**
 * Check if value is a valid DaeunData
 */
export function isDaeunData(value: unknown): value is DaeunData {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;

  return (
    typeof obj.age === "number" &&
    typeof obj.heavenlyStem === "string" &&
    typeof obj.earthlyBranch === "string" &&
    obj.sibsin !== undefined &&
    typeof obj.sibsin === "object"
  );
}

/**
 * Check if value is a valid RelationHit
 */
export function isRelationHit(value: unknown): value is RelationHit {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;

  const validKinds = [
    "천간합", "천간충",
    "지지육합", "지지삼합", "지지방합",
    "지지충", "지지형", "지지파", "지지해", "원진",
    "공망",
  ];

  return (
    typeof obj.kind === "string" &&
    validKinds.includes(obj.kind) &&
    Array.isArray(obj.pillars) &&
    obj.pillars.every(isPillarKind)
  );
}

/**
 * Check if value is a valid ShinsalHit
 */
export function isShinsalHit(value: unknown): value is ShinsalHit {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;

  const validKinds = [
    "장성", "반안", "재살", "천살", "월살", "망신",
    "역마", "화개", "겁살", "육해", "화해", "괘살",
    "길성", "흉성",
  ];

  return (
    typeof obj.kind === "string" &&
    validKinds.includes(obj.kind) &&
    Array.isArray(obj.pillars) &&
    obj.pillars.every(isPillarKind)
  );
}

// ============================================================
// Array Type Guards
// ============================================================

/**
 * Check if value is an array of PillarData
 */
export function isPillarDataArray(value: unknown): value is PillarData[] {
  return Array.isArray(value) && value.every(isPillarData);
}

/**
 * Check if value is an array of DaeunData
 */
export function isDaeunDataArray(value: unknown): value is DaeunData[] {
  return Array.isArray(value) && value.every(isDaeunData);
}

/**
 * Check if value is an array of RelationHit
 */
export function isRelationHitArray(value: unknown): value is RelationHit[] {
  return Array.isArray(value) && value.every(isRelationHit);
}

/**
 * Check if value is an array of ShinsalHit
 */
export function isShinsalHitArray(value: unknown): value is ShinsalHit[] {
  return Array.isArray(value) && value.every(isShinsalHit);
}

// ============================================================
// Utility Type Guards
// ============================================================

/**
 * Check if object has a specific property
 */
export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return obj !== null && typeof obj === "object" && key in obj;
}

/**
 * Check if object has all specified properties
 */
export function hasProperties<K extends string>(
  obj: unknown,
  keys: K[]
): obj is Record<K, unknown> {
  return keys.every((key) => hasProperty(obj, key));
}

/**
 * Assert that value is not null or undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message = "Value is null or undefined"
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

/**
 * Assert that value is of expected type using a type guard
 */
export function assertType<T>(
  value: unknown,
  guard: (v: unknown) => v is T,
  message = "Type assertion failed"
): asserts value is T {
  if (!guard(value)) {
    throw new Error(message);
  }
}

// ============================================================
// Narrowing Helpers
// ============================================================

/**
 * Safely extract pillars from either new or legacy format
 */
export function extractPillars(data: SajuPillars): {
  year: PillarData;
  month: PillarData;
  day: PillarData;
  time: PillarData;
} {
  return {
    year: data.year ?? data.yearPillar!,
    month: data.month ?? data.monthPillar!,
    day: data.day ?? data.dayPillar!,
    time: data.time ?? data.timePillar!,
  };
}

/**
 * Normalize SimplePillar to consistent stem/branch format
 */
export function normalizeSimplePillar(pillar: SimplePillar): { stem: string; branch: string } {
  return {
    stem: pillar.stem ?? pillar.heavenlyStem!,
    branch: pillar.branch ?? pillar.earthlyBranch!,
  };
}

/**
 * Get element from various object shapes
 */
export function extractElement(obj: unknown): FiveElement | null {
  if (!obj || typeof obj !== "object") return null;

  const record = obj as Record<string, unknown>;

  if (isFiveElement(record.element)) return record.element;
  if (isFiveElement(record.오행)) return record.오행;

  return null;
}

/**
 * Get yin-yang from various object shapes
 */
export function extractYinYang(obj: unknown): YinYang | null {
  if (!obj || typeof obj !== "object") return null;

  const record = obj as Record<string, unknown>;

  if (isYinYang(record.yin_yang)) return record.yin_yang;
  if (isYinYang(record.yinYang)) return record.yinYang;
  if (isYinYang(record.음양)) return record.음양;

  return null;
}

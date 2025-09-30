// src/utils/datetime.ts
import { parse } from "date-fns";
// v1.x는 toDate, toZonedTime, format만 제공합니다.
import { toDate, toZonedTime, format } from "date-fns-tz";

/**
 * YYYY-MM-DD + HH:mm + IANA 타임존 → UTC Date
 * v1.x에서는 zonedTimeToUtc가 없어서, 타임존 포함된 문자열을 Date로 만들 때
 * toDate를 사용합니다. 이때 시간대가 포함된 문자열이어야 합니다.
 */
export function toUTC(dateStr: string, timeStr: string, tz: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error("Invalid date format: expected YYYY-MM-DD");
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr)) {
    throw new Error("Invalid time format: expected HH:mm");
  }
  if (!tz) throw new Error("Invalid time zone");

  const base = parse(dateStr, "yyyy-MM-dd", new Date());
  if (Number.isNaN(base.getTime())) throw new Error("Invalid date value");

  const [H, M] = timeStr.split(":").map(Number);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, "0");
  const d = String(base.getDate()).padStart(2, "0");
  const hh = String(H).padStart(2, "0");
  const mm = String(M).padStart(2, "0");

  // 타임존을 명시한 ISO 텍스트 생성 후 toDate로 UTC로 변환
  // v1.x에서 권장: `${iso} [${tz}]` 형태 또는 options로 timeZone 전달
  const localISO = `${y}-${m}-${d} ${hh}:${mm}:00`;
  const utcDate = toDate(localISO, { timeZone: tz }); // ← 이 결과는 UTC 시점의 Date

  return utcDate;
}

/**
 * UTC Date를 특정 타임존 포맷 문자열로
 */
export function formatInTZ(utcDate: Date, tz: string, pattern = "yyyy-MM-dd HH:mm") {
  return format(utcDate, pattern, { timeZone: tz });
}

/**
 * UTC Date를 특정 타임존의 로컬 Date 객체로 변환
 */
export function toLocalInTZ(utcDate: Date, tz: string): Date {
  return toZonedTime(utcDate, tz);
}
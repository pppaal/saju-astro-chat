/**
 * server-TZ 무관 ISO → epoch ms. 엔진의 UTC-버킷팅 계약(index.ts 참조)의 SSOT.
 *
 * extractor 가 내보내는 active window ISO 는 (1) `...Z`/offset 명시, (2) tz-less
 * (`2026-03-15T12:00:00`, `2026-03-15`) 둘 다 온다. tz-less 를 `new Date()`/
 * `Date.parse()` 로 파싱하면 process.env.TZ(서버 로컬)로 해석돼 Seoul/LA 서버에서
 * 결과가 갈린다. 여기서 tz-less 는 명시적으로 UTC 로 강제해 결정론을 보장한다.
 */
export function toUtcMs(iso: string): number {
  const hasOffset = /[zZ]$|[+\-]\d{2}:?\d{2}$/.test(iso)
  if (hasOffset) return Date.parse(iso)
  const normalized = iso.length <= 10 ? `${iso}T00:00:00Z` : `${iso}Z`
  return Date.parse(normalized)
}

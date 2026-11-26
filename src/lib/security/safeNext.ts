/**
 * ?next= 복귀 경로 검증 — 같은 사이트 경로만 돌려준다(오픈 리다이렉트 방지).
 *
 * 문자열 접두사만 보면 뚫린다. WHATWG URL 파서(window.location.assign 이 쓰는 것)는 파싱 전에
 * ASCII 탭·줄바꿈을 지우므로 '/\t/evil.example' 이 '//evil.example' 이 된다. 그래서 제어 문자와
 * 역슬래시를 먼저 거르고, 실제로 URL 로 풀어 origin 이 같은지 본다.
 */

/** 제어 문자(U+0000–U+001F, DEL)와 역슬래시 — 브라우저가 지우거나 '/' 로 바꾸는 문자들. */
const UNSAFE_CHARS = /[\u0000-\u001F\u007F\\]/

/**
 * `next` 가 `origin` 과 같은 사이트의 경로면 `pathname + search + hash` 를, 아니면 null 을 돌려준다.
 *
 * @param next   URLSearchParams.get 으로 읽은(이미 디코딩된) 값
 * @param origin 비교 기준 — 브라우저에선 window.location.origin
 */
export function safeNextPath(next: string | null | undefined, origin: string): string | null {
  if (!next || !next.startsWith('/') || UNSAFE_CHARS.test(next)) return null
  let base: URL
  let target: URL
  try {
    base = new URL(origin)
    target = new URL(next, base.origin)
  } catch {
    return null
  }
  if (target.origin !== base.origin) return null
  return target.pathname + target.search + target.hash
}

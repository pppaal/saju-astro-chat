// src/lib/share/site.ts
//
// 사이트 기본 URL·도메인 표기의 단일 출처. 공유 링크(/r/[token]) URL, OG 이미지와
// 공유 카드 PNG 에 찍는 "destinypal.com" 이 모두 여기서 나온다.
//
// 클라이언트·서버 공용 — crypto 같은 서버 전용 import 를 두지 말 것.
// NEXT_PUBLIC_BASE_URL 은 빌드 때 클라이언트 번들에 인라인되므로 반드시
// `process.env.NEXT_PUBLIC_BASE_URL` 리터럴로 읽는다(구조 분해 금지).

const FALLBACK_BASE_URL = 'https://destinypal.com'

/** 표시·링크용 사이트 기본 URL — 운영 env, 없으면 .com 폴백. 끝 슬래시는 뗀다. */
export function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || FALLBACK_BASE_URL).replace(/\/$/, '')
}

/**
 * 카드·OG 이미지에 찍는 도메인 표기 — 'destinypal.com' (스킴·끝 슬래시 없음).
 * 이미지 공유는 클릭이 안 되므로 받는 사람이 돌아올 주소를 글자로 박는다.
 */
export function shareDomain(): string {
  return siteBaseUrl().replace(/^https?:\/\//, '')
}

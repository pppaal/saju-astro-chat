// src/lib/utils/josa.ts
//
// 한국어 조사(助詞) 자동 선택 — SSOT.
//
// "목(木)이(가) 서로를…" 처럼 조사쌍을 리터럴로 박으면 한국어 제품에서 즉시 어색해
// 보인다(특히 공개 SEO 페이지). 받침 유무로 하나를 골라 붙인다.
//
// 값이 한자·괄호로 끝나도 안전하다 — 뒤에서부터 *마지막 한글 음절*을 찾아 받침을
// 판정하므로 '목(木)' → '목' 의 받침(ㄱ)을 본다.

export type JosaType = '이/가' | '을/를' | '은/는' | '과/와' | '으로/로'

/** 문자열의 마지막 한글 음절 종성 인덱스(0=받침 없음). 한글이 없으면 null. */
function lastJong(s: string): number | null {
  for (let i = s.length - 1; i >= 0; i--) {
    const c = s.charCodeAt(i)
    if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28
  }
  return null
}

/**
 * 값 + 알맞은 조사. 받침이 없거나 한글이 아니면 받침 없는 쪽을 쓴다.
 * '으로/로' 는 ㄹ 받침(jong===8)도 '로' 를 쓰는 예외를 반영한다.
 */
export function josa(value: string, type: JosaType): string {
  const jong = lastJong(value)
  const hasB = jong != null && jong !== 0
  if (type === '으로/로') return value + (hasB && jong !== 8 ? '으로' : '로')
  const [b, n] = type.split('/')
  return value + (hasB ? b : n)
}

/** 조사만 반환 — JSX 처럼 값과 조사를 따로 렌더해야 할 때. */
export function josaOnly(value: string, type: JosaType): string {
  return josa(value, type).slice(value.length)
}

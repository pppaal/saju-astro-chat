/**
 * 한/영 이중 문구 공용 타입·헬퍼.
 *
 * 레포 곳곳에 `type Lang = 'ko' | 'en'`, `type Bi = { ko: string; en: string }`,
 * `lang === 'ko' ? x : (xEn ?? x)` 가 따로 선언돼 있다. 새 코드는 여기서 가져다 쓴다.
 * (기존 선언은 이 모듈로 한꺼번에 바꾸지 않았다 — 필요할 때 하나씩 옮긴다.)
 *
 * 사용 예:
 *   const title: Bi = { ko: '오늘의 흐름', en: "Today's flow" }
 *   pick(title, lang)                       // lang 에 맞는 문구
 *   pickLocalized(card, 'summary', lang)    // ko → card.summary, en → card.summaryEn ?? card.summary
 */

export type Lang = 'ko' | 'en'

/** 한/영 한 쌍의 문구. */
export type Bi = { ko: string; en: string }

/** lang 에 맞는 쪽 문구를 고른다. 'ko' 가 아니면 영어. */
export function pick(bi: Bi, lang: Lang): string {
  return lang === 'ko' ? bi.ko : bi.en
}

/** `${K}En` 짝 필드가 있으면 그 값 타입(null/undefined 제외), 없으면 never. */
type EnValue<T, K extends string> = `${K}En` extends keyof T ? NonNullable<T[`${K}En`]> : never

/**
 * `x` / `xEn` 짝 필드에서 lang 에 맞는 값을 고른다.
 * ko 는 `obj[key]`, en 은 `obj[key + 'En']` 이 있으면 그것, 없으면(null/undefined) `obj[key]` 로 폴백.
 */
export function pickLocalized<T extends object, K extends keyof T & string>(
  obj: T,
  key: K,
  lang: Lang
): T[K] | EnValue<T, K> {
  if (lang === 'ko') return obj[key]
  const en = (obj as Record<string, unknown>)[`${key}En`] as EnValue<T, K> | null | undefined
  return en ?? obj[key]
}

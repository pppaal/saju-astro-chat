/**
 * personSeed — 본명(natal)에서 뽑은 안정적 *개인 시드*.
 *
 * 목적: 템플릿 문구 풀(toneMeaning·dayDomains·deepRead·monthSummary 등)을 이
 * 시드로 회전해 **사람마다 다른 문구**를 결정론적으로 고른다. 같은 사람은 항상
 * 같은 값(재현가능), 다른 본명은 다른 값(개인화). 판단(점수·신호)이 아니라
 * *표현(wording)* 만 개인화하므로 근거를 해치지 않는다.
 *
 * 시드 입력은 *본명 고정* 값이어야 한다(일진처럼 날짜로 바뀌면 안 됨). assembleTiers
 * 가 user.ilgan/yongsin/gyeokguk/gangyak 로 한 번 만들어 month.seed·day.seed 로 전달.
 */

/** FNV-1a 32bit — 짧고 결정론적인 문자열 해시. */
export function hashStringToInt(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

/** 본명 고정 파트들 → 안정적 개인 시드. */
export function personSeed(parts: ReadonlyArray<string | number | undefined | null>): number {
  return hashStringToInt(parts.map((p) => String(p ?? '')).join('|'))
}

/**
 * 풀에서 (seed + key) 로 한 항목 선택. seed=사람, key=상태(톤·날짜·분야 등) →
 * 같은 상태라도 사람이 다르면 다른 문구, 같은 사람이라도 상태가 다르면 다른 문구.
 * 음수 key 안전(모듈로 보정).
 */
export function pickBySeed<T>(pool: readonly T[], seed: number, key = 0): T {
  if (pool.length === 0) {
    throw new Error('pickBySeed: empty pool')
  }
  const idx = (((Math.trunc(seed) + Math.trunc(key)) % pool.length) + pool.length) % pool.length
  return pool[idx]
}

/**
 * 순탄/고비 톤 SSOT — 신강·신약 × 십신(용신)으로 우호/고비를 판정하는 favorOf.
 * 인생 흐름(대운)과 올해·이달·오늘 탭이 *같은* 규칙을 쓰도록 여기에 모은다.
 * 결정론적·LLM 무사용.
 *
 * 원리: 신약(身弱)은 일간을 받쳐주는 인성·비겁이 우호, 기운을 빼가거나 치는
 * 식상·재성·관성이 고비. 신강(身强)은 반대 — 같은 십신도 사람마다 다르게 읽힌다.
 *
 * ── 이력 ──
 * 한 줄 산문 생성기(deriveCycleTone / deriveAstroTone)와 그 문구 테이블
 * (SIBSIN_SHORT / PERIOD_LEAD / FAV_CLAUSE / ASTRO_CLAUSE)이 여기 있었으나
 * 호출처가 0 이라 2026-06 제거. lifetimeFlow/lifePattern 등은 favorOf 와
 * 십신 카테고리(SIBSIN_CAT/SibsinCat)만 소비한다.
 */
// SSOT: 십신 카테고리 타입과 10→5 매핑은 chart-dictionary 에 정의.
// 여기서는 기존 import 사이트(matcher/lifetimeFlow/dateDetail)가 그대로 동작하도록
// 동일한 이름으로 alias 후 re-export 한다.
import type { SibsinCategory } from '@/lib/chart-dictionary'
export { SIBSIN_NAME_TO_CATEGORY as SIBSIN_CAT } from '@/lib/chart-dictionary'
export type SibsinCat = SibsinCategory

export type Favor = 'good' | 'hard' | 'mid'

/** 용신 구조 (오행 한글: 목·화·토·금·수). avoid = 기신·구신. */
export interface YongsinLike {
  primary?: string
  secondary?: string
  avoid?: string[]
}

/**
 * 그 주기가 순탄/고비인지. **모든 조합**을 덮는다:
 *  1순위 — 용신운 판정(가장 정확): 그 주기 오행이 용신/희신이면 순탄, 기신/구신이면
 *          고비, 한신이면 중립. (예: 병오 정관이라도 火가 용신이면 '순탄')
 *  2순위 — 오행/용신 정보가 없을 때만 신강·신약 × 십신 fallback.
 */
export function favorOf(
  strength: string | undefined,
  cat: SibsinCat,
  element?: string,
  yongsin?: YongsinLike
): Favor {
  if (element && yongsin) {
    if (element === yongsin.primary || element === yongsin.secondary) return 'good'
    if (yongsin.avoid?.includes(element)) return 'hard'
    return 'mid'
  }
  const support: SibsinCat[] = ['인성', '비겁']
  if (strength === 'weak') return support.includes(cat) ? 'good' : 'hard'
  if (strength === 'strong') return support.includes(cat) ? 'hard' : 'good'
  return 'mid'
}

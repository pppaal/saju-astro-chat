/**
 * 신호 분류 taxonomy — SSOT.
 *
 * 점수·사유·톤 파생이 신호를 어떻게 묶고 거르는지의 단일 기준. 예전엔 index.ts /
 * summary.ts / surprise.ts / toDay.ts 가 같은 Set 을 각자 복붙해 둬서, 새 층이나
 * 새 정적 본명 종류를 추가할 때 일부만 고치면 점수·톤·요약이 서로 어긋날 위험이
 * 있었다. 여기 한 곳만 고치면 전부 따라오도록 통일한다.
 */

import type { SignalLayer } from './types'

/**
 * "그날/그달 고유" 층 — topReasons/cautions(사유) 와 화해 net 산출에 쓰는 신호 층.
 * 1년 내내 켜진 대운·세운(decadal·yearly) 배경은 매일 같은 줄을 도배해 날짜
 * 변별을 죽이므로 *사유·톤*에서는 제외한다(점수에는 그대로 반영됨).
 */
export const REASON_LAYERS: ReadonlySet<SignalLayer> = new Set<SignalLayer>([
  'monthly',
  'daily',
  'hourly',
  'instant',
])

/**
 * 정적 본명(명사) 표지 — *흐름 점수·사유*에서 제외.
 * 그날 가변 신호가 아니라 본명 자체 표지라, 매일 같은 줄·impact 로 점수를 오염시키고
 * (강한 사주만 매일 좋음 inflate) 칩 목록도 도배한다. 날짜별 변별을 위해 흐름
 * 계산에서 빼되, 일 tier 전체 signal stream(cell.signals)에는 남아 카드에서 확인 가능.
 *  - 'saju-pattern'   : 본명 격국명·일주 archetype (decadal 배경)
 *  - 'geokguk-status' : 본명 격국 성패(±1, daily emit)
 * docs/운흐름.md §0.5.8 / RAW_DISTRIBUTION.md §2.5 참조.
 */
export const STATIC_NATAL_KINDS: ReadonlySet<string> = new Set<string>([
  'saju-pattern',
  'geokguk-status',
])

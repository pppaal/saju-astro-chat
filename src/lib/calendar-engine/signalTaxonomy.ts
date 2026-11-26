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
 * "그날 고유" 층 — 톤 화해(tense/bright) 판정에 쓰는 신호 층.
 *
 * REASON_LAYERS(칩 모집단)보다 좁다. 월운(monthly)은 한 달 내내 같은 상수라
 * 좋은 달엔 매일 양수 베이스를 깔고, 시진(hourly)은 12시진 합이라 나쁜 날에도
 * 좋은 시간이 늘 더 많아 양수로 쏠린다 — 이 둘을 넣으면 그날 자체(daily)가
 * 흉이어도 net>0 이 되어 bright 승격이 상시 발동했다(실측: 저점일 25일 중 23일).
 * 점수가 "이 달에서 약한 날"을 말할 때 톤도 *그날의 신호*로 판정해야 맞는다.
 *
 * 사주×점성 교차(cross-activation)도 이 규칙을 그대로 따른다 — 교차 layer 는 두 부모
 * 중 *좁은* 층이라(엔진 감사 X7, OD-10) 시진 부모의 교차는 'hourly' 로 남아 여기서
 * 빠진다. 예전엔 넓은 부모 층으로 라벨해 시진 교차가 'daily' 로 톤에 섞였다.
 */
export const TONE_LAYERS: ReadonlySet<SignalLayer> = new Set<SignalLayer>(['daily', 'instant'])

/**
 * 정적 본명(명사) 표지 — *흐름 점수·사유*에서 제외.
 * 그날 가변 신호가 아니라 본명 자체 표지라, 매일 같은 줄·impact 로 점수를 오염시키고
 * (강한 사주만 매일 좋음 inflate) 칩 목록도 도배한다. 날짜별 변별을 위해 흐름
 * 계산에서 빼되, 일 tier 전체 signal stream(cell.signals)에는 남아 카드에서 확인 가능.
 *  - 'saju-pattern'   : 본명 격국명·일주 archetype (decadal 배경)
 *  - 'geokguk-status' : 본명 격국 성패(±1, daily emit)
 *  - 'natal-dignity'  : 본명 5-tier Almuten 스냅샷(astro-dignity). 예전엔 kind 'transit' 이라
 *                       느린 트랜짓처럼 일 점수·근거 사다리·수렴 무게에 매일 같은 값으로 들어갔다
 *                       (docs/운흐름.md §0.5.8 '일부러 제외: dignity(본명) · Almuten').
 * 점수(index.ts)·근거 사다리(evidenceLadder)·수렴(convergence)·현저도(surprise)·월 요약은
 * 이 Set 으로 거르고, 서사/근거 카드(cell.signals)에는 남는다.
 * docs/운흐름.md §0.5.8 / RAW_DISTRIBUTION.md §2.5 참조.
 */
export const STATIC_NATAL_KINDS: ReadonlySet<string> = new Set<string>([
  'saju-pattern',
  'geokguk-status',
  'natal-dignity',
])

/**
 * 십신(十神) 한국어 → 영문 라벨 — 단일 정의(SSOT).
 *
 * EN 로케일에서 사주 십신을 영어로 렌더할 때 쓰는 표준 표. 이전엔
 * counselorContext / signalI18n 에 동일한 10개 표가 복붙돼 있었음 → 여기로 통합.
 * 10개 핵심 십신만 정본. 소비처별 추가 키(일간=Self, 관성/인성 등 집계 star)는
 * 각 소비처가 이 표를 spread 한 뒤 덧붙인다.
 */
export const SIBSIN_EN: Record<string, string> = {
  비견: 'Companion',
  겁재: 'Rob Wealth',
  식신: 'Eating God',
  상관: 'Hurting Officer',
  편재: 'Indirect Wealth',
  정재: 'Direct Wealth',
  편관: 'Seven Killings',
  정관: 'Direct Officer',
  편인: 'Indirect Resource',
  정인: 'Direct Resource',
}

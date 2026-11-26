/**
 * 교차 tone → 라벨(이중언어) — "사주·점성 두 시스템이 같은/다른 얘길 하는가" 관점.
 *
 * 통합 리포트(integratedReportLabels 가 다시 내보낸다)와 v9 사주 카드·교차 행이 같은 문구를
 * 쓴다. 의존성 없는 잎(leaf) 모듈 — 차트 사전(chart-dictionary)·해석 JSON 을 끌고 오는
 * integratedReportLabels 를 클라이언트 번들(홈 카드)이 import 하지 않아도 되게 따로 둔다.
 */

export type CrossToneKey = 'resonant' | 'complement' | 'tension' | 'neutral'

export const TONE_LABEL: Record<CrossToneKey, { ko: string; en: string }> = {
  resonant: { ko: '둘 다 같은 얘길 해요', en: 'Both say the same' },
  complement: { ko: '다르지만 서로 도와요', en: 'Different but supportive' },
  tension: { ko: '서로 다른 두 결', en: 'Two pulls in you' },
  neutral: { ko: '서로 상관없어요', en: 'Unrelated' },
}

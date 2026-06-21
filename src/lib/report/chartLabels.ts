/**
 * 운세 차트 공용 라벨 — 별자리·행성·오행 이름의 단일 소스.
 * natalCross(로직)와 CrossRefTable(표시)이 같은 표를 따로 갖던 중복을 제거한다.
 * 한쪽만 고쳐서 어긋나는 드리프트 방지.
 */
import type { SajuElement } from '@/lib/saju/elementBridge'
// 행성 KO 정본(캘린더 엔진 공용). 10행성 한글명은 여기서만 정의.
import { PLANET_KO } from '@/lib/calendar-engine/data/planetNames'

// 별자리 EN↔KO — 정본(astrology/signLabels) 재export. 복사본 두지 않음(드리프트 차단).
export { SIGN_KO_TO_EN } from '@/lib/astrology/signLabels'

/**
 * 행성 영문 → {한국어, 영문}.
 * SSOT: 한글명은 planetNames.PLANET_KO 에서 derive(드리프트 차단). 영문은 PascalCase 키 그대로.
 * 리포트는 10행성만 쓰므로 앵글(ASC/MC)은 제외.
 */
const REPORT_PLANETS = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
] as const
export const PLANET_LABEL: Record<string, { ko: string; en: string }> = Object.fromEntries(
  REPORT_PLANETS.map((en) => [en, { ko: PLANET_KO[en] ?? en, en }])
)

/** 오행 → 라벨. ko(짧게 '목'), koLong('목(나무)'), en. 소비처가 골라 쓴다. */
export const ELEMENT_LABEL: Record<SajuElement, { ko: string; koLong: string; en: string }> = {
  wood: { ko: '목', koLong: '목(나무)', en: 'Wood' },
  fire: { ko: '화', koLong: '화(불)', en: 'Fire' },
  earth: { ko: '토', koLong: '토(흙)', en: 'Earth' },
  metal: { ko: '금', koLong: '금(쇠)', en: 'Metal' },
  water: { ko: '수', koLong: '수(물)', en: 'Water' },
}

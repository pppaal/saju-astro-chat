/**
 * 운세 차트 공용 라벨 — 별자리·행성·오행 이름의 단일 소스.
 * natalCross(로직)와 CrossRefTable(표시)이 같은 표를 따로 갖던 중복을 제거한다.
 * 한쪽만 고쳐서 어긋나는 드리프트 방지.
 */
import type { SajuElement } from '@/lib/saju/elementBridge'

/** 별자리 영문 → 한국어 (단일 소스). */
export const SIGN_EN_TO_KO: Record<string, string> = {
  Aries: '양자리',
  Taurus: '황소자리',
  Gemini: '쌍둥이자리',
  Cancer: '게자리',
  Leo: '사자자리',
  Virgo: '처녀자리',
  Libra: '천칭자리',
  Scorpio: '전갈자리',
  Sagittarius: '사수자리',
  Capricorn: '염소자리',
  Aquarius: '물병자리',
  Pisces: '물고기자리',
}

/** 별자리 한국어 → 영문 (위 표의 역). */
export const SIGN_KO_TO_EN: Record<string, string> = Object.fromEntries(
  Object.entries(SIGN_EN_TO_KO).map(([en, ko]) => [ko, en])
)

/** 행성 영문 → {한국어, 영문}. */
export const PLANET_LABEL: Record<string, { ko: string; en: string }> = {
  Sun: { ko: '태양', en: 'Sun' },
  Moon: { ko: '달', en: 'Moon' },
  Mercury: { ko: '수성', en: 'Mercury' },
  Venus: { ko: '금성', en: 'Venus' },
  Mars: { ko: '화성', en: 'Mars' },
  Jupiter: { ko: '목성', en: 'Jupiter' },
  Saturn: { ko: '토성', en: 'Saturn' },
  Uranus: { ko: '천왕성', en: 'Uranus' },
  Neptune: { ko: '해왕성', en: 'Neptune' },
  Pluto: { ko: '명왕성', en: 'Pluto' },
}

/** 오행 → 라벨. ko(짧게 '목'), koLong('목(나무)'), en. 소비처가 골라 쓴다. */
export const ELEMENT_LABEL: Record<SajuElement, { ko: string; koLong: string; en: string }> = {
  wood: { ko: '목', koLong: '목(나무)', en: 'Wood' },
  fire: { ko: '화', koLong: '화(불)', en: 'Fire' },
  earth: { ko: '토', koLong: '토(흙)', en: 'Earth' },
  metal: { ko: '금', koLong: '금(쇠)', en: 'Metal' },
  water: { ko: '수', koLong: '수(물)', en: 'Water' },
}

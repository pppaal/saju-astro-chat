// tests/components/v9/fixtures.ts — 컴포넌트 렌더용 카드 데이터(엔진 출력 아님 — 모양만 검사).

import type { SajuCardData } from '@/components/v9/SajuCard'

export function sampleCard(overrides: Partial<SajuCardData> = {}): SajuCardData {
  return {
    pillars: {
      hour: {
        stem: '丁',
        branch: '未',
        element: { stem: 'fire', branch: 'earth' },
        roman: 'Jeongmi',
        hangul: '정미',
      },
      day: {
        stem: '壬',
        branch: '戌',
        element: { stem: 'water', branch: 'earth' },
        roman: 'Imsul',
        hangul: '임술',
      },
      month: {
        stem: '癸',
        branch: '卯',
        element: { stem: 'water', branch: 'wood' },
        roman: 'Gyemyo',
        hangul: '계묘',
      },
      year: {
        stem: '丁',
        branch: '丑',
        element: { stem: 'fire', branch: 'earth' },
        roman: 'Jeongchuk',
        hangul: '정축',
      },
    },
    hourHidden: true,
    dayMaster: { stem: '壬', element: 'water' },
    bigThree: {
      sun: { ko: '양자리', en: 'Aries' },
      moon: { ko: '사자자리', en: 'Leo' },
      asc: { ko: '사자자리', en: 'Leo' },
    },
    typeName: { ko: '차근차근 쌓는 자유로운 영혼', en: 'steady-building Free Spirit' },
    lifeShape: { ko: '늦게 피는 꽃', en: 'Late bloomer' },
    identity: { saju: 'water', astro: 'fire', verdictKey: 'tension' },
    agree: { lineUp: 13, total: 16 },
    backYear: { ganji: '丙午', year: 2026 },
    ...overrides,
  }
}

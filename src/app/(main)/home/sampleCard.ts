/**
 * 홈 샘플 사주 카드 — 생성 파일, 손으로 고치지 않는다.
 *
 * 샘플: 1997-03-21 14:30 여 · 서울(Asia/Seoul), now = 2026-11-19T03:00:00.000Z.
 * 엔진(buildSajuCardData · assembleLifetime)이 한 번 만든 값을 체크인한다 — 홈은 요청마다
 * Swiss Ephemeris 를 돌리지 않는다. tests/lib/card/sampleCard.golden.test.ts 가 같은 입력으로
 * 다시 만들어 이 값과 비교하므로 엔진이 바뀌면 실패한다. 의도한 변경이면 다시 만든다:
 *
 *   UPDATE_SAMPLE_CARD=1 npx vitest run tests/lib/card/sampleCard.golden.test.ts
 *
 * 카드 데이터는 ko/en 한 쌍(Bi)이라 한 벌로 두 언어를 그린다. 띠의 축 행만 언어별 문구다.
 * 카드 뒷면 세운은 여기 없다 — 홈이 보는 사람의 날짜로 정한다.
 */
import type { CardTraitRow, SajuCardData } from '@/lib/card/types'
import type { Lang } from '@/lib/i18n/bi'
import type { DestinyDecadeCross } from '@/types/calendar'

/** 샘플 출생 정보(폴리오 스탬프용) — 카드 데이터에는 들어가지 않는다. */
export const SAMPLE_BIRTH = {
  date: '1997-03-21',
  time: '14:30',
  gender: 'female',
  timeZone: 'Asia/Seoul',
  latitude: 37.5665,
  longitude: 126.978,
  timeUnknown: false,
} as const

/** 픽스처를 만든 '지금'. */
export const SAMPLE_NOW = '2026-11-19T03:00:00.000Z'

export const SAMPLE_CARD: SajuCardData = {
  pillars: {
    hour: null,
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
  typeName: { ko: '착실히 쌓는 자유인', en: 'steady-building Free Spirit' },
  lifeShape: { ko: '굴곡형', en: 'Ups and downs' },
  identity: { saju: 'water', astro: 'fire', verdictKey: 'tension' },
  agree: { lineUp: 13, total: 16 },
}

export interface SampleBand {
  /** 이 10년의 겹침(타이밍) 행 — 비면 축 행(traits)으로 대신한다. */
  timing: DestinyDecadeCross[]
  /** 대체 축 행(정체성 · 기질) — 교차 판정, 언어별 문구. */
  traits: Record<Lang, CardTraitRow[]>
}

export const SAMPLE_BAND: SampleBand = {
  timing: [],
  traits: {
    ko: [
      {
        key: 'identity',
        axis: '정체성',
        verdict: 'tension',
        saju: { text: '수', w: '잔잔히 스며드는' },
        stars: { text: '화', w: '드러내고 타오르는' },
      },
      {
        key: 'temperament',
        axis: '기질',
        verdict: 'complement',
        saju: { text: '토', w: '안정되고 믿음직한' },
        stars: { text: '화', w: '드러내고 타오르는' },
      },
    ],
    en: [
      {
        key: 'identity',
        axis: 'Identity',
        verdict: 'tension',
        saju: { text: 'Water', w: 'fluid and permeating' },
        stars: { text: 'Fire', w: 'expressive and fiery' },
      },
      {
        key: 'temperament',
        axis: 'Temperament',
        verdict: 'complement',
        saju: { text: 'Earth', w: 'steady and grounded' },
        stars: { text: 'Fire', w: 'expressive and fiery' },
      },
    ],
  },
}

export interface SampleDial {
  /** 태어난 해 — 원국 연주의 사주년(입춘 기준). */
  bornYear: number
  /** 다음 인생 마디(생애 마디 중 올해 다음 첫 항목) — 해와 만 나이. */
  turn: { year: number; age: number } | null
}

export const SAMPLE_DIAL: SampleDial = { bornYear: 1997, turn: { year: 2033, age: 35 } }

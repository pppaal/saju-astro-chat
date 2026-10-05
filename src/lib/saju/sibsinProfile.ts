// src/lib/saju/sibsinProfile.ts
//
// 십성(十星) 사전 — 색인 대상 SEO 표면의 콘텐츠 엔진.
//
// 왜 이걸 먼저 하는가:
//
//  1) **링크 그래프의 빠진 노드.** /saju/ilju 60개 페이지가 "배우자궁 편인"
//     같은 문장을 쓰면서 그 용어를 설명하는 페이지가 없었다. 용어가 막다른
//     골목이면 60페이지가 서로만 가리키는 고립된 묶음이 된다.
//
//  2) **일간 쌍 55개는 접었다.** 실측에서 55쌍 중 서로 다른 사실집합이
//     15개뿐이었다 — 십성이 (오행 관계 × 음양)으로 결정돼 조합이 수렴한다.
//     반대로 십성 10개는 서로 완전히 다른 개념이라 페이지마다 내용이 실제로
//     다르고, "정재 뜻"·"편관이란" 류는 한국어 검색량이 큰 헤드 용어다.
//
//  3) 엔진이 각 십성에 대해 **계산해서 줄 수 있는 것**이 있다: 그 십성을
//     만드는 (일간, 상대천간) 10쌍, 오행·음양 규칙, 성별별 배우자성 여부,
//     그리고 그 십성을 배우자궁에 가진 일주 목록(4~8개). 마지막 항목이
//     일주 60페이지와 양방향으로 링크된다.
//
// 순수·결정론. 모든 값은 기존 SSOT(sibseongFor·spouseStarsFor·iljuProfile)에서
// 끌어오고, 해석 문장은 아래 표에 사람이 쓴 것만 쓴다(엔진 계산과 섞지 않음).

import { ILGAN_ORDER } from '@/lib/saju/ilganCompat'
import { allIljuGanji, iljuProfile, type IljuProfile } from '@/lib/saju/iljuProfile'
import { STEM_EL, sibseongFor, spouseStarsFor } from '@/lib/compatibility/sajuSynastryData'

/** 십성 10개 — 정규 순서(비겁 → 식상 → 재성 → 관성 → 인성). */
export const SIBSIN_ORDER = [
  '비견',
  '겁재',
  '식신',
  '상관',
  '편재',
  '정재',
  '편관',
  '정관',
  '편인',
  '정인',
] as const

export type SibsinName = (typeof SIBSIN_ORDER)[number]

/** 십성 → 슬러그·영문명·계열. */
const META: Record<SibsinName, { ro: string; en: string; groupKo: string; groupEn: string }> = {
  비견: { ro: 'bigyeon', en: 'Peer', groupKo: '비겁', groupEn: 'Self' },
  겁재: { ro: 'geopjae', en: 'Rival', groupKo: '비겁', groupEn: 'Self' },
  식신: { ro: 'siksin', en: 'Output', groupKo: '식상', groupEn: 'Output' },
  상관: { ro: 'sanggwan', en: 'Expression', groupKo: '식상', groupEn: 'Output' },
  편재: { ro: 'pyeonjae', en: 'Indirect Wealth', groupKo: '재성', groupEn: 'Wealth' },
  정재: { ro: 'jeongjae', en: 'Direct Wealth', groupKo: '재성', groupEn: 'Wealth' },
  편관: { ro: 'pyeongwan', en: 'Indirect Authority', groupKo: '관성', groupEn: 'Authority' },
  정관: { ro: 'jeonggwan', en: 'Direct Authority', groupKo: '관성', groupEn: 'Authority' },
  편인: { ro: 'pyeonin', en: 'Indirect Resource', groupKo: '인성', groupEn: 'Resource' },
  정인: { ro: 'jeongin', en: 'Direct Resource', groupKo: '인성', groupEn: 'Resource' },
}

/**
 * 십성 뜻풀이 — **사람이 쓴 고전 해석.** 엔진 계산값과 섞지 않는다.
 * 짧게 유지한다: 긴 산문은 LLM 이 리포트에서 맡고, 이 페이지는 사전이다.
 */
const GLOSS: Record<SibsinName, { ko: string; en: string }> = {
  비견: {
    ko: '나와 같은 오행, 같은 음양. 대등한 동료·형제·경쟁자 자리입니다. 자립심과 고집이 함께 오고, 많으면 남의 말을 안 듣는 쪽으로 기웁니다.',
    en: 'Same element, same polarity as the day master — peers, siblings, equals. Brings independence and stubbornness together; in excess it tips toward not listening.',
  },
  겁재: {
    ko: '나와 같은 오행, 다른 음양. 동지이면서 경쟁자입니다. 협력도 빠르고 다툼도 빠릅니다. 재물을 나눠 쓰는 자리라 재성과 같이 있으면 돈 관리가 관건이 됩니다.',
    en: 'Same element, opposite polarity — ally and rival at once. Quick to cooperate, quick to clash. It shares wealth, so money management matters when Wealth is present.',
  },
  식신: {
    ko: '내가 생해주는 오행, 같은 음양. 꾸준히 내보내는 힘 — 먹고사는 능력, 표현, 재능입니다. 무리 없이 오래 가는 결이라 건강·식복과 묶어 봅니다.',
    en: 'The element you generate, same polarity — steady output: livelihood, expression, craft. It lasts without strain, so it is read alongside health and sustenance.',
  },
  상관: {
    ko: '내가 생해주는 오행, 다른 음양. 식신보다 날카롭고 튑니다. 재능·화술·창의가 세게 나오지만 규범(관성)과 부딪히기 쉬워 "관을 상하게 한다"는 이름이 붙었습니다.',
    en: 'The element you generate, opposite polarity — sharper and more volatile than Output. Talent and eloquence come out strongly, but it collides with Authority, hence the name.',
  },
  편재: {
    ko: '내가 극하는 오행, 다른 음양. 움직이는 재물 — 사업·투자·활동 범위입니다. 남자에게는 처성이며, 정재보다 활달하고 자유로운 결로 봅니다.',
    en: 'The element you control, opposite polarity — moving wealth: business, investment, reach. For a man it is the spouse star, livelier and freer than Direct Wealth.',
  },
  정재: {
    ko: '내가 극하는 오행, 같은 음양. 고정된 재물 — 월급·성실·절약입니다. 남자에게는 처성이며, 안정과 가정의 결로 봅니다.',
    en: 'The element you control, same polarity — fixed wealth: salary, diligence, thrift. For a man it is the spouse star, read as stability and home.',
  },
  편관: {
    ko: '나를 극하는 오행, 같은 음양. 칠살(七殺)이라고도 합니다. 압박·도전·긴장이고, 여자에게는 부성이며 자극적인 결로 봅니다. 잘 쓰면 추진력, 과하면 소모입니다.',
    en: 'The element that controls you, same polarity — also called the Seven Killings. Pressure, challenge, tension. For a woman it is the spouse star, read as intensity.',
  },
  정관: {
    ko: '나를 극하는 오행, 다른 음양. 규범·책임·사회적 자리입니다. 여자에게는 부성이며, 반듯하고 믿을 만한 결로 봅니다. 직장·명예와 묶어 봅니다.',
    en: 'The element that controls you, opposite polarity — norms, responsibility, standing. For a woman it is the spouse star, read as upright and dependable.',
  },
  편인: {
    ko: '나를 생해주는 오행, 같은 음양. 효신(梟神)이라고도 합니다. 직관·통찰·비주류 공부입니다. 깊이 파는 힘이지만 치우치면 공상과 눈치로 흐릅니다.',
    en: 'The element that generates you, same polarity — intuition, insight, unconventional study. Deep focus, but when skewed it drifts into fantasy.',
  },
  정인: {
    ko: '나를 생해주는 오행, 다른 음양. 어머니·학문·보호입니다. 정규 교육과 문서, 받쳐주는 힘으로 보고, 많으면 실행보다 생각이 앞섭니다.',
    en: 'The element that generates you, opposite polarity — mother, learning, protection. Formal study and documents; in excess, thinking outruns doing.',
  },
}

export interface SibsinProfile {
  name: SibsinName
  slug: string
  en: string
  groupKo: string
  groupEn: string
  gloss: { ko: string; en: string }

  /** 남자의 배우자성(재성)인가 / 여자의 배우자성(관성)인가. */
  isSpouseStarForMale: boolean
  isSpouseStarForFemale: boolean

  /** 이 십성을 만드는 (일간, 상대천간) 쌍 — 일간 10개마다 정확히 1개. */
  stemPairs: { dayStem: string; otherStem: string; dayElement: string; otherElement: string }[]

  /** 이 십성이 **배우자궁(일지)** 에 앉은 일주 — 일주 60페이지와 양방향 링크. */
  iljuWithSeat: IljuProfile[]
}

export function sibsinProfile(name: string): SibsinProfile | null {
  if (!SIBSIN_ORDER.includes(name as SibsinName)) return null
  const key = name as SibsinName
  const m = META[key]

  // 일간마다 이 십성에 해당하는 상대 천간을 찾는다(각 일간에 정확히 1개).
  const stemPairs: SibsinProfile['stemPairs'] = []
  for (const day of ILGAN_ORDER) {
    for (const other of ILGAN_ORDER) {
      if (sibseongFor(day, other) === key) {
        stemPairs.push({
          dayStem: day,
          otherStem: other,
          dayElement: STEM_EL[day] ?? '',
          otherElement: STEM_EL[other] ?? '',
        })
      }
    }
  }

  const iljuWithSeat = allIljuGanji()
    .map((g) => iljuProfile(g))
    .filter((p): p is IljuProfile => Boolean(p) && p!.spouseSeat.sibsin === key)

  return {
    name: key,
    slug: m.ro,
    en: m.en,
    groupKo: m.groupKo,
    groupEn: m.groupEn,
    gloss: GLOSS[key],
    isSpouseStarForMale: spouseStarsFor('male').has(key),
    isSpouseStarForFemale: spouseStarsFor('female').has(key),
    stemPairs,
    iljuWithSeat,
  }
}

export function sibsinBySlug(slug: string): SibsinProfile | null {
  const target = slug.trim().toLowerCase()
  for (const name of SIBSIN_ORDER) {
    if (META[name].ro === target) return sibsinProfile(name)
  }
  return null
}

export function allSibsinSlugs(): string[] {
  return SIBSIN_ORDER.map((n) => META[n].ro)
}

/** 십성 이름 → 슬러그. 일주·궁합 페이지에서 용어 링크를 걸 때 쓴다. */
export function sibsinSlugOf(name: string): string | null {
  return SIBSIN_ORDER.includes(name as SibsinName) ? META[name as SibsinName].ro : null
}

// src/lib/saju/iljuProfile.ts
//
// 60갑자 일주(日柱) 프로필 — **프로그래매틱 SEO 표면의 콘텐츠 엔진.**
//
// 왜 이걸 만드는가: 2026-06 에 영어 타로 카드 의미 글 140개를 한 달에 쏟아
// 발행했는데, 그 키워드("The Fool Tarot Card Meaning")는 Biddy Tarot·
// Labyrinthos 가 10~15년 점유한 자리라 신규 도메인이 들어갈 틈이 없다. 반면
// "일주" 계열 질의는 경쟁이 거의 없고, **우리 엔진만 계산할 수 있다** —
// 카드 의미는 누구나 쓰지만 `辛未` 의 배우자궁 십성·공망·천을귀인·지지 합충은
// 사주 엔진 없이는 한 줄도 못 쓴다.
//
// 이 모듈은 **순수·결정론**이다. 일주 2글자만으로 전부 계산되며 "지금"에
// 의존하지 않는다(엔진 컨벤션). 날조 금지: 아래 필드는 전부 기존 SSOT 헬퍼
// (sibseongFor·gongmangOf·BRANCH_* ·CHEONULGWIIN)에서 끌어오고, 해석 문장을
// 임의로 덧붙이지 않는다.

import {
  STEM_EL,
  BRANCH_EL,
  BRANCH_MAIN_STEM,
  BRANCH_HAP,
  BRANCH_CHUNG,
  BRANCH_HAE,
  BRANCH_PA,
  TRI_HAP,
  CHEONULGWIIN,
  gongmangOf,
  sibseongFor,
  spouseStarsFor,
} from '@/lib/compatibility/sajuSynastryData'

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const

/** 천간 — 한글 음 / 로마자 / 음양. 음양은 순서(짝수=양)로 정해진다. */
const STEM_READ: Record<string, { ko: string; ro: string }> = {
  甲: { ko: '갑', ro: 'gap' },
  乙: { ko: '을', ro: 'eul' },
  丙: { ko: '병', ro: 'byeong' },
  丁: { ko: '정', ro: 'jeong' },
  戊: { ko: '무', ro: 'mu' },
  己: { ko: '기', ro: 'gi' },
  庚: { ko: '경', ro: 'gyeong' },
  辛: { ko: '신', ro: 'sin' },
  壬: { ko: '임', ro: 'im' },
  癸: { ko: '계', ro: 'gye' },
}

const BRANCH_READ: Record<string, { ko: string; ro: string; animalKo: string; animalEn: string }> =
  {
    子: { ko: '자', ro: 'ja', animalKo: '쥐', animalEn: 'Rat' },
    丑: { ko: '축', ro: 'chuk', animalKo: '소', animalEn: 'Ox' },
    寅: { ko: '인', ro: 'in', animalKo: '호랑이', animalEn: 'Tiger' },
    卯: { ko: '묘', ro: 'myo', animalKo: '토끼', animalEn: 'Rabbit' },
    辰: { ko: '진', ro: 'jin', animalKo: '용', animalEn: 'Dragon' },
    巳: { ko: '사', ro: 'sa', animalKo: '뱀', animalEn: 'Snake' },
    午: { ko: '오', ro: 'o', animalKo: '말', animalEn: 'Horse' },
    未: { ko: '미', ro: 'mi', animalKo: '양', animalEn: 'Goat' },
    申: { ko: '신', ro: 'sin', animalKo: '원숭이', animalEn: 'Monkey' },
    酉: { ko: '유', ro: 'yu', animalKo: '닭', animalEn: 'Rooster' },
    戌: { ko: '술', ro: 'sul', animalKo: '개', animalEn: 'Dog' },
    亥: { ko: '해', ro: 'hae', animalKo: '돼지', animalEn: 'Pig' },
  }

/** 오행 한글 → 영문. */
export const ELEMENT_EN: Record<string, string> = {
  목: 'Wood',
  화: 'Fire',
  토: 'Earth',
  금: 'Metal',
  수: 'Water',
}

export interface IljuRelations {
  /** 육합 — 일지와 짝을 이루는 지지(끌림). */
  yukhap: string | null
  /** 충 — 정면으로 부딪히는 지지. */
  chung: string | null
  /** 해 — 서로 깎는 지지. */
  hae: string | null
  /** 파 — 깨뜨리는 지지. */
  pa: string | null
  /** 삼합 — 같은 국을 이루는 나머지 두 지지 + 그 오행. */
  samhap: { branches: string[]; element: string } | null
}

export interface IljuProfile {
  /** 한자 일주 — 辛未 */
  ganji: string
  /** URL 슬러그 — sinmi (국문 음의 로마자) */
  slug: string
  ko: string
  /** 60갑자 순번 (1~60, 甲子=1) */
  index: number

  dayStem: { han: string; ko: string; element: string; yinYang: '양' | '음' }
  dayBranch: {
    han: string
    ko: string
    element: string
    animalKo: string
    animalEn: string
    /** 지장간 본기 — 배우자궁 십성의 근거. */
    hiddenStem: string
  }

  /**
   * 배우자궁(일지) 십성 — 일지 본기를 일간 기준으로 본 것.
   * 남자는 재성(정재·편재)이 처성, 여자는 관성(정관·편관)이 부성이라
   * 성별별로 "배우자성이 배우자궁에 앉았는가"가 갈린다(spouseStarsFor SSOT).
   */
  spouseSeat: {
    sibsin: string
    isSpouseStarForMale: boolean
    isSpouseStarForFemale: boolean
  }

  /** 공망 — 이 일주 기준 비어 있는 2지지. */
  gongmang: string[]
  /** 천을귀인 — 일간 기준 귀인 지지. 일지가 여기 들면 "일지 천을귀인". */
  cheoneul: string[]
  cheoneulOnDayBranch: boolean

  relations: IljuRelations
}

const yinYangOf = (stem: string): '양' | '음' =>
  STEMS.indexOf(stem as (typeof STEMS)[number]) % 2 === 0 ? '양' : '음'

/** 60갑자 전체 — 甲子(1) ~ 癸亥(60). 천간 10 × 지지 12 의 최소공배수 순환. */
export function allIljuGanji(): string[] {
  const out: string[] = []
  for (let i = 0; i < 60; i++) {
    out.push(`${STEMS[i % 10]}${BRANCHES[i % 12]}`)
  }
  return out
}

function relationsFor(branch: string): IljuRelations {
  const tri = TRI_HAP.find((t) => t.branches.includes(branch))
  return {
    yukhap: BRANCH_HAP[branch]?.other ?? null,
    chung: BRANCH_CHUNG[branch] ?? null,
    hae: BRANCH_HAE[branch] ?? null,
    pa: BRANCH_PA[branch] ?? null,
    samhap: tri
      ? { branches: tri.branches.filter((b) => b !== branch), element: tri.element }
      : null,
  }
}

/** 한자 일주 → 프로필. 알 수 없는 조합이면 null(60갑자 밖). */
export function iljuProfile(ganji: string): IljuProfile | null {
  if (ganji.length !== 2) return null
  const stem = ganji[0]
  const branch = ganji[1]
  const sr = STEM_READ[stem]
  const br = BRANCH_READ[branch]
  if (!sr || !br) return null
  const index = allIljuGanji().indexOf(ganji)
  if (index < 0) return null // 甲丑 같은 60갑자 밖 조합

  const hiddenStem = BRANCH_MAIN_STEM[branch] ?? ''
  const seatSibsin = hiddenStem ? sibseongFor(stem, hiddenStem) : ''
  const cheoneul = CHEONULGWIIN[stem] ?? []

  return {
    ganji,
    slug: `${sr.ro}${br.ro}`,
    ko: `${sr.ko}${br.ko}`,
    index: index + 1,
    dayStem: {
      han: stem,
      ko: sr.ko,
      element: STEM_EL[stem] ?? '',
      yinYang: yinYangOf(stem),
    },
    dayBranch: {
      han: branch,
      ko: br.ko,
      element: BRANCH_EL[branch] ?? '',
      animalKo: br.animalKo,
      animalEn: br.animalEn,
      hiddenStem,
    },
    spouseSeat: {
      sibsin: seatSibsin,
      isSpouseStarForMale: spouseStarsFor('male').has(seatSibsin),
      isSpouseStarForFemale: spouseStarsFor('female').has(seatSibsin),
    },
    gongmang: gongmangOf(stem, branch),
    cheoneul,
    cheoneulOnDayBranch: cheoneul.includes(branch),
    relations: relationsFor(branch),
  }
}

/** 슬러그 → 프로필. 라우트에서 쓴다. */
export function iljuBySlug(slug: string): IljuProfile | null {
  const target = slug.trim().toLowerCase()
  for (const ganji of allIljuGanji()) {
    const p = iljuProfile(ganji)
    if (p && p.slug === target) return p
  }
  return null
}

/** 전체 슬러그 — sitemap·허브용. */
export function allIljuSlugs(): string[] {
  return allIljuGanji()
    .map((g) => iljuProfile(g)?.slug)
    .filter((s): s is string => Boolean(s))
}

/**
 * 어떤 지지를 일지로 갖는 일주들 — 내부 링크용.
 *
 * 육합/충 상대 지지를 일지로 갖는 일주가 각각 5개씩 있다(천간 5개 × 그 지지).
 * 60개 페이지가 서로를 가리켜 링크 그래프가 생긴다 — 고립된 페이지 60개보다
 * 색인·순위에 유리하고, 사용자에게도 "내 일주와 끌리는 일주" 가 실제 링크다.
 */
export function iljuWithBranch(branch: string): IljuProfile[] {
  return allIljuGanji()
    .map((g) => iljuProfile(g))
    .filter((p): p is IljuProfile => Boolean(p) && p!.dayBranch.han === branch)
}

/**
 * 어떤 천간을 일간으로 갖는 일주들(6개) — 일간 궁합 페이지에서 일주 페이지로
 * 교차 링크할 때 쓴다. 두 SEO 표면이 서로를 가리켜 링크 그래프가 된다.
 */
export function iljuWithStem(stem: string): IljuProfile[] {
  return allIljuGanji()
    .map((g) => iljuProfile(g))
    .filter((p): p is IljuProfile => Boolean(p) && p!.dayStem.han === stem)
}

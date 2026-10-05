// src/lib/saju/ilganCompat.ts
//
// 일간(日干) × 일간 궁합 — 프로그래매틱 SEO 표면의 콘텐츠 엔진.
//
// 왜 일간 쌍인가: 일주×일주는 3600쌍이라 얇은 페이지 대량 생성(doorway page)이
// 되고, 띠궁합(78쌍)은 이미 있다. 일간 10개의 **순서 무관 조합 55쌍**이
// 적정 규모이고, 일간 대 일간은 명리에서 궁합을 보는 가장 기본 축이다
// (오늘 실제 궁합 판정에 쓴 로직 그대로 — compatReport.dayMaster).
//
// 핵심 비대칭: 오행 관계(생·극·비화)는 대칭이지만 **십성은 방향이 있다.**
// 辛(금)과 甲(목)이면 금극목이라 관계는 하나인데, 辛 입장에서 甲은 정재이고
// 甲 입장에서 辛은 정관이다. 그래서 한 페이지에 양방향을 모두 싣고, 역순
// 슬러그는 canonical 로 정규 순서를 가리킨다(띠궁합 페이지와 같은 처리).
//
// 순수·결정론: 일간 2글자만으로 전부 계산되고 "지금"에 의존하지 않는다.
// 모든 값은 기존 SSOT 헬퍼에서 끌어온다 — 해석 문장을 임의로 덧붙이지 않는다.

import {
  STEM_EL,
  STEM_HAP,
  STEM_CHUNG,
  EL_CONTROLS,
  sibseongFor,
  spouseStarsFor,
} from '@/lib/compatibility/sajuSynastryData'

/** 천간 10개 — 정규 순서(60갑자 순). 슬러그 정규화의 기준이기도 하다. */
export const ILGAN_ORDER = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const

const READ: Record<string, { ko: string; ro: string }> = {
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

export type ElementRelation =
  | 'same' // 비화 — 같은 오행
  | 'aGeneratesB' // A 가 B 를 생
  | 'bGeneratesA'
  | 'aControlsB' // A 가 B 를 극
  | 'bControlsA'

export interface IlganSide {
  han: string
  ko: string
  ro: string
  element: string
  yinYang: '양' | '음'
}

export interface IlganCompat {
  /** 정규 슬러그 — 'gap-sin' (ILGAN_ORDER 순) */
  slug: string
  a: IlganSide
  b: IlganSide
  /** 두 일간이 같은 글자인가(갑×갑 등 10쌍). */
  isSame: boolean

  /** 오행 관계 — 대칭. */
  relation: ElementRelation

  /** 십성 — **방향이 있다.** aToB = A 입장에서 B 가 무슨 십성인가. */
  aToB: string
  bToA: string

  /**
   * 배우자성 적중 — 남자는 재성이 처, 여자는 관성이 부(spouseStarsFor SSOT).
   * A 가 남자이고 B 가 그의 재성이면 aAsMaleSeesSpouse = true.
   */
  aAsMaleSeesSpouse: boolean
  aAsFemaleSeesSpouse: boolean
  bAsMaleSeesSpouse: boolean
  bAsFemaleSeesSpouse: boolean

  /**
   * 상호 정배우자성 — 한쪽이 상대를 정재로, 상대는 그를 정관으로 보는 구조.
   * 남자 일간이 여자 일간을 극하면서 음양이 다르면 자동 성립한다(일간 조합
   * 100 중 10, 약 10%). 명리에서 "서로가 서로의 배우자성"이라 부르는 그 배치.
   */
  mutualPrimarySpouse: boolean

  /** 천간합 — 합하면 어떤 오행으로 화하는가. 없으면 null. */
  stemHap: { element: string } | null
  /** 천간충 — 정면으로 부딪히는 짝인가. */
  stemChung: boolean
}

const yinYangOf = (stem: string): '양' | '음' =>
  ILGAN_ORDER.indexOf(stem as (typeof ILGAN_ORDER)[number]) % 2 === 0 ? '양' : '음'

function sideOf(stem: string): IlganSide | null {
  const r = READ[stem]
  if (!r) return null
  return {
    han: stem,
    ko: r.ko,
    ro: r.ro,
    element: STEM_EL[stem] ?? '',
    yinYang: yinYangOf(stem),
  }
}

function elementRelation(elA: string, elB: string): ElementRelation {
  if (elA === elB) return 'same'
  if (EL_CONTROLS[elA] === elB) return 'aControlsB'
  if (EL_CONTROLS[elB] === elA) return 'bControlsA'
  // 극이 아니고 같지도 않으면 상생 — 어느 쪽이 생하는지는 극 관계의 여집합으로
  // 판정한다. 오행 순환(목화토금수)에서 극하지 않는 비동일 쌍은 반드시 생이다.
  const GENERATES: Record<string, string> = {
    목: '화',
    화: '토',
    토: '금',
    금: '수',
    수: '목',
  }
  if (GENERATES[elA] === elB) return 'aGeneratesB'
  return 'bGeneratesA'
}

/** 정규 슬러그 — ILGAN_ORDER 순서로 고정. 역순 입력도 같은 값을 돌려준다. */
export function canonicalIlganSlug(a: string, b: string): string {
  const ia = ILGAN_ORDER.indexOf(a as (typeof ILGAN_ORDER)[number])
  const ib = ILGAN_ORDER.indexOf(b as (typeof ILGAN_ORDER)[number])
  if (ia < 0 || ib < 0) return ''
  const [x, y] = ia <= ib ? [a, b] : [b, a]
  return `${READ[x].ro}-${READ[y].ro}`
}

/** 한자 두 일간 → 궁합. 정규 순서로 정렬해 반환한다. */
export function ilganCompat(aStem: string, bStem: string): IlganCompat | null {
  const ia = ILGAN_ORDER.indexOf(aStem as (typeof ILGAN_ORDER)[number])
  const ib = ILGAN_ORDER.indexOf(bStem as (typeof ILGAN_ORDER)[number])
  if (ia < 0 || ib < 0) return null
  // 정규 순서로 스왑 — 같은 쌍이 두 페이지가 되지 않게.
  const [x, y] = ia <= ib ? [aStem, bStem] : [bStem, aStem]

  const a = sideOf(x)
  const b = sideOf(y)
  if (!a || !b) return null

  const aToB = sibseongFor(x, y)
  const bToA = sibseongFor(y, x)
  const male = spouseStarsFor('male')
  const female = spouseStarsFor('female')

  // 상호 정배우자성 — 한쪽이 상대를 정재로, 상대가 그를 정관으로 보는 구조.
  const mutualPrimarySpouse =
    (aToB === '정재' && bToA === '정관') || (aToB === '정관' && bToA === '정재')

  return {
    slug: canonicalIlganSlug(x, y),
    a,
    b,
    isSame: x === y,
    relation: elementRelation(a.element, b.element),
    aToB,
    bToA,
    aAsMaleSeesSpouse: male.has(aToB),
    aAsFemaleSeesSpouse: female.has(aToB),
    bAsMaleSeesSpouse: male.has(bToA),
    bAsFemaleSeesSpouse: female.has(bToA),
    mutualPrimarySpouse,
    stemHap: STEM_HAP[x]?.other === y ? { element: STEM_HAP[x].element } : null,
    stemChung: STEM_CHUNG[x] === y,
  }
}

/** 슬러그 → 궁합. 역순 슬러그도 받아 정규 결과를 돌려준다(canonical 처리용). */
export function ilganCompatBySlug(slug: string): IlganCompat | null {
  const parts = slug.trim().toLowerCase().split('-')
  if (parts.length !== 2) return null
  const find = (ro: string) => ILGAN_ORDER.find((s) => READ[s].ro === ro)
  const a = find(parts[0])
  const b = find(parts[1])
  if (!a || !b) return null
  return ilganCompat(a, b)
}

/** 정규 쌍 전체 — 55개(C(10,2)=45 + 동일 10). sitemap·허브용. */
export function allIlganPairSlugs(): string[] {
  const out: string[] = []
  for (let i = 0; i < ILGAN_ORDER.length; i++) {
    for (let j = i; j < ILGAN_ORDER.length; j++) {
      out.push(canonicalIlganSlug(ILGAN_ORDER[i], ILGAN_ORDER[j]))
    }
  }
  return out
}

/** 그 일간이 끼는 쌍 전체(10개) — 일주 페이지에서 교차 링크할 때 쓴다. */
export function ilganPairsFor(stem: string): string[] {
  if (!READ[stem]) return []
  return ILGAN_ORDER.map((other) => canonicalIlganSlug(stem, other))
}

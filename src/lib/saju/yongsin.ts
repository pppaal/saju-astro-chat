// src/lib/Saju/yongsin.ts
// 용신(用神) 선정 모듈 - 사주명리학 핵심 기능

import {
  FiveElement,
  YinYang,
  SajuPillars,
  PillarData,
  SajuPillarsInput,
  MaybeTimeless,
} from './types'
import { STEMS, BRANCHES, FIVE_ELEMENT_RELATIONS } from './constants'
import { presentPillars } from './stemBranchUtils'
import {
  computeStrengthScore,
  toStrengthCoreInput,
  strengthBandOf,
  type StrengthBand,
} from './strengthScore'
import { JOHU_YONGSIN_DB } from './johuYongsinData'

/**
 * 용신 유형
 * - 억부용신: 일간의 강약을 조절하는 용신
 * - 조후용신: 출생월의 한난조습을 조절하는 용신
 * - 통관용신: 충돌하는 오행 사이를 중재하는 용신
 * - 병약용신: 사주의 병(病)을 치료하는 약(藥) 역할의 용신
 */
export type YongsinType = '억부용신' | '조후용신' | '통관용신' | '병약용신'

/**
 * 일간 강약 상태 — strengthScore.StrengthBand 의 별칭 (CONVENTIONS §10 5단계 단일 매핑)
 */
export type DaymasterStrength = StrengthBand

/**
 * 용신 선정 결과
 */
export interface YongsinResult {
  primaryYongsin: FiveElement // 주용신
  secondaryYongsin?: FiveElement // 보조용신(희신)
  yongsinType: YongsinType // 용신 유형
  daymasterStrength: DaymasterStrength // 일간 강약
  reasoning: string // 용신 선정 이유
  kibsin?: FiveElement // 기신(忌神) - 피해야 할 오행
  gusin?: FiveElement // 구신(仇神) - 기신을 돕는 오행
}

/**
 * 오행 개수 통계
 */
export interface ElementStats {
  목: number
  화: number
  토: number
  금: number
  수: number
}

// Re-export for backward compatibility
export type { SajuPillarsInput }

/** 시주가 없을 수 있는 입력 — 출생시각 미상이면 삼주(년·월·일)로 판정 (CONVENTIONS §5). */
type YongsinPillars = MaybeTimeless<SajuPillarsInput>

// ============ 헬퍼 함수들 ============

/**
 * 천간/지지에서 오행 가져오기
 */
function getElement(char: string): FiveElement | null {
  const stem = STEMS.find((s) => s.name === char)
  if (stem) {
    return stem.element
  }

  const branch = BRANCHES.find((b) => b.name === char)
  if (branch) {
    return branch.element
  }

  return null
}

/**
 * 천간에서 음양 가져오기
 */
function getYinYang(stem: string): YinYang | null {
  const found = STEMS.find((s) => s.name === stem)
  return found ? found.yin_yang : null
}

/**
 * 드러난 8글자(천간 4 + 지지 4, 시간 미상이면 6글자)의 오행 개수 — 병약·통관 판정용.
 * 임계(병 ≥3, 통관 쌍 각 ≥2)는 글자 수 그대로 둔다 — 비율로 환산해도(3/8→2.25/6,
 * 2/8→1.5/6) 정수 임계가 같고, 삼주에서 성립하면 어떤 시주가 와도 성립한다.
 *
 * 예전엔 지장간 정기를 +0.5 더 세어 지지가 1.5배가 됐다. 그 결과 사주당 합계가
 * 10 이라 최대값 ≥ 3 이 거의 확정이었고(병약이 늘 발동 → 억부 도달 0), §6 이
 * 금지한 *제3의 지장간 가중치*였다(엔진 감사 SD-04·F8). 지장간은 강약 점수
 * (computeStrengthScore)가 이미 반영하므로 여기서는 드러난 글자만 센다.
 */
function countElements(pillars: YongsinPillars): ElementStats {
  const stats: ElementStats = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }

  for (const [, pillar] of presentPillars(pillars)) {
    const stemElement = getElement(pillar.stem)
    if (stemElement) {
      stats[stemElement]++
    }
    const branchElement = getElement(pillar.branch)
    if (branchElement) {
      stats[branchElement]++
    }
  }

  return stats
}

/**
 * 일간 기준 오행 역할 (억부 그룹 판정용).
 */
type Role = '비겁' | '인성' | '식상' | '재성' | '관성'
function elementOfRole(dm: FiveElement, role: Role): FiveElement {
  switch (role) {
    case '비겁':
      return dm
    case '인성':
      return FIVE_ELEMENT_RELATIONS.생받는관계[dm]
    case '식상':
      return FIVE_ELEMENT_RELATIONS.생하는관계[dm]
    case '재성':
      return FIVE_ELEMENT_RELATIONS.극하는관계[dm]
    case '관성':
      return FIVE_ELEMENT_RELATIONS.극받는관계[dm]
  }
}

function isStrong(s: DaymasterStrength): boolean {
  return s === '극신강' || s === '신강'
}
function isWeak(s: DaymasterStrength): boolean {
  return s === '극신약' || s === '신약'
}

/**
 * 억부가 허용하는 오행 — 신강: 식상·재성·관성 / 신약: 인성·비겁 / 중화: 제약 없음(null).
 * 병약·통관 용신도 이 집합 안에서만 고른다 (CONVENTIONS §10 '억부 + 조후 함께').
 */
function eokbuAllowed(dm: FiveElement, s: DaymasterStrength): FiveElement[] | null {
  if (isStrong(s)) return (['식상', '재성', '관성'] as Role[]).map((r) => elementOfRole(dm, r))
  if (isWeak(s)) return (['인성', '비겁'] as Role[]).map((r) => elementOfRole(dm, r))
  return null
}

/**
 * 일간 강약 판단 — 강약 점수 SSOT(`computeStrengthScore`, CONVENTIONS §11)에서
 * 5단계(DaymasterStrength)를 도출한다.
 *
 * 옛 코드는 countElements 비율(totalSupport/totalWeaken) 휴리스틱(임계 2.5/1.5/
 * 0.8/0.4 + 월령 보정)을 별도로 썼는데, 이는 SSOT 5요소 가중 점수와 달라
 * 드리프트 원인이었다(§11 위반). 이제 SSOT 점수(0~100, 50 중심) → 5단계로 매핑한다.
 *
 * 점수 → 5단계는 strengthBandOf 하나만 쓴다 (CONVENTIONS §10 — geokguk.getStrength/
 * getStrengthExtreme 와 같은 60/40·80/20):
 *   total ≥ 80           → 극신강
 *   60 ≤ total < 80      → 신강
 *   40 ≤ total < 60      → 중화
 *   20 <  total < 40     → 신약
 *   total ≤ 20           → 극신약
 */
function assessDaymasterStrength(daymaster: string, pillars: YongsinPillars): DaymasterStrength {
  const daymasterElement = getElement(daymaster)
  if (!daymasterElement) {
    return '중화'
  }
  return strengthBandOf(computeStrengthScore(toStrengthCoreInput(pillars)).total)
}

/**
 * 억부용신 선정
 * 일간이 강하면 설기/극하는 오행, 약하면 생하는 오행.
 *
 * 반환값의 추천(yongsin·heesin)과 회피(kibsin·gusin)는 서로 겹치지 않는다.
 * 예전엔 `gusin` 한 필드가 희신(보조용신)과 구신(회피)을 겸해 — 신강은 재성,
 * 신약은 비겁이 추천과 회피에 동시에 올랐다(엔진 감사 SD-04).
 *   신강: 용 식상 · 희 재성 · 기 인성 · 구 비겁
 *   신약: 용 인성 · 희 비겁 · 기 관살 · 구 재성(재생살)
 */
function selectEokbuYongsin(
  daymaster: string,
  strength: DaymasterStrength,
  /**
   * 중화 세부 편향 — true=편약(偏弱), false=편강(偏强), undefined=판정 불가(종전 동작).
   * 코스 버킷(총점 40~60 전부 '중화')이 中和偏弱/偏强을 뭉개 기신을 통째로 비우면
   * 인생 곡선에 '힘든 시기'가 하나도 안 생긴다(감사 950209: 총점 45 편약인데
   * 관살·재성이 순중립으로 잡혀 초년 고비가 사라짐). 편향이 주어지면 그 방향의
   * 억부 기신을 부여한다. *용신(primary)은 바꾸지 않는다* — 추천은 인성 유지.
   */
  junghwaLean?: boolean
): {
  yongsin: FiveElement
  heesin?: FiveElement
  gusin?: FiveElement
  kibsin?: FiveElement
  reasoning: string
} {
  const daymasterElement = getElement(daymaster)
  if (!daymasterElement) {
    return { yongsin: '토', reasoning: '일간 정보 부족' }
  }

  const supportingElement = FIVE_ELEMENT_RELATIONS.생받는관계[daymasterElement] // 인성
  const drainElement = FIVE_ELEMENT_RELATIONS.생하는관계[daymasterElement] // 식상
  const wealthElement = FIVE_ELEMENT_RELATIONS.극하는관계[daymasterElement] // 재성
  const controlElement = FIVE_ELEMENT_RELATIONS.극받는관계[daymasterElement] // 관살

  if (isStrong(strength)) {
    // 신강: 식상(설기) > 재성 > 관살로 억제. 인성·비겁은 더 강하게 만드는 회피 대상.
    return {
      yongsin: drainElement,
      heesin: wealthElement,
      kibsin: supportingElement, // 인성이 기신 (더 강하게 만듦)
      gusin: daymasterElement, // 비겁이 구신
      reasoning: `일간이 ${strength}하므로 ${drainElement}(식상)으로 설기하여 조절`,
    }
  } else if (isWeak(strength)) {
    // 신약: 인성(생) > 비겁으로 보강. 관살·재성은 더 약하게 만드는 회피 대상.
    return {
      yongsin: supportingElement,
      heesin: daymasterElement, // 비겁이 희신
      kibsin: controlElement, // 관살이 기신
      gusin: wealthElement, // 재성이 구신 (재생살)
      reasoning: `일간이 ${strength}하므로 ${supportingElement}(인성)으로 생조하여 보강`,
    }
  }

  // 중화(偏弱) — 신약 준용: 인성 보강 + 관살(기신)·재성(구신). 용신 추천은 인성 유지.
  // 편강(偏强)·판정불가는 종전대로 기신 없음 — 편강 중화의 기신은 원칙상 인성인데
  // 이는 용신(인성)과 충돌하므로 무리하게 표기하지 않는다(최소 개입, 하위호환).
  if (junghwaLean === true) {
    return {
      yongsin: supportingElement,
      heesin: daymasterElement,
      gusin: wealthElement, // 재성(재생살로 약한 일간을 더 흔듦)
      kibsin: controlElement, // 관살이 기신(약한 일간을 극)
      reasoning: '일간이 중화(편약)하여 인성으로 보강, 관살을 기신으로',
    }
  }
  return {
    yongsin: supportingElement,
    reasoning: '일간이 중화하여 균형 유지에 주력',
  }
}

/**
 * 조후용신 선정
 * 출생월의 한난조습에 따라 조절하는 오행 선정
 */
function selectJohuYongsin(
  monthBranch: string,
  daymaster: string
): { yongsin: FiveElement; reasoning: string } | null {
  // 궁통보감(窮通寶鑑) 120케이스 DB(일간×월지)에서 정확한 조후용신을 찾는다.
  // 예전 getSeasonFromMonthBranch 는 한습/조열/온화 2.5버킷 휴리스틱이라
  //   ① 戌(조한)·辰(습)·申酉(가을 건조) 등을 '온화'로 흘려 가을·환절기 조후를 놓쳤고
  //   ② 巳(열)과 午(조열)을 똑같이 '수'로 처리했다 (ENGINE-AUDIT).
  // 이제 일간별 정확한 용신을 DB 에서 가져오되, 조후를 '우선(primary) 용신'으로
  // 올리는 건 조후 필요도(rating)가 높을 때(>=4)만 — 온화·미온한 달까지 매번
  // 억부를 덮어쓰지 않도록 한다(과적용 방지).
  const info = JOHU_YONGSIN_DB.find((d) => d.daymaster === daymaster && d.month === monthBranch)
  if (!info || info.rating < 4) return null
  return {
    yongsin: info.primaryYongsin,
    reasoning: `${monthBranch}월(${info.climate}) 출생 — ${info.reasoning}`,
  }
}

/**
 * 통관용신 후보 — 충돌하는 두 오행(각 2글자 이상)과 그 사이를 잇는 오행.
 * 극하는 쪽 → 통관 → 극받는 쪽 (예: 금극목 → 수, 금생수·수생목).
 */
const TONGGWAN_PAIRS: Array<{
  a: FiveElement
  b: FiveElement
  via: FiveElement
  reasoning: string
}> = [
  {
    a: '목',
    b: '금',
    via: '수',
    reasoning: '목과 금이 충돌하여 수(水)가 통관용신 (금생수, 수생목)',
  },
  {
    a: '화',
    b: '수',
    via: '목',
    reasoning: '화와 수가 충돌하여 목(木)이 통관용신 (수생목, 목생화)',
  },
  {
    a: '토',
    b: '목',
    via: '화',
    reasoning: '토와 목이 충돌하여 화(火)가 통관용신 (목생화, 화생토)',
  },
  {
    a: '금',
    b: '화',
    via: '토',
    reasoning: '금과 화가 충돌하여 토(土)가 통관용신 (화생토, 토생금)',
  },
  {
    a: '수',
    b: '토',
    via: '금',
    reasoning: '수와 토가 충돌하여 금(金)이 통관용신 (토생금, 금생수)',
  },
]

/**
 * 통관용신 선정
 * 충돌하는 두 오행 사이를 중재하는 오행 찾기. 통관 오행이 억부와 어긋나면
 * (신강인데 인성·비겁, 신약인데 식상·재성·관성) 그 쌍은 건너뛴다 — 예전엔
 * 일간 강약을 보지 않아 통관 목 = 기신 목 같은 모순이 났다(엔진 감사 SD-04).
 */
function selectTonggwanYongsin(
  pillars: YongsinPillars,
  allowed: FiveElement[] | null,
  avoid: Array<FiveElement | undefined>
): { yongsin: FiveElement; reasoning: string } | null {
  const stats = countElements(pillars)
  for (const p of TONGGWAN_PAIRS) {
    if (stats[p.a] < 2 || stats[p.b] < 2) continue
    if (allowed && !allowed.includes(p.via)) continue
    if (avoid.includes(p.via)) continue
    return { yongsin: p.via, reasoning: p.reasoning }
  }
  return null
}

/** 병(病) 임계 — 드러난 8글자 중 이 수 이상이면 과다 (OD-8). */
const BYEONG_MIN_COUNT = 3

/**
 * 병약용신 선정 (OD-8)
 * 병(病) = 억부상 *과다한 쪽*(신강: 비겁·인성 / 신약: 관성·재성·식상)에서 드러난
 * 8글자 중 3글자 이상인 오행. 일간 천간 자신은 비겁 개수에서 뺀다(SD-09 와 같은
 * 원칙). 약(藥)은 억부가 허용하는 그룹에서만 고른다 — 병을 극하는 오행, 그것이
 * 억부에 어긋나면 병이 생하는(설기하는) 오행:
 *   신강 병=비겁 → 관성 · 병=인성 → 재성
 *   신약 병=식상 → 인성 · 병=재성 → 비겁 · 병=관성 → 인성(살인상생, 식상 제살은 신약에 불가)
 * 중화는 억부상 과다한 쪽이 없으므로 병약을 쓰지 않는다(통관/억부로).
 * 예전엔 지장간 정기 +0.5 를 더한 10단위 집계에서 최다 오행을 무조건 병으로 잡아,
 * 신강 일간에 비겁·인성을, 신약 일간에 식상을 처방했다(엔진 감사 SD-04).
 */
function selectByeongYakYongsin(
  pillars: YongsinPillars,
  dm: FiveElement,
  strength: DaymasterStrength
): { yongsin: FiveElement; kibsin: FiveElement; reasoning: string } | null {
  const allowed = eokbuAllowed(dm, strength)
  if (!allowed) return null

  const stats = countElements(pillars)
  // 드러난 8글자 중 일간 천간 자신은 비겁으로 세지 않는다
  const countOf = (e: FiveElement) => stats[e] - (e === dm ? 1 : 0)
  // 같은 개수면 앞 순서 우선 — 신강은 비겁, 신약은 관살이 가장 직접적인 병
  const excessSide: Role[] = isStrong(strength) ? ['비겁', '인성'] : ['관성', '재성', '식상']

  let byeong: FiveElement | null = null
  let byeongCount = 0
  for (const role of excessSide) {
    const e = elementOfRole(dm, role)
    const n = countOf(e)
    if (n >= BYEONG_MIN_COUNT && n > byeongCount) {
      byeong = e
      byeongCount = n
    }
  }
  if (!byeong) return null

  const controller = FIVE_ELEMENT_RELATIONS.극받는관계[byeong]
  const drain = FIVE_ELEMENT_RELATIONS.생하는관계[byeong]
  const yak = allowed.includes(controller) ? controller : allowed.includes(drain) ? drain : null
  if (!yak) return null

  return {
    yongsin: yak,
    kibsin: byeong,
    reasoning:
      yak === controller
        ? `${byeong}이 과다(병)하여 ${yak}(약)으로 조절`
        : `${byeong}이 과다(병)하여 ${yak}(약)으로 화(化)하여 조절`,
  }
}

// ============ 메인 함수 ============

/**
 * 추천(primary·secondary)과 회피(kibsin·gusin)를 서로소로 만든다.
 * 추천에 오른 오행은 회피에서 빠지고, secondary 는 primary 와 같으면 비운다.
 */
function finalizeYongsin(r: YongsinResult): YongsinResult {
  const secondary =
    r.secondaryYongsin && r.secondaryYongsin !== r.primaryYongsin ? r.secondaryYongsin : undefined
  const rec = [r.primaryYongsin, secondary]
  const keep = (e: FiveElement | undefined) => (e && !rec.includes(e) ? e : undefined)
  const kibsin = keep(r.kibsin)
  const gusinRaw = keep(r.gusin)
  return {
    ...r,
    secondaryYongsin: secondary,
    kibsin,
    gusin: gusinRaw && gusinRaw !== kibsin ? gusinRaw : undefined,
  }
}

/**
 * 용신 선정 메인 함수
 *
 * @param pillars 사주 4주 — 시주가 null/생략이면(출생시각 미상) 삼주로 판정
 * @returns 용신 선정 결과
 *
 * 용신 선정 우선순위 (CONVENTIONS §10 '억부 + 조후 함께'):
 * 1. 조후용신 (한습/조열 계절 출생시 최우선 — R4 가드: 신약 일간에 관살 조후는 보류)
 * 2. 병약용신 (억부상 과다한 쪽 오행이 드러난 8글자 중 3 이상, 약은 억부 허용 그룹)
 * 3. 통관용신 (오행 충돌시, 통관 오행이 억부 허용 그룹일 때만)
 * 4. 억부용신 (기본)
 *
 * 불변식: primary·secondary ∉ {kibsin, gusin}. 조후가 아닌 용신은 신강 일간에
 * 인성·비겁을, 신약 일간에 식상·재성·관성을 추천하지 않는다.
 */
export function determineYongsin(pillars: YongsinPillars): YongsinResult {
  const daymaster = pillars.day.stem
  const daymasterElement = getElement(daymaster)
  const strength = assessDaymasterStrength(daymaster, pillars)
  // 중화 세부 편향 — 총점 <50 이면 편약(偏弱). 코스 버킷(40~60 전부 중화)이 편약을
  // 뭉개 기신을 비워, 인생 곡선·favor 에 '힘든 시기'가 하나도 안 생기던 문제(감사
  // 950209: 총점 45 편약). selectEokbuYongsin 이 편약이면 관살 기신을 부여한다.
  const junghwaLean =
    strength === '중화' ? computeStrengthScore(toStrengthCoreInput(pillars)).total < 50 : undefined
  const eokbuResult = selectEokbuYongsin(daymaster, strength, junghwaLean)
  const eokbuAvoid = [eokbuResult.kibsin, eokbuResult.gusin]

  // 1. 조후용신 체크 (한습/조열 계절)
  const johuResult = selectJohuYongsin(pillars.month.branch, daymaster)
  // R4 가드: 조후용신이 *일간을 극하는 오행(관살)*인데 일간이 신약이면 조후 우선을
  // 보류한다. 약한 일간에 그를 극하는 기운을 '가장 필요(용신)'로 처방하면 억부와
  // 정면 충돌하는 역전이 생긴다(예: 신약 丙火 겨울 → 조후 水 처방은 火를 더 끈다).
  // 이 경우 병약/통관/억부 단계로 흘려보내 일간을 돕는 용신이 잡히게 한다.
  const dmControlledBy = daymasterElement
    ? FIVE_ELEMENT_RELATIONS.극받는관계[daymasterElement]
    : undefined
  const johuAttacksWeakDm =
    !!johuResult && isWeak(strength) && johuResult.yongsin === dmControlledBy
  if (johuResult && !johuAttacksWeakDm) {
    // 조후용신이 우선되면 억부 시스템의 kibsin/gusin이 조후용신과 충돌
    // 할 수 있음 (예: 辛 신약 + 寅월 → johu=화, eokbu.kibsin=화 → 자기
    // 자신이 기신). finalizeYongsin 이 추천과 같은 오행을 avoid 에서 뺀다.
    return finalizeYongsin({
      primaryYongsin: johuResult.yongsin,
      secondaryYongsin: eokbuResult.yongsin,
      yongsinType: '조후용신',
      daymasterStrength: strength,
      reasoning: johuResult.reasoning,
      kibsin: eokbuResult.kibsin,
      gusin: eokbuResult.gusin,
    })
  }

  // 2. 병약용신 체크 — 약은 억부 허용 그룹에서만
  const byeongYakResult = daymasterElement
    ? selectByeongYakYongsin(pillars, daymasterElement, strength)
    : null
  if (byeongYakResult) {
    // 기신 = 병, 구신 = 억부 회피 중 병이 아닌 쪽
    const gusin = eokbuAvoid.find((e) => e && e !== byeongYakResult.kibsin)
    return finalizeYongsin({
      primaryYongsin: byeongYakResult.yongsin,
      secondaryYongsin:
        eokbuResult.yongsin !== byeongYakResult.yongsin ? eokbuResult.yongsin : eokbuResult.heesin,
      yongsinType: '병약용신',
      daymasterStrength: strength,
      reasoning: byeongYakResult.reasoning,
      kibsin: byeongYakResult.kibsin,
      gusin,
    })
  }

  // 3. 통관용신 체크 — 통관 오행이 억부 허용 그룹이고 억부 회피가 아닐 때만
  const tonggwanResult = daymasterElement
    ? selectTonggwanYongsin(pillars, eokbuAllowed(daymasterElement, strength), eokbuAvoid)
    : null
  if (tonggwanResult) {
    return finalizeYongsin({
      primaryYongsin: tonggwanResult.yongsin,
      secondaryYongsin:
        eokbuResult.yongsin !== tonggwanResult.yongsin ? eokbuResult.yongsin : eokbuResult.heesin,
      yongsinType: '통관용신',
      daymasterStrength: strength,
      reasoning: tonggwanResult.reasoning,
      kibsin: eokbuResult.kibsin,
      gusin: eokbuResult.gusin,
    })
  }

  // 4. 억부용신 (기본)
  return finalizeYongsin({
    primaryYongsin: eokbuResult.yongsin,
    secondaryYongsin: eokbuResult.heesin,
    yongsinType: '억부용신',
    daymasterStrength: strength,
    reasoning: eokbuResult.reasoning,
    kibsin: eokbuResult.kibsin,
    gusin: eokbuResult.gusin,
  })
}

/**
 * 용신 설명 조회
 */
export function getYongsinDescription(yongsin: FiveElement): string {
  const descriptions: Record<FiveElement, string> = {
    목: '목(木) 용신: 성장, 발전, 인자함을 상징. 교육, 문화, 의류, 목재업 분야 유리.',
    화: '화(火) 용신: 열정, 명예, 표현력을 상징. 예술, 조명, 요식업, 전자업 분야 유리.',
    토: '토(土) 용신: 안정, 신뢰, 중재력을 상징. 부동산, 농업, 건설업 분야 유리.',
    금: '금(金) 용신: 결단, 정의, 실행력을 상징. 금융, 기계, 법조, 군경 분야 유리.',
    수: '수(水) 용신: 지혜, 유연, 소통력을 상징. IT, 유통, 무역, 수산업 분야 유리.',
  }

  return descriptions[yongsin]
}

/**
 * 일간 강약 설명 조회
 */
export function getStrengthDescription(strength: DaymasterStrength): string {
  const descriptions: Record<DaymasterStrength, string> = {
    극신강: '일간이 매우 강함. 자기주장이 강하고 독립적. 식상/재성으로 발산 필요.',
    신강: '일간이 강함. 리더십이 있고 추진력 좋음. 적절한 극제로 균형 유지.',
    중화: '일간이 균형됨. 안정적이고 조화로움. 현상 유지에 강점.',
    신약: '일간이 약함. 협력적이고 겸손함. 인성/비겁의 도움 필요.',
    극신약: '일간이 매우 약함. 순응적이고 유연함. 강한 보조 운이 필요.',
  }

  return descriptions[strength]
}

/**
 * 기신 설명 조회
 */
export function getKibsinDescription(kibsin: FiveElement): string {
  return `${kibsin}(${kibsin}) 기신: 이 오행이 강해지는 시기나 방향을 피하는 것이 좋습니다. 관련 직업이나 색상도 주의가 필요합니다.`
}

/**
 * 오행별 개운 색상 — ko/en 한 쌍으로 한곳에(EN 표면이 한글 색 이름을 찍지 않게, 계획 B3).
 */
const LUCKY_COLORS: Readonly<Record<FiveElement, ReadonlyArray<{ ko: string; en: string }>>> = {
  목: [
    { ko: '초록', en: 'Green' },
    { ko: '청록', en: 'Teal' },
    { ko: '연두', en: 'Light green' },
  ],
  화: [
    { ko: '빨강', en: 'Red' },
    { ko: '주황', en: 'Orange' },
    { ko: '보라', en: 'Purple' },
  ],
  토: [
    { ko: '노랑', en: 'Yellow' },
    { ko: '갈색', en: 'Brown' },
    { ko: '베이지', en: 'Beige' },
  ],
  금: [
    { ko: '흰색', en: 'White' },
    { ko: '은색', en: 'Silver' },
    { ko: '금색', en: 'Gold' },
  ],
  수: [
    { ko: '검정', en: 'Black' },
    { ko: '파랑', en: 'Blue' },
    { ko: '남색', en: 'Navy' },
  ],
}

/** 개운 색상 한→영 — getLuckyColors 가 내는 한글 색 이름 전부. */
export const LUCKY_COLOR_EN: Readonly<Record<string, string>> = Object.fromEntries(
  Object.values(LUCKY_COLORS).flatMap((cs) => cs.map((c) => [c.ko, c.en]))
)

export function getLuckyColors(yongsin: FiveElement): string[] {
  return LUCKY_COLORS[yongsin]?.map((c) => c.ko) ?? []
}

/**
 * 오행별 개운 방향 — ko/en 한 쌍.
 */
const LUCKY_DIRECTIONS: Readonly<Record<FiveElement, { ko: string; en: string }>> = {
  목: { ko: '동쪽', en: 'East' },
  화: { ko: '남쪽', en: 'South' },
  토: { ko: '중앙', en: 'Center' },
  금: { ko: '서쪽', en: 'West' },
  수: { ko: '북쪽', en: 'North' },
}

/** 개운 방향 한→영 — getLuckyDirection 이 내는 한글 방향 전부. */
export const LUCKY_DIRECTION_EN: Readonly<Record<string, string>> = Object.fromEntries(
  Object.values(LUCKY_DIRECTIONS).map((d) => [d.ko, d.en])
)

export function getLuckyDirection(yongsin: FiveElement): string {
  return LUCKY_DIRECTIONS[yongsin]?.ko ?? ''
}

/**
 * 오행별 개운 숫자
 */
export function getLuckyNumbers(yongsin: FiveElement): number[] {
  const numbers: Record<FiveElement, number[]> = {
    목: [3, 8],
    화: [2, 7],
    토: [5, 10],
    금: [4, 9],
    수: [1, 6],
  }

  return numbers[yongsin]
}

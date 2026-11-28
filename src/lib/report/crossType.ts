/**
 * 사주 타입 이름 — "착실히 쌓는 자유인" / "steady-building Free Spirit".
 *   이름 = [주도 십성 수식어] + [일간 역할 명사]
 * 명식(십성 개수 · 월간/일지 십성 · 일간)만으로 정해지는 순수·결정론 함수라,
 * 리포트 바이럴 카드(buildViralSummary)와 서버 쪽 사주 카드·Life·홈이 같은 이름을 쓴다.
 */
import type { BiLabel } from './reportTypes'

type Lang = 'ko' | 'en'

// 헤드라인 합성에 쓸 수 있는 십성 10종(정재·상관 등). count 키·라벨이 이 집합.
// 배열 순서가 곧 동률 tie-break 순서다(월간 십성이 뒤에 있을 때만 월간이 이긴다).
const SIBSIN_NAMES = [
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

/**
 * 헤드라인용 "주도 십성" 선택 — 바이럴 한 줄이 "완전 나"가 되려면 그 사람의
 * *정체*를 대표하는 십성이어야 한다. 일지(배우자궁) 십성은 관계 자리라 정체
 * 라벨엔 맞지 않으므로(C1), 명식 전체 십성 개수(count)의 최빈값을 쓴다.
 *   - count 최빈값이 2 이상이면 그것(정체를 지배하는 십성).
 *   - 동률이면 월간(월령 근접, 격국의 자리) 십성을 우선한다.
 *   - 지배(≥2)가 없으면(고른 명식) 월간 → 일지 십성 순으로 폴백.
 * 순수 함수 — 카운트 없으면(구데이터) 폴백만으로 동작, 매칭 없으면 null.
 */
export function pickHeadlineSibsin(
  count: Record<string, number> | null | undefined,
  monthStemSibsin?: string | null,
  dayBranchSibsin?: string | null
): string | null {
  if (count) {
    let best: string | null = null
    let bestN = 0
    for (const n of SIBSIN_NAMES) {
      const c = count[n] ?? 0
      if (c > bestN || (c === bestN && c > 0 && n === monthStemSibsin)) {
        bestN = c
        best = n
      }
    }
    if (best && bestN >= 2) return best
  }
  if (monthStemSibsin && (SIBSIN_NAMES as readonly string[]).includes(monthStemSibsin)) {
    return monthStemSibsin
  }
  if (dayBranchSibsin && (SIBSIN_NAMES as readonly string[]).includes(dayBranchSibsin)) {
    return dayBranchSibsin
  }
  return null
}

// 일간 한글(갑) → 한자(甲). 호출부가 어느 표기로 넘겨도 같은 사전을 찾게 정규화.
const STEM_KO_TO_HAN: Record<string, string> = {
  갑: '甲',
  을: '乙',
  병: '丙',
  정: '丁',
  무: '戊',
  기: '己',
  경: '庚',
  신: '辛',
  임: '壬',
  계: '癸',
}

// 일간 → 짧은 역할 명사(수식어가 앞에 붙어도 자연스럽게).
const STEM_CORE: Record<string, BiLabel> = {
  甲: { ko: '개척자', en: 'Trailblazer' },
  乙: { ko: '생존가', en: 'Survivor' },
  丙: { ko: '분위기메이커', en: 'Spark' },
  丁: { ko: '장인', en: 'Craftsman' },
  戊: { ko: '버팀목', en: 'Anchor' },
  己: { ko: '살림꾼', en: 'Cultivator' },
  庚: { ko: '승부사', en: 'Closer' },
  辛: { ko: '완벽주의자', en: 'Perfectionist' },
  壬: { ko: '자유인', en: 'Free Spirit' },
  癸: { ko: '직관가', en: 'Seer' },
}

// 지배 십성 → 이름 수식어.
const SIBSIN_MODIFIER: Record<string, BiLabel> = {
  비견: { ko: '나란히 가는', en: 'shoulder-to-shoulder' },
  겁재: { ko: '지지 않는', en: 'never-backing-down' },
  식신: { ko: '여유로운', en: 'easygoing' },
  상관: { ko: '판을 뒤집는', en: 'rule-bending' },
  편재: { ko: '크게 굴리는', en: 'big-swinging' },
  정재: { ko: '착실히 쌓는', en: 'steady-building' },
  편관: { ko: '밀어붙이는', en: 'hard-charging' },
  정관: { ko: '반듯한', en: 'straight-arrow' },
  편인: { ko: '촉이 좋은', en: 'sharp-instinct' },
  정인: { ko: '받쳐주는', en: 'steadying' },
}

/** 일간 글자(한자 甲 또는 한글 갑)를 한자로 정규화. 10간이 아니면 null. */
export function toStemHan(dayStem: string): string | null {
  return STEM_CORE[dayStem] ? dayStem : (STEM_KO_TO_HAN[dayStem] ?? null)
}

/**
 * 이미 고른 주도 십성 + 일간 → 타입 이름. 둘 중 하나라도 사전에 없으면 null
 * (buildViralSummary 는 일간 archetype 이름으로 폴백한다).
 */
export function composeCrossTypeName(
  dayStem: string,
  sibsin: string | null | undefined,
  lang: Lang
): string | null {
  const stem = toStemHan(dayStem)
  const core = stem ? STEM_CORE[stem] : undefined
  const mod = sibsin ? SIBSIN_MODIFIER[sibsin] : undefined
  return core && mod ? `${mod[lang]} ${core[lang]}` : null
}

export interface CrossTypeInput {
  /** 명식 전체 십성 개수(예: { 정재: 2, 정관: 2, … }). 없으면 월간 → 일지 폴백. */
  sibsinCount: Record<string, number> | null | undefined
  monthStemSibsin?: string | null
  dayBranchSibsin?: string | null
  /** 일간(한자 또는 한글). */
  dayStem: string
}

/**
 * 사주 타입 이름 — pickHeadlineSibsin 으로 주도 십성을 고른 뒤 일간 역할 명사와 합성.
 * 리포트 바이럴 카드와 같은 규칙. 주도 십성이나 일간을 못 찾으면 null.
 */
export function crossTypeName(input: CrossTypeInput, lang: Lang): string | null {
  const sibsin = pickHeadlineSibsin(input.sibsinCount, input.monthStemSibsin, input.dayBranchSibsin)
  return composeCrossTypeName(input.dayStem, sibsin, lang)
}

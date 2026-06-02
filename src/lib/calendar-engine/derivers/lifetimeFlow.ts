/**
 * 인생 전체 흐름 — 사주 대운(10년 십신 아크)을 연령대로 묶고, 점성 인생 마디
 * (토성/목성 회귀·외행성 transit 등)와 *교차*해 "초년기→장년기" 단계별 합성.
 * 교차엔진(사주×점성). natal 에서만 결정, monthly scope 에서 노출. LLM 무사용.
 */
import type { NatalContext } from '../context/types'
import { getSibsinKo } from '@/lib/saju/cycleRelations'
import { buildLifecycleTiming } from '../lifecycle/astroLifecycle'
import { getGanjiTransitNarrative } from '../data/ganjiTransitNarrative'

export interface LifePhase {
  label: string // 초년기 …
  ageRange: string // '0~19세 · 1995~2014'
  theme: string // '재성 — 성취·현실'
  saju: string // 사주 상세
  astro: string // 점성 상세 (그 시기 마디들)
  cross: string // 사주×점성 교차 한 줄
  current: boolean
}
export interface LifetimeFlow {
  intro: string // 타고난 바탕 (일간·강약·용신)
  phases: LifePhase[]
}

// 십신 → 카테고리
const SIBSIN_CAT: Record<string, string> = {
  비견: '비겁',
  겁재: '비겁',
  식신: '식상',
  상관: '식상',
  정재: '재성',
  편재: '재성',
  정관: '관성',
  편관: '관성',
  정인: '인성',
  편인: '인성',
}

// 카테고리별 상세 — kw(교차에서 쓸 핵심), saju(사주 줄), outcome(교차 결론)
const CAT: Record<string, { short: string; kw: string; outcome: string }> = {
  관성: {
    short: '책임·자리·명예',
    kw: '책임·자리 욕구',
    outcome: '사회적 토대와 신뢰의 뼈대를 세워요',
  },
  재성: {
    short: '성취·현실·재물',
    kw: '성취·현실 감각',
    outcome: '커리어와 자산의 기초가 잡혀요',
  },
  식상: {
    short: '표현·재능·창조',
    kw: '표현·창조 욕구',
    outcome: '낡은 틀을 깨고 자기다운 길을 새로 그려요',
  },
  비겁: {
    short: '자립·동료·경쟁',
    kw: '자립·경쟁심',
    outcome: '관계와 독립 사이에서 진짜 내 자리를 찾아요',
  },
  인성: {
    short: '배움·내면·정리',
    kw: '수용·정리',
    outcome: '삶의 의미를 다시 정돈해요',
  },
}

const BANDS: Array<[number, number, string]> = [
  [0, 19, '초년기'],
  [20, 39, '청년기'],
  [40, 59, '중년기'],
  [60, 84, '장년기'],
]

/** 한글 받침 유무 — 조사(가/이·와/과) 선택용 */
function hasFinalConsonant(s: string): boolean {
  const t = s.trim()
  if (!t) return false
  const c = t.charCodeAt(t.length - 1)
  if (c < 0xac00 || c > 0xd7a3) return false
  return (c - 0xac00) % 28 !== 0
}
const gaI = (s: string) => (hasFinalConsonant(s) ? '이' : '가')
const gwaWa = (s: string) => (hasFinalConsonant(s) ? '과' : '와')

/** 그 시기 점성 마디들의 큰 톤 — 교차 문장에서 사주와 엮을 때 사용 */
function astroTone(labels: string[]): string {
  const j = labels.join(' ')
  if (/명왕성|천왕성|해왕성/.test(j)) return '큰 재구성·변혁의 물결'
  if (/토성/.test(j)) return '책임·토대를 다지는 압력'
  if (/목성/.test(j)) return '확장·기회의 바람'
  return '리듬이 바뀌는 전환'
}

export function deriveLifetimeFlow(
  natal: NatalContext,
  lang: 'ko' | 'en' = 'ko'
): LifetimeFlow | undefined {
  if (lang === 'en') return undefined // ko 우선 (en 은 추후)
  const birthYear = natal.input?.year
  const daeun = natal.saju?.daeun ?? []
  const dm = natal.saju?.dayMaster?.name
  if (!birthYear || daeun.length === 0 || !dm) return undefined

  const strengthKo =
    natal.saju.strength === 'weak'
      ? '기운이 약한 편이라'
      : natal.saju.strength === 'strong'
        ? '기운이 강한 편이라'
        : '기운이 비교적 균형 잡혀'
  const yong = [natal.saju.yongsin.primary, natal.saju.yongsin.secondary].filter(Boolean).join('·')
  const intro = `${dm} 일간으로 ${strengthKo}, 용신 ${yong}의 기운이 받쳐줄 때 진가가 드러나는 사주예요. 아래는 사주 대운(10년 흐름)과 점성 인생 마디를 교차해 본 큰 흐름이에요.`

  const events = buildLifecycleTiming(birthYear, birthYear + 90, true).events.map((e) => ({
    age: e.startYear - birthYear,
    label: e.label,
  }))

  const currentAge = new Date().getUTCFullYear() - birthYear + 1 // 한국나이

  const phases: LifePhase[] = []
  for (const [lo, hi, label] of BANDS) {
    const mid = Math.floor((lo + hi) / 2)
    const d =
      daeun.find((x) => x.startAge <= mid && x.startAge + 10 > mid) ??
      daeun.filter((x) => x.startAge <= hi).at(-1)
    if (!d) continue
    const cat = SIBSIN_CAT[getSibsinKo(dm, d.stem)]
    const info = cat ? CAT[cat] : undefined
    if (!info) continue

    const evs = events.filter((e) => e.age >= lo && e.age <= hi)
    const evLabels = evs.map((e) => e.label)
    const astro = evLabels.length
      ? evLabels.slice(0, 3).join(' · ')
      : '굵직한 점성 전환 없이 비교적 잔잔히 흐르는 구간이에요.'

    const tone = astroTone(evLabels)
    const cross = evLabels.length
      ? `사주의 ${info.kw}${gaI(info.kw)} 점성의 ${tone}${gwaWa(tone)} 맞물려, ${info.outcome}.`
      : `사주의 ${info.kw}${gaI(info.kw)} 무르익으며 ${info.outcome}.`

    phases.push({
      label,
      ageRange: `${lo}~${hi}세 · ${birthYear + lo}~${birthYear + hi}`,
      theme: `${cat} — ${info.short}`,
      // 사주 줄 = 기존 대운 해석 엔진(getGanjiTransitNarrative) 그대로 재사용.
      saju: getGanjiTransitNarrative(`${d.stem}${d.branch}`, 'decadal', 'ko'),
      astro,
      cross,
      current: currentAge >= lo + 1 && currentAge <= hi + 1,
    })
  }
  if (phases.length === 0) return undefined
  return { intro, phases }
}

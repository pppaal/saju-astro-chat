/**
 * 인생 전체 흐름 — 사주 대운(10년 단위 십신 아크)을 연령대로 묶고, 점성 인생 마디
 * (토성/목성 회귀 등)를 엮어 "초년기→장년기" 한 글로 합성. 교차엔진(사주×점성).
 * natal 에서만 결정되며 monthly scope 에서 함께 노출.
 */
import type { NatalContext } from '../context/types'
import { getSibsinKo } from '@/lib/saju/cycleRelations'
import { buildLifecycleTiming } from '../lifecycle/astroLifecycle'

export interface LifePhase {
  /** 초년기 / 청년기 / 중년기 / 장년기 */
  label: string
  /** '0~19세 · 1995~2014' */
  ageRange: string
  /** '관성 — 책임·자리·명예' */
  theme: string
  /** 사주 흐름 + 점성 마디를 합친 한 줄 */
  text: string
  /** 현재 연령이 이 구간이면 true */
  current: boolean
}
export interface LifetimeFlow {
  /** 타고난 바탕 한 줄 (일간·강약·용신) */
  intro: string
  phases: LifePhase[]
}

// 십신 → (카테고리, 그 시기 테마)
const SIBSIN_CAT: Record<string, { cat: string; theme: string }> = {
  비견: { cat: '비겁', theme: '자립·동료·경쟁' },
  겁재: { cat: '비겁', theme: '자립·동료·경쟁' },
  식신: { cat: '식상', theme: '표현·여유·재능' },
  상관: { cat: '식상', theme: '재능·돌파·창조' },
  정재: { cat: '재성', theme: '현실·안정·성취' },
  편재: { cat: '재성', theme: '기회·확장·재물' },
  정관: { cat: '관성', theme: '책임·자리·명예' },
  편관: { cat: '관성', theme: '도전·승부·압박' },
  정인: { cat: '인성', theme: '배움·보호·안정' },
  편인: { cat: '인성', theme: '전문성·통찰·정리' },
}

const BANDS: Array<[number, number, string]> = [
  [0, 19, '초년기'],
  [20, 39, '청년기'],
  [40, 59, '중년기'],
  [60, 84, '장년기'],
]

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
  const intro = `${dm} 일간으로 ${strengthKo}, 용신 ${yong}의 기운이 받쳐줄 때 진가가 드러나는 사주예요.`

  const astro = buildLifecycleTiming(birthYear, birthYear + 90, true).events.map((e) => ({
    age: e.startYear - birthYear,
    label: e.label.split('—')[0].trim(),
  }))

  const currentAge = new Date().getUTCFullYear() - birthYear + 1 // 한국나이

  const phases: LifePhase[] = []
  for (const [lo, hi, label] of BANDS) {
    // 연령대 중간점에 활성인 대운 하나 → 그 시기의 대표 십신(여러 대운 걸치면 길어져 1개로)
    const mid = Math.floor((lo + hi) / 2)
    const d =
      daeun.find((x) => x.startAge <= mid && x.startAge + 10 > mid) ??
      daeun.filter((x) => x.startAge <= hi).at(-1)
    const info = d ? SIBSIN_CAT[getSibsinKo(dm, d.stem)] : undefined
    if (!info) continue
    const evs = astro.filter((e) => e.age >= lo && e.age <= hi).slice(0, 2)
    phases.push({
      label,
      ageRange: `${lo}~${hi}세 · ${birthYear + lo}~${birthYear + hi}`,
      theme: `${info.cat} — ${info.theme}`,
      text: evs.length
        ? `점성으로는 ${evs.map((e) => e.label).join(', ')} 같은 마디를 지나요.`
        : '비교적 잔잔하게 흐르는 시기예요.',
      current: currentAge >= lo + 1 && currentAge <= hi + 1,
    })
  }
  if (phases.length === 0) return undefined
  return { intro, phases }
}

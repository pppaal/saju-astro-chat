/**
 * 인생 전체 흐름 — 사주 대운(10년 십신 아크)과 점성 인생 마디(회귀·외행성 transit)를
 * *교차*해 "초년기→장년기" 단계별 한 줄로 합성. 교차엔진(사주×점성).
 * 계산은 전부 기존 정본 엔진(getSibsinKo·daeun·buildLifecycleTiming) 재사용 —
 * 이 deriver 는 그 출력을 한 문장으로 엮을 뿐. natal 결정·monthly scope·LLM 무사용.
 */
import type { NatalContext } from '../context/types'
import { getSibsinKo } from '@/lib/saju/cycleRelations'
import { buildLifecycleTiming } from '../lifecycle/astroLifecycle'

export interface LifePhase {
  label: string // 초년기 …
  ageRange: string // '0~19세 · 1995~2014'
  /** 사주 대운 × 점성 마디 교차 한 줄 */
  text: string
  current: boolean
}
export interface LifetimeFlow {
  intro: string
  phases: LifePhase[]
}

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
// 카테고리 → (교차에서 쓸 핵심 욕구, 그 시기 결론)
const CAT: Record<string, { kw: string; outcome: string }> = {
  관성: { kw: '책임·자리 욕구', outcome: '사회적 토대와 신뢰의 뼈대를 세워요' },
  재성: { kw: '성취·현실 감각', outcome: '커리어와 자산의 기초가 잡혀요' },
  식상: { kw: '표현·창조 욕구', outcome: '낡은 틀을 깨고 자기다운 길을 새로 그려요' },
  비겁: { kw: '자립·경쟁심', outcome: '관계와 독립 사이에서 진짜 내 자리를 찾아요' },
  인성: { kw: '수용·정리의 힘', outcome: '삶의 의미를 다시 정돈해요' },
}

const BANDS: Array<[number, number, string]> = [
  [0, 19, '초년기'],
  [20, 39, '청년기'],
  [40, 59, '중년기'],
  [60, 84, '장년기'],
]

// 받침 인식 조사
function hasFinalConsonant(s: string): boolean {
  const t = s.trim()
  if (!t) return false
  const c = t.charCodeAt(t.length - 1)
  if (c < 0xac00 || c > 0xd7a3) return false
  return (c - 0xac00) % 28 !== 0
}
const gaI = (s: string) => (hasFinalConsonant(s) ? '이' : '가')

export function deriveLifetimeFlow(
  natal: NatalContext,
  lang: 'ko' | 'en' = 'ko'
): LifetimeFlow | undefined {
  if (lang === 'en') return undefined // ko 우선
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
  const intro = `${dm} 일간으로 ${strengthKo}, 용신 ${yong}의 기운이 받쳐줄 때 진가가 드러나는 사주. 사주 대운(10년 흐름)과 점성 인생 마디를 교차해 본 큰 흐름이에요.`

  const events = buildLifecycleTiming(birthYear, birthYear + 90, true).events.map((e) => ({
    age: e.startYear - birthYear,
    name: e.label.split('—')[0].trim(),
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

    const evs = events.filter((e) => e.age >= lo && e.age <= hi).slice(0, 2)
    let text: string
    if (evs.length) {
      const names = evs.map((e) => e.name).join(', ')
      text = `사주로는 ${cat}운이 흐르며 ${info.kw}${gaI(info.kw)} 커지고, 점성으로 ${names}${gaI(evs.at(-1)!.name)} 겹쳐 — ${info.outcome}.`
    } else {
      text = `사주로는 ${cat}운이 흐르며 ${info.kw}${gaI(info.kw)} 무르익어 — ${info.outcome}.`
    }
    phases.push({
      label,
      ageRange: `${lo}~${hi}세 · ${birthYear + lo}~${birthYear + hi}`,
      text,
      current: currentAge >= lo + 1 && currentAge <= hi + 1,
    })
  }
  if (phases.length === 0) return undefined
  return { intro, phases }
}

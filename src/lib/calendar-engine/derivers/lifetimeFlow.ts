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
// 카테고리 → (그 시기를 쉬운말로 푼 수식구 '~는', 그 시기 결론)
const CAT: Record<string, { phrase: string; outcome: string }> = {
  관성: {
    phrase: '책임을 짊어지고 사회적 자리를 잡아가는',
    outcome: '사회적 토대와 신뢰가 단단해져요',
  },
  재성: {
    phrase: '노력이 현실의 성취·재물로 돌아오는',
    outcome: '커리어와 자산의 기초가 잡혀요',
  },
  식상: {
    phrase: '쌓아온 걸 표현하고 결과물로 터뜨리는',
    outcome: '낡은 틀을 깨고 자기다운 길을 새로 그려요',
  },
  비겁: {
    phrase: '내 발로 서며 주체성과 인연을 시험받는',
    outcome: '관계와 독립 사이에서 진짜 내 자리를 찾아요',
  },
  인성: {
    phrase: '받아들이고 갈무리하며 내면이 깊어지는',
    outcome: '삶의 의미를 다시 정돈해요',
  },
}

const SIGN_KO: Record<string, string> = {
  Aries: '양자리',
  Taurus: '황소자리',
  Gemini: '쌍둥이자리',
  Cancer: '게자리',
  Leo: '사자자리',
  Virgo: '처녀자리',
  Libra: '천칭자리',
  Scorpio: '전갈자리',
  Sagittarius: '사수자리',
  Capricorn: '염소자리',
  Aquarius: '물병자리',
  Pisces: '물고기자리',
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

  // 점성 정체성 (태양·상승) — 사주 일간과 교차해 intro 에 함께 제시
  const planets = (natal.astro?.chart?.planets ?? []) as Array<{ name?: string; sign?: string }>
  const sunSign = planets.find((p) => p.name === 'Sun')?.sign
  const ascSign = (natal.astro?.chart?.ascendant as { sign?: string } | undefined)?.sign
  const astroId = [
    sunSign ? `태양 ${SIGN_KO[sunSign] ?? sunSign}` : '',
    ascSign ? `상승 ${SIGN_KO[ascSign] ?? ascSign}` : '',
  ]
    .filter(Boolean)
    .join('·')

  const intro =
    `사주로는 ${dm} 일간으로 ${strengthKo}, 용신 ${yong}가 받쳐줄 때 빛나는 결이에요.` +
    (astroId
      ? ` 점성으로는 ${astroId}의 기질을 타고났고요. 이 둘이 평생 흐름의 무대를 만들고, 그 위에서 아래 시기들이 펼쳐져요.`
      : ` 사주 대운과 점성 인생 마디를 교차해 본 큰 흐름이에요.`)

  const events = buildLifecycleTiming(birthYear, birthYear + 90, true).events.map((e) => {
    // 라벨 '두 번째 목성 회귀 — 진로의 큰 그림' → 사람말 의미('진로의 큰 그림') 우선
    const desc = e.label.split('—').slice(1).join('—').trim()
    return { age: e.startYear - birthYear, desc: desc || e.label.trim() }
  })
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
      const descs = evs.map((e) => e.desc).join(', ')
      text = `${cat}운 — ${info.phrase} 시기예요. 점성으로도 ${descs}${gaI(evs.at(-1)!.desc)} 겹쳐, ${info.outcome}.`
    } else {
      text = `${cat}운 — ${info.phrase} 시기예요. ${info.outcome}.`
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

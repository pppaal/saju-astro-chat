/**
 * 인생 전체 흐름 — 사주 대운(10년 십신 아크)과 점성 인생 마디(회귀·외행성 transit)를
 * *교차*해 "초년기→장년기" 단계별 한 줄로 합성. 교차엔진(사주×점성).
 * 계산은 전부 기존 정본 엔진(getSibsinKo·daeun·buildLifecycleTiming) 재사용 —
 * 이 deriver 는 그 출력을 한 문장으로 엮을 뿐. natal 결정·monthly scope·LLM 무사용.
 */
import type { NatalContext } from '../context/types'
import { getSibsinKo } from '@/lib/saju/cycleRelations'
import { getStemElement } from '@/lib/saju/stemBranchUtils'
import { buildLifecycleTiming } from '../lifecycle/astroLifecycle'
import { SIBSIN_CAT, favorOf, type SibsinCat } from './cycleTone'

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

type Cat = SibsinCat
// 생애 단계 × 십신 — 그 시기가 "무엇에 관한" 시기인지. 같은 십신도 단계에 맞게:
// 초년기는 가정·학업·기질, 청년기는 자립·진로, 중년기는 책임·결실, 장년기는 수확·
// 정리로 푼다 (어린아이에게 '사회적 토대' 같은 어른말이 가지 않도록).
const BAND_CAT: Record<string, Record<Cat, string>> = {
  초년기: {
    관성: '규율과 통제 속에서 자라요. 엄한 환경이나 또렷한 규칙을 일찍 겪는 편이에요',
    재성: '현실 감각이 일찍 트여요. 용돈·물건·결과에 눈이 밝은 아이예요',
    식상: '끼와 표현욕이 일찍 피어나요. 말·그림·놀이로 자기를 드러내요',
    비겁: '또래·형제 속에서 고집과 주체성을 키워요',
    인성: '배움과 보살핌을 잘 받아들여요. 공부·독서·어른의 사랑이 자양분이 돼요',
  },
  청년기: {
    관성: '진로·직장·책임이 본격화돼요. 자기 자리를 만들어가요',
    재성: '현실 성취와 돈·연애의 무대가 열려요. 실속을 다져요',
    식상: '재능과 표현으로 세상에 나가요. 자기 목소리를 내요',
    비겁: '독립과 경쟁 속에서 홀로서기를 해요. 내 길을 찾아요',
    인성: '더 깊이 배우고 전문성을 쌓아요. 내공을 다져요',
  },
  중년기: {
    관성: '사회적 위치와 책임이 정점에 올라요. 무게를 감당하는 시기예요',
    재성: '재물과 결실을 거두는 시기예요. 노력이 형태로 남아요',
    식상: '쌓인 경험이 표현·창작·후배로 흘러나와요',
    비겁: '관계와 동료 속에서 내 자리를 다시 정의해요',
    인성: '배움을 갈무리하고 내면이 깊어져요',
  },
  장년기: {
    관성: '오랜 책임을 내려놓고 자리를 정리하는 시기예요',
    재성: '쌓아온 것을 누리고 나누는 시기예요. 결실을 거둬요',
    식상: '여유 속에서 취미·표현·지혜를 풀어내요',
    비겁: '사람들과 어울리며 진짜 내 자리를 즐겨요',
    인성: '지혜와 내면이 무르익어 다음 세대에 전해요',
  },
}
// favorOf(신강·신약 × 십신 = 순탄/고비)는 cycleTone(SSOT)에서 가져와 인생 흐름·
// 올해·이달·오늘 탭이 같은 판정을 쓴다. 아래 TONE 은 단계 카드 전용 문구.
const TONE: Record<'good' | 'hard' | 'mid', string> = {
  good: '흐름이 순해서 노력한 만큼 잘 풀리는 편이에요.',
  hard: '쉽지 않은 고비를 넘으며 단단해지는 시기예요.',
  mid: '큰 굴곡 없이 차분히 자기 몫을 다지는 흐름이에요.',
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
    `사주로는 ${dm} 일간으로 ${strengthKo}, 용신 ${yong}${gaI(yong)} 받쳐줄 때 빛나는 결이에요.` +
    (astroId
      ? ` 점성으로는 ${astroId}의 기질을 타고났고요. 이 둘이 평생 흐름의 무대를 만들고, 그 위에서 아래 시기들이 펼쳐져요.`
      : ` 사주 대운과 점성 인생 마디를 교차해 본 큰 흐름이에요.`)

  const events = buildLifecycleTiming(birthYear, birthYear + 90, true).events.map((e) => {
    // 라벨 '두 번째 목성 회귀 — 진로의 큰 그림' → 사람말 의미('진로의 큰 그림') 우선
    const after = e.label.split('—').slice(1).join('—').trim()
    return { age: e.startYear - birthYear, desc: after || e.label.trim() }
  })
  const currentAge = new Date().getUTCFullYear() - birthYear + 1 // 한국나이

  const phases: LifePhase[] = []
  for (const [lo, hi, label] of BANDS) {
    const mid = Math.floor((lo + hi) / 2)
    const d =
      daeun.find((x) => x.startAge <= mid && x.startAge + 10 > mid) ??
      daeun.filter((x) => x.startAge <= hi).at(-1)
    if (!d) continue
    const cat = SIBSIN_CAT[getSibsinKo(dm, d.stem)] as Cat | undefined
    const body = cat ? BAND_CAT[label]?.[cat] : undefined
    if (!cat || !body) continue
    // 그 대운 오행이 용신인지(순탄)·기신인지(고비) 1순위, 없으면 신강·신약×십신.
    const fav = favorOf(natal.saju.strength, cat, getStemElement(d.stem), natal.saju.yongsin)

    const evs = events.filter((e) => e.age >= lo && e.age <= hi).slice(0, 2)
    const astro = evs.length
      ? ` 점성으로는 ${evs.map((e) => e.desc).join(', ')}${gaI(evs.at(-1)!.desc)} 함께 흘러요.`
      : ''
    const text = `${cat}운 — ${body}. ${TONE[fav]}${astro}`
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

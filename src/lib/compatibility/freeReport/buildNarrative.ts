/**
 * 무료 궁합 리포트 — 빌더 (순수 함수, 테스트 가능).
 *
 * 서버가 만든 결정적 facts(CompatReport)를 초보자용 섹션 산문(FreeReportView)으로
 * 바꾼다. 런타임 LLM 없음 — 모든 문장은 content.ts(ko/en 사전)에서 끌어와 신호별
 * 자리표시자만 실제 이름·오행·행성으로 채운다. 빈 신호 섹션은 생략한다.
 */

import type { CompatReport } from '../compatReport'
import type { SynAspectView, SynOverlayView } from '../synastryView'
import type { SajuCompatPillarRel, SajuCompatSpouseStar } from '../sajuSynastryFacts'
import { elLabel } from '../compatChartLabels'
import type {
  Bi,
  FreeReportGlossaryEntry,
  FreeReportSection,
  FreeReportTheme,
  FreeReportView,
} from './types'
import {
  ASPECT_PAIR,
  ASPECT_TONE,
  BAND,
  CLOSING,
  DAY_MASTER_REL,
  ELEMENT_BALANCE,
  INTRO,
  OVERLAY_HOUSE,
  PILLAR_REL,
  PLANET_FLAVOR,
  SECTION_META,
  SPOUSE_STAR,
  TEN_GODS,
  VERDICT_EXPANSION,
} from './content'
import { COMPAT_GLOSSARY } from './glossary'

export interface BuildNarrativeOptions {
  labelA: string
  labelB: string
  lang: 'ko' | 'en'
}

const ORD_EN = [
  '',
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
]

// KO 주격 조사(은/는) — 받침 유무로. "민지은"(X) → "민지는"(O).
function neun(name: string): string {
  if (!name) return name
  const c = name.charCodeAt(name.length - 1)
  if (c >= 0xac00 && c <= 0xd7a3) return name + ((c - 0xac00) % 28 !== 0 ? '은' : '는')
  return name + '는'
}
// KO 여격 조사(에게) — 받침 무관 동일이라 단순 접미.
function ege(name: string): string {
  return name ? `${name}에게` : name
}

// 값의 마지막 한글 음절 종성(받침) 인덱스. 끝에 ")"·공백이 붙어 있어도 건너뛴다.
// 0=받침없음, 8=ㄹ. 한글이 없으면 null.
function lastJong(s: string): number | null {
  for (let i = s.length - 1; i >= 0; i--) {
    const c = s.charCodeAt(i)
    if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28
  }
  return null
}
type JosaType = '과/와' | '이/가' | '을/를' | '은/는' | '으로/로'
// 값 뒤에 붙는 KO 조사를 받침에 맞게 골라 붙인다. 으로/로 는 ㄹ받침 예외 처리.
function josa(value: string, type: JosaType): string {
  const jong = lastJong(value)
  const hasB = jong != null && jong !== 0
  if (type === '으로/로') return value + (hasB && jong !== 8 ? '으로' : '로')
  const [b, n] = type.split('/')
  return value + (hasB ? b : n)
}

/** 밴드 키 중 "값이 클수록 좋은(조화)" vs 화면 표시 임계 — 50 기준 high/low. */
const BAND_ORDER: Array<keyof NonNullable<CompatReport['band']>> = [
  'eastern_hap',
  'eastern_chung',
  'elements_match',
  'synastry_harmonic',
  'synastry_tension',
]

// 기둥 관계 태그 우선순위 — 한 페어에 여러 태그면 가장 의미 큰 것 하나만 풀이.
const TAG_PRIORITY = ['충', '천간충', '형', '자형', '천간합', '삼합', '육합', '방합', '해', '파']

// 사주 글자(천간·지지) 한글 음 — 한자가 음·뜻 없이 노출되면 한국인도 못 읽고
// 막힌다(평가단 8/8 최다 지적). "酉" → "유(酉)"로 음을 앞세운다.
const CHAR_READ_KO: Record<string, string> = {
  甲: '갑',
  乙: '을',
  丙: '병',
  丁: '정',
  戊: '무',
  己: '기',
  庚: '경',
  辛: '신',
  壬: '임',
  癸: '계',
  子: '자',
  丑: '축',
  寅: '인',
  卯: '묘',
  辰: '진',
  巳: '사',
  午: '오',
  未: '미',
  申: '신',
  酉: '유',
  戌: '술',
  亥: '해',
}
// EN: 한자는 영어권에 무의미. 지지는 띠 동물로, 천간은 로마자로.
const BRANCH_ANIMAL_EN: Record<string, string> = {
  子: 'Rat',
  丑: 'Ox',
  寅: 'Tiger',
  卯: 'Rabbit',
  辰: 'Dragon',
  巳: 'Snake',
  午: 'Horse',
  未: 'Goat',
  申: 'Monkey',
  酉: 'Rooster',
  戌: 'Dog',
  亥: 'Pig',
}
const STEM_ROMAN_EN: Record<string, string> = {
  甲: 'Gap',
  乙: 'Eul',
  丙: 'Byeong',
  丁: 'Jeong',
  戊: 'Mu',
  己: 'Gi',
  庚: 'Gyeong',
  辛: 'Sin',
  壬: 'Im',
  癸: 'Gye',
}
// '년/월/일/시 기둥' → 일반인 말로.
const PILLAR_KO: Record<string, string> = {
  년: '태어난 해',
  월: '태어난 달',
  일: '태어난 날',
  시: '태어난 시',
}
const PILLAR_EN: Record<string, string> = {
  년: 'birth-year',
  월: 'birth-month',
  일: 'birth-day',
  시: 'birth-hour',
}
const charKo = (c: string): string => (CHAR_READ_KO[c] ? `${CHAR_READ_KO[c]}(${c})` : c)
const charEn = (c: string): string =>
  BRANCH_ANIMAL_EN[c]
    ? `the ${BRANCH_ANIMAL_EN[c]} sign`
    : STEM_ROMAN_EN[c]
      ? `${STEM_ROMAN_EN[c]} (${c})`
      : c
const pillarKo = (p: string): string => PILLAR_KO[p] ?? `${p}기둥`
const pillarEn = (p: string): string => PILLAR_EN[p] ?? `${p}-pillar`

// ── 테마(질문) 분류 ──────────────────────────────────────────────────
// 신호를 출처(밴드/십성/어스펙트…)가 아니라 "사람들이 실제로 궁금해하는 질문"
// 으로 재배치한다. 8개 현실 테마, 제목은 질문형.
type ThemeId = 'spark' | 'sex' | 'talk' | 'love' | 'friction' | 'life' | 'money' | 'future'
const THEME_META: { id: ThemeId; icon: string; title: Bi }[] = [
  { id: 'spark', icon: '🔥', title: { ko: '처음에 확 끌려?', en: 'Is there instant chemistry?' } },
  { id: 'sex', icon: '💋', title: { ko: '잠자리는 잘 맞아?', en: 'Is the physical pull there?' } },
  { id: 'talk', icon: '💬', title: { ko: '말이 잘 통해?', en: 'Do you click when you talk?' } },
  { id: 'love', icon: '💗', title: { ko: '사랑법이 맞아?', en: 'Do your love styles match?' } },
  { id: 'friction', icon: '⚡', title: { ko: '어디서 부딪힐까?', en: 'Where do you clash?' } },
  { id: 'life', icon: '🏠', title: { ko: '같이 있으면 편해?', en: 'Is it easy day to day?' } },
  { id: 'money', icon: '💰', title: { ko: '돈·가치관은 맞아?', en: 'Same page on money?' } },
  { id: 'future', icon: '💍', title: { ko: '오래 갈 사이야?', en: 'Will it last?' } },
]
// 십성 극성 — 끌림/순기능(+) vs 마찰/도전(−). 테마 훅 polarity 에 쓴다.
const POS_SIBSIN = new Set(['비견', '식신', '정재', '정관', '정인', '편재'])
// 십성 → 테마
const SIBSIN_THEME: Record<string, ThemeId> = {
  비견: 'talk',
  겁재: 'friction',
  식신: 'talk',
  상관: 'spark',
  편재: 'money',
  정재: 'money',
  편관: 'friction',
  정관: 'future',
  편인: 'love',
  정인: 'love',
}
// 하우스 → 테마
const HOUSE_THEME: Record<number, ThemeId> = {
  1: 'spark',
  2: 'money',
  3: 'talk',
  4: 'life',
  5: 'spark',
  6: 'life',
  7: 'future',
  8: 'sex',
  9: 'life',
  10: 'life',
  11: 'talk',
  12: 'love',
}
// 어스펙트 → 테마 (긴장각이면 부딪힘, 아니면 행성 조합으로)
function aspectTheme(asp: SynAspectView): ThemeId {
  if (asp.tone === 'tension') return 'friction'
  const has = (k: string): boolean => asp.aKey === k || asp.bKey === k
  if (has('Mercury')) return 'talk'
  // 화성·금성 / 명왕성 얽힘 = 몸의 끌림(잠자리)
  if ((has('Mars') && has('Venus')) || (has('Pluto') && (has('Venus') || has('Mars')))) return 'sex'
  if (has('Venus') || has('Mars') || has('Ascendant') || has('Uranus')) return 'spark'
  if (has('Moon') || has('Sun') || has('Neptune')) return 'love'
  if (has('Saturn')) return 'future'
  if (has('Jupiter')) return 'life'
  return 'love'
}
// 테마별 한 줄 훅 — 질문에 결론부터 답하는 단정 한 줄. 신호 polarity 합으로
// pos(끌림 우세)/neg(마찰 우세)/mid(반반) 중 선택. 점신·포스텔러식 "콕 집어 답"을
// 추상 서술 앞에 세워, 길게 읽지 않아도 답이 먼저 보이게 한다.
// 테마별 점수 차원 라벨 — "끌림 82"의 앞 단어. (friction 만 "마찰" = 높을수록 충돌↑)
const SCORE_CAPTION: Record<ThemeId, Bi> = {
  spark: { ko: '끌림', en: 'Spark' },
  sex: { ko: '케미', en: 'Chemistry' },
  talk: { ko: '소통', en: 'Talk' },
  love: { ko: '애정', en: 'Affection' },
  friction: { ko: '마찰', en: 'Friction' },
  life: { ko: '편안함', en: 'Ease' },
  money: { ko: '가치관', en: 'Values' },
  future: { ko: '미래', en: 'Future' },
}
// 테마 신호들 → 0~100 점수. friction 은 "충돌 강도"(셀수록 ↑), 나머지는 끌림/조화 강도.
// 정규화하지 않고 신호 크기(net/strength)에 비례시켜 테마·커플마다 점수가 벌어지게 한다.
function themeScore(id: ThemeId, items: { pol: number }[]): number {
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)))
  if (id === 'friction') {
    const strength = items.reduce((s, it) => s + Math.abs(it.pol), 0)
    return clamp(48 + strength * 1.7, 45, 92)
  }
  const net = items.reduce((s, it) => s + it.pol, 0) // 끌림(+)/마찰(−) 가중합
  return clamp(57 + net * 2.5, 34, 96)
}

type HookKey = 'pos' | 'neg' | 'mid'
const THEME_HOOK: Record<ThemeId, Record<HookKey, Bi>> = {
  spark: {
    pos: { ko: '응 — 만나자마자 스파크 튀는 쪽이야.', en: 'Yes — sparks fly the moment you meet.' },
    neg: {
      ko: '끌리긴 하는데 묘하게 당겼다 멀어지는 결.',
      en: "There's a pull, but it runs hot-and-cold.",
    },
    mid: {
      ko: '첫 끌림은 분명한데, 타오르는 결은 좀 갈려.',
      en: 'The draw is real, though it shows up unevenly.',
    },
  },
  sex: {
    pos: {
      ko: '몸의 케미는 확실해 — 끌림이 진한 쪽.',
      en: 'The physical chemistry is real — a deep pull.',
    },
    neg: {
      ko: '끌리는 만큼 팽팽함도 커서 온도 차가 나기 쉬워.',
      en: 'Strong pull, but the heat can run uneven.',
    },
    mid: {
      ko: '은근한 끌림이 깔려 있어 — 천천히 데워지는 쪽.',
      en: 'A quiet pull underneath — it warms up slowly.',
    },
  },
  talk: {
    pos: {
      ko: '말 척척 통하는 사이 — 대화가 안 끊겨.',
      en: 'You just click — the talk never runs dry.',
    },
    neg: {
      ko: '같은 말도 다르게 알아들어 자주 엇갈려.',
      en: 'You hear the same words differently and miss a lot.',
    },
    mid: {
      ko: '통할 땐 잘 통하는데, 결이 갈리는 지점도 있어.',
      en: 'You click in places and slip past in others.',
    },
  },
  love: {
    pos: {
      ko: '사랑하는 방식이 닮아 마음이 편한 쪽.',
      en: 'You love in similar ways — it sits easy.',
    },
    neg: {
      ko: '애정 표현이 어긋나 서로 서운할 수 있어.',
      en: 'Your ways of showing love can miss each other.',
    },
    mid: {
      ko: '다정함의 결이 비슷한 듯 달라 — 맞춰가는 재미가 있어.',
      en: 'Your tenderness is alike yet not — there’s tuning to do.',
    },
  },
  friction: {
    pos: { ko: '크게 부딪힐 일은 잘 안 보여.', en: 'Not many real flashpoints here.' },
    neg: { ko: '주로 자존심·주도권에서 부딪혀.', en: 'Mostly clashes over pride and who leads.' },
    mid: { ko: '부딪히는 결이 있긴 한데 깊진 않아.', en: 'Some friction, but nothing deep.' },
  },
  life: {
    pos: { ko: '같이 있으면 편안한 쪽 — 긴장이 풀려.', en: 'Easy to be around — you both unwind.' },
    neg: { ko: '함께 지내는 결을 맞추는 데 손이 좀 가.', en: 'Day-to-day takes some adjusting.' },
    mid: { ko: '무던하게 편한 사이 — 큰 기복 없이.', en: 'Comfortably low-drama together.' },
  },
  money: {
    pos: {
      ko: '돈·가치관 결이 비슷해 부딪힐 일 적어.',
      en: 'Similar values around money — little to fight over.',
    },
    neg: {
      ko: '쓰고 아끼는 결이 달라 조율이 필요해.',
      en: 'You spend and save differently — needs tuning.',
    },
    mid: {
      ko: '가치관이 닿는 데도, 갈리는 데도 있어.',
      en: 'Your values meet in some places, split in others.',
    },
  },
  future: {
    pos: {
      ko: '오래 갈 결이 보여 — 쌓일수록 단단해져.',
      en: 'Built to last — it firms up over time.',
    },
    neg: {
      ko: '확 타오르는 만큼, 오래 가려면 공이 들어.',
      en: 'Burns bright; lasting takes real work.',
    },
    mid: {
      ko: '급하진 않아도 길게 가는 결 — 천천히 깊어져.',
      en: 'Not dramatic, but a long, deepening grain.',
    },
  },
}
// 기둥 작용(태그) → 테마 (합 계열=인연·미래, 충·형·해·파=부딪힘)
const PILLAR_THEME: Record<string, ThemeId> = {
  천간합: 'future',
  육합: 'future',
  삼합: 'future',
  방합: 'future',
  충: 'friction',
  천간충: 'friction',
  형: 'friction',
  자형: 'friction',
  해: 'friction',
  파: 'friction',
}

export function buildFreeCompatNarrative(
  report: CompatReport,
  opts: BuildNarrativeOptions
): FreeReportView {
  const { labelA, labelB, lang } = opts
  const isKo = lang === 'ko'
  const t = (b: Bi): string => (isKo ? b.ko : b.en)
  // 자리표시자 치환 + KO 조사 자동 교정. 템플릿에 {aEl}과 / {bEl}을 처럼 조사가
  // 바로 붙어 있으면, 치환값의 받침 유무로 과/와·이/가·을/를·은/는 을 바로잡는다.
  // (오행 화·토·수처럼 받침 없는 값에서 "화과/화을/화은" 같은 오류가 났었다.)
  const fill = (s: string, vars: Record<string, string>): string =>
    s.replace(/\{(\w+)\}(과|와|이|가|을|를|은|는)?/g, (m, k: string, j?: string) => {
      const v = vars[k]
      if (v === undefined) return m
      if (!j || !isKo) return v + (j ?? '')
      const type: JosaType =
        j === '과' || j === '와'
          ? '과/와'
          : j === '이' || j === '가'
            ? '이/가'
            : j === '을' || j === '를'
              ? '을/를'
              : '은/는'
      return josa(v, type)
    })

  const sections: FreeReportSection[] = []
  const meta = (id: string): { icon: string; title: string; lead: string } => {
    const m = SECTION_META[id]
    return { icon: m.icon, title: t(m.title), lead: t(m.lead) }
  }
  const planet = (key: string, displayName: string): string => {
    const f = PLANET_FLAVOR[key]
    return f ? `${displayName}(${t(f)})` : displayName
  }

  // ── 한눈에 (verdict) — 섹션이 아니라 view.verdict 로 따로 ──
  const verdict = report.crossVerdict
    ? {
        text: report.crossVerdict.text,
        tone: report.crossVerdict.tone,
        expansion: t(VERDICT_EXPANSION[report.crossVerdict.tone]),
      }
    : null

  // ── 끌림과 마찰 (밴드) ──
  if (report.band) {
    const paras: string[] = []
    for (const key of BAND_ORDER) {
      const v = report.band[key]
      if (typeof v !== 'number') continue
      const copy = BAND[key]
      if (!copy) continue
      const side = v >= 50 ? copy.high : copy.low
      paras.push(`${t(copy.what)} — ${t(side)}`)
    }
    if (paras.length) {
      const m = meta('bands')
      sections.push({ id: 'bands', icon: m.icon, title: m.title, lead: m.lead, paragraphs: paras })
    }
  }

  // ── 두 사람의 타고난 결 (일간 cross + 십성 + 오행 균형) ──
  {
    const paras: string[] = []
    const dm = report.dayMaster
    if (dm) {
      const aEl = elLabel(dm.aEl, isKo)
      const bEl = elLabel(dm.bEl, isKo)
      paras.push(fill(t(DAY_MASTER_REL[dm.relation]), { A: labelA, B: labelB, aEl, bEl }))
      // 십성 cross — 서로가 서로에게 어떤 역할로 다가오나.
      const aSeesB = dm.bToA ? TEN_GODS[dm.bToA] : null // A 입장에서 B 는
      const bSeesA = dm.aToB ? TEN_GODS[dm.aToB] : null // B 입장에서 A 는
      if (aSeesB && bSeesA && dm.bToA === dm.aToB) {
        // 양쪽이 같은 십성 — 똑같은 문단 두 번 찍지 말고 "서로" 한 문단으로(평가단 지적).
        paras.push(
          isKo
            ? `두 사람은 서로에게 ${josa(t(aSeesB.feel), '으로/로')} 다가와요. ${t(aSeesB.blurb)}`
            : `You two come to each other as ${t(aSeesB.feel)}. ${t(aSeesB.blurb)}`
        )
      } else {
        if (aSeesB) {
          paras.push(
            isKo
              ? `${labelA} 입장에서 ${neun(labelB)} ${josa(t(aSeesB.feel), '으로/로')} 와요 — ${t(aSeesB.blurb)}`
              : `To ${labelA}, ${labelB} comes as ${t(aSeesB.feel)} — ${t(aSeesB.blurb)}`
          )
        }
        if (bSeesA) {
          paras.push(
            isKo
              ? `반대로 ${labelB} 입장에서 ${neun(labelA)} ${josa(t(bSeesA.feel), '으로/로')} 와요 — ${t(bSeesA.blurb)}`
              : `In turn, to ${labelB}, ${labelA} comes as ${t(bSeesA.feel)} — ${t(bSeesA.blurb)}`
          )
        }
      }
    }
    // 오행 균형
    const eb = report.elementBalance
    if (eb) {
      if (eb.balanced) {
        paras.push(t(ELEMENT_BALANCE.balanced))
      } else if (eb.range >= 4) {
        paras.push(
          fill(t(ELEMENT_BALANCE.skewed), {
            strongEl: elLabel(eb.strongest, isKo),
            weakEl: elLabel(eb.weakest, isKo),
          })
        )
      } else {
        paras.push(t(ELEMENT_BALANCE.complement))
      }
    }
    if (paras.length) {
      const m = meta('grain')
      sections.push({ id: 'grain', icon: m.icon, title: m.title, lead: m.lead, paragraphs: paras })
    }
  }

  // ── 마음이 닿고 부딪히는 자리 (시너스트리 어스펙트) ──
  if (report.synView && report.synView.aspects.length) {
    const aspectPara = (asp: SynAspectView): string => {
      const key = [asp.aKey, asp.bKey].sort().join('|')
      const pair = ASPECT_PAIR[key]
      const blurb = pair
        ? t(pair)
        : (() => {
            const ra = PLANET_FLAVOR[asp.aKey] ? t(PLANET_FLAVOR[asp.aKey]) : asp.a
            const rb = PLANET_FLAVOR[asp.bKey] ? t(PLANET_FLAVOR[asp.bKey]) : asp.b
            const tone = t(ASPECT_TONE[asp.tone])
            return isKo
              ? `${josa(ra, '과/와')} ${josa(rb, '이/가')} 만나는 자리예요. ${tone}`
              : `where ${ra} meets ${rb}. ${tone}`
          })()
      const head = isKo
        ? `${labelA}의 ${asp.a} × ${labelB}의 ${asp.b} (${asp.label}, ${asp.strength})`
        : `${labelA}'s ${asp.a} × ${labelB}'s ${asp.b} (${asp.label}, ${asp.strength})`
      return `${head} — ${blurb}`
    }
    // 가장 또렷한(각이 딱 맞는=orb 작은) 6개만 — 8개씩 줄줄이 나오면 다 똑같이
    // 들리고 길어진다(평가단 지적). 그 안에서 조화→긴장→엇박 순으로.
    const ranked = [...report.synView.aspects]
      .sort((a, b) => (a.orb ?? 99) - (b.orb ?? 99))
      .slice(0, 6)
    const byTone = (tone: SynAspectView['tone']) =>
      ranked.filter((a) => a.tone === tone).map(aspectPara)
    const paras = [...byTone('harmony'), ...byTone('tension'), ...byTone('neutral')]
    if (paras.length) {
      const m = meta('hearts')
      sections.push({
        id: 'hearts',
        icon: m.icon,
        title: m.title,
        lead: m.lead,
        paragraphs: paras,
      })
    }
  }

  // ── 서로의 삶에서 켜지는 무대 (하우스 오버레이) ──
  if (report.synView) {
    // 같은 하우스에 행성이 여러 개 떨어지면 하우스 설명이 토씨까지 똑같이 반복된다
    // (평가단 지적). 하우스별로 묶어 행성을 나열하고 설명은 한 번만.
    const overlayParas = (list: SynOverlayView[], fromName: string, toName: string): string[] => {
      const byHouse = new Map<number, string[]>()
      for (const o of list) {
        if (!byHouse.has(o.house)) byHouse.set(o.house, [])
        byHouse.get(o.house)!.push(planet(o.planetKey, o.planet))
      }
      return [...byHouse.entries()].map(([house, planets]) => {
        const arena = t(OVERLAY_HOUSE[house]) ?? ''
        const pls = planets.join(', ')
        return isKo
          ? `${fromName}의 ${josa(pls, '이/가')} ${toName}의 ${house}번째 자리에 들어와요 — ${arena}`
          : `${fromName}'s ${pls} land in ${toName}'s ${ORD_EN[house] ?? `${house}th`} — ${arena}`
      })
    }
    const paras = [
      ...overlayParas(report.synView.overlaysAtoB, labelA, labelB),
      ...overlayParas(report.synView.overlaysBtoA, labelB, labelA),
    ]
    if (paras.length) {
      const m = meta('stage')
      sections.push({ id: 'stage', icon: m.icon, title: m.title, lead: m.lead, paragraphs: paras })
    }
  }

  // ── 짝으로서의 끌림 (배우자성) ──
  {
    // 일주(배우자 자리) 우선, 사람당 대표 1개씩 — 노이즈 줄이고 강한 신호만.
    const seen = new Set<string>()
    const picked: SajuCompatSpouseStar[] = []
    for (const s of [...report.spouseStars].sort(
      (a, b) => Number(b.isDayPillar) - Number(a.isDayPillar)
    )) {
      if (!SPOUSE_STAR[s.sibsin]) continue
      if (seen.has(s.from)) continue
      seen.add(s.from)
      picked.push(s)
    }
    const paras = picked.map((s) => {
      const viewer = s.from === 'A' ? labelA : labelB
      const other = s.from === 'A' ? labelB : labelA
      const copy = SPOUSE_STAR[s.sibsin]
      const strong = s.isDayPillar
        ? isKo
          ? ' 게다가 바로 배우자 자리(일주)에 떠 있어 가장 강한 인연 신호예요.'
          : ' And it sits right in the spouse seat (day-pillar) — the strongest bond signal.'
        : ''
      return isKo
        ? `${ege(viewer)} ${neun(other)} ${josa(t(copy.feel), '으로/로')} 다가와요. ${t(copy.blurb)}${strong}`
        : `To ${viewer}, ${other} reads as ${t(copy.feel)}. ${t(copy.blurb)}${strong}`
    })
    if (paras.length) {
      const m = meta('partner')
      sections.push({
        id: 'partner',
        icon: m.icon,
        title: m.title,
        lead: m.lead,
        paragraphs: paras,
      })
    }
  }

  // ── 사주가 본 인연의 매듭 (기둥 합/충/형) ──
  {
    // 한자 글자에 한글 음을 붙이고('유(酉)'), '년/월 기둥'을 일반인 말로.
    const head = (r: SajuCompatPillarRel): string =>
      isKo
        ? `${labelA} ${pillarKo(r.aPillar)} ${charKo(r.aChar)} ↔ ${labelB} ${pillarKo(r.bPillar)} ${charKo(r.bChar)}`
        : `${labelA}'s ${pillarEn(r.aPillar)} ${charEn(r.aChar)} ↔ ${labelB}'s ${pillarEn(r.bPillar)} ${charEn(r.bChar)}`
    // 같은 작용(태그)이 여러 곳에서 나오면 똑같은 풀이가 반복된다(평가단: 4번 복붙).
    // 태그별로 묶어 자리(head)만 나열하고 풀이는 한 번만.
    const order = (r: SajuCompatPillarRel): number =>
      r.tone === 'bond' ? 0 : r.tone === 'clash' || r.tone === 'friction' ? 1 : 2
    const byTag = new Map<string, SajuCompatPillarRel[]>()
    for (const r of [...report.pillarRelations].sort((a, b) => order(a) - order(b))) {
      const tag = TAG_PRIORITY.find((p) => r.tags.includes(p)) ?? r.tags[0]
      if (!tag || !PILLAR_REL[tag]) continue
      if (!byTag.has(tag)) byTag.set(tag, [])
      byTag.get(tag)!.push(r)
    }
    const paras = [...byTag.entries()].map(([tag, rs]) => {
      const heads = rs.map(head)
      const headStr =
        heads.length > 1
          ? `${heads[0]}${isKo ? ` 외 ${heads.length - 1}곳` : ` +${heads.length - 1} more`}`
          : heads[0]
      return `${headStr} — ${t(PILLAR_REL[tag].blurb)}`
    })
    if (paras.length) {
      const m = meta('knots')
      sections.push({ id: 'knots', icon: m.icon, title: m.title, lead: m.lead, paragraphs: paras })
    }
  }

  // ── 테마 카드 (질문 주제별 재배치) ──────────────────────────────────
  // 신호를 출처가 아니라 "사람들이 실제로 궁금해하는 질문"으로 묶는다. 신호는
  // 버리지 않고 전부 어느 테마든 들어간다(누락 0). 카드 본문은 weight 내림차순,
  // 기술적 head 없이 풀이만 — 스캔되게.
  // pol = 신호 극성(+끌림 / −마찰 / 0중립) × weight. 테마별 합으로 훅을 고른다.
  const themed: {
    theme: ThemeId
    weight: number
    text: string
    pol: number
  }[] = []
  if (report.dayMaster) {
    const dm = report.dayMaster
    const aEl = elLabel(dm.aEl, isKo)
    const bEl = elLabel(dm.bEl, isKo)
    themed.push({
      theme: 'life',
      weight: 4,
      text: fill(t(DAY_MASTER_REL[dm.relation]), { A: labelA, B: labelB, aEl, bEl }),
      pol: dm.relation === 'generate' ? 4 : dm.relation === 'same' ? 2 : -4,
    })
    if (dm.bToA && TEN_GODS[dm.bToA])
      themed.push({
        theme: SIBSIN_THEME[dm.bToA] ?? 'love',
        weight: 3,
        text: t(TEN_GODS[dm.bToA].blurb),
        pol: (POS_SIBSIN.has(dm.bToA) ? 1 : -1) * 3,
      })
    if (dm.aToB && dm.aToB !== dm.bToA && TEN_GODS[dm.aToB])
      themed.push({
        theme: SIBSIN_THEME[dm.aToB] ?? 'love',
        weight: 3,
        text: t(TEN_GODS[dm.aToB].blurb),
        pol: (POS_SIBSIN.has(dm.aToB) ? 1 : -1) * 3,
      })
  }
  if (report.elementBalance) {
    const eb = report.elementBalance
    const base = eb.balanced
      ? t(ELEMENT_BALANCE.balanced)
      : eb.range >= 4
        ? fill(t(ELEMENT_BALANCE.skewed), {
            strongEl: elLabel(eb.strongest, isKo),
            weakEl: elLabel(eb.weakest, isKo),
          })
        : t(ELEMENT_BALANCE.complement)
    // 1인별 분포 — 각자 어느 기운이 가장 도드라지는지 한 줄 덧붙임.
    const topEl = (rec: Record<string, number>): string | null => {
      const e = Object.entries(rec).sort((x, y) => y[1] - x[1])[0]
      return e && e[1] > 0 ? e[0] : null
    }
    const aTop = topEl(eb.a)
    const bTop = topEl(eb.b)
    const perPerson =
      aTop && bTop
        ? isKo
          ? ` ${neun(labelA)} ${elLabel(aTop, true)} 기운이, ${neun(labelB)} ${elLabel(bTop, true)} 기운이 가장 도드라져요.`
          : ` ${labelA} leans ${elLabel(aTop, false)}, ${labelB} leans ${elLabel(bTop, false)}.`
        : ''
    themed.push({
      theme: 'life',
      weight: 1,
      text: base + perPerson,
      pol: eb.balanced ? 1 : eb.range >= 4 ? -1 : 1,
    })
  }
  if (report.synView) {
    for (const asp of report.synView.aspects) {
      const key = [asp.aKey, asp.bKey].sort().join('|')
      const pair = ASPECT_PAIR[key]
      const blurb = pair
        ? t(pair)
        : (() => {
            const ra = PLANET_FLAVOR[asp.aKey] ? t(PLANET_FLAVOR[asp.aKey]) : asp.a
            const rb = PLANET_FLAVOR[asp.bKey] ? t(PLANET_FLAVOR[asp.bKey]) : asp.b
            const tone = t(ASPECT_TONE[asp.tone])
            return isKo
              ? `${josa(ra, '과/와')} ${josa(rb, '이/가')} 만나는 자리예요. ${tone}`
              : `where ${ra} meets ${rb}. ${tone}`
          })()
      const w = Math.max(1.5, 6 - (asp.orb ?? 4))
      themed.push({
        theme: aspectTheme(asp),
        weight: w,
        text: blurb,
        pol: asp.tone === 'harmony' ? w : asp.tone === 'tension' ? -w : 0,
      })
    }
    // 오버레이 — 누구의 어느 행성이 어느 방에 들어왔는지(행성 정체 추가). 방당 1회.
    // 단, 방향(A→B / B→A)별로 따로 센다 — 같은 방 번호라도 서로 다른 신호라
    // 한 세트로 묶으면 한쪽이 통째로 누락된다(누락 0 위반).
    for (const [list, viewer] of [
      [report.synView.overlaysAtoB, labelA] as const,
      [report.synView.overlaysBtoA, labelB] as const,
    ]) {
      const seenHouse = new Set<number>()
      for (const o of list) {
        if (seenHouse.has(o.house)) continue
        seenHouse.add(o.house)
        const arena = t(OVERLAY_HOUSE[o.house]) ?? ''
        if (!arena) continue
        const plName = planet(o.planetKey, o.planet)
        const text = isKo
          ? `${viewer}의 ${plName} 기운이 닿는 자리예요. ${arena}`
          : `${viewer}'s ${plName} reaches into this part of life. ${arena}`
        themed.push({ theme: HOUSE_THEME[o.house] ?? 'life', weight: 2, text, pol: 0.6 })
      }
    }
  }
  {
    const seenFrom = new Set<string>()
    for (const sp of [...report.spouseStars].sort(
      (a, b) => Number(b.isDayPillar) - Number(a.isDayPillar)
    )) {
      if (!SPOUSE_STAR[sp.sibsin] || seenFrom.has(sp.from)) continue
      seenFrom.add(sp.from)
      themed.push({
        theme: 'future',
        weight: sp.isDayPillar ? 10 : 6,
        text: t(SPOUSE_STAR[sp.sibsin].blurb),
        pol: sp.isDayPillar ? 4 : 2,
      })
    }
  }
  {
    const seenTag = new Set<string>()
    for (const r of report.pillarRelations) {
      const tag = TAG_PRIORITY.find((p) => r.tags.includes(p)) ?? r.tags[0]
      if (!tag || !PILLAR_REL[tag] || seenTag.has(tag)) continue
      seenTag.add(tag)
      themed.push({
        theme: PILLAR_THEME[tag] ?? 'future',
        weight: r.tone === 'minor' ? 1 : 3,
        text: t(PILLAR_REL[tag].blurb),
        pol: r.tone === 'bond' ? 3 : r.tone === 'clash' || r.tone === 'friction' ? -3 : 0,
      })
    }
  }
  const themes: FreeReportTheme[] = THEME_META.map((m) => {
    const items = themed.filter((x) => x.theme === m.id).sort((a, b) => b.weight - a.weight)
    const seenTxt = new Set<string>()
    const paragraphs: string[] = []
    for (const it of items) {
      if (seenTxt.has(it.text)) continue
      seenTxt.add(it.text)
      paragraphs.push(it.text)
    }
    // 한 줄 훅 — 이 테마 신호들의 극성 합으로 결론부터. (질문에 콕 집어 답)
    const net = items.reduce((s, it) => s + it.pol, 0)
    const hookKey: HookKey = net > 0.5 ? 'pos' : net < -0.5 ? 'neg' : 'mid'
    const hook = t(THEME_HOOK[m.id][hookKey])
    return {
      id: m.id,
      icon: m.icon,
      title: t(m.title),
      hook,
      score: themeScore(m.id, items),
      scoreCaption: t(SCORE_CAPTION[m.id]),
      paragraphs,
    }
  }).filter((th) => th.paragraphs.length > 0)

  const glossary: FreeReportGlossaryEntry[] = COMPAT_GLOSSARY.map((g) => ({
    term: t(g.term),
    body: t(g.body),
  }))

  return {
    intro: t(INTRO),
    verdict,
    sections,
    themes,
    glossary,
    closing: t(CLOSING),
  }
}

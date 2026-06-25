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
// 헤드라인 총점 등급 — 큰 숫자 옆 한 마디. (점신·포스텔러식 캡처용 후크)
function overallGrade(score: number): Bi {
  if (score >= 85) return { ko: '찰떡 궁합', en: 'A rare match' }
  if (score >= 75) return { ko: '잘 맞는 사이', en: 'A strong match' }
  if (score >= 65) return { ko: '무난한 궁합', en: 'A solid match' }
  if (score >= 55) return { ko: '노력형 궁합', en: 'Takes some work' }
  return { ko: '롤러코스터', en: 'A rollercoaster' }
}

// 테마 신호들 → 0~100 점수. friction 은 "충돌 강도"(셀수록 ↑), 나머지는 끌림/조화 강도.
// 정규화하지 않고 신호 크기(net/strength)에 비례시켜 테마·커플마다 점수가 벌어지게 한다.
function themeScore(id: ThemeId, items: { pol: number }[], nudge = 0): number {
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)))
  if (id === 'friction') {
    const strength = items.reduce((s, it) => s + Math.abs(it.pol), 0)
    return clamp(48 + strength * 1.7, 45, 92)
  }
  // nudge = 커플 전체 시너스트리 화합도 보정(±). 신호 한 개뿐인 테마(예: 오버레이만)도
  // 커플마다 점수가 달라지게 — 안 그러면 단일 오버레이 테마가 전 커플 같은 값으로 뭉친다.
  const net = items.reduce((s, it) => s + it.pol, 0) // 끌림(+)/마찰(−) 가중합
  return clamp(57 + net * 2.5 + nudge, 30, 96)
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

// 테마별 "기본 결" 문단 — 훅 뒤, 신호별 본문 앞에 깔아 빈약한 테마도 풍부하게.
// (24개: 8테마 × 3극성, 병렬 Opus 생성. 특정 행성·사주 언급 없이 일반 분위기.)
const THEME_PRIMER: Record<ThemeId, Record<HookKey, Bi>> = {
  spark: {
    pos: {
      ko: '두 사람이 처음 만났을 때 저절로 시선이 마주치고, 무언가 편하면서도 설레는 기운을 느껴요. 말을 많이 안 해도 분위기가 통하고, 카톡 첫 대화부터 자꾸 웃음이 나게 되는 그런 관계예요. 서로를 가만히 봐도 괜찮은 사람이라는 확신이 빠르게 생기더라고요.',
      en: 'When you two first meet, there\'s an effortless ease between you — your eyes meet and something just clicks. Conversation flows without awkward silences, and even your first text exchanges have you both smiling without trying. There\'s a quiet confidence that whispers, "This person just feels right," and that sense comes fast.',
    },
    neg: {
      ko: '만나는 순간엔 분명 끌리는 데, 시간이 지나면 그 끌림이 왔다 갔다 하는 쪽이에요. 처음의 반짝임이 오래가지 못하고, 자꾸 "정말 맞나?" 하는 의문이 생기더라고요. 그래도 그 의문 때문에 더 주의깊게 보게 되는 거라, 서로를 제대로 알아가는 시간이 될 수 있어요.',
      en: 'There\'s a definite spark when you first meet, but it flickers — sometimes strong, sometimes fading. That initial shine doesn\'t quite hold, and you find yourselves wondering "is this really it?" now and then. But that very uncertainty can make you pay closer attention, turning it into a chance to truly know each other.',
    },
    mid: {
      ko: '만나자마자 뭔가 반기는 기운이 느껴지지만, 그게 설렘인지 호기심인지는 앞으로 봐야 할 것 같아요. 한쪽은 금방 빠질 수 있는데 다른 쪽은 살짝 거리를 두고 보는 스타일이라, 그 간격을 어떻게 줄여나가느냐가 포인트거든요. 처음 만남의 불꽃보다는 천천히 익어가는 당김이 두 사람의 진짜 맛인 것 같습니다.',
      en: "There's a spark when you first meet, but it's not quite clear if it's instant chemistry or intrigued curiosity. One of you might fall quickly while the other takes a more measured approach, and that difference can feel like a gentle friction—or even part of the draw. The real connection between you two might turn out to be something that grows quietly rather than dazzles right away.",
    },
  },
  sex: {
    pos: {
      ko: '두 사람의 몸과 분위기가 스스럼없이 맞아떨어지는 편이에요. 굳이 애쓰지 않아도 가까워지는 순간의 호흡이 잘 맞고, 손끝 하나에도 마음이 편하게 놓이죠. 끌림이 머리보다 먼저 통하는, 말보다 분위기로 가까워지는 사이예요.',
      en: 'Your bodies and the mood between you tend to fall into sync on their own. The breath of those close moments lines up without effort, and even a brush of a hand puts you both at ease. The pull lands before the mind catches up — you grow closer through atmosphere more than words.',
    },
    neg: {
      ko: '두 사람의 신체 리듬과 감정의 온도가 살짝 엇갈리는 편이에요. 밤중에 한 사람이 손을 내밀 때 다른 한 사람은 피곤에 절어 있거나, 분위기를 타는 방식이 달라서 가까워지려는 순간이 자주 엇나가는 거죠. 이런 속도의 차이가 쌓이면 서로에게 묘한 답답함을 남길 수 있으니, 미리 말로 풀어두는 게 좋아요.',
      en: "The rhythm of your physical connection and emotional temperature tend to be slightly out of sync. When one of you reaches out at night, the other might be exhausted or preoccupied, and the way you each approach intimacy simply doesn't align—so those moments often fall flat. If this gap isn't addressed, it can leave a subtle frustration between you, so talking it through early makes all the difference.",
    },
    mid: {
      ko: '침대 속 둘의 온도는 어떨까요. 잘 맞는 날도 있고, 좀 어색할 때도 있는데—그게 사실 자연스러운 거예요. 서로 다른 리듬을 가진 두 사람이 한 침대에서 만나면서, 때론 따뜻하게, 때론 조심스럽게 맞춰가는 과정 자체가 둘의 케미라고 할 수 있죠.',
      en: "Some nights feel effortlessly close, and others need a little more communication—and that's perfectly normal. When two people with different rhythms share the same bed, you're both learning to find warmth in the dance between you—sometimes it flows naturally, sometimes it takes a gentle touch to sync up. That's where your real chemistry lives.",
    },
  },
  talk: {
    pos: {
      ko: '말과 농담, 생각의 결이 척척 통하는 사이예요. 굳이 설명 안 해도 상대가 무슨 말인지 알아차리고, 카톡도 빠르게 척척 오가는 편한 대화 리듬이 있는 거죠. 같은 코드의 농담이 먹히고, 나중에 비슷한 장면에서 다시 웃을 수 있는 공통의 언어가 차곡차곡 쌓여가요.',
      en: "Your words and thoughts flow in an easy rhythm that barely needs explaining. The other catches your drift without you having to spell it out, and there's a quick back-and-forth — the kind where messages come fast. Jokes in your shared code land, and you find yourselves laughing at the same things again and again, building a common language as you go.",
    },
    neg: {
      ko: '두 사람 대화가 좀 자주 엇갈리는 편이에요. 한 사람이 무언가를 꺼냈을 때 상대가 예상과 다른 방향으로 받아들이거나, 같은 말도 서로 다르게 해석하는 일이 잦다는 거죠. 말투나 표현 스타일이 달라서 의도는 좋아도 띄엄띄엄 미끄러지는 부분이 있더라고요.',
      en: 'Your conversation rhythms tend to miss each other a bit. When one person brings something up, the other often interprets it differently than intended, and you can find yourselves on separate wavelengths even about the same topic. The way you each express yourselves feels a little mismatched, so good intentions sometimes get lost in translation.',
    },
    mid: {
      ko: '둘의 대화는 묘해요. 통할 땐 정말 통하는데, 가끔 엇갈리는 지점이 있거든요. 카톡으로는 척척 맞는 리듬도, 직접 만나면 뭔가 겹치는 부분이 생기곤 하는 그런 거죠. 그래도 그 틈새가 오히려 둘을 새로 알아가게 하는 기회가 될 수 있어요.',
      en: "Your conversations have an interesting rhythm — sometimes you're totally in sync, and sometimes there's just a tiny gap between how you're thinking. Your texts might flow easily, but face-to-face, you might find yourselves working around each other now and then. But that small friction can actually be a chance to understand each other a little better.",
    },
  },
  love: {
    pos: {
      ko: '두 사람의 사랑하는 방식이 스스럼없이 맞아떨어지는 느낌이에요. 한 사람이 손을 내밀면 다른 사람이 선뜻 받아주고, 말없이도 서로 필요한 순간을 알아채는 그런 거죠. 크게 부딪힐 일 없이 부드럽게 흘러가는 연결감이 있어요.',
      en: "The way you two express and receive love flows naturally together. When one reaches out, the other tends to meet them there—there's an ease to knowing what the other needs even without saying it. You're likely to find yourselves clicking without much friction, just a gentle current of understanding.",
    },
    neg: {
      ko: '두 사람의 사랑을 표현하는 방식이 꽤 다른 편이에요. 한 쪽은 자주 말과 손길로 마음을 나타내고 싶어하는데, 다른 한 쪽은 그보다 조용히 옆에 있어주고 챙기는 방식을 더 편해하더라고요. 그래서 서로 "충분히 사랑받고 있나?" 하는 작은 오해가 쉽게 쌓일 수 있는 구간이죠.',
      en: "The two of you tend to show affection in quite different ways. One of you reaches for words and touch to express feeling, while the other tends to prefer a quieter presence and thoughtful care. That gap can make it easy for small misunderstandings to build—each wondering if you're truly valued the way you need to be.",
    },
    mid: {
      ko: '두 사람이 사랑을 표현하는 방식이 서로 달라서, 때론 잘 맞고 때론 살짝 어긋나는 편이에요. 한 쪽은 손을 잡고 말을 건네며 마음을 나누고 싶어 하고, 다른 쪽은 조용히 곁에 있으며 신뢰를 쌓으려고 할 수 있죠. 그렇지만 이런 차이가 꼭 문제는 아니에요 — 오히려 서로를 채워주려 노력할 때 더욱 깊어지는 쪽이거든요.',
      en: "The two of you show affection in different ways, so sometimes you click perfectly and sometimes there's a gentle friction. One of you might want to express love through words and closeness, while the other prefers to show care quietly and build trust over time. But this difference doesn't have to be a problem — in fact, it often brings you closer when you both make the effort to understand and meet each other halfway.",
    },
  },
  friction: {
    pos: {
      ko: '둘 다 눈치 있는 타입이거나, 아니면 어딘가 통하는 데가 있어서 큰 충돌 없이 흘러가는 사이예요. 툭툭 터지는 싸움보다는 작은 불만을 쌓아두는 쪽이 조심할 자리지만, 전반적으론 말이 안 통해도 옆에서 웃고 넘어갈 수 있는 편안함이 있어요.',
      en: "You two either have a knack for reading the room, or there's something that just clicks — enough that big clashes stay off the radar. More likely to let small frustrations stack quietly than explode — watch that — but overall, even when words don't land, there's an ease to brush past it together.",
    },
    neg: {
      ko: '끌리는 마음과 별개로, 같이 지내다 보면 분명히 부딪히는 자리가 있어요. 서로의 타고난 성향이 만나는 지점에서 박자가 어긋나거나, 자존심이 으르렁대거나, 생각과 속도가 따로 놀곤 하죠. 미리 알아두면 같은 일로 두 번 부딪히진 않아요 — 피할 건 피하고, 안고 갈 건 안고 가면 되니까요.',
      en: 'Apart from the pull between you, sharing a life is bound to surface real friction. Where your natural temperaments meet, the timing can slip, pride can bristle, or thought and pace can run apart. Knowing these ahead of time keeps you from clashing twice over the same thing — you sidestep what you can and carry the rest.',
    },
    mid: {
      ko: '둘이 완전히 맞는 건 아니어서, 뭔가를 함께 결정할 때 의견이 엇갈리곤 해요. 근데 그게 틀려서라기보다는, 같은 일을 다른 각도에서 보는 거라 대화하다 보면 오히려 더 단단해지기도 하죠. 때론 작은 마찰에 답답할 때도 있지만, 그만큼 서로를 또렷하게 이해하게 되는 사이예요.',
      en: "You two aren't a perfect fit, so your views can diverge when you're deciding something together. It's not that either of you is wrong — it's more that you see the same thing from different angles, and talking it through often leaves you both stronger. There are moments when small friction frustrates, but that same grain keeps you understanding each other more clearly.",
    },
  },
  life: {
    pos: {
      ko: '둘이 함께 있으면 어느새 긴장이 풀어지는 분위기예요. 굳이 뭔가 특별한 걸 하지 않아도 옆에 있는 것만으로 편하고, 말을 거의 안 해도 서로 뭐 하는지 잘 알아챌 정도죠. 카톡 답장이 늦어도 괜찮고, 조용히 각자 하는 것도 편안한, 그런 사이예요.',
      en: "Being together just naturally settles you both down. You don't need to do anything special—just being by each other's side feels comfortable and easy. You can read each other without much talking, and even the quiet moments together feel natural, whether it's slow text replies or just doing your own thing beside each other.",
    },
    neg: {
      ko: '둘이 가만히 같은 공간에 있으면, 자꾸만 서로 다른 속도가 느껴져요. 조용히 영화를 봐도, 카톡을 기다려도, 뭔가 맞춰지지 않는 느낌이 물밀듯이 들어서 편하게 쉬기가 어렵죠. 함께 있되 따로 가는 그런 낌새가 자주 생기는 경향이 있어요.',
      en: "When you're together, there's a nagging sense that you're moving at different rhythms. Whether you're watching a movie in silence or waiting for a text, something feels just slightly out of sync—and that makes it hard to truly relax around each other. You end up together yet somehow apart, and that familiar tension tends to resurface.",
    },
    mid: {
      ko: '같이 있으면 편하면서도, 때론 서로 다른 속도에 맞추느라 작은 마찰이 생기는 편이에요. 처음엔 낯설 수 있지만, 함께 시간을 보내다 보면 그 차이가 오히려 밸런스를 만들어주는 거죠. 카톡 답장이 늦어도, 침묵이 어색하지 않은 그런 사이가 될 수 있어요.',
      en: "Being together feels natural and comfortable, though you might notice different rhythms creating subtle friction at times. What feels unfamiliar at first often becomes the very thing that keeps you balanced as you spend more time together. Even when responses are slow or silence stretches out, it doesn't feel awkward—that's the space where you two actually fit.",
    },
  },
  money: {
    pos: {
      ko: '돈과 가치관이 맞아떨어지는 건, 결국 일상의 작은 순간들에서 드러나요 — 카톡에서 값을 흥정할 때도, 데이트 후 계산할 때도요. 두 사람의 결을 보면 이 영역에서 얼마나 매끄럽게 흐르는지, 아니면 자꾸 손을 맞춰야 하는지가 참 분명해져요. 우리가 돈을 대하는 태도는 사실 그 사람의 삶을 바라보는 법 전부니까, 여기서 비슷하면 크게 부딪힐 일이 적어진다는 뜻이에요.',
      en: "Money and values show up in the small dailies — when you're eyeing a purchase, splitting a check, or talking about what matters. Looking at your chart tells us whether this zone flows naturally between you or asks for constant tuning. How you handle money says a lot about how you see life itself, so when your rhythms match here, there's far less to clash over.",
    },
    neg: {
      ko: '돈과 쓰임새에 대한 생각이 꽤 다른 편이라 자주 마찰이 생기는 쌍이에요. 한 사람이 차근차근 모으는 걸 중요하게 생각한다면, 다른 쪽은 지금 누리는 게 우선일 수 있거든요. 통장을 까고 나중에 얘기하거나, 큰 구매 앞에서 의견이 팽팽해지는 순간들이 분명 있을 거예요.',
      en: "The two of you tend to have quite different takes on money and what matters most when it comes to spending—friction often flares up because of it. While one of you might prioritize building savings and playing the long game, the other may feel that enjoying life now is the more important call. You'll likely find yourselves at odds when it comes to big purchases or when one partner realizes a credit card charge after the fact.",
    },
    mid: {
      ko: '둘이 돈 쓰는 리듬이 조금씩 달라서, 처음엔 "어? 이 부분 다네?" 싶을 수 있어요. 하지만 그 차이가 서로를 좀 더 균형잡힌 사람으로 만들어주는 경우도 많거든요. 가벼운 마찰은 있겠지만, 대화로 충분히 맞춰나갈 수 있는 영역이에요.',
      en: "You two have different rhythms when it comes to money and values, so you might notice some friction early on. But those differences often end up complementing each other, bringing balance to how you each approach what matters. There's room for some give-and-take, but it's the kind of thing you can work through together.",
    },
  },
  future: {
    pos: {
      ko: '두 사람이 처음엔 끌려도, 시간이 지나면서 느껴지는 연결의 두께가 다른데 — 이 경우 둘이 가진 기운의 결을 보면, 오히려 차이를 거치면서 더 단단해지는 패턴이 보여요. 서로를 맞춰가는 과정 자체가 관계를 깊게 만드는 거죠. 처음의 반짝임보다 시간이 쌓일수록 믿음과 이해가 자라나는, 오래 가는 결이에요.',
      en: "You two might spark at first, but what matters for the long haul is the bone underneath — and the grain here shows something that actually grows *deeper* as you navigate the differences. The work of meeting each other in the middle is what builds the bond. Less about the glitter of the start, more about trust and understanding that compound over time. It's a grain built to last.",
    },
    neg: {
      ko: '두 사람은 처음엔 끌리는 게 확실하지만, 시간이 지나면서 자꾸 다른 리듬을 탈 가능성이 있어요. 한 사람이 앞으로 나가려 할 때 다른 한 사람은 멈춰 생각하는 식으로, 속도감이 맞지 않으면서 자주 답답함을 느낄 수 있죠. 초반의 설렘이 식으면 "우리 진짜 잘 맞나?" 하는 의문이 고개를 들 수 있는 조합이에요.',
      en: 'You may feel a strong spark at first, but as time passes, there\'s a risk of drifting into different rhythms. When one person wants to move forward, the other tends to pause and reflect—this mismatch in pace can leave you both feeling frustrated. Once the initial excitement fades, questions like "Are we really compatible?" might start to surface in this pairing.',
    },
    mid: {
      ko: '둘은 처음엔 잘 맞다가 시간이 지나면서 작은 마찰들이 생기더라고요. 그게 관계를 흔드는 건 아니지만, 둘이 같은 방향으로 나아가려면 자꾸 대화로 맞춰줘야 하는 타입이에요. 다만 그 과정에서 서로를 더 깊이 알아가는 기회도 많으니까, 노력 여부에 따라 오래 함께할 수도, 슬쩍 멀어질 수도 있는 관계랍니다.',
      en: "The connection feels great at first, but you'll notice some gentle friction building over time. It's not anything that rocks the boat fundamentally, but you'll need to keep checking in and aligning with each other as things unfold. The good news is that working through those moments can actually deepen your understanding—so whether this lasts really comes down to how much both of you are willing to show up for it.",
    },
  },
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
        ? aTop === bTop
          ? // 둘 다 같은 기운이 도드라지면 "X는 화, Y는 화" 중복 대신 한 번만.
            isKo
            ? ` 둘 다 ${elLabel(aTop, true)} 기운이 가장 도드라지는 사이예요.`
            : ` You both lean ${elLabel(aTop, false)}.`
          : isKo
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
    // 오버레이 — 누구의 어느 행성이 어느 방에 들어왔는지. 방(하우스)별로 묶어서
    // 양방향(A→B / B→A)·여러 행성을 한 문단에 모은다. 방 의미(arena)는 한 번만
    // 나오게 — 같은 방이 양쪽에서 잡히면 똑같은 설명이 두 번 찍히던 문제 방지.
    const overlayByHouse = new Map<number, { viewer: string; key: string; disp: string }[]>()
    for (const [list, viewer] of [
      [report.synView.overlaysAtoB, labelA] as const,
      [report.synView.overlaysBtoA, labelB] as const,
    ]) {
      for (const o of list) {
        if (!OVERLAY_HOUSE[o.house]) continue
        if (!overlayByHouse.has(o.house)) overlayByHouse.set(o.house, [])
        overlayByHouse.get(o.house)!.push({ viewer, key: o.planetKey, disp: o.planet })
      }
    }
    for (const [house, arr] of overlayByHouse) {
      const arena = t(OVERLAY_HOUSE[house])
      // 한 방에 행성 하나면 괄호 풀이까지, 여럿이면 풀이 빼고 가볍게 나열(중복·과적재 방지).
      let lead: string
      if (arr.length === 1) {
        const e = arr[0]
        lead = isKo
          ? `${e.viewer}의 ${planet(e.key, e.disp)} 기운이 여기에 와닿아요. ${arena}`
          : `${e.viewer}'s ${planet(e.key, e.disp)} reaches into this part of life. ${arena}`
      } else {
        const names = arr.map((e) => (isKo ? `${e.viewer}의 ${e.disp}` : `${e.viewer}'s ${e.disp}`))
        lead = isKo
          ? `${josa(names.join('·'), '이/가')} 같은 자리에 닿아요. ${arena}`
          : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} all touch this part of life. ${arena}`
      }
      themed.push({ theme: HOUSE_THEME[house] ?? 'life', weight: 2, text: lead, pol: 0.6 })
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
  // 커플 전체 시너스트리 화합도 → 테마 점수 보정(±4). 신호 적은 테마도 커플마다 달라지게.
  const harmNudge =
    typeof report.band?.synastry_harmonic === 'number'
      ? Math.max(-4, Math.min(4, (report.band.synastry_harmonic - 50) / 12))
      : 0
  const themes: FreeReportTheme[] = THEME_META.map((m) => {
    const items = themed.filter((x) => x.theme === m.id).sort((a, b) => b.weight - a.weight)
    // 극성 합 → 훅·기본결·점수 모두 같은 pos/neg/mid 로 결정.
    const net = items.reduce((s, it) => s + it.pol, 0)
    const hookKey: HookKey = net > 0.5 ? 'pos' : net < -0.5 ? 'neg' : 'mid'
    const hook = t(THEME_HOOK[m.id][hookKey])
    // 기본 결 문단 — 신호별 본문 앞에 깔아 빈약한 테마도 풍부하게. (훅과 같은 극성)
    // 단, 신호가 0인 테마엔 붙이지 않는다 — "신호 있을 때만 표시" 원칙 유지(빈 테마 부활 X).
    const seenTxt = new Set<string>()
    const paragraphs: string[] = items.length > 0 ? [t(THEME_PRIMER[m.id][hookKey])] : []
    for (const it of items) {
      if (seenTxt.has(it.text)) continue
      seenTxt.add(it.text)
      paragraphs.push(it.text)
    }
    return {
      id: m.id,
      icon: m.icon,
      title: t(m.title),
      hook,
      score: themeScore(m.id, items, harmNudge),
      scoreCaption: t(SCORE_CAPTION[m.id]),
      paragraphs,
    }
  }).filter((th) => th.paragraphs.length > 0)

  const glossary: FreeReportGlossaryEntry[] = COMPAT_GLOSSARY.map((g) => ({
    term: t(g.term),
    body: t(g.body),
  }))

  // 헤드라인 총점 — 끌림/조화축 테마 점수 평균. friction(충돌강도)은 진단축이라
  // 총점에서 제외하되, 충돌이 큰 커플엔 가벼운 감점만 준다(역산해 평균에 넣으면
  // 점수가 통째로 짓눌려 모두가 비관적으로 나옴).
  const posThemes = themes.filter((th) => th.id !== 'friction' && typeof th.score === 'number')
  const fric = themes.find((th) => th.id === 'friction')
  let overallScore: number | null = null
  if (posThemes.length) {
    const mean = posThemes.reduce((s, th) => s + th.score!, 0) / posThemes.length
    // 평균은 가운데로 뭉치므로 중심(68) 기준 편차를 1.5배 넓혀 점수가 벌어지게 하고,
    // 충돌이 큰 커플엔 가벼운 감점만. 40~97 로 클램프.
    const expanded = 68 + (mean - 68) * 1.5 - (fric ? Math.max(0, fric.score! - 65) * 0.1 : 0)
    overallScore = Math.max(40, Math.min(97, Math.round(expanded)))
  }

  return {
    overallScore,
    overallGrade: overallScore != null ? t(overallGrade(overallScore)) : null,
    intro: t(INTRO),
    verdict,
    sections,
    themes,
    glossary,
    closing: t(CLOSING),
  }
}

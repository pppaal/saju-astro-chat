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

// 커플별 결정적 seed — band·일간·어스펙트·배우자성 해시(시계 안 읽음 → 결정성 유지).
function coupleSeed(report: CompatReport): number {
  let h = 2166136261
  const push = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
  }
  const b = report.band
  if (b)
    push(
      `${b.synastry_harmonic}|${b.synastry_tension}|${b.eastern_hap}|${b.eastern_chung}|${b.elements_match}`
    )
  const dm = report.dayMaster
  if (dm) push(`${dm.aStem}${dm.bStem}${dm.aEl}${dm.bEl}`)
  for (const a of report.synView?.aspects ?? []) push(`${a.aKey}${a.bKey}${a.type}`)
  for (const sp of report.spouseStars ?? []) push(sp.sibsin)
  return h >>> 0
}
// seed + 슬롯 라벨 → 변형 풀에서 결정적 선택. 같은 커플·라벨엔 안정, 커플마다·슬롯마다 독립.
function pickFor<T>(arr: T[], seed: number, label: string): T {
  let s = seed >>> 0
  for (let i = 0; i < label.length; i++) s = Math.imul(s ^ label.charCodeAt(i), 16777619)
  return arr[(s >>> 0) % arr.length]
}

// 변형 풀(대체) — 원본과 함께 커플 해시로 결정적 선택. 같은 톤·극성이어도 커플마다 달라진다.
const HOOK_ALT: Record<ThemeId, Record<HookKey, Bi>> = {
  spark: {
    pos: {
      ko: '첫 순간부터 뭔가 톡 터지는 느낌이 있어 — 당신들은 그런 쌍이야.',
      en: "There's something that just clicks the moment you meet — you two are that kind of pair.",
    },
    neg: {
      ko: '처음엔 확 끌리지만 자꾸 깊어졌다가 떨어졌다를 반복하는 결.',
      en: 'The magnetism comes on strong at first, then pulls back and forth unpredictably.',
    },
    mid: {
      ko: '만나면 뭔가 반기는 느낌은 확실한데, 그게 계속 불이 붙을지는 시간이 알려줄 거 같아.',
      en: 'That initial welcome-feeling is real, but whether it grows into something bigger remains to be seen.',
    },
  },
  sex: {
    pos: {
      ko: '육체의 호응이 자연스러워 — 가까워지려는 마음도 진하고 명확한 쪽.',
      en: 'Your physical rhythm aligns instinctively — the desire to be close runs clear and strong.',
    },
    neg: {
      ko: '끌리는 마음은 있는데 분위기 맞추기가 자꾸 엇나가는 편.',
      en: 'The pull is there, but creating that intimacy tends to fall out of step.',
    },
    mid: {
      ko: '가까워지는 순간이 항상 부드럽지만은 않아 — 그래도 그 안에 어떤 온기는 있어.',
      en: "Closeness isn't always smooth, though there's a warmth underneath the awkwardness.",
    },
  },
  talk: {
    pos: {
      ko: '둘이 나누는 말이 빠르게 이어져 — 말의 끝을 맞춰가는 그런 사이.',
      en: "Your words flow into each other — you finish each other's thoughts without trying.",
    },
    neg: {
      ko: '같은 말을 던져도 받아들이는 방식이 달라 자꾸 오해하고 엇갈려.',
      en: 'The same words land differently for each of you, leaving gaps and misunderstandings.',
    },
    mid: {
      ko: '어떤 순간엔 말이 척척 맞는데, 다른 순간엔 엇갈리는 느낌이 있어.',
      en: 'Sometimes your words land in perfect rhythm, sometimes they slip past each other.',
    },
  },
  love: {
    pos: {
      ko: '사랑을 나타내는 방식이 자연스럽게 닮아 서로 편안함을 느껴.',
      en: 'The way you show affection comes so naturally in sync — comfort flows easily.',
    },
    neg: {
      ko: '사랑 표현의 방식이 자주 엇나가서 서로 혼동하거나 섭섭할 수 있어.',
      en: 'How you each express love often misses the mark — leaving room for hurt or confusion.',
    },
    mid: {
      ko: '애정 표현의 톤이 비슷하기도 하고 달라서 — 맞춰가면서 배우는 과정 자체가 둘의 연결고리야.',
      en: 'Your ways of showing tenderness echo in some places and diverge in others—that very dance of meeting halfway builds your bond.',
    },
  },
  friction: {
    pos: {
      ko: '크게 부딪힐 일이 잘 없는 결이 보여.',
      en: 'You two navigate around the big collisions with ease.',
    },
    neg: {
      ko: '자존심이나 주도권 쪽에서 자꾸 충돌하는 경향이 있어.',
      en: 'Pride and the need to lead keep bringing you two into friction.',
    },
    mid: {
      ko: '부딪히는 부분이 있긴 하지만 표면에 머무는 수준이야.',
      en: "There's friction between you, though it never cuts very deep.",
    },
  },
  life: {
    pos: {
      ko: '함께 있으면 자연스럽게 마음이 편해지는 사이야.',
      en: 'Just being near each other eases the weight you carry—calm comes naturally.',
    },
    neg: {
      ko: '일상을 나누려면 계속 자리를 맞춰야 해.',
      en: 'Living together means constant small adjustments.',
    },
    mid: {
      ko: '특별한 일 없이도 편하게 붙어 있을 수 있어.',
      en: 'Steady and uncluttered — no wild ups and downs.',
    },
  },
  money: {
    pos: {
      ko: '돈 쓰는 방식과 중요한 것들이 맞아떨어져.',
      en: 'You see value the same way — smooth sailing on finances.',
    },
    neg: {
      ko: '번 돈을 어떻게 쓸지에 대해 자꾸 의견이 갈려.',
      en: 'Your money philosophies are pretty far apart — needs work.',
    },
    mid: {
      ko: '어떤 건 가치관이 통하고, 어떤 건 결이 다르더라.',
      en: "Sometimes your values line up, sometimes they don't.",
    },
  },
  future: {
    pos: {
      ko: '시간 위에 차곡차곡 쌓일 수 있는 사이야.',
      en: "You're wired to deepen — time just makes it stronger.",
    },
    neg: {
      ko: '처음의 불꽃이 다하면 함께 가기가 빡셀 수 있어.',
      en: 'The glow fades fast — staying together takes real effort.',
    },
    mid: {
      ko: '서두르지 않고 천천히 스며드는 관계야.',
      en: 'Slow burn, nothing rushed — but you go deep over time.',
    },
  },
}
const PRIMER_ALT: Record<ThemeId, Record<HookKey, Bi>> = {
  spark: {
    pos: {
      ko: '처음 마주치는 순간 뭔가 자연스럽게 통하는 기운이 흐르는 거 있잖아요. 굳이 말을 많이 안 해도 분위기가 척척 맞고, 처음 연락 주고받을 때부터 자꾸 웃음이 나와요. 충분히 좋은 사람이라는 느낌이 빠르게 생기더라고요.',
      en: 'There\'s something that just flows between you the moment you meet. The mood clicks without much talking, and even those first messages back and forth make you smile. That sense of "this is a good person" lands fast.',
    },
    neg: {
      ko: '처음엔 분명 이끌리는 무언가가 있는데, 시간이 흐르면서 그 감정이 오락가락 하는 쪽이에요. 초반의 그 반짝임이 오래가지 못하고, 자꾸 "우리 정말 잘 맞나?" 하는 생각이 들어요. 다만 그런 의심 덕분에 더 신경 써서 상대를 보게 되는 건 장점이라고 할 수 있죠.',
      en: 'You feel something pulling you together at first, but as time goes on, that feeling ebbs and flows. The initial glow doesn\'t stick around, and you keep catching yourself wondering "are we really right for each other?" On the flip side, that questioning can push you both to pay closer attention and really understand each other.',
    },
    mid: {
      ko: '첫 만남에서 분명히 뭔가가 반겨주는 느낌이 들긴 한데, 그게 진짜 설렘인지 아니면 호기심인지는 지켜봐야 할 것 같아요. 한쪽은 빠르게 끌려 들어갈 수 있지만 다른 쪽은 조금 멀리서 천천히 보는 스타일이라, 이 간격을 어떻게 줄여나갈지가 가장 중요한 지점인 거예요. 세월이 지나면서 천천히 익어가는 당김이 두 사람의 진짜 면모일 수 있어요.',
      en: "You definitely feel something welcoming when you first meet, but whether it's real chemistry or just curiosity—you'll find out as you go. One of you might dive in quickly while the other prefers to observe from a little distance, and learning to bridge that gap matters most. The connection that ripens slowly over time might turn out to be the truest thing between you.",
    },
  },
  sex: {
    pos: {
      ko: '둘의 신체와 기분이 따로 애써야 할 필요 없이 자연스레 맞춰지는 편이에요. 가까워지는 순간의 호흡이 저절로 일치하고, 손이 닿는 것만으로도 마음이 편하게 풀려요. 머리로 생각하기 전에 몸과 분위기가 먼저 통하는, 말보다는 기운으로 가까워지는 관계라고 할 수 있죠.',
      en: "Your bodies and your moods tend to sync up naturally without any real strain. When you're close, your breathing settles into the same rhythm, and just being touched puts you both at ease. The pull is something your bodies know before your mind catches up—you come together more through presence than through words.",
    },
    neg: {
      ko: '두 사람의 신체 속도와 감정의 높낮이가 조금씩 맞지 않는 편이에요. 밤이 되면 한쪽이 손을 내밀지만 다른 쪽은 피로로 가득 차 있거나, 분위기를 만드는 방식 자체가 달라서 가까워질 타이밍이 자주 어긋나곤 해요. 이런 속도의 불일치가 쌓여가면 서로한테 은근한 서운함이 자리 잡을 수 있으니, 미리 마음을 터놓고 얘기해 두는 것이 중요해요.',
      en: "The pace of your physical connection and emotional temperature tend to be just slightly off from each other. One partner reaches for closeness at night while the other is depleted, or you each approach intimacy in different ways—so those moments often don't quite align. When this mismatch builds up over time, it can leave a quiet hurt between you, so talking openly about it early really matters.",
    },
    mid: {
      ko: '침대에서 둘의 호흡과 온도가 어떨까 하는 건데, 날마다 다르게 느껴질 거예요. 참 잘 맞는 밤도 있고, 살짝 어색한 밤도 있겠죠—그런데 사실 그게 가장 자연스러운 거거든요. 리듬이 다른 두 사람이 한자리에 누워 만나면서, 때론 포근하게, 때론 조심스럽게 리듬을 맞춰나가는 것 자체가 둘의 진정한 케미라고 봐요.',
      en: "You'll wonder how your closeness feels night to night—and it probably shifts with your mood. Sometimes it flows easy and warm, other times it needs a little more care—and that's totally how it should be. When two people with different rhythms share a bed, the way you learn to find warmth between you—sometimes naturally, sometimes with a gentle touch—that's where your real chemistry lives.",
    },
  },
  talk: {
    pos: {
      ko: '농담과 생각, 말의 톤이 술술 통하는 관계예요. 설명하지 않아도 상대가 의도를 빠르게 알아차리고, 카톡도 빠르게 오가는 리듬 좋은 대화가 자연스럽게 흘러가죠. 공통된 코드의 농담이 매번 먹히고, 같은 장면에서 다시 한 번 웃을 수 있는 공유된 언어가 자꾸만 쌓여가요.',
      en: 'Your jokes, thoughts, and the way you express them just flow together. The other person catches what you mean without explanation, and your texts come and go with an easy rhythm. Jokes you both get land every time, and you keep building a shared language—inside references and moments that make you smile over and over.',
    },
    neg: {
      ko: '대화가 자주 엇나가는 쌍이에요. 한쪽이 뭔가를 꺼낼 때 다른 쪽이 예상 밖의 방식으로 받아들이거나, 같은 얘기도 서로 완전히 다르게 읽어내곤 하죠. 표현 방식과 말투 결이 달라서 좋은 마음도 중간중간 뭔가 닿지 않는 부분이 있더라고요.',
      en: "Your conversations tend to slip past each other pretty often. When one person brings something up, the other might interpret it in a completely different direction, and you can end up reading the same words entirely differently. Your ways of expressing yourselves just don't quite match, so even with good intentions, something gets lost in the translation.",
    },
    mid: {
      ko: '둘이 나누는 대화는 재밌는데, 항상 매끄러운 건 아니에요. 누군가 뭔가를 꺼낼 땐 적절하게 받아주다가, 자세한 얘길 나누다 보면 뭔가 엇나가는 부분이 있거든요. 그 작은 틈이 처음엔 답답할 수도 있지만, 오히려 둘을 더 자세히 알아가게 하는 기회가 되기도 해요.',
      en: "Your conversations can be genuinely good, just not always seamless. Things click sometimes, then you'll hit a moment where you're working around each other—it happens when you dig deeper into topics. That small gap can feel frustrating at first, but it often becomes the very thing that helps you know each other better as you go.",
    },
  },
  love: {
    pos: {
      ko: '두 사람이 사랑을 주고받는 방식이 거의 같아서, 넘어야 할 벽이 별로 없는 편이에요. 손을 잡으려는 순간이, 말을 건네려는 마음이 자연스럽게 만나고, 상대가 무엇을 원하는지 굳이 묻지 않아도 알게 되죠. 그래서 부드럽고 깊은 연결감이 자연스레 흐르는 사이예요.',
      en: "The way you two give and receive affection is so alike there's barely a wall to climb. The moment one reaches out—with a hand, with words—it meets something natural on the other side. You know what the other needs without having to ask, and that ease creates a warm, deep current between you that just flows.",
    },
    neg: {
      ko: '사랑을 드러내는 방식이 둘 다 다르다 보니, 실제로 받고 있는 감정을 놓치곤 해요. 한 사람은 자주 안고 말하며 사랑을 확인받고 싶어하는데, 다른 한 사람은 그 정도로는 충분하지 않다 싶거든요. 그럼 자꾸 "정말 날 사랑하나?" 같은 의문이 떠올라서, 서로에게 작은 상처를 남기기 쉬운 조합이에요.',
      en: 'The way you each show love is so different that affection can slip past unnoticed. One of you may need frequent reassurance through words and touch to feel truly valued, while the other expresses care in a quieter, less effusive way. So questions like "do they actually love me?" can bubble up and linger, creating small wounds that accumulate over time.',
    },
    mid: {
      ko: '사랑을 나타내는 언어가 서로 조금씩 달라서, 맞춰가는 과정에서 배우게 되는 사이예요. 한 쪽이 열정적으로 표현할 때 다른 쪽은 침착한 신뢰로 응하고, 그렇게 다르지만 만나는 지점들이 있거든요. 처음엔 "어? 이건 다르네?" 할 수도 있지만, 시간이 지나면 서로의 방식을 받아들이면서 더 단단해지는 게 보여요.',
      en: 'You express love in somewhat different dialects, which means you\'re always learning how to reach each other. When one shows up with intensity, the other brings steady trust, and somehow you still find places where you meet. It might feel like a gap at first—"oh, we do this differently"—but as time goes on, accepting each other\'s language actually becomes what makes you stronger together.',
    },
  },
  friction: {
    pos: {
      ko: '신기할 정도로 둘이 충돌하는 일이 별로 없어요. 서로의 성향을 이해하고 있거나, 아니면 그냥 맞는 부분이 많아서 큰 싸움까진 잘 안 가는 거죠. 사소한 불평은 있을 수 있지만, 그걸 나누고도 자연스럽게 흘러가는 편안함이 있는 사이예요.',
      en: "It's almost uncanny how rarely you two find yourselves in actual conflict. Whether you just understand each other's wiring or there's enough common ground, the big clashes just don't tend to happen. You may swap small frustrations now and then, but there's a comfort to how naturally you move past them and keep going.",
    },
    neg: {
      ko: '둘의 기질이 만나는 자리마다 자꾸 불이 난다고 봐도 될 정도로, 자주 부딪히는 편이에요. 자존심 때문에, 리더십을 두고, 근본적인 가치관이 다르다 보니 의견이 자주 팽팽해지죠. 그래도 미리 알고 있다면, 같은 이유로 또 싸우지 않도록 조심할 수 있으니까 도움이 돼요.',
      en: 'Wherever your temperaments meet, sparks tend to fly—you clash pretty regularly. Pride gets involved, questions of who leads things come up, and your fundamental values can make it hard to agree. Knowing this ahead of time helps though—at least you can watch for the same pressure points and avoid running the same conflict twice.',
    },
    mid: {
      ko: '완벽하게 어울리진 않아서, 의견을 나눌 때 자주 이견이 생겨요. 근데 그게 누가 틀렸다는 게 아니라, 같은 상황을 다른 방식으로 본다는 뜻일 수 있거든요. 말을 나누다 보면 오히려 함께 더 단단해지기도 하는 거죠. 마찰이 완전히 사라지진 않겠지만, 그 과정에서 서로를 훨씬 잘 알게 돼요.',
      en: "You're not a perfect fit, so disagreements come up when you're working things out together. But that rarely means someone's wrong—usually you're just seeing the same thing from opposing angles. Working through those moments can actually make you both stronger. The friction won't vanish entirely, but the understanding you build along the way runs deep.",
    },
  },
  life: {
    pos: {
      ko: '함께 있는 것만으로도 자연스럽게 편해지는 사이예요. 말을 많이 주고받지 않아도 공기가 통하고, 침묵도 어색하지 않으며, 옆에서 각자 하는 일을 봐도 괜찮은 그런 거죠. 긴 시간을 카톡으로 떨어져 있어도, 다시 만나면 금세 그 편안함이 돌아와요.',
      en: "Just being in the same space settles you both right down. You don't need much conversation—there's an ease to silence, a comfort in each doing your own thing nearby. Even when you're texting sporadically across time, that ease slips right back in the moment you're together again.",
    },
    neg: {
      ko: '함께 있을 때 자꾸만 속도가 안 맞는 느낌이 생겨요. 한 사람이 쉬고 싶을 땐 다른 사람이 움직이고 싶어 하는 식으로, 같은 공간에서도 따로 놀곤 하더라고요. 영화를 봐도 대화를 나눠도 뭔가 겹치는 부분이 없어서, 편하게 시간을 보내기가 쉽지 않아요.',
      en: "When you're together, rhythms keep slipping out of step. One of you wants to rest while the other's ready to move, so even in the same room, you're often on separate tracks. Whether watching a film or talking, there's not quite an overlap—it's hard to simply relax and exist in the same moment.",
    },
    mid: {
      ko: '함께 있는 시간이 나쁘진 않은데, 저절로 편함이 생기는 건 아닌 거 같아요. 처음엔 모르던 작은 차이들이 자꾸 눈에 띄고, 그걸 맞춰가면서 조금씩 편해지는 과정이 있는 거죠. 시간이 지나면서 서로의 리듬을 이해하고 나면, 침묵도 괜찮고 각자 하는 것도 자연스러워질 수 있어요.',
      en: "You're fine when you're together, though it doesn't click effortlessly right away. Small differences you didn't notice at first start to show up, and you'll find yourselves slowly tuning into each other. As time passes and you both understand the other's pace a bit better, silence stops feeling strange and doing your own thing can feel pretty natural.",
    },
  },
  money: {
    pos: {
      ko: '돈을 바라보는 태도에서 둘이 같은 결을 가지고 있어서, 통장 문제로 싸울 일은 거의 없을 거 같아요. 큰 구매 앞에서도 의견이 잘 맞고, 저금할 때나 쓸 때나 리듬이 비슷해서 자연스럽게 흘러가죠. 돈 관리에 대한 신뢰가 있으면 다른 것도 훨씬 수월해진다는 걸 봐서, 두 사람의 앞날이 꽤 든든할 것 같아요.',
      en: "You two share a similar approach to money and spending, so financial tensions are likely to stay off the table. Major purchases feel aligned, and whether you're saving or spending, your paces tend to match—it just flows. Trust around money often spreads to everything else, so that kind of alignment suggests a pretty solid foundation for what comes next.",
    },
    neg: {
      ko: '돈 쓰는 방식에 대해 자주 의견이 부딪혀요. 한쪽은 쓸 때는 아낌없이 쓰고 싶어 하고, 다른 쪽은 차근차근 모으는 걸 더 중요하게 생각하는 식이거든요. 그래서 카톡으로 "이거 사도 돼?" 같은 작은 물음이 자꾸 쌓이고, 월급날이나 보너스 쓰임새 가지고도 자주 마음이 엇갈려요.',
      en: 'How to spend and save tends to create friction between you. One of you might spend freely when you want something, while the other prioritizes building up a cushion, and that gap shows up constantly—the running negotiations over small purchases, different ideas about windfalls, that tension of pulling in opposite directions with money.',
    },
    mid: {
      ko: '돈을 대하는 태도가 완전히 같지는 않아서, 처음엔 "어? 이 부분 다르네" 싶을 수 있어요. 한쪽이 너그럽게 쓰면 다른 쪽은 신중하게 생각하는 식으로, 약간의 마찰이 생길 수 있죠. 그런데 이런 차이가 오히려 서로를 잘 잡아줄 수 있어서, 대화하면서 함께 현명해질 기회도 많은 사이예요.',
      en: "Your attitudes toward money aren't quite the same, so you might notice the gap pretty quickly. One of you tends toward generous spending while the other's more cautious, and there's real friction in that—but it often works both ways. These differences can actually keep you both grounded, and talking them through often leads to smarter choices together.",
    },
  },
  future: {
    pos: {
      ko: '처음의 반짝함은 자연스럽게 식어가겠지만, 그 아래 깔린 든든함이 오래가는 쪽이에요. 둘이 시간을 함께하면서 피부로 느껴지는 신뢰감이 차곡차곡 쌓여가고, 작은 차이들도 서로를 더 잘 이해하는 발판이 되어요. 급하지 않아도, 천천히 깊어져 가는 관계라 계절이 지날수록 편해지고, 곁에 있는 것만으로도 든든한 사람이 될 거 같아요.',
      en: 'The initial spark will naturally fade, but what remains underneath is built to endure. As you spend time together, trust settles in slowly and steadily, and even your differences become a way of understanding each other more completely. Not rushed, but deepening season by season—the kind of bond where being together just gets easier and more solid with time.',
    },
    neg: {
      ko: '지금은 분명히 끌리지만, 시간이 지나면서 속도감이 자꾸 어긋날 가능성이 있어요. 한 사람이 앞으로 나아가려 할 때 다른 쪽은 신중하게 멈춰 생각하는 식으로, 그 차이가 자꾸 답답함으로 남을 수 있죠. 초반의 설렘이 식었을 때 "우리 정말 함께 가는 걸까?" 하는 의문이 불쑥 나타날 수 있는 조합이에요.',
      en: "The pull is real now, but over time your rhythms risk drifting apart. One of you pushing forward while the other pauses to think can wear into frustration fast. Once that initial glow fades, you might find yourselves asking whether you're really heading the same direction—and that doubt can be hard to shake.",
    },
    mid: {
      ko: '처음엔 괜찮아 보이지만, 시간이 쌓이면서 자꾸 작은 불일치들이 생겨요. 같은 방향으로 나아가려면 틈틈이 맞춰주는 손길이 필요한 타입이라, 관심과 노력 여부에 따라 결이 확 달라질 거 같아요. 둘 다 노력하면 그 과정 속에서 훨씬 깊이 이해하게 될 테고, 따로따로 가면 슬쩍 흩어질 수도 있는 관계랍니다.',
      en: "Things look good at first, but small misalignments tend to creep in as time passes. You'll need regular check-ins to stay on the same page, so how much effort you both invest really shapes what happens. Put in the work together and you'll understand each other far more deeply—step back and this connection could gently drift apart.",
    },
  },
}
const VERDICT_EXP_ALT: Record<string, Bi[]> = {
  aligned: [
    {
      ko: '두 사람의 기운이 같은 길로 흐르고 있어요. 둘 다 같은 방향을 향하니까, 끌림이 한쪽 일방이 아니라 서로에게서 동시에 울려 나오죠. 그래서 대화와 마음이 특별히 노력하지 않아도 부드럽게 흘러가요. 처음부터 리듬이 맞춘 음악처럼요.',
      en: "Your energies flow toward the same place. Both of you facing the same direction means the pull isn't one person's dream—it rings out from both at once. So words and hearts move without strain, the way music already knows its beat.",
    },
    {
      ko: '둘의 별과 사주가 가리키는 방향이 한데 모여 있어요. 끌림이 양쪽에서 동시에 올라오니까, 억지스럽지 않아도 자연스럽게 가까워지는 사이예요. 대화도 감정도 굳이 신경 쓰지 않아도 술술 풀려나가죠. 마치 서로를 맞추고 있었다는 듯이요.',
      en: 'What your charts point to is the same place. The pull rises from both sides at once, so you drift close without straining. Conversation flows, feeling settles—as if you were always meant to fit this way.',
    },
  ],
  tension: [
    {
      ko: '둘 다 쉽게 물러나지 않는 성질을 갖고 있어요. 그래서 함께 있으면 팽팽한 기운이 맴돌고, 때론 불꽃이 튀곤 하죠. 하지만 그 마찰과 충돌 속에서 둘 다 더 견고해지고 단단해져 나가요. 거친 두 돌이 부딪치며 자연스레 반질반질해지듯이요.',
      en: 'Neither of you gives way easily. So together you feel that tautness in the air, and sparks do fly. But in that clash, you both forge yourselves harder, more solid. Two rough stones grinding smooth.',
    },
    {
      ko: '두 사람 모두 고집이 있어서 쉽게 양보하지 않아요. 그 때문에 만날 때마다 어느 정도의 긴장이 생기고, 때때로 불이 튀기도 하죠. 그런데 그 팽팽함이 역설적으로 둘을 더욱 강하고 깊게 만들어줘요. 마치 불에 달궈지는 쇠처럼 더 단련되는 거죠.',
      en: "You're both stubborn, neither quick to give ground. That means some tension builds between you, and yes, fire sparks sometimes. But that very tautness shapes you both stronger, forged deeper. Like steel tempered in flame.",
    },
  ],
  mixed: [
    {
      ko: '한쪽으로는 자석처럼 끌려 들어오면서도, 다른 한쪽으로는 튕겨 나가려는 에너지가 느껴져요. 어느 순간엔 말 없어도 통하는데, 다음 순간엔 묘하게 비틀어지곤 하죠. 그래서 두 사람은 한 가지 표정만으로는 설명이 안 되는 복잡한 사이예요.',
      en: "One pole pulls you in like magnets, another pushes you back. In one moment you understand without words, the next there's a strange twist. So you two can't be summed up in a single face—there are many.",
    },
    {
      ko: '한쪽에선 강한 끌림이 있고 다른 한쪽에선 저항이 생겨요. 통하는 지점이 분명한가 하면, 불현듯 박자가 엇나가기도 하죠. 한 사이에 여러 결이 섞여 있는 거라, 밋밋하지 않고 색깔이 다양한 사이가 되는 거예요.',
      en: "One direction has a strong draw, another has friction. You click in clear moments, then suddenly slip out of step. That mix of different grains makes you anything but flat—you're full of different hues.",
    },
  ],
  neutral: [
    {
      ko: '두 사람의 차트가 한쪽으로 기울지 않고 담백하게 섞여 있어요. 번개 같은 강렬함은 없지만, 그만큼 편안한 쪽이죠. 마치 잔잔하고 깊은 호수처럼 드라마 없이 오래 곁에 머물 수 있는 그런 사이예요.',
      en: 'Your charts blend evenly, without tilt toward one side. No lightning strike, but steady ease instead. Like a still, deep lake—the kind you can stay beside for long without fuss.',
    },
    {
      ko: '두 사람의 에너지가 고르게 섞이면서도 어느 한쪽으로 치우치지 않아요. 번쩍이는 불꽃 같은 시작은 아니지만, 잔잔하면서도 튼튼한 호흡으로 오랜 시간을 함께할 수 있는 사이예요. 큰 흔들림 없이 편안하게 길을 걸어가는 스타일이죠.',
      en: 'Your energies blend in balance, without tipping one way. Not a spark that flares at first sight, but steady breath that carries you through time together. The kind of path you walk easy, without great shaking.',
    },
  ],
}
const INTRO_ALT: Bi[] = [
  {
    ko: '이 보고서는 당신들 두 사람을 담은 사주(태어난 날의 네 기둥)와 별자리를 한 화면에 올려놓고 읽어보는 거예요. 동쪽의 해석과 서쪽의 해석이 같은 이야기를 가리킬 때, 거기가 바로 두 사람 사이에서 가장 뚜렷하게 드러나는 부분이 되는 거죠. 낯선 단어들은 옆에 풀이를 붙여 두었고, 더 알고 싶으면 아래의 용어 설명을 다시 살펴봐도 좋습니다.',
    en: "This report puts your two Saju—the four pillars held in each birthday—and your star signs side by side and reads them as one. Where the Eastern and Western readings tell the same tale, that's where you two show up most clearly. Unfamiliar words get a plain explanation right there, and if you want to dig deeper, the glossary below is always open to you.",
  },
  {
    ko: '당신들 둘의 사주(생일에 담긴 네 기둥이 만드는 이야기)와 별의 위치를 한곳에 펼쳐서 살펴보는 거예요. 동양의 해석과 서양의 해석이 동시에 같은 걸 가리킬 때, 그게 바로 두 사람의 연결고리 중 가장 선명한 지점이에요. 어려운 말이 나오면 곁에 쉬운 설명을 붙여 뒀고, 궁금하면 아래의 용어집에서 다시 찾아볼 수 있어요.',
    en: "This reads your two Saju—the story made in the four pillars of your birth—and your star charts laid open in one place. When Eastern reading and Western reading point to the same thing, that's the clearest bright spot in how you two connect. Hard words have plain translations tucked beside them, and you can look it up again below in the glossary any time.",
  },
]
const CLOSING_ALT: Bi[] = [
  {
    ko: "지금까지 읽은 건 두 사람을 조금 멀리서 본 밑그림이에요. 이 사이가 구체적으로 언제 어떤 방식으로 피어나는지, 어느 구간에서 가장 또렷한지 같은 '언제'와 '어떻게'는 상담사와 함께할 때 훨씬 깊이 들여다볼 수 있어요. 뭔가 마음이 끌린다면, 그 안쪽의 더 자세한 이야기로 한 발 들어가 봐도 좋습니다.",
    en: "What you've just read is a rough sketch, seen from a little distance. The when and how—when this will actually bloom, how it shows up, which moments shine brightest—that's where a counselor takes you deeper. If something here has tugged at you, stepping into that more detailed story is worth doing.",
  },
  {
    ko: "여기까지는 두 사람을 멀리서 바라본 윤곽일 뿐이에요. 이 사이가 실제로 피어나는 구체적인 순간들, 어디서 가장 강렬해지는지 같은 '어떻게'와 '언제'는 상담사가 훨씬 섬세하게 짚어 드릴 수 있어요. 마음이 조금이라도 움직인다면, 그 깊은 내용 속으로 한 걸음 더 나아가 보는 것도 좋은 선택이 될 거예요.",
    en: 'Up to here is just the outline, seen from far away. A counselor can trace the how and when far more gently—the real moments where this blooms, where it burns brightest. If your heart stirred even a little, taking another step into that deeper story is a choice worth making.',
  },
]

// 신호 본문 구조 변형(틀 다름) — 원본과 함께 커플 해시로 결정적 선택(뿌리2: 단일 수사틀 깨기).
const ASPECT_PAIR_ALT: Record<string, Bi> = {
  'Moon|Sun': {
    ko: '한쪽이 잔잔히 내려와 상대의 정체성을 안으로 스며들게 해요. 마음이 태양을 비추면, 당신의 가장 단단한 자아가 그 감정에 물들고, 다시 상대의 심장을 따뜻하게 만들고. 이렇게 순환하는 온기 속에서 둘은 있는 그대로 서로를 인식하기 시작해요.',
    en: "One's flowing feelings seep into the core of who the other truly is. When emotion touches the sun of your self, your steadiest identity gets colored by it, and then warms the other's heart in return. In this circulating warmth, you two begin to recognize each other exactly as you are.",
  },
  'Mars|Venus': {
    ko: '당신이 원하는 걸 향해 나아가는 그 기세가, 상대가 당신을 예쁘다고 느끼는 취향과 맞닿는 자리에요. 밀어붙이는 힘과 끌어당기는 매력이 같은 지점에서 서로를 더 크게 만들어요. 그래서 둘 사이엔 단순한 호감을 넘어 서로를 원하는 깊이가 흐르는 거죠.',
    en: 'Your drive toward what you want meets what makes them find you lovely. The push and the pull meet at one spot and make each other bigger. So between you flows something deeper than simple fondness—a real wanting of each other.',
  },
  'Moon|Venus': {
    ko: '당신의 마음이 일렁일 때, 상대는 그 감정을 사랑의 언어로 응답해요. 내가 무언가에 잠깐 흔들리면 당신은 그걸 부드럽게 감싸 안으려 하고, 내 심정이 전해질 때마다 당신은 정성스러운 손길로 그 마음을 다뤄요. 그래서 둘의 감정과 애정이 자연스럽게 빗변하는 사이가 되는 거예요.',
    en: 'When your mood shifts, they answer it in the language of care. When you flutter, they soften around it; when your feeling reaches them, they hold it with quiet grace. So emotion and tenderness weave together between you as one breath.',
  },
  'Mars|Moon': {
    ko: '당신의 추진력이 상대의 감정으로 부드러워져요. 밀고 나가려는 기세가 상대의 섬세한 심리 리듬과 마주칠 때, 거친 힘이 따뜻함으로 변하고, 평온함 역시 설렘 속에 깨어나요. 둘이 만나면서 각자의 결이 서로를 완성하는 거죠.',
    en: 'Your forward push softens into their feelings. When your drive hits their delicate emotional rhythm, rawness turns warm, and their calm stirs awake. As you two meet, each of you finishes what the other started.',
  },
  'Mercury|Mercury': {
    ko: '당신들이 마주 앉아 말을 주고받을 때의 그 호흡이 여기 사는 거예요. 같은 말을 해도 듣는 결이 다를 수 있지만, 더 자주 통하고 더 쉽게 닿는 곳이 생기고, 그 자리에서 둘의 생각이 자꾸 한군데 모여요. 하나의 생각에서 다른 생각으로 자연스럽게 흐르는 대화의 물결이 흘러요.',
    en: 'This is where the rhythm of you two talking across from each other lives. The same words might land differently, but more often you meet and easier passages open up — a place where both your minds keep gathering. Thoughts flow naturally from one to the other in a current of conversation.',
  },
  'Moon|Moon': {
    ko: '당신의 마음이 흔들릴 때, 상대는 그 떨림을 미리 맞아줘요. 말이 필요 없이 분위기가 통하고, 눈빛이 닿는 것만으로도 "지금 저런 기분이구나" 하고 알아차려요. 마치 한 사람의 파도가 다른 사람의 파도와 겹쳐서 더 크게 일어나듯, 둘의 감정이 동시에 울렁거리고 함께 가라앉아요.',
    en: "When your heart trembles, they meet the tremor before it's spoken. Feeling translates wordlessly; a glance reads the mood instantly. Like one wave overlapping another and rising higher, your emotions swell and settle in sync, moving as one tide.",
  },
  'Venus|Venus': {
    ko: '당신이 무엇에 끌리는지, 어떤 순간에 가슴 뭉클해지는지를 상대가 고스란히 닮아가요. 사랑하는 방식이 같아서, 마주보고 앉으면 서로가 "그래, 넌 나랑 똑같이 느껴" 하고 인정받는 기분이 들어요. 어떻게 다정함을 주고받을지 둘이 같은 음정으로 노래하듯, 애정의 언어가 절로 통해요.',
    en: 'They mirror what draws you in, what makes your heart catch. Your loves speak the same dialect, so sitting across from each other feels like being recognized: "yes, you feel like I do." How you give and take tenderness flows in the same key — affection needs no translation.',
  },
  'Sun|Sun': {
    ko: '당신이 비추는 빛과 상대가 비추는 빛이 같은 곳에 모여, 서로를 더 환하게 비춰줘요. 각자의 존재감이 정면으로 부딪혀서 더 뚜렷해지고, 세상을 바라보는 관점도 자연스럽게 겹쳐나가요. 두 빛이 한곳에서 만날 때, 관계 전체의 색깔이 그 기조 위에서 그려져요.',
    en: "Your light and their light converge in one place, illuminating each other more brightly. When your identities meet head-on, you both grow sharper, and how you see the world begins to overlap. Where the two lights meet, the whole relationship's color gets painted over that shared tone.",
  },
  'Mars|Mars': {
    ko: "둘이 원하는 걸 향해 달릴 때면, 같은 리듬으로 동시에 움직여요. 가속도 페달을 함께 밟으면서 속도와 열기가 한 점으로 수렴해요(점성에선 '화성'끼리). 그 박자가 빠르고 뜨거울수록, 관계의 추진력도 함께 커져요.",
    en: "When you both dash toward what you want, you move in the same tempo at the same time. You press the accelerator together, and your speed and heat converge into one force (in astrology, Mars to Mars). The faster and hotter that rhythm, the more the relationship's momentum swells with it.",
  },
  'Moon|Saturn': {
    ko: '한 사람의 마음이 파도처럼 오르내릴 때, 다른 한 사람이 그것을 팔로 감싸 안아요. 감정의 무게를 받아내고 다시 일어설 수 있게 떠받치면서(점성에선 달과 토성), 둘 사이에 책임과 따뜻함이 함께 자라나요. 떠다니는 마음이 어디에 착지하는가가 관계의 깊이를 정한단 거죠.',
    en: "As one person's heart rises and falls like waves, the other wraps an arm around it. By catching the weight of those feelings and steadying you both again (in astrology, Moon and Saturn), warmth and responsibility grow together between you. Where that drifting heart finds ground decides how deep the bond can run.",
  },
  'Saturn|Venus': {
    ko: '손을 맞잡을 때, 한 사람은 그 손을 놓지 않으려는 진중한 결심(토성)을 담고, 다른 한 사람은 그 손을 쥐는 부드러움(금성)을 전해요. 무게와 따뜻함이 동시에 흐르면서 둘은 사랑할 때 진지하면서도 자연스러워요. 책임감 있는 애정이라는 게, 바로 이 자리에서 만들어지죠.',
    en: "When you hold hands, one of you pours a steady resolve into it (Saturn), while the other sends softness through the touch (Venus). Weight and warmth flow at once, making your love both sincere and easy. That's what it means to love with responsibility — it's born right here.",
  },
  'Mars|Saturn': {
    ko: '한 사람이 한 발 내딛는 순간, 다른 사람이 그 발을 살펴요. 한쪽은 앞으로 나아가려는 열정(화성)을 가지고 있고, 다른 쪽은 그 길이 단단한지 확인하려는 신중함(토성)을 가져요. 이 둘의 속도와 확인의 반복 속에서 둘은 함께 가는 법을 배우게 돼요.',
    en: 'The moment one of you takes a step forward, the other examines that foothold. One carries the passion to move ahead (Mars); the other carries the caution to make sure the ground is solid (Saturn). In this rhythm of pace and checking, checking and pace, you learn how to walk together.',
  },
  'Moon|Pluto': {
    ko: '말없이 손을 마주쳤을 때, 무언가 깊은 게 깨어나요. 일상의 감정이 밑바닥에서 솟아올라와(명왕성), 둘의 마음이 더 이상 표면에 머물 수 없게 돼요. 잔잔한 표정 뒤에 소용돌이 같은 뭔가가 흐르고 있다는 걸, 서로 감지하게 되는 거죠.',
    en: 'The moment you hold hands in silence, something deep stirs awake. Everyday feelings well up from the depths (Pluto), and your hearts can no longer stay on the surface. Behind calm faces, a whirlpool-like current runs between you both, and you feel it.',
  },
  'Pluto|Venus': {
    ko: '좋아하는 마음이 표정에 드러날 수 없을 만큼 진할 때가 있어요. 부드러운 끌림(금성) 어딘가 깊이 상대의 강렬한 존재가 스며들어, 가볍던 감정이 무거운 집착처럼 변해가는 거죠(명왕성). 둘 사이의 끌림이 얼마나 밑까지 닿는지, 그게 둘을 힘들게도 하고 강하게도 만들어요.',
    en: "Sometimes liking someone runs so deep it can't show on your face. The softer attraction (Venus) meets the other's deep, relentless intensity somewhere within, and light affection turns into something heavier, more consuming (Pluto). How far that pull reaches into each other's core both challenges and strengthens you both.",
  },
  'Mars|Pluto': {
    ko: '추진력 있게 다가가려는 한 사람의 움직임이 다른 사람의 고정된 강렬함과 부딪혀요. 그 충돌에서 가볍던 끌림이 사라지고, 둘은 누구도 되돌릴 수 없는 뭔가가 시작됐다는 걸 알게 돼요. 욕망(화성)과 깊이(명왕성)가 한 점에서 만날 때, 표면적인 감정은 더는 설 자리가 없어요.',
    en: "One person's push forward crashes against the other's immovable, deep force. In that collision, surface attraction falls away, and you both recognize that something irreversible has begun. When desire (Mars) and depth (Pluto) meet at a single point, there's no more room for shallow feelings to stand.",
  },
  'Uranus|Venus': {
    ko: '예측 불가능하게 한 번씩 심장을 설레게 하는 사람과 함께할 때, 끌림이 늘 다른 모양으로 나타나요. 어제의 끌림과 오늘의 끌림이 다르고, 다음 순간 또 다른 색으로 물들어요(점성에선 천왕성과 금성). 이 관계는 절대 같은 온도에 머물지 않는, 자꾸 변해 가는 매력이 있어요.',
    en: "When you're with someone who surprises your heart in unpredictable ways, attraction keeps showing up in different shapes. Yesterday's pull is not today's; then it shifts again to a new hue (in astrology, Uranus and Venus). This relationship never settles into one temperature. Its charm lies in constantly shifting, always renewing.",
  },
  'Moon|Uranus': {
    ko: '차분하던 마음이 갑자기 흔들리는 순간이 있어요. 한쪽이 예상 밖의 말이나 움직임을 던질 때마다, 다른 한쪽의 감정이 새로 깨어나거든요. 익숙한 것과 낯선 것이 한 호흡 안에서 섞이면서(점성에선 달과 천왕성), 둘의 마음은 고요함과 설렘 사이를 계속 오고 가요.',
    en: "There are moments when a settled heart suddenly shakes. Each time one throws something unexpected into words or gesture, the other's feelings wake anew. The familiar and the strange mingle in a single breath (in astrology, Moon and Uranus), so your hearts keep traveling between stillness and flutter.",
  },
  'Neptune|Venus': {
    ko: '그 사람을 볼 때면 현실보다 더 아름답게 보여요. 상대의 매력이 마음 가장 깊은 자리를 자꾸 건드리면서(점성에선 해왕성과 금성), 둘은 서로를 꿈처럼 아끼게 돼요. 이건 따뜻하지만 동시에 위험한 사랑이에요. 이상과 현실이 만나는 그 가느다란 선 위에서, 둘의 감정이 춤을 춘단 거죠.',
    en: "That person shines more beautiful than reality when you see them. Their charm keeps reaching for the deepest place in your heart (in astrology, Neptune and Venus), so you cherish each other like a dream. It's a love that's warm but also precarious. On that thin line where ideal and real meet, your feelings dance.",
  },
  'Jupiter|Sun': {
    ko: '한 사람이 "가도 돼"라고 손을 놨을 때, 다른 사람이 비로소 자기를 드러내요. 그게 맞는 호흡이에요. 한쪽의 믿음이 다른 쪽을 살리고, 그 살아난 모습이 또다시 처음 사람을 환하게 만들지요. 이건 마치 흐린 거울이 햇빛을 받아 훅 반짝이는 것 같은 관계예요.',
    en: "When one of you lets go and says \"you're okay,\" the other finally shows up. That's where you two find your rhythm. One person's trust brings the other alive, and that aliveness turns back and lights the first person up. It's like a clouded mirror catching sunlight and suddenly gleaming.",
  },
  'Jupiter|Moon': {
    ko: '하루하루 미묘하게 흔들리는 당신의 감정을 한 사람이 품처럼 감싸 주려고 해요. 그 너그러움이 마음에 닿으면 날씨처럼 변하던 기분이 한 호흡 깊어져요. 누군가의 무한한 품이 있으면, 불안도 어디론가 가라앉는 법이죠.',
    en: "One of you wraps an arm around the subtle ups and downs of the other's day. When that generosity lands, a restless mood settles into something deeper. With someone's endless embrace, even worry finds somewhere to sink.",
  },
  'Ascendant|Venus': {
    ko: '첫눈에 끌린다는 건, 당신이 그 사람 앞에서 무심코 풍기는 그 공기였어요. 마음이 좋은 사람은 그 공기를 맡자마자 알아봐요. 자기가 사랑하고 싶은 것이 바로 그거였다고요. 그래서 끌림이 시작되는 거고, 그게 쌓여 관계가 되는 거예요.',
    en: "That pull at first sight? It was the effortless air you give off when you're around them. The one who loves the way you do recognizes it instantly. It's exactly what they wanted to love. That's where the draw starts, and that's how it builds into something real.",
  },
  'Ascendant|Sun': {
    ko: '당신이 들어서는 순간, 상대가 이미 당신의 진짜 속을 봤어요. 입을 뗄 틈도 없이. 그래서 둘은 애초에 가면을 쓸 수가 없어요. 처음부터 벌거벗겨진 상태로 만나는 사이인 거죠. 그건 편함이기도, 때론 피할 수 없는 무게이기도 해요.',
    en: "The moment you walk in, they already see your true self. No time for masks. So neither of you can really hide. You meet bare from the start. That can be freeing, or sometimes it's an inescapable weight.",
  },
  'Ascendant|Ascendant': {
    ko: '거울 앞에 서는 기분이에요. 당신의 리듬, 당신의 쓸쓸함, 당신이 세상에 보이는 그 각도가 그대로 상대에게도 비쳐요. 닮음은 편함을 주기도 하지만, 같은 약점이 동시에 드러나는 자리이기도 합니다.',
    en: 'Like standing before a mirror. Your rhythm, your solitude, the exact angle you show the world — it reflects right back at them. Likeness brings comfort, but it also exposes the same weak spot in both of you at once.',
  },
  'Ascendant|Jupiter': {
    ko: '당신이 들어설 때마다 그 사람의 세상이 살짝 넓어져요. 당신의 존재 자체가 그들에게 "괜찮아, 괜찮아"라고 속삭여 주는 거죠. 물론 그 말이 때론 무책임한 낙관이 될 수도 있겠지만요.',
    en: 'Each time you show up, their world opens a little wider. Your very presence whispers "it\'s okay, it\'s okay" to them. Though sometimes that gentleness can drift into careless optimism.',
  },
  'Ascendant|Mars': {
    ko: '당신이 나타나자마자 기싸움이 붙는 거 같아요. 서로 눈이 마주치면 누가 먼저 나가나 하는 경쟁심이 피어나요. 둘 다 앞에 서고 싶어서 자꾸 부딪치는 거죠. 그게 생기를 주기도, 답답함을 주기도 해요.',
    en: "The moment you arrive, it's like a standoff. Eyes meet and suddenly you're both vying to lead. You keep colliding because you're both pulling forward. That brings energy, or friction — maybe both.",
  },
  'Ascendant|MC': {
    ko: '당신이 보여주고 싶은 모습과 그들이 세상에서 가고 싶은 길이 같은 방향을 가리켜요. 또는 정 반대로 가고 있어요. 둘이 나란히 걸으면 멋있지만, 어긋나면 "내가 가는 길에 넌 왜 그 방향이니"라는 답답함이 자꾸 생겨요.',
    en: "What you want to show and where they're heading in the world either point the same way — or pull in exact opposite directions. Walking side by side feels right, but when you're misaligned, there's a constant \"why are you going that way\" frustration.",
  },
  'Ascendant|Mercury': {
    ko: '당신의 첫인상은 한 가지인데, 입을 열자마자 다른 사람이 나와요. 당신이 보이는 것과 당신이 말하는 것이 자꾸만 어긋나는 거죠. 그들은 당신을 읽으려 할 때마다 "어? 이 사람 이 사람이 아니네?"라고 갸우뚱합니다.',
    en: 'Your first impression is one thing — then you open your mouth and someone different emerges. What you show and what you say keep missing each other. Every time they try to read you, there\'s that flicker of "wait, you\'re not that person, are you?"',
  },
  'Ascendant|Moon': {
    ko: '겉으로 풍기는 당신과 속으로 느끼는 당신이 어떤 틈도 없이 맞아떨어져요. 아니면 그 틈이 누군가 미세한 불편함을 낳아요. 첫 인상이 따뜻하면 마음도 따뜻해야 하는데, 둘이 조용히 불일치할 때 묘한 어색함이 흘러요.',
    en: "What you show and what you feel fold perfectly into each other — or a small gap creates a subtle discomfort. Your warmth at first glance should match what's inside, but when the two quietly don't align, a peculiar awkwardness slips between you.",
  },
  'Ascendant|Neptune': {
    ko: '둘이 처음 만날 때 한 사람의 실제 모습이 다른 사람의 망원경을 타고 온다. 꿈처럼 부풀려지거나, 상대가 본 것만 남는다는 뜻이다. 그래서 둘 사이 끌림은 이미지 너머를 묻고 싶은 욕망과 그 욕망을 우아하게 거부하는 신비감이 춤을 춘다.',
    en: "When you two first meet, one person's actual face goes through the other's lens — enlarged, dreamlike, sometimes seen only as an image. So the pull between you dances with curiosity trying to reach past the mystery and mystery refusing to let itself be known.",
  },
  'Ascendant|Pluto': {
    ko: '한 사람이 걸어 들어오는 그 순간, 다른 사람은 그 안 깊은 곳을 내려다본다. 첫인상이라는 겉겹을 관통해서 뭔가 본질적인 것을 감지하는 거다. 그래서 둘은 만나자마자 진짜를 마주하는 것 같고, 그 무게감이 둘 사이에 곧장 쌓인다.',
    en: "The moment one person enters, the other sees straight down through what lies beneath. It's like piercing the surface to sense something essential before a word is said. So you two meet something real right away, and that weight settles into the space between you immediately.",
  },
  'Ascendant|Saturn': {
    ko: "둘이 마주할 때 한 쪽의 솔직한 표정이 다른 쪽에게 일종의 무게를 안긴다. 편하게 다가가기보다 '저 사람은 진지할 필요가 있겠군' 하는 조심스러운 마음이 든다. 그 긴장감이 신뢰의 밑바탕이 될 수도 있지만, 때론 처음부터 속이 좁혀지는 기분이 남기도 한다.",
    en: "When you two meet, one person's straightforward manner puts a certain weight on the other. Instead of easy warmth, there's a careful sense that this calls for sincerity. That tension can become the foundation of trust, but it can also leave you feeling quietly guarded from the start.",
  },
  'Ascendant|Uranus': {
    ko: "한 사람이 나타나 다른 사람의 일상에 작은 충격을 건넨다. '아, 이런 사람이 있네' 하고 기존의 틀이 깨지는 경험이다. 그 신선함이 매력이 되기도 하고, 예측 불가능한 부분이 불안을 주기도 하는데, 어느 쪽이든 둘 사이에서 무언가는 자꾸 뒤흔들린다.",
    en: 'One person shows up and jars the other\'s everyday world. You think: "Ah, someone like this exists." It cracks your sense of what\'s normal. That freshness draws you, or the unpredictability unnerves you — either way, something between you keeps getting shaken.',
  },
  'Jupiter|Mars': {
    ko: "한쪽이 '해 봐, 더 크게' 하고 밀어주면 다른 쪽의 불이 확 타올라. 서로를 부추기는 그 흐름이 동력이 되기도, 과도함의 나선에 빠지기도 한다. 둘이 함께할 때 기운이 커지는 건 분명한데, 그 크기를 얼마나 잘 다루느냐가 관계의 갈래를 가르곤 해.",
    en: "When one says 'go bigger' the other ignites. That egging-on becomes fuel — or spins into excess. You two definitely grow when together, but how well you hold that size is what shapes where the relationship goes.",
  },
  'Jupiter|Mercury': {
    ko: '대화할 때 한쪽은 마음을 넓혀주고, 다른 한쪽은 그 열린 공간에 생각을 마구 펼쳐낸다. 너그러운 귀와 끝없는 말이 만나면서 시야가 탁 트이기도 하고, 중심을 잃고 떠내려가기도 해. 대화의 온도가 둘의 진심을 얼마나 담는지에 따라 깊이가 결정돼.',
    en: 'When talking, one opens space and the other spills thoughts into it. A generous ear meeting endless words can break your horizons wide open — or drift you loose. How much truth each carries into those words shapes how deep the connection gets.',
  },
  'Jupiter|Venus': {
    ko: '사랑할 때 한쪽의 너그러움이 다른 쪽의 마음을 부드럽게 감싼다. 넉넉한 포용감과 즐거운 기분이 흐르는데, 떠다니는 듯 가벼운 흐름에 빠질 수도, 진심이 가득한 따스함으로 자리 잡을 수도 있어. 둘이 얼마나 진심으로 마주하는지에 따라 색이 달라진다.',
    en: "When loving, one person's warmth wraps gently around the other. A generous embrace and easy joy flow — though you might drift weightless, or settle into real, heartfelt warmth. The color of this depends on how truly you face each other.",
  },
  'Mars|Mercury': {
    ko: '말을 던지자마자 불이 붙는다. 빠르고 뜨거운 토론이 생각을 날카롭게 갈기도, 한 마디에 상처 주고받기도 한다. 둘이 같은 속도로 움직일 때는 아이디어가 춤을 추듯 나오지만, 맞지 않으면 신경전이 된다. 말의 칼날이 얼마나 날카로운지가 관계를 좌우한다.',
    en: "Words ignite instantly. Fast, heated exchanges can sharpen thinking into something brilliant — or wound with a single remark. When you're moving at the same speed, ideas dance out; misaligned, it turns into combat. How sharp that verbal edge is shapes everything.",
  },
  'Mars|Neptune': {
    ko: '욕망이 꿈을 만나면서 둘은 서로를 더 아름답게 본다. 현실보다 반짝이는 상대의 모습에 끌려들고 싶어 하지만, 바람처럼 잡혀도 손가락 사이로 새어나간다. 충동과 환상의 경계가 흐릿해지는 그곳에서, 둘은 얼마나 깨어 있는지가 중요하다.',
    en: "When drive meets dream, you see each other more luminous than real. You're drawn to that glittering version — but it slips through your fingers like wind. In that blurred space between impulse and fantasy, it matters how awake you both stay.",
  },
  'Mars|Sun': {
    ko: '한쪽의 불이 다른 쪽의 정체성을 흔들어 깨워놓거나, 부딪혀 서로를 밀어낸다. 함께할 때 추진력이 생겨 한 방향을 향하기도 하고, 누가 주도권을 쥐는지로 싸우게 되기도 한다. 그 충돌 속에서 너는 너 자신을 더 또렷이 느낀다.',
    en: "One person's drive either wakes and shakes the other's core, or crashes and pushes back. You might align toward one direction together, or lock horns over who leads. In that collision you feel who you are more vividly.",
  },
  'Mars|Uranus': {
    ko: '예상할 수 없는 짜릿함이 자꾸 튄다. 한쪽의 추진이 다른 쪽의 변화욕과 만나면서 둘은 늘 뭔가 새로운 쪽을 향한다. 그 신선함이 매력적이지만 정착이 어렵고, 불씨가 어디로 튈지 모르는 불안도 함께한다. 자극과 현실의 균형이 관계를 결정한다.',
    en: "Thrills you can't predict keep sparking. One's push meets the other's urge to shift, and you're always reaching for something fresh. That spark is magnetic, but settling becomes hard; you never know where the fire will jump. Balance between thrill and reality decides what you become.",
  },
  'MC|Mars': {
    ko: '세상을 향한 야망과 그것을 밀어붙이는 힘이 둘을 같은 길로 이끌기도, 누가 먼저 나아갈지로 다투게 만들기도 한다. 함께 거대한 걸 도모할 수 있지만, 주도권의 무게 속에서 서로를 밀어내기도 한다. 성취를 어떻게 나눌 건지가 둘의 미래를 그린다.',
    en: 'Ambition toward the world and the force to push it can pull you both toward the same path — or leave you battling over who moves first. You can build something grand together, but the weight of control might shove you apart. How you share the wins draws your future.',
  },
  'MC|Mercury': {
    ko: '세상에 드러내고 싶은 모습과 평소 말하는 결이 어떻게 맞물리는지 본다. 말이 너의 방향을 힘 있게 받쳐주기도, 이야기가 자꾸 어긋나 오해가 쌓이기도 한다. 겉으로 보이는 너와 실제 너를 누가 얼마나 이해하는지가 그 사이를 밝고 어둡게 한다.',
    en: 'You see how the face you want to show the world meshes with how you naturally speak. Your words might powerfully support your direction — or keep missing and piling up misunderstandings. How well someone grasps the real you behind the image lights or darkens everything.',
  },
  'MC|Moon': {
    ko: '사람들 앞에서 보여주는 당신의 모습과, 혼자 있을 때 드러나는 진짜 기분이 얼마나 닮았는지가 여기서 드러나요. 공개적으로 나아가는 방향(중천점)과 마음 깊은 정서(달)가 일치하면 자연스럽고, 어긋나면 자꾸 불편함이 남아요.',
    en: "Your public persona and your private heart show up side by side here. When the direction you want to go (Midheaven) aligns with how you truly feel inside (Moon), you move with ease — when they don't, tension lingers.",
  },
  'MC|Sun': {
    ko: '둘이 세상을 어떻게 헤쳐나갈지, 그 길 위에서 각자 어떤 사람이 되고 싶은지가 겹쳐지는 순간이에요. 세상에 보여질 야망(중천점)과 가장 깊은 자아(태양)가 한 방향을 가리키면 함께 걷기 좋지만, 따로 가리키면 계속 발을 맞추는 일 자체가 힘들어져요.',
    en: 'Two people deciding how they want to walk their path, who they want to become in the world — when your public ambition (Midheaven) and your true self (Sun) point the same way, you stride together naturally; when they diverge, just keeping in step takes effort.',
  },
  'MC|Venus': {
    ko: '셈씬 무대에서 우리가 어떻게 함께 비칠지, 그 모습이 정말 예쁜지를 다루는 자리예요. 둘이 바깥에 그려내는 미래(중천점)와 서로를 아끼는 방식(금성)이 잘 맞으면 세상이 아름다워 보이지만, 틀어지면 남들 눈과 내 마음 사이에서 조용히 갈라져요.',
    en: 'This is about what kind of couple you appear to be when the world looks — whether that picture is truly beautiful. When the future you paint together (Midheaven) and how you cherish each other (Venus) align, the world feels lovely; when they split, you quietly drift between public perception and private feeling.',
  },
  'Mercury|Moon': {
    ko: '말을 걸 때 마음이 바로 따라가는지, 아니면 그 사이에서 헤매는지를 건드려요. 당신의 말(수성)이 상대가 느끼는 감정(달)을 얼마나 정확히 반영하느냐에 따라, 둘 사이의 대화는 깊어지거나 자꾸 어긋나게 돼요.',
    en: 'Whether your words land where the heart is — or get lost between. How precisely what you say (Mercury) reaches what the other truly feels (Moon) decides whether your talks grow closer or keep missing each other.',
  },
  'Mercury|Neptune': {
    ko: '말로는 다 설명할 수 없는 것들을 얼마나 알아채는가. 표면의 대화(수성)와 그 너머의 꿈·감정(해왕성)이 조화로우면 말 없이도 통하지만, 엇나가면 각자 듣고 싶은 대로만 듣다가 깊은 오해만 남아요.',
    en: "How much you read what can't be said. When what you talk about (Mercury) and the dreams beneath it (Neptune) flow together, you understand without words; when they pull apart, you each hear only what you wish and misunderstanding settles in deep.",
  },
  'Mercury|Pluto': {
    ko: '말 한마디가 상대의 속내까지 건드리는 순간이 오는 곳이에요. 겉으로 주고받는 대화(수성)가 상대의 가장 깊은 부분(명왕성)을 깨우기도, 아니면 질문이 조사가 되고 말이 억압이 되기도 하죠.',
    en: "Where a single word can pierce straight to someone's core. Talk between you (Mercury) can unlock their deepest self (Pluto), or slip into interrogation and control.",
  },
  'Mercury|Saturn': {
    ko: '말하고 싶어도 조심이 먼저 오거나, 아니면 말에 묵직한 신뢰가 담기는 곳이에요. 대화(수성)에 책임의 무게(토성)가 싸여 있으면 말들이 단단하지만, 과하면 둘 다 말하기가 점점 조심스러워져요.',
    en: 'Where caution comes first, or where weight and trust settle into every word. When talk (Mercury) carries the heft of responsibility (Saturn), words stay solid — but it can tip into both of you becoming too careful to speak.',
  },
  'Mercury|Sun': {
    ko: '당신의 말이 상대의 자존심에 닿는 순간들이 반복되는 곳이에요. 대화(수성)가 상대의 본모습(태양)을 건드릴 때 따뜻하게 닿기도, 어떤 말도 자존심에 상처를 주기도 하죠.',
    en: "Where your words keep reaching for the other's pride — and sometimes hit. Talk (Mercury) can honor who someone truly is (Sun), or every conversation can feel like it's bumping against their core.",
  },
  'Mercury|Uranus': {
    ko: '둘의 대화가 자극적으로 튈 수도, 산만하게 흩어질 수도 있는 곳이에요. 대화(수성)와 변화(천왕성)가 만날 때 서로의 생각에 전기가 흐르거나, 아니면 주제가 계속 바뀌고 뭔가 확정되지 않는 채로 계속 흔들려요.',
    en: "Where talk can spark electric or scatter everywhere. When conversation (Mercury) meets sudden change (Uranus), you either ignite each other's thinking, or nothing quite settles and you keep second-guessing.",
  },
  'Mercury|Venus': {
    ko: '한 사람이 말을 내놓으면 다른 사람의 가슴팍이 반응한다. 표현이 직접 느낌으로 닿는 거다. 때론 말의 뉘앙스가 사랑의 언어로 귀결되기도, 듣는 쪽이 자기 방식의 애정(애정·매력)으로만 재석풀이하다 엇갈리기도 한다.',
    en: "When one speaks, the other's heart answers. Words land as feelings. Sometimes the way you speak becomes a love language, or the listener hears it through their own way of loving and you miss each other.",
  },
  'Moon|Neptune': {
    ko: '한 사람의 감정이라는 물이 다른 사람의 꿈이라는 구름에 닿을 때, 무언가 신비로운 빛이 생긴다. 말 없어도 통하지만, 그 통함이 자꾸 실체를 잃기도 한다. 둘은 함께 하늘 위에 떠 있는 기분인데, 발이 동동 떠 있을 수도 있다는 뜻이다.',
    en: "When one person's feelings touch the other's dreams, a mysterious glow forms. Understanding flows without words, but that understanding can drift from reality. You two feel like you're floating together, though sometimes your feet lose the ground.",
  },
  'Neptune|Sun': {
    ko: '한 사람의 정체성이라는 햇빛을 다른 사람이 화려하게 굴절시킨다. 본인 눈에는 자신이 평범해 보여도, 상대 눈에는 반짝이는 누군가가 된다는 뜻이다. 반대로 그 찬란함이 실제와 너무 달라 둘 다 길을 잃기도 한다.',
    en: "One person's sense of self gets refracted brilliantly through the other's prism. You might see yourself as ordinary, but they see you glowing. Except the glow can be so far from real that you both wander in that gap.",
  },
  'Pluto|Sun': {
    ko: '한 사람의 변화의 힘이 다른 사람의 본질을 움켜쥔다. 상대 때문에 자신이 완전히 달라지는 경험을 하거나, 그 강한 영향력이 질식할 듯 느껴지기도 한다. 둘 사이의 끌림은 운명처럼 느껴지지만, 그 운명의 무게가 때론 가슴을 짓누른다.',
    en: "The force of transformation in one person grasps at the other's core. You might be remade by their presence, or feel nearly suffocated by their pull. The attraction between you feels like fate, except fate can weigh on your chest.",
  },
  'Saturn|Sun': {
    ko: "한 사람의 진정한 자신이 다른 사람의 시선 아래 자꾸 재단된다. 그 사람 곁에 있으면 내가 뭔가 '되어야 하는' 느낌이 들거나, 한없이 검증받는 기분이 생긴다. 단단함이 전해지는 반면, 있는 그대로가 아닌 나만 남기도 한다.",
    en: 'One person\'s true self keeps getting measured against the other\'s standards. Near them, you feel you have to "become" something, constantly scrutinized. It can build solidity, but it can also leave only the version of you that passes inspection.',
  },
  'Sun|Uranus': {
    ko: '한 사람의 본래 자신이 다른 사람의 자극 앞에서 자꾸 깨어난다. 익숙하던 나의 작동법이 멈추고 다시 시작되는 경험이다. 그 신선함이 자유처럼 느껴지기도, 혼란처럼 느껴지기도 하는데, 둘 사이에선 계속 뭔가 새로워진다는 뜻이다.',
    en: "One person's core self wakes up under the other's charge. Your familiar ways stop and restart. That newness feels like freedom or chaos — either way, you two never quite settle into the same rhythm twice.",
  },
  'Sun|Venus': {
    ko: '넌 상대를 있는 그대로 받아주고, 상대도 너를 그렇게 좋아해. 진짜 너로 사랑받는 기분과 상대의 진심 있는 끌림이 함께 흐른다. 다만 때론 자존심이 마음을 흐리곤 하지만, 그 자체도 꽤 생생하고 진한 사이일 때가 많아.',
    en: 'You let them be exactly who they are, and they return that pure affection. The feeling of being loved as your truest self and their genuine pull run together. Pride might cloud things now and then, but that raw, real intensity often makes the connection quite vivid.',
  },
}
const OVERLAY_ALT: Record<number, Bi> = {
  1: {
    ko: '당신들이 처음 마주칠 때, 말 한마디보다 존재 자체가 더 크게 닿아요. 첫인상의 빛깔, 당신의 몸짓, 세상을 대하는 그 투명한 태도들이 상대에게 고스란히 읽혀버리죠. 그래서 둘은 미리 설명할 필요 없이 한눈에 서로를 알아봐요.',
    en: 'When you first meet, your very being lands before any words can. The way you carry that first light, your gestures, how you meet the world — it all reads instantly to the other. So you two skip the explanations and know each other in a glance.',
  },
  2: {
    ko: '당신이 무언가를 아끼고 소중히 여길 때, 그 마음이 상대에게 그대로 전해져요. 돈도, 살림도, 정말 손에 꼭 쥐고 싶은 것들이 모두 드러나는 자리거든요. 둘 사이엔 그래서 무언가를 함께 지키고 싶은 안정감과 신뢰가 차곡차곡 쌓여요.',
    en: "When you hold something dear, that feeling travels straight to them. Money, home, all the precious things you want to grip tight — it all shows up here. Between you two, there's a steadiness and trust that builds, the kind that wants to protect something together.",
  },
  3: {
    ko: '매일 주고받는 말들, 그 사소한 일상의 리듬들이 둘을 묶어줘요. 문자 하나, 대화 한바탕이 자연스럽게 흐르면서 친근함이 몸에 스며드는 거죠. 둘은 여기서 가볍게 통하고, 자주 닿고, 편하게 숨 쉴 수 있어요.',
    en: 'The words you trade each day, that ordinary rhythm of living — it weaves you together. A text, a conversation that flows so naturally it becomes part of your skin. Here you two communicate lightly, touch often, and breathe easy.',
  },
  4: {
    ko: '가족의 냄새, 어린 시절의 기억, 마음이 진짜로 쉬는 그곳까지 당신은 상대에게 문을 열어주게 돼요. 신발을 벗고 옷깃을 풀 수 있는 가장 사적인 자리에서, 둘은 서로의 다리를 편하게 시킬 수 있어요.',
    en: 'The scent of home, childhood memory, the place your heart actually rests — you open that door to them. Where you can kick off your shoes and unbutton your collar, the most private corner, you two can let each other settle in.',
  },
  5: {
    ko: '당신이 그 사람 옆에 있으면 자연스럽게 떨리고 싶어지는 곳이에요. 연애의 색감, 설렘의 향기가 거기 있거든요. 둘은 이 자리에서 서로를 밝혀주고 싶다는 마음, 함께 빛나고 싶다는 순수한 끌림을 느껴요.',
    en: "It's where you naturally want to flutter beside them. Romance lives here, the scent of that sweet skip of the heart. This is where you two feel the urge to light each other up, that simple pull to shine as one.",
  },
  6: {
    ko: '손발 맞춰서 일하고, 옆에서 슬쩍 거들고, 하루를 함께 나누는 자리예요. 그 조용한 협력이 당신들 사이에 자연스럽게 흐르면서, 둘은 일상 속에서 자주 눈이 마주쳐요.',
    en: "You pitch in on tasks, offer quiet help from beside them, share the day as it unfolds. That seamless teamwork flows between you, so you two keep catching each other's eye in the everyday.",
  },
  7: {
    ko: "당신이 한 사람을 '평생의 옆자리'로 진심 깊이 받아들이고 싶어 보인다면, 그 끌림은 여기서 비롯되어요. 옆자리는 점성에서 가장 깊은 동반을 읽는 곳이거든요. 둘은 자연스럽게 서로의 자리에 안기고 싶은 마음이 생겨요.",
    en: 'If you find yourself wanting to truly hold one person as a lifelong partner at your side, that pull starts here. The partnership house is where astrology reads the deepest companionship, and you two feel a natural urge to make room for each other.',
  },
  8: {
    ko: '둘이 가장 깊은 안쪽으로 들어가는 자리에서, 당신들은 서로를 송두리째 바꿀 만큼 강한 힘으로 엮여요. 말하지 않아도 알아차리고, 함께 나누는 것들이 표면 아래 진하게 남아요. 이건 은밀하고 근원적인 신뢰의 자리예요.',
    en: "In the deepest place you go together, you're woven with a force strong enough to remake each other. You know without words, and what you share stays deep below the surface. This is where the most private, fundamental trust lives.",
  },
  9: {
    ko: '당신들이 함께 세상을 읽고 새로운 걸 배우고 모험을 그리는 자리예요. 시야가 탁 트이면서, 더 큰 그림이 함께 보이기 시작하는 곳이죠. 둘 사이에선 믿음과 함께하는 설렘이 함께 자라요.',
    en: 'This is where you two read the world together, learn something new, picture adventures side by side. Your horizons open up, and a bigger picture begins to take shape. Between you, trust and excitement grow in tandem.',
  },
  10: {
    ko: '남들 눈에 당신들이 어떻게 비치는지, 세상에서 뭐로 기억될지가 달려 있는 가장 공적인 자리죠. 당신의 길도, 평판도, 당신이 도달할 곳도 상대와 함께 흔들려요. 무게감 있게, 그리고 뚜렷하게요.',
    en: "It's the most public place — how you appear to others, what the world remembers you for. Your path, your reputation, where you're heading all shift when you're together. With real weight, and in plain sight.",
  },
  11: {
    ko: '당신들의 눈이 같은 수평선을 바라봐요. 미래에 대한 상(像)이 닮아 있어서, "이렇게 나아가면 좋겠다"는 바람을 함께 그려요. 가는 길이 같아서 옆자리에 서 있기가 편하고, 앞을 바라보며 나란히 걸을 때 자연스럽게 상대를 믿게 되는 거죠. 그런 동의(同意)와 동행 속에서 새로운 공기가 펼쳐져요.',
    en: 'Your eyes land on the same horizon. Your visions of tomorrow match, so you sketch the future together. Walking the same path feels natural side by side, and gazing ahead together, trust blooms without trying. In that agreement and walking alongside, new air opens up.',
  },
  12: {
    ko: '말로 다 꺼낼 수 없는 것들이 둘 사이에 흐르는 곳이에요. 당신의 꿈과 상대의 무의식이 조용히 손을 잡고, 안 보이는 곳에서 일어나는 일들—마음속 중얼거림, 이루고 싶었던 것들—이 스며 있죠. 그래서 둘 사이엔 이름 붙이기 힘든, 그저 신비롭게 끌리는 무언가가 있는 거예요. 설명할 수 없지만 느끼는, 그런 깊이가 있어요.',
    en: "This is where what can't be said in words flows between you. Your dreams and their unconscious quietly clasp hands. Unspoken things live here—the soft murmurings of the heart, what you both always wished for. So there's something between you that resists naming, a pull that's purely mysterious. There's a depth you feel but cannot explain.",
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

  // 커플별 결정적 seed — 스캐폴딩(verdict/intro/closing/hook/primer) 변형을 커플마다 다르게 고른다.
  const seed = coupleSeed(report)

  // ── 한눈에 (verdict) — 섹션이 아니라 view.verdict 로 따로 ──
  const verdict = report.crossVerdict
    ? {
        text: report.crossVerdict.text,
        tone: report.crossVerdict.tone,
        expansion: t(
          pickFor(
            [
              VERDICT_EXPANSION[report.crossVerdict.tone],
              ...VERDICT_EXP_ALT[report.crossVerdict.tone],
            ],
            seed,
            `verdict:${report.crossVerdict.tone}`
          )
        ),
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
      const pairAlt = ASPECT_PAIR_ALT[key]
      const blurb = pair
        ? t(pickFor(pairAlt ? [pair, pairAlt] : [pair], seed, `aspect:${key}`))
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
      const pairAlt = ASPECT_PAIR_ALT[key]
      const blurb = pair
        ? t(pickFor(pairAlt ? [pair, pairAlt] : [pair], seed, `aspect:${key}`))
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
      const arena = t(
        pickFor(
          OVERLAY_ALT[house] ? [OVERLAY_HOUSE[house], OVERLAY_ALT[house]] : [OVERLAY_HOUSE[house]],
          seed,
          `overlay:${house}`
        )
      )
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
    const hook = t(
      pickFor([THEME_HOOK[m.id][hookKey], HOOK_ALT[m.id][hookKey]], seed, `hook:${m.id}.${hookKey}`)
    )
    // 기본 결 문단 — 신호별 본문 앞에 깔아 빈약한 테마도 풍부하게. (훅과 같은 극성)
    // 단, 신호가 0인 테마엔 붙이지 않는다 — "신호 있을 때만 표시" 원칙 유지(빈 테마 부활 X).
    const seenTxt = new Set<string>()
    const paragraphs: string[] =
      items.length > 0
        ? [
            t(
              pickFor(
                [THEME_PRIMER[m.id][hookKey], PRIMER_ALT[m.id][hookKey]],
                seed,
                `primer:${m.id}.${hookKey}`
              )
            ),
          ]
        : []
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
    intro: t(pickFor([INTRO, ...INTRO_ALT], seed, 'intro')),
    verdict,
    sections,
    themes,
    glossary,
    closing: t(pickFor([CLOSING, ...CLOSING_ALT], seed, 'closing')),
  }
}

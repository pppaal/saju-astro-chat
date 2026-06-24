/**
 * 무료 궁합 리포트 — ko/en 해석 사전 (런타임 LLM 없음, 결정적).
 *
 * 키 집합은 buildNarrative.ts(엔진) 및 엔진이 읽는 facts(CompatReport)와 1:1.
 * 카피 톤: 통합 무료 리포트와 같은 "초보자 눈높이 이야기체" — 전문용어는
 * 쓰되 *바로 뒤에 뜻을 한 호흡에* 붙인다. 처방/조언/시기 카피는 금지(유료
 * 상담사 몫) — 여기는 "차트가 무엇을 보여주는지"의 서술만.
 */

import type { Bi, BandCopy, SectionMeta, SignalCopy } from './types'
import { GENERATED } from './generated'

// 생성 카피(GENERATED)를 베이스라인 위에 덮어쓰는 얕은 병합 — 키 단위로 교체.
const mergeRec = <T>(base: Record<string, T>, gen?: Record<string, T>): Record<string, T> =>
  gen ? { ...base, ...gen } : base

// ── 리포트 도입 + 맺음말 ────────────────────────────────────────────

const INTRO_BASE: Bi = {
  ko: '두 사람의 사주(동양)와 별자리(서양)를 같은 자리에 놓고, 어디서 자연스럽게 통하고 어디서 결이 달라 조율이 필요한지 읽은 리포트예요. 동·서 두 시선이 같은 말을 하는 지점일수록 그만큼 또렷한 특징이라고 보면 돼요. 용어가 나와도 괜찮아요 — 바로 옆에 쉬운 뜻을 붙여 두었고, 맨 아래 "용어 풀이"에서 한 번에 정리해 드려요.',
  en: 'This report places your Saju (Eastern four-pillars) and your birth charts (Western astrology) side by side, then reads where you two naturally flow and where the grain differs and asks for tuning. The more both lenses say the same thing, the more clearly that trait shows. Terms are fine — each comes with its plain meaning right beside it, and the "Glossary" at the bottom gathers them in one place.',
}

const CLOSING_BASE: Bi = {
  ko: '여기까지가 두 사람 케미의 큰 그림이에요. 어디서 통하고 어디를 조율하면 좋을지, 그리고 "언제"가 좋은 시기인지 — 구체적으로 풀어가는 길과 타이밍은 상담사가 두 분 이야기를 들으며 더 깊이 짚어드려요.',
  en: 'That is the big picture of your chemistry. Where you click, what to tune, and *when* the timing is right — the concrete path and timing are something the counselor goes into more deeply while listening to your story.',
}

export const INTRO: Bi = GENERATED.META?.intro ?? INTRO_BASE
export const CLOSING: Bi = GENERATED.META?.closing ?? CLOSING_BASE

// ── 섹션 메타 (제목·아이콘·도입) ────────────────────────────────────

export const SECTION_META: Record<string, SectionMeta> = {
  glance: {
    icon: '✨',
    title: { ko: '한눈에 보는 두 사람', en: 'Your match at a glance' },
    lead: {
      ko: '사주와 별자리가 같은 방향을 가리키는지, 큰 결을 한 줄로 먼저 짚어요.',
      en: 'First, the big grain in one line — whether Saju and the stars point the same way.',
    },
  },
  bands: {
    icon: '📊',
    title: { ko: '끌림과 마찰, 다섯 갈래로', en: 'Pull and friction, in five strands' },
    lead: {
      ko: '궁합을 다섯 갈래(사주의 끌림·부딪힘·기운 보완, 별자리의 조화·긴장)로 나눠 막대로 보여줘요. 점수가 아니라 "어느 결이 센지"를 보는 거예요.',
      en: 'Compatibility split into five strands (Saju pull, Saju clash, element complement, astro harmony, astro tension), shown as bars. Not a grade — a read on which grain runs stronger.',
    },
  },
  grain: {
    icon: '🌗',
    title: { ko: '두 사람의 타고난 결', en: 'The grain you were each born with' },
    lead: {
      ko: '사주에서 "나 자신"을 뜻하는 글자(일간)끼리 어떻게 만나는지, 그리고 두 사람의 기운(오행)이 서로를 채워주는지 봐요.',
      en: 'How your "day master" characters (the symbol that means *you* in Saju) meet, and whether your elemental energies fill each other in.',
    },
  },
  hearts: {
    icon: '💞',
    title: { ko: '마음이 닿는 자리, 부딪히는 자리', en: 'Where hearts meet, where they rub' },
    lead: {
      ko: '태어난 순간 두 사람의 행성이 서로 어떤 각도로 놓였는지(어스펙트) — 어디서 자연스럽게 흐르고 어디서 조율이 필요한지 보여줘요.',
      en: 'The angles your planets make to each other (aspects) — where things flow naturally and where they ask for tuning.',
    },
  },
  stage: {
    icon: '🎭',
    title: { ko: '서로의 삶에서 켜지는 무대', en: 'The stage you light up in each other' },
    lead: {
      ko: '한 사람의 행성이 상대의 어느 삶의 영역(하우스)에 들어오는지 — 둘이 만나면 특히 어떤 무대가 환해지는지 봐요.',
      en: "Which area of life (house) one person's planet lands in for the other — which stage lights up brightest when you two meet.",
    },
  },
  partner: {
    icon: '💍',
    title: { ko: '짝으로서의 끌림', en: 'Drawn to each other as partners' },
    lead: {
      ko: '사주에서 "배우자 자리"에 상대가 어떤 결로 들어오는지 봐요. 정통 명리 궁합의 핵심이에요.',
      en: 'How the other lands in your Saju "spouse seat" — the heart of classical four-pillars matchmaking.',
    },
  },
  knots: {
    icon: '🪢',
    title: { ko: '사주가 본 인연의 매듭', en: 'The knots Saju sees in your bond' },
    lead: {
      ko: '두 사람의 사주 글자끼리 서로 끌어당기거나(합) 부딪히는(충·형) 지점이에요. 어디서 묶이고 어디서 흔들리는지 보여줘요.',
      en: 'Where your Saju characters pull together (union) or collide (clash/punishment) — which spots bond and which get shaken.',
    },
  },
}

// ── 한눈에 — 교차 verdict 풀이 (tone 별) ────────────────────────────

const VERDICT_EXPANSION_BASE: Record<'aligned' | 'mixed' | 'tension' | 'neutral', Bi> = {
  aligned: {
    ko: '동양 사주와 서양 별자리가 둘 다 "끌린다"고 말할 때예요. 서로 다른 두 방식이 같은 결론에 닿았다는 건, 그만큼 자연스럽게 통하는 사이라는 뜻이에요.',
    en: 'Both Eastern Saju and Western astrology say "drawn." When two different methods land on the same conclusion, it means the connection flows that naturally.',
  },
  tension: {
    ko: '둘 다 "부딪힘"을 짚을 때예요. 안 맞아서가 아니라, 마찰을 거치며 서로를 단련시키는 결이라고 봐요 — 무던한 사이보다 오히려 깊어질 수 있는 관계예요.',
    en: 'Both flag "friction." Not a mismatch — a grain that forges you through the rub. It can run deeper than an easy, frictionless pairing.',
  },
  mixed: {
    ko: '한 시선은 끌린다 하고 다른 시선은 부딪힌다고 할 때예요. 겉과 속이 다른 입체적인 관계라, 어디서 통하고 어디서 조율할지를 아는 게 핵심이에요.',
    en: 'One lens says drawn, the other says friction — a layered pairing where surface and depth differ. The work is knowing where you click and where to tune.',
  },
  neutral: {
    ko: '끌림과 마찰이 고르게 섞인 균형형이에요. 극적이진 않아도 결이 오래 가는, 잔잔히 단단한 사이예요.',
    en: 'Pull and friction evenly mixed — a balanced type. Not dramatic, but a bond that lasts, quietly solid.',
  },
}

export const VERDICT_EXPANSION = mergeRec(
  VERDICT_EXPANSION_BASE as Record<string, Bi>,
  GENERATED.VERDICT_EXPANSION
) as Record<'aligned' | 'mixed' | 'tension' | 'neutral', Bi>

// ── 두 사람의 결 — 일간 오행 관계 (relation 별) ─────────────────────
// 빌더가 {A}{B}{aEl}{bEl} 자리표시자를 실제 이름·오행으로 채운다.

const DAY_MASTER_REL_BASE: Record<'same' | 'aControlsB' | 'bControlsA' | 'generate', Bi> = {
  same: {
    ko: '두 사람 모두 {aEl} 기운을 "나 자신"으로 타고났어요. 같은 결이라 말하지 않아도 통하는 편안함이 있지만, 닮은 만큼 같은 약점도 공유해서 한쪽이 부족할 때 다른 쪽도 비슷하게 비어 있을 수 있어요.',
    en: 'You both carry {aEl} as your core self. Same grain means an easy, unspoken understanding — but you also share the same blind spots, so when one runs short the other may be running low in the same way.',
  },
  aControlsB: {
    ko: '{A}의 {aEl} 기운이 {B}의 {bEl} 기운을 정리하고 다듬어주는 흐름이에요. {A}는 {B}를 단단하게 잡아주고, {B}는 그게 든든하게 느껴질 때도 때론 따끔한 제약처럼 느껴질 때도 있어요.',
    en: "{A}'s {aEl} energy files down and shapes {B}'s {bEl}. {A} steadies {B}, and {B} can feel that as reassuring support — or, at times, as a bit of a sting or constraint.",
  },
  bControlsA: {
    ko: '{B}의 {bEl} 기운이 {A}의 {aEl} 기운을 정리하고 다듬어주는 흐름이에요. {B}는 {A}를 단단하게 잡아주고, {A}는 그게 든든하게 느껴질 때도 때론 따끔한 제약처럼 느껴질 때도 있어요.',
    en: "{B}'s {bEl} energy files down and shapes {A}'s {aEl}. {B} steadies {A}, and {A} can feel that as reassuring support — or, at times, as a bit of a sting or constraint.",
  },
  generate: {
    ko: '{aEl}과 {bEl}이 서로를 살려주는 상생의 결이에요. 한쪽 기운이 다른 쪽을 북돋아 흐르게 해서, 같이 있으면 서로를 자라게 하는 보완형 만남이에요.',
    en: '{aEl} and {bEl} feed each other in a generating cycle. One energy nourishes the other into motion, so together you tend to grow each other — a complementary meeting.',
  },
}

export const DAY_MASTER_REL = mergeRec(
  DAY_MASTER_REL_BASE as Record<string, Bi>,
  GENERATED.DAY_MASTER_REL
) as Record<'same' | 'aControlsB' | 'bControlsA' | 'generate', Bi>

// ── 십성 cross — 상대가 나에게 어떤 역할로 다가오나 (10) ─────────────

const TEN_GODS_BASE: Record<string, SignalCopy> = {
  비견: {
    feel: { ko: '동료 같은 끌림', en: 'a peer-like draw' },
    blurb: {
      ko: '상대가 나와 같은 편, 어깨를 나란히 하는 동료처럼 다가와요. 경쟁보다는 함께 가는 든든함이 있는 결이에요.',
      en: 'The other comes across as an ally on your side, shoulder to shoulder — more a sense of going together than competing.',
    },
  },
  겁재: {
    feel: { ko: '승부욕을 자극하는 결', en: 'a spark of rivalry' },
    blurb: {
      ko: '상대가 묘하게 승부욕과 경쟁심을 건드리는 결로 와요. 같이 있으면 자극이 되지만, 때론 내 몫을 두고 겨루는 듯한 긴장도 있어요.',
      en: 'The other quietly stirs your competitive streak. Stimulating to be around, but with an edge of vying over the same turf.',
    },
  },
  식신: {
    feel: { ko: '편안한 표현이 열리는 결', en: 'easy self-expression' },
    blurb: {
      ko: '상대 앞에서 내 표현과 솜씨가 편하게 풀려나오는 결이에요. 꾸미지 않아도 자연스럽게 나를 내보이게 되는 사이예요.',
      en: "Around the other, your expression and craft flow out with ease. You end up showing yourself naturally, without having to perform.",
    },
  },
  상관: {
    feel: { ko: '톡톡 튀는 재기', en: 'sharp, witty spark' },
    blurb: {
      ko: '상대가 내 재치와 말솜씨를 톡톡 끌어내는 결이에요. 반짝이는 매력이 오가지만, 자유로운 만큼 틀에 매이는 걸 답답해할 수도 있어요.',
      en: 'The other draws out your wit and way with words. A glittering charm passes between you — though, being free-spirited, you may chafe at being boxed in.',
    },
  },
  편재: {
    feel: { ko: '활달하게 굴러가는 끌림', en: 'a lively, expansive pull' },
    blurb: {
      ko: '상대가 크게 굴러가는 기회와 활달함으로 다가와요. 함께 벌이고 넓혀가는 재미가 있는 결이에요.',
      en: 'The other arrives as big-swing opportunity and liveliness — a grain with the fun of starting things and widening the field together.',
    },
  },
  정재: {
    feel: { ko: '안정·성실의 끌림', en: 'a steady, earnest draw' },
    blurb: {
      ko: '상대가 차곡차곡 쌓아가는 안정과 성실함으로 다가와요. 화려하진 않아도 믿고 기댈 수 있는 단단함이 있는 결이에요.',
      en: 'The other comes across as steady, earnest, building things up bit by bit. Not flashy, but with a solid, lean-on-able reliability.',
    },
  },
  편관: {
    feel: { ko: '긴장과 격정의 끌림', en: 'a charged, intense pull' },
    blurb: {
      ko: '상대가 나를 밀어붙이는 압박과 격정으로 다가와요. 강하게 끌리되 긴장도 함께 와서, 짜릿함과 부담이 한데 섞인 결이에요.',
      en: 'The other arrives as pressure and intensity that pushes you. A strong pull laced with tension — thrill and weight mixed into one grain.',
    },
  },
  정관: {
    feel: { ko: '듬직한 책임감의 끌림', en: 'a dependable, steadying draw' },
    blurb: {
      ko: '상대가 기대고 싶은 듬직함과 책임감으로 다가와요. 안정적이고 믿음직하지만, 시간이 지나면 간섭이나 틀처럼 느껴질 때도 있어요.',
      en: 'The other comes across as someone dependable to lean on — steady and trustworthy, though over time it can start to feel like being reined in.',
    },
  },
  편인: {
    feel: { ko: '독특한 직관의 끌림', en: 'an unusual, intuitive draw' },
    blurb: {
      ko: '상대가 남다른 시선과 직관으로 다가와요. 깊이 보살펴주되 살짝 거리를 두는, 독특하고 신비로운 결이에요.',
      en: 'The other arrives with an offbeat lens and intuition — caring deeply yet keeping a slight distance, an unusual, mysterious grain.',
    },
  },
  정인: {
    feel: { ko: '품어주는 보살핌', en: 'a nurturing warmth' },
    blurb: {
      ko: '상대가 나를 꾸준히 보살피고 받쳐주는 결로 와요. 배우고 기댈 수 있는, 안기듯 편안한 따뜻함이 있는 사이예요.',
      en: 'The other steadily nurtures and supports you — a warm, sheltering ease you can learn from and lean into.',
    },
  },
}

export const TEN_GODS = mergeRec(TEN_GODS_BASE, GENERATED.TEN_GODS)

// ── 오행 균형 — 합산 강약 ───────────────────────────────────────────

const ELEMENT_BALANCE_BASE = {
  balanced: {
    ko: '두 사람의 기운(오행)을 합쳐 보면 어느 한쪽으로 치우치지 않고 고루 퍼져 있어요. 함께 있을 때 한 사람이 너무 넘치거나 모자라지 않게 서로를 받쳐주는 균형형이에요.',
    en: 'Combine your elemental energies and they spread fairly evenly — no single one runs away with it. Together you tend to keep each other from overflowing or running dry.',
  } as Bi,
  complement: {
    ko: '한 사람에게 옅은 기운을 다른 사람이 진하게 가지고 있어요. 서로의 빈자리를 채워주는 보완형이라, 같이 있으면 부족했던 결이 메워지는 느낌이 드는 사이예요.',
    en: 'What runs thin in one of you runs strong in the other. A complementary fit — together, the gaps tend to fill in.',
  } as Bi,
  /** 빌더가 {strongEl}/{weakEl} 를 채움. */
  skewed: {
    ko: '둘을 합치면 {strongEl} 기운이 도드라지고 {weakEl} 기운은 옅은 편이에요. 같은 색이 짙어지는 만큼 둘 다 {weakEl}의 결은 함께 보완하면 좋은 자리예요.',
    en: 'Combined, {strongEl} stands out while {weakEl} runs thin. The shared color deepens — and {weakEl} is the grain you both have room to round out.',
  } as Bi,
}

export const ELEMENT_BALANCE = {
  ...ELEMENT_BALANCE_BASE,
  ...((GENERATED.ELEMENT_BALANCE ?? {}) as Partial<typeof ELEMENT_BALANCE_BASE>),
}

// ── 시너스트리 어스펙트 — 행성쌍별 풍부 풀이 ────────────────────────
// 키: 영문 행성명 정렬 'A|B'. 없으면 ASPECT_TONE 폴백.
// 빌더가 톤(조화/긴장/엇박)에 맞는 마무리를 덧붙인다.

const ASPECT_PAIR_BASE: Record<string, Bi> = {
  'Moon|Sun': {
    ko: '한 사람의 "나 자신"과 다른 사람의 "감정"이 맞물리는, 궁합에서 가장 핵심인 자리예요. 해와 달이 만나듯 서로의 중심과 마음이 닿는 결이에요.',
    en: "One person's core self meets the other's feelings — the single most important spot in synastry. Like Sun and Moon meeting, your center and your heart touch here.",
  },
  'Mars|Venus': {
    ko: '애정(금성)과 욕망(화성)이 만나는, 끌림과 케미의 심장 같은 자리예요. 서로에게 느끼는 설렘과 불꽃이 가장 또렷하게 드러나는 결이에요.',
    en: 'Affection (Venus) meets desire (Mars) — the very heart of attraction and chemistry. This is where the flutter and the spark between you show most clearly.',
  },
  'Moon|Venus': {
    ko: '정서(달)와 애정(금성)이 맞닿는 다정한 자리예요. 마음이 포근하게 통하고, 함께 있으면 편안하게 사랑받는 느낌이 드는 결이에요.',
    en: 'Feelings (Moon) meet affection (Venus) — a tender spot. Hearts connect softly, and being together carries an easy, well-loved warmth.',
  },
  'Mars|Moon': {
    ko: '감정(달)과 욕망(화성)이 곧장 이어지는 자리예요. 마음이 동하면 바로 끌림으로 번지는, 즉각적이고 뜨거운 결이에요.',
    en: 'Feeling (Moon) wires straight to desire (Mars) — when the heart stirs it spills right into attraction. An immediate, heated grain.',
  },
  'Mercury|Mercury': {
    ko: '두 사람의 대화와 생각의 결이 얼마나 맞는지 보는 자리예요. 말이 잘 통하면 사소한 잡담도 즐겁고, 어긋나면 같은 말을 다르게 알아듣곤 해요.',
    en: "Whether your wavelengths of talk and thought line up. When they do, even small talk is fun; when they don't, you hear the same words differently.",
  },
  'Moon|Moon': {
    ko: '두 사람의 정서 리듬이 닮았는지 보는 자리예요. 비슷하면 굳이 설명 안 해도 기분이 통하고, 다르면 위로하는 방식이 서로 어긋날 수 있어요.',
    en: 'Whether your emotional rhythms resemble each other. Alike, your moods sync without explaining; different, the way you comfort can miss.',
  },
  'Venus|Venus': {
    ko: '취향과 사랑하는 방식이 닮았는지 보는 자리예요. 좋아하는 결이 비슷하면 데이트도 선물도 손쉽게 통하는 사이예요.',
    en: 'Whether your tastes and ways of loving resemble each other. When they match, dates and gifts land easily.',
  },
  'Sun|Sun': {
    ko: '두 사람 자아의 기본 결을 나란히 보는 자리예요. 인생을 대하는 큰 방향이 비슷한지, 다른지를 비춰줘요.',
    en: 'Two selves placed side by side — whether your broad approach to life runs similar or different.',
  },
  'Mars|Mars': {
    ko: '추진력과 욕망의 호흡을 보는 자리예요. 속도가 맞으면 함께 밀어붙이는 팀이 되고, 어긋나면 한쪽이 급할 때 한쪽은 느긋해요.',
    en: 'The rhythm of drive and desire. In step, you push forward as a team; out of step, one races while the other ambles.',
  },
  'Moon|Saturn': {
    ko: '감정(달)과 책임·거리감(토성)이 만나는 자리예요. 든든하게 받쳐주는 무게가 되기도, 정서적으로 답답한 벽이 되기도 하는 결이에요.',
    en: 'Feeling (Moon) meets duty and distance (Saturn). It can be a steadying weight that holds you — or an emotionally stifling wall.',
  },
  'Saturn|Venus': {
    ko: '애정(금성)과 헌신·약속(토성)이 만나는 자리예요. 사랑에 진지함과 오래가는 무게를 더해주는, 책임으로 묶이는 결이에요.',
    en: 'Affection (Venus) meets commitment (Saturn) — adding seriousness and lasting weight to love, a bond tied by responsibility.',
  },
  'Mars|Saturn': {
    ko: '추진(화성)과 통제(토성)가 맞부딪는 자리예요. 한쪽이 밀고 한쪽이 제동을 걸어서, 속도 차이로 답답함이 생기기 쉬운 결이에요.',
    en: 'Drive (Mars) meets restraint (Saturn). One pushes, one brakes — friction over pace comes easily here.',
  },
  'Moon|Pluto': {
    ko: '감정의 가장 깊은 곳(명왕성)을 건드리는 자리예요. 강렬하게 빠져들되, 집착이나 휘둘림으로 번질 수도 있는 깊은 결이에요.',
    en: 'Pluto touches the deepest layer of feeling. An intense plunge — capable of spilling into obsession or being swept up.',
  },
  'Pluto|Venus': {
    ko: '사랑(금성)이 집착·변환(명왕성)과 닿는 자리예요. 운명처럼 강하게 끌리지만, 그만큼 관계가 둘을 바꿔놓는 깊은 결이에요.',
    en: 'Love (Venus) meets obsession and transformation (Pluto). A fated, powerful draw — and a bond that reshapes you both.',
  },
  'Mars|Pluto': {
    ko: '욕망(화성)과 힘(명왕성)이 증폭되는 자리예요. 강렬한 에너지가 오가지만, 주도권을 두고 팽팽해지기도 하는 결이에요.',
    en: 'Desire (Mars) and power (Pluto) amplify. Intense energy passes between you — and it can tauten into a tug over control.',
  },
  'Uranus|Venus': {
    ko: '설렘과 자유로운 끌림(천왕성×금성)의 자리예요. 처음의 짜릿함이 강한 대신, 예측 못 할 변덕도 함께 오는 결이에요.',
    en: 'The spot of an exciting, free-spirited draw (Uranus × Venus). Strong early thrill — paired with unpredictable changes of weather.',
  },
  'Moon|Uranus': {
    ko: '정서적 자극(천왕성×달)의 자리예요. 새롭고 신선한 떨림을 주지만, 감정이 들쭉날쭉 흔들리기도 하는 결이에요.',
    en: 'The spot of an emotional jolt (Uranus × Moon). Fresh, novel flutter — and feelings that can swing.',
  },
  'Neptune|Venus': {
    ko: '이상과 낭만(해왕성×금성)이 어리는 사랑의 자리예요. 꿈결 같은 끌림이 아름답지만, 상대를 실제보다 이상화하기 쉬운 결이에요.',
    en: 'Where love meets dream and idealization (Neptune × Venus). A beautiful, dreamlike draw — easy to paint the other rosier than reality.',
  },
  'Jupiter|Sun': {
    ko: '서로를 넓혀주는 자리(목성×해)예요. 함께 있으면 시야가 트이고 운이 풀리는 듯한, 너그럽고 키워주는 결이에요.',
    en: 'Where you expand each other (Jupiter × Sun). Together your horizons open — a generous, growth-giving grain.',
  },
  'Jupiter|Moon': {
    ko: '정서적으로 품어주는 자리(목성×달)예요. 마음을 넉넉하게 받아주고 북돋아주는, 곁에 있으면 편안해지는 결이에요.',
    en: 'Where one buoys the other emotionally (Jupiter × Moon) — generously holding and lifting the heart, an easeful grain.',
  },
  'Ascendant|Venus': {
    ko: '첫인상(상승점)과 매력(금성)이 만나는 자리예요. 처음 본 순간부터 호감이 도는, 끌림이 빠르게 켜지는 결이에요.',
    en: 'First impression (Ascendant) meets charm (Venus) — liking that warms from the first glance, attraction that lights up fast.',
  },
  'Ascendant|Sun': {
    ko: '첫인상(상승점)과 자아(해)가 만나는 자리예요. 상대의 본모습이 곧 내가 끌린 첫인상과 통하는, 또렷한 존재감의 결이에요.',
    en: "First impression (Ascendant) meets the self (Sun) — the other's true nature lines up with the impression that drew you, a vivid presence.",
  },
}

export const ASPECT_PAIR = mergeRec(ASPECT_PAIR_BASE, GENERATED.ASPECT_PAIR)

/** 행성쌍 사전에 없을 때 톤만으로 채우는 폴백. 빌더가 행성 역할명을 합성해 앞에 붙임. */
export const ASPECT_TONE: Record<'harmony' | 'tension' | 'neutral', Bi> = {
  harmony: {
    ko: '이 자리에서는 서로의 기운이 자연스럽게 맞물려 흘러요. 애써 맞추지 않아도 통하는 편안한 결이에요.',
    en: 'Here your energies mesh and flow naturally — an easy grain that connects without effort.',
  },
  tension: {
    ko: '이 자리에서는 두 기운이 살짝 부딪혀요. 안 맞아서가 아니라, 서로 조율하며 결을 맞춰가야 하는 자리예요.',
    en: 'Here the two energies rub a little. Not a mismatch — a spot that asks you to tune and find the grain together.',
  },
  neutral: {
    ko: '이 자리에서는 두 기운이 미묘하게 엮여요. 또렷하진 않아도 은근히 서로를 의식하게 되는 결이에요.',
    en: 'Here the two energies interweave subtly — not loud, but a quiet awareness of each other.',
  },
}

// ── 하우스 오버레이 — 상대 행성이 내 어느 삶의 무대에 들어오나 (1-12) ─

// 빌더가 "{A}의 {행성}이 {B}의 N번째 무대로 들어와요 — " 뒤에 이 서술을 붙인다.
// 그래서 각 항목은 *무대(하우스) 자체가 어떤 자리인지*만 행위자 없이 설명한다.
const OVERLAY_HOUSE_BASE: Record<number, Bi> = {
  1: {
    ko: '"자아·첫인상"의 무대예요. 그 앞에서 내가 또렷하게 드러나고, 서로의 존재가 즉각 눈에 띄는 자리예요.',
    en: 'the stage of self and first impression — where one comes into sharp focus and you notice each other right away.',
  },
  2: {
    ko: '"재물·가치"의 무대예요. 무엇을 소중히 여기고 어떻게 안정을 쌓을지, 현실적인 결에서 서로를 건드리는 자리예요.',
    en: 'the stage of money and values — touching what you treasure and how you build security, a down-to-earth spot.',
  },
  3: {
    ko: '"소통·일상"의 무대예요. 매일의 대화와 사소한 주고받음이 활발해지는, 말이 잘 오가는 자리예요.',
    en: 'the stage of talk and daily life — everyday conversation and small exchanges liven up, words flow.',
  },
  4: {
    ko: '"가정·뿌리"의 무대예요. 마음 깊은 안식처와 가족 같은 편안함을 건드리는, 포근하고 깊은 자리예요.',
    en: 'the stage of home and roots — touching your deep refuge and a family-like ease, a warm, deep spot.',
  },
  5: {
    ko: '"연애·즐거움"의 무대예요. 설렘과 놀이, 표현하는 사랑이 켜지는 가장 로맨틱한 자리 중 하나예요.',
    en: 'the stage of romance and play — flutter, fun, and expressed love switch on. One of the most romantic spots.',
  },
  6: {
    ko: '"일·습관"의 무대예요. 함께 무언가를 돌보고 챙기는, 일상을 같이 굴려가는 실용적인 자리예요.',
    en: 'the stage of work and habits — tending and looking after things together, a practical, shared-routine spot.',
  },
  7: {
    ko: '"동반자·결혼"의 무대예요. 정통 점성에서 짝·결혼을 보는 바로 그 자리라, 동반자로서 강하게 끌리는 신호예요.',
    en: 'the stage of partnership and marriage — the very seat astrology reads for a life partner, a strong pull toward pairing.',
  },
  8: {
    ko: '"깊은 결합·변환"의 무대예요. 마음 가장 깊은 곳에서 섞이는, 강렬하고 진한 끌림의 자리예요.',
    en: 'the stage of deep merging and transformation — mixing at the deepest level, an intense, charged draw.',
  },
  9: {
    ko: '"신념·확장"의 무대예요. 함께 시야를 넓히고 새로운 세계를 향하는, 같이 자라는 자리예요.',
    en: 'the stage of belief and expansion — broadening your view together and reaching for new worlds, a growing spot.',
  },
  10: {
    ko: '"커리어·사회적 위치"의 무대예요. 서로의 자리와 목표를 끌어올려주는, 든든하게 받쳐주는 자리예요.',
    en: "the stage of career and standing — lifting each other's position and goals, a supportive spot.",
  },
  11: {
    ko: '"친구·미래"의 무대예요. 같은 곳을 바라보는 동지처럼, 편안하고 길게 가는 우정의 자리예요.',
    en: 'the stage of friends and future — like comrades facing the same direction, an easy, long-lasting friendship spot.',
  },
  12: {
    ko: '"내면·비밀"의 무대예요. 남에게 안 보이는 깊은 마음을 건드리는, 신비롭고 은밀한 자리예요.',
    en: "the stage of the inner world and secrets — touching the hidden heart others don't see, a mysterious, private spot.",
  },
}

// 생성 OVERLAY_HOUSE 는 "1".."12" 문자열 키 → number 키로 변환해 병합.
export const OVERLAY_HOUSE: Record<number, Bi> = (() => {
  const out: Record<number, Bi> = { ...OVERLAY_HOUSE_BASE }
  for (const [k, v] of Object.entries(GENERATED.OVERLAY_HOUSE ?? {})) {
    const n = Number(k)
    if (Number.isInteger(n) && n >= 1 && n <= 12) out[n] = v
  }
  return out
})()

// ── 짝으로서의 끌림 — 배우자성 (4) ──────────────────────────────────

const SPOUSE_STAR_BASE: Record<string, SignalCopy> = {
  정재: {
    feel: { ko: '안정·가정의 짝', en: 'a stable, homemaking partner' },
    blurb: {
      ko: '사주의 배우자 자리에서 상대가 "차곡차곡 안정을 쌓는 짝"으로 떠올라요. 화려함보다 믿음과 성실로 가정을 단단하게 만드는 결의 끌림이에요.',
      en: 'In your Saju spouse seat, the other rises as a partner who builds steady security — a draw grounded in trust and earnest care over flash.',
    },
  },
  편재: {
    feel: { ko: '활달·자유로운 짝', en: 'a lively, free-spirited partner' },
    blurb: {
      ko: '배우자 자리에서 상대가 "활달하고 자유롭게 굴러가는 짝"으로 떠올라요. 함께 벌이고 넓혀가는 재미와 생기가 있는 끌림이에요.',
      en: 'In your spouse seat, the other rises as a lively, free-flowing partner — a draw full of the fun and vitality of doing and widening things together.',
    },
  },
  정관: {
    feel: { ko: '책임·안정의 짝', en: 'a responsible, steady partner' },
    blurb: {
      ko: '배우자 자리에서 상대가 "기대고 싶은 듬직한 짝"으로 떠올라요. 책임감 있고 반듯해서 곁에 있으면 안심이 되는 결의 끌림이에요.',
      en: 'In your spouse seat, the other rises as a dependable partner to lean on — responsible and upright, a draw that brings a sense of safety.',
    },
  },
  편관: {
    feel: { ko: '열정·자극의 짝', en: 'a passionate, electric partner' },
    blurb: {
      ko: '배우자 자리에서 상대가 "열정과 자극을 주는 짝"으로 떠올라요. 강하게 끌리고 긴장도 함께 와서, 짜릿함이 살아있는 결의 끌림이에요.',
      en: 'In your spouse seat, the other rises as a partner who brings passion and charge — a strong pull with tension riding along, a draw that stays electric.',
    },
  },
}

export const SPOUSE_STAR = mergeRec(SPOUSE_STAR_BASE, GENERATED.SPOUSE_STAR)

// ── 인연의 매듭 — 기둥 관계 태그별 풀이 ─────────────────────────────

const PILLAR_REL_BASE: Record<string, SignalCopy> = {
  천간합: {
    feel: { ko: '화학적 끌림', en: 'a chemical attraction' },
    blurb: {
      ko: '두 사람의 사주 윗글자(천간)가 손잡듯 묶이는 자리예요. 서로 다른 두 기운이 만나 새 기운으로 합쳐지는, 자석 같은 끌림의 신호예요.',
      en: "Your charts' upper characters (heavenly stems) clasp like hands. Two different energies meet and fuse into a new one — a magnetic pull signal.",
    },
  },
  천간충: {
    feel: { ko: '정면으로 부딪는 결', en: 'a head-on clash' },
    blurb: {
      ko: '두 사람의 천간이 정면으로 맞서는 자리예요. 생각이나 태도가 부딪히기 쉽지만, 그만큼 서로를 또렷하게 의식하게 하는 신호이기도 해요.',
      en: 'Your heavenly stems face off head-on. Views or attitudes clash easily here — yet it also makes you keenly aware of each other.',
    },
  },
  육합: {
    feel: { ko: '은근한 결속', en: 'a quiet binding' },
    blurb: {
      ko: '두 사람의 아랫글자(지지)가 다정하게 묶이는 자리예요. 겉으로 요란하지 않아도 속에서 은근하게 가까워지는 결속의 신호예요.',
      en: 'Your lower characters (earthly branches) bind warmly. Not loud on the surface, but a quiet drawing-closer underneath.',
    },
  },
  삼합: {
    feel: { ko: '한 팀으로 뭉침', en: 'merging into one team' },
    blurb: {
      ko: '두 사람의 지지가 모여 하나의 큰 기운(국)을 이루는 자리예요. 서로의 빈 글자를 채워 한 방향으로 뭉치는, 강한 결속의 잠재력이에요.',
      en: 'Your branches gather into one larger frame. You fill each other’s missing piece and pull in one direction — strong bonding potential.',
    },
  },
  방합: {
    feel: { ko: '같은 계절로 모임', en: 'gathering in one season' },
    blurb: {
      ko: '두 사람의 지지가 같은 계절·방향의 기운으로 모이는 자리예요. 비슷한 결끼리 힘을 합쳐 한 색으로 짙어지는 결속의 신호예요.',
      en: 'Your branches gather into one season’s direction — like grains alike joining force, deepening into a single color, a bonding signal.',
    },
  },
  충: {
    feel: { ko: '흔들고 깨우는 충돌', en: 'a shaking, waking clash' },
    blurb: {
      ko: '두 사람의 지지가 정면으로 부딪히는 자리예요. 변동과 자극이 큰 신호라, 끌리면서도 흔들리는 역동적인 결이에요. 특히 일지(배우자 자리)에 걸리면 가장 센 신호예요.',
      en: 'Your branches collide head-on — a signal of big movement and stimulation, a dynamic grain that draws and shakes at once. Strongest when it lands on the day-branch (the spouse seat).',
    },
  },
  형: {
    feel: { ko: '갈고 다듬는 마찰', en: 'a grinding, refining friction' },
    blurb: {
      ko: '두 사람의 지지가 서로를 갈고 누르는 자리예요. 답답한 마찰이 생기기도 하지만, 거치고 나면 서로를 단단하게 다듬어주는 단련의 신호예요.',
      en: 'Your branches grind and press on each other. Friction that can feel stifling — but, passed through, it tempers and hardens you both.',
    },
  },
  자형: {
    feel: { ko: '스스로를 자극하는 결', en: 'a self-prodding grain' },
    blurb: {
      ko: '같은 글자가 겹쳐 스스로를 자극하는 자리예요. 닮은 만큼 서로의 예민한 부분을 똑같이 건드려, 알면서도 반복하게 되는 결이에요.',
      en: 'The same character doubles up and prods itself. Being alike, you press each other’s tender spots the same way — a grain you repeat even knowing it.',
    },
  },
  해: {
    feel: { ko: '미묘한 거리감', en: 'a subtle distance' },
    blurb: {
      ko: '두 사람의 지지 사이에 살짝 어긋나는 결이 끼는 자리예요. 큰 충돌은 아니어도 묘하게 손발이 안 맞는, 은근한 거리감의 신호예요.',
      en: 'A slightly off-key grain slips between your branches. Not a big clash, but a curious not-quite-in-step feeling — a signal of subtle distance.',
    },
  },
  파: {
    feel: { ko: '사소한 균열', en: 'a minor rupture' },
    blurb: {
      ko: '두 사람의 지지가 살짝 어그러지는 자리예요. 크게 깨지진 않아도 작은 금이 가는 듯한, 사소한 파열의 신호예요.',
      en: 'Your branches go slightly out of true. Nothing breaks hard, but a small crack forms — a signal of minor rupture.',
    },
  },
}

export const PILLAR_REL = mergeRec(PILLAR_REL_BASE, GENERATED.PILLAR_REL)

// ── 끌림/마찰 밴드 — 다섯 갈래 풀이 ─────────────────────────────────

const BAND_BASE: Record<string, BandCopy> = {
  eastern_hap: {
    what: {
      ko: '사주 글자끼리 손잡듯 묶이는 "합"의 정도',
      en: 'how much your Saju characters clasp together in "union"',
    },
    high: {
      ko: '서로를 끌어당기는 합이 여럿 잡혀, 사주끼리 자연스럽게 묶이는 편이에요.',
      en: 'Several unions pull you together — your charts bind naturally.',
    },
    low: {
      ko: '눈에 띄는 합은 적은 편이라, 끌림은 다른 자리(별자리·배우자성)에서 더 찾아봐요.',
      en: 'Few standout unions here — look to other spots (astro, spouse-stars) for the pull.',
    },
  },
  eastern_chung: {
    what: {
      ko: '사주 글자끼리 부딪히는 "충"이 적은 정도 (높을수록 충돌 적음)',
      en: 'how little your Saju characters clash (higher = less clash)',
    },
    high: {
      ko: '부딪히는 충이 거의 없어, 사주 결이 잔잔하게 흐르는 편이에요.',
      en: 'Almost no clashing — your Saju grain runs calm.',
    },
    low: {
      ko: '부딪히는 충이 여럿 잡혀, 변동과 자극이 큰 역동적인 결이에요.',
      en: 'Several clashes — a dynamic grain with movement and stimulation.',
    },
  },
  elements_match: {
    what: {
      ko: '서로의 모자란 기운을 채워주는 "오행 보완"의 정도',
      en: 'how much you fill in each other’s missing elements',
    },
    high: {
      ko: '한쪽에 옅은 기운을 다른 쪽이 진하게 가져, 서로를 잘 채워주는 편이에요.',
      en: 'What runs thin in one runs strong in the other — you fill each other in well.',
    },
    low: {
      ko: '기운 구성이 비슷한 편이라, 보완보다는 닮음으로 통하는 결이에요.',
      en: 'Your elemental makeups are alike — you connect through resemblance more than complement.',
    },
  },
  synastry_harmonic: {
    what: {
      ko: '별자리 행성끼리 부드럽게 흐르는 "조화"의 정도',
      en: 'how much your planets flow in gentle "harmony"',
    },
    high: {
      ko: '조화로운 각이 여럿이라, 별자리끼리 편안하게 통하는 편이에요.',
      en: 'Many harmonious angles — your charts connect with ease.',
    },
    low: {
      ko: '부드러운 각은 적은 편이라, 케미는 다른 결에서 더 도드라져요.',
      en: 'Few soft angles — the chemistry shows more in other strands.',
    },
  },
  synastry_tension: {
    what: {
      ko: '별자리 행성끼리 부딪히는 "긴장"이 적은 정도 (높을수록 긴장 적음)',
      en: 'how little your planets clash in "tension" (higher = less tension)',
    },
    high: {
      ko: '긴장각이 거의 없어, 별자리 결이 매끄럽게 흐르는 편이에요.',
      en: 'Almost no tense angles — your astro grain runs smooth.',
    },
    low: {
      ko: '긴장각이 여럿이라, 끌리면서도 조율이 필요한 자극적인 결이에요.',
      en: 'Several tense angles — a stimulating grain that draws yet asks for tuning.',
    },
  },
}

export const BAND = mergeRec(BAND_BASE, GENERATED.BAND)

// ── 행성 역할명 — 어스펙트 폴백·오버레이 색칠용 ─────────────────────

export const PLANET_FLAVOR: Record<string, Bi> = {
  Sun: { ko: '자아·정체성', en: 'core self' },
  Moon: { ko: '감정·정서', en: 'feelings' },
  Mercury: { ko: '대화·생각', en: 'talk and thinking' },
  Venus: { ko: '애정·매력', en: 'affection and charm' },
  Mars: { ko: '욕망·추진', en: 'desire and drive' },
  Jupiter: { ko: '확장·너그러움', en: 'expansion and generosity' },
  Saturn: { ko: '책임·시험', en: 'commitment and testing' },
  Uranus: { ko: '자극·변화', en: 'spark and change' },
  Neptune: { ko: '환상·이상', en: 'dream and idealization' },
  Pluto: { ko: '깊이·강렬함', en: 'depth and intensity' },
  Ascendant: { ko: '첫인상·태도', en: 'first impression' },
}

// src/lib/astrology/asteroidDictionary.ts
//
// Static narrative grid for the four major asteroids (Juno / Pallas /
// Ceres / Vesta) across the twelve zodiac signs. 4 × 12 = 48 entries.
//
// Each asteroid carries a distinct natural domain:
//   - Juno (결혼의 별 주노)    — marriage, partnership, the long-term bond
//   - Pallas (지혜의 별 팔라스) — wisdom, strategy, creative problem-solving
//   - Ceres (양육의 별 케레스) — nurturing, care, feeding, the parental signature
//   - Vesta (헌신의 별 베스타) — devotion, focus, the sacred flame
//
// Deterministic, offline, dependency-free. The LifeReport composer can
// pull these strings to ground asteroid prose; the result page can
// surface them directly when no LLM call is available.
//
// Voice: LifeReport 6th naturalization tone.
//   - ko: ~결 / ~사람이에요 / ~흐름
//   - en: natural English, 2-3 sentences

import type { ZodiacName } from './interpretations'

export type AsteroidName = 'Juno' | 'Pallas' | 'Ceres' | 'Vesta'

export interface AsteroidEntry {
  asteroid: AsteroidName
  sign: ZodiacName
  ko: string
  en: string
  keywords_ko: [string, string, string]
  keywords_en: [string, string, string]
}

// ============================================================
// JUNO — 결혼의 별 주노 (partnership, the long-term bond)
// ============================================================

const JUNO_ENTRIES: AsteroidEntry[] = [
  {
    asteroid: 'Juno',
    sign: 'Aries',
    ko: '결혼의 별 주노가 양자리에 자리해서, 직진하고 솔직한 파트너에게 끌려요. 함께 도전하고 활동적으로 움직이는 결합을 원하는 흐름이에요.',
    en: 'Juno in Aries draws you to a direct, candid partner. You want a union that moves, takes initiative, and shares challenges side by side.',
    keywords_ko: ['직진형 파트너', '활동적 결합', '솔직한 관계'],
    keywords_en: ['direct partner', 'active union', 'candid bond'],
  },
  {
    asteroid: 'Juno',
    sign: 'Taurus',
    ko: '결혼의 별 주노가 황소자리에 자리해서, 안정감 있고 감각적인 파트너에게 끌리는 모습이에요. 천천히 쌓이는 신뢰와 일상의 풍요를 함께 짓는 흐름.',
    en: 'Juno in Taurus draws you to a steady, sensual partner. You build trust slowly and want a union grounded in daily comfort and tangible loyalty.',
    keywords_ko: ['안정된 파트너', '감각적 결합', '쌓이는 신뢰'],
    keywords_en: ['steady partner', 'sensual union', 'slow trust'],
  },
  {
    asteroid: 'Juno',
    sign: 'Gemini',
    ko: '결혼의 별 주노가 쌍둥이자리에 자리해서, 말이 잘 통하고 호기심 많은 파트너에게 끌려요. 대화가 끊이지 않는 결합을 추구하는 사람이에요.',
    en: 'Juno in Gemini draws you to a verbal, curious partner. You seek a union where conversation never runs dry and ideas circulate freely.',
    keywords_ko: ['대화형 파트너', '지적 결합', '호기심 공유'],
    keywords_en: ['verbal partner', 'intellectual union', 'shared curiosity'],
  },
  {
    asteroid: 'Juno',
    sign: 'Cancer',
    ko: '결혼의 별 주노가 게자리에 자리해서, 가정적이고 정서적으로 안전한 파트너에게 끌려요. 깊이 보살피고 보살핌받는 결합을 추구해요.',
    en: 'Juno in Cancer draws you to a domestic, emotionally safe partner. You seek a union of deep mutual nurture and protection.',
    keywords_ko: ['가정적 파트너', '깊은 보살핌', '정서적 안전'],
    keywords_en: ['domestic partner', 'deep nurture', 'emotional safety'],
  },
  {
    asteroid: 'Juno',
    sign: 'Leo',
    ko: '결혼의 별 주노가 사자자리에 자리해서, 따뜻하고 충성스러운 파트너에게 끌리는 느낌이에요. 서로의 빛을 자랑스러워하는 결합을 원하는 흐름이에요.',
    en: 'Juno in Leo draws you to a warm, loyal, expressive partner. You want a union where each person is proud of the other and the bond is openly celebrated.',
    keywords_ko: ['따뜻한 파트너', '충성스러운 결합', '서로의 빛'],
    keywords_en: ['warm partner', 'loyal union', 'celebrated bond'],
  },
  {
    asteroid: 'Juno',
    sign: 'Virgo',
    ko: '결혼의 별 주노가 처녀자리에 자리해서, 성실하고 세심한 파트너에게 끌려요. 일상의 작은 돌봄으로 쌓이는 결합을 추구하는 사람이에요.',
    en: 'Juno in Virgo draws you to a conscientious, attentive partner. You build the union through small daily acts of care and shared responsibility.',
    keywords_ko: ['성실한 파트너', '세심한 돌봄', '일상의 결합'],
    keywords_en: ['conscientious partner', 'attentive care', 'daily union'],
  },
  {
    asteroid: 'Juno',
    sign: 'Libra',
    ko: '결혼의 별 주노가 천칭자리에 자리해서, 균형 잡힌 매너 있는 파트너에게 끌리는 스타일이에요. 동등한 파트너십을 짓는 흐름.',
    en: 'Juno in Libra draws you to a balanced, mannered partner. You build a union grounded in fairness, mutual courtesy, and equal standing.',
    keywords_ko: ['균형 잡힌 파트너', '동등한 관계', '매너 있는 결합'],
    keywords_en: ['balanced partner', 'equal standing', 'mannered union'],
  },
  {
    asteroid: 'Juno',
    sign: 'Scorpio',
    ko: '결혼의 별 주노가 전갈자리에 자리해서, 깊고 강렬한 파트너에게 끌려요. 모든 것을 함께 나누는 영혼의 결합을 추구하는 사람이에요.',
    en: 'Juno in Scorpio draws you to a deep, intense partner. You seek a soul-level union where nothing is held back and the bond is total.',
    keywords_ko: ['깊은 파트너', '영혼의 결합', '강렬한 신뢰'],
    keywords_en: ['deep partner', 'soul union', 'intense trust'],
  },
  {
    asteroid: 'Juno',
    sign: 'Sagittarius',
    ko: '결혼의 별 주노가 사수자리에 자리해서, 자유롭고 시야가 넓은 파트너에게 끌리는 모습이에요. 함께 멀리 보고 멀리 가는 결합을 원하는 흐름이에요.',
    en: 'Juno in Sagittarius draws you to a free-spirited, wide-horizon partner. You want a union that travels, learns, and grows across long distances together.',
    keywords_ko: ['자유로운 파트너', '확장하는 결합', '넓은 시야'],
    keywords_en: ['free-spirited partner', 'expansive union', 'wide horizons'],
  },
  {
    asteroid: 'Juno',
    sign: 'Capricorn',
    ko: '결혼의 별 주노가 염소자리에 자리해서, 책임감 있고 장기적 비전이 있는 파트너에게 끌려요. 시간으로 쌓이는 결합을 추구하는 사람이에요.',
    en: 'Juno in Capricorn draws you to a responsible, long-vision partner. You build a union slowly, through commitment that compounds over years.',
    keywords_ko: ['책임감 파트너', '장기적 결합', '시간의 신뢰'],
    keywords_en: ['responsible partner', 'long-term union', 'compounding trust'],
  },
  {
    asteroid: 'Juno',
    sign: 'Aquarius',
    ko: '결혼의 별 주노가 물병자리에 자리해서, 독립적이고 친구 같은 파트너에게 끌리는 느낌이에요. 자유를 존중하는 결합을 짓는 흐름.',
    en: 'Juno in Aquarius draws you to an independent, friend-like partner. You build a union that respects autonomy and shares a wider vision of the world.',
    keywords_ko: ['독립적 파트너', '친구 같은 결합', '자유 존중'],
    keywords_en: ['independent partner', 'friend-like union', 'mutual autonomy'],
  },
  {
    asteroid: 'Juno',
    sign: 'Pisces',
    ko: '결혼의 별 주노가 물고기자리에 자리해서, 공감 능력이 깊고 영적인 파트너에게 끌려요. 경계가 부드럽게 녹는 영적 결합을 원하는 사람이에요.',
    en: 'Juno in Pisces draws you to an empathic, spiritually attuned partner. You seek a union where boundaries soften and two inner worlds quietly merge.',
    keywords_ko: ['공감형 파트너', '영적 결합', '부드러운 경계'],
    keywords_en: ['empathic partner', 'spiritual union', 'soft boundaries'],
  },
]

// ============================================================
// PALLAS — 지혜의 별 팔라스 (strategy, creative problem-solving)
// ============================================================

const PALLAS_ENTRIES: AsteroidEntry[] = [
  {
    asteroid: 'Pallas',
    sign: 'Aries',
    ko: '지혜의 별 팔라스가 양자리에 자리해서, 빠르고 결단력 있는 전략을 펼치는 스타일이에요. 행동으로 문제를 푸는 흐름.',
    en: 'Pallas in Aries shows up as fast, decisive strategy. You solve problems by moving on them, learning through action rather than long deliberation.',
    keywords_ko: ['빠른 전략', '결단력', '행동 중심 지혜'],
    keywords_en: ['fast strategy', 'decisive mind', 'action-led wisdom'],
  },
  {
    asteroid: 'Pallas',
    sign: 'Taurus',
    ko: '지혜의 별 팔라스가 황소자리에 자리해서, 천천히 쌓아 올리는 실용적 전략을 펼쳐요. 손에 잡히는 결과를 설계하는 사람이에요.',
    en: 'Pallas in Taurus shows up as patient, practical strategy. You design solutions that produce tangible, durable results over time.',
    keywords_ko: ['실용적 전략', '꾸준한 설계', '손에 잡히는 결과'],
    keywords_en: ['practical strategy', 'patient design', 'tangible outcomes'],
  },
  {
    asteroid: 'Pallas',
    sign: 'Gemini',
    ko: '지혜의 별 팔라스가 쌍둥이자리에 자리해서, 분석적이고 다각도로 보는 지혜를 발휘해요. 여러 관점을 빠르게 연결하는 모습이에요.',
    en: 'Pallas in Gemini shows up as analytical, multi-angle insight. You connect viewpoints quickly and find the pattern hidden between them.',
    keywords_ko: ['분석적 지혜', '다각도 사고', '빠른 연결'],
    keywords_en: ['analytical wisdom', 'multi-angle thinking', 'quick connections'],
  },
  {
    asteroid: 'Pallas',
    sign: 'Cancer',
    ko: '지혜의 별 팔라스가 게자리에 자리해서, 정서를 읽어내는 직관적 전략을 펼치는 느낌이에요. 사람의 마음을 보호하며 푸는 흐름.',
    en: 'Pallas in Cancer shows up as intuitive, feeling-aware strategy. You read the emotional terrain of a situation and solve problems while protecting people.',
    keywords_ko: ['정서적 직관', '보호하는 전략', '마음을 읽는 지혜'],
    keywords_en: ['emotional intuition', 'protective strategy', 'feeling-aware wisdom'],
  },
  {
    asteroid: 'Pallas',
    sign: 'Leo',
    ko: '지혜의 별 팔라스가 사자자리에 자리해서, 창조적이고 표현력 있는 전략을 펼쳐요. 큰 그림을 그리고 무대 위에서 푸는 사람이에요.',
    en: 'Pallas in Leo shows up as creative, expressive strategy. You sketch the big picture boldly and solve problems with style and visible confidence.',
    keywords_ko: ['창조적 전략', '큰 그림', '표현력 있는 지혜'],
    keywords_en: ['creative strategy', 'big-picture mind', 'expressive wisdom'],
  },
  {
    asteroid: 'Pallas',
    sign: 'Virgo',
    ko: '지혜의 별 팔라스가 처녀자리에 자리해서, 정밀하고 분석적인 전략을 펼치는 스타일이에요. 디테일에서 해법을 찾는 흐름이에요.',
    en: 'Pallas in Virgo shows up as precise, analytical strategy. You find solutions in the details and craft systems that run cleanly.',
    keywords_ko: ['정밀한 전략', '분석적 지혜', '디테일의 해법'],
    keywords_en: ['precise strategy', 'analytical wisdom', 'detailed solutions'],
  },
  {
    asteroid: 'Pallas',
    sign: 'Libra',
    ko: '지혜의 별 팔라스가 천칭자리에 자리해서, 균형을 보고 양쪽을 조율하는 지혜를 발휘해요. 관계 속에서 해법을 짓는 사람이에요.',
    en: 'Pallas in Libra shows up as balancing, mediating wisdom. You see both sides cleanly and design solutions that hold relational harmony.',
    keywords_ko: ['균형의 지혜', '조율하는 전략', '관계적 해법'],
    keywords_en: ['balancing wisdom', 'mediating strategy', 'relational solutions'],
  },
  {
    asteroid: 'Pallas',
    sign: 'Scorpio',
    ko: '지혜의 별 팔라스가 전갈자리에 자리해서, 표면 아래를 꿰뚫는 통찰력을 발휘해요. 숨은 동기와 구조를 보는 모습이에요.',
    en: 'Pallas in Scorpio shows up as penetrating, investigative insight. You see hidden motives and structural undercurrents others miss.',
    keywords_ko: ['꿰뚫는 통찰', '숨은 동기', '깊이의 전략'],
    keywords_en: ['penetrating insight', 'hidden motives', 'deep strategy'],
  },
  {
    asteroid: 'Pallas',
    sign: 'Sagittarius',
    ko: '지혜의 별 팔라스가 사수자리에 자리해서, 시야가 넓고 철학적인 전략을 펼치는 느낌이에요. 큰 의미와 방향을 보는 흐름.',
    en: 'Pallas in Sagittarius shows up as wide-vision, philosophical strategy. You spot the larger meaning and orient toward long horizons.',
    keywords_ko: ['넓은 시야', '철학적 전략', '큰 의미'],
    keywords_en: ['wide vision', 'philosophical strategy', 'larger meaning'],
  },
  {
    asteroid: 'Pallas',
    sign: 'Capricorn',
    ko: '지혜의 별 팔라스가 염소자리에 자리해서, 구조적이고 장기적인 전략을 펼쳐요. 단계를 설계하고 실행으로 옮기는 사람이에요.',
    en: 'Pallas in Capricorn shows up as structured, long-range strategy. You design the architecture and translate it into executable stages.',
    keywords_ko: ['구조적 전략', '장기 설계', '실행의 지혜'],
    keywords_en: ['structured strategy', 'long-range design', 'executable wisdom'],
  },
  {
    asteroid: 'Pallas',
    sign: 'Aquarius',
    ko: '지혜의 별 팔라스가 물병자리에 자리해서, 혁신적이고 미래 지향적인 통찰을 발휘해요. 기존 틀을 넘어 새로운 시스템을 보는 스타일이에요.',
    en: 'Pallas in Aquarius shows up as innovative, future-oriented insight. You see new systems beyond conventional frames.',
    keywords_ko: ['혁신적 통찰', '미래 비전', '시스템 사고'],
    keywords_en: ['innovative insight', 'future vision', 'systems thinking'],
  },
  {
    asteroid: 'Pallas',
    sign: 'Pisces',
    ko: '지혜의 별 팔라스가 물고기자리에 자리해서, 직관적이고 상상력 있는 지혜를 발휘하는 모습이에요. 이미지와 꿈으로 해법을 찾는 흐름.',
    en: 'Pallas in Pisces shows up as intuitive, imaginative wisdom. You find solutions through images, dreams, and quiet inner knowing.',
    keywords_ko: ['직관적 지혜', '상상력의 전략', '이미지의 해법'],
    keywords_en: ['intuitive wisdom', 'imaginative strategy', 'image-led solutions'],
  },
]

// ============================================================
// CERES — 양육의 별 케레스 (nurturing, feeding, parental signature)
// ============================================================

const CERES_ENTRIES: AsteroidEntry[] = [
  {
    asteroid: 'Ceres',
    sign: 'Aries',
    ko: '양육의 별 케레스가 양자리에 자리해서, 적극적이고 활동적으로 돌보는 느낌이에요. 자립을 격려하며 보살피는 흐름.',
    en: 'Ceres in Aries nurtures actively and energetically. You care by encouraging independence and pushing the people you love to stand on their own feet.',
    keywords_ko: ['적극적 돌봄', '자립 격려', '활동적 양육'],
    keywords_en: ['active care', 'independence-building', 'energetic nurture'],
  },
  {
    asteroid: 'Ceres',
    sign: 'Taurus',
    ko: '양육의 별 케레스가 황소자리에 자리해서, 풍요롭고 감각적으로 돌봐요. 따뜻한 음식과 일상의 안정으로 보살피는 사람이에요.',
    en: 'Ceres in Taurus nurtures through abundance and the senses. You care with warm meals, physical comfort, and steady daily reliability.',
    keywords_ko: ['풍요로운 돌봄', '감각적 양육', '일상의 안정'],
    keywords_en: ['abundant care', 'sensual nurture', 'steady comfort'],
  },
  {
    asteroid: 'Ceres',
    sign: 'Gemini',
    ko: '양육의 별 케레스가 쌍둥이자리에 자리해서, 대화와 정보로 돌보는 스타일이에요. 말을 들어주고 가르치며 보살피는 흐름.',
    en: 'Ceres in Gemini nurtures through conversation and information. You care by listening, teaching, and keeping a constant channel of communication open.',
    keywords_ko: ['대화로 돌봄', '듣는 양육', '가르치는 보살핌'],
    keywords_en: ['conversational care', 'listening nurture', 'teaching support'],
  },
  {
    asteroid: 'Ceres',
    sign: 'Cancer',
    ko: '양육의 별 케레스가 게자리에 자리해서, 깊고 본능적인 모성적 돌봄을 펼쳐요. 가정 자체가 양육의 무대가 되는 모습이에요.',
    en: 'Ceres in Cancer nurtures with deep, instinctive maternal care. Home itself becomes the stage for how you protect and feed the people you love.',
    keywords_ko: ['깊은 모성적 돌봄', '본능적 양육', '가정 중심'],
    keywords_en: ['deep maternal care', 'instinctive nurture', 'home-centered'],
  },
  {
    asteroid: 'Ceres',
    sign: 'Leo',
    ko: '양육의 별 케레스가 사자자리에 자리해서, 따뜻하고 너그럽게 돌보는 느낌이에요. 상대의 빛을 비춰주며 보살피는 흐름.',
    en: 'Ceres in Leo nurtures warmly and generously. You care by reflecting the other person back to themselves, helping them shine and feel seen.',
    keywords_ko: ['따뜻한 돌봄', '너그러운 양육', '빛을 비추는 보살핌'],
    keywords_en: ['warm care', 'generous nurture', 'spotlight support'],
  },
  {
    asteroid: 'Ceres',
    sign: 'Virgo',
    ko: '양육의 별 케레스가 처녀자리에 자리해서, 세심하고 실용적으로 돌봐요. 식사와 건강과 일과를 챙기며 보살피는 사람이에요.',
    en: 'Ceres in Virgo nurtures with detailed, practical care. You look after meals, health, and daily routines, expressing love through quiet competence.',
    keywords_ko: ['세심한 헌신', '실용적 돌봄', '건강을 챙김'],
    keywords_en: ['detailed care', 'practical nurture', 'health-minded support'],
  },
  {
    asteroid: 'Ceres',
    sign: 'Libra',
    ko: '양육의 별 케레스가 천칭자리에 자리해서, 조화롭고 아름답게 돌보는 스타일이에요. 관계의 균형으로 보살피는 흐름이에요.',
    en: 'Ceres in Libra nurtures through harmony and beauty. You care by creating balanced spaces and tending the relationship itself with grace.',
    keywords_ko: ['조화로운 돌봄', '관계의 양육', '아름다운 보살핌'],
    keywords_en: ['harmonious care', 'relational nurture', 'graceful support'],
  },
  {
    asteroid: 'Ceres',
    sign: 'Scorpio',
    ko: '양육의 별 케레스가 전갈자리에 자리해서, 깊고 강렬한 방식으로 돌봐요. 표면적 양육보다는 영혼의 변용을 함께 견디는 모습이에요.',
    en: 'Ceres in Scorpio nurtures in deep, intense ways. Rather than surface care, you walk through soul transformation together.',
    keywords_ko: ['깊은 양육', '강렬한 결합', '변용의 돌봄'],
    keywords_en: ['deep nurture', 'intense bond', 'transformative care'],
  },
  {
    asteroid: 'Ceres',
    sign: 'Sagittarius',
    ko: '양육의 별 케레스가 사수자리에 자리해서, 넓고 자유롭게 돌보는 느낌이에요. 경험과 모험을 선물하며 보살피는 흐름.',
    en: 'Ceres in Sagittarius nurtures with breadth and freedom. You care by sharing experience and adventure, giving the gift of wider horizons.',
    keywords_ko: ['넓은 돌봄', '자유로운 양육', '경험의 보살핌'],
    keywords_en: ['expansive care', 'freedom-giving nurture', 'experiential support'],
  },
  {
    asteroid: 'Ceres',
    sign: 'Capricorn',
    ko: '양육의 별 케레스가 염소자리에 자리해서, 책임감 있고 구조적으로 돌봐요. 안정과 미래를 설계하며 보살피는 사람이에요.',
    en: 'Ceres in Capricorn nurtures with responsibility and structure. You care by building stability and quietly engineering the long-term security of those you love.',
    keywords_ko: ['책임감 돌봄', '구조적 양육', '미래를 설계하는 보살핌'],
    keywords_en: ['responsible care', 'structural nurture', 'future-building support'],
  },
  {
    asteroid: 'Ceres',
    sign: 'Aquarius',
    ko: '양육의 별 케레스가 물병자리에 자리해서, 독립을 존중하며 돌보는 스타일이에요. 친구처럼 곁에서 보살피는 흐름이에요.',
    en: 'Ceres in Aquarius nurtures while respecting autonomy. You care like a steady friend, present without smothering, supportive without controlling.',
    keywords_ko: ['독립 존중 돌봄', '친구 같은 양육', '곁에서 보살핌'],
    keywords_en: ['autonomy-respecting care', 'friend-like nurture', 'supportive presence'],
  },
  {
    asteroid: 'Ceres',
    sign: 'Pisces',
    ko: '양육의 별 케레스가 물고기자리에 자리해서, 공감과 자비로 돌보는 모습이에요. 말 없이도 알아주는 보살핌의 흐름.',
    en: 'Ceres in Pisces nurtures through empathy and quiet compassion. You care in a wordless way, sensing what someone needs before they ask.',
    keywords_ko: ['공감의 돌봄', '자비로운 양육', '말 없는 보살핌'],
    keywords_en: ['empathic care', 'compassionate nurture', 'wordless support'],
  },
]

// ============================================================
// VESTA — 헌신의 별 베스타 (devotion, sacred flame, focus)
// ============================================================

const VESTA_ENTRIES: AsteroidEntry[] = [
  {
    asteroid: 'Vesta',
    sign: 'Aries',
    ko: '헌신의 별 베스타가 양자리에 자리해서, 자기 시작과 용기에 헌신하는 느낌이에요. 불꽃을 일으키는 일에 집중하는 흐름.',
    en: 'Vesta in Aries devotes its flame to fresh starts and courage. You focus on the work of igniting things and being the first mover.',
    keywords_ko: ['시작에 헌신', '용기의 집중', '불꽃 일으키기'],
    keywords_en: ['devotion to beginnings', 'focused courage', 'kindling work'],
  },
  {
    asteroid: 'Vesta',
    sign: 'Taurus',
    ko: '헌신의 별 베스타가 황소자리에 자리해서, 꾸준한 가치와 안정에 헌신하는 스타일이에요. 오래 가는 일을 묵묵히 짓는 흐름이에요.',
    en: 'Vesta in Taurus devotes itself to lasting value and steady ground. You focus on the slow craft of building things that endure.',
    keywords_ko: ['꾸준한 헌신', '안정에 집중', '오래 가는 일'],
    keywords_en: ['steady devotion', 'focus on stability', 'enduring craft'],
  },
  {
    asteroid: 'Vesta',
    sign: 'Gemini',
    ko: '헌신의 별 베스타가 쌍둥이자리에 자리해서, 배움과 소통에 헌신하는 모습이에요. 말과 글로 불꽃을 지키는 사람.',
    en: 'Vesta in Gemini devotes its flame to learning and communication. You keep the fire alive through words, writing, and the work of staying curious.',
    keywords_ko: ['배움의 헌신', '소통에 집중', '말로 지키는 불꽃'],
    keywords_en: ['devotion to learning', 'focused communication', 'flame in words'],
  },
  {
    asteroid: 'Vesta',
    sign: 'Cancer',
    ko: '헌신의 별 베스타가 게자리에 자리해서, 가정과 정서적 뿌리에 헌신해요. 집안의 불꽃을 지키는 사람이에요.',
    en: 'Vesta in Cancer devotes itself to home and emotional roots. You are the one who tends the inner hearth and keeps the family flame alive.',
    keywords_ko: ['가정에 헌신', '정서적 뿌리', '집안의 불꽃'],
    keywords_en: ['devotion to home', 'emotional roots', 'inner hearth'],
  },
  {
    asteroid: 'Vesta',
    sign: 'Leo',
    ko: '헌신의 별 베스타가 사자자리에 자리해서, 창조와 표현에 헌신하는 느낌이에요. 자기 빛을 다듬는 작업에 집중하는 흐름이에요.',
    en: 'Vesta in Leo devotes its flame to creation and expression. You focus on the slow work of refining your own light and offering it openly.',
    keywords_ko: ['창조에 헌신', '표현의 집중', '빛을 다듬기'],
    keywords_en: ['devotion to creation', 'focused expression', 'refining the light'],
  },
  {
    asteroid: 'Vesta',
    sign: 'Virgo',
    ko: '헌신의 별 베스타가 처녀자리에 자리해서, 세심하고 정밀한 헌신을 펼쳐요. 작은 디테일을 끝까지 다듬는 결의 사람이에요.',
    en: 'Vesta in Virgo devotes itself with detail and precision. You focus on the patient craft of refining small things until they run cleanly.',
    keywords_ko: ['세심한 헌신', '정밀한 집중', '디테일의 장인'],
    keywords_en: ['detailed devotion', 'precise focus', 'craftsmanship'],
  },
  {
    asteroid: 'Vesta',
    sign: 'Libra',
    ko: '헌신의 별 베스타가 천칭자리에 자리해서, 관계와 균형에 헌신하는 스타일이에요. 조화를 짓는 일에 불꽃을 두는 흐름.',
    en: 'Vesta in Libra devotes its flame to relationship and balance. You focus your sacred energy on the work of harmonizing people and spaces.',
    keywords_ko: ['관계에 헌신', '균형에 집중', '조화의 불꽃'],
    keywords_en: ['devotion to relationship', 'focus on balance', 'flame of harmony'],
  },
  {
    asteroid: 'Vesta',
    sign: 'Scorpio',
    ko: '헌신의 별 베스타가 전갈자리에 자리해서, 깊은 변용과 진실에 헌신하는 모습이에요. 표면 아래의 신성한 일에 집중하는 흐름이에요.',
    en: 'Vesta in Scorpio devotes itself to transformation and truth. You focus on the sacred work happening beneath the surface, in the depths.',
    keywords_ko: ['변용에 헌신', '진실의 집중', '깊이의 신성함'],
    keywords_en: ['devotion to transformation', 'focused truth', 'sacred depth'],
  },
  {
    asteroid: 'Vesta',
    sign: 'Sagittarius',
    ko: '헌신의 별 베스타가 사수자리에 자리해서, 신념과 의미에 헌신하는 느낌이에요. 큰 비전을 향해 불꽃을 지키는 사람.',
    en: 'Vesta in Sagittarius devotes its flame to belief and meaning. You focus on holding a larger vision steady and tending the philosophical fire.',
    keywords_ko: ['신념에 헌신', '의미의 집중', '비전의 불꽃'],
    keywords_en: ['devotion to belief', 'focused meaning', 'flame of vision'],
  },
  {
    asteroid: 'Vesta',
    sign: 'Capricorn',
    ko: '헌신의 별 베스타가 염소자리에 자리해서, 책임과 장기적 일에 헌신해요. 자기 일의 구조에 평생을 들이는 스타일이에요.',
    en: 'Vesta in Capricorn devotes itself to responsibility and long work. You focus on the structure of your craft and give it the patience of a lifetime.',
    keywords_ko: ['책임에 헌신', '장기적 집중', '일의 구조'],
    keywords_en: ['devotion to responsibility', 'long-term focus', 'structured craft'],
  },
  {
    asteroid: 'Vesta',
    sign: 'Aquarius',
    ko: '헌신의 별 베스타가 물병자리에 자리해서, 미래와 공동체에 헌신하는 모습이에요. 더 넓은 그림을 위한 신성한 일에 집중하는 흐름.',
    en: 'Vesta in Aquarius devotes its flame to the future and the collective. You focus your sacred work on something larger than yourself.',
    keywords_ko: ['미래에 헌신', '공동체의 집중', '넓은 그림'],
    keywords_en: ['devotion to the future', 'focus on the collective', 'wider picture'],
  },
  {
    asteroid: 'Vesta',
    sign: 'Pisces',
    ko: '헌신의 별 베스타가 물고기자리에 자리해서, 영적이고 자비로운 헌신을 펼쳐요. 보이지 않는 일에 불꽃을 두는 사람이에요.',
    en: 'Vesta in Pisces devotes itself to the spiritual and the compassionate. You focus your flame on the unseen work that quietly holds the world together.',
    keywords_ko: ['영적 헌신', '자비의 집중', '보이지 않는 일'],
    keywords_en: ['spiritual devotion', 'compassionate focus', 'unseen work'],
  },
]

// ============================================================
// Combined dictionary — 4 × 12 = 48 entries
// ============================================================

export const ASTEROID_DICTIONARY: AsteroidEntry[] = [
  ...JUNO_ENTRIES,
  ...PALLAS_ENTRIES,
  ...CERES_ENTRIES,
  ...VESTA_ENTRIES,
]

// ============================================================
// Helpers
// ============================================================

/**
 * Look up a single asteroid × sign entry. Returns null when no entry
 * matches (defensive — the static grid is intentionally full).
 */
export function findAsteroidEntry(
  asteroid: AsteroidName,
  sign: ZodiacName,
): AsteroidEntry | null {
  const hit = ASTEROID_DICTIONARY.find(
    (entry) => entry.asteroid === asteroid && entry.sign === sign,
  )
  return hit ?? null
}

/**
 * Return all 12 entries for a given asteroid, in zodiac order
 * (Aries → Pisces).
 */
export function listAsteroidEntries(asteroid: AsteroidName): AsteroidEntry[] {
  return ASTEROID_DICTIONARY.filter((entry) => entry.asteroid === asteroid)
}

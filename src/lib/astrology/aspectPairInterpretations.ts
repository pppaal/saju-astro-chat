// src/lib/astrology/aspectPairInterpretations.ts
//
// Planet-pair × aspect-kind interpretations (KO + EN).
//
// Strategy: function-based defaults + curated overrides for the most
// canonical pairs. Each planet has a "function" that the aspect kind
// modifies; the resulting line is always grounded but specific pairs
// override with traditional wording (Sun-Saturn, Venus-Mars, etc.).

import type { AspectKind, AstroPlanetName } from './interpretations'

interface Line {
  ko: string
  en: string
}

const PLANET_FN_KO: Record<AstroPlanetName, string> = {
  Sun: '의식·정체성',
  Moon: '정서·돌봄·습관',
  Mercury: '사고·말',
  Venus: '애정·가치',
  Mars: '추진·욕망',
  Jupiter: '확장·신념',
  Saturn: '구조·책임',
  Uranus: '단절·혁신',
  Neptune: '꿈·영성',
  Pluto: '심층 변용·권력',
  Ascendant: '외부 페르소나',
}

const PLANET_FN_EN: Record<AstroPlanetName, string> = {
  Sun: 'identity and vitality',
  Moon: 'feeling, habit, care',
  Mercury: 'thought and speech',
  Venus: 'love and value',
  Mars: 'drive and desire',
  Jupiter: 'expansion and belief',
  Saturn: 'structure and responsibility',
  Uranus: 'rupture and innovation',
  Neptune: 'dream and spirit',
  Pluto: 'depth-transformation and power',
  Ascendant: 'outer persona',
}

const ASPECT_VERB: Record<AspectKind, Line> = {
  conjunction: { ko: '하나로 융합되어', en: 'fuse into one block;' },
  sextile: { ko: '협력 기회로 만나', en: 'meet as a cooperative opportunity;' },
  square: { ko: '서로 마찰을 일으켜', en: 'rub against each other;' },
  trine: { ko: '자연스럽게 흐름을 만들어', en: 'flow naturally together;' },
  opposition: { ko: '양극으로 마주서서', en: 'stand at opposite poles;' },
}

// Curated overrides — canonical pairs. Keys are sorted "A-B" alphabetically.
const PAIR_OVERRIDES: Record<string, Partial<Record<AspectKind, Line>>> = {
  'Moon-Sun': {
    conjunction: { ko: '내면(달)과 자아(태양)가 한 덩어리. 강력한 자기 일치, 감정과 의식 분리 어려움.', en: 'Inner self (Moon) and identity (Sun) fuse — strong self-coherence; hard to separate emotion from will.' },
    opposition: { ko: '달과 태양 충 — 내적 욕구와 의식적 자아 사이의 영구적 균형 과제.', en: 'Lunar–solar opposition — lifelong balancing of inner need vs conscious will.' },
    square: { ko: '달과 태양 사각 — 어린 시절부터 욕구와 의지의 충돌이 성장 동력.', en: 'Square between need and will — friction since early life that drives growth.' },
    trine: { ko: '내면과 외면의 자연스러운 일치. 자기 표현이 정서와 합치.', en: 'Natural alignment between inner and outer self.' },
  },
  'Mercury-Sun': {
    conjunction: { ko: '사고와 자아가 일치. 말이 곧 자기. 객관성보다 자기 색이 강함.', en: 'Mind and identity fuse; speech *is* self. Strong personal voice over objectivity.' },
    sextile: { ko: '말이 자아 표현 도구로 자연스럽게 작동.', en: 'Voice naturally serves identity.' },
  },
  'Sun-Venus': {
    conjunction: { ko: '자아와 애정이 융합 — 매력·미적 감각이 정체성의 일부.', en: 'Identity and love fuse — charm and aesthetic are part of self.' },
    trine: { ko: '자아와 애정의 자연스러운 흐름 — 사랑이 자기 표현.', en: 'Natural flow between self and love — affection as self-expression.' },
  },
  'Mars-Sun': {
    conjunction: { ko: '의지와 추진력이 한 덩어리. 강한 행동력·경쟁 본능.', en: 'Will and drive fuse — strong action and competitive instinct.' },
    square: { ko: '의지와 추진력의 충돌 — 자기 자신과 싸우는 패턴.', en: 'Will vs drive friction — pattern of fighting oneself.' },
    opposition: { ko: '자아와 추진력의 양극화 — 외부와의 마찰을 통해 자기 의지 발견.', en: 'Polarised will vs drive — discover one’s will through external friction.' },
  },
  'Jupiter-Sun': {
    conjunction: { ko: '자아 확장의 본거지 — 자신감·낙관이 정체성.', en: 'Self-expansion at home — confidence and optimism *as* identity.' },
    trine: { ko: '자연스러운 행운·확장 — 자기 신뢰가 정통적 강점.', en: 'Natural luck and expansion — self-trust as classical strength.' },
    square: { ko: '과도한 확장의 시험 — 절제 없이 부풀어오르는 패턴.', en: 'Test of over-expansion — bloating without restraint.' },
  },
  'Saturn-Sun': {
    conjunction: { ko: '책임감이 자아의 핵 — 빨리 어른이 되는 패턴.', en: 'Responsibility *as* core identity — pattern of premature adulthood.' },
    square: { ko: '권위와의 마찰을 통해 자기 권위를 세우는 길.', en: 'Build personal authority through friction with authority.' },
    opposition: { ko: '자아와 구조의 양극화 — 시간이 지날수록 권위가 자기에게 돌아옴.', en: 'Self vs structure polarised — over time, authority returns to the self.' },
    trine: { ko: '자연스러운 자기 규율 — 책임이 부담 아닌 안정.', en: 'Natural self-discipline — responsibility as ground, not burden.' },
  },
  'Pluto-Sun': {
    conjunction: { ko: '강박적 자아 — 평생 "다시 태어나는" 사이클을 반복.', en: 'Compulsive self — life-long cycles of small deaths and rebirth.' },
    square: { ko: '권력 갈등을 통해 자기 의지의 진정성을 시험.', en: 'Tested through power conflicts to authenticate the will.' },
    opposition: { ko: '외부 권력 인물과의 양극화로 자기 권력을 회복.', en: 'Polarised against power figures to reclaim one’s own power.' },
  },
  'Uranus-Sun': {
    conjunction: { ko: '예측불허의 자아 — 자유와 독립이 핵심', en: 'Unpredictable self — freedom and independence as core' },
    square: { ko: '갑작스러운 단절을 통해 자기 자유를 발견', en: 'Sudden ruptures reveal personal freedom' },
  },
  'Neptune-Sun': {
    conjunction: { ko: '경계가 흐린 자아 — 예술·영성이 정체성', en: 'Soft-boundary self — art and spirit *as* identity' },
    square: { ko: '환상과 자기 사이의 마찰 — 자기 진실을 찾는 과제', en: 'Friction between illusion and self — task of finding personal truth' },
  },
  'Mars-Venus': {
    conjunction: { ko: '욕망과 애정의 융합 — 강력한 끌림·섹슈얼한 자석', en: 'Desire and love fuse — magnetic, sexual charge' },
    square: { ko: '욕망과 애정의 마찰 — 사랑하는 방식과 싸우는 방식의 충돌', en: 'Friction between desire and love — pattern of fighting the way one loves' },
    opposition: { ko: '욕망과 애정의 양극화 — 관계 안의 추격·도주 패턴', en: 'Desire vs love polarised — chase / flee dynamic in relationships' },
    trine: { ko: '욕망과 애정의 자연스러운 흐름 — 매력적·열정적', en: 'Natural flow of desire and love — charismatic and passionate' },
    sextile: { ko: '욕망과 애정의 협력적 흐름', en: 'Cooperative flow of desire and love' },
  },
  'Saturn-Venus': {
    conjunction: { ko: '사랑과 책임의 융합 — 진중·헌신적, 가치 평가 깐깐', en: 'Love fused with duty — serious, committed, demanding in value' },
    square: { ko: '사랑의 시험 — 거절·결핍을 통과하며 진짜 가치를 짓는 과제', en: 'Love tested — building genuine value through rejection and lack' },
    opposition: { ko: '사랑과 구조의 양극화 — 헌신과 자유 사이 균형', en: 'Love vs structure polarised — balance between commitment and freedom' },
    trine: { ko: '진중한 사랑·장기 가치 빌드의 자연스러운 흐름', en: 'Natural flow of mature love and long-term value' },
  },
  'Jupiter-Venus': {
    conjunction: { ko: '풍요·관대함의 융합 — 사랑과 자원이 함께 풍성', en: 'Abundance fused with love — wealth and affection together' },
    trine: { ko: '사랑·자원의 정통적 행운', en: 'Classical luck in love and resources' },
    square: { ko: '과도한 관대함의 시험 — 가치 평가의 과장', en: 'Test of over-generosity — inflated valuation' },
  },
  'Mars-Saturn': {
    conjunction: { ko: '추진과 억제의 융합 — 좌절을 통해 단련된 의지', en: 'Drive fused with restraint — will tempered through frustration' },
    square: { ko: '추진과 구조의 마찰 — 행동이 막히는 패턴, 인내 학습', en: 'Drive vs structure friction — pattern of blocked action, learning patience' },
    opposition: { ko: '추진과 책임의 양극화 — 외부 한계와 자기 의지의 균형', en: 'Drive vs responsibility polarised — balancing external limits and personal will' },
    trine: { ko: '훈련된 행동 — 추진력과 끈기의 정통적 강점', en: 'Disciplined action — classical strength of drive plus persistence' },
  },
  'Jupiter-Mars': {
    conjunction: { ko: '확장된 추진력 — 기업가적·과감한 행동', en: 'Expanded drive — entrepreneurial, bold action' },
    square: { ko: '과잉 추진의 시험 — 무모함의 학습 곡선', en: 'Test of over-drive — learning curve of recklessness' },
    trine: { ko: '낙관적·확장적 추진력', en: 'Optimistic, expansive drive' },
  },
  'Mercury-Moon': {
    conjunction: { ko: '말과 감정의 융합 — 정서적 사고, 감정이 곧 언어', en: 'Speech fused with feeling — emotional thinker, feeling becomes language' },
    square: { ko: '머리와 가슴의 마찰 — 정서 처리에 사고가 끼어드는 패턴', en: 'Head vs heart friction — pattern of over-thinking emotion' },
    opposition: { ko: '머리와 가슴의 양극화 — 객관성과 정서 사이 균형', en: 'Head vs heart polarised — balance objectivity with feeling' },
    trine: { ko: '말과 정서의 자연스러운 일치 — 표현력', en: 'Natural alignment of speech and emotion — expressive' },
  },
  'Mercury-Saturn': {
    conjunction: { ko: '사고의 구조화 — 정밀하고 무거운 마음', en: 'Structured mind — precise and heavy in tone' },
    square: { ko: '사고와 권위의 마찰 — 자기 의심·검열의 학습', en: 'Mind vs authority friction — learning self-doubt and self-censorship' },
    trine: { ko: '훈련된 사고 — 정밀·끈기의 자연스러운 흐름', en: 'Disciplined mind — natural flow of precision and persistence' },
  },
  'Mercury-Mars': {
    conjunction: { ko: '말과 추진의 융합 — 직설·전사형 사고', en: 'Speech fused with drive — direct, warrior-style thinking' },
    square: { ko: '말과 행동의 마찰 — 충동적 발언 패턴', en: 'Mind vs action friction — pattern of impulsive speech' },
  },
  'Mars-Moon': {
    conjunction: { ko: '정서와 추진의 융합 — 보호 본능, 즉각적 감정 행동', en: 'Feeling fused with drive — protective instinct, immediate emotional action' },
    square: { ko: '정서와 추진의 마찰 — 감정 폭발 패턴, 분노 처리 학습', en: 'Feeling vs drive friction — pattern of emotional eruption, learning anger' },
  },
  'Pluto-Venus': {
    conjunction: { ko: '강렬한 사랑·집착의 본거지 — 친밀이 곧 변용', en: 'Intense love at home — intimacy *is* transformation' },
    square: { ko: '사랑 안의 권력 마찰 — 통제·소유·질투 학습', en: 'Power friction in love — learning control, ownership, jealousy' },
    trine: { ko: '깊고 변용적인 사랑의 자연스러운 흐름', en: 'Natural flow of deep, transformative love' },
  },
  'Pluto-Moon': {
    conjunction: { ko: '강렬한 정서적 변용 — 어두운 감정의 발굴', en: 'Intense emotional transformation — excavation of shadow feeling' },
    square: { ko: '정서적 권력 마찰 — 가족 트라우마의 표면화', en: 'Emotional power friction — family trauma surfaces' },
  },
  'Pluto-Mars': {
    conjunction: { ko: '강렬한 의지·권력 의지의 본거지', en: 'Intense will / power-drive at home' },
    square: { ko: '의지와 변용의 마찰 — 통제 게임 학습', en: 'Will vs transformation friction — learning control games' },
  },
  'Saturn-Jupiter': {
    conjunction: { ko: '확장과 구조의 융합 — 현실화된 성공의 점', en: 'Expansion fused with structure — point of materialised success' },
    square: { ko: '확장과 절제의 마찰 — 너무 큰 비전과 너무 좁은 그릇', en: 'Expansion vs restraint friction — vision too big for the cup' },
    opposition: { ko: '확장과 한계의 양극화 — 신념과 현실의 균형', en: 'Expansion vs limit polarised — balance belief and reality' },
    trine: { ko: '확장과 구조의 자연스러운 흐름 — 장기 성공의 정통적 자리', en: 'Natural flow of expansion and structure — classical sign of long success' },
  },
  'Saturn-Moon': {
    conjunction: { ko: '정서와 책임의 융합 — 무거운 정서, 빨리 어른이 됨', en: 'Feeling fused with responsibility — heavy emotion, premature adulthood' },
    square: { ko: '정서와 권위의 마찰 — 정서적 결핍·억제의 학습', en: 'Feeling vs authority friction — learning emotional restraint and lack' },
  },
  'Uranus-Mercury': {
    conjunction: { ko: '사고의 혁신 — 천재적 통찰, 갑작스러운 인사이트', en: 'Innovative mind — flashes of genius, sudden insight' },
    square: { ko: '사고의 단절 — 충동적 발언, 학교 적응 어려움', en: 'Mind disrupted — impulsive speech, school misfit' },
  },
  'Neptune-Mercury': {
    conjunction: { ko: '직관적 사고 — 시적·이미지 기반 마음', en: 'Intuitive mind — poetic, image-based' },
    square: { ko: '사고의 안개 — 환상과 사실의 분리 학습', en: 'Mind in fog — learning to separate illusion from fact' },
  },
  'Saturn-Mercury': {
    conjunction: { ko: '구조화된 마음 — 깊이·정밀하지만 무겁다', en: 'Structured mind — deep and precise but heavy' },
    square: { ko: '사고의 시험 — 자기 의심을 끊고 표현 학습', en: 'Mind tested — learning to break self-doubt and speak' },
  },
}

// Lunar Nodes / extra points show up in the engine as 'True Node',
// 'Mean Node', 'North Node', 'Chiron', 'Lilith' etc. — give them a
// soft function label so the fallback line never reads "undefined".
const SOFT_FN_KO: Record<string, string> = {
  'True Node': '영혼 방향(노스 노드)',
  'Mean Node': '영혼 방향(노스 노드)',
  'North Node': '영혼 방향(노스 노드)',
  'South Node': '카르마(사우스 노드)',
  'Chiron': '상처·치유(카이론)',
  'Lilith': '억압된 야생(릴리스)',
  'Part of Fortune': '행운의 점',
  'Vertex': '운명적 만남(버텍스)',
  'MC': '사회상(MC)',
}

const SOFT_FN_EN: Record<string, string> = {
  'True Node': 'soul direction (North Node)',
  'Mean Node': 'soul direction (North Node)',
  'North Node': 'soul direction (North Node)',
  'South Node': 'karma (South Node)',
  'Chiron': 'wound and healing (Chiron)',
  'Lilith': 'suppressed wild edge (Lilith)',
  'Part of Fortune': 'point of fortune',
  'Vertex': 'fated encounter point (Vertex)',
  'MC': 'public role (MC)',
}

function functionLabel(planet: string, lang: 'ko' | 'en'): string {
  const ko = PLANET_FN_KO[planet as AstroPlanetName]
  if (lang === 'ko' && ko) return ko
  const en = PLANET_FN_EN[planet as AstroPlanetName]
  if (lang === 'en' && en) return en
  const soft = lang === 'ko' ? SOFT_FN_KO[planet] : SOFT_FN_EN[planet]
  if (soft) return soft
  return planet
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('-')
}

export function getAspectPairInterpretation(opts: {
  fromPlanet: string
  toPlanet: string
  kind: AspectKind
  language?: 'ko' | 'en'
}): string {
  const lang = opts.language ?? 'ko'
  const key = pairKey(opts.fromPlanet, opts.toPlanet)
  const override = PAIR_OVERRIDES[key]?.[opts.kind]
  if (override) return lang === 'ko' ? override.ko : override.en

  const fnA = functionLabel(opts.fromPlanet, lang)
  const fnB = functionLabel(opts.toPlanet, lang)
  const verb = lang === 'ko' ? ASPECT_VERB[opts.kind].ko : ASPECT_VERB[opts.kind].en
  if (lang === 'ko') {
    return `${fnA}와 ${fnB}이(가) ${verb} 작동.`
  }
  return `${fnA} and ${fnB} ${verb}`
}

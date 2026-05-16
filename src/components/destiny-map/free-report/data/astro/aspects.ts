/**
 * 어스펙트(상각) 해석.
 *
 * /lib/astrology/foundation 의 `AspectHit[]` 출력.
 * 주요 어스펙트 타입별 일반 해석 + 자주 등장하는 행성쌍 해석.
 */

import type { AspectType, BilingualText, StandardPlanetName } from '../../types/core';

export interface AspectTypeEntry {
  hanja: string;
  nature: '조화' | '긴장' | '중립';
  description: BilingualText;
  expression: BilingualText;
  advice: BilingualText;
}

export const ASPECT_TYPE_INTERPRETATIONS: Record<AspectType, AspectTypeEntry> = {
  conjunction: {
    hanja: '合',
    nature: '중립',
    description: { ko: '두 행성이 같은 자리 — 에너지가 융합돼요.', en: 'Two planets in the same place — energies fuse.' },
    expression: { ko: '두 영역이 분리되지 않고 한 번에 표현돼요.', en: 'Two domains are inseparable and expressed as one.' },
    advice: { ko: '강력함을 어디에 쓸지 의도를 분명히 하세요.', en: 'Be intentional about where to direct this concentrated power.' },
  },
  opposition: {
    hanja: '衝',
    nature: '긴장',
    description: { ko: '180도 마주 봄 — 양극을 동시에 살아내야 해요.', en: '180° face-off — must live both poles at once.' },
    expression: { ko: '두 영역 사이에서 균형을 잡는 것이 평생의 과제예요.', en: 'Balancing the two domains is a lifelong task.' },
    advice: { ko: '한쪽을 누르지 말고 둘 다 살리는 길을 찾으세요.', en: 'Do not suppress one — find a path that honors both.' },
  },
  square: {
    hanja: '刑',
    nature: '긴장',
    description: { ko: '90도 갈등 — 마찰이 곧 성장의 동력이 돼요.', en: '90° tension — friction becomes the engine of growth.' },
    expression: { ko: '걸림돌이 되돌아오지만 통과할 때마다 단단해져요.', en: 'Obstacles return — each passage makes you stronger.' },
    advice: { ko: '갈등을 피하지 말고 정면으로 받아넘기는 연습이 핵심이에요.', en: 'Do not avoid friction — meet and channel it head-on.' },
  },
  trine: {
    hanja: '吉合',
    nature: '조화',
    description: { ko: '120도 조화 — 같은 원소끼리 부드럽게 흘러요.', en: '120° harmony — same element flowing smoothly.' },
    expression: { ko: '재능과 흐름이 자연스럽게 발휘돼요.', en: 'Talent and flow express themselves naturally.' },
    advice: { ko: '편안한 만큼 게으름이 따라오니 의도적으로 도전하세요.', en: 'Ease invites laziness — push for challenge intentionally.' },
  },
  sextile: {
    hanja: '六合',
    nature: '조화',
    description: { ko: '60도 기회 — 의도가 있을 때만 풀려요.', en: '60° opportunity — unlocks only when you act.' },
    expression: { ko: '기회의 문이 자주 열리지만 행동이 필요해요.', en: 'Doors open often, but action is required.' },
    advice: { ko: '기회는 손을 뻗는 사람에게만 와요 — 적극성을 키우세요.', en: 'Opportunity comes only to the one who reaches — build initiative.' },
  },
  quincunx: {
    hanja: '不和',
    nature: '긴장',
    description: { ko: '150도 어색한 만남 — 두 영역이 잘 안 통해요.', en: '150° awkward meeting — two domains do not communicate well.' },
    expression: { ko: '조정과 적응이 끊임없이 필요한 사이예요.', en: 'Constant adjustment and adaptation are needed.' },
    advice: { ko: '두 영역 사이의 번역자 역할을 자기 안에서 만드세요.', en: 'Cultivate an internal translator between the two domains.' },
  },
  semisextile: {
    hanja: '半六合',
    nature: '중립',
    description: { ko: '30도 — 미묘한 자극이 있어요.', en: '30° — subtle stimulation.' },
    expression: { ko: '잔잔한 학습과 인접한 영역의 협력이 일어나요.', en: 'Quiet learning and cooperation with adjacent domains.' },
    advice: { ko: '작은 신호를 무시하지 말고 살펴보세요.', en: 'Do not ignore small signals — examine them.' },
  },
  semisquare: {
    hanja: '半刑',
    nature: '긴장',
    description: { ko: '45도 — 작은 마찰이 누적돼요.', en: '45° — small friction accumulates.' },
    expression: { ko: '평소엔 잠잠하다가 누적되면 폭발이 가능해요.', en: 'Quiet usually — can explode when accumulated.' },
    advice: { ko: '소소한 불편을 그때그때 처리하세요.', en: 'Process minor discomfort as it arises.' },
  },
  sesquiquadrate: {
    hanja: '半倍刑',
    nature: '긴장',
    description: { ko: '135도 — 외부에서 오는 압박과 도전.', en: '135° — pressure and challenge from outside.' },
    expression: { ko: '환경과의 충돌에서 자기 색을 가다듬어요.', en: 'Sharpens self-color through environmental clashes.' },
    advice: { ko: '외부 압박에 무너지지 말고 자기 페이스를 지키세요.', en: 'Do not fold under external pressure — keep your pace.' },
  },
};

export interface PlanetPairAspectEntry {
  topic: BilingualText;
  positive: BilingualText;
  challenging: BilingualText;
}

/** 가장 자주 노출되는 행성쌍 어스펙트 해석. */
export const PLANET_PAIR_THEMES: Partial<Record<string, PlanetPairAspectEntry>> = {
  'sun-moon': {
    topic: { ko: '의식(태양)과 무의식(달) — 내면과 외면의 일치도', en: 'Conscious (Sun) vs unconscious (Moon) — alignment of inner & outer' },
    positive: { ko: '자기 인식과 정서가 한 방향으로 흘러 안정감이 커요.', en: 'Self-awareness and emotion flow as one — stability strong.' },
    challenging: { ko: '하고 싶은 일과 느끼는 감정이 자주 어긋날 수 있어요.', en: 'What you want and what you feel often clash.' },
  },
  'sun-mercury': {
    topic: { ko: '자아와 사고 — 자기 표현 방식', en: 'Self vs thought — self-expression style' },
    positive: { ko: '생각과 말이 자기 정체성과 잘 맞물려 자연스러워요.', en: 'Thought and speech aligned with identity — natural flow.' },
    challenging: { ko: '자기 말이 자기 말 같지 않게 느껴질 때가 있어요.', en: 'Your own speech sometimes feels not quite yours.' },
  },
  'sun-venus': {
    topic: { ko: '자아와 사랑·미 — 매력과 가치관', en: 'Self vs love/beauty — charm and values' },
    positive: { ko: '자기다움과 매력이 일치해 인기·관계운이 좋아요.', en: 'Authenticity matches charm — popularity and relationships flow.' },
    challenging: { ko: '자기다움과 사랑받는 모습 사이에서 갈등할 수 있어요.', en: 'May struggle between authentic self and being loved.' },
  },
  'sun-mars': {
    topic: { ko: '자아와 행동력 — 실행 에너지', en: 'Self vs action — execution energy' },
    positive: { ko: '자기 의지와 행동이 한 방향이라 실행력이 강해요.', en: 'Will and action aligned — strong execution.' },
    challenging: { ko: '욕망과 행동이 자주 부딪쳐 충동을 일으켜요.', en: 'Desire and action clash — impulses spike.' },
  },
  'sun-saturn': {
    topic: { ko: '자아와 책임 — 인생의 무게', en: 'Self vs responsibility — life weight' },
    positive: { ko: '책임을 짊어지는 무게가 곧 자기 격이 되는 사람이에요.', en: 'The weight you carry becomes your standing.' },
    challenging: { ko: '자기 검열이 강해 표현이 늦거나 우울감이 들 수 있어요.', en: 'Strong self-censorship — late expression, possible depression.' },
  },
  'sun-jupiter': {
    topic: { ko: '자아와 확장 — 비전과 기회', en: 'Self vs expansion — vision and opportunity' },
    positive: { ko: '인복과 기회가 자연스럽게 모여요.', en: 'People-luck and chances gather naturally.' },
    challenging: { ko: '과욕과 과장으로 일을 키울 수 있어요.', en: 'Greed and exaggeration may overinflate things.' },
  },
  'moon-venus': {
    topic: { ko: '감정과 사랑 — 정서적 친밀감', en: 'Emotion vs love — emotional intimacy' },
    positive: { ko: '정서적으로 따뜻하고 관계가 부드러워요.', en: 'Emotionally warm — relationships flow softly.' },
    challenging: { ko: '감정과 욕구가 어긋나 관계에 혼란이 와요.', en: 'Emotion and desire misalign — confusion in relationships.' },
  },
  'moon-mars': {
    topic: { ko: '감정과 행동 — 감정 표현 방식', en: 'Emotion vs action — how you express feelings' },
    positive: { ko: '감정을 그때그때 행동으로 풀어내 답답함이 적어요.', en: 'Feelings get acted out promptly — less pent-up.' },
    challenging: { ko: '감정 폭발이 잦고 다툼이 생기기 쉬워요.', en: 'Emotional explosions are frequent — conflict easily.' },
  },
  'venus-mars': {
    topic: { ko: '사랑과 욕망 — 연애 다이내믹', en: 'Love vs desire — love dynamics' },
    positive: { ko: '매력과 추진력이 함께 작동해 연애가 활발해요.', en: 'Charm and drive work together — love is active.' },
    challenging: { ko: '매력은 있지만 행동이 거칠어 갈등이 생겨요.', en: 'Charm yes, but rough action — conflicts arise.' },
  },
  'mercury-jupiter': {
    topic: { ko: '사고와 확장 — 학습·전파 능력', en: 'Thought vs expansion — learning & broadcasting' },
    positive: { ko: '큰 시야와 정확한 디테일을 함께 가져 강의·콘텐츠에 강해요.', en: 'Big vision and precise detail combined — strong in teaching/content.' },
    challenging: { ko: '말이 많고 과장될 수 있어요.', en: 'May talk too much or exaggerate.' },
  },
  'mars-saturn': {
    topic: { ko: '행동과 절제 — 실행과 인내', en: 'Action vs restraint — execution and patience' },
    positive: { ko: '꾸준한 노력과 결단의 칼날이 합쳐져 큰 성취를 만들어요.', en: 'Steady effort and decisive edge combine — big achievements.' },
    challenging: { ko: '행동과 자기 검열이 서로 발목을 잡아요.', en: 'Action and self-censorship trip each other.' },
  },
  'jupiter-saturn': {
    topic: { ko: '확장과 절제 — 성장의 리듬', en: 'Expansion vs restraint — rhythm of growth' },
    positive: { ko: '꿈을 그리되 구조로 만들 줄 아는 균형이 있어요.', en: 'Dreams plus structure — a balanced builder.' },
    challenging: { ko: '한쪽이 다른 한쪽을 막아 진전이 느려요.', en: 'One side blocks the other — slow progress.' },
  },
};

/** Helper: 두 행성 이름을 정렬된 키로 변환. */
export function makeAspectKey(p1: StandardPlanetName, p2: StandardPlanetName): string {
  const sorted = [p1, p2].sort();
  return `${sorted[0]}-${sorted[1]}`;
}

/**
 * 행성 × 별자리 해석 — 출생 차트의 핵심 차원.
 *
 * /lib/astrology/foundation 이 산출하는 `PlanetBase[]` 의 (name × sign) 조합에 대해
 * 도메인별 해석을 제공한다. Sun/Moon/Mercury/Venus/Mars 5대 핵심 행성을 우선 채우고,
 * Jupiter/Saturn/Uranus/Neptune/Pluto 는 세대성 행성으로 별도 큰 흐름만 부여한다.
 */

import type { BilingualText, ZodiacSign } from '../../types/core';

export interface PlanetSignEntry {
  short: BilingualText;
  shadow: BilingualText;
}

type FivePersonal = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars';
type SocialPlanet = 'jupiter' | 'saturn';
type OuterPlanet = 'uranus' | 'neptune' | 'pluto';

const SUN: Record<ZodiacSign, PlanetSignEntry> = {
  aries: {
    short: { ko: '존재 자체가 도전과 시작 — 가장 먼저 움직이는 자아.', en: 'Your core is challenge and initiation — the self that moves first.' },
    shadow: { ko: '성급함과 자기중심성 경계.', en: 'Beware impulsivity and self-centeredness.' },
  },
  taurus: {
    short: { ko: '존재가 안정과 감각의 향유에 뿌리내려요.', en: 'Your core is rooted in stability and sensory enjoyment.' },
    shadow: { ko: '고집과 변화 거부 경계.', en: 'Beware stubbornness and resistance to change.' },
  },
  gemini: {
    short: { ko: '존재가 호기심과 연결로 꽃피워요.', en: 'Your core blossoms through curiosity and connection.' },
    shadow: { ko: '산만함과 가벼움 경계.', en: 'Beware distraction and superficiality.' },
  },
  cancer: {
    short: { ko: '존재가 가족·고향·정서적 안정 위에 서요.', en: 'Your core stands on family, home, emotional security.' },
    shadow: { ko: '과보호와 의존성 경계.', en: 'Beware overprotection and dependency.' },
  },
  leo: {
    short: { ko: '존재가 표현과 자기 빛으로 살아 있어요.', en: 'Your core lives through expression and self-radiance.' },
    shadow: { ko: '인정 욕구의 과잉 경계.', en: 'Beware excessive need for recognition.' },
  },
  virgo: {
    short: { ko: '존재가 분석과 봉사로 의미를 찾아요.', en: 'Your core finds meaning in analysis and service.' },
    shadow: { ko: '비판 과잉과 완벽주의 경계.', en: 'Beware over-criticism and perfectionism.' },
  },
  libra: {
    short: { ko: '존재가 균형·관계·아름다움 안에서 완성돼요.', en: 'Your core completes within balance, relationship, beauty.' },
    shadow: { ko: '결정 회피와 타인 의존 경계.', en: 'Beware indecision and dependence on others.' },
  },
  scorpio: {
    short: { ko: '존재가 깊이와 변환의 힘을 가져요.', en: 'Your core carries depth and transformative power.' },
    shadow: { ko: '집착과 통제욕 경계.', en: 'Beware obsession and need for control.' },
  },
  sagittarius: {
    short: { ko: '존재가 의미와 모험을 향해 확장돼요.', en: 'Your core expands toward meaning and adventure.' },
    shadow: { ko: '과장과 미완 경계.', en: 'Beware exaggeration and unfinished projects.' },
  },
  capricorn: {
    short: { ko: '존재가 성취와 책임으로 형태를 잡아요.', en: 'Your core takes shape through achievement and responsibility.' },
    shadow: { ko: '경직과 자기 압박 경계.', en: 'Beware rigidity and self-pressure.' },
  },
  aquarius: {
    short: { ko: '존재가 독창성과 공동체로 빛나요.', en: 'Your core shines through originality and community.' },
    shadow: { ko: '거리감과 냉소 경계.', en: 'Beware emotional distance and cynicism.' },
  },
  pisces: {
    short: { ko: '존재가 직관과 자비, 영적 연결로 흘러가요.', en: 'Your core flows through intuition, compassion, spiritual connection.' },
    shadow: { ko: '경계 없음과 회피 경계.', en: 'Beware lack of boundaries and escapism.' },
  },
};

const MOON: Record<ZodiacSign, PlanetSignEntry> = {
  aries: { short: { ko: '감정이 빠르고 즉각적 — 화도 풀이도 빠른 편.', en: 'Emotions fast and direct — quick to flare, quick to release.' }, shadow: { ko: '감정의 폭주 주의.', en: 'Beware emotional outbursts.' } },
  taurus: { short: { ko: '감정이 안정적이고 위안받는 환경을 좋아해요.', en: 'Emotions steady — loves comforting environments.' }, shadow: { ko: '소유욕 주의.', en: 'Beware possessiveness.' } },
  gemini: { short: { ko: '감정이 머리로 처리되며 변화가 잦아요.', en: 'Processes emotion through thought — changes often.' }, shadow: { ko: '감정 표면화 경계.', en: 'Beware staying on the emotional surface.' } },
  cancer: { short: { ko: '감정이 깊고 보호 본능이 강해요.', en: 'Deep emotions, strong protective instinct.' }, shadow: { ko: '기분 변동 주의.', en: 'Beware mood swings.' } },
  leo: { short: { ko: '감정 표현이 풍부하고 따뜻해요.', en: 'Emotional expression rich and warm.' }, shadow: { ko: '드라마틱한 반응 주의.', en: 'Beware dramatic reactions.' } },
  virgo: { short: { ko: '감정을 정돈하고 분석하며 안전해져요.', en: 'Feels safe by organizing and analyzing emotion.' }, shadow: { ko: '걱정 과잉 주의.', en: 'Beware excessive worry.' } },
  libra: { short: { ko: '관계 속 조화에서 정서적 안정을 얻어요.', en: 'Gets emotional steadiness from relational harmony.' }, shadow: { ko: '갈등 회피 주의.', en: 'Beware conflict avoidance.' } },
  scorpio: { short: { ko: '감정이 강렬하고 비밀스러워요.', en: 'Emotions intense and secretive.' }, shadow: { ko: '집착 주의.', en: 'Beware obsession.' } },
  sagittarius: { short: { ko: '감정이 자유롭고 낙천적이에요.', en: 'Emotions free and optimistic.' }, shadow: { ko: '도피적 낙관 주의.', en: 'Beware escapist optimism.' } },
  capricorn: { short: { ko: '감정을 절제하고 책임으로 표현해요.', en: 'Restrains emotion — expresses it as responsibility.' }, shadow: { ko: '감정 억압 주의.', en: 'Beware emotional repression.' } },
  aquarius: { short: { ko: '감정을 거리 두고 객관적으로 보려 해요.', en: 'Tries to see emotion from a distance, objectively.' }, shadow: { ko: '감정 단절 주의.', en: 'Beware emotional detachment.' } },
  pisces: { short: { ko: '감정이 흡수성이 강하고 영적이에요.', en: 'Emotions absorbent and spiritual.' }, shadow: { ko: '경계 없음 주의.', en: 'Beware boundary loss.' } },
};

const MERCURY: Record<ZodiacSign, PlanetSignEntry> = {
  aries: { short: { ko: '말이 직설적이고 결정이 빨라요.', en: 'Speech direct, decisions fast.' }, shadow: { ko: '말이 앞서는 것 주의.', en: 'Beware words running ahead.' } },
  taurus: { short: { ko: '천천히 깊게 생각하고 확실히 말해요.', en: 'Thinks slowly and deeply, speaks with certainty.' }, shadow: { ko: '고집스러운 사고 주의.', en: 'Beware stubborn thinking.' } },
  gemini: { short: { ko: '다양한 정보를 빠르게 연결해요.', en: 'Connects varied information quickly.' }, shadow: { ko: '깊이 부족 주의.', en: 'Beware lack of depth.' } },
  cancer: { short: { ko: '감정과 연결된 사고와 직관이 강해요.', en: 'Strong intuition — thought tied to feeling.' }, shadow: { ko: '논리 부족 주의.', en: 'Beware weak logic.' } },
  leo: { short: { ko: '큰 그림으로 자신 있게 말해요.', en: 'Speaks confidently in big-picture terms.' }, shadow: { ko: '과시 주의.', en: 'Beware showing off.' } },
  virgo: { short: { ko: '분석적·정확·실용적 사고에 강해요.', en: 'Strong in analytical, precise, practical thought.' }, shadow: { ko: '비판 과잉 주의.', en: 'Beware over-criticism.' } },
  libra: { short: { ko: '균형 잡힌 시각과 외교적 말투를 가져요.', en: 'Balanced view and diplomatic tone.' }, shadow: { ko: '결정 회피 주의.', en: 'Beware indecision.' } },
  scorpio: { short: { ko: '본질을 파고드는 사고와 통찰을 가져요.', en: 'Penetrating thought and insight into essence.' }, shadow: { ko: '의심 과잉 주의.', en: 'Beware excessive suspicion.' } },
  sagittarius: { short: { ko: '철학적·확장적으로 생각해요.', en: 'Thinks philosophically and expansively.' }, shadow: { ko: '디테일 무시 주의.', en: 'Beware ignoring details.' } },
  capricorn: { short: { ko: '전략적·장기적으로 생각해요.', en: 'Thinks strategically and long-term.' }, shadow: { ko: '경직된 사고 주의.', en: 'Beware rigid thinking.' } },
  aquarius: { short: { ko: '혁신적·이상적으로 사고해요.', en: 'Thinks innovatively and ideally.' }, shadow: { ko: '현실 무시 주의.', en: 'Beware disregarding reality.' } },
  pisces: { short: { ko: '상상력 풍부하고 직관적으로 사고해요.', en: 'Thinks imaginatively and intuitively.' }, shadow: { ko: '논리 모호 주의.', en: 'Beware fuzzy logic.' } },
};

const VENUS: Record<ZodiacSign, PlanetSignEntry> = {
  aries: { short: { ko: '연애에서 솔직하고 직진형이에요.', en: 'Direct and forward in love.' }, shadow: { ko: '쉽게 식는 경향 주의.', en: 'Beware quick cooling.' } },
  taurus: { short: { ko: '안정적이고 감각적인 사랑을 추구해요.', en: 'Seeks stable and sensual love.' }, shadow: { ko: '집착 주의.', en: 'Beware possessiveness.' } },
  gemini: { short: { ko: '대화와 위트로 사랑을 키워요.', en: 'Grows love through conversation and wit.' }, shadow: { ko: '얕은 관계 주의.', en: 'Beware superficial connections.' } },
  cancer: { short: { ko: '가정적이고 보호적인 사랑을 해요.', en: 'Loves protectively and domestically.' }, shadow: { ko: '의존성 주의.', en: 'Beware dependency.' } },
  leo: { short: { ko: '드라마틱하고 따뜻한 사랑을 해요.', en: 'Loves warmly and dramatically.' }, shadow: { ko: '관심 욕구 주의.', en: 'Beware need for attention.' } },
  virgo: { short: { ko: '섬세하고 실용적인 사랑을 해요.', en: 'Loves delicately and practically.' }, shadow: { ko: '비판 주의.', en: 'Beware criticism.' } },
  libra: { short: { ko: '우아하고 공정한 관계를 추구해요.', en: 'Pursues elegant and fair relationships.' }, shadow: { ko: '결정 회피 주의.', en: 'Beware indecision.' } },
  scorpio: { short: { ko: '깊고 강렬한 결속을 원해요.', en: 'Wants deep, intense bonds.' }, shadow: { ko: '질투 주의.', en: 'Beware jealousy.' } },
  sagittarius: { short: { ko: '자유롭고 모험적인 사랑을 해요.', en: 'Loves freely and adventurously.' }, shadow: { ko: '책임 회피 주의.', en: 'Beware avoiding responsibility.' } },
  capricorn: { short: { ko: '진중하고 장기적인 관계를 추구해요.', en: 'Pursues serious, long-term relationships.' }, shadow: { ko: '감정 억제 주의.', en: 'Beware emotional suppression.' } },
  aquarius: { short: { ko: '독립적이고 친구 같은 사랑을 해요.', en: 'Loves independently and friend-like.' }, shadow: { ko: '거리 두기 주의.', en: 'Beware emotional distance.' } },
  pisces: { short: { ko: '무조건적이고 낭만적인 사랑을 해요.', en: 'Loves unconditionally and romantically.' }, shadow: { ko: '환상 주의.', en: 'Beware illusions.' } },
};

const MARS: Record<ZodiacSign, PlanetSignEntry> = {
  aries: { short: { ko: '추진력 폭발 — 첫 액션이 빨라요.', en: 'Drive explodes — fast first action.' }, shadow: { ko: '성급함 주의.', en: 'Beware impulsivity.' } },
  taurus: { short: { ko: '천천히 시작하지만 끝까지 밀어붙여요.', en: 'Starts slow, pushes to the very end.' }, shadow: { ko: '관성 주의.', en: 'Beware inertia.' } },
  gemini: { short: { ko: '여러 일을 빠르게 분산 처리해요.', en: 'Tackles many tasks fast and dispersed.' }, shadow: { ko: '집중 부족 주의.', en: 'Beware lack of focus.' } },
  cancer: { short: { ko: '감정 기반으로 가족·소중한 것을 위해 움직여요.', en: 'Acts on emotion for family and what is dear.' }, shadow: { ko: '간접 공격 주의.', en: 'Beware indirect aggression.' } },
  leo: { short: { ko: '자신감 있고 카리스마 있게 행동해요.', en: 'Acts with confidence and charisma.' }, shadow: { ko: '교만 주의.', en: 'Beware pride.' } },
  virgo: { short: { ko: '계획적이고 정확하게 실행해요.', en: 'Executes with planning and precision.' }, shadow: { ko: '과도한 디테일 주의.', en: 'Beware over-detail.' } },
  libra: { short: { ko: '협상과 협업으로 일을 풀어요.', en: 'Solves things through negotiation and collaboration.' }, shadow: { ko: '결단력 부족 주의.', en: 'Beware indecisiveness.' } },
  scorpio: { short: { ko: '전략적이고 집요하게 끝까지 가요.', en: 'Goes strategically and relentlessly to the end.' }, shadow: { ko: '집착 주의.', en: 'Beware obsession.' } },
  sagittarius: { short: { ko: '낙관과 모험으로 행동해요.', en: 'Acts with optimism and adventure.' }, shadow: { ko: '경솔함 주의.', en: 'Beware recklessness.' } },
  capricorn: { short: { ko: '현실적·전략적으로 장기 목표를 향해요.', en: 'Aims at long-term goals realistically and strategically.' }, shadow: { ko: '강박 주의.', en: 'Beware compulsiveness.' } },
  aquarius: { short: { ko: '독창적이고 혁신적으로 움직여요.', en: 'Moves originally and innovatively.' }, shadow: { ko: '돌출 행동 주의.', en: 'Beware erratic actions.' } },
  pisces: { short: { ko: '직관과 영감으로 움직이고 흐름을 타요.', en: 'Moves by intuition, riding the flow.' }, shadow: { ko: '추진력 약화 주의.', en: 'Beware loss of drive.' } },
};

const JUPITER: Record<ZodiacSign, PlanetSignEntry> = {
  aries: { short: { ko: '도전과 개척으로 행운이 커져요.', en: 'Luck grows through challenge and pioneering.' }, shadow: { ko: '과욕 주의.', en: 'Beware greed.' } },
  taurus: { short: { ko: '꾸준한 축적과 감각으로 풍요가 자라요.', en: 'Abundance grows from steady accumulation and senses.' }, shadow: { ko: '과식·소유욕 주의.', en: 'Beware overindulgence and possessiveness.' } },
  gemini: { short: { ko: '소통과 학습으로 기회가 확장돼요.', en: 'Opportunities expand via communication and learning.' }, shadow: { ko: '얕은 다각화 주의.', en: 'Beware shallow diversification.' } },
  cancer: { short: { ko: '가족·고향·돌봄을 통해 운이 커져요.', en: 'Luck grows through family, home, caring.' }, shadow: { ko: '과보호 주의.', en: 'Beware overprotection.' } },
  leo: { short: { ko: '표현과 무대로 행운이 커져요.', en: 'Luck grows through expression and stage.' }, shadow: { ko: '허세 주의.', en: 'Beware vanity.' } },
  virgo: { short: { ko: '봉사·디테일로 신뢰가 자산이 돼요.', en: 'Service and detail turn trust into asset.' }, shadow: { ko: '걱정 과잉 주의.', en: 'Beware excessive worry.' } },
  libra: { short: { ko: '관계와 협력에서 풍요가 자라요.', en: 'Abundance grows in relationships and cooperation.' }, shadow: { ko: '우유부단 주의.', en: 'Beware indecision.' } },
  scorpio: { short: { ko: '변환·심리·감춰진 자산이 운을 키워요.', en: 'Transformation, psyche, hidden assets grow luck.' }, shadow: { ko: '권력욕 주의.', en: 'Beware lust for power.' } },
  sagittarius: { short: { ko: '여행·철학·교육으로 운명이 확장돼요.', en: 'Travel, philosophy, education expand destiny.' }, shadow: { ko: '과장 주의.', en: 'Beware exaggeration.' } },
  capricorn: { short: { ko: '책임과 성취로 신뢰 자산이 쌓여요.', en: 'Responsibility and achievement stack trust as asset.' }, shadow: { ko: '경직 주의.', en: 'Beware rigidity.' } },
  aquarius: { short: { ko: '혁신·공동체·기술이 운을 키워요.', en: 'Innovation, community, tech grow your luck.' }, shadow: { ko: '냉소 주의.', en: 'Beware cynicism.' } },
  pisces: { short: { ko: '영성·예술·자비가 행운의 통로예요.', en: 'Spirituality, art, compassion are luck channels.' }, shadow: { ko: '경계 없음 주의.', en: 'Beware boundary loss.' } },
};

const SATURN: Record<ZodiacSign, PlanetSignEntry> = {
  aries: { short: { ko: '시작과 자기 주장에서 시험이 와요.', en: 'Test arrives in initiation and self-assertion.' }, shadow: { ko: '성급함이 책임을 막아요.', en: 'Impulse blocks responsibility.' } },
  taurus: { short: { ko: '자원·자기 가치에서 인내를 배워요.', en: 'Patience is learned via resources and self-worth.' }, shadow: { ko: '집착이 성장을 막아요.', en: 'Possessiveness blocks growth.' } },
  gemini: { short: { ko: '소통과 학습에서 책임을 배워요.', en: 'Responsibility is learned in communication and learning.' }, shadow: { ko: '말이 가벼우면 신뢰가 깎여요.', en: 'Light speech erodes trust.' } },
  cancer: { short: { ko: '가족·정서에서 어른되기를 배워요.', en: 'Adulthood is learned through family and emotion.' }, shadow: { ko: '과거에 머무는 것 주의.', en: 'Beware staying in the past.' } },
  leo: { short: { ko: '자기 빛에 책임지는 법을 배워요.', en: 'Learn to be responsible for your own light.' }, shadow: { ko: '인정 욕구 과잉 주의.', en: 'Beware over-need for recognition.' } },
  virgo: { short: { ko: '일·건강·디테일에서 단단해져요.', en: 'Hardens through work, health, detail.' }, shadow: { ko: '완벽주의가 발걸음을 막아요.', en: 'Perfectionism blocks steps.' } },
  libra: { short: { ko: '관계에서 책임과 균형을 배워요.', en: 'Responsibility and balance learned in relationships.' }, shadow: { ko: '회피가 시험을 키워요.', en: 'Avoidance enlarges the test.' } },
  scorpio: { short: { ko: '깊은 변환과 자원 공유에서 단련돼요.', en: 'Forged through deep transformation and shared resources.' }, shadow: { ko: '통제욕 주의.', en: 'Beware control issues.' } },
  sagittarius: { short: { ko: '신념·교육·해외에서 책임을 배워요.', en: 'Responsibility learned in beliefs, education, abroad.' }, shadow: { ko: '광신·도그마 주의.', en: 'Beware fanaticism and dogma.' } },
  capricorn: { short: { ko: '성취와 사회적 위치에서 자기 격을 세워요.', en: 'Establishes standing through achievement and social role.' }, shadow: { ko: '냉정함 주의.', en: 'Beware coldness.' } },
  aquarius: { short: { ko: '공동체·혁신·집단 책임에서 단련돼요.', en: 'Forged in community, innovation, collective duty.' }, shadow: { ko: '거리감 주의.', en: 'Beware emotional distance.' } },
  pisces: { short: { ko: '영성·자비·경계에서 책임을 배워요.', en: 'Responsibility learned in spirit, compassion, boundaries.' }, shadow: { ko: '회피·도피 주의.', en: 'Beware escapism.' } },
};

const URANUS: Record<ZodiacSign, PlanetSignEntry> = {
  aries: { short: { ko: '세대적 혁신의 첫 폭발 — 자아의 자유.', en: 'First burst of generational innovation — freedom of self.' }, shadow: { ko: '돌출 행동 주의.', en: 'Beware erratic actions.' } },
  taurus: { short: { ko: '돈·자원 구조의 세대적 재편 — 가치관 혁명.', en: 'Generational reshape of money and resources — value revolution.' }, shadow: { ko: '경제 충격 적응.', en: 'Adapt to economic shocks.' } },
  gemini: { short: { ko: '소통·기술·미디어의 혁신 세대.', en: 'Innovation generation in communication, tech, media.' }, shadow: { ko: '정보 과부하 주의.', en: 'Beware information overload.' } },
  cancer: { short: { ko: '가족·고향 개념의 재정의 세대.', en: 'Generation redefining family and home.' }, shadow: { ko: '뿌리 불안 주의.', en: 'Beware rootedness anxiety.' } },
  leo: { short: { ko: '자기 표현 방식의 혁명 세대.', en: 'Generation revolutionizing self-expression.' }, shadow: { ko: '인정 욕구 폭주 주의.', en: 'Beware runaway need for recognition.' } },
  virgo: { short: { ko: '일·건강·시스템의 혁신 세대.', en: 'Generation innovating work, health, systems.' }, shadow: { ko: '시스템 과신 주의.', en: 'Beware over-trust in systems.' } },
  libra: { short: { ko: '관계·결혼·정의의 재정의 세대.', en: 'Generation redefining relationships, marriage, justice.' }, shadow: { ko: '관계 불안정 주의.', en: 'Beware relational instability.' } },
  scorpio: { short: { ko: '권력·금융·심리의 변환 세대.', en: 'Generation transforming power, finance, psyche.' }, shadow: { ko: '극단성 주의.', en: 'Beware extremes.' } },
  sagittarius: { short: { ko: '교육·신념·해외 이동의 혁명 세대.', en: 'Generation of revolution in education, belief, travel.' }, shadow: { ko: '맹신과 폭주 주의.', en: 'Beware fanaticism and burnout.' } },
  capricorn: { short: { ko: '권력 구조·정부·기업의 재편 세대.', en: 'Generation reshaping power, government, corporations.' }, shadow: { ko: '체제 충격 주의.', en: 'Beware structural shocks.' } },
  aquarius: { short: { ko: '본진 — 혁신·공동체·기술의 정수 세대.', en: 'Home turf — essence of innovation, community, tech.' }, shadow: { ko: '집단 휩쓸림 주의.', en: 'Beware crowd contagion.' } },
  pisces: { short: { ko: '영성·예술·경계 해체의 세대.', en: 'Generation dissolving boundaries in spirit and art.' }, shadow: { ko: '환상·중독 주의.', en: 'Beware illusions and addictions.' } },
};

const NEPTUNE: Record<ZodiacSign, PlanetSignEntry> = {
  aries: { short: { ko: '자아 자체가 영적 탐험인 세대.', en: 'Generation where self itself is a spiritual quest.' }, shadow: { ko: '자기 환상 주의.', en: 'Beware self-delusion.' } },
  taurus: { short: { ko: '물질을 영적으로 다시 정의하는 세대.', en: 'Generation redefining matter spiritually.' }, shadow: { ko: '쾌락 도피 주의.', en: 'Beware pleasure escapism.' } },
  gemini: { short: { ko: '말과 정보가 환상이 되는 세대.', en: 'Generation where speech and info become illusion.' }, shadow: { ko: '가짜 정보 주의.', en: 'Beware fake info.' } },
  cancer: { short: { ko: '가족·고향의 환상과 그리움 세대.', en: 'Generation of family/home illusion and nostalgia.' }, shadow: { ko: '과거 미화 주의.', en: 'Beware glorifying the past.' } },
  leo: { short: { ko: '자기 빛의 신화화 세대.', en: 'Generation that mythologizes self-radiance.' }, shadow: { ko: '나르시시즘 주의.', en: 'Beware narcissism.' } },
  virgo: { short: { ko: '봉사와 헌신이 영적이 되는 세대.', en: 'Generation where service and devotion become spiritual.' }, shadow: { ko: '자기 학대 주의.', en: 'Beware self-sacrifice.' } },
  libra: { short: { ko: '관계와 미의 이상화 세대.', en: 'Generation idealizing relationships and beauty.' }, shadow: { ko: '환상 연애 주의.', en: 'Beware fantasy romance.' } },
  scorpio: { short: { ko: '깊은 무의식·금기·심리학의 세대.', en: 'Generation of deep unconscious, taboos, psychology.' }, shadow: { ko: '집착·중독 주의.', en: 'Beware obsession and addiction.' } },
  sagittarius: { short: { ko: '신념·종교·여행의 영성 세대.', en: 'Generation of spirituality in belief, religion, travel.' }, shadow: { ko: '맹신 주의.', en: 'Beware blind faith.' } },
  capricorn: { short: { ko: '구조와 권위의 해체 세대.', en: 'Generation dissolving structure and authority.' }, shadow: { ko: '냉소·환멸 주의.', en: 'Beware cynicism and disillusion.' } },
  aquarius: { short: { ko: '집단의 영적 각성 세대.', en: 'Generation of collective spiritual awakening.' }, shadow: { ko: '유토피아 환상 주의.', en: 'Beware utopian fantasy.' } },
  pisces: { short: { ko: '본진 — 영성·자비·예술의 정수 세대.', en: 'Home turf — essence generation of spirit, compassion, art.' }, shadow: { ko: '경계 없음·중독 주의.', en: 'Beware no boundaries and addiction.' } },
};

const PLUTO: Record<ZodiacSign, PlanetSignEntry> = {
  aries: { short: { ko: '자아의 깊은 변환 세대.', en: 'Generation of deep self-transformation.' }, shadow: { ko: '폭력성 주의.', en: 'Beware violence.' } },
  taurus: { short: { ko: '돈·자원의 권력 변환 세대.', en: 'Generation transforming power of money and resources.' }, shadow: { ko: '소유 집착 주의.', en: 'Beware possession-obsession.' } },
  gemini: { short: { ko: '정보·소통의 권력 변환 세대.', en: 'Generation transforming power of info and speech.' }, shadow: { ko: '조작 주의.', en: 'Beware manipulation.' } },
  cancer: { short: { ko: '가족·국가의 깊은 변환 세대.', en: 'Generation transforming family and nation deeply.' }, shadow: { ko: '뿌리 집착 주의.', en: 'Beware root-attachment.' } },
  leo: { short: { ko: '자기 표현·창작의 변환 세대.', en: 'Generation transforming self-expression and creation.' }, shadow: { ko: '독재 주의.', en: 'Beware authoritarianism.' } },
  virgo: { short: { ko: '일·건강·시스템의 변환 세대.', en: 'Generation transforming work, health, systems.' }, shadow: { ko: '강박 주의.', en: 'Beware obsession.' } },
  libra: { short: { ko: '관계·결혼·정의의 권력 변환 세대.', en: 'Generation transforming power of relationships, marriage, justice.' }, shadow: { ko: '관계 권력 게임 주의.', en: 'Beware relational power games.' } },
  scorpio: { short: { ko: '본진 — 깊은 죽음과 재생의 세대.', en: 'Home turf — generation of deep death and rebirth.' }, shadow: { ko: '극단 주의.', en: 'Beware extremes.' } },
  sagittarius: { short: { ko: '신념·교육·세계관의 변환 세대.', en: 'Generation transforming belief, education, worldview.' }, shadow: { ko: '광신 주의.', en: 'Beware fanaticism.' } },
  capricorn: { short: { ko: '권력 구조·기업·정부의 변환 세대.', en: 'Generation transforming power structure, corporations, government.' }, shadow: { ko: '권력 남용 주의.', en: 'Beware abuse of power.' } },
  aquarius: { short: { ko: '집단·기술의 권력 변환 세대.', en: 'Generation transforming power of collectives and tech.' }, shadow: { ko: '기술 통제 주의.', en: 'Beware tech overreach.' } },
  pisces: { short: { ko: '경계 해체와 영적 변환의 세대.', en: 'Generation of boundary dissolution and spiritual transformation.' }, shadow: { ko: '집단 무의식 주의.', en: 'Beware collective unconscious drift.' } },
};

export const PLANET_SIGN: Record<FivePersonal | SocialPlanet | OuterPlanet, Record<ZodiacSign, PlanetSignEntry>> = {
  sun: SUN,
  moon: MOON,
  mercury: MERCURY,
  venus: VENUS,
  mars: MARS,
  jupiter: JUPITER,
  saturn: SATURN,
  uranus: URANUS,
  neptune: NEPTUNE,
  pluto: PLUTO,
};

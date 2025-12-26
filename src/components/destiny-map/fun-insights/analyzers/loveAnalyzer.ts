// 사랑 스타일 분석 - 일간 + 오행 + 별자리 + 7하우스 + 애스펙트 + 십신 조합으로 개인화
import type { SajuData, AstroData } from '../types';
import {
  extractDayMaster,
  extractFiveElementsSorted,
  extractPlanetSign,
  selectLang
} from './utils';
import { dayMasterLoveTraits } from '../data/dayMasterTraits';
import { zodiacLoveTraits } from '../data/zodiacTraits';
import {
  elementLoveTraits,
  elementCompatibility,
  elementNames,
  elementWeaknessAdvice
} from '../data/elementAnalysisTraits';

interface LoveAnalysis {
  style: string;
  attract: string;
  danger: string;
  ideal: string;
  advice: string;
  compatibility: string[];
  lovePattern?: string;      // 7하우스 기반 파트너 패턴
  emotionalNeeds?: string;   // 달 기반 감정적 니즈
  venusStyle?: string;       // 금성 기반 사랑 표현
  sibsinLove?: string;       // 십신 기반 연애 에너지
  venusHouse?: string;       // 금성 하우스 - 사랑을 찾는 장소
  marsStyle?: string;        // 화성 - 열정 표현 방식
  moonVenusAspect?: string;  // 달-금성 애스펙트 - 감정과 사랑의 조화
  // 새로 추가
  junoPartner?: string;      // 주노 - 결혼 이상형
  vertexMeeting?: string;    // 버텍스 - 운명적 만남 장소
  lilithDesire?: string;     // 릴리스 - 숨겨진 욕망
  romanceTiming?: string;    // 도화/세운 기반 연애 타이밍
  charmScore?: number;       // 연애 매력도 (0-100)
  attachmentStyle?: string;  // 애착 스타일
  loveLanguage?: string;     // 사랑의 언어
  conflictStyle?: string;    // 갈등 해결 스타일
}

// 7하우스 별자리별 파트너 패턴
const house7Patterns: Record<string, { ko: string; en: string }> = {
  aries: { ko: "독립적이고 열정적인 파트너를 원해요. 서로 자극이 되는 관계.", en: "Want independent, passionate partner. Mutually stimulating relationship." },
  taurus: { ko: "안정적이고 감각적인 파트너를 원해요. 물질적 안정이 중요해요.", en: "Want stable, sensual partner. Material stability matters." },
  gemini: { ko: "대화가 통하는 파트너를 원해요. 지적 교감이 중요해요.", en: "Want partner who communicates well. Intellectual connection matters." },
  cancer: { ko: "가정적이고 보호적인 파트너를 원해요. 정서적 안정 추구.", en: "Want domestic, protective partner. Seek emotional stability." },
  leo: { ko: "당당하고 관대한 파트너를 원해요. 함께 빛나고 싶어요.", en: "Want confident, generous partner. Want to shine together." },
  virgo: { ko: "실용적이고 헌신적인 파트너를 원해요. 디테일을 챙겨주는 사람.", en: "Want practical, devoted partner. Someone who cares for details." },
  libra: { ko: "우아하고 조화로운 파트너를 원해요. 동등한 파트너십 추구.", en: "Want elegant, harmonious partner. Seek equal partnership." },
  scorpio: { ko: "깊이 있고 열정적인 파트너를 원해요. 영혼까지 연결되고 싶어요.", en: "Want deep, passionate partner. Want soul-level connection." },
  sagittarius: { ko: "자유롭고 모험적인 파트너를 원해요. 함께 성장하고 싶어요.", en: "Want free, adventurous partner. Want to grow together." },
  capricorn: { ko: "야망 있고 책임감 있는 파트너를 원해요. 장기적 비전 공유.", en: "Want ambitious, responsible partner. Share long-term vision." },
  aquarius: { ko: "독특하고 진보적인 파트너를 원해요. 친구 같은 연인.", en: "Want unique, progressive partner. Lover like a friend." },
  pisces: { ko: "감성적이고 영적인 파트너를 원해요. 무조건적 사랑 추구.", en: "Want emotional, spiritual partner. Seek unconditional love." },
};

// 금성-화성 애스펙트 영향
const venusMarsAspects: Record<string, { ko: string; en: string }> = {
  conjunction: { ko: "사랑과 열정이 강하게 결합되어 있어요. 매력이 넘쳐요.", en: "Love and passion strongly combined. Overflowing charm." },
  opposition: { ko: "밀당의 긴장감이 연애에 자극을 줘요. 드라마틱한 관계.", en: "Push-pull tension stimulates love. Dramatic relationships." },
  square: { ko: "연애에서 도전과 성장이 함께해요. 격정적인 끌림.", en: "Challenges and growth in love. Intense attraction." },
  trine: { ko: "연애가 자연스럽고 조화로워요. 쉽게 끌리고 끌려요.", en: "Love flows naturally and harmoniously. Easy attraction." },
  sextile: { ko: "연애에서 기회를 잘 잡아요. 좋은 인연이 잘 찾아와요.", en: "Seize opportunities in love well. Good connections find you." },
};

// 십신별 연애 에너지
const sibsinLoveTraits: Record<string, { ko: string; en: string }> = {
  "비겁": { ko: "연애에서도 주도권을 잡으려 해요. 독립적인 연애를 해요.", en: "Try to take initiative in love. Independent in relationships." },
  "식상": { ko: "연애에서 표현이 풍부해요. 로맨틱하고 창의적으로 사랑해요.", en: "Rich expression in love. Love romantically and creatively." },
  "재성": { ko: "연애에서 현실적이에요. 안정적인 관계를 원해요.", en: "Realistic in love. Want stable relationships." },
  "관성": { ko: "연애에서 책임감을 중시해요. 진지하게 관계를 맺어요.", en: "Value responsibility in love. Form serious relationships." },
  "인성": { ko: "연애에서 보호본능이 강해요. 깊이 있는 사랑을 해요.", en: "Strong protective instincts in love. Love deeply." },
};

// 금성 하우스별 사랑을 찾는 장소/방식
const venusHouseTraits: Record<number, { ko: string; en: string }> = {
  1: { ko: "첫인상에서 매력이 빛나요. 자연스럽게 사랑이 찾아와요.", en: "Your charm shines in first impressions. Love finds you naturally." },
  2: { ko: "물질적 안정을 함께 누릴 수 있는 사랑을 원해요.", en: "Want love where you can share material stability together." },
  3: { ko: "대화, SNS, 근처 동네에서 인연을 만나기 쉬워요.", en: "Easy to meet connections through conversation, SNS, or nearby areas." },
  4: { ko: "가족 소개나 집에서의 만남이 좋은 인연으로 이어져요.", en: "Family introductions or home meetings lead to good connections." },
  5: { ko: "취미, 파티, 창작 활동에서 운명적 만남이 와요.", en: "Destined meetings come through hobbies, parties, creative activities." },
  6: { ko: "직장이나 일상 루틴에서 인연을 만나기 쉬워요.", en: "Easy to meet connections at work or through daily routines." },
  7: { ko: "정식 소개팅이나 공식적 자리에서 좋은 인연을 만나요.", en: "Meet good connections through formal introductions or official settings." },
  8: { ko: "깊고 강렬한 만남을 추구해요. 비밀스러운 인연일 수 있어요.", en: "Seek deep, intense meetings. May be a secretive connection." },
  9: { ko: "여행, 유학, 외국에서 특별한 인연이 기다려요.", en: "Special connections await in travel, study abroad, or foreign countries." },
  10: { ko: "직업적 환경이나 사회적 모임에서 인연이 와요.", en: "Connections come through professional settings or social gatherings." },
  11: { ko: "친구 소개, 모임, 온라인 커뮤니티에서 인연을 만나요.", en: "Meet connections through friend introductions, groups, online communities." },
  12: { ko: "숨겨진 장소, 영적 공간에서 특별한 인연이 있어요.", en: "Special connections in hidden places or spiritual spaces." },
};

// 화성 별자리별 열정 표현
const marsLoveStyle: Record<string, { ko: string; en: string }> = {
  aries: { ko: "열정적이고 직접적으로 다가가요. 밀당을 못해요.", en: "Approach passionately and directly. Can't play push-pull games." },
  taurus: { ko: "천천히 깊게 다가가요. 한번 빠지면 끝까지 가요.", en: "Approach slowly and deeply. Once in, you go all the way." },
  gemini: { ko: "말과 지적 유희로 유혹해요. 재미있게 다가가요.", en: "Seduce with words and intellectual play. Approach in fun ways." },
  cancer: { ko: "보호하고 챙기는 방식으로 다가가요. 감정으로 유혹해요.", en: "Approach by protecting and caring. Seduce emotionally." },
  leo: { ko: "로맨틱하고 화려하게 다가가요. 선물과 이벤트를 잘해요.", en: "Approach romantically and glamorously. Good at gifts and events." },
  virgo: { ko: "실용적으로 챙기며 다가가요. 세심한 배려로 유혹해요.", en: "Approach by practically caring. Seduce with thoughtful consideration." },
  libra: { ko: "우아하고 매력적으로 다가가요. 분위기를 잘 만들어요.", en: "Approach elegantly and charmingly. Good at creating atmosphere." },
  scorpio: { ko: "강렬하고 집중적으로 다가가요. 눈빛으로 유혹해요.", en: "Approach intensely and focused. Seduce with your gaze." },
  sagittarius: { ko: "자유롭고 솔직하게 다가가요. 모험을 함께 하자고 해요.", en: "Approach freely and honestly. Invite them on adventures." },
  capricorn: { ko: "진지하고 책임감 있게 다가가요. 미래를 약속해요.", en: "Approach seriously and responsibly. Promise a future." },
  aquarius: { ko: "독특하고 친구처럼 다가가요. 지적 매력으로 유혹해요.", en: "Approach uniquely like a friend. Seduce with intellectual charm." },
  pisces: { ko: "감성적이고 낭만적으로 다가가요. 영혼으로 연결돼요.", en: "Approach emotionally and romantically. Connect through souls." },
};

// 달-금성 애스펙트
const moonVenusAspects: Record<string, { ko: string; en: string }> = {
  conjunction: { ko: "감정과 사랑이 하나예요. 따뜻하고 애정 어린 사람이에요.", en: "Emotion and love are one. You're warm and affectionate." },
  opposition: { ko: "감정과 욕구 사이에 긴장이 있어요. 때로는 밀당이 돼요.", en: "Tension between emotion and desire. Sometimes leads to push-pull." },
  square: { ko: "사랑에서 내면 갈등이 있을 수 있어요. 하지만 성장해요.", en: "May have inner conflict in love. But you grow through it." },
  trine: { ko: "감정과 사랑이 자연스럽게 흘러요. 연애 운이 좋아요.", en: "Emotion and love flow naturally. You have good love fortune." },
  sextile: { ko: "감정 표현과 사랑이 조화로워요. 친화력이 좋아요.", en: "Emotional expression and love harmonize. You have good rapport." },
};

// 애착 스타일 (달 + 4하우스 기반)
const attachmentStyles: Record<string, { ko: string; en: string }> = {
  secure: { ko: "안정 애착형: 관계에서 편안함을 느끼고, 친밀감과 독립성의 균형을 잘 맞춰요.", en: "Secure attachment: Comfortable in relationships, balance intimacy and independence well." },
  anxious: { ko: "불안 애착형: 사랑받고 싶은 욕구가 강해요. 연락이 늦으면 불안해질 수 있어요.", en: "Anxious attachment: Strong desire to be loved. May get anxious when replies are late." },
  avoidant: { ko: "회피 애착형: 독립성을 중시해요. 너무 가까워지면 부담을 느낄 수 있어요.", en: "Avoidant attachment: Value independence. May feel burdened by too much closeness." },
  disorganized: { ko: "혼란 애착형: 친밀함을 원하면서도 두려워해요. 관계가 복잡해지기 쉬워요.", en: "Disorganized attachment: Want intimacy but fear it. Relationships can get complicated." },
};

// 사랑의 언어 (금성 + 화성 조합)
const loveLanguages: Record<string, { ko: string; en: string }> = {
  words: { ko: "언어 표현형: '사랑해', 칭찬, 격려의 말이 가장 중요해요. 말로 사랑을 주고받아요.", en: "Words of Affirmation: 'I love you', compliments, encouragement matter most. Give and receive love through words." },
  time: { ko: "함께하는 시간형: 같이 있는 시간이 사랑이에요. 함께하는 것 자체가 행복해요.", en: "Quality Time: Time together is love. Just being together makes you happy." },
  gifts: { ko: "선물형: 정성이 담긴 선물로 마음을 표현해요. 작은 것도 기억해서 준비해요.", en: "Receiving Gifts: Express heart through thoughtful gifts. Remember small things and prepare them." },
  service: { ko: "행동 표현형: 도와주고 챙겨주는 것이 사랑이에요. 말보다 행동으로 보여줘요.", en: "Acts of Service: Helping and caring is love. Show through actions rather than words." },
  touch: { ko: "스킨십형: 손잡기, 포옹, 키스... 피부로 닿는 것이 가장 중요해요.", en: "Physical Touch: Holding hands, hugging, kissing... Physical contact matters most." },
};

// 갈등 해결 스타일 (화성 + 수성 조합)
const conflictStyles: Record<string, { ko: string; en: string }> = {
  direct: { ko: "직접 대면형: 문제가 생기면 바로 대화해요. 싸우더라도 빨리 해결하고 싶어요.", en: "Direct confrontation: Talk immediately when problems arise. Want to resolve quickly even if it means arguing." },
  diplomatic: { ko: "외교형: 충돌을 피하고 조화를 추구해요. 대화로 타협점을 찾으려 해요.", en: "Diplomatic: Avoid conflict and seek harmony. Try to find compromise through discussion." },
  withdrawal: { ko: "철수형: 갈등이 생기면 거리를 둬요. 혼자 정리할 시간이 필요해요.", en: "Withdrawal: Distance yourself when conflict arises. Need time to process alone." },
  passionate: { ko: "열정형: 감정적으로 표현해요. 화내고 풀고를 반복할 수 있어요.", en: "Passionate: Express emotionally. May go through cycles of anger and making up." },
};

/**
 * 7하우스 별자리 추출
 */
function getHouse7Sign(astro: AstroData | undefined): string | null {
  if (!astro?.houses) return null;

  // houses 배열에서 7번 하우스 찾기
  if (Array.isArray(astro.houses)) {
    const house7 = astro.houses.find(h => h.index === 7);
    return house7?.sign?.toLowerCase() || null;
  }
  return null;
}

/**
 * 애스펙트에서 행성 이름 추출 (문자열 또는 객체 모두 처리)
 */
function getAspectPlanetName(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  if (value && typeof value === 'object' && 'name' in value) {
    const name = (value as { name?: unknown }).name;
    if (typeof name === 'string') {
      return name.toLowerCase();
    }
  }
  return null;
}

/**
 * 금성-화성 애스펙트 찾기
 */
function getVenusMarsAspect(astro: AstroData | undefined): string | null {
  if (!astro?.aspects) return null;

  const venusMars = astro.aspects.find(a => {
    const from = getAspectPlanetName(a.from);
    const to = getAspectPlanetName(a.to);
    if (!from || !to) return false;
    return (from === 'venus' && to === 'mars') || (from === 'mars' && to === 'venus');
  });

  return venusMars?.type?.toLowerCase() || null;
}

/**
 * 십신 분포에서 가장 강한 십신 추출
 */
function getDominantSibsin(saju: SajuData | undefined): string | null {
  const sibsinDist = saju?.advancedAnalysis?.sibsin?.sibsinDistribution;
  if (!sibsinDist || typeof sibsinDist !== 'object') return null;

  const entries = Object.entries(sibsinDist) as [string, number][];
  if (entries.length === 0) return null;

  const sorted = entries.sort(([, a], [, b]) => b - a);
  return sorted[0]?.[0] || null;
}

/**
 * 금성 하우스 위치 추출
 */
function getVenusHouse(astro: AstroData | undefined): number | null {
  if (!astro?.planets) return null;

  if (Array.isArray(astro.planets)) {
    const venus = astro.planets.find(p => p.name?.toLowerCase() === 'venus');
    return venus?.house || null;
  }
  return null;
}

/**
 * 화성 별자리 추출
 */
function getMarsSign(astro: AstroData | undefined): string | null {
  return extractPlanetSign(astro, 'mars');
}

/**
 * 달-금성 애스펙트 찾기
 */
function getMoonVenusAspect(astro: AstroData | undefined): string | null {
  if (!astro?.aspects) return null;

  const moonVenus = astro.aspects.find(a => {
    const from = getAspectPlanetName(a.from);
    const to = getAspectPlanetName(a.to);
    if (!from || !to) return false;
    return (from === 'moon' && to === 'venus') || (from === 'venus' && to === 'moon');
  });

  return moonVenus?.type?.toLowerCase() || null;
}

// ====== 새로 추가된 함수들 ======

// Juno 소행성 별자리별 결혼 이상형
const junoPartnerTraits: Record<string, { ko: string; en: string }> = {
  aries: { ko: "독립적이고 열정적인 파트너가 이상형. 서로 자극을 주는 관계.", en: "Ideal partner: independent, passionate. Mutually stimulating." },
  taurus: { ko: "안정적이고 충실한 파트너가 이상형. 물질적 안정을 함께 추구.", en: "Ideal partner: stable, loyal. Seek material security together." },
  gemini: { ko: "지적이고 대화가 통하는 파트너가 이상형. 평생 배우자 = 친구.", en: "Ideal partner: intellectual, communicative. Spouse = best friend." },
  cancer: { ko: "가정적이고 따뜻한 파트너가 이상형. 정서적 안정이 최우선.", en: "Ideal partner: domestic, warm. Emotional stability first." },
  leo: { ko: "당당하고 관대한 파트너가 이상형. 함께 빛나고 싶어요.", en: "Ideal partner: confident, generous. Want to shine together." },
  virgo: { ko: "성실하고 헌신적인 파트너가 이상형. 실용적 사랑을 원해요.", en: "Ideal partner: diligent, devoted. Want practical love." },
  libra: { ko: "우아하고 조화로운 파트너가 이상형. 동등한 파트너십 추구.", en: "Ideal partner: elegant, harmonious. Seek equal partnership." },
  scorpio: { ko: "깊고 강렬한 유대를 나눌 파트너가 이상형. 영혼까지 연결.", en: "Ideal partner: deep, intense bond. Soul-level connection." },
  sagittarius: { ko: "자유롭고 모험적인 파트너가 이상형. 함께 성장하는 관계.", en: "Ideal partner: free, adventurous. Grow together." },
  capricorn: { ko: "야망 있고 책임감 있는 파트너가 이상형. 장기 비전 공유.", en: "Ideal partner: ambitious, responsible. Share long-term vision." },
  aquarius: { ko: "독창적이고 진보적인 파트너가 이상형. 친구 같은 관계.", en: "Ideal partner: original, progressive. Friend-like relationship." },
  pisces: { ko: "감성적이고 영적인 파트너가 이상형. 무조건적 사랑 추구.", en: "Ideal partner: emotional, spiritual. Seek unconditional love." },
};

// Vertex 하우스별 운명적 만남 장소
const vertexMeetingPlaces: Record<number, { ko: string; en: string }> = {
  1: { ko: "혼자만의 시간, 자기개발 활동에서 운명적 만남이 와요.", en: "Fated meeting during alone time, self-improvement." },
  2: { ko: "쇼핑, 재테크, 재능 활용 중에 운명적 만남이 와요.", en: "Fated meeting while shopping, investing, using talents." },
  3: { ko: "동네, 학교, SNS에서 운명적 만남이 와요.", en: "Fated meeting in neighborhood, school, SNS." },
  4: { ko: "집, 가족 모임, 고향에서 운명적 만남이 와요.", en: "Fated meeting at home, family gatherings, hometown." },
  5: { ko: "연애 앱, 파티, 취미 활동에서 운명적 만남이 와요!", en: "Fated meeting through dating apps, parties, hobbies!" },
  6: { ko: "직장, 헬스장, 봉사활동에서 운명적 만남이 와요.", en: "Fated meeting at work, gym, volunteer activities." },
  7: { ko: "소개팅, 비즈니스 미팅에서 운명적 만남이 와요.", en: "Fated meeting through blind dates, business meetings." },
  8: { ko: "위기 상황, 깊은 대화 중에 운명적 만남이 와요.", en: "Fated meeting during crisis, deep conversations." },
  9: { ko: "여행, 유학, 철학/종교 모임에서 운명적 만남이 와요.", en: "Fated meeting through travel, study abroad, spiritual groups." },
  10: { ko: "직장, 공식 행사, 업계 모임에서 운명적 만남이 와요.", en: "Fated meeting at work, official events, industry gatherings." },
  11: { ko: "친구 모임, 온라인 커뮤니티에서 운명적 만남이 와요.", en: "Fated meeting at friend gatherings, online communities." },
  12: { ko: "병원, 명상센터, 혼자 조용할 때 운명적 만남이 와요.", en: "Fated meeting at hospitals, meditation centers, quiet moments." },
};

// Lilith 별자리별 숨겨진 욕망
const lilithDesires: Record<string, { ko: string; en: string }> = {
  aries: { ko: "관계에서 주도권을 갖고 싶은 숨겨진 욕구가 있어요.", en: "Hidden desire to lead in relationships." },
  taurus: { ko: "관능적 즐거움에 대한 깊은 갈망이 있어요.", en: "Deep longing for sensual pleasures." },
  gemini: { ko: "비밀스러운 대화, 금기된 지식에 끌려요.", en: "Attracted to secret conversations, forbidden knowledge." },
  cancer: { ko: "무조건적으로 사랑받고 싶은 갈망이 있어요.", en: "Longing to be loved unconditionally." },
  leo: { ko: "특별한 존재로 숭배받고 싶은 욕구가 있어요.", en: "Desire to be worshipped as special." },
  virgo: { ko: "완벽한 관계에 대한 집착이 있어요.", en: "Obsession with perfect relationships." },
  libra: { ko: "관계 속에서 자아를 잃을까 두려워해요.", en: "Fear of losing yourself in relationships." },
  scorpio: { ko: "연인에 대한 깊은 통제 욕구가 숨어 있어요.", en: "Hidden desire for deep control over partners." },
  sagittarius: { ko: "책임 없이 자유롭게 사랑하고 싶은 마음이 있어요.", en: "Want to love freely without responsibility." },
  capricorn: { ko: "지위 있는 사람에게 끌리는 경향이 있어요.", en: "Tendency to be attracted to people of status." },
  aquarius: { ko: "색다르고 독특한 관계를 갈망해요.", en: "Crave unique and unconventional relationships." },
  pisces: { ko: "비현실적인 이상적 사랑을 꿈꿔요.", en: "Dream of unrealistic ideal love." },
};

/**
 * Juno 소행성 별자리 추출
 */
function getJunoSign(astro: AstroData | undefined): string | null {
  const juno = astro?.asteroids?.juno;
  return juno?.sign?.toLowerCase() || null;
}

/**
 * Vertex 하우스 추출
 */
function getVertexHouse(astro: AstroData | undefined): number | null {
  const vertex = astro?.extraPoints?.vertex;
  return vertex?.house || null;
}

/**
 * Lilith 별자리 추출
 */
function getLilithSign(astro: AstroData | undefined): string | null {
  const lilith = astro?.extraPoints?.lilith;
  return lilith?.sign?.toLowerCase() || null;
}

/**
 * 도화살 확인 및 연애 타이밍 분석
 */
function getRomanceTiming(saju: SajuData | undefined, isKo: boolean): string | null {
  // 도화살 확인
  const sinsal = saju?.sinsal || saju?.advancedAnalysis?.sinsal;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const luckyList = (sinsal as any)?.luckyList || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unluckyList = (sinsal as any)?.unluckyList || [];
  const allSinsal = [...luckyList, ...unluckyList];
  const hasDohwa = allSinsal.some((s: { name?: string } | string) => {
    const name = typeof s === 'string' ? s : s.name;
    return name?.includes('도화');
  });
  const hasHongyeom = allSinsal.some((s: { name?: string } | string) => {
    const name = typeof s === 'string' ? s : s.name;
    return name?.includes('홍염');
  });

  // 세운에서 좋은 해 찾기
  const saeun = saju?.unse?.annual || [];
  const currentYear = new Date().getFullYear();
  const goodYears: number[] = [];

  for (const yearData of saeun) {
    const year = yearData.year;
    if (!year || year < currentYear || year > currentYear + 3) continue;
    const element = yearData.stem?.element;
    if (element === 'fire' || element === 'wood' || element === '화' || element === '목') {
      goodYears.push(year);
    }
  }

  if (hasDohwa && goodYears.length > 0) {
    return isKo
      ? `도화살이 있어 매력이 넘쳐요! ${goodYears[0]}년에 연애운이 특히 좋아요.`
      : `You have romantic charm (Dohwa)! ${goodYears[0]} looks especially good for love.`;
  }
  if (hasHongyeom) {
    return isKo
      ? "홍염살이 있어 열정적인 사랑을 하지만, 충동적인 결정은 피하세요."
      : "You have passionate love energy (Hongyeom), but avoid impulsive decisions.";
  }
  if (goodYears.length > 0) {
    return isKo
      ? `${goodYears[0]}년이 연애 시작하기 좋은 시기예요.`
      : `${goodYears[0]} is a good year to start a romance.`;
  }

  return null;
}

/**
 * 연애 매력도 점수 계산 (개선된 버전)
 *
 * 점수 구성 (0-100):
 * - 기본 점수: 60 (누구나 기본적인 매력이 있음)
 * - 사주 요소 (최대 +25):
 *   - 도화살: +12 (이성에게 자연스러운 매력)
 *   - 홍염살: +8 (열정적인 매력)
 *   - 일간 매력 (병/정/계): +5 (불/물의 감성적 매력)
 * - 점성학 요소 (최대 +25):
 *   - 금성 본좌/고양 (황소/천칭/물고기): +10
 *   - 금성 1/5/7하우스: +8
 *   - 금성-화성 조화 애스펙트: +7
 *   - 7하우스 행성 있음: +5
 * - 조합 보너스 (최대 +10):
 *   - 도화 + 금성 좋음: +5 추가
 *   - 달-금성 조화: +5
 */
function calculateCharmScore(saju: SajuData | undefined, astro: AstroData | undefined): number {
  let score = 60; // 기본 점수 상향

  // === 사주 요소 ===
  // 도화살/홍염살
  const sinsal = saju?.sinsal || saju?.advancedAnalysis?.sinsal;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const luckyList = (sinsal as any)?.luckyList || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unluckyList = (sinsal as any)?.unluckyList || [];
  const allSinsal = [...luckyList, ...unluckyList];

  const hasDohwa = allSinsal.some((s: { name?: string } | string) => (typeof s === 'string' ? s : s.name)?.includes('도화'));
  const hasHongyeom = allSinsal.some((s: { name?: string } | string) => (typeof s === 'string' ? s : s.name)?.includes('홍염'));

  if (hasDohwa) score += 12;
  if (hasHongyeom) score += 8;

  // 일간 매력 (병/정/계는 감성적 매력이 높음)
  const dayMaster = saju?.dayMaster?.name || saju?.dayMaster?.heavenlyStem || "";
  if (dayMaster.includes('병') || dayMaster.includes('정') || dayMaster.includes('계')) {
    score += 5;
  }

  // === 점성학 요소 ===
  const planets = astro?.planets;
  const venus = Array.isArray(planets) ? planets.find((p: { name?: string }) => p.name?.toLowerCase() === 'venus') : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const venusSign = (venus as any)?.sign?.toLowerCase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const venusHouse = (venus as any)?.house;

  // 금성 본좌/고양
  if (venusSign === 'taurus' || venusSign === 'libra' || venusSign === 'pisces') {
    score += 10;
  } else if (venusSign === 'cancer' || venusSign === 'leo') {
    score += 5; // 준수한 위치
  }

  // 금성 하우스 (연애 관련 하우스)
  if (venusHouse === 1 || venusHouse === 5 || venusHouse === 7) {
    score += 8;
  } else if (venusHouse === 2 || venusHouse === 11) {
    score += 4;
  }

  // 금성-화성 조화 애스펙트
  const aspects = astro?.aspects || [];
  const venusAspect = aspects.find((a: { from?: unknown; to?: unknown; type?: string }) => {
    const from = getAspectPlanetName(a.from);
    const to = getAspectPlanetName(a.to);
    return (from === 'venus' || to === 'venus') && (from === 'mars' || to === 'mars');
  });
  if (venusAspect?.type === 'conjunction' || venusAspect?.type === 'trine' || venusAspect?.type === 'sextile') {
    score += 7;
  }

  // 7하우스에 행성 있음 (파트너 운)
  const planetsIn7 = Array.isArray(planets) ? planets.filter((p: { house?: number }) => p.house === 7) : [];
  if (planetsIn7.length > 0) {
    score += 5;
  }

  // === 조합 보너스 ===
  // 도화 + 금성 좋음
  if (hasDohwa && (venusSign === 'taurus' || venusSign === 'libra' || venusSign === 'pisces')) {
    score += 5;
  }

  // 달-금성 조화 애스펙트
  const moonVenusAspect = aspects.find((a: { from?: unknown; to?: unknown; type?: string }) => {
    const from = getAspectPlanetName(a.from);
    const to = getAspectPlanetName(a.to);
    return (from === 'moon' || to === 'moon') && (from === 'venus' || to === 'venus');
  });
  if (moonVenusAspect?.type === 'conjunction' || moonVenusAspect?.type === 'trine' || moonVenusAspect?.type === 'sextile') {
    score += 5;
  }

  return Math.min(100, Math.max(60, score)); // 최소 60, 최대 100
}

export function getLoveAnalysis(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): LoveAnalysis | null {
  const isKo = lang === "ko";
  const dayMasterName = extractDayMaster(saju);

  if (!dayMasterName) return null;

  const dmBase = dayMasterLoveTraits[dayMasterName] || dayMasterLoveTraits["갑"];

  // 오행 비율
  const sorted = extractFiveElementsSorted(saju);
  const strongestElement = sorted[0]?.[0];
  const weakestElement = sorted[sorted.length - 1]?.[0];

  // 태양/달/금성 별자리
  const sunSign = extractPlanetSign(astro, 'sun');
  const moonSign = extractPlanetSign(astro, 'moon');
  const venusSign = extractPlanetSign(astro, 'venus');

  // 새로 추가된 요소들
  const house7Sign = getHouse7Sign(astro);
  const venusMarsAspect = getVenusMarsAspect(astro);
  const dominantSibsin = getDominantSibsin(saju);
  const venusHouseNum = getVenusHouse(astro);
  const marsSign = getMarsSign(astro);
  const moonVenusAspectType = getMoonVenusAspect(astro);

  // 조합해서 개인화된 텍스트 생성
  let style = selectLang(isKo, dmBase.core);
  let attract = "";
  const danger = selectLang(isKo, dmBase.danger);
  const ideal = selectLang(isKo, dmBase.ideal);
  let advice = "";
  let lovePattern: string | undefined;
  let emotionalNeeds: string | undefined;
  let venusStyle: string | undefined;
  let sibsinLove: string | undefined;
  let venusHouse: string | undefined;
  let marsStyle: string | undefined;
  let moonVenusAspect: string | undefined;

  // 태양 별자리로 연애 스타일 보강
  if (sunSign && zodiacLoveTraits[sunSign]) {
    const sunTrait = zodiacLoveTraits[sunSign];
    style += " " + selectLang(isKo, sunTrait.style);
    attract = selectLang(isKo, sunTrait.attract);
  }

  // 달 별자리로 감정적 니즈 추가
  if (moonSign && zodiacLoveTraits[moonSign]) {
    const moonTrait = zodiacLoveTraits[moonSign];
    emotionalNeeds = isKo
      ? `내면에서는 ${selectLang(isKo, moonTrait.style).toLowerCase()}을 원해요.`
      : `Internally, you want ${selectLang(isKo, moonTrait.style).toLowerCase()}.`;
    style += " " + emotionalNeeds;
  }

  // 금성 별자리로 끌리는 타입 보강
  if (venusSign && zodiacLoveTraits[venusSign]) {
    const venusTrait = zodiacLoveTraits[venusSign];
    venusStyle = selectLang(isKo, venusTrait.style);
    if (attract) {
      attract += isKo
        ? ` 특히 ${selectLang(isKo, venusTrait.attract)}에게 끌려요.`
        : ` Especially attracted to ${selectLang(isKo, venusTrait.attract).toLowerCase()}.`;
    } else {
      attract = selectLang(isKo, venusTrait.attract);
    }
  }

  // 가장 강한 오행으로 연애 에너지 추가
  if (strongestElement && elementLoveTraits[strongestElement]) {
    style += " " + selectLang(isKo, elementLoveTraits[strongestElement]);
  }

  // ====== 새로 추가된 정교화 요소들 ======

  // 1. 7하우스 기반 파트너 패턴
  if (house7Sign && house7Patterns[house7Sign]) {
    lovePattern = selectLang(isKo, house7Patterns[house7Sign]);
  }

  // 2. 금성-화성 애스펙트
  if (venusMarsAspect && venusMarsAspects[venusMarsAspect]) {
    const aspectInfo = selectLang(isKo, venusMarsAspects[venusMarsAspect]);
    style += " " + aspectInfo;
  }

  // 3. 십신 기반 연애 에너지
  if (dominantSibsin && sibsinLoveTraits[dominantSibsin]) {
    sibsinLove = selectLang(isKo, sibsinLoveTraits[dominantSibsin]);
  }

  // 4. 금성 하우스 - 인연을 만나는 장소
  if (venusHouseNum && venusHouseTraits[venusHouseNum]) {
    venusHouse = selectLang(isKo, venusHouseTraits[venusHouseNum]);
  }

  // 5. 화성 - 열정 표현 방식
  if (marsSign && marsLoveStyle[marsSign]) {
    marsStyle = selectLang(isKo, marsLoveStyle[marsSign]);
  }

  // 6. 달-금성 애스펙트 - 감정과 사랑의 조화
  if (moonVenusAspectType && moonVenusAspects[moonVenusAspectType]) {
    moonVenusAspect = selectLang(isKo, moonVenusAspects[moonVenusAspectType]);
  }

  // ====== 새로 추가된 요소들 (Juno, Vertex, Lilith, 타이밍) ======

  // 7. Juno - 결혼 이상형
  const junoSign = getJunoSign(astro);
  let junoPartner: string | undefined;
  if (junoSign && junoPartnerTraits[junoSign]) {
    junoPartner = selectLang(isKo, junoPartnerTraits[junoSign]);
  }

  // 8. Vertex - 운명적 만남 장소
  const vertexHouseNum = getVertexHouse(astro);
  let vertexMeeting: string | undefined;
  if (vertexHouseNum && vertexMeetingPlaces[vertexHouseNum]) {
    vertexMeeting = selectLang(isKo, vertexMeetingPlaces[vertexHouseNum]);
  }

  // 9. Lilith - 숨겨진 욕망
  const lilithSign = getLilithSign(astro);
  let lilithDesire: string | undefined;
  if (lilithSign && lilithDesires[lilithSign]) {
    lilithDesire = selectLang(isKo, lilithDesires[lilithSign]);
  }

  // 10. 연애 타이밍
  const romanceTiming = getRomanceTiming(saju, isKo);

  // 11. 연애 매력도 점수
  const charmScore = calculateCharmScore(saju, astro);

  // 12. 애착 스타일 분석 (달 별자리 + 4하우스 기반)
  let attachmentStyle: string | undefined;
  const waterSigns = ['cancer', 'scorpio', 'pisces'];
  const fireSigns = ['aries', 'leo', 'sagittarius'];
  const airSigns = ['gemini', 'libra', 'aquarius'];

  if (moonSign) {
    if (waterSigns.includes(moonSign)) {
      // 물 별자리 달: 감정적으로 민감 → 불안 애착 경향
      attachmentStyle = selectLang(isKo, attachmentStyles.anxious);
    } else if (fireSigns.includes(moonSign)) {
      // 불 별자리 달: 독립적 → 회피 애착 경향 (하지만 열정적)
      attachmentStyle = selectLang(isKo, attachmentStyles.secure);
    } else if (airSigns.includes(moonSign)) {
      // 공기 별자리 달: 이성적 → 회피 애착 경향
      attachmentStyle = selectLang(isKo, attachmentStyles.avoidant);
    } else {
      // 땅 별자리 달: 안정 추구 → 안정 애착
      attachmentStyle = selectLang(isKo, attachmentStyles.secure);
    }
  }

  // 13. 사랑의 언어 분석 (금성 + 화성 조합)
  let loveLanguage: string | undefined;
  if (venusSign && marsSign) {
    // 금성이 물 별자리: 스킨십/감정적 연결 중시
    if (waterSigns.includes(venusSign)) {
      loveLanguage = selectLang(isKo, loveLanguages.touch);
    }
    // 금성이 불 별자리: 함께하는 시간/열정 중시
    else if (fireSigns.includes(venusSign)) {
      loveLanguage = selectLang(isKo, loveLanguages.time);
    }
    // 금성이 공기 별자리: 언어 표현 중시
    else if (airSigns.includes(venusSign)) {
      loveLanguage = selectLang(isKo, loveLanguages.words);
    }
    // 금성이 땅 별자리: 선물/행동 중시
    else {
      if (marsSign && (marsSign === 'virgo' || marsSign === 'capricorn')) {
        loveLanguage = selectLang(isKo, loveLanguages.service);
      } else {
        loveLanguage = selectLang(isKo, loveLanguages.gifts);
      }
    }
  }

  // 14. 갈등 해결 스타일 (화성 별자리 기반)
  let conflictStyle: string | undefined;
  if (marsSign) {
    if (fireSigns.includes(marsSign)) {
      conflictStyle = selectLang(isKo, conflictStyles.direct);
    } else if (waterSigns.includes(marsSign)) {
      conflictStyle = selectLang(isKo, conflictStyles.withdrawal);
    } else if (airSigns.includes(marsSign)) {
      conflictStyle = selectLang(isKo, conflictStyles.diplomatic);
    } else {
      conflictStyle = selectLang(isKo, conflictStyles.passionate);
    }
  }

  // 가장 약한 오행으로 주의점 추가
  if (weakestElement && elementWeaknessAdvice[weakestElement]) {
    advice = selectLang(isKo, elementWeaknessAdvice[weakestElement]);
  }

  // 기본 조언 추가
  if (!advice) {
    advice = isKo
      ? "있는 그대로의 모습으로 사랑하세요. 완벽할 필요 없어요."
      : "Love as you are. You don't need to be perfect.";
  }

  // 기본 끌리는 타입
  if (!attract) {
    attract = isKo ? "진심을 알아주는 사람에게 끌려요." : "You're attracted to those who recognize sincerity.";
  }

  // 궁합 좋은 타입 (오행 상생 기반)
  const compatibility: string[] = [];
  if (strongestElement && elementCompatibility[strongestElement]) {
    const compatElements = elementCompatibility[strongestElement];
    compatElements.forEach(el => {
      if (elementNames[el]) {
        compatibility.push(selectLang(isKo, elementNames[el]));
      }
    });
  }

  return {
    style,
    attract,
    danger,
    ideal,
    advice,
    compatibility,
    lovePattern,
    emotionalNeeds,
    venusStyle,
    sibsinLove,
    venusHouse,
    marsStyle,
    moonVenusAspect,
    // 새로 추가된 필드들
    junoPartner,
    vertexMeeting,
    lilithDesire,
    romanceTiming: romanceTiming || undefined,
    charmScore,
    attachmentStyle,
    loveLanguage,
    conflictStyle,
  };
}

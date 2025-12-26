// 인연 분석 - 노드 + 금성 + 7하우스 주인 + 운명적 포인트 조합으로 개인화
import type { SajuData, AstroData } from '../types';
import {
  extractDayMaster,
  extractFiveElementsSorted,
  extractPlanetSign,
  selectLang
} from './utils';

interface DestinyAnalysis {
  karmaType: string;           // 전생에서 온 인연 패턴
  destinyPath: string;         // 이생의 인연 방향
  soulMateSign: string;        // 운명적 만남의 신호
  connectionAdvice: string;    // 인연을 위한 조언
  northNode?: string;          // 북쪽 노드 - 나아갈 방향
  southNode?: string;          // 남쪽 노드 - 익숙한 패턴
  house7Ruler?: string;        // 7하우스 주인 - 파트너 유형
  vertexSign?: string;         // 버텍스 - 운명적 만남 장소
  juno?: string;               // 주노 - 결혼 파트너 유형
  venusAspect?: string;        // 금성 주요 애스펙트
  sibsinDestiny?: string;      // 십신 기반 인연 패턴
  elementDestiny?: string;     // 오행 기반 인연
}

// 일간별 인연 성향
const dayMasterDestinyTraits: Record<string, {
  karma: { ko: string; en: string };
  path: { ko: string; en: string };
  sign: { ko: string; en: string };
  advice: { ko: string; en: string };
}> = {
  "갑": {
    karma: { ko: "리더십을 발휘하다 만난 인연이 많아요", en: "Many connections met while showing leadership" },
    path: { ko: "함께 성장하는 동반자를 찾아요", en: "Seeking a companion to grow together" },
    sign: { ko: "새로운 시작에서 운명을 만나요", en: "Meet destiny in new beginnings" },
    advice: { ko: "독립심을 유지하면서도 마음을 열어요", en: "Keep independence while opening your heart" }
  },
  "을": {
    karma: { ko: "협력과 조화에서 인연이 시작돼요", en: "Connections start from cooperation and harmony" },
    path: { ko: "유연하게 맞춰주는 파트너를 원해요", en: "Want a partner who adjusts flexibly" },
    sign: { ko: "부드러운 인연이 자연스럽게 와요", en: "Gentle connections come naturally" },
    advice: { ko: "의존하지 않으면서 함께하세요", en: "Be together without depending" }
  },
  "병": {
    karma: { ko: "빛나는 자리에서 인연을 만났어요", en: "Met connections in shining places" },
    path: { ko: "함께 빛날 수 있는 파트너를 찾아요", en: "Seeking a partner to shine together" },
    sign: { ko: "강렬한 첫인상이 인연의 시작이에요", en: "Intense first impression starts the connection" },
    advice: { ko: "상대도 빛날 수 있게 해주세요", en: "Let your partner shine too" }
  },
  "정": {
    karma: { ko: "세심한 배려에서 인연이 시작돼요", en: "Connections start from thoughtful care" },
    path: { ko: "마음을 알아주는 파트너를 원해요", en: "Want a partner who understands your heart" },
    sign: { ko: "따뜻한 감정에서 운명을 느껴요", en: "Feel destiny in warm emotions" },
    advice: { ko: "감정을 솔직하게 표현하세요", en: "Express your emotions honestly" }
  },
  "무": {
    karma: { ko: "믿음직한 존재로서 인연을 만났어요", en: "Met connections as a reliable presence" },
    path: { ko: "안정감을 주는 파트너를 찾아요", en: "Seeking a partner who gives stability" },
    sign: { ko: "오래 알던 것 같은 편안함이 신호예요", en: "Comfort like old acquaintance is the sign" },
    advice: { ko: "변화도 수용하는 유연함을 가지세요", en: "Have flexibility to accept change" }
  },
  "기": {
    karma: { ko: "실용적인 도움에서 인연이 시작돼요", en: "Connections start from practical help" },
    path: { ko: "함께 일상을 만들어갈 파트너를 원해요", en: "Want a partner to build daily life together" },
    sign: { ko: "작은 배려에서 큰 인연을 느껴요", en: "Feel big connection in small care" },
    advice: { ko: "완벽을 추구하지 말고 있는 그대로 받아들이세요", en: "Don't pursue perfection, accept as is" }
  },
  "경": {
    karma: { ko: "결단력 있는 모습에서 인연이 시작돼요", en: "Connections start from decisive appearance" },
    path: { ko: "명확하고 솔직한 파트너를 찾아요", en: "Seeking a clear and honest partner" },
    sign: { ko: "확실한 끌림이 운명의 신호예요", en: "Clear attraction is destiny's sign" },
    advice: { ko: "부드러움도 필요해요", en: "Softness is also needed" }
  },
  "신": {
    karma: { ko: "섬세한 감각에서 인연을 알아봐요", en: "Recognize connections through delicate senses" },
    path: { ko: "정교하게 맞는 파트너를 원해요", en: "Want a partner who fits precisely" },
    sign: { ko: "디테일에서 운명을 발견해요", en: "Discover destiny in details" },
    advice: { ko: "완벽한 인연은 없어요. 함께 만들어가세요", en: "No perfect connection exists. Create it together" }
  },
  "임": {
    karma: { ko: "지혜롭고 깊은 대화에서 인연이 와요", en: "Connections come from wise, deep conversations" },
    path: { ko: "영혼까지 소통하는 파트너를 찾아요", en: "Seeking a partner for soul communication" },
    sign: { ko: "말없이도 통하는 느낌이 운명이에요", en: "Feeling of understanding without words is destiny" },
    advice: { ko: "때로는 감정도 말로 표현하세요", en: "Sometimes express emotions in words too" }
  },
  "계": {
    karma: { ko: "영적인 연결에서 인연을 느껴요", en: "Feel connections in spiritual bonds" },
    path: { ko: "깊이 있는 영혼의 파트너를 원해요", en: "Want a deep soul partner" },
    sign: { ko: "꿈이나 직감에서 운명을 알아요", en: "Know destiny through dreams or intuition" },
    advice: { ko: "현실적인 기반도 중요해요", en: "Realistic foundation is also important" }
  }
};

// 북쪽 노드 별자리별 인연 방향
const northNodePatterns: Record<string, { ko: string; en: string }> = {
  aries: { ko: "독립적인 인연을 향해 가세요. 의존에서 벗어나 자신을 찾아요.", en: "Move toward independent connections. Break free from dependency to find yourself." },
  taurus: { ko: "안정적인 인연을 향해 가세요. 변화에서 평화로 나아가요.", en: "Move toward stable connections. Progress from change to peace." },
  gemini: { ko: "다양한 인연을 경험하세요. 고정관념을 벗어나요.", en: "Experience diverse connections. Break free from fixed ideas." },
  cancer: { ko: "따뜻한 가정적 인연을 향해 가세요. 야망보다 돌봄을 배워요.", en: "Move toward warm family connections. Learn care over ambition." },
  leo: { ko: "당당하게 사랑받는 법을 배우세요. 그룹보다 개인으로 빛나요.", en: "Learn to be loved confidently. Shine as individual over group." },
  virgo: { ko: "실용적인 인연을 경험하세요. 이상보다 현실을 선택해요.", en: "Experience practical connections. Choose reality over ideals." },
  libra: { ko: "파트너십을 배우세요. 혼자보다 함께하는 법을 익혀요.", en: "Learn partnership. Practice being together over being alone." },
  scorpio: { ko: "깊은 변환의 인연을 경험하세요. 안전에서 깊이로 나아가요.", en: "Experience deep transformative connections. Move from safety to depth." },
  sagittarius: { ko: "넓은 세상의 인연을 향해 가세요. 좁은 환경을 벗어나요.", en: "Move toward connections in the wide world. Break free from narrow environments." },
  capricorn: { ko: "성숙한 인연을 경험하세요. 감정보다 책임을 배워요.", en: "Experience mature connections. Learn responsibility over emotion." },
  aquarius: { ko: "자유로운 인연을 향해 가세요. 자기중심에서 벗어나요.", en: "Move toward free connections. Break free from self-centeredness." },
  pisces: { ko: "영적인 인연을 경험하세요. 분석보다 직관을 믿어요.", en: "Experience spiritual connections. Trust intuition over analysis." },
};

// 남쪽 노드 별자리별 익숙한 인연 패턴
const southNodePatterns: Record<string, { ko: string; en: string }> = {
  aries: { ko: "혼자 해결하려는 패턴을 버리세요.", en: "Let go of the pattern of solving things alone." },
  taurus: { ko: "집착과 소유욕에서 벗어나세요.", en: "Break free from attachment and possessiveness." },
  gemini: { ko: "가볍게 스쳐가는 인연 패턴을 벗어나세요.", en: "Break free from fleeting connection patterns." },
  cancer: { ko: "지나친 돌봄과 의존에서 벗어나세요.", en: "Break free from excessive care and dependency." },
  leo: { ko: "주목받으려는 욕구에서 벗어나세요.", en: "Break free from the need for attention." },
  virgo: { ko: "비판적인 태도에서 벗어나세요.", en: "Break free from critical attitudes." },
  libra: { ko: "타인에게 맞추려는 패턴에서 벗어나세요.", en: "Break free from patterns of accommodating others." },
  scorpio: { ko: "컨트롤하려는 욕구에서 벗어나세요.", en: "Break free from the need to control." },
  sagittarius: { ko: "도망치려는 패턴에서 벗어나세요.", en: "Break free from escape patterns." },
  capricorn: { ko: "지나친 책임감에서 벗어나세요.", en: "Break free from excessive responsibility." },
  aquarius: { ko: "거리두기 패턴에서 벗어나세요.", en: "Break free from distancing patterns." },
  pisces: { ko: "현실 회피 패턴에서 벗어나세요.", en: "Break free from reality avoidance patterns." },
};

// 7하우스 주인 행성별 파트너 유형
const house7RulerTraits: Record<string, { ko: string; en: string }> = {
  sun: { ko: "당당하고 카리스마 있는 파트너와 인연이에요.", en: "Connected with confident, charismatic partners." },
  moon: { ko: "감정적으로 돌봐주는 파트너와 인연이에요.", en: "Connected with emotionally nurturing partners." },
  mercury: { ko: "대화가 잘 통하는 지적인 파트너와 인연이에요.", en: "Connected with intellectual partners who communicate well." },
  venus: { ko: "아름답고 조화로운 파트너와 인연이에요.", en: "Connected with beautiful, harmonious partners." },
  mars: { ko: "열정적이고 활동적인 파트너와 인연이에요.", en: "Connected with passionate, active partners." },
  jupiter: { ko: "풍요롭고 넓은 시야의 파트너와 인연이에요.", en: "Connected with abundant, broad-minded partners." },
  saturn: { ko: "성숙하고 책임감 있는 파트너와 인연이에요.", en: "Connected with mature, responsible partners." },
  uranus: { ko: "독특하고 자유로운 파트너와 인연이에요.", en: "Connected with unique, free partners." },
  neptune: { ko: "예술적이고 영적인 파트너와 인연이에요.", en: "Connected with artistic, spiritual partners." },
  pluto: { ko: "강렬하고 변화를 주는 파트너와 인연이에요.", en: "Connected with intense, transformative partners." },
};

// 버텍스 별자리별 운명적 만남 장소
const vertexSignPatterns: Record<string, { ko: string; en: string }> = {
  aries: { ko: "스포츠, 경쟁, 새로운 시작의 장소에서 운명을 만나요.", en: "Meet destiny at sports, competition, new beginning places." },
  taurus: { ko: "자연, 예술, 맛집에서 운명을 만나요.", en: "Meet destiny in nature, art, good restaurants." },
  gemini: { ko: "강의, 모임, 커뮤니케이션 장소에서 운명을 만나요.", en: "Meet destiny at lectures, gatherings, communication venues." },
  cancer: { ko: "가정, 가족 모임, 요리 관련 장소에서 운명을 만나요.", en: "Meet destiny at home, family gatherings, cooking venues." },
  leo: { ko: "파티, 무대, 창작 활동 장소에서 운명을 만나요.", en: "Meet destiny at parties, stages, creative venues." },
  virgo: { ko: "직장, 건강 관련, 봉사 장소에서 운명을 만나요.", en: "Meet destiny at work, health venues, service places." },
  libra: { ko: "소개팅, 예술 전시, 우아한 장소에서 운명을 만나요.", en: "Meet destiny at blind dates, art exhibitions, elegant places." },
  scorpio: { ko: "심리상담, 연구소, 깊은 대화 장소에서 운명을 만나요.", en: "Meet destiny at counseling, research, deep conversation places." },
  sagittarius: { ko: "여행, 유학, 종교/철학 모임에서 운명을 만나요.", en: "Meet destiny in travel, study abroad, religious/philosophical gatherings." },
  capricorn: { ko: "비즈니스, 공식 행사, 전문가 모임에서 운명을 만나요.", en: "Meet destiny at business, official events, professional gatherings." },
  aquarius: { ko: "동호회, 사회운동, 온라인에서 운명을 만나요.", en: "Meet destiny in clubs, social movements, online." },
  pisces: { ko: "예술, 명상, 영적 공간에서 운명을 만나요.", en: "Meet destiny in art, meditation, spiritual spaces." },
};

// 주노 별자리별 결혼 파트너 유형
const junoSignTraits: Record<string, { ko: string; en: string }> = {
  aries: { ko: "독립적이고 용감한 파트너와 결혼 인연이에요.", en: "Marriage connection with independent, brave partner." },
  taurus: { ko: "안정적이고 감각적인 파트너와 결혼 인연이에요.", en: "Marriage connection with stable, sensual partner." },
  gemini: { ko: "대화가 잘 통하는 다재다능한 파트너와 결혼 인연이에요.", en: "Marriage connection with versatile partner who communicates well." },
  cancer: { ko: "가정적이고 보호적인 파트너와 결혼 인연이에요.", en: "Marriage connection with domestic, protective partner." },
  leo: { ko: "화려하고 관대한 파트너와 결혼 인연이에요.", en: "Marriage connection with glamorous, generous partner." },
  virgo: { ko: "실용적이고 헌신적인 파트너와 결혼 인연이에요.", en: "Marriage connection with practical, devoted partner." },
  libra: { ko: "조화롭고 공평한 파트너와 결혼 인연이에요.", en: "Marriage connection with harmonious, fair partner." },
  scorpio: { ko: "깊고 열정적인 파트너와 결혼 인연이에요.", en: "Marriage connection with deep, passionate partner." },
  sagittarius: { ko: "자유롭고 모험적인 파트너와 결혼 인연이에요.", en: "Marriage connection with free, adventurous partner." },
  capricorn: { ko: "야망 있고 책임감 있는 파트너와 결혼 인연이에요.", en: "Marriage connection with ambitious, responsible partner." },
  aquarius: { ko: "독특하고 진보적인 파트너와 결혼 인연이에요.", en: "Marriage connection with unique, progressive partner." },
  pisces: { ko: "감성적이고 헌신적인 파트너와 결혼 인연이에요.", en: "Marriage connection with emotional, devoted partner." },
};

// 금성 주요 애스펙트별 인연 패턴
const venusAspectPatterns: Record<string, { ko: string; en: string }> = {
  "venus-jupiter": { ko: "풍요롭고 확장하는 인연이 찾아와요. 행운이 따라요.", en: "Abundant, expanding connections come. Luck follows." },
  "venus-saturn": { ko: "진지하고 오래가는 인연이 와요. 시간이 걸려요.", en: "Serious, lasting connections come. Takes time." },
  "venus-uranus": { ko: "갑자기 운명적인 만남이 와요. 예상치 못한 인연이에요.", en: "Sudden destined meetings come. Unexpected connections." },
  "venus-neptune": { ko: "영혼적인 연결의 인연이 와요. 이상화에 주의하세요.", en: "Soul-level connections come. Watch for idealization." },
  "venus-pluto": { ko: "강렬하게 변화시키는 인연이 와요. 깊은 변환이 일어나요.", en: "Intensely transformative connections come. Deep transformation occurs." },
};

// 십신별 인연 패턴
const sibsinDestinyTraits: Record<string, { ko: string; en: string }> = {
  "비겁": { ko: "경쟁하면서 만나는 인연이 많아요. 친구 같은 관계가 좋아요.", en: "Many connections through competition. Friend-like relationships suit you." },
  "식상": { ko: "창작 활동에서 인연을 만나요. 표현하면서 가까워져요.", en: "Meet connections through creative activities. Get closer through expression." },
  "재성": { ko: "일이나 재물 관련에서 인연을 만나요. 현실적인 관계가 좋아요.", en: "Meet connections through work or wealth. Realistic relationships suit you." },
  "관성": { ko: "공식적인 자리에서 인연을 만나요. 사회적 관계가 연애로 발전해요.", en: "Meet connections at official occasions. Social relationships develop into romance." },
  "인성": { ko: "배움이나 돌봄에서 인연을 만나요. 지적인 연결이 중요해요.", en: "Meet connections through learning or care. Intellectual connection is important." },
};

// 오행별 인연 특성
const elementDestinyTraits: Record<string, { ko: string; en: string }> = {
  wood: { ko: "성장하면서 함께하는 인연을 만나요. 발전하는 관계가 좋아요.", en: "Meet connections while growing. Developing relationships suit you." },
  fire: { ko: "열정적으로 끌리는 인연을 만나요. 함께 빛나는 관계가 좋아요.", en: "Meet passionately attracted connections. Shining together relationships suit you." },
  earth: { ko: "안정적이고 든든한 인연을 만나요. 오래가는 관계가 좋아요.", en: "Meet stable, reliable connections. Long-lasting relationships suit you." },
  metal: { ko: "명확하고 확실한 인연을 만나요. 진실된 관계가 좋아요.", en: "Meet clear, certain connections. Truthful relationships suit you." },
  water: { ko: "깊이 소통하는 인연을 만나요. 영혼적 연결이 좋아요.", en: "Meet deeply communicating connections. Soul-level connection suits you." },
};

/**
 * 노드 별자리 추출
 */
function getNodeSign(astro: AstroData | undefined, nodeType: 'north' | 'south'): string | null {
  if (!astro?.planets) return null;

  const nodeName = nodeType === 'north'
    ? ['north node', 'northnode', 'true node', 'mean node']
    : ['south node', 'southnode'];

  if (Array.isArray(astro.planets)) {
    const node = astro.planets.find(p =>
      nodeName.some(n => p.name?.toLowerCase().includes(n))
    );
    return node?.sign?.toLowerCase() || null;
  }
  return null;
}

/**
 * 7하우스 주인 행성 찾기
 */
function getHouse7Ruler(astro: AstroData | undefined): string | null {
  if (!astro?.houses) return null;

  // 7하우스 별자리 찾기
  const house7Sign = Array.isArray(astro.houses)
    ? astro.houses.find(h => h.index === 7)?.sign?.toLowerCase()
    : null;

  if (!house7Sign) return null;

  // 별자리의 주인 행성 매핑
  const signRulers: Record<string, string> = {
    aries: 'mars',
    taurus: 'venus',
    gemini: 'mercury',
    cancer: 'moon',
    leo: 'sun',
    virgo: 'mercury',
    libra: 'venus',
    scorpio: 'pluto',
    sagittarius: 'jupiter',
    capricorn: 'saturn',
    aquarius: 'uranus',
    pisces: 'neptune',
  };

  return signRulers[house7Sign] || null;
}

/**
 * 버텍스 별자리 추출
 */
function getVertexSign(astro: AstroData | undefined): string | null {
  const vertex = astro?.extraPoints?.vertex || astro?.advancedAstrology?.vertex;
  return vertex?.sign?.toLowerCase() || null;
}

/**
 * 주노 별자리 추출
 */
function getJunoSign(astro: AstroData | undefined): string | null {
  // asteroids에서 찾기
  const juno = astro?.asteroids?.juno;
  if (juno?.sign) return juno.sign.toLowerCase();

  // advancedAstrology.asteroids에서 찾기
  if (astro?.advancedAstrology?.asteroids && Array.isArray(astro.advancedAstrology.asteroids)) {
    const junoAsteroid = astro.advancedAstrology.asteroids.find(
      a => a.name?.toLowerCase() === 'juno'
    );
    return junoAsteroid?.sign?.toLowerCase() || null;
  }

  return null;
}

/**
 * 애스펙트에서 행성 이름 추출 (문자열 또는 객체 형태 모두 지원)
 */
function getAspectPlanetName(value: unknown): string {
  if (typeof value === 'string') return value.toLowerCase();
  if (value && typeof value === 'object' && 'name' in value) {
    const name = (value as { name?: unknown }).name;
    if (typeof name === 'string') return name.toLowerCase();
  }
  return '';
}

/**
 * 금성의 주요 애스펙트 찾기
 */
function getVenusMainAspect(astro: AstroData | undefined): string | null {
  if (!astro?.aspects) return null;

  const importantPlanets = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

  const venusAspect = astro.aspects.find(a => {
    const fromName = getAspectPlanetName(a.from);
    const toName = getAspectPlanetName(a.to);
    const hasVenus = fromName === 'venus' || toName === 'venus';
    const otherPlanet = fromName === 'venus' ? toName : fromName;
    return hasVenus && importantPlanets.includes(otherPlanet);
  });

  if (!venusAspect) return null;

  const fromName = getAspectPlanetName(venusAspect.from);
  const toName = getAspectPlanetName(venusAspect.to);
  const otherPlanet = fromName === 'venus' ? toName : fromName;

  return `venus-${otherPlanet}`;
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

export function getDestinyAnalysis(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): DestinyAnalysis | null {
  const isKo = lang === "ko";
  const dayMasterName = extractDayMaster(saju);

  if (!dayMasterName) return null;

  const dmBase = dayMasterDestinyTraits[dayMasterName] || dayMasterDestinyTraits["갑"];

  // 오행 비율
  const sorted = extractFiveElementsSorted(saju);
  const strongestElement = sorted[0]?.[0];

  // 추가 요소들
  const northNodeSign = getNodeSign(astro, 'north');
  const southNodeSign = getNodeSign(astro, 'south');
  const house7Ruler = getHouse7Ruler(astro);
  const vertexSign = getVertexSign(astro);
  const junoSign = getJunoSign(astro);
  const venusMainAspect = getVenusMainAspect(astro);
  const dominantSibsin = getDominantSibsin(saju);

  // 결과 조합
  let karmaType = selectLang(isKo, dmBase.karma);
  let destinyPath = selectLang(isKo, dmBase.path);
  let soulMateSign = selectLang(isKo, dmBase.sign);
  let connectionAdvice = selectLang(isKo, dmBase.advice);
  let northNode: string | undefined;
  let southNode: string | undefined;
  let house7RulerTrait: string | undefined;
  let vertexSignTrait: string | undefined;
  let juno: string | undefined;
  let venusAspect: string | undefined;
  let sibsinDestiny: string | undefined;
  let elementDestiny: string | undefined;

  // 북쪽 노드 - 나아갈 방향
  if (northNodeSign && northNodePatterns[northNodeSign]) {
    northNode = selectLang(isKo, northNodePatterns[northNodeSign]);
    destinyPath += " " + northNode;
  }

  // 남쪽 노드 - 익숙한 패턴
  if (southNodeSign && southNodePatterns[southNodeSign]) {
    southNode = selectLang(isKo, southNodePatterns[southNodeSign]);
    karmaType += " " + southNode;
  }

  // 7하우스 주인
  if (house7Ruler && house7RulerTraits[house7Ruler]) {
    house7RulerTrait = selectLang(isKo, house7RulerTraits[house7Ruler]);
  }

  // 버텍스 - 운명적 만남 장소
  if (vertexSign && vertexSignPatterns[vertexSign]) {
    vertexSignTrait = selectLang(isKo, vertexSignPatterns[vertexSign]);
    soulMateSign += " " + vertexSignTrait;
  }

  // 주노 - 결혼 파트너 유형
  if (junoSign && junoSignTraits[junoSign]) {
    juno = selectLang(isKo, junoSignTraits[junoSign]);
  }

  // 금성 주요 애스펙트
  if (venusMainAspect && venusAspectPatterns[venusMainAspect]) {
    venusAspect = selectLang(isKo, venusAspectPatterns[venusMainAspect]);
  }

  // 십신 기반 인연
  if (dominantSibsin && sibsinDestinyTraits[dominantSibsin]) {
    sibsinDestiny = selectLang(isKo, sibsinDestinyTraits[dominantSibsin]);
  }

  // 오행 기반 인연
  if (strongestElement && elementDestinyTraits[strongestElement]) {
    elementDestiny = selectLang(isKo, elementDestinyTraits[strongestElement]);
  }

  return {
    karmaType,
    destinyPath,
    soulMateSign,
    connectionAdvice,
    northNode,
    southNode,
    house7Ruler: house7RulerTrait,
    vertexSign: vertexSignTrait,
    juno,
    venusAspect,
    sibsinDestiny,
    elementDestiny,
  };
}

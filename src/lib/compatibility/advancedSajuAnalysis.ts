/**
 * Advanced Saju Analysis for Compatibility
 * 심화 사주 분석: 십성, 신살, 육합/삼합/충/형/파/해, 용신, 희신 등
 */

import { SajuProfile } from './cosmicCompatibility';
import { FiveElement } from '../Saju/types';

// Normalize FiveElement (internal codes) to the English keys this module uses.
// This avoids type mismatches without changing the underlying logic.
const normalizeElement = (el: FiveElement | string): string => {
  const map: Record<string, string> = {
    '목': 'wood',
    '화': 'fire',
    '토': 'earth',
    '금': 'metal',
    '수': 'water',
  };
  return map[el] ?? (el as string);
};

// ============================================================
// 십성 (Ten Gods) 분석
// ============================================================

export type TenGod =
  | '비견' | '겁재'      // 比劫 (Self)
  | '식신' | '상관'      // 食傷 (Output)
  | '편재' | '정재'      // 財 (Wealth)
  | '편관' | '정관'      // 官 (Authority)
  | '편인' | '정인';     // 印 (Resource)

export interface TenGodAnalysis {
  person1Primary: TenGod[];
  person2Primary: TenGod[];
  interaction: {
    supports: string[];      // 서로 돕는 관계
    conflicts: string[];     // 충돌 관계
    balance: number;         // 0-100
  };
  relationshipDynamics: string;
}

export function analyzeTenGods(p1: SajuProfile, p2: SajuProfile): TenGodAnalysis {
  // 각자의 주요 십성 추출 (실제로는 pillars에서 계산)
  const p1Primary = extractPrimaryTenGods(p1);
  const p2Primary = extractPrimaryTenGods(p2);

  // 일간 한글 이름
  const p1DayMaster = p1.dayMaster.name || p1.pillars.day.stem;
  const p2DayMaster = p2.dayMaster.name || p2.pillars.day.stem;

  const supports: string[] = [];
  const conflicts: string[] = [];

  // 재성-관성 조화 (재생관) - 황금 파트너십
  if (hasTenGod(p1Primary, ['편재', '정재']) && hasTenGod(p2Primary, ['편관', '정관'])) {
    supports.push(`💰 ${p1DayMaster}일간이 재물을 모으고, ${p2DayMaster}일간이 사회적 지위로 발전시키는 황금 파트너십! 마치 CEO와 투자자의 완벽한 조합처럼, 함께하면 물질적 성공과 명예를 동시에 거머쥘 수 있는 관계예요.`);
  }
  if (hasTenGod(p2Primary, ['편재', '정재']) && hasTenGod(p1Primary, ['편관', '정관'])) {
    supports.push(`💰 ${p2DayMaster}일간의 경제적 감각이 ${p1DayMaster}일간의 리더십을 빛나게 합니다! 한 사람이 자원을 확보하고, 다른 사람이 그것을 사회적 영향력으로 전환하는 최고의 팀워크예요.`);
  }

  // 인성-비겁 조화 - 든든한 후원자
  if (hasTenGod(p1Primary, ['편인', '정인']) && hasTenGod(p2Primary, ['비견', '겁재'])) {
    supports.push(`📚 ${p1DayMaster}일간이 지혜로운 조언자이자 정신적 지주 역할을 해요! 인생의 방향을 제시하고, 힘든 순간에 마음의 안식처가 되어주는 '영혼의 멘토' 같은 존재랍니다.`);
  }
  if (hasTenGod(p2Primary, ['편인', '정인']) && hasTenGod(p1Primary, ['비견', '겁재'])) {
    supports.push(`📚 ${p2DayMaster}일간이 깊은 통찰력으로 방향을 제시해요! 마치 인생의 네비게이션처럼, 복잡한 상황에서도 현명한 해답을 찾아주는 지혜로운 파트너예요.`);
  }

  // 식상-재성 조화 (식상생재) - 창조적 부의 연금술
  if (hasTenGod(p1Primary, ['식신', '상관']) && hasTenGod(p2Primary, ['편재', '정재'])) {
    supports.push(`✨ ${p1DayMaster}일간의 반짝이는 아이디어가 ${p2DayMaster}일간을 통해 현금으로 바뀌어요! 창의력과 비즈니스 감각의 환상적인 콜라보레이션 - 함께라면 무에서 유를 창조할 수 있는 마법 같은 궁합!`);
  }
  if (hasTenGod(p2Primary, ['식신', '상관']) && hasTenGod(p1Primary, ['편재', '정재'])) {
    supports.push(`✨ ${p2DayMaster}일간의 톡톡 튀는 창의성이 ${p1DayMaster}일간의 손을 거치면 황금알을 낳는 거위가 됩니다! 예술가와 프로듀서의 만남처럼, 꿈을 현실로 만드는 환상의 듀오예요.`);
  }

  // 관성-인성 조화 (관인상생) - 지성과 권위의 조화
  if (hasTenGod(p1Primary, ['편관', '정관']) && hasTenGod(p2Primary, ['편인', '정인'])) {
    supports.push(`🎓 사회적 권위와 학문적 깊이가 아름답게 어우러지는 관계! 한 사람의 카리스마와 다른 사람의 지혜가 만나, 서로를 더 높은 곳으로 끌어올려주는 '상승의 나선' 같은 궁합이에요.`);
  }

  // 비겁-재성 충돌 (겁재탈재) - 재물 경쟁
  if (hasTenGod(p1Primary, ['비견', '겁재']) && hasTenGod(p2Primary, ['편재', '정재'])) {
    conflicts.push(`⚔️ 돈 앞에서 경쟁심이 발동할 수 있어요! "이건 내 거!" vs "나도 필요해!"의 팽팽한 긴장감... 재정 문제는 미리미리 투명하게 소통하고, 각자의 영역을 명확히 해두는 게 현명해요.`);
  }
  if (hasTenGod(p2Primary, ['비견', '겁재']) && hasTenGod(p1Primary, ['편재', '정재'])) {
    conflicts.push(`⚔️ 재물 관리에서 의견 충돌이 있을 수 있어요! 한 사람은 모으려 하고, 다른 사람은 나누려 할 때 마찰이 생길 수 있습니다. '공동 목표 저금통'을 만들어 함께 꿈을 향해 달리면 좋아요!`);
  }

  // 식상-인성 충돌 (식신제살) - 가치관 충돌
  if (hasTenGod(p1Primary, ['식신', '상관']) && hasTenGod(p2Primary, ['편인', '정인'])) {
    conflicts.push(`🤔 "자유롭게 표현하고 싶어!" vs "깊이 생각하고 신중하게!" - 창의적인 영혼과 신중한 학자의 만남은 때로 불꽃 튀는 토론이 될 수 있어요. 하지만 이 긴장감이 오히려 서로를 성장시키는 자극제가 될 수도!`);
  }

  // 같은 십성이 많으면 공감대는 있지만 경쟁도 가능
  const commonTenGods = p1Primary.filter(tg => p2Primary.includes(tg));
  if (commonTenGods.length >= 2) {
    supports.push(`🤝 공통 십성(${commonTenGods.join(', ')})이 있어서 "아, 너도 그래?" 하는 순간이 많을 거예요! 말하지 않아도 통하는 느낌, 비슷한 가치관으로 깊은 유대감을 느낄 수 있는 '소울메이트' 기질이 있어요.`);
  }

  const balance = calculateTenGodBalance(supports.length, conflicts.length);

  // 일간의 오행 관계로 더 구체적인 해석
  const p1Element = normalizeElement(p1.dayMaster.element);
  const p2Element = normalizeElement(p2.dayMaster.element);

  let relationshipDynamics = '';
  if (balance >= 80) {
    relationshipDynamics = `🌟 ${p1DayMaster}(${getElementKorean(p1Element)})와 ${p2DayMaster}(${getElementKorean(p2Element)})의 십성이 마치 퍼즐 조각처럼 딱 맞아떨어져요! 서로의 장점을 극대화하고 단점을 자연스럽게 보완하는 '천생연분' 궁합이에요. 함께하면 1+1=3이 되는 시너지가 폭발합니다!`;
  } else if (balance >= 60) {
    relationshipDynamics = `💫 ${p1DayMaster}와 ${p2DayMaster}의 에너지가 편안하게 흐르는 관계예요. 큰 파도 없이 잔잔하게 흘러가는 강물처럼, 서로에게 안정감을 주며 함께 성장해 나갈 수 있어요. 노력 없이도 자연스럽게 맞춰지는 부분이 많답니다!`;
  } else if (balance >= 40) {
    relationshipDynamics = `⚡ 십성의 댄스가 때로는 박자가 안 맞을 수 있어요! 하지만 걱정 마세요 - 다름은 틀림이 아니니까요. 서로의 리듬을 이해하고 맞춰가는 과정에서 오히려 더 깊은 유대감이 생길 수 있어요. 소통이 열쇠!`;
  } else {
    relationshipDynamics = `🔥 서로 다른 행성에서 온 것 같은 느낌? 십성의 방향이 많이 달라서 때로는 "왜 저렇게 생각하지?"라는 의문이 들 수 있어요. 하지만! 이런 차이가 오히려 서로에게 새로운 시각을 선물해줄 수 있답니다. 다름을 인정하고 배우려는 열린 마음이 중요해요!`;
  }

  return {
    person1Primary: p1Primary,
    person2Primary: p2Primary,
    interaction: { supports, conflicts, balance },
    relationshipDynamics,
  };
}

function getElementKorean(element: string): string {
  const map: Record<string, string> = {
    wood: '목', fire: '화', earth: '토', metal: '금', water: '수',
  };
  return map[element] || element;
}

function extractPrimaryTenGods(profile: SajuProfile): TenGod[] {
  // 일간 오행을 기준으로 십성 계산
  const primary: TenGod[] = [];
  const dm = normalizeElement(profile.dayMaster.element);

  // 십성 계산 매핑: 일간 오행 기준으로 다른 오행과의 관계
  // 비겁(같은 오행), 식상(내가 생하는 오행), 재성(내가 극하는 오행), 관성(나를 극하는 오행), 인성(나를 생하는 오행)
  const tenGodMap: Record<string, Record<string, TenGod>> = {
    wood: { wood: '비견', fire: '식신', earth: '편재', metal: '편관', water: '정인' },
    fire: { fire: '비견', earth: '식신', metal: '편재', water: '편관', wood: '정인' },
    earth: { earth: '비견', metal: '식신', water: '편재', wood: '편관', fire: '정인' },
    metal: { metal: '비견', water: '식신', wood: '편재', fire: '편관', earth: '정인' },
    water: { water: '비견', wood: '식신', fire: '편재', earth: '편관', metal: '정인' },
  };

  const mapping = tenGodMap[dm];
  if (!mapping) return primary;

  // 각 오행의 강도에 따라 십성 추출 (강한 순서대로)
  const elements = ['wood', 'fire', 'earth', 'metal', 'water'];
  const sorted = elements
    .map(el => ({ element: el, count: profile.elements[el as keyof typeof profile.elements] || 0 }))
    .filter(e => e.count >= 1)
    .sort((a, b) => b.count - a.count);

  for (const { element } of sorted) {
    const tenGod = mapping[element];
    if (tenGod && !primary.includes(tenGod)) {
      primary.push(tenGod);
    }
  }

  return primary.slice(0, 4); // 상위 4개
}

function hasTenGod(list: TenGod[], targets: TenGod[]): boolean {
  return list.some(tg => targets.includes(tg));
}

function calculateTenGodBalance(supports: number, conflicts: number): number {
  const total = supports + conflicts;
  if (total === 0) return 50;
  return Math.round((supports / total) * 100);
}

// ============================================================
// 신살 (Divine Spirits) 분석
// ============================================================

export interface ShinsalAnalysis {
  person1Shinsals: string[];
  person2Shinsals: string[];
  luckyInteractions: string[];
  unluckyInteractions: string[];
  overallImpact: 'very_positive' | 'positive' | 'neutral' | 'challenging';
}

export function analyzeShinsals(p1: SajuProfile, p2: SajuProfile): ShinsalAnalysis {
  const p1Shinsals = extractKeyShinsals(p1);
  const p2Shinsals = extractKeyShinsals(p2);

  const luckyInteractions: string[] = [];
  const unluckyInteractions: string[] = [];

  // 천을귀인 (天乙貴人) - 최고 길신, 하늘의 VIP 패스
  if (p1Shinsals.includes('천을귀인') || p2Shinsals.includes('천을귀인')) {
    luckyInteractions.push(`👼 천을귀인이 함께해요! 마치 하늘에서 내려온 수호천사가 두 사람을 지켜보는 것 같아요. 힘든 순간에도 귀인이 나타나 도움을 주고, 위기가 기회로 바뀌는 신비로운 운명의 보호막이 있답니다. 함께라면 어떤 어려움도 극복할 수 있어요!`);
  }

  // 천덕귀인 (天德貴人) - 덕망과 품격
  if (p1Shinsals.includes('천덕귀인') && p2Shinsals.includes('천덕귀인')) {
    luckyInteractions.push(`🌸 두 분 모두 천덕귀인의 품격을 갖추고 있어요! 마치 고품격 부부처럼, 주변 사람들에게 존경받고 신뢰받는 관계가 될 수 있어요. 함께하면 '저 커플 참 좋다'라는 부러움의 대상이 될 거예요. 덕을 쌓으면 쌓을수록 행운도 따라와요!`);
  } else if (p1Shinsals.includes('천덕귀인') || p2Shinsals.includes('천덕귀인')) {
    luckyInteractions.push(`🌸 천덕귀인의 기품이 관계에 품격을 더해요! 한 사람의 덕망이 두 사람 모두를 빛나게 하고, 주변의 존경을 이끌어내는 관계랍니다.`);
  }

  // 문창귀인 (文昌貴人) - 지적 케미스트리
  if (p1Shinsals.includes('문창귀인') && p2Shinsals.includes('문창귀인')) {
    luckyInteractions.push(`📖 두 분 모두 문창귀인! 지적인 대화가 끊이지 않는 '브레인 커플'이에요! 함께 책을 읽고, 전시회를 가고, 깊은 토론을 나누는 것이 데이트가 될 수 있어요. 서로의 생각을 나눌수록 더 깊이 빠져들게 되는 관계!`);
  } else if (p1Shinsals.includes('문창귀인') || p2Shinsals.includes('문창귀인')) {
    luckyInteractions.push(`📖 문창귀인의 학문적 기운이 관계에 깊이를 더해요! 서로에게 지적 자극을 주고받으며, 함께 성장하는 것이 즐거운 '학구파 커플'의 기질이 있어요. 북클럽이나 스터디 데이트 어때요?`);
  }

  // 도화살 (桃花殺) - 치명적 매력
  if (p1Shinsals.includes('도화살') && p2Shinsals.includes('도화살')) {
    luckyInteractions.push(`🌺 더블 도화살! 서로를 향한 끌림이 자석처럼 강렬해요! 첫눈에 반했거나, 만날 때마다 심장이 두근거리는 느낌... 이 로맨틱한 불꽃은 식지 않을 거예요. 영화 속 주인공 같은 드라마틱한 사랑의 주인공들이에요!`);
    unluckyInteractions.push(`🦋 강렬한 감정의 파도를 타고 있어요! 너무 뜨거운 감정은 때로 이성을 앞서갈 수 있으니, 중요한 결정은 머리가 차가워질 때 해요. 감정의 롤러코스터를 즐기되, 안전벨트는 꼭 매세요!`);
  } else if (p1Shinsals.includes('도화살') || p2Shinsals.includes('도화살')) {
    luckyInteractions.push(`🌺 도화살의 매력이 관계에 로맨스를 더해요! 자연스럽게 상대방을 설레게 하는 마법 같은 매력의 소유자가 있어요. 함께하는 순간순간이 특별하게 느껴질 거예요.`);
  }

  // 역마살 (驛馬殺) - 모험가 기질
  if (p1Shinsals.includes('역마살') && p2Shinsals.includes('역마살')) {
    luckyInteractions.push(`✈️ 더블 역마살! 가만히 있으면 몸이 근질근질한 '노마드 커플'이에요! 함께 세계 여행을 다니고, 새로운 것을 탐험하며, 끊임없이 모험을 떠나는 인생이 기다리고 있어요. 집보다는 공항이 더 익숙해질지도?`);
    unluckyInteractions.push(`🏠 안정보다 변화를 추구하다 보니, 한 곳에 정착하기 어려울 수 있어요! '베이스캠프'를 정해두고, 거기서 함께 에너지를 충전한 후 또 떠나는 리듬을 찾아보세요.`);
  } else if (p1Shinsals.includes('역마살') || p2Shinsals.includes('역마살')) {
    luckyInteractions.push(`✈️ 역마살이 관계에 활력을 불어넣어요! 지루할 틈 없이 항상 새로운 것을 경험하게 될 거예요. 함께 떠나는 여행, 새로운 취미 탐험... 역동적인 에너지가 관계를 신선하게 유지해줘요!`);
  }

  // 양인살 (羊刃殺) - 강렬한 추진력
  if (p1Shinsals.includes('양인살') && p2Shinsals.includes('양인살')) {
    unluckyInteractions.push(`⚔️ 두 사람 모두 양인살의 강렬한 에너지를 갖고 있어요! 마치 두 마리의 사자가 만난 것처럼, 서로 으르렁거리거나 함께 무적의 팀이 될 수 있어요. 핵심은 '경쟁'이 아닌 '협력'의 방향으로 이 에너지를 쓰는 것! 같은 목표를 향해 달리면 천하무적이에요.`);
  } else if (p1Shinsals.includes('양인살') || p2Shinsals.includes('양인살')) {
    unluckyInteractions.push(`⚔️ 양인살의 날카로운 에너지가 있어요! 추진력이 강하고 결단력이 있지만, 때로는 상대방에게 날카롭게 느껴질 수 있어요. 칼날을 다듬어 함께 요리하는 도구로 쓰면 멋진 시너지가 나요!`);
  }

  // 겁살 (劫殺) - 예기치 못한 변화
  if (p1Shinsals.includes('겁살') && p2Shinsals.includes('겁살')) {
    unluckyInteractions.push(`🌪️ 더블 겁살! 인생에 예상치 못한 반전이 많을 수 있어요. 하지만 걱정 마세요 - 롤러코스터를 함께 타면 더 재미있잖아요? 서로의 손을 꼭 잡고 어떤 변화가 와도 함께 헤쳐나가면 오히려 유대감이 더 깊어져요!`);
  } else if (p1Shinsals.includes('겁살') || p2Shinsals.includes('겁살')) {
    unluckyInteractions.push(`🌪️ 겁살의 기운이 있어서 예상치 못한 변화가 찾아올 수 있어요! 하지만 함께라면 어떤 파도도 넘을 수 있어요. 서로를 닻 삼아 흔들리지 않는 안정감을 만들어가세요.`);
  }

  // 화개살 (華蓋殺) - 예술가 기질
  if (p1Shinsals.includes('화개살') && p2Shinsals.includes('화개살')) {
    luckyInteractions.push(`🎨 더블 화개살! 예술적 감성이 풍부한 '아티스트 커플'이에요! 함께 미술관을 가고, 음악을 듣고, 창작활동을 하면 서로에게 영감을 주는 뮤즈가 될 수 있어요. 세상의 아름다움을 함께 발견하는 여정이 기다려요!`);
  } else if (p1Shinsals.includes('화개살') || p2Shinsals.includes('화개살')) {
    luckyInteractions.push(`🎨 화개살의 예술적 감성이 관계에 아름다움을 더해요! 일상 속에서도 특별함을 찾고, 서로에게 영감을 주는 관계가 될 수 있어요. 함께하는 모든 순간이 하나의 작품이 될 거예요.`);
  }

  let overallImpact: ShinsalAnalysis['overallImpact'] = 'neutral';
  const luckyCount = luckyInteractions.length;
  const unluckyCount = unluckyInteractions.length;

  if (luckyCount >= unluckyCount + 2) overallImpact = 'very_positive';
  else if (luckyCount > unluckyCount) overallImpact = 'positive';
  else if (unluckyCount > luckyCount + 1) overallImpact = 'challenging';

  return {
    person1Shinsals: p1Shinsals,
    person2Shinsals: p2Shinsals,
    luckyInteractions,
    unluckyInteractions,
    overallImpact,
  };
}

function extractKeyShinsals(profile: SajuProfile): string[] {
  const shinsals: string[] = [];
  const dayBranch = profile.pillars.day.branch;
  const yearBranch = profile.pillars.year.branch;
  const allBranches = [
    profile.pillars.year.branch,
    profile.pillars.month.branch,
    profile.pillars.day.branch,
    profile.pillars.time.branch,
  ];

  // 천을귀인 (天乙貴人) - 일간 기준
  const tianyi: Record<string, string[]> = {
    '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
    '乙': ['子', '申'], '己': ['子', '申'],
    '丙': ['亥', '酉'], '丁': ['亥', '酉'],
    '壬': ['卯', '巳'], '癸': ['卯', '巳'],
    '辛': ['寅', '午'],
  };
  const dayStem = profile.pillars.day.stem;
  if (tianyi[dayStem]?.some(b => allBranches.includes(b))) {
    shinsals.push('천을귀인');
  }

  // 문창귀인 (文昌貴人) - 일간 기준
  const wenchang: Record<string, string> = {
    '甲': '巳', '乙': '午', '丙': '申', '丁': '酉', '戊': '申',
    '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯',
  };
  if (allBranches.includes(wenchang[dayStem])) {
    shinsals.push('문창귀인');
  }

  // 도화살 (桃花殺) - 일지 또는 년지 기준
  const dohua: Record<string, string> = {
    '子': '酉', '丑': '午', '寅': '卯', '卯': '子',
    '辰': '酉', '巳': '午', '午': '卯', '未': '子',
    '申': '酉', '酉': '午', '戌': '卯', '亥': '子',
  };
  if (allBranches.includes(dohua[dayBranch]) || allBranches.includes(dohua[yearBranch])) {
    shinsals.push('도화살');
  }

  // 역마살 (驛馬殺) - 년지 기준
  const yima: Record<string, string> = {
    '申': '寅', '子': '寅', '辰': '寅',
    '寅': '申', '午': '申', '戌': '申',
    '亥': '巳', '卯': '巳', '未': '巳',
    '巳': '亥', '酉': '亥', '丑': '亥',
  };
  if (allBranches.includes(yima[yearBranch])) {
    shinsals.push('역마살');
  }

  // 천덕귀인 (天德貴人) - 월지 기준
  const tiande: Record<string, string> = {
    '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛',
    '午': '亥', '未': '甲', '申': '癸', '酉': '寅',
    '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚',
  };
  const monthBranch = profile.pillars.month.branch;
  const allStems = [
    profile.pillars.year.stem,
    profile.pillars.month.stem,
    profile.pillars.day.stem,
    profile.pillars.time.stem,
  ];
  if (allStems.includes(tiande[monthBranch]) || allBranches.includes(tiande[monthBranch])) {
    shinsals.push('천덕귀인');
  }

  // 양인살 (羊刃殺) - 일간 기준
  const yangren: Record<string, string> = {
    '甲': '卯', '丙': '午', '戊': '午', '庚': '酉', '壬': '子',
  };
  if (yangren[dayStem] && allBranches.includes(yangren[dayStem])) {
    shinsals.push('양인살');
  }

  // 겁살 (劫殺) - 년지 기준
  const jiesha: Record<string, string> = {
    '申': '亥', '子': '亥', '辰': '亥',
    '寅': '巳', '午': '巳', '戌': '巳',
    '亥': '寅', '卯': '寅', '未': '寅',
    '巳': '申', '酉': '申', '丑': '申',
  };
  if (allBranches.includes(jiesha[yearBranch])) {
    shinsals.push('겁살');
  }

  // 화개살 (華蓋殺) - 년지 기준 (학문/예술)
  const huagai: Record<string, string> = {
    '申': '辰', '子': '辰', '辰': '辰',
    '寅': '戌', '午': '戌', '戌': '戌',
    '亥': '未', '卯': '未', '未': '未',
    '巳': '丑', '酉': '丑', '丑': '丑',
  };
  if (allBranches.includes(huagai[yearBranch])) {
    shinsals.push('화개살');
  }

  return shinsals;
}

// ============================================================
// 육합/삼합/방합 분석
// ============================================================

export interface HapAnalysis {
  yukhap: string[];        // 육합 (6 harmonies)
  samhap: string[];        // 삼합 (3 harmonies)
  banghap: string[];       // 방합 (directional harmonies)
  score: number;           // 0-100
  description: string;
}

export function analyzeHap(p1: SajuProfile, p2: SajuProfile): HapAnalysis {
  const yukhap: string[] = [];
  const samhap: string[] = [];
  const banghap: string[] = [];

  // 육합 관계 (地支 六合)
  const yukhapPairs: Record<string, string> = {
    '子': '丑', '丑': '子',
    '寅': '亥', '亥': '寅',
    '卯': '戌', '戌': '卯',
    '辰': '酉', '酉': '辰',
    '巳': '申', '申': '巳',
    '午': '未', '未': '午',
  };

  // 각 기둥의 지지 비교
  const pillars = ['year', 'month', 'day', 'time'] as const;
  for (const p of pillars) {
    const b1 = p1.pillars[p].branch;
    const b2 = p2.pillars[p].branch;

    if (yukhapPairs[b1] === b2) {
      yukhap.push(`${p} 기둥 육합 (${b1}-${b2})`);
    }
  }

  // 삼합 관계 (申子辰, 寅午戌, 巳酉丑, 亥卯未)
  const samhapGroups = [
    ['申', '子', '辰'],
    ['寅', '午', '戌'],
    ['巳', '酉', '丑'],
    ['亥', '卯', '未'],
  ];

  const allBranches = [
    ...pillars.map(p => p1.pillars[p].branch),
    ...pillars.map(p => p2.pillars[p].branch),
  ];

  for (const group of samhapGroups) {
    const matches = group.filter(b => allBranches.includes(b));
    if (matches.length >= 2) {
      samhap.push(`삼합 ${matches.join('-')} 형성`);
    }
  }

  // 방합 (方合: 寅卯辰=木, 巳午未=火, 申酉戌=金, 亥子丑=水)
  const banghapGroups = [
    { name: '목방합', branches: ['寅', '卯', '辰'] },
    { name: '화방합', branches: ['巳', '午', '未'] },
    { name: '금방합', branches: ['申', '酉', '戌'] },
    { name: '수방합', branches: ['亥', '子', '丑'] },
  ];

  for (const group of banghapGroups) {
    const matches = group.branches.filter(b => allBranches.includes(b));
    if (matches.length >= 2) {
      banghap.push(`${group.name} 형성`);
    }
  }

  const score = Math.min(100, yukhap.length * 30 + samhap.length * 25 + banghap.length * 15);

  let description = '';
  if (score >= 70) {
    description = `🔗 와! 합의 마법이 펼쳐지고 있어요! 두 분의 사주가 마치 퍼즐처럼 척척 맞물리면서 엄청난 시너지를 만들어내고 있어요. 함께하면 개인으로 있을 때보다 훨씬 강해지고, 서로의 부족함이 자연스럽게 채워지는 '운명적인 파트너십'이에요!`;
  } else if (score >= 40) {
    description = `💫 적절한 합의 조화가 있어요! 완전히 딱 맞진 않지만, 서로 맞춰가려는 노력이 빛을 발할 수 있는 관계예요. 마치 살짝 다른 리듬을 가진 두 음악이 만나 새로운 하모니를 만드는 것처럼요. 서로의 템포를 존중하면 아름다운 합주가 될 거예요!`;
  } else {
    description = `✨ 합이 약해도 걱정 마세요! 때로는 서로 다른 것이 오히려 더 재미있고 배울 점이 많아요. 합이 없다는 건 각자의 개성이 강하다는 뜻이기도 해요. 차이를 인정하고 서로를 보완하면, 예상치 못한 멋진 조합이 될 수 있어요!`;
  }

  return { yukhap, samhap, banghap, score, description };
}

// ============================================================
// 충/형/파/해 분석 (부정적 상호작용)
// ============================================================

export interface ConflictAnalysis {
  chung: string[];         // 충 (clash)
  hyeong: string[];        // 형 (punishment)
  pa: string[];            // 파 (break)
  hae: string[];           // 해 (harm)
  totalConflicts: number;
  severity: 'severe' | 'moderate' | 'mild' | 'minimal';
  mitigationAdvice: string[];
}

export function analyzeConflicts(p1: SajuProfile, p2: SajuProfile): ConflictAnalysis {
  const chung: string[] = [];
  const hyeong: string[] = [];
  const pa: string[] = [];
  const hae: string[] = [];

  // 충 관계 (地支 相沖)
  const chungPairs: Record<string, string> = {
    '子': '午', '午': '子',
    '丑': '未', '未': '丑',
    '寅': '申', '申': '寅',
    '卯': '酉', '酉': '卯',
    '辰': '戌', '戌': '辰',
    '巳': '亥', '亥': '巳',
  };

  const pillars = ['year', 'month', 'day', 'time'] as const;
  for (const p of pillars) {
    const b1 = p1.pillars[p].branch;
    const b2 = p2.pillars[p].branch;

    if (chungPairs[b1] === b2) {
      chung.push(`${p} 기둥 충 (${b1}-${b2})`);
    }
  }

  // 형 관계 (복잡하므로 주요 관계만)
  const hyeongGroups = [
    ['寅', '巳', '申'],  // 무은지형
    ['丑', '未', '戌'],  // 지세지형
  ];

  const allBranches = pillars.flatMap(p => [p1.pillars[p].branch, p2.pillars[p].branch]);

  for (const group of hyeongGroups) {
    const matches = group.filter(b => allBranches.includes(b));
    if (matches.length >= 2) {
      hyeong.push(`형 관계 ${matches.join('-')}`);
    }
  }

  // 파 관계
  const paPairs: Record<string, string> = {
    '子': '酉', '酉': '子',
    '午': '卯', '卯': '午',
    '巳': '申', '申': '巳',
    '亥': '寅', '寅': '亥',
  };

  for (const p of pillars) {
    const b1 = p1.pillars[p].branch;
    const b2 = p2.pillars[p].branch;

    if (paPairs[b1] === b2) {
      pa.push(`${p} 기둥 파 (${b1}-${b2})`);
    }
  }

  // 해 관계
  const haePairs: Record<string, string> = {
    '子': '未', '未': '子',
    '丑': '午', '午': '丑',
    '寅': '巳', '巳': '寅',
    '卯': '辰', '辰': '卯',
    '申': '亥', '亥': '申',
    '酉': '戌', '戌': '酉',
  };

  for (const p of pillars) {
    const b1 = p1.pillars[p].branch;
    const b2 = p2.pillars[p].branch;

    if (haePairs[b1] === b2) {
      hae.push(`${p} 기둥 해 (${b1}-${b2})`);
    }
  }

  const totalConflicts = chung.length + hyeong.length + pa.length + hae.length;

  let severity: ConflictAnalysis['severity'] = 'minimal';
  if (totalConflicts >= 4 || chung.length >= 2) severity = 'severe';
  else if (totalConflicts >= 2) severity = 'moderate';
  else if (totalConflicts >= 1) severity = 'mild';

  const mitigationAdvice: string[] = [];
  if (chung.length > 0) {
    mitigationAdvice.push(`💡 충(沖)이 있어요! 두 분이 정반대 방향을 바라보는 순간이 있을 거예요. 하지만 이건 나쁜 게 아니에요 - 서로 다른 관점이 합쳐지면 360도 시야를 갖게 되니까요! 핵심은 '내 방식'을 고집하지 않고, 각자의 공간과 시간을 존중하는 것. 가끔은 따로 또 같이, 이 밸런스를 찾으면 충은 오히려 서로를 보완하는 힘이 돼요!`);
  }
  if (hyeong.length > 0) {
    mitigationAdvice.push(`💡 형(刑)이 있어서 감정이 격해지면 날카로운 말이 오갈 수 있어요! 마치 같은 집에 사는 고양이들처럼, 평소엔 괜찮다가도 영역 다툼이 생길 수 있어요. 비결은? 감정이 격해질 때 5분만 쿨다운 타임을 갖고, 어려운 대화는 차분한 상태에서 하기! 필요하면 친구나 상담사의 중재도 좋아요.`);
  }
  if (pa.length > 0) {
    mitigationAdvice.push(`💡 파(破)가 있어요! 기대와 현실의 갭에서 실망감이 생길 수 있어요. "난 이럴 줄 알았는데..." 하는 순간이 올 수 있죠. 비결은 처음부터 서로에 대한 기대를 명확히 소통하고, 약속은 작은 것부터 꼭 지키는 것! 신뢰의 벽돌을 하나하나 쌓으면 파도 무너뜨릴 수 없는 관계가 돼요.`);
  }
  if (hae.length > 0) {
    mitigationAdvice.push(`💡 해(害)가 있어서 은근히 서로를 방해하게 되는 순간이 있을 수 있어요. 도와주려다 오히려 발목을 잡거나, 걱정이 간섭으로 느껴지기도 해요. 비결은 "도움이 필요해?" 먼저 물어보기! 상대방의 방식을 존중하고, 요청할 때 도와주는 스마트한 서포터가 되세요.`);
  }

  // 충돌이 없을 때도 긍정적인 메시지 추가
  if (totalConflicts === 0) {
    mitigationAdvice.push(`🌈 놀라워요! 충형파해가 하나도 없어요! 사주 간의 마찰이 거의 없다는 뜻이에요. 두 분의 에너지가 서로를 거스르지 않고 자연스럽게 흐르는 관계랍니다. 이런 조화로운 사주 궁합은 정말 드물어요 - 이 소중한 인연을 잘 가꿔가세요!`);
  }

  return { chung, hyeong, pa, hae, totalConflicts, severity, mitigationAdvice };
}

// ============================================================
// 종합 고급 사주 궁합 분석
// ============================================================

export interface ComprehensiveSajuCompatibility {
  tenGods: TenGodAnalysis;
  shinsals: ShinsalAnalysis;
  harmonies: HapAnalysis;
  conflicts: ConflictAnalysis;
  overallScore: number;
  grade: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
  detailedInsights: string[];
}

export function performComprehensiveSajuAnalysis(
  p1: SajuProfile,
  p2: SajuProfile
): ComprehensiveSajuCompatibility {
  const tenGods = analyzeTenGods(p1, p2);
  const shinsals = analyzeShinsals(p1, p2);
  const harmonies = analyzeHap(p1, p2);
  const conflicts = analyzeConflicts(p1, p2);

  // 종합 점수 계산
  const tenGodScore = tenGods.interaction.balance;
  const shinsalScore = shinsals.overallImpact === 'very_positive' ? 90
    : shinsals.overallImpact === 'positive' ? 75
    : shinsals.overallImpact === 'neutral' ? 50 : 30;
  const harmonyScore = harmonies.score;
  const conflictPenalty = conflicts.severity === 'severe' ? -30
    : conflicts.severity === 'moderate' ? -15
    : conflicts.severity === 'mild' ? -5 : 0;

  const overallScore = Math.max(0, Math.min(100,
    tenGodScore * 0.35 +
    shinsalScore * 0.25 +
    harmonyScore * 0.25 +
    conflictPenalty + 15
  ));

  let grade: ComprehensiveSajuCompatibility['grade'];
  if (overallScore >= 95) grade = 'S+';
  else if (overallScore >= 85) grade = 'S';
  else if (overallScore >= 75) grade = 'A';
  else if (overallScore >= 65) grade = 'B';
  else if (overallScore >= 50) grade = 'C';
  else if (overallScore >= 35) grade = 'D';
  else grade = 'F';

  // 요약 - 더 생생하고 매력적으로
  let summary = '';
  if (grade === 'S+') {
    summary = `🌟 와! 전설의 궁합이에요! 사주의 모든 요소가 마치 교향곡처럼 완벽하게 어우러지고 있어요. 십성은 서로를 빛나게 하고, 천을귀인이 두 분을 보호하며, 합의 마법이 펼쳐지고 있어요. 운명이 "이 사람이야!"라고 손짓하는 것 같지 않나요? 이 특별한 인연을 소중히 여기세요!`;
  } else if (grade === 'S') {
    summary = `✨ 드라마에 나올 법한 환상적인 궁합이에요! 사주의 조각들이 아름답게 맞물리면서 서로를 더 빛나게 해주고 있어요. 함께하면 시너지가 폭발하고, 각자의 꿈도 더 가까워지는 '윈-윈' 관계예요. 이런 궁합은 정말 흔치 않아요!`;
  } else if (grade === 'A') {
    summary = `💖 매우 좋은 궁합이에요! 사주의 대부분이 조화롭게 어우러지고 있어요. 작은 파도는 있을 수 있지만, 큰 흐름은 같은 방향을 향하고 있어요. 서로에 대한 믿음을 바탕으로 오래오래 함께할 수 있는 든든한 인연이에요!`;
  } else if (grade === 'B') {
    summary = `💫 괜찮은 궁합이에요! 완벽하진 않지만, 함께 맞춰가면 점점 더 좋아질 수 있는 관계예요. 마치 처음엔 서먹했던 듀엣이 연습을 통해 환상의 호흡을 갖추게 되는 것처럼요. 서로를 이해하려는 노력이 빛을 발할 거예요!`;
  } else if (grade === 'C') {
    summary = `⭐ 노력이 필요한 궁합이에요! 사주상 다른 점이 좀 있지만, 그게 꼭 나쁜 건 아니에요. 다름은 배움의 기회가 될 수 있어요. 서로의 다른 점을 인정하고, 소통하며, 맞춰가면 의외로 좋은 팀이 될 수 있어요!`;
  } else if (grade === 'D') {
    summary = `🌱 도전적인 궁합이에요! 사주가 다른 방향을 가리키고 있지만, 진짜 사랑은 이런 차이도 극복하잖아요? 더 많은 대화, 더 깊은 이해, 그리고 서로를 향한 노력이 필요해요. 어려운 만큼 성공하면 더 깊은 유대감을 느낄 수 있어요!`;
  } else {
    summary = `🔥 상당히 도전적인 궁합이에요! 사주상 맞지 않는 부분이 많지만, 사주가 모든 걸 결정하진 않아요. 서로의 의지와 노력, 그리고 사랑의 힘은 어떤 운명도 바꿀 수 있어요. 이 관계를 원한다면 더 많은 소통과 이해가 필요해요!`;
  }

  // 상세 인사이트 - 더 풍부한 설명
  const detailedInsights: string[] = [
    tenGods.relationshipDynamics,
    shinsals.luckyInteractions[0] || (shinsals.unluckyInteractions[0] ? `주의: ${shinsals.unluckyInteractions[0]}` : '✨ 특별한 신살 상호작용은 없지만, 기본적으로 안정적인 에너지 흐름을 가지고 있어요!'),
    harmonies.description,
  ];

  if (conflicts.totalConflicts > 0) {
    detailedInsights.push(`⚡ ${conflicts.totalConflicts}개의 충형파해가 있어요! 하지만 걱정 마세요 - 알고 대비하면 충분히 극복할 수 있어요. 아래의 조언을 참고해보세요!`);
  } else {
    detailedInsights.push(`🌈 충형파해가 없어요! 사주 간의 마찰이 없어서 자연스럽게 흐르는 관계랍니다.`);
  }

  return {
    tenGods,
    shinsals,
    harmonies,
    conflicts,
    overallScore: Math.round(overallScore),
    grade,
    summary,
    detailedInsights,
  };
}

// ============================================================
// 용신/희신 (Yongsin/Huisin) 궁합 분석
// ============================================================

export interface YongsinAnalysis {
  person1Yongsin: string;       // Person1의 용신 (필요한 오행)
  person1Huisin: string;        // Person1의 희신 (좋은 오행)
  person2Yongsin: string;       // Person2의 용신
  person2Huisin: string;        // Person2의 희신
  mutualSupport: boolean;       // 서로의 용신을 제공하는지
  compatibility: number;        // 0-100
  interpretation: string[];
}

export function analyzeYongsinCompatibility(p1: SajuProfile, p2: SajuProfile): YongsinAnalysis {
  // 일간 기준으로 용신 계산 (간략화된 버전)
  const p1Yongsin = calculateYongsin(p1);
  const p1Huisin = calculateHuisin(p1, p1Yongsin);
  const p2Yongsin = calculateYongsin(p2);
  const p2Huisin = calculateHuisin(p2, p2Yongsin);

  // 일간 이름 가져오기
  const p1DayMaster = p1.dayMaster.name || p1.pillars.day.stem;
  const p2DayMaster = p2.dayMaster.name || p2.pillars.day.stem;

  const interpretation: string[] = [];
  let compatibility = 50;

  // 상대방이 나의 용신을 가지고 있는지 검사
  const p2HasP1Yongsin = getElementStrength(p2, p1Yongsin) >= 2;
  const p1HasP2Yongsin = getElementStrength(p1, p2Yongsin) >= 2;

  const mutualSupport = p2HasP1Yongsin && p1HasP2Yongsin;

  // 용신 설명 헬퍼
  const getElementDescription = (element: string): string => {
    const descriptions: Record<string, string> = {
      wood: '성장, 창의성, 새로운 시작의',
      fire: '열정, 활력, 따뜻함의',
      earth: '안정, 신뢰, 중심의',
      metal: '결단력, 정제, 완성의',
      water: '지혜, 유연함, 깊이의',
    };
    return descriptions[element] || '';
  };

  if (mutualSupport) {
    compatibility = 95;
    interpretation.push(`🔮 운명적인 용신 궁합이에요! 서로에게 필요한 것을 자연스럽게 채워주는 '완벽한 보완 관계'예요. ${p1DayMaster}일간은 ${getElementDescription(p1Yongsin)} 기운이 필요하고, ${p2DayMaster}일간은 ${getElementDescription(p2Yongsin)} 기운이 필요한데, 놀랍게도 서로가 그 기운을 가지고 있어요!`);
    interpretation.push(`💎 함께 있으면 각자 혼자일 때 느끼던 공허함이나 부족함이 자연스럽게 채워지는 느낌을 받을 거예요. 마치 배고픈 사람에게 밥을, 목마른 사람에게 물을 주는 것처럼요. 이런 궁합은 정말 드물어요!`);
  } else if (p2HasP1Yongsin || p1HasP2Yongsin) {
    compatibility = 75;
    if (p2HasP1Yongsin) {
      interpretation.push(`💫 ${p2DayMaster}일간이 ${p1DayMaster}일간에게 꼭 필요한 ${getElementKorean(p1Yongsin)}(${getElementDescription(p1Yongsin)}) 에너지를 가지고 있어요! ${p1DayMaster}일간은 ${p2DayMaster}일간 옆에 있으면 왠지 모르게 편안하고 힘이 나는 느낌을 받을 거예요.`);
    }
    if (p1HasP2Yongsin) {
      interpretation.push(`💫 ${p1DayMaster}일간이 ${p2DayMaster}일간에게 필요한 ${getElementKorean(p2Yongsin)}(${getElementDescription(p2Yongsin)}) 에너지의 원천이에요! ${p2DayMaster}일간은 ${p1DayMaster}일간과 함께할 때 더 균형 잡히고 완전해지는 느낌을 받을 거예요.`);
    }
  } else {
    compatibility = 45;
    interpretation.push(`🌿 용신 측면에서는 직접적인 보완 관계가 아니에요. 하지만 괜찮아요! 용신은 궁합의 한 부분일 뿐이에요.`);
    interpretation.push(`💡 각자에게 필요한 에너지(${p1DayMaster}일간: ${getElementKorean(p1Yongsin)}, ${p2DayMaster}일간: ${getElementKorean(p2Yongsin)})는 취미활동, 인테리어, 색상 선택 등 다른 방식으로 채울 수 있어요. 함께 '우리의 용신 채우기 프로젝트'를 해보는 건 어때요?`);
  }

  // 희신 검사
  if (getElementStrength(p2, p1Huisin) >= 2) {
    compatibility += 10;
    interpretation.push(`✨ 보너스! ${p2DayMaster}일간이 ${p1DayMaster}일간의 희신(${getElementKorean(p1Huisin)} - 용신을 도와주는 좋은 기운)도 가지고 있어요! 마치 메인 요리에 맛있는 사이드 디쉬까지 나오는 느낌이에요.`);
  }
  if (getElementStrength(p1, p2Huisin) >= 2) {
    compatibility += 10;
    interpretation.push(`✨ 보너스! ${p1DayMaster}일간도 ${p2DayMaster}일간의 희신(${getElementKorean(p2Huisin)})을 품고 있어요! 서로에게 주는 것이 더 많아지는 관계랍니다.`);
  }

  return {
    person1Yongsin: p1Yongsin,
    person1Huisin: p1Huisin,
    person2Yongsin: p2Yongsin,
    person2Huisin: p2Huisin,
    mutualSupport,
    compatibility: Math.min(100, compatibility),
    interpretation,
  };
}

function calculateYongsin(profile: SajuProfile): string {
  const dm = normalizeElement(profile.dayMaster.element);
  const elements = profile.elements;

  // 일간의 강약 판단
  const selfStrength = elements[dm as keyof typeof elements] || 0;
  const isStrong = selfStrength >= 3;

  // 오행 생극 관계로 용신 결정
  const yongsinMap: Record<string, { strong: string; weak: string }> = {
    wood: { strong: 'metal', weak: 'water' },  // 강하면 금(관성), 약하면 수(인성)
    fire: { strong: 'water', weak: 'wood' },
    earth: { strong: 'wood', weak: 'fire' },
    metal: { strong: 'fire', weak: 'earth' },
    water: { strong: 'earth', weak: 'metal' },
  };

  return yongsinMap[dm]?.[isStrong ? 'strong' : 'weak'] || 'earth';
}

function calculateHuisin(profile: SajuProfile, yongsin: string): string {
  // 희신은 용신을 생하는 오행
  const generateMap: Record<string, string> = {
    wood: 'water',
    fire: 'wood',
    earth: 'fire',
    metal: 'earth',
    water: 'metal',
  };
  return generateMap[yongsin] || 'earth';
}

function getElementStrength(profile: SajuProfile, element: string): number {
  return profile.elements[element as keyof typeof profile.elements] || 0;
}

// ============================================================
// 대운 (Daeun/Major Fortune) 흐름 비교
// ============================================================

export interface DaeunCompatibility {
  person1CurrentDaeun: DaeunPeriod;
  person2CurrentDaeun: DaeunPeriod;
  harmonicPeriods: string[];      // 두 사람의 대운이 조화로운 시기
  challengingPeriods: string[];   // 대운 충돌 시기
  currentSynergy: number;         // 현재 대운 시너지 0-100
  futureOutlook: string;
}

export interface DaeunPeriod {
  stem: string;
  branch: string;
  element: string;
  startAge: number;
  endAge: number;
  theme: string;
}

export function analyzeDaeunCompatibility(
  p1: SajuProfile,
  p2: SajuProfile,
  p1Age: number,
  p2Age: number
): DaeunCompatibility {
  // 현재 대운 계산
  const p1CurrentDaeun = getCurrentDaeun(p1, p1Age);
  const p2CurrentDaeun = getCurrentDaeun(p2, p2Age);

  const harmonicPeriods: string[] = [];
  const challengingPeriods: string[] = [];

  // 현재 대운의 오행 비교
  const p1El = p1CurrentDaeun.element;
  const p2El = p2CurrentDaeun.element;

  let currentSynergy = 50;

  // 오행 조화 검사
  if (p1El === p2El) {
    currentSynergy = 75;
    harmonicPeriods.push(`현재: 두 사람 모두 ${p1El}의 시기로 공감대 형성`);
  } else if (areElementsHarmonious(p1El, p2El)) {
    currentSynergy = 85;
    harmonicPeriods.push(`현재: ${p1El}와 ${p2El}가 상생하여 서로 도움`);
  } else if (areElementsClashing(p1El, p2El)) {
    currentSynergy = 35;
    challengingPeriods.push(`현재: ${p1El}와 ${p2El}가 상극하여 마찰 가능`);
  }

  // 용신과 대운 비교
  const p1Yongsin = calculateYongsin(p1);
  const p2Yongsin = calculateYongsin(p2);
  const p1DayMaster = p1.dayMaster.name || p1.pillars.day.stem;
  const p2DayMaster = p2.dayMaster.name || p2.pillars.day.stem;

  if (p2CurrentDaeun.element === p1Yongsin) {
    currentSynergy += 15;
    harmonicPeriods.push(`${p2DayMaster}일간의 대운이 ${p1DayMaster}일간의 용신(${getElementKorean(p1Yongsin)})을 충족`);
  }
  if (p1CurrentDaeun.element === p2Yongsin) {
    currentSynergy += 15;
    harmonicPeriods.push(`${p1DayMaster}일간의 대운이 ${p2DayMaster}일간의 용신(${getElementKorean(p2Yongsin)})을 충족`);
  }

  // 미래 전망 - 더 구체적이고 매력적으로
  let futureOutlook = '';
  if (currentSynergy >= 80) {
    futureOutlook = `🚀 와! 지금이 황금기예요! 두 분의 대운이 같은 방향으로 흐르고 있어서, 함께 무언가를 시작하기에 최고의 타이밍이에요. 새로운 도전, 중요한 결정, 함께하는 프로젝트... 지금 시작하면 두 배의 속도로 성장할 수 있어요!`;
  } else if (currentSynergy >= 60) {
    futureOutlook = `🌤️ 안정적으로 좋은 시기예요! 대운이 서로를 방해하지 않고 자연스럽게 흐르고 있어요. 큰 파도 없이 꾸준히 함께 나아갈 수 있는 시기예요. 매일매일 쌓이는 작은 행복들이 나중에 큰 결실이 될 거예요!`;
  } else if (currentSynergy >= 40) {
    futureOutlook = `⛅ 대운이 살짝 다른 방향을 가리키고 있어요. 하지만 걱정 마세요 - 이건 서로의 다른 면을 발견하고 이해할 수 있는 기회예요! 각자의 성장을 응원하면서도 '우리'라는 공동의 목표를 잊지 않는 게 핵심이에요.`;
  } else {
    futureOutlook = `🌈 지금은 각자의 여정에 집중해야 할 때예요. 대운이 다른 방향을 가리키고 있지만, 이건 헤어지라는 뜻이 아니에요! 각자가 자신의 길에서 성장한 후 다시 만나면, 더 성숙하고 풍요로운 관계가 될 거예요. 서로의 성장을 진심으로 응원해주세요!`;
  }

  return {
    person1CurrentDaeun: p1CurrentDaeun,
    person2CurrentDaeun: p2CurrentDaeun,
    harmonicPeriods,
    challengingPeriods,
    currentSynergy: Math.min(100, currentSynergy),
    futureOutlook,
  };
}

function getCurrentDaeun(profile: SajuProfile, age: number): DaeunPeriod {
  // 대운 시작 나이 계산 (간략화)
  const startAge = Math.floor(age / 10) * 10;
  const stemIndex = Math.floor(age / 10) % 10;
  const branchIndex = Math.floor(age / 10) % 12;

  const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  const stem = stems[stemIndex];
  const branch = branches[branchIndex];

  // 천간의 오행
  const stemElements: Record<string, string> = {
    '甲': 'wood', '乙': 'wood',
    '丙': 'fire', '丁': 'fire',
    '戊': 'earth', '己': 'earth',
    '庚': 'metal', '辛': 'metal',
    '壬': 'water', '癸': 'water',
  };

  const element = stemElements[stem] || 'earth';

  const themes: Record<string, string> = {
    wood: '성장과 발전의 시기',
    fire: '열정과 표현의 시기',
    earth: '안정과 수확의 시기',
    metal: '결실과 정리의 시기',
    water: '지혜와 준비의 시기',
  };

  return {
    stem,
    branch,
    element,
    startAge,
    endAge: startAge + 10,
    theme: themes[element] || '변화의 시기',
  };
}

function areElementsHarmonious(el1: string, el2: string): boolean {
  const harmonious: Record<string, string[]> = {
    wood: ['water', 'fire'],
    fire: ['wood', 'earth'],
    earth: ['fire', 'metal'],
    metal: ['earth', 'water'],
    water: ['metal', 'wood'],
  };
  return harmonious[el1]?.includes(el2) ?? false;
}

function areElementsClashing(el1: string, el2: string): boolean {
  const clashing: Record<string, string> = {
    wood: 'metal',
    fire: 'water',
    earth: 'wood',
    metal: 'fire',
    water: 'earth',
  };
  return clashing[el1] === el2 || clashing[el2] === el1;
}

// ============================================================
// 세운 (Seun/Annual Fortune) 비교
// ============================================================

export interface SeunCompatibility {
  year: number;
  yearStem: string;
  yearBranch: string;
  yearElement: string;
  person1Impact: 'very_favorable' | 'favorable' | 'neutral' | 'challenging' | 'very_challenging';
  person2Impact: 'very_favorable' | 'favorable' | 'neutral' | 'challenging' | 'very_challenging';
  combinedOutlook: string;
  advice: string[];
}

export function analyzeSeunCompatibility(
  p1: SajuProfile,
  p2: SajuProfile,
  year: number
): SeunCompatibility {
  // 해당 연도의 천간지지 계산
  const yearData = getYearStemBranch(year);

  const p1Impact = calculateYearImpact(p1, yearData.element);
  const p2Impact = calculateYearImpact(p2, yearData.element);

  const advice: string[] = [];

  // 올해 궁합 영향
  let combinedOutlook = '';

  const impactScore = (impact: string): number => {
    const scores: Record<string, number> = {
      very_favorable: 5,
      favorable: 4,
      neutral: 3,
      challenging: 2,
      very_challenging: 1,
    };
    return scores[impact] || 3;
  };

  const avgScore = (impactScore(p1Impact) + impactScore(p2Impact)) / 2;

  if (avgScore >= 4.5) {
    combinedOutlook = `🎆 ${year}년은 두 분에게 축복받은 해예요! 우주가 두 분의 손을 들어주고 있어요. 함께 시작하는 일마다 순풍에 돛 단 듯 술술 풀릴 거예요. 새로운 도전, 중요한 결정, 함께 떠나는 여행... 뭘 해도 좋은 추억이 될 황금 같은 한 해예요!`;
    advice.push('💫 새로운 시작, 중요한 결정, 함께하는 도전에 최적의 해! 지금 망설이던 일이 있다면 올해가 기회예요.');
    advice.push('🚀 함께하는 활동에서 시너지가 폭발해요! 공동 프로젝트, 여행, 새로운 취미를 함께 시작해보세요.');
  } else if (avgScore >= 3.5) {
    combinedOutlook = `🌟 ${year}년은 편안하고 안정적인 해예요. 드라마틱한 변화보다는 차곡차곡 쌓아가는 시간이에요. 매일 조금씩 함께 노력하면 연말에 뒤돌아봤을 때 '와, 우리 이만큼이나 왔네!' 하고 놀랄 거예요.`;
    advice.push('📈 안정적인 계획 실행에 딱 좋아요. 급하게 서두르지 말고 꾸준히 나아가세요.');
    advice.push('🎯 작은 목표들을 함께 세우고 하나씩 달성해보세요. 성취감이 관계를 더 끈끈하게 만들어요.');
  } else if (avgScore >= 2.5) {
    combinedOutlook = `⚓ ${year}년은 약간의 파도가 있는 해예요. 하지만 걱정 마세요 - 파도를 함께 넘으면 더 노련한 선원이 되는 거잖아요? 서로를 더 깊이 이해하게 되는 소중한 시간이 될 수 있어요.`;
    advice.push('🛡️ 큰 변화보다는 현재의 것을 지키는 데 집중하세요. 안정이 최우선이에요.');
    advice.push('💬 서로에 대한 이해와 인내가 필요해요. 대화를 많이 나누고, 상대방의 입장에서 생각해보세요.');
  } else {
    combinedOutlook = `🌧️ ${year}년은 함께 우산을 써야 할 시간이에요. 비가 오면 땅이 굳어지듯, 지금의 어려움이 두 분의 관계를 더 단단하게 만들어 줄 거예요. 힘든 시간을 함께 버텨낸 사이는 그 어떤 것보다 강해져요.`;
    advice.push('⏰ 중요한 결정은 조금 미루는 것도 지혜예요. 올해는 준비하고 내년에 실행하는 전략으로!');
    advice.push('💪 건강과 안전을 최우선으로! 서로의 안녕을 챙기면서 이 시간을 함께 버텨내세요.');
  }

  return {
    year,
    yearStem: yearData.stem,
    yearBranch: yearData.branch,
    yearElement: yearData.element,
    person1Impact: p1Impact,
    person2Impact: p2Impact,
    combinedOutlook,
    advice,
  };
}

function getYearStemBranch(year: number): { stem: string; branch: string; element: string } {
  const stems = ['庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己'];
  const branches = ['申', '酉', '戌', '亥', '子', '丑', '寅', '卯', '辰', '巳', '午', '未'];

  const stemIndex = (year - 4) % 10;
  const branchIndex = (year - 4) % 12;

  const stemElements: Record<string, string> = {
    '甲': 'wood', '乙': 'wood',
    '丙': 'fire', '丁': 'fire',
    '戊': 'earth', '己': 'earth',
    '庚': 'metal', '辛': 'metal',
    '壬': 'water', '癸': 'water',
  };

  const stem = stems[stemIndex];

  return {
    stem,
    branch: branches[branchIndex],
    element: stemElements[stem] || 'earth',
  };
}

function calculateYearImpact(
  profile: SajuProfile,
  yearElement: string
): 'very_favorable' | 'favorable' | 'neutral' | 'challenging' | 'very_challenging' {
  const yongsin = calculateYongsin(profile);
  const huisin = calculateHuisin(profile, yongsin);
  const dm = normalizeElement(profile.dayMaster.element);

  if (yearElement === yongsin) return 'very_favorable';
  if (yearElement === huisin) return 'favorable';
  if (areElementsHarmonious(yearElement, dm)) return 'favorable';
  if (areElementsClashing(yearElement, dm)) return 'challenging';
  if (yearElement === dm) return 'neutral';

  return 'neutral';
}

// ============================================================
// 공망 (Gongmang/Empty Branches) 분석
// ============================================================

export interface GongmangAnalysis {
  person1Gongmang: string[];      // Person1의 공망 지지
  person2Gongmang: string[];      // Person2의 공망 지지
  person1InP2Gongmang: boolean;   // Person1의 일지가 Person2 공망에 해당
  person2InP1Gongmang: boolean;   // Person2의 일지가 Person1 공망에 해당
  impact: 'positive' | 'neutral' | 'negative';
  interpretation: string[];
}

export function analyzeGongmang(p1: SajuProfile, p2: SajuProfile): GongmangAnalysis {
  const p1Gongmang = calculateGongmang(p1.pillars.day.stem, p1.pillars.day.branch);
  const p2Gongmang = calculateGongmang(p2.pillars.day.stem, p2.pillars.day.branch);

  const p1DayBranch = p1.pillars.day.branch;
  const p2DayBranch = p2.pillars.day.branch;
  const p1DayMaster = p1.dayMaster.name || p1.pillars.day.stem;
  const p2DayMaster = p2.dayMaster.name || p2.pillars.day.stem;

  const person1InP2Gongmang = p2Gongmang.includes(p1DayBranch);
  const person2InP1Gongmang = p1Gongmang.includes(p2DayBranch);

  const interpretation: string[] = [];
  let impact: GongmangAnalysis['impact'] = 'neutral';

  if (person1InP2Gongmang && person2InP1Gongmang) {
    impact = 'negative';
    interpretation.push(`🌫️ 신비로운 공망의 베일이 두 분 사이에 드리워져 있어요. 서로에게 '뭔가 아쉬운 느낌'이 들 수 있고, 마치 안개 속에서 서로를 찾는 것 같은 느낌이 들 때가 있을 거예요.`);
    interpretation.push(`💡 하지만 이건 오히려 특별한 의미가 있어요! 공망 관계는 '전생에서 못 다한 인연'이라고도 해요. 의식적으로 서로를 향한 노력을 기울이면, 그 어떤 관계보다 깊고 신비로운 연결이 될 수 있어요.`);
    interpretation.push(`🔮 공망을 극복하는 비밀: 서로에게 자주 표현하세요! "보고 싶어", "고마워", "사랑해" - 말로 하지 않으면 안개 속에 사라지지만, 말로 하면 빛이 되어 서로를 비춰줘요.`);
  } else if (person1InP2Gongmang || person2InP1Gongmang) {
    impact = 'neutral';
    if (person1InP2Gongmang) {
      interpretation.push(`👻 ${p2DayMaster}일간이 ${p1DayMaster}일간을 볼 때, 가끔 '얘가 옆에 있었나?' 하고 존재감이 희미하게 느껴질 때가 있을 수 있어요. 이건 ${p1DayMaster}일간의 문제가 아니라 공망의 안개 때문이에요!`);
    }
    if (person2InP1Gongmang) {
      interpretation.push(`👻 ${p1DayMaster}일간이 ${p2DayMaster}일간을 볼 때, 때때로 '얘 뭐하고 있지?' 하고 상대가 멀게 느껴질 때가 있을 수 있어요. 이건 ${p2DayMaster}일간의 문제가 아니라 공망의 안개 때문이에요!`);
    }
    interpretation.push(`✨ 걱정 마세요! 의식적인 관심과 꾸준한 소통으로 충분히 극복할 수 있어요. 서로에게 적극적으로 존재감을 표현하면, 오히려 더 특별한 관계가 될 수 있답니다.`);
  } else {
    impact = 'positive';
    interpretation.push(`🎯 공망 충돌이 없어요! 서로의 존재가 또렷하게 인식되는 관계예요.`);
    interpretation.push(`💖 두 분은 서로에게 자연스럽게 기억에 남는 사람이에요. '그 사람 생각이 나네...' 하고 문득문득 떠오르는 존재감 있는 관계! 안개 없이 맑은 하늘 아래서 서로를 바라보는 것 같은 인연이에요.`);
  }

  return {
    person1Gongmang: p1Gongmang,
    person2Gongmang: p2Gongmang,
    person1InP2Gongmang,
    person2InP1Gongmang,
    impact,
    interpretation,
  };
}

function calculateGongmang(stem: string, branch: string): string[] {
  // 일주 기준 공망 계산
  // 10개 천간과 12개 지지에서 남는 2개 지지가 공망
  const gongmangTable: Record<string, string[]> = {
    '甲子': ['戌', '亥'], '乙丑': ['戌', '亥'], '丙寅': ['戌', '亥'], '丁卯': ['戌', '亥'], '戊辰': ['戌', '亥'],
    '己巳': ['戌', '亥'], '庚午': ['申', '酉'], '辛未': ['申', '酉'], '壬申': ['申', '酉'], '癸酉': ['申', '酉'],
    '甲戌': ['申', '酉'], '乙亥': ['申', '酉'], '丙子': ['午', '未'], '丁丑': ['午', '未'], '戊寅': ['午', '未'],
    '己卯': ['午', '未'], '庚辰': ['午', '未'], '辛巳': ['午', '未'], '壬午': ['辰', '巳'], '癸未': ['辰', '巳'],
    '甲申': ['辰', '巳'], '乙酉': ['辰', '巳'], '丙戌': ['辰', '巳'], '丁亥': ['辰', '巳'], '戊子': ['寅', '卯'],
    '己丑': ['寅', '卯'], '庚寅': ['寅', '卯'], '辛卯': ['寅', '卯'], '壬辰': ['寅', '卯'], '癸巳': ['寅', '卯'],
    '甲午': ['子', '丑'], '乙未': ['子', '丑'], '丙申': ['子', '丑'], '丁酉': ['子', '丑'], '戊戌': ['子', '丑'],
    '己亥': ['子', '丑'], '庚子': ['戌', '亥'], '辛丑': ['戌', '亥'], '壬寅': ['戌', '亥'], '癸卯': ['戌', '亥'],
  };

  const key = `${stem}${branch}`;
  return gongmangTable[key] || ['戌', '亥'];
}

// ============================================================
// 천간합 (Heavenly Stem Combination) 분석
// ============================================================

export interface GanHapAnalysis {
  combinations: GanHapCombination[];
  totalHarmony: number;
  significance: string;
}

export interface GanHapCombination {
  stem1: string;
  stem2: string;
  pillar1: string;
  pillar2: string;
  resultElement: string;
  description: string;
}

export function analyzeGanHap(p1: SajuProfile, p2: SajuProfile): GanHapAnalysis {
  const combinations: GanHapCombination[] = [];

  // 천간합 관계: 甲己合土, 乙庚合金, 丙辛合水, 丁壬合木, 戊癸合火
  const ganHapPairs: Record<string, { partner: string; result: string }> = {
    '甲': { partner: '己', result: 'earth' },
    '己': { partner: '甲', result: 'earth' },
    '乙': { partner: '庚', result: 'metal' },
    '庚': { partner: '乙', result: 'metal' },
    '丙': { partner: '辛', result: 'water' },
    '辛': { partner: '丙', result: 'water' },
    '丁': { partner: '壬', result: 'wood' },
    '壬': { partner: '丁', result: 'wood' },
    '戊': { partner: '癸', result: 'fire' },
    '癸': { partner: '戊', result: 'fire' },
  };

  const pillars = ['year', 'month', 'day', 'time'] as const;

  for (const p1Pillar of pillars) {
    const p1Stem = p1.pillars[p1Pillar].stem;
    const hapInfo = ganHapPairs[p1Stem];

    if (hapInfo) {
      for (const p2Pillar of pillars) {
        const p2Stem = p2.pillars[p2Pillar].stem;

        if (p2Stem === hapInfo.partner) {
          combinations.push({
            stem1: p1Stem,
            stem2: p2Stem,
            pillar1: p1Pillar,
            pillar2: p2Pillar,
            resultElement: hapInfo.result,
            description: `${p1Pillar} ${p1Stem}와 ${p2Pillar} ${p2Stem}가 합하여 ${hapInfo.result} 생성`,
          });
        }
      }
    }
  }

  // 일간 합은 특별히 의미가 큼
  const dayHap = combinations.find(c => c.pillar1 === 'day' || c.pillar2 === 'day');

  let totalHarmony = combinations.length * 20;
  let significance = '';

  if (dayHap) {
    totalHarmony += 30;
    significance = `💕 와! 일간 천간합이에요! 이건 사주에서 가장 로맨틱한 인연 중 하나예요. 마치 자석의 N극과 S극처럼 서로에게 자연스럽게 끌리는 관계! 처음 만났을 때 '이 사람 어디서 봤나?' 하는 묘한 익숙함을 느꼈을 수도 있어요. 운명이 두 분을 연결해놓은 거예요.`;
  } else if (combinations.length >= 2) {
    significance = `🔗 천간합이 ${combinations.length}개나 있어요! 여러 방면에서 척척 맞는 관계예요. 마치 여러 개의 다리로 연결된 두 섬처럼, 어떤 상황에서도 서로를 이해하고 연결될 수 있는 통로가 많아요. 함께하면 시너지가 폭발하는 조합!`;
  } else if (combinations.length === 1) {
    significance = `✨ 천간합이 하나 있어요! 특정 영역에서 찰떡궁합을 보여주는 관계예요. 이 합이 작용하는 분야(일, 감정, 가정 등)에서는 마치 오랜 파트너처럼 자연스럽게 협력할 수 있어요. 작지만 확실한 연결고리가 두 분을 이어주고 있어요.`;
  } else {
    significance = `🌈 천간합은 없지만 걱정 마세요! 천간합만이 인연의 전부가 아니에요. 오히려 다른 방식의 깊은 연결이 있을 수 있어요. 지지합, 오행의 조화, 십성의 관계 등 다양한 요소들이 두 분의 특별한 케미를 만들어내고 있을 거예요!`;
  }

  return {
    combinations,
    totalHarmony: Math.min(100, totalHarmony),
    significance,
  };
}

// ============================================================
// 격국 (Gyeokguk/Chart Pattern) 비교
// ============================================================

export type GyeokgukType =
  | '정관격' | '편관격' | '정인격' | '편인격'
  | '정재격' | '편재격' | '식신격' | '상관격'
  | '건록격' | '양인격' | '종격';

export interface GyeokgukAnalysis {
  person1Gyeokguk: GyeokgukType;
  person2Gyeokguk: GyeokgukType;
  compatibility: 'excellent' | 'good' | 'neutral' | 'challenging';
  dynamics: string;
  strengths: string[];
  challenges: string[];
}

export function analyzeGyeokguk(p1: SajuProfile, p2: SajuProfile): GyeokgukAnalysis {
  const p1Gyeokguk = determineGyeokguk(p1);
  const p2Gyeokguk = determineGyeokguk(p2);

  const strengths: string[] = [];
  const challenges: string[] = [];
  let compatibility: GyeokgukAnalysis['compatibility'] = 'neutral';
  let dynamics = '';

  // 격국 조합 분석
  const combo = `${p1Gyeokguk}-${p2Gyeokguk}`;

  // 좋은 조합
  const excellentCombos = [
    '정관격-정인격', '정인격-정관격',
    '정재격-식신격', '식신격-정재격',
    '정관격-정재격', '정재격-정관격',
  ];

  const goodCombos = [
    '편관격-편인격', '편인격-편관격',
    '편재격-상관격', '상관격-편재격',
    '건록격-정관격', '정관격-건록격',
  ];

  const challengingCombos = [
    '양인격-양인격',
    '상관격-정관격', '정관격-상관격',
    '편관격-양인격', '양인격-편관격',
  ];

  if (excellentCombos.includes(combo)) {
    compatibility = 'excellent';
    dynamics = `🏆 격국의 환상적인 조합이에요! ${p1Gyeokguk}와 ${p2Gyeokguk}가 만나면 마치 명품 브랜드의 콜라보레이션 같아요. 각자의 강점이 배가 되고, 함께 있으면 1+1이 3이 되는 마법 같은 시너지!`;
    strengths.push('🚀 사회적 성공을 함께 이룰 수 있는 드림팀 조합! 비즈니스 파트너로도 최고예요.');
    strengths.push('🧩 서로의 빈 곳을 자연스럽게 채워주는 퍼즐 같은 관계. 내가 부족하면 상대가 있고, 상대가 힘들면 내가 있는!');
  } else if (goodCombos.includes(combo)) {
    compatibility = 'good';
    dynamics = `✨ 격국의 조화가 좋아요! ${p1Gyeokguk}와 ${p2Gyeokguk}의 만남은 마치 좋은 와인과 치즈의 페어링 같아요. 각자 혼자서도 좋지만, 함께하면 더 특별해지는 관계!`;
    strengths.push('💪 서로 다른 무기를 가진 팀메이트처럼, 어떤 상황에서도 협력해서 헤쳐나갈 수 있어요.');
  } else if (challengingCombos.includes(combo)) {
    compatibility = 'challenging';
    dynamics = `⚡ ${p1Gyeokguk}와 ${p2Gyeokguk}는 두 마리 호랑이 같은 조합이에요! 강한 에너지가 부딪히면 불꽃이 튀지만, 그 불꽃이 서로를 성장시키는 원동력이 될 수도 있어요.`;
    challenges.push('🎯 가치관과 행동 방식이 달라서 "왜 저렇게 하지?" 하고 의아할 때가 있을 거예요. 하지만 이건 틀린 게 아니라 다른 거예요!');
    challenges.push('👑 누가 리드할지 경쟁이 생길 수 있어요. 하지만 서로의 영역을 존중하면 두 사람 다 왕이 될 수 있어요!');
  } else if (p1Gyeokguk === p2Gyeokguk) {
    compatibility = 'good';
    dynamics = `🪞 같은 ${p1Gyeokguk}! 마치 거울을 보는 것 같아요. 상대방이 왜 그렇게 행동하는지 본능적으로 이해할 수 있어요. "아, 나도 그랬을 거야"라는 공감이 자연스럽게 생기는 관계!`;
    strengths.push('🎯 비슷한 가치관과 목표를 가지고 있어서 같은 방향을 바라보며 함께 걸어갈 수 있어요.');
    challenges.push('🌶️ 너무 비슷해서 가끔 "새로운 자극이 필요해!" 할 때가 있을 수 있어요. 함께 새로운 경험을 찾아보세요!');
  } else {
    dynamics = `🌈 ${p1Gyeokguk}와 ${p2Gyeokguk}의 만남은 서로 다른 색깔의 조화예요! 다양성이 관계를 풍요롭게 만들어요.`;
    strengths.push('📚 서로에게 배울 점이 많아요! 상대방을 통해 세상을 보는 새로운 렌즈를 얻을 수 있어요.');
  }

  return {
    person1Gyeokguk: p1Gyeokguk,
    person2Gyeokguk: p2Gyeokguk,
    compatibility,
    dynamics,
    strengths,
    challenges,
  };
}

function determineGyeokguk(profile: SajuProfile): GyeokgukType {
  const monthStem = profile.pillars.month.stem;
  const dayMasterElement = normalizeElement(profile.dayMaster.element);

  // 월간과 일간의 관계로 격국 결정 (간략화)
  const stemElements: Record<string, string> = {
    '甲': 'wood', '乙': 'wood',
    '丙': 'fire', '丁': 'fire',
    '戊': 'earth', '己': 'earth',
    '庚': 'metal', '辛': 'metal',
    '壬': 'water', '癸': 'water',
  };

  const monthElement = stemElements[monthStem] || 'earth';

  // 십성 관계로 격국 결정
  const relationship = getTenGodRelationship(dayMasterElement, monthElement);

  const gyeokgukMap: Record<string, GyeokgukType> = {
    '비겁': '건록격',
    '식상': '식신격',
    '재성': '정재격',
    '관성': '정관격',
    '인성': '정인격',
  };

  return gyeokgukMap[relationship] || '정관격';
}

function getTenGodRelationship(dayMaster: string, target: string): string {
  // 오행 관계로 십성 카테고리 결정
  if (dayMaster === target) return '비겁';

  const generates: Record<string, string> = {
    wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
  };
  const controls: Record<string, string> = {
    wood: 'earth', fire: 'metal', earth: 'water', metal: 'wood', water: 'fire',
  };

  if (generates[dayMaster] === target) return '식상';
  if (generates[target] === dayMaster) return '인성';
  if (controls[dayMaster] === target) return '재성';
  if (controls[target] === dayMaster) return '관성';

  return '비겁';
}

// ============================================================
// 12운성 (Twelve States) 분석
// ============================================================

export type TwelveState =
  | '장생' | '목욕' | '관대' | '건록' | '제왕' | '쇠'
  | '병' | '사' | '묘' | '절' | '태' | '양';

export interface TwelveStatesAnalysis {
  person1States: { pillar: string; state: TwelveState; meaning: string }[];
  person2States: { pillar: string; state: TwelveState; meaning: string }[];
  energyCompatibility: number;
  interpretation: string[];
}

export function analyzeTwelveStates(p1: SajuProfile, p2: SajuProfile): TwelveStatesAnalysis {
  const p1States = calculateTwelveStates(p1);
  const p2States = calculateTwelveStates(p2);

  const interpretation: string[] = [];
  let energyCompatibility = 50;

  // 일지 12운성 비교 (가장 중요)
  const p1DayState = p1States.find(s => s.pillar === 'day')?.state;
  const p2DayState = p2States.find(s => s.pillar === 'day')?.state;

  // 왕성한 운성들
  const strongStates: TwelveState[] = ['건록', '제왕', '관대', '장생'];
  // 약한 운성들
  const weakStates: TwelveState[] = ['사', '묘', '절', '병'];

  const p1Strong = p1DayState && strongStates.includes(p1DayState);
  const p2Strong = p2DayState && strongStates.includes(p2DayState);
  const p1Weak = p1DayState && weakStates.includes(p1DayState);
  const p2Weak = p2DayState && weakStates.includes(p2DayState);

  // 일간 이름 가져오기
  const p1DayMaster = p1.dayMaster.name || p1.pillars.day.stem;
  const p2DayMaster = p2.dayMaster.name || p2.pillars.day.stem;

  if (p1Strong && p2Strong) {
    energyCompatibility = 85;
    interpretation.push(`⚡ 파워 커플 탄생! ${p1DayMaster}일간(${p1DayState})과 ${p2DayMaster}일간(${p2DayState}) 모두 왕성한 에너지를 뿜어내고 있어요! 마치 두 개의 태양이 만난 것처럼 눈부시고 역동적인 관계예요. 함께하면 못 이룰 일이 없을 것 같아요!`);
    interpretation.push(`🏆 다만 조심! 두 사람 다 에너지가 넘치다 보니 "내가 이끌 거야!"하는 순간이 올 수 있어요. 핵심은 경쟁이 아닌 협력! 각자의 강점을 발휘할 영역을 나누면 세상을 정복할 수 있어요!`);
  } else if (p1Strong && p2Weak) {
    energyCompatibility = 70;
    interpretation.push(`🦸 ${p1DayMaster}일간(${p1DayState})이 에너지 넘치는 히어로 역할! ${p2DayMaster}일간(${p2DayState})에게 활력을 불어넣고 리드해주는 관계예요. 한 사람이 끌어주고, 한 사람이 따라가는 자연스러운 밸런스가 있어요.`);
    interpretation.push(`💕 ${p2DayMaster}일간은 ${p1DayMaster}일간 덕분에 더 활기차지고, ${p1DayMaster}일간은 ${p2DayMaster}일간의 차분함에서 안정감을 얻어요. 서로에게 필요한 것을 주고받는 좋은 조합이에요!`);
  } else if (p1Weak && p2Strong) {
    energyCompatibility = 70;
    interpretation.push(`🌟 ${p2DayMaster}일간(${p2DayState})이 에너지 충전기 역할! ${p1DayMaster}일간(${p1DayState})에게 활력과 자신감을 불어넣어주는 관계예요. 서로 다른 에너지 레벨이 오히려 아름다운 균형을 이뤄요.`);
    interpretation.push(`🌙 ${p1DayMaster}일간의 차분하고 깊은 에너지가 ${p2DayMaster}일간의 넘치는 열정에 방향을 잡아줘요. 마치 바람과 돛의 관계처럼, 서로가 있어야 더 멀리 갈 수 있어요!`);
  } else if (p1Weak && p2Weak) {
    energyCompatibility = 45;
    interpretation.push(`🌿 ${p1DayMaster}일간(${p1DayState})과 ${p2DayMaster}일간(${p2DayState}), 서로 조용한 에너지를 가지고 있어요. 시끌벅적한 것보다 둘만의 평화로운 시간을 즐기는 '집순이/집돌이' 커플 타입이에요!`);
    interpretation.push(`☕ 하지만 가끔은 함께 밖으로 나가서 새로운 자극을 받는 것도 좋아요! 활발한 친구들과 어울리거나, 새로운 취미에 도전해보세요. 약간의 스파이스가 관계를 더 풍성하게 해줄 거예요!`);
  } else {
    energyCompatibility = 60;
    interpretation.push(`⚖️ ${p1DayMaster}일간(${p1DayState || '중간'})과 ${p2DayMaster}일간(${p2DayState || '중간'}), 에너지 레벨이 적당히 균형 잡혀 있어요! 극과 극이 아니라서 서로를 이해하기 쉽고, 비슷한 페이스로 함께 걸어갈 수 있어요.`);
    interpretation.push(`🎵 마치 템포가 비슷한 두 노래가 자연스럽게 어우러지는 것처럼, 무리 없이 조화로운 관계를 만들어갈 수 있어요. 안정감 속에서 천천히 깊어지는 사랑이에요!`);
  }

  return {
    person1States: p1States,
    person2States: p2States,
    energyCompatibility,
    interpretation,
  };
}

function calculateTwelveStates(
  profile: SajuProfile
): { pillar: string; state: TwelveState; meaning: string }[] {
  const results: { pillar: string; state: TwelveState; meaning: string }[] = [];
  const dm = normalizeElement(profile.dayMaster.element);

  // 12운성 표 (일간 기준, 각 지지에서의 상태)
  const twelveStatesTable: Record<string, Record<string, TwelveState>> = {
    wood: {
      '亥': '장생', '子': '목욕', '丑': '관대', '寅': '건록', '卯': '제왕', '辰': '쇠',
      '巳': '병', '午': '사', '未': '묘', '申': '절', '酉': '태', '戌': '양',
    },
    fire: {
      '寅': '장생', '卯': '목욕', '辰': '관대', '巳': '건록', '午': '제왕', '未': '쇠',
      '申': '병', '酉': '사', '戌': '묘', '亥': '절', '子': '태', '丑': '양',
    },
    earth: {
      '寅': '장생', '卯': '목욕', '辰': '관대', '巳': '건록', '午': '제왕', '未': '쇠',
      '申': '병', '酉': '사', '戌': '묘', '亥': '절', '子': '태', '丑': '양',
    },
    metal: {
      '巳': '장생', '午': '목욕', '未': '관대', '申': '건록', '酉': '제왕', '戌': '쇠',
      '亥': '병', '子': '사', '丑': '묘', '寅': '절', '卯': '태', '辰': '양',
    },
    water: {
      '申': '장생', '酉': '목욕', '戌': '관대', '亥': '건록', '子': '제왕', '丑': '쇠',
      '寅': '병', '卯': '사', '辰': '묘', '巳': '절', '午': '태', '未': '양',
    },
  };

  const stateMeanings: Record<TwelveState, string> = {
    '장생': '새로운 시작의 에너지',
    '목욕': '정화와 변화의 에너지',
    '관대': '성장과 발전의 에너지',
    '건록': '안정과 실력의 에너지',
    '제왕': '최고의 왕성한 에너지',
    '쇠': '서서히 줄어드는 에너지',
    '병': '쇠약해지는 에너지',
    '사': '끝나가는 에너지',
    '묘': '저장과 휴식의 에너지',
    '절': '완전한 휴지기',
    '태': '새 생명 잉태의 에너지',
    '양': '양육받는 에너지',
  };

  const pillars = ['year', 'month', 'day', 'time'] as const;

  for (const pillar of pillars) {
    const branch = profile.pillars[pillar].branch;
    const table = twelveStatesTable[dm];
    const state = table?.[branch] || '건록';

    results.push({
      pillar,
      state,
      meaning: stateMeanings[state],
    });
  }

  return results;
}

// ============================================================
// 확장된 종합 사주 궁합 분석
// ============================================================

export interface ExtendedSajuCompatibility extends ComprehensiveSajuCompatibility {
  yongsin: YongsinAnalysis;
  daeun: DaeunCompatibility;
  seun: SeunCompatibility;
  gongmang: GongmangAnalysis;
  ganHap: GanHapAnalysis;
  gyeokguk: GyeokgukAnalysis;
  twelveStates: TwelveStatesAnalysis;
}

export function performExtendedSajuAnalysis(
  p1: SajuProfile,
  p2: SajuProfile,
  p1Age: number = 30,
  p2Age: number = 30,
  currentYear: number = new Date().getFullYear()
): ExtendedSajuCompatibility {
  // 기존 분석
  const baseAnalysis = performComprehensiveSajuAnalysis(p1, p2);

  // 확장 분석
  const yongsin = analyzeYongsinCompatibility(p1, p2);
  const daeun = analyzeDaeunCompatibility(p1, p2, p1Age, p2Age);
  const seun = analyzeSeunCompatibility(p1, p2, currentYear);
  const gongmang = analyzeGongmang(p1, p2);
  const ganHap = analyzeGanHap(p1, p2);
  const gyeokguk = analyzeGyeokguk(p1, p2);
  const twelveStates = analyzeTwelveStates(p1, p2);

  // 확장된 점수 계산
  const extendedScore =
    baseAnalysis.overallScore * 0.4 +
    yongsin.compatibility * 0.15 +
    daeun.currentSynergy * 0.1 +
    ganHap.totalHarmony * 0.1 +
    (gyeokguk.compatibility === 'excellent' ? 100 :
      gyeokguk.compatibility === 'good' ? 75 :
      gyeokguk.compatibility === 'neutral' ? 50 : 30) * 0.1 +
    twelveStates.energyCompatibility * 0.1 +
    (gongmang.impact === 'positive' ? 80 :
      gongmang.impact === 'neutral' ? 50 : 30) * 0.05;

  // 등급 재계산
  let grade: ComprehensiveSajuCompatibility['grade'];
  if (extendedScore >= 95) grade = 'S+';
  else if (extendedScore >= 85) grade = 'S';
  else if (extendedScore >= 75) grade = 'A';
  else if (extendedScore >= 65) grade = 'B';
  else if (extendedScore >= 50) grade = 'C';
  else if (extendedScore >= 35) grade = 'D';
  else grade = 'F';

  // 상세 인사이트 확장
  const detailedInsights = [
    ...baseAnalysis.detailedInsights,
    `용신 궁합: ${yongsin.mutualSupport ? '서로의 용신 충족 (최상)' : '부분적 용신 보완'}`,
    `대운 시너지: ${daeun.futureOutlook}`,
    `올해 전망: ${seun.combinedOutlook}`,
    `천간합: ${ganHap.significance}`,
    `격국 조화: ${gyeokguk.dynamics}`,
    ...gongmang.interpretation.slice(0, 1),
    ...twelveStates.interpretation.slice(0, 1),
  ];

  return {
    ...baseAnalysis,
    overallScore: Math.round(extendedScore),
    grade,
    detailedInsights,
    yongsin,
    daeun,
    seun,
    gongmang,
    ganHap,
    gyeokguk,
    twelveStates,
  };
}

/**
 * @file Shinsal (신살) Analysis
 * 신살 궁합 분석
 */

import type { SajuProfile } from '../cosmicCompatibility';
import type { ShinsalAnalysis } from './types';

export function analyzeShinsals(p1: SajuProfile, p2: SajuProfile): ShinsalAnalysis {
  const p1Shinsals = extractKeyShinsals(p1);
  const p2Shinsals = extractKeyShinsals(p2);

  const luckyInteractions: string[] = [];
  const unluckyInteractions: string[] = [];

  // 천을귀인
  if (p1Shinsals.includes('천을귀인') || p2Shinsals.includes('천을귀인')) {
    luckyInteractions.push(`👼 천을귀인이 함께해요! 마치 하늘에서 내려온 수호천사가 두 사람을 지켜보는 것 같아요. 힘든 순간에도 귀인이 나타나 도움을 주고, 위기가 기회로 바뀌는 신비로운 운명의 보호막이 있답니다. 함께라면 어떤 어려움도 극복할 수 있어요!`);
  }

  // 천덕귀인
  if (p1Shinsals.includes('천덕귀인') && p2Shinsals.includes('천덕귀인')) {
    luckyInteractions.push(`🌸 두 분 모두 천덕귀인의 품격을 갖추고 있어요! 마치 고품격 부부처럼, 주변 사람들에게 존경받고 신뢰받는 관계가 될 수 있어요. 함께하면 '저 커플 참 좋다'라는 부러움의 대상이 될 거예요. 덕을 쌓으면 쌓을수록 행운도 따라와요!`);
  } else if (p1Shinsals.includes('천덕귀인') || p2Shinsals.includes('천덕귀인')) {
    luckyInteractions.push(`🌸 천덕귀인의 기품이 관계에 품격을 더해요! 한 사람의 덕망이 두 사람 모두를 빛나게 하고, 주변의 존경을 이끌어내는 관계랍니다.`);
  }

  // 문창귀인
  if (p1Shinsals.includes('문창귀인') && p2Shinsals.includes('문창귀인')) {
    luckyInteractions.push(`📖 두 분 모두 문창귀인! 지적인 대화가 끊이지 않는 '브레인 커플'이에요! 함께 책을 읽고, 전시회를 가고, 깊은 토론을 나누는 것이 데이트가 될 수 있어요. 서로의 생각을 나눌수록 더 깊이 빠져들게 되는 관계!`);
  } else if (p1Shinsals.includes('문창귀인') || p2Shinsals.includes('문창귀인')) {
    luckyInteractions.push(`📖 문창귀인의 학문적 기운이 관계에 깊이를 더해요! 서로에게 지적 자극을 주고받으며, 함께 성장하는 것이 즐거운 '학구파 커플'의 기질이 있어요. 북클럽이나 스터디 데이트 어때요?`);
  }

  // 도화살
  if (p1Shinsals.includes('도화살') && p2Shinsals.includes('도화살')) {
    luckyInteractions.push(`🌺 더블 도화살! 서로를 향한 끌림이 자석처럼 강렬해요! 첫눈에 반했거나, 만날 때마다 심장이 두근거리는 느낌... 이 로맨틱한 불꽃은 식지 않을 거예요. 영화 속 주인공 같은 드라마틱한 사랑의 주인공들이에요!`);
    unluckyInteractions.push(`🦋 강렬한 감정의 파도를 타고 있어요! 너무 뜨거운 감정은 때로 이성을 앞서갈 수 있으니, 중요한 결정은 머리가 차가워질 때 해요. 감정의 롤러코스터를 즐기되, 안전벨트는 꼭 매세요!`);
  } else if (p1Shinsals.includes('도화살') || p2Shinsals.includes('도화살')) {
    luckyInteractions.push(`🌺 도화살의 매력이 관계에 로맨스를 더해요! 자연스럽게 상대방을 설레게 하는 마법 같은 매력의 소유자가 있어요. 함께하는 순간순간이 특별하게 느껴질 거예요.`);
  }

  // 역마살
  if (p1Shinsals.includes('역마살') && p2Shinsals.includes('역마살')) {
    luckyInteractions.push(`✈️ 더블 역마살! 가만히 있으면 몸이 근질근질한 '노마드 커플'이에요! 함께 세계 여행을 다니고, 새로운 것을 탐험하며, 끊임없이 모험을 떠나는 인생이 기다리고 있어요. 집보다는 공항이 더 익숙해질지도?`);
    unluckyInteractions.push(`🏠 안정보다 변화를 추구하다 보니, 한 곳에 정착하기 어려울 수 있어요! '베이스캠프'를 정해두고, 거기서 함께 에너지를 충전한 후 또 떠나는 리듬을 찾아보세요.`);
  } else if (p1Shinsals.includes('역마살') || p2Shinsals.includes('역마살')) {
    luckyInteractions.push(`✈️ 역마살이 관계에 활력을 불어넣어요! 지루할 틈 없이 항상 새로운 것을 경험하게 될 거예요. 함께 떠나는 여행, 새로운 취미 탐험... 역동적인 에너지가 관계를 신선하게 유지해줘요!`);
  }

  // 양인살
  if (p1Shinsals.includes('양인살') && p2Shinsals.includes('양인살')) {
    unluckyInteractions.push(`⚔️ 두 사람 모두 양인살의 강렬한 에너지를 갖고 있어요! 마치 두 마리의 사자가 만난 것처럼, 서로 으르렁거리거나 함께 무적의 팀이 될 수 있어요. 핵심은 '경쟁'이 아닌 '협력'의 방향으로 이 에너지를 쓰는 것! 같은 목표를 향해 달리면 천하무적이에요.`);
  } else if (p1Shinsals.includes('양인살') || p2Shinsals.includes('양인살')) {
    unluckyInteractions.push(`⚔️ 양인살의 날카로운 에너지가 있어요! 추진력이 강하고 결단력이 있지만, 때로는 상대방에게 날카롭게 느껴질 수 있어요. 칼날을 다듬어 함께 요리하는 도구로 쓰면 멋진 시너지가 나요!`);
  }

  // 겁살
  if (p1Shinsals.includes('겁살') && p2Shinsals.includes('겁살')) {
    unluckyInteractions.push(`🌪️ 더블 겁살! 인생에 예상치 못한 반전이 많을 수 있어요. 하지만 걱정 마세요 - 롤러코스터를 함께 타면 더 재미있잖아요? 서로의 손을 꼭 잡고 어떤 변화가 와도 함께 헤쳐나가면 오히려 유대감이 더 깊어져요!`);
  } else if (p1Shinsals.includes('겁살') || p2Shinsals.includes('겁살')) {
    unluckyInteractions.push(`🌪️ 겁살의 기운이 있어서 예상치 못한 변화가 찾아올 수 있어요! 하지만 함께라면 어떤 파도도 넘을 수 있어요. 서로를 닻 삼아 흔들리지 않는 안정감을 만들어가세요.`);
  }

  // 화개살
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

  // 천을귀인
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

  // 문창귀인
  const wenchang: Record<string, string> = {
    '甲': '巳', '乙': '午', '丙': '申', '丁': '酉', '戊': '申',
    '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯',
  };
  if (allBranches.includes(wenchang[dayStem])) {
    shinsals.push('문창귀인');
  }

  // 도화살
  const dohua: Record<string, string> = {
    '子': '酉', '丑': '午', '寅': '卯', '卯': '子',
    '辰': '酉', '巳': '午', '午': '卯', '未': '子',
    '申': '酉', '酉': '午', '戌': '卯', '亥': '子',
  };
  if (allBranches.includes(dohua[dayBranch]) || allBranches.includes(dohua[yearBranch])) {
    shinsals.push('도화살');
  }

  // 역마살
  const yima: Record<string, string> = {
    '申': '寅', '子': '寅', '辰': '寅',
    '寅': '申', '午': '申', '戌': '申',
    '亥': '巳', '卯': '巳', '未': '巳',
    '巳': '亥', '酉': '亥', '丑': '亥',
  };
  if (allBranches.includes(yima[yearBranch])) {
    shinsals.push('역마살');
  }

  // 천덕귀인
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

  // 양인살
  const yangren: Record<string, string> = {
    '甲': '卯', '丙': '午', '戊': '午', '庚': '酉', '壬': '子',
  };
  if (yangren[dayStem] && allBranches.includes(yangren[dayStem])) {
    shinsals.push('양인살');
  }

  // 겁살
  const jiesha: Record<string, string> = {
    '申': '亥', '子': '亥', '辰': '亥',
    '寅': '巳', '午': '巳', '戌': '巳',
    '亥': '寅', '卯': '寅', '未': '寅',
    '巳': '申', '酉': '申', '丑': '申',
  };
  if (allBranches.includes(jiesha[yearBranch])) {
    shinsals.push('겁살');
  }

  // 화개살
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

/**
 * @file Ten Gods (십성) Analysis
 * 십성 궁합 분석
 */

import type { SajuProfile } from '../cosmicCompatibility';
import type { TenGod, TenGodAnalysis } from './types';
import { normalizeElement, getElementKorean } from './element-utils';

export function analyzeTenGods(p1: SajuProfile, p2: SajuProfile): TenGodAnalysis {
  const p1Primary = extractPrimaryTenGods(p1);
  const p2Primary = extractPrimaryTenGods(p2);

  const p1DayMaster = p1.dayMaster.name || p1.pillars.day.stem;
  const p2DayMaster = p2.dayMaster.name || p2.pillars.day.stem;

  const supports: string[] = [];
  const conflicts: string[] = [];

  // 재성-관성 조화 (재생관)
  if (hasTenGod(p1Primary, ['편재', '정재']) && hasTenGod(p2Primary, ['편관', '정관'])) {
    supports.push(`💰 ${p1DayMaster}일간이 재물을 모으고, ${p2DayMaster}일간이 사회적 지위로 발전시키는 황금 파트너십! 마치 CEO와 투자자의 완벽한 조합처럼, 함께하면 물질적 성공과 명예를 동시에 거머쥘 수 있는 관계예요.`);
  }
  if (hasTenGod(p2Primary, ['편재', '정재']) && hasTenGod(p1Primary, ['편관', '정관'])) {
    supports.push(`💰 ${p2DayMaster}일간의 경제적 감각이 ${p1DayMaster}일간의 리더십을 빛나게 합니다! 한 사람이 자원을 확보하고, 다른 사람이 그것을 사회적 영향력으로 전환하는 최고의 팀워크예요.`);
  }

  // 인성-비겁 조화
  if (hasTenGod(p1Primary, ['편인', '정인']) && hasTenGod(p2Primary, ['비견', '겁재'])) {
    supports.push(`📚 ${p1DayMaster}일간이 지혜로운 조언자이자 정신적 지주 역할을 해요! 인생의 방향을 제시하고, 힘든 순간에 마음의 안식처가 되어주는 '영혼의 멘토' 같은 존재랍니다.`);
  }
  if (hasTenGod(p2Primary, ['편인', '정인']) && hasTenGod(p1Primary, ['비견', '겁재'])) {
    supports.push(`📚 ${p2DayMaster}일간이 깊은 통찰력으로 방향을 제시해요! 마치 인생의 네비게이션처럼, 복잡한 상황에서도 현명한 해답을 찾아주는 지혜로운 파트너예요.`);
  }

  // 식상-재성 조화 (식상생재)
  if (hasTenGod(p1Primary, ['식신', '상관']) && hasTenGod(p2Primary, ['편재', '정재'])) {
    supports.push(`✨ ${p1DayMaster}일간의 반짝이는 아이디어가 ${p2DayMaster}일간을 통해 현금으로 바뀌어요! 창의력과 비즈니스 감각의 환상적인 콜라보레이션 - 함께라면 무에서 유를 창조할 수 있는 마법 같은 궁합!`);
  }
  if (hasTenGod(p2Primary, ['식신', '상관']) && hasTenGod(p1Primary, ['편재', '정재'])) {
    supports.push(`✨ ${p2DayMaster}일간의 톡톡 튀는 창의성이 ${p1DayMaster}일간의 손을 거치면 황금알을 낳는 거위가 됩니다! 예술가와 프로듀서의 만남처럼, 꿈을 현실로 만드는 환상의 듀오예요.`);
  }

  // 관성-인성 조화 (관인상생)
  if (hasTenGod(p1Primary, ['편관', '정관']) && hasTenGod(p2Primary, ['편인', '정인'])) {
    supports.push(`🎓 사회적 권위와 학문적 깊이가 아름답게 어우러지는 관계! 한 사람의 카리스마와 다른 사람의 지혜가 만나, 서로를 더 높은 곳으로 끌어올려주는 '상승의 나선' 같은 궁합이에요.`);
  }

  // 비겁-재성 충돌 (겁재탈재)
  if (hasTenGod(p1Primary, ['비견', '겁재']) && hasTenGod(p2Primary, ['편재', '정재'])) {
    conflicts.push(`⚔️ 돈 앞에서 경쟁심이 발동할 수 있어요! "이건 내 거!" vs "나도 필요해!"의 팽팽한 긴장감... 재정 문제는 미리미리 투명하게 소통하고, 각자의 영역을 명확히 해두는 게 현명해요.`);
  }
  if (hasTenGod(p2Primary, ['비견', '겁재']) && hasTenGod(p1Primary, ['편재', '정재'])) {
    conflicts.push(`⚔️ 재물 관리에서 의견 충돌이 있을 수 있어요! 한 사람은 모으려 하고, 다른 사람은 나누려 할 때 마찰이 생길 수 있습니다. '공동 목표 저금통'을 만들어 함께 꿈을 향해 달리면 좋아요!`);
  }

  // 식상-인성 충돌 (식신제살)
  if (hasTenGod(p1Primary, ['식신', '상관']) && hasTenGod(p2Primary, ['편인', '정인'])) {
    conflicts.push(`🤔 "자유롭게 표현하고 싶어!" vs "깊이 생각하고 신중하게!" - 창의적인 영혼과 신중한 학자의 만남은 때로 불꽃 튀는 토론이 될 수 있어요. 하지만 이 긴장감이 오히려 서로를 성장시키는 자극제가 될 수도!`);
  }

  // 같은 십성이 많으면 공감대
  const commonTenGods = p1Primary.filter(tg => p2Primary.includes(tg));
  if (commonTenGods.length >= 2) {
    supports.push(`🤝 공통 십성(${commonTenGods.join(', ')})이 있어서 "아, 너도 그래?" 하는 순간이 많을 거예요! 말하지 않아도 통하는 느낌, 비슷한 가치관으로 깊은 유대감을 느낄 수 있는 '소울메이트' 기질이 있어요.`);
  }

  const balance = calculateTenGodBalance(supports.length, conflicts.length);

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

function extractPrimaryTenGods(profile: SajuProfile): TenGod[] {
  const primary: TenGod[] = [];
  const dm = normalizeElement(profile.dayMaster.element);

  const tenGodMap: Record<string, Record<string, TenGod>> = {
    wood: { wood: '비견', fire: '식신', earth: '편재', metal: '편관', water: '정인' },
    fire: { fire: '비견', earth: '식신', metal: '편재', water: '편관', wood: '정인' },
    earth: { earth: '비견', metal: '식신', water: '편재', wood: '편관', fire: '정인' },
    metal: { metal: '비견', water: '식신', wood: '편재', fire: '편관', earth: '정인' },
    water: { water: '비견', wood: '식신', fire: '편재', earth: '편관', metal: '정인' },
  };

  const mapping = tenGodMap[dm];
  if (!mapping) return primary;

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

  return primary.slice(0, 4);
}

function hasTenGod(list: TenGod[], targets: TenGod[]): boolean {
  return list.some(tg => targets.includes(tg));
}

function calculateTenGodBalance(supports: number, conflicts: number): number {
  const total = supports + conflicts;
  if (total === 0) return 50;
  return Math.round((supports / total) * 100);
}

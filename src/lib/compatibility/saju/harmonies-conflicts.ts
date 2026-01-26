/**
 * @file Harmonies and Conflicts Analysis
 * 합(육합/삼합/방합) 및 충돌(충/형/파/해) 분석
 */

import type { SajuProfile } from '../cosmicCompatibility';
import type { HapAnalysis, ConflictAnalysis } from './types';

export function analyzeHap(p1: SajuProfile, p2: SajuProfile): HapAnalysis {
  const yukhap: string[] = [];
  const samhap: string[] = [];
  const banghap: string[] = [];

  // 육합 관계
  const yukhapPairs: Record<string, string> = {
    '子': '丑', '丑': '子',
    '寅': '亥', '亥': '寅',
    '卯': '戌', '戌': '卯',
    '辰': '酉', '酉': '辰',
    '巳': '申', '申': '巳',
    '午': '未', '未': '午',
  };

  const pillars = ['year', 'month', 'day', 'time'] as const;
  for (const p of pillars) {
    const b1 = p1.pillars[p].branch;
    const b2 = p2.pillars[p].branch;

    if (yukhapPairs[b1] === b2) {
      yukhap.push(`${p} 기둥 육합 (${b1}-${b2})`);
    }
  }

  // 삼합 관계
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

  // 방합
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

export function analyzeConflicts(p1: SajuProfile, p2: SajuProfile): ConflictAnalysis {
  const chung: string[] = [];
  const hyeong: string[] = [];
  const pa: string[] = [];
  const hae: string[] = [];

  // 충 관계
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

  // 형 관계
  const hyeongGroups = [
    ['寅', '巳', '申'],
    ['丑', '未', '戌'],
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
  if (totalConflicts >= 4 || chung.length >= 2) {severity = 'severe';}
  else if (totalConflicts >= 2) {severity = 'moderate';}
  else if (totalConflicts >= 1) {severity = 'mild';}

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

  if (totalConflicts === 0) {
    mitigationAdvice.push(`🌈 놀라워요! 충형파해가 하나도 없어요! 사주 간의 마찰이 거의 없다는 뜻이에요. 두 분의 에너지가 서로를 거스르지 않고 자연스럽게 흐르는 관계랍니다. 이런 조화로운 사주 궁합은 정말 드물어요 - 이 소중한 인연을 잘 가꿔가세요!`);
  }

  return { chung, hyeong, pa, hae, totalConflicts, severity, mitigationAdvice };
}

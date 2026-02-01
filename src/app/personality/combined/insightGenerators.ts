import type { ICPAnalysis } from '@/lib/icp/types';
import type { PersonaAnalysis } from '@/lib/persona/types';
import { ICP_OCTANT_PROFILES } from './octantProfiles';

interface Insight {
  title: string;
  content: string;
  icon: string;
}

// 에너지 레벨 분석 - 모든 조합 커버
export function getEnergyInsight(
  dominance: number,
  affiliation: number,
  energyScore: number,
  isKo: boolean
): Insight {
  const isHighEnergy = energyScore > 60;
  const isLowEnergy = energyScore < 40;
  const isMidEnergy = !isHighEnergy && !isLowEnergy;
  const isDominant = dominance > 0.15;
  const isSubmissive = dominance < -0.15;
  const isMidDominance = !isDominant && !isSubmissive;

  // 고에너지 조합 (3가지)
  if (isHighEnergy && isDominant) {
    return {
      icon: '⚡',
      title: isKo ? '에너지 폭발형' : 'Energy Powerhouse',
      content: isKo
        ? '높은 외향성과 주도적 성향이 결합되어 주변에 활력을 불어넣습니다. 리더십, 영업, 무대 위의 역할에서 빛을 발합니다.'
        : 'High extroversion combined with dominant tendencies energizes those around you. You shine in leadership, sales, and spotlight roles.',
    };
  }

  if (isHighEnergy && isSubmissive) {
    return {
      icon: '🎭',
      title: isKo ? '사교적 조율자' : 'Social Harmonizer',
      content: isKo
        ? '외향적이지만 상대를 존중하는 스타일로, 갈등 없이 사람들을 연결합니다. 중재, 고객 서비스, 팀 빌딩에 적합합니다.'
        : 'Extroverted yet respectful style connects people without conflict. Ideal for mediation, customer service, and team building.',
    };
  }

  if (isHighEnergy && isMidDominance) {
    return {
      icon: '🌈',
      title: isKo ? '활발한 소통가' : 'Vibrant Communicator',
      content: isKo
        ? '외향적 에너지가 넘치면서도 상황에 따라 유연하게 대응합니다. 네트워킹, 이벤트 기획, 마케팅에서 강점을 발휘합니다.'
        : 'Abundant extroverted energy with flexible situational responses. Strong in networking, event planning, and marketing.',
    };
  }

  // 저에너지 조합 (3가지)
  if (isLowEnergy && isSubmissive) {
    return {
      icon: '🌙',
      title: isKo ? '깊은 내면 탐구자' : 'Deep Inner Explorer',
      content: isKo
        ? '내향적 에너지와 수용적 성향이 만나 깊은 사색과 창조적 작업에 몰입합니다. 연구, 예술, 글쓰기에서 독창성을 발휘합니다.'
        : 'Introverted energy meets receptive nature for deep reflection and creative immersion. You excel in research, art, and writing.',
    };
  }

  if (isLowEnergy && isDominant) {
    return {
      icon: '🎯',
      title: isKo ? '전략적 지휘관' : 'Strategic Commander',
      content: isKo
        ? '조용하지만 강력한 리더십을 발휘합니다. 뒤에서 전략을 짜고 핵심적인 순간에 결정적 영향력을 행사합니다.'
        : 'Quiet but powerful leadership. You strategize behind the scenes and exert decisive influence at crucial moments.',
    };
  }

  if (isLowEnergy && isMidDominance) {
    return {
      icon: '🦉',
      title: isKo ? '사려 깊은 관찰자' : 'Thoughtful Observer',
      content: isKo
        ? '차분한 에너지로 상황을 깊이 분석합니다. 복잡한 문제를 풀어내는 통찰력과 집중력이 뛰어납니다.'
        : 'Calm energy for deep situational analysis. Excellent insight and focus for solving complex problems.',
    };
  }

  // 중간 에너지 조합 (3가지)
  if (isMidEnergy && isDominant) {
    return {
      icon: '🏹',
      title: isKo ? '균형잡힌 리더' : 'Balanced Leader',
      content: isKo
        ? '적절한 에너지 조절 능력과 리더십이 결합됩니다. 필요할 때 주도하고, 필요할 때 경청하는 유연한 리더십을 발휘합니다.'
        : 'Energy regulation ability combined with leadership. Flexible leadership that leads when needed and listens when needed.',
    };
  }

  if (isMidEnergy && isSubmissive) {
    return {
      icon: '🌿',
      title: isKo ? '조화로운 협력자' : 'Harmonious Collaborator',
      content: isKo
        ? '안정적인 에너지와 수용적 자세로 팀워크의 핵심이 됩니다. 갈등을 해소하고 팀의 결속력을 높입니다.'
        : 'Stable energy with receptive attitude makes you core to teamwork. You resolve conflicts and strengthen team bonds.',
    };
  }

  // 기본값 (중간 에너지 + 중간 지배성)
  return {
    icon: '⚖️',
    title: isKo ? '적응형 에너지' : 'Adaptive Energy',
    content: isKo
      ? '상황에 따라 에너지 레벨을 조절하는 유연함이 있습니다. 다양한 환경과 역할에서 균형 있게 적응합니다.'
      : 'Flexibility to adjust energy levels based on situations. You adapt balanced across various environments and roles.',
  };
}

// 의사결정 스타일 분석 - 모든 조합 커버
export function getDecisionInsight(
  affiliation: number,
  decisionScore: number,
  octant: string,
  isKo: boolean
): Insight {
  const isEmpathic = decisionScore > 60; // H axis
  const isLogical = decisionScore < 40; // L axis
  const isMidDecision = !isEmpathic && !isLogical;
  const isWarm = affiliation > 0.15;
  const isCold = affiliation < -0.15;
  const isMidAffiliation = !isWarm && !isCold;

  // 공감형 조합 (3가지)
  if (isEmpathic && isWarm) {
    return {
      icon: '💝',
      title: isKo ? '마음을 읽는 공감가' : 'Heart Reader',
      content: isKo
        ? '감정 기반 의사결정과 따뜻한 대인관계가 시너지를 만듭니다. 사람들의 숨겨진 필요를 직감적으로 알아차리고 돌봅니다.'
        : 'Emotion-based decisions synergize with warm relationships. You intuitively sense and care for people\'s hidden needs.',
    };
  }

  if (isEmpathic && isCold) {
    return {
      icon: '🔮',
      title: isKo ? '객관적 조언자' : 'Objective Advisor',
      content: isKo
        ? '공감하지만 거리를 유지하는 독특한 조합입니다. 상대의 감정을 이해하면서도 객관적 조언을 제공할 수 있습니다.'
        : 'Unique blend of empathy with distance. You understand others\' emotions while providing objective advice.',
    };
  }

  if (isEmpathic && isMidAffiliation) {
    return {
      icon: '🎯',
      title: isKo ? '감성적 중재자' : 'Emotional Mediator',
      content: isKo
        ? '감정을 중시하면서도 적절한 거리감을 유지합니다. 갈등 상황에서 양측의 감정을 이해하고 중재하는 역할에 적합합니다.'
        : 'Valuing emotions while maintaining appropriate distance. Ideal for understanding and mediating both sides in conflicts.',
    };
  }

  // 논리형 조합 (3가지)
  if (isLogical && isCold) {
    return {
      icon: '🔬',
      title: isKo ? '냉철한 분석가' : 'Cool Analyst',
      content: isKo
        ? '논리적 판단력과 객관적 거리두기가 결합되어 편견 없는 분석을 제공합니다. 데이터 분석, 연구, 컨설팅에 탁월합니다.'
        : 'Logical judgment combined with objective distance provides unbiased analysis. Excellent in data analysis, research, and consulting.',
    };
  }

  if (isLogical && isWarm) {
    return {
      icon: '⚖️',
      title: isKo ? '균형잡힌 결정자' : 'Balanced Decider',
      content: isKo
        ? '논리적 분석력과 따뜻한 관계 형성을 동시에 추구합니다. 공정하면서도 사람을 배려하는 리더십을 발휘합니다.'
        : 'You pursue logical analysis alongside warm relationships. Fair leadership that also considers people.',
    };
  }

  if (isLogical && isMidAffiliation) {
    return {
      icon: '🧩',
      title: isKo ? '실용적 문제해결사' : 'Pragmatic Problem-Solver',
      content: isKo
        ? '논리적 접근과 적절한 관계 형성의 균형을 갖추고 있습니다. 효율성과 팀워크를 동시에 추구하는 실용주의자입니다.'
        : 'Balancing logical approach with appropriate relationships. A pragmatist pursuing both efficiency and teamwork.',
    };
  }

  // 중간 의사결정 조합 (3가지)
  if (isMidDecision && isWarm) {
    return {
      icon: '🤝',
      title: isKo ? '따뜻한 실용주의자' : 'Warm Pragmatist',
      content: isKo
        ? '논리와 감정을 상황에 맞게 조화시킵니다. 따뜻한 관계를 유지하면서도 현실적인 판단을 내립니다.'
        : 'Harmonizing logic and emotion based on situations. Making realistic judgments while maintaining warm relationships.',
    };
  }

  if (isMidDecision && isCold) {
    return {
      icon: '🎲',
      title: isKo ? '독립적 판단자' : 'Independent Judge',
      content: isKo
        ? '상황에 따라 논리와 직관을 오가며 독자적 판단을 내립니다. 외부 영향에 휘둘리지 않는 주관이 있습니다.'
        : 'Making independent judgments switching between logic and intuition. You have convictions not swayed by external influence.',
    };
  }

  // 기본값 (중간 의사결정 + 중간 친화성)
  return {
    icon: '🌊',
    title: isKo ? '유연한 의사결정자' : 'Flexible Decision-Maker',
    content: isKo
      ? '상황과 맥락에 따라 논리와 감정을 유연하게 활용합니다. 다양한 관점을 고려한 균형 잡힌 결정을 내립니다.'
      : 'Flexibly using logic and emotion based on context. Making balanced decisions considering various perspectives.',
  };
}

// 업무 스타일 분석 - 모든 조합 커버
export function getWorkStyleInsight(
  cognitionScore: number,
  rhythmScore: number,
  dominance: number,
  isKo: boolean
): Insight {
  const isVisionary = cognitionScore > 60; // V
  const isStructured = cognitionScore < 40; // S
  const isMidCognition = !isVisionary && !isStructured;
  const isFlow = rhythmScore > 60; // F
  const isAnchor = rhythmScore < 40; // A
  const isMidRhythm = !isFlow && !isAnchor;

  // 비전형 조합 (3가지)
  if (isVisionary && isFlow) {
    return {
      icon: '🚀',
      title: isKo ? '혁신적 개척자' : 'Innovative Pioneer',
      content: isKo
        ? '비전과 유연성이 결합된 조합입니다. 새로운 아이디어를 빠르게 실험하고 변화하는 환경에서 기회를 포착합니다.'
        : 'Combination of vision and flexibility. You quickly experiment with new ideas and seize opportunities in changing environments.',
    };
  }

  if (isVisionary && isAnchor) {
    return {
      icon: '🌳',
      title: isKo ? '비전을 현실로' : 'Vision to Reality',
      content: isKo
        ? '큰 그림을 보면서도 꾸준히 실행하는 능력이 있습니다. 장기적 목표를 설정하고 착실히 달성해 나갑니다.'
        : 'Ability to see the big picture while executing steadily. You set long-term goals and achieve them reliably.',
    };
  }

  if (isVisionary && isMidRhythm) {
    return {
      icon: '💡',
      title: isKo ? '전략적 혁신가' : 'Strategic Innovator',
      content: isKo
        ? '비전을 품으면서 상황에 따라 템포를 조절합니다. 혁신을 추구하되 현실적인 타이밍을 읽는 전략가입니다.'
        : 'Holding vision while adjusting tempo by situation. A strategist pursuing innovation while reading realistic timing.',
    };
  }

  // 체계형 조합 (3가지)
  if (isStructured && isAnchor) {
    return {
      icon: '🏗️',
      title: isKo ? '견고한 설계자' : 'Solid Architect',
      content: isKo
        ? '체계적 사고와 꾸준한 리듬으로 복잡한 시스템을 구축합니다. 장기 프로젝트, 인프라, 제도 설계에 강점이 있습니다.'
        : 'Systematic thinking with steady rhythm builds complex systems. Strong in long-term projects, infrastructure, and policy design.',
    };
  }

  if (isStructured && isFlow) {
    return {
      icon: '🎪',
      title: isKo ? '유연한 실무자' : 'Flexible Practitioner',
      content: isKo
        ? '현실적이면서도 상황에 맞게 적응합니다. 다양한 업무를 효율적으로 처리하는 만능 해결사입니다.'
        : 'Practical yet adaptable to situations. A versatile problem-solver handling diverse tasks efficiently.',
    };
  }

  if (isStructured && isMidRhythm) {
    return {
      icon: '📊',
      title: isKo ? '체계적 관리자' : 'Systematic Manager',
      content: isKo
        ? '체계와 규칙을 중시하면서 적절히 유연성을 발휘합니다. 프로세스 최적화와 팀 관리에 강점이 있습니다.'
        : 'Valuing systems and rules while appropriately showing flexibility. Strong in process optimization and team management.',
    };
  }

  // 중간 인지 조합 (3가지)
  if (isMidCognition && isFlow) {
    return {
      icon: '🌊',
      title: isKo ? '적응형 실행가' : 'Adaptive Executor',
      content: isKo
        ? '현실과 비전을 오가며 유연하게 대처합니다. 빠르게 변하는 환경에서 실용적인 해결책을 찾습니다.'
        : 'Flexibly navigating between reality and vision. Finding practical solutions in rapidly changing environments.',
    };
  }

  if (isMidCognition && isAnchor) {
    return {
      icon: '⚓',
      title: isKo ? '안정적 실행가' : 'Steady Executor',
      content: isKo
        ? '균형 잡힌 시각으로 꾸준히 성과를 만들어냅니다. 일관성과 신뢰성으로 팀의 기둥 역할을 합니다.'
        : 'Creating steady results with balanced perspective. Serving as team pillar with consistency and reliability.',
    };
  }

  // 기본값 (중간 인지 + 중간 리듬)
  return {
    icon: '🎨',
    title: isKo ? '다재다능한 실무형' : 'Versatile Professional',
    content: isKo
      ? '상황에 따라 비전과 현실, 속도와 안정을 조절합니다. 다양한 역할과 환경에 적응하는 만능 플레이어입니다.'
      : 'Adjusting vision/reality and speed/stability by situation. A versatile player adapting to various roles and environments.',
  };
}

// 성장 잠재력 분석
export function getGrowthInsight(
  octant: string,
  typeCode: string,
  isKo: boolean
): Insight {
  const profile = ICP_OCTANT_PROFILES[octant];
  if (!profile) {
    return {
      icon: '🌱',
      title: isKo ? '성장 포인트' : 'Growth Points',
      content: isKo
        ? '당신만의 독특한 조합을 탐구하며 새로운 가능성을 발견해보세요.'
        : 'Explore your unique combination and discover new possibilities.',
    };
  }

  // Find matching synergy
  for (const synergy of profile.synergies) {
    const hasMatch = synergy.persona.some(p => typeCode.includes(p));
    if (hasMatch) {
      return {
        icon: '💎',
        title: isKo ? '시너지 포인트' : 'Synergy Point',
        content: synergy.insight[isKo ? 'ko' : 'en'],
      };
    }
  }

  // Default growth insight based on octant shadow
  const shadowAdvice: Record<string, { ko: string; en: string }> = {
    PA: { ko: '때로는 다른 사람의 의견을 경청하는 연습이 성장을 이끕니다.', en: 'Practicing listening to others\' opinions leads to growth.' },
    BC: { ko: '협력의 기쁨을 발견하면 더 큰 성취를 이룰 수 있습니다.', en: 'Discovering the joy of collaboration brings greater achievements.' },
    DE: { ko: '감정적 연결을 허용하면 더 풍요로운 관계를 경험합니다.', en: 'Allowing emotional connections brings richer relationships.' },
    FG: { ko: '자신의 가치를 인정하면 더 당당해질 수 있습니다.', en: 'Recognizing your own value allows you to be more confident.' },
    HI: { ko: '자신의 필요를 표현하는 용기가 균형을 가져옵니다.', en: 'Courage to express your needs brings balance.' },
    JK: { ko: '건강한 경계 설정이 더 나은 관계를 만듭니다.', en: 'Setting healthy boundaries creates better relationships.' },
    LM: { ko: '자기 돌봄의 시간을 갖는 것도 중요합니다.', en: 'Taking time for self-care is also important.' },
    NO: { ko: '때로는 한 발 물러서서 다른 사람의 성장을 지켜보세요.', en: 'Sometimes step back and watch others grow.' },
  };

  return {
    icon: '🌱',
    title: isKo ? '성장 포인트' : 'Growth Point',
    content: shadowAdvice[octant]?.[isKo ? 'ko' : 'en'] ||
      (isKo ? '자신만의 속도로 성장해 나가세요.' : 'Grow at your own pace.'),
  };
}

// Combined insight generation
export function generateCombinedInsights(
  icpResult: ICPAnalysis | null,
  personaResult: PersonaAnalysis | null,
  isKo: boolean
): Insight[] {
  const insights: Insight[] = [];

  if (!icpResult || !personaResult) {return insights;}

  const dominance = icpResult.dominanceNormalized;
  const affiliation = icpResult.affiliationNormalized;
  const octant = icpResult.primaryStyle;
  const typeCode = personaResult.typeCode || '';

  const energyScore = personaResult.axes?.energy?.score ?? 50;
  const cognitionScore = personaResult.axes?.cognition?.score ?? 50;
  const decisionScore = personaResult.axes?.decision?.score ?? 50;
  const rhythmScore = personaResult.axes?.rhythm?.score ?? 50;

  // 1. 에너지 레벨 인사이트 (항상 추가)
  const energyInsight = getEnergyInsight(dominance, affiliation, energyScore, isKo);
  if (energyInsight) {
    insights.push(energyInsight);
  }

  // 2. 의사결정 스타일 인사이트 (항상 추가)
  const decisionInsight = getDecisionInsight(affiliation, decisionScore, octant, isKo);
  if (decisionInsight) {
    insights.push(decisionInsight);
  }

  // 3. 업무 스타일 인사이트 (항상 추가)
  const workInsight = getWorkStyleInsight(cognitionScore, rhythmScore, dominance, isKo);
  if (workInsight) {
    insights.push(workInsight);
  }

  // 4. ICP 옥탄트 기반 시너지/성장 인사이트
  const growthInsight = getGrowthInsight(octant, typeCode, isKo);
  insights.push(growthInsight);

  // 5. 관계 스타일 종합
  const isDominant = dominance > 0.1;
  const isWarm = affiliation > 0.1;
  const isRadiant = typeCode.startsWith('R');

  let relationshipStyle: Insight;

  if (isDominant && isWarm) {
    relationshipStyle = {
      icon: '🌟',
      title: isKo ? '영향력 있는 연결자' : 'Influential Connector',
      content: isKo
        ? '따뜻함과 리더십을 동시에 발휘하여 사람들에게 영감을 주고 이끕니다. 팀과 커뮤니티의 중심 인물이 됩니다.'
        : 'Combining warmth with leadership to inspire and guide. You become a central figure in teams and communities.',
    };
  } else if (isDominant && !isWarm) {
    relationshipStyle = {
      icon: '🦅',
      title: isKo ? '독립적 선구자' : 'Independent Trailblazer',
      content: isKo
        ? '자신만의 길을 개척하며 목표를 향해 나아갑니다. 혁신과 변화를 두려워하지 않는 개척자입니다.'
        : 'Carving your own path toward goals. A pioneer unafraid of innovation and change.',
    };
  } else if (!isDominant && isWarm) {
    relationshipStyle = {
      icon: '🕊️',
      title: isKo ? '조화로운 지지자' : 'Harmonious Supporter',
      content: isKo
        ? '따뜻함으로 팀을 하나로 만들고 갈등을 해소합니다. 모두가 편안하게 느끼는 분위기를 만듭니다.'
        : 'Uniting teams with warmth and resolving conflicts. Creating an atmosphere where everyone feels comfortable.',
    };
  } else {
    relationshipStyle = {
      icon: '🔮',
      title: isKo ? '깊이 있는 관찰자' : 'Deep Observer',
      content: isKo
        ? '한 발 물러서서 상황을 파악하고 깊이 있는 통찰을 제공합니다. 복잡한 문제의 본질을 꿰뚫어 봅니다.'
        : 'Stepping back to assess situations and provide deep insights. Seeing through the essence of complex problems.',
    };
  }
  insights.push(relationshipStyle);

  // 6. 종합 프로필 (항상 마지막에)
  const octantName = isKo ? icpResult.primaryOctant.korean : icpResult.primaryOctant.name;
  const personaName = personaResult.personaName || typeCode;

  insights.push({
    icon: '✨',
    title: isKo ? '종합 프로필' : 'Combined Profile',
    content: isKo
      ? `${octantName}의 대인관계 스타일과 ${personaName} 성격이 만나 독특한 조합을 이룹니다. 이 조합은 ${isDominant ? '주도적' : '협력적'}이면서 ${isWarm ? '따뜻한' : '독립적인'} 접근을 선호하고, ${isRadiant ? '외부 세계와 적극적으로 소통' : '내면의 깊이를 탐구'}합니다.`
      : `${octantName} interpersonal style meets ${personaName} personality for a unique combination. This blend prefers a ${isDominant ? 'leading' : 'collaborative'} and ${isWarm ? 'warm' : 'independent'} approach, ${isRadiant ? 'actively engaging with the external world' : 'exploring inner depths'}.`,
  });

  return insights;
}

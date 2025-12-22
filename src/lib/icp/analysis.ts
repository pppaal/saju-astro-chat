// src/lib/icp/analysis.ts
/**
 * ICP 설문 분석 로직
 */

import type { ICPQuizAnswers, ICPAnalysis, ICPOctant, ICPOctantCode } from './types';
import { icpQuestions } from './questions';

// 8 Octant definitions
export const ICP_OCTANTS: Record<ICPOctantCode, ICPOctant> = {
  PA: {
    code: 'PA',
    name: 'Dominant-Assured',
    korean: '지배적-확신형',
    traits: ['Leadership', 'Confidence', 'Decisive', 'Assertive'],
    traitsKo: ['리더십', '자신감', '결단력', '주장적'],
    shadow: 'Can be controlling, domineering',
    shadowKo: '통제적이고 독선적일 수 있음',
    dominance: 1.0,
    affiliation: 0.5,
    description: 'You are a natural leader who takes charge with confidence. You inspire others through your decisiveness and ability to guide groups toward goals.',
    descriptionKo: '당신은 자신감 있게 주도하는 타고난 리더입니다. 결단력과 그룹을 목표로 이끄는 능력으로 다른 사람들에게 영감을 줍니다.',
    therapeuticQuestions: [
      'When was the last time you let someone else lead?',
      'How do you feel when you are not in control?',
      'What would happen if you delegated more?',
    ],
    therapeuticQuestionsKo: [
      '마지막으로 다른 사람이 이끌게 한 것이 언제인가요?',
      '통제권이 없을 때 어떤 기분이 드나요?',
      '더 많이 위임한다면 어떤 일이 일어날까요?',
    ],
    growthRecommendations: ['Practice active listening', 'Ask for input before deciding', 'Celebrate others\' leadership moments'],
    growthRecommendationsKo: ['적극적 경청 연습하기', '결정 전 다른 의견 구하기', '다른 사람의 리더십 순간 축하하기'],
  },
  BC: {
    code: 'BC',
    name: 'Competitive-Arrogant',
    korean: '경쟁적-거만형',
    traits: ['Ambitious', 'Competitive', 'Achievement-oriented', 'Independent'],
    traitsKo: ['야심찬', '경쟁적', '성취지향적', '독립적'],
    shadow: 'Can be dismissive, cynical',
    shadowKo: '무시하고 냉소적일 수 있음',
    dominance: 0.7,
    affiliation: -0.7,
    description: 'You are driven by achievement and excellence. Your competitive nature pushes you to constantly improve, though you may come across as aloof.',
    descriptionKo: '당신은 성취와 탁월함에 의해 움직입니다. 경쟁적인 성격이 끊임없이 발전하게 하지만, 냉담해 보일 수 있습니다.',
    therapeuticQuestions: [
      'What would success look like if it wasn\'t about winning?',
      'When did you last celebrate someone else\'s achievement genuinely?',
      'What are you afraid of losing if you don\'t compete?',
    ],
    therapeuticQuestionsKo: [
      '이기는 것이 아니라면 성공은 어떤 모습일까요?',
      '마지막으로 진심으로 다른 사람의 성취를 축하한 적이 언제인가요?',
      '경쟁하지 않으면 무엇을 잃을까 두려우신가요?',
    ],
    growthRecommendations: ['Celebrate collaborative wins', 'Practice vulnerability', 'Ask for help occasionally'],
    growthRecommendationsKo: ['협력적 성공 축하하기', '취약함 연습하기', '가끔 도움 요청하기'],
  },
  DE: {
    code: 'DE',
    name: 'Cold-Distant',
    korean: '냉담-거리형',
    traits: ['Analytical', 'Objective', 'Independent', 'Reserved'],
    traitsKo: ['분석적', '객관적', '독립적', '내성적'],
    shadow: 'Can be isolated, disconnected',
    shadowKo: '고립되고 단절될 수 있음',
    dominance: 0.0,
    affiliation: -1.0,
    description: 'You value logic and independence highly. You prefer to observe and analyze before engaging, which gives you unique insights but may create distance.',
    descriptionKo: '당신은 논리와 독립성을 매우 중요시합니다. 참여하기 전에 관찰하고 분석하는 것을 선호하여 독특한 통찰력을 얻지만 거리감을 만들 수 있습니다.',
    therapeuticQuestions: [
      'What would it feel like to let someone in emotionally?',
      'When do you feel most connected to others?',
      'What are you protecting by keeping distance?',
    ],
    therapeuticQuestionsKo: [
      '누군가를 감정적으로 받아들이면 어떤 느낌일까요?',
      '언제 다른 사람들과 가장 연결된 느낌이 드나요?',
      '거리를 유지함으로써 무엇을 보호하고 있나요?',
    ],
    growthRecommendations: ['Schedule regular social activities', 'Share one personal thing weekly', 'Practice small talk'],
    growthRecommendationsKo: ['정기적인 사회 활동 계획하기', '매주 개인적인 것 하나 공유하기', '가벼운 대화 연습하기'],
  },
  FG: {
    code: 'FG',
    name: 'Submissive-Introverted',
    korean: '복종적-내향형',
    traits: ['Humble', 'Cautious', 'Observant', 'Quiet'],
    traitsKo: ['겸손한', '신중한', '관찰력 있는', '조용한'],
    shadow: 'Can be self-deprecating, withdrawn',
    shadowKo: '자기비하적이고 위축될 수 있음',
    dominance: -0.7,
    affiliation: -0.7,
    description: 'You are thoughtful and observant, preferring to understand before acting. Your humility is genuine, though you may underestimate your own worth.',
    descriptionKo: '당신은 행동하기 전에 이해하는 것을 선호하는 사려 깊고 관찰력 있는 사람입니다. 겸손함이 진실되지만 자신의 가치를 과소평가할 수 있습니다.',
    therapeuticQuestions: [
      'What would you do if you knew you couldn\'t fail?',
      'Whose voice do you hear when you doubt yourself?',
      'What accomplishment are you most proud of?',
    ],
    therapeuticQuestionsKo: [
      '실패할 수 없다면 무엇을 하시겠습니까?',
      '자신을 의심할 때 누구의 목소리가 들리나요?',
      '가장 자랑스러운 성취는 무엇인가요?',
    ],
    growthRecommendations: ['Write down daily achievements', 'Accept compliments without deflecting', 'Voice one opinion daily'],
    growthRecommendationsKo: ['매일 성취 기록하기', '칭찬을 거부하지 않고 받아들이기', '매일 하나의 의견 말하기'],
  },
  HI: {
    code: 'HI',
    name: 'Submissive-Unassured',
    korean: '복종적-불확신형',
    traits: ['Accommodating', 'Dependent', 'Receptive', 'Gentle'],
    traitsKo: ['수용적', '의존적', '받아들이는', '온화한'],
    shadow: 'Can be passive, indecisive',
    shadowKo: '수동적이고 우유부단할 수 있음',
    dominance: -1.0,
    affiliation: 0.0,
    description: 'You are accommodating and prefer harmony over conflict. Your gentle nature makes others feel safe, though you may struggle with asserting your needs.',
    descriptionKo: '당신은 수용적이고 갈등보다 조화를 선호합니다. 온화한 성격이 다른 사람들을 안전하게 느끼게 하지만 자신의 필요를 주장하는 데 어려움을 겪을 수 있습니다.',
    therapeuticQuestions: [
      'What do YOU want, not what others want for you?',
      'When did you last say no without guilt?',
      'What would happen if you put yourself first?',
    ],
    therapeuticQuestionsKo: [
      '다른 사람이 원하는 것이 아니라 당신이 원하는 것은 무엇인가요?',
      '마지막으로 죄책감 없이 거절한 적이 언제인가요?',
      '자신을 먼저 생각하면 어떤 일이 일어날까요?',
    ],
    growthRecommendations: ['Practice saying "no" kindly', 'Make small decisions independently', 'Journal about your preferences'],
    growthRecommendationsKo: ['친절하게 "아니오" 말하기 연습', '작은 결정을 독립적으로 하기', '선호에 대해 일기 쓰기'],
  },
  JK: {
    code: 'JK',
    name: 'Cooperative-Agreeable',
    korean: '협력적-동조형',
    traits: ['Cooperative', 'Kind', 'Harmony-seeking', 'Considerate'],
    traitsKo: ['협조적', '친절한', '조화추구', '배려하는'],
    shadow: 'Can be self-sacrificing, boundary-less',
    shadowKo: '자기희생적이고 경계가 없을 수 있음',
    dominance: -0.7,
    affiliation: 0.7,
    description: 'You value harmony and cooperation above all. Your kindness creates warm environments, though you may neglect your own needs for others.',
    descriptionKo: '당신은 무엇보다 조화와 협력을 중요시합니다. 친절함이 따뜻한 환경을 만들지만 다른 사람을 위해 자신의 필요를 소홀히 할 수 있습니다.',
    therapeuticQuestions: [
      'What would happen if you disagreed openly?',
      'How do you feel when you can\'t please everyone?',
      'What needs of yours have you been ignoring?',
    ],
    therapeuticQuestionsKo: [
      '공개적으로 반대하면 어떤 일이 일어날까요?',
      '모든 사람을 만족시킬 수 없을 때 어떤 기분이 드나요?',
      '어떤 필요를 무시해 왔나요?',
    ],
    growthRecommendations: ['Set one boundary this week', 'Express a differing opinion', 'Schedule self-care time'],
    growthRecommendationsKo: ['이번 주 하나의 경계 설정하기', '다른 의견 표현하기', '자기 돌봄 시간 계획하기'],
  },
  LM: {
    code: 'LM',
    name: 'Warm-Friendly',
    korean: '따뜻-친화형',
    traits: ['Empathetic', 'Sociable', 'Nurturing', 'Approachable'],
    traitsKo: ['공감적', '사교적', '돌보는', '친근한'],
    shadow: 'Can be over-involved, enabling',
    shadowKo: '과잉관여하고 의존을 유발할 수 있음',
    dominance: 0.0,
    affiliation: 1.0,
    description: 'You naturally connect with others through warmth and empathy. People feel comfortable around you, though you may take on too much of others\' emotions.',
    descriptionKo: '당신은 따뜻함과 공감으로 다른 사람들과 자연스럽게 연결됩니다. 사람들이 당신 주변에서 편안함을 느끼지만 다른 사람의 감정을 너무 많이 떠안을 수 있습니다.',
    therapeuticQuestions: [
      'Where does caring for others end and losing yourself begin?',
      'What do you need that you keep giving to others?',
      'How do you recharge when depleted?',
    ],
    therapeuticQuestionsKo: [
      '다른 사람을 돌보는 것이 끝나고 자신을 잃기 시작하는 지점은 어디인가요?',
      '다른 사람에게 계속 주면서 자신에게 필요한 것은 무엇인가요?',
      '지쳤을 때 어떻게 충전하나요?',
    ],
    growthRecommendations: ['Practice emotional detachment', 'Let others solve their problems', 'Take alone time regularly'],
    growthRecommendationsKo: ['감정적 거리두기 연습', '다른 사람이 문제 해결하게 두기', '정기적으로 혼자만의 시간 갖기'],
  },
  NO: {
    code: 'NO',
    name: 'Nurturant-Extroverted',
    korean: '양육적-외향형',
    traits: ['Guiding', 'Protective', 'Encouraging', 'Generous'],
    traitsKo: ['지도하는', '보호적', '격려하는', '관대한'],
    shadow: 'Can be interfering, overprotective',
    shadowKo: '간섭하고 과보호할 수 있음',
    dominance: 0.7,
    affiliation: 0.7,
    description: 'You combine warmth with guidance, naturally taking on mentor roles. Your encouragement helps others grow, though you may need to step back sometimes.',
    descriptionKo: '당신은 따뜻함과 지도력을 결합하여 자연스럽게 멘토 역할을 합니다. 격려가 다른 사람의 성장을 돕지만 때로는 한 발 물러설 필요가 있습니다.',
    therapeuticQuestions: [
      'Can you let someone fail for their growth?',
      'What happens when your advice isn\'t taken?',
      'Who nurtures you?',
    ],
    therapeuticQuestionsKo: [
      '누군가의 성장을 위해 실패하게 둘 수 있나요?',
      '조언이 받아들여지지 않으면 어떤 일이 일어나나요?',
      '누가 당신을 돌봐주나요?',
    ],
    growthRecommendations: ['Ask before giving advice', 'Let others find their path', 'Accept nurturing from others'],
    growthRecommendationsKo: ['조언하기 전에 물어보기', '다른 사람이 자신의 길을 찾게 두기', '다른 사람의 돌봄 받아들이기'],
  },
};

// Scoring weights: A = high, B = mid, C = low
const SCORE_MAP: Record<string, number> = {
  A: 1.0,
  B: 0.5,
  C: 0.0,
};

/**
 * Analyze ICP quiz answers
 */
export function analyzeICP(answers: ICPQuizAnswers, locale: string = 'en'): ICPAnalysis {
  const isKo = locale === 'ko';

  // Calculate axis scores
  let dominanceSum = 0;
  let dominanceCount = 0;
  let affiliationSum = 0;
  let affiliationCount = 0;

  for (const question of icpQuestions) {
    const answer = answers[question.id];
    if (!answer) continue;

    const score = SCORE_MAP[answer] ?? 0.5;

    if (question.axis === 'dominance') {
      dominanceSum += score;
      dominanceCount++;
    } else {
      affiliationSum += score;
      affiliationCount++;
    }
  }

  // Convert to 0-100 scale
  const dominanceScore = dominanceCount > 0 ? (dominanceSum / dominanceCount) * 100 : 50;
  const affiliationScore = affiliationCount > 0 ? (affiliationSum / affiliationCount) * 100 : 50;

  // Normalize to -1 to 1
  const dominanceNormalized = (dominanceScore - 50) / 50;
  const affiliationNormalized = (affiliationScore - 50) / 50;

  // Calculate octant scores based on distance
  const octantScores: Record<ICPOctantCode, number> = {} as Record<ICPOctantCode, number>;

  for (const [code, octant] of Object.entries(ICP_OCTANTS) as [ICPOctantCode, ICPOctant][]) {
    // Calculate similarity based on axis alignment
    const domDiff = Math.abs(dominanceNormalized - octant.dominance);
    const affDiff = Math.abs(affiliationNormalized - octant.affiliation);
    const distance = Math.sqrt(domDiff * domDiff + affDiff * affDiff);
    // Convert distance to score (max distance is sqrt(8) ≈ 2.83)
    octantScores[code] = Math.max(0, 1 - distance / 2);
  }

  // Find primary and secondary styles
  const sortedOctants = (Object.entries(octantScores) as [ICPOctantCode, number][])
    .sort((a, b) => b[1] - a[1]);

  const primaryStyle = sortedOctants[0][0];
  const secondaryStyle = sortedOctants[1][1] > 0.3 ? sortedOctants[1][0] : null;

  const primaryOctant = ICP_OCTANTS[primaryStyle];
  const secondaryOctant = secondaryStyle ? ICP_OCTANTS[secondaryStyle] : null;

  // Calculate consistency (how clear the answers are)
  const answerValues = Object.values(answers);
  const aCount = answerValues.filter(a => a === 'A').length;
  const cCount = answerValues.filter(a => a === 'C').length;
  const bCount = answerValues.filter(a => a === 'B').length;
  const total = answerValues.length || 1;

  // More A/C answers = more consistent, more B = less consistent
  const consistencyScore = Math.round(((aCount + cCount) / total) * 100);

  // Generate summary
  const summary = isKo
    ? `당신의 대인관계 스타일은 ${primaryOctant.korean}입니다. ${primaryOctant.descriptionKo}`
    : `Your interpersonal style is ${primaryOctant.name}. ${primaryOctant.description}`;

  const summaryKo = `당신의 대인관계 스타일은 ${primaryOctant.korean}입니다. ${primaryOctant.descriptionKo}`;

  return {
    dominanceScore,
    affiliationScore,
    dominanceNormalized,
    affiliationNormalized,
    octantScores,
    primaryStyle,
    secondaryStyle,
    primaryOctant,
    secondaryOctant,
    summary,
    summaryKo,
    consistencyScore,
  };
}

/**
 * Get compatibility between two ICP styles
 */
export function getICPCompatibility(style1: ICPOctantCode, style2: ICPOctantCode, locale: string = 'en'): {
  score: number;
  level: string;
  levelKo: string;
  description: string;
  descriptionKo: string;
} {
  const octant1 = ICP_OCTANTS[style1];
  const octant2 = ICP_OCTANTS[style2];

  // Calculate complementarity
  const domDiff = Math.abs(octant1.dominance - octant2.dominance);
  const affSum = octant1.affiliation + octant2.affiliation;

  // Best compatibility: complementary dominance, both warm
  let score = 50;

  // Complementary dominance (one leads, one follows) is good
  if (domDiff > 1.0) score += 20;
  else if (domDiff > 0.5) score += 10;

  // Both being warm/friendly is good
  if (affSum > 1.0) score += 20;
  else if (affSum > 0) score += 10;
  else if (affSum < -1.0) score -= 10; // Both cold is harder

  // Same style: moderate (understand each other but may clash)
  if (style1 === style2) score = 65;

  score = Math.max(30, Math.min(95, score));

  let level: string;
  let levelKo: string;
  let description: string;
  let descriptionKo: string;

  if (score >= 80) {
    level = 'Excellent Match';
    levelKo = '탁월한 궁합';
    description = 'Your styles complement each other beautifully. Communication flows naturally.';
    descriptionKo = '두 스타일이 아름답게 보완됩니다. 소통이 자연스럽게 흐릅니다.';
  } else if (score >= 65) {
    level = 'Good Match';
    levelKo = '좋은 궁합';
    description = 'You understand each other well with some areas for growth.';
    descriptionKo = '서로를 잘 이해하며 성장할 영역이 있습니다.';
  } else if (score >= 50) {
    level = 'Moderate Match';
    levelKo = '보통 궁합';
    description = 'Different styles that can work with understanding and effort.';
    descriptionKo = '이해와 노력으로 작동할 수 있는 다른 스타일입니다.';
  } else {
    level = 'Challenging Match';
    levelKo = '도전적 궁합';
    description = 'Requires significant effort to bridge different approaches.';
    descriptionKo = '다른 접근 방식을 연결하기 위해 상당한 노력이 필요합니다.';
  }

  return { score, level, levelKo, description, descriptionKo };
}

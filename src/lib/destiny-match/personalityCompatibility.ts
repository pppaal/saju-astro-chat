/**
 * 성격 테스트 기반 궁합 계산
 * PersonalityResult 점수를 기반으로 두 사람의 성격 궁합을 계산
 */

type PersonalityScores = {
  energy: number;      // Radiant(100) <-> Grounded(0)
  cognition: number;   // Visionary(100) <-> Structured(0)
  decision: number;    // Logic(100) <-> Empathic(0)
  rhythm: number;      // Flow(100) <-> Anchor(0)
};

type CompatibilityResult = {
  score: number;           // 0-100
  grade: string;           // S, A, B, C, D
  chemistry: string;       // 케미스트리 설명
  strengths: string[];     // 강점
  challenges: string[];    // 도전 요소
  tips: string[];          // 조언
};

/**
 * 두 사람의 성격 궁합 점수 계산
 *
 * 궁합 로직:
 * 1. 에너지 축: 비슷할수록 좋음 (같은 리듬)
 * 2. 인지 축: 약간 다르면 좋음 (상호 보완)
 * 3. 결정 축: 비슷할수록 좋음 (가치관 일치)
 * 4. 리듬 축: 비슷할수록 좋음 (생활 방식)
 */
export function calculatePersonalityCompatibility(
  person1: PersonalityScores,
  person2: PersonalityScores
): CompatibilityResult {
  // 각 축별 차이 (0-100)
  const energyDiff = Math.abs(person1.energy - person2.energy);
  const cognitionDiff = Math.abs(person1.cognition - person2.cognition);
  const decisionDiff = Math.abs(person1.decision - person2.decision);
  const rhythmDiff = Math.abs(person1.rhythm - person2.rhythm);

  // 각 축별 점수 계산 (서로 다른 가중치 적용)

  // 에너지: 비슷할수록 좋음 (40% 이내 차이가 이상적)
  const energyScore = Math.max(0, 100 - energyDiff * 1.5);

  // 인지: 약간 다르면 좋음 (20-50% 차이가 이상적)
  const cognitionOptimal = 35;
  const cognitionScore = Math.max(0, 100 - Math.abs(cognitionDiff - cognitionOptimal) * 2);

  // 결정: 비슷할수록 좋음 (30% 이내 차이가 이상적)
  const decisionScore = Math.max(0, 100 - decisionDiff * 1.8);

  // 리듬: 비슷할수록 좋음 (35% 이내 차이가 이상적)
  const rhythmScore = Math.max(0, 100 - rhythmDiff * 1.6);

  // 가중 평균 (결정과 리듬이 더 중요)
  const weights = { energy: 0.2, cognition: 0.2, decision: 0.3, rhythm: 0.3 };
  const totalScore = Math.round(
    energyScore * weights.energy +
    cognitionScore * weights.cognition +
    decisionScore * weights.decision +
    rhythmScore * weights.rhythm
  );

  // 등급 계산
  const grade = getGrade(totalScore);

  // 케미스트리 분석
  const chemistry = getChemistry(person1, person2, totalScore);

  // 강점과 도전 요소
  const { strengths, challenges } = analyzeRelationship(person1, person2);

  // 조언
  const tips = generateTips(person1, person2, challenges);

  return {
    score: totalScore,
    grade,
    chemistry,
    strengths,
    challenges,
    tips,
  };
}

function getGrade(score: number): string {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

function getChemistry(
  p1: PersonalityScores,
  p2: PersonalityScores,
  score: number
): string {
  if (score >= 85) {
    return '환상의 케미! 서로를 깊이 이해하고 자연스럽게 조화를 이룰 수 있는 관계입니다.';
  }
  if (score >= 70) {
    return '좋은 케미! 서로의 장점을 살리며 함께 성장할 수 있는 관계입니다.';
  }
  if (score >= 55) {
    return '균형 잡힌 관계! 서로 다른 점이 있지만 노력하면 좋은 파트너가 될 수 있습니다.';
  }
  return '성장의 관계! 서로의 차이를 이해하고 받아들이는 과정에서 많은 것을 배울 수 있습니다.';
}

function analyzeRelationship(
  p1: PersonalityScores,
  p2: PersonalityScores
): { strengths: string[]; challenges: string[] } {
  const strengths: string[] = [];
  const challenges: string[] = [];

  const energyDiff = Math.abs(p1.energy - p2.energy);
  const cognitionDiff = Math.abs(p1.cognition - p2.cognition);
  const decisionDiff = Math.abs(p1.decision - p2.decision);
  const rhythmDiff = Math.abs(p1.rhythm - p2.rhythm);

  // 에너지 분석
  if (energyDiff <= 30) {
    strengths.push('비슷한 에너지 레벨로 함께하는 시간이 편안해요');
  } else if (energyDiff >= 60) {
    challenges.push('에너지 레벨 차이가 있어서 활동 선호도가 다를 수 있어요');
  }

  // 인지 분석
  if (cognitionDiff >= 20 && cognitionDiff <= 50) {
    strengths.push('서로 다른 관점으로 새로운 아이디어를 나눌 수 있어요');
  } else if (cognitionDiff < 15) {
    strengths.push('같은 방식으로 생각해서 의사소통이 쉬워요');
  } else if (cognitionDiff > 60) {
    challenges.push('생각하는 방식이 달라서 오해가 생길 수 있어요');
  }

  // 결정 분석
  if (decisionDiff <= 25) {
    strengths.push('가치관이 비슷해서 중요한 결정을 함께 내리기 좋아요');
  } else if (decisionDiff >= 50) {
    challenges.push('결정 방식이 달라서 갈등이 생길 수 있어요');
  }

  // 리듬 분석
  if (rhythmDiff <= 30) {
    strengths.push('생활 리듬이 맞아서 일상을 함께하기 편해요');
  } else if (rhythmDiff >= 55) {
    challenges.push('생활 패턴이 달라서 조율이 필요해요');
  }

  // 최소 1개씩은 보장
  if (strengths.length === 0) {
    strengths.push('서로의 차이를 통해 새로운 것을 배울 수 있어요');
  }
  if (challenges.length === 0) {
    challenges.push('너무 비슷해서 새로운 자극이 부족할 수 있어요');
  }

  return { strengths, challenges };
}

function generateTips(
  p1: PersonalityScores,
  p2: PersonalityScores,
  challenges: string[]
): string[] {
  const tips: string[] = [];

  const energyDiff = Math.abs(p1.energy - p2.energy);
  const cognitionDiff = Math.abs(p1.cognition - p2.cognition);
  const decisionDiff = Math.abs(p1.decision - p2.decision);
  const rhythmDiff = Math.abs(p1.rhythm - p2.rhythm);

  if (energyDiff > 40) {
    tips.push('서로의 에너지 충전 방식을 존중해주세요');
  }
  if (cognitionDiff > 50) {
    tips.push('생각이 다를 때 "틀린 게 아니라 다른 것"임을 기억하세요');
  }
  if (decisionDiff > 40) {
    tips.push('중요한 결정 전에 서로의 관점을 충분히 나눠보세요');
  }
  if (rhythmDiff > 45) {
    tips.push('각자의 루틴을 존중하면서 함께하는 시간을 만들어보세요');
  }

  if (tips.length === 0) {
    tips.push('서로의 장점을 인정하고 칭찬해주세요');
    tips.push('작은 것에도 감사함을 표현해보세요');
  }

  return tips;
}

/**
 * 빠른 궁합 점수만 계산 (목록 표시용)
 */
export function quickPersonalityScore(
  p1: PersonalityScores | null,
  p2: PersonalityScores | null
): number | null {
  if (!p1 || !p2) return null;

  const energyDiff = Math.abs(p1.energy - p2.energy);
  const cognitionDiff = Math.abs(p1.cognition - p2.cognition);
  const decisionDiff = Math.abs(p1.decision - p2.decision);
  const rhythmDiff = Math.abs(p1.rhythm - p2.rhythm);

  const energyScore = Math.max(0, 100 - energyDiff * 1.5);
  const cognitionOptimal = 35;
  const cognitionScore = Math.max(0, 100 - Math.abs(cognitionDiff - cognitionOptimal) * 2);
  const decisionScore = Math.max(0, 100 - decisionDiff * 1.8);
  const rhythmScore = Math.max(0, 100 - rhythmDiff * 1.6);

  return Math.round(
    energyScore * 0.2 +
    cognitionScore * 0.2 +
    decisionScore * 0.3 +
    rhythmScore * 0.3
  );
}

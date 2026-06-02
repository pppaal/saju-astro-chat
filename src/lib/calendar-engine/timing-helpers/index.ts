// src/lib/prediction/index.ts
// 예측 시스템 통합 모듈

// ========================================
// 통일된 점수-등급 변환 시스템
// ========================================

export type PredictionGrade = 'S' | 'A+' | 'A' | 'B' | 'C' | 'D';

export interface StandardizedScore {
  score: number;
  grade: PredictionGrade;
  label: string;
  labelEn: string;
}

/**
 * 점수를 0-100 범위로 정규화하고 등급을 반환
 * 모든 예측 엔진에서 이 함수를 사용해야 함
 *
 * 등급 기준:
 * S: 90점 이상 - 최적기
 * A+: 80-89점 - 매우 좋은 시기
 * A: 70-79점 - 좋은 시기
 * B: 60-69점 - 괜찮은 시기
 * C: 50-59점 - 보통
 * D: 50점 미만 - 주의 필요
 */
export function standardizeScore(rawScore: number): StandardizedScore {
  // 0-100 범위로 정규화
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  let grade: PredictionGrade;
  let label: string;
  let labelEn: string;

  if (score >= 90) {
    grade = 'S';
    label = '최적기';
    labelEn = 'Optimal';
  } else if (score >= 80) {
    grade = 'A+';
    label = '매우 좋은 시기';
    labelEn = 'Excellent';
  } else if (score >= 70) {
    grade = 'A';
    label = '좋은 시기';
    labelEn = 'Good';
  } else if (score >= 60) {
    grade = 'B';
    label = '괜찮은 시기';
    labelEn = 'Fair';
  } else if (score >= 50) {
    grade = 'C';
    label = '보통';
    labelEn = 'Average';
  } else {
    grade = 'D';
    label = '주의 필요';
    labelEn = 'Caution';
  }

  return { score, grade, label, labelEn };
}

/**
 * 등급만 빠르게 계산
 */
export function scoreToGrade(score: number): PredictionGrade {
  if (score >= 90) {return 'S';}
  if (score >= 80) {return 'A+';}
  if (score >= 70) {return 'A';}
  if (score >= 60) {return 'B';}
  if (score >= 50) {return 'C';}
  return 'D';
}

/**
 * 등급에 해당하는 최소 점수
 */
export function gradeToMinScore(grade: PredictionGrade): number {
  switch (grade) {
    case 'S': return 90;
    case 'A+': return 80;
    case 'A': return 70;
    case 'B': return 60;
    case 'C': return 50;
    case 'D': return 0;
  }
}

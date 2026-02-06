/**
 * Destiny Match Compatibility Calculator
 * 기존 궁합 엔진을 활용한 매칭 궁합 계산
 */

import { calculateSajuData } from '@/lib/Saju/saju';
import { logger } from '@/lib/logger';
import {
  analyzeComprehensiveCompatibility,
  CompatibilitySubject,
} from '@/lib/Saju/compatibility';
import { COMPATIBILITY_CACHE, CACHE_KEY } from '@/lib/constants/cache';

interface BirthInfo {
  birthDate: string;
  birthTime?: string;
  gender?: string;
  timezone?: string;
}

// 간단한 메모리 캐시
const compatibilityCache = new Map<string, { score: number; timestamp: number }>();

/**
 * 안전한 캐시 키 생성
 * - 파이프 구분자 대신 null byte 구분자 + JSON 직렬화로 키 충돌 방지
 */
function getCacheKey(person1: BirthInfo, person2: BirthInfo): string {
  const sep = CACHE_KEY.SEPARATOR;
  // 각 사람의 정보를 JSON으로 직렬화
  const key1 = JSON.stringify([person1.birthDate, person1.birthTime || '', person1.gender || '']);
  const key2 = JSON.stringify([person2.birthDate, person2.birthTime || '', person2.gender || '']);
  // 정렬하여 순서 무관하게 동일한 키 생성
  const sorted = [key1, key2].sort();
  return `${CACHE_KEY.PREFIX.COMPATIBILITY}${sep}${sorted.join(sep)}`;
}

function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, value] of compatibilityCache.entries()) {
    if (now - value.timestamp > COMPATIBILITY_CACHE.QUICK_TTL_MS) {
      compatibilityCache.delete(key);
    }
  }
}

/**
 * 빠른 궁합 점수 계산
 * 기존 사주 궁합 엔진을 활용 (캐싱 적용)
 */
export async function calculateQuickCompatibility(
  person1: BirthInfo,
  person2: BirthInfo
): Promise<number> {
  try {
    // 캐시 정리 (10% 확률로)
    if (Math.random() < 0.1) {
      cleanExpiredCache();
    }

    // 캐시 확인
    const cacheKey = getCacheKey(person1, person2);
    const cached = compatibilityCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < COMPATIBILITY_CACHE.QUICK_TTL_MS) {
      return cached.score;
    }

    // 생년월일 파싱
    const date1 = new Date(person1.birthDate);
    const date2 = new Date(person2.birthDate);

    // 시간 형식 변환
    const time1 = person1.birthTime || '12:00';
    const time2 = person2.birthTime || '12:00';
    const timezone1 = person1.timezone || 'Asia/Seoul';
    const timezone2 = person2.timezone || 'Asia/Seoul';

    // 사주 데이터 계산 (새로운 시그니처: birthDate, birthTime, gender, calendarType, timezone)
    const saju1 = calculateSajuData(
      person1.birthDate,
      time1,
      person1.gender === 'F' ? 'female' : 'male',
      'solar',
      timezone1
    );

    const saju2 = calculateSajuData(
      person2.birthDate,
      time2,
      person2.gender === 'F' ? 'female' : 'male',
      'solar',
      timezone2
    );

    // CompatibilitySubject 형식으로 변환
    const subject1: CompatibilitySubject = {
      id: 'person1',
      pillars: saju1.pillars,
      gender: person1.gender === 'F' ? 'female' : 'male',
      birthYear: date1.getFullYear(),
    };

    const subject2: CompatibilitySubject = {
      id: 'person2',
      pillars: saju2.pillars,
      gender: person2.gender === 'F' ? 'female' : 'male',
      birthYear: date2.getFullYear(),
    };

    // 종합 궁합 분석
    const result = analyzeComprehensiveCompatibility(subject1, subject2, {
      categories: ['love'],
    });

    const score = result.overallScore;

    // 캐시에 저장
    compatibilityCache.set(cacheKey, { score, timestamp: Date.now() });

    return score;
  } catch (error) {
    logger.error('[calculateQuickCompatibility] Error:', { error: error });
    return 75; // 에러 시 기본값
  }
}

/**
 * 상세 궁합 분석 (매치 성사 후 사용)
 */
export async function calculateDetailedCompatibility(
  person1: BirthInfo,
  person2: BirthInfo
): Promise<{
  score: number;
  grade: string;
  strengths: string[];
  challenges: string[];
  advice: string;
  dayMasterRelation: string;
  elementHarmony: string[];
  recommendations: string[];
}> {
  try {
    // 생년월일 파싱
    const date1 = new Date(person1.birthDate);
    const date2 = new Date(person2.birthDate);

    // 시간 형식 변환
    const time1 = person1.birthTime || '12:00';
    const time2 = person2.birthTime || '12:00';
    const timezone1 = person1.timezone || 'Asia/Seoul';
    const timezone2 = person2.timezone || 'Asia/Seoul';

    // 사주 데이터 계산 (새로운 시그니처: birthDate, birthTime, gender, calendarType, timezone)
    const saju1 = calculateSajuData(
      person1.birthDate,
      time1,
      person1.gender === 'F' ? 'female' : 'male',
      'solar',
      timezone1
    );

    const saju2 = calculateSajuData(
      person2.birthDate,
      time2,
      person2.gender === 'F' ? 'female' : 'male',
      'solar',
      timezone2
    );

    // CompatibilitySubject 형식으로 변환
    const subject1: CompatibilitySubject = {
      id: 'person1',
      pillars: saju1.pillars,
      gender: person1.gender === 'F' ? 'female' : 'male',
      birthYear: date1.getFullYear(),
    };

    const subject2: CompatibilitySubject = {
      id: 'person2',
      pillars: saju2.pillars,
      gender: person2.gender === 'F' ? 'female' : 'male',
      birthYear: date2.getFullYear(),
    };

    // 종합 궁합 분석 (연애 카테고리)
    const result = analyzeComprehensiveCompatibility(subject1, subject2, {
      categories: ['love', 'friendship'],
    });

    return {
      score: result.overallScore,
      grade: result.grade,
      strengths: result.strengths,
      challenges: result.challenges,
      advice: generateAdvice(result.overallScore, result.grade),
      dayMasterRelation: result.dayMasterRelation.dynamics,
      elementHarmony: result.elementCompatibility.harmony,
      recommendations: result.recommendations,
    };
  } catch (error) {
    logger.error('[calculateDetailedCompatibility] Error:', { error: error });
    return {
      score: 75,
      grade: 'B',
      strengths: ['서로 배울 점이 많아요'],
      challenges: ['소통이 필요해요'],
      advice: '서로를 알아가는 시간을 가져보세요.',
      dayMasterRelation: '평범한 관계입니다.',
      elementHarmony: [],
      recommendations: ['천천히 관계를 발전시켜 보세요.'],
    };
  }
}

/**
 * 간단한 궁합 정보 (프로필 카드 표시용)
 */
export async function getCompatibilitySummary(
  person1: BirthInfo,
  person2: BirthInfo
): Promise<{
  score: number;
  grade: string;
  emoji: string;
  tagline: string;
}> {
  const score = await calculateQuickCompatibility(person1, person2);

  let grade: string;
  let emoji: string;
  let tagline: string;

  if (score >= 90) {
    grade = 'S';
    emoji = '💫';
    tagline = '천생연분';
  } else if (score >= 80) {
    grade = 'A';
    emoji = '💕';
    tagline = '환상의 케미';
  } else if (score >= 70) {
    grade = 'B';
    emoji = '✨';
    tagline = '좋은 궁합';
  } else if (score >= 60) {
    grade = 'C';
    emoji = '🌟';
    tagline = '발전 가능성';
  } else if (score >= 50) {
    grade = 'D';
    emoji = '💭';
    tagline = '노력이 필요해요';
  } else {
    grade = 'F';
    emoji = '🌱';
    tagline = '서로 다른 매력';
  }

  return { score, grade, emoji, tagline };
}

function generateAdvice(score: number, grade: string): string {
  switch (grade) {
    case 'S':
      return '천생연분의 인연이에요! 서로를 믿고 함께 성장해보세요. 작은 갈등도 쉽게 풀릴 거예요.';
    case 'A':
      return '매우 좋은 궁합이에요. 서로의 강점을 살리고 약점을 보완하며 행복한 관계를 만들어가세요.';
    case 'B':
      return '좋은 궁합이에요. 꾸준한 소통과 이해를 통해 더 깊은 관계로 발전할 수 있어요.';
    case 'C':
      return '노력하면 좋은 관계를 만들 수 있어요. 서로의 차이를 인정하고 배려하는 마음이 중요해요.';
    case 'D':
      return '서로 다른 점이 많지만, 그것이 배움의 기회가 될 수 있어요. 인내심을 가지고 천천히 알아가세요.';
    default:
      return '독특한 조합이에요. 서로의 다름을 존중하고 새로운 시각으로 관계를 바라봐 보세요.';
  }
}

/**
 * Shared Constants for Matrix Analyzers
 * 매트릭스 분석에서 공통으로 사용되는 상수들
 */

import type { ShinsalKind } from '@/lib/destiny-matrix/types';

/**
 * 건강 관련 오행별 장기 매핑
 */
export const ELEMENT_HEALTH_MAP: Record<
  string,
  {
    organs: string[];
    organEn: string[];
    warning: string;
    warningEn: string;
  }
> = {
  '목': {
    organs: ['간', '담낭', '눈', '근육', '신경'],
    organEn: ['Liver', 'Gallbladder', 'Eyes', 'Muscles', 'Nerves'],
    warning: '스트레스와 분노 조절이 중요해요',
    warningEn: 'Stress and anger management is important',
  },
  '화': {
    organs: ['심장', '소장', '혈압', '혀'],
    organEn: ['Heart', 'Small intestine', 'Blood pressure', 'Tongue'],
    warning: '과로와 흥분을 피하세요',
    warningEn: 'Avoid overwork and excitement',
  },
  '토': {
    organs: ['위장', '비장', '소화기', '입술'],
    organEn: ['Stomach', 'Spleen', 'Digestive system', 'Lips'],
    warning: '규칙적인 식사가 중요해요',
    warningEn: 'Regular meals are important',
  },
  '금': {
    organs: ['폐', '대장', '피부', '코'],
    organEn: ['Lungs', 'Large intestine', 'Skin', 'Nose'],
    warning: '호흡기와 피부 관리가 필요해요',
    warningEn: 'Respiratory and skin care needed',
  },
  '수': {
    organs: ['신장', '방광', '귀', '뼈'],
    organEn: ['Kidneys', 'Bladder', 'Ears', 'Bones'],
    warning: '충분한 수분 섭취와 휴식이 필요해요',
    warningEn: 'Adequate hydration and rest needed',
  },
};

/**
 * 건강 관련 신살 목록
 */
export const HEALTH_SHINSALS: ShinsalKind[] = [
  '병부',
  '효신살',
  '상문살',
  '백호',
  '귀문관',
];

/**
 * 카르마/업보 관련 신살 목록
 * Note: 일부 신살은 ShinsalKind 타입에 정의되지 않아 문자열로 사용
 */
export const KARMA_SHINSALS: readonly string[] = [
  '원진',
  '역마',
  '화개',
  '천라지망',
  '공망',
  '천을귀인',
  '월덕귀인',
  '천덕귀인',
];

/**
 * 연애/결혼 관련 신살 목록
 */
export const LOVE_SHINSALS: readonly string[] = [
  '도화',
  '홍염살',
  '함지',
];

/**
 * 그림자/숨겨진 성격 관련 신살 목록
 */
export const SHADOW_SHINSALS: readonly string[] = [
  '역마',
  '원진',
  '백호',
  '상문살',
  '천라지망',
  '공망',
  '양인',
];


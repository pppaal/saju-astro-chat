/**
 * 태양-달 원소 조합별 내면 갈등 패턴 (태양과 달이 다른 원소일 때).
 *
 * 키 형식: `${sunElement}-${moonElement}` — 알파벳 순으로 정렬해 저장한다.
 * 예: 'fire-water' (수-화 조합은 'fire-water' 로 통일).
 */

import type { BilingualText } from '../../types/core';

export const ELEMENT_CONFLICTS: Record<string, BilingualText> = {
  'fire-water': {
    ko: '열정과 감정 사이에서 갈등해요. 행동하고 싶지만 조심스러워요.',
    en: 'Conflict between passion and emotion. Want to act but cautious.',
  },
  'earth-fire': {
    ko: '모험과 안정 사이에서 갈등해요. 도전하고 싶지만 확실함도 원해요.',
    en: 'Conflict between adventure and stability. Want to challenge but also want certainty.',
  },
  'air-water': {
    ko: '논리와 감정 사이에서 갈등해요. 생각과 느낌이 달라요.',
    en: 'Conflict between logic and emotion. Thoughts and feelings differ.',
  },
  'air-earth': {
    ko: '아이디어와 현실 사이에서 갈등해요. 상상과 실행 사이 간극이 있어요.',
    en: 'Conflict between ideas and reality. Gap between imagination and execution.',
  },
  'air-fire': {
    ko: '에너지가 넘쳐요. 행동과 생각이 빨라서 때로는 앞서가요.',
    en: 'Overflowing energy. Actions and thoughts are fast, sometimes ahead.',
  },
  'earth-water': {
    ko: '감정과 현실 사이에서 균형을 찾아요. 안정 속에서 깊이를 추구해요.',
    en: 'Find balance between emotion and reality. Seek depth in stability.',
  },
};

/**
 * 두 원소를 정렬된 키로 변환. 입력 순서와 무관하게 같은 키 반환.
 */
export function makeConflictKey(el1: string, el2: string): string {
  const sorted = [el1, el2].sort();
  return `${sorted[0]}-${sorted[1]}`;
}

/**
 * 달 별자리별 스트레스 대응 방식.
 */

import type { BilingualText, ZodiacSign } from '../../types/core';

export const MOON_STRESS_RESPONSE: Record<ZodiacSign, BilingualText> = {
  aries: { ko: '스트레스를 받으면 활동적으로 풀어요. 운동이나 행동으로 해소해요.', en: 'When stressed, release through activity. Exercise or action helps.' },
  taurus: { ko: '편안한 환경에서 휴식하며 회복해요. 맛있는 음식이나 자연이 도움돼요.', en: 'Recover by resting in comfort. Good food or nature helps.' },
  gemini: { ko: '대화하거나 새로운 정보를 찾으며 해소해요. 머리를 쓰면 기분이 나아져요.', en: 'Release through conversation or seeking new info. Mental activity improves mood.' },
  cancer: { ko: '혼자만의 시간이나 가까운 사람과 함께하며 회복해요. 안정감이 필요해요.', en: 'Recover with alone time or close ones. Need sense of security.' },
  leo: { ko: '창의적 활동이나 주목받는 일로 해소해요. 인정받으면 힘이 나요.', en: 'Release through creative activity or being noticed. Recognition energizes.' },
  virgo: { ko: '정리하고 문제를 해결하며 마음을 가다듬어요. 실질적 행동이 도움돼요.', en: 'Organize and solve problems to calm down. Practical action helps.' },
  libra: { ko: '아름다운 것을 보거나 조화로운 환경에서 쉬어요. 균형 회복이 중요해요.', en: 'Rest seeing beauty or in harmonious environment. Balance recovery matters.' },
  scorpio: { ko: '깊이 성찰하거나 혼자 시간을 보내며 재충전해요. 강렬한 감정을 소화해요.', en: 'Recharge through deep reflection or alone time. Process intense emotions.' },
  sagittarius: { ko: '여행이나 새로운 경험으로 기분을 전환해요. 자유로움이 필요해요.', en: 'Change mood through travel or new experiences. Need freedom.' },
  capricorn: { ko: '일에 집중하거나 목표를 향해 노력하며 극복해요. 성취감이 회복을 도와요.', en: 'Overcome by focusing on work or pursuing goals. Achievement aids recovery.' },
  aquarius: { ko: '혼자 생각하거나 친구들과 어울리며 해소해요. 개인 공간이 중요해요.', en: 'Release by thinking alone or hanging with friends. Personal space matters.' },
  pisces: { ko: '예술, 음악, 명상으로 마음을 치유해요. 상상의 세계로 잠시 피해요.', en: 'Heal through art, music, meditation. Escape to imagination briefly.' },
};

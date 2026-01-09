/**
 * 금성 하우스별 사랑을 찾는 장소/방식
 * 금성의 하우스 위치는 어디에서 사랑을 찾을 수 있는지를 나타냄
 */

import type { BilingualText, HouseNumber } from '../../types/core';

export const VENUS_HOUSE_PATTERNS: Record<HouseNumber, BilingualText> = {
  1: {
    ko: "첫인상에서 매력이 빛나요. 자연스럽게 사랑이 찾아와요.",
    en: "Your charm shines in first impressions. Love finds you naturally."
  },
  2: {
    ko: "물질적 안정을 함께 누릴 수 있는 사랑을 원해요.",
    en: "Want love where you can share material stability together."
  },
  3: {
    ko: "대화, SNS, 근처 동네에서 인연을 만나기 쉬워요.",
    en: "Easy to meet connections through conversation, SNS, or nearby areas."
  },
  4: {
    ko: "가족 소개나 집에서의 만남이 좋은 인연으로 이어져요.",
    en: "Family introductions or home meetings lead to good connections."
  },
  5: {
    ko: "취미, 파티, 창작 활동에서 운명적 만남이 와요.",
    en: "Destined meetings come through hobbies, parties, creative activities."
  },
  6: {
    ko: "직장이나 일상 루틴에서 인연을 만나기 쉬워요.",
    en: "Easy to meet connections at work or through daily routines."
  },
  7: {
    ko: "정식 소개팅이나 공식적 자리에서 좋은 인연을 만나요.",
    en: "Meet good connections through formal introductions or official settings."
  },
  8: {
    ko: "깊고 강렬한 만남을 추구해요. 비밀스러운 인연일 수 있어요.",
    en: "Seek deep, intense meetings. May be a secretive connection."
  },
  9: {
    ko: "여행, 유학, 외국에서 특별한 인연이 기다려요.",
    en: "Special connections await in travel, study abroad, or foreign countries."
  },
  10: {
    ko: "직업적 환경이나 사회적 모임에서 인연이 와요.",
    en: "Connections come through professional settings or social gatherings."
  },
  11: {
    ko: "친구 소개, 모임, 온라인 커뮤니티에서 인연을 만나요.",
    en: "Meet connections through friend introductions, groups, online communities."
  },
  12: {
    ko: "숨겨진 장소, 영적 공간에서 특별한 인연이 있어요.",
    en: "Special connections in hidden places or spiritual spaces."
  },
};

/**
 * Vertex 하우스별 운명적 만남 장소
 * Vertex는 점성술에서 운명적 만남과 중요한 인연을 나타내는 포인트
 */
export const VERTEX_MEETING_PLACES: Record<HouseNumber, BilingualText> = {
  1: {
    ko: "혼자만의 시간, 자기개발 활동에서 운명적 만남이 와요.",
    en: "Fated meeting during alone time, self-improvement."
  },
  2: {
    ko: "쇼핑, 재테크, 재능 활용 중에 운명적 만남이 와요.",
    en: "Fated meeting while shopping, investing, using talents."
  },
  3: {
    ko: "동네, 학교, SNS에서 운명적 만남이 와요.",
    en: "Fated meeting in neighborhood, school, SNS."
  },
  4: {
    ko: "집, 가족 모임, 고향에서 운명적 만남이 와요.",
    en: "Fated meeting at home, family gatherings, hometown."
  },
  5: {
    ko: "연애 앱, 파티, 취미 활동에서 운명적 만남이 와요!",
    en: "Fated meeting through dating apps, parties, hobbies!"
  },
  6: {
    ko: "직장, 헬스장, 봉사활동에서 운명적 만남이 와요.",
    en: "Fated meeting at work, gym, volunteer activities."
  },
  7: {
    ko: "소개팅, 비즈니스 미팅에서 운명적 만남이 와요.",
    en: "Fated meeting through blind dates, business meetings."
  },
  8: {
    ko: "위기 상황, 깊은 대화 중에 운명적 만남이 와요.",
    en: "Fated meeting during crisis, deep conversations."
  },
  9: {
    ko: "여행, 유학, 철학/종교 모임에서 운명적 만남이 와요.",
    en: "Fated meeting through travel, study abroad, spiritual groups."
  },
  10: {
    ko: "직장, 공식 행사, 업계 모임에서 운명적 만남이 와요.",
    en: "Fated meeting at work, official events, industry gatherings."
  },
  11: {
    ko: "친구 모임, 온라인 커뮤니티에서 운명적 만남이 와요.",
    en: "Fated meeting at friend gatherings, online communities."
  },
  12: {
    ko: "병원, 명상센터, 혼자 조용할 때 운명적 만남이 와요.",
    en: "Fated meeting at hospitals, meditation centers, quiet moments."
  },
};

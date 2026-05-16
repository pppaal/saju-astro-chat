/**
 * 12하우스(무의식·고독·영성) × 별자리 — 숨겨진 자아 해석.
 */

import type { BilingualText, ZodiacSign } from '../../types/core';

export interface HiddenEntry {
  shadowTheme: BilingualText;
  hiddenStrength: BilingualText;
  healing: BilingualText;
}

export const HOUSE12_HIDDEN: Record<ZodiacSign, HiddenEntry> = {
  aries: {
    shadowTheme: { ko: '겉으로는 강하지만 속에는 외로움과 분노가 숨어 있어요.', en: 'Outwardly strong, but loneliness and anger hide within.' },
    hiddenStrength: { ko: '혼자만의 시간에 가장 큰 결단을 내려요.', en: 'You make your biggest decisions in solitude.' },
    healing: { ko: '격렬한 운동 후의 정적이 회복 통로예요.', en: 'Stillness after intense exercise is your healing channel.' },
  },
  taurus: {
    shadowTheme: { ko: '소유와 안전에 대한 깊은 두려움이 숨어 있어요.', en: 'Deep fear about possession and safety hides within.' },
    hiddenStrength: { ko: '자연에서 자기를 되찾아요.', en: 'You regain yourself in nature.' },
    healing: { ko: '몸을 위한 작은 의식(아침 차·산책)이 회복 통로.', en: 'Small body rituals (morning tea, walks) heal you.' },
  },
  gemini: {
    shadowTheme: { ko: '말이 많은 만큼 진짜 속마음을 숨겨요.', en: 'The more words, the more the real heart hides.' },
    hiddenStrength: { ko: '글쓰기에서 진짜 자기가 나와요.', en: 'Your real self emerges in writing.' },
    healing: { ko: '아무에게도 보여주지 않는 일기를 쓰세요.', en: 'Keep a journal no one else sees.' },
  },
  cancer: {
    shadowTheme: { ko: '가족에 대한 미처리 감정이 깊이 잠들어 있어요.', en: 'Unprocessed family emotions sleep deeply within.' },
    hiddenStrength: { ko: '울 수 있는 안전한 공간이 회복의 자원.', en: 'A safe place to cry is your recovery resource.' },
    healing: { ko: '오래된 가족 이야기를 다시 듣고 정리하세요.', en: 'Re-listen to old family stories and sort them.' },
  },
  leo: {
    shadowTheme: { ko: '인정받지 못한 자기에 대한 깊은 갈증이 있어요.', en: 'Deep thirst for the un-recognized self.' },
    hiddenStrength: { ko: '아무도 안 보는 곳에서의 창작이 진짜 힘.', en: 'Creating where no one watches is your real power.' },
    healing: { ko: '자기에게 칭찬을 매일 한 마디씩 적어보세요.', en: 'Write one compliment to yourself each day.' },
  },
  virgo: {
    shadowTheme: { ko: '완벽주의 뒤에 자기를 갉는 자기 비판이 숨어 있어요.', en: 'Behind perfectionism, self-eating self-critique hides.' },
    hiddenStrength: { ko: '봉사 활동에서 진짜 평화를 찾아요.', en: 'You find true peace in service.' },
    healing: { ko: '하루 한 가지 잘한 일만 기록하세요.', en: 'Record one thing done well each day.' },
  },
  libra: {
    shadowTheme: { ko: '모두에게 친절한 만큼 자기 자리를 잃어요.', en: 'The kinder to all, the more you lose your own place.' },
    hiddenStrength: { ko: '혼자 있을 때 깊은 미적 감각이 자라요.', en: 'Deep aesthetic sense grows in solitude.' },
    healing: { ko: '예술관·전시·자연 풍경에서 회복하세요.', en: 'Recover in art galleries, exhibitions, natural views.' },
  },
  scorpio: {
    shadowTheme: { ko: '오래된 상처와 비밀이 깊은 곳에 봉인돼 있어요.', en: 'Old wounds and secrets sealed in deep places.' },
    hiddenStrength: { ko: '진짜 친밀한 사람에게만 보이는 깊이가 있어요.', en: 'A depth visible only to truly intimate people.' },
    healing: { ko: '심리 치료·일기·예술로 어둠을 빛에 통합하세요.', en: 'Integrate darkness with light via therapy, journaling, art.' },
  },
  sagittarius: {
    shadowTheme: { ko: '자유로움 뒤에 깊은 의미 결핍이 숨어 있어요.', en: 'Behind freedom, a deep lack of meaning hides.' },
    hiddenStrength: { ko: '혼자 떠나는 짧은 여행이 회복 통로.', en: 'Short solo trips are your recovery channel.' },
    healing: { ko: '의미를 묻는 책 한 권을 매년 한 권씩 읽어요.', en: 'Read one meaning-asking book each year.' },
  },
  capricorn: {
    shadowTheme: { ko: '성취 뒤의 공허함이 깊이 숨겨져 있어요.', en: 'Emptiness behind achievement hides deeply.' },
    hiddenStrength: { ko: '책임을 잠시 내려놓는 능력이 회복의 자산.', en: 'Putting down responsibility briefly is a recovery asset.' },
    healing: { ko: '결과 없는 취미를 한 가지 두세요.', en: 'Keep one hobby without any output.' },
  },
  aquarius: {
    shadowTheme: { ko: '거리 두기 뒤에 깊은 외로움이 숨어 있어요.', en: 'Behind detachment, deep loneliness hides.' },
    hiddenStrength: { ko: '같은 이상을 가진 친구 한두 명이 회복 자원.', en: 'A couple of friends with shared ideals are a recovery resource.' },
    healing: { ko: '대규모 모임 대신 깊은 1:1 대화를 늘리세요.', en: 'Increase deep 1-to-1 conversations over large gatherings.' },
  },
  pisces: {
    shadowTheme: { ko: '경계 없이 모든 감정을 흡수해 자주 지쳐요.', en: 'Absorbs all emotions without boundary — often drained.' },
    hiddenStrength: { ko: '명상·예술·꿈 작업에 천부적 재능.', en: 'Natural gift in meditation, art, dream work.' },
    healing: { ko: '매일 아침 자기 의도를 종이에 적어 경계를 만드세요.', en: 'Each morning, write your intent on paper to build a boundary.' },
  },
};

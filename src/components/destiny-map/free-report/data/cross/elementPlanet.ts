/**
 * 사주 강한 오행 × 점성 지배 행성 교차해석.
 *
 * 사주에서 가장 강한 오행과, 점성에서 그 사람의 핵심 행성(보통 Sun 또는 chart ruler)
 * 의 결합을 해석한다. 두 시스템이 한 인물을 어느 각도로 비추는지를 보여준다.
 */

import type { BilingualText, FiveElement, StandardPlanetName } from '../../types/core';

export interface ElementPlanetEntry {
  archetype: BilingualText;
  blessing: BilingualText;
  shadow: BilingualText;
  practice: BilingualText;
}

type ElementPlanetMap = Partial<Record<FiveElement, Partial<Record<StandardPlanetName, ElementPlanetEntry>>>>;

/**
 * 표는 5(오행) × 7(태양/달/수성/금성/화성/목성/토성) = 35개 핵심 조합을 채운다.
 * Outer planet 은 generational 이라 제외.
 */
export const ELEMENT_PLANET_CROSS: ElementPlanetMap = {
  wood: {
    sun: {
      archetype: { ko: '성장하는 리더', en: 'Growing leader' },
      blessing: { ko: '도전과 자존감이 자기 색이 돼요.', en: 'Challenge and self-worth become your color.' },
      shadow: { ko: '고집이 관계를 끊을 위험.', en: 'Stubbornness can sever bonds.' },
      practice: { ko: '주 1회 듣기만 하는 시간을 두세요.', en: 'Once a week, schedule listen-only time.' },
    },
    moon: {
      archetype: { ko: '성장 지향의 양육자', en: 'Growth-oriented nurturer' },
      blessing: { ko: '키워주는 본능이 자기 자산.', en: 'Nurturing instinct is your asset.' },
      shadow: { ko: '걱정이 일찍 시작돼요.', en: 'Worry starts early.' },
      practice: { ko: '걱정을 종이에 적어 닫는 의식을 두세요.', en: 'Write worry on paper and close it as ritual.' },
    },
    mercury: {
      archetype: { ko: '아이디어 개척자', en: 'Idea pioneer' },
      blessing: { ko: '새 아이디어가 끊임없이 나와요.', en: 'New ideas flow constantly.' },
      shadow: { ko: '실행이 늦어 아이디어만 쌓여요.', en: 'Slow execution — ideas pile up.' },
      practice: { ko: '아이디어를 적자마자 첫 액션을 정하세요.', en: 'Right after writing an idea, define the first action.' },
    },
    venus: {
      archetype: { ko: '성장하는 매력', en: 'Growing charm' },
      blessing: { ko: '관계에 따라 매력이 자라는 사람.', en: 'Charm grows alongside relationships.' },
      shadow: { ko: '관계에 의존하기 쉬워요.', en: 'Easily dependent on relationships.' },
      practice: { ko: '혼자만의 취미를 한 가지 키우세요.', en: 'Grow one solo hobby.' },
    },
    mars: {
      archetype: { ko: '도전의 추진력', en: 'Drive of challenge' },
      blessing: { ko: '한 분야를 끝까지 미는 힘.', en: 'Power to push a field to its end.' },
      shadow: { ko: '폭주와 외상 위험.', en: 'Runaway and injury risk.' },
      practice: { ko: '결정 전 10분 호흡 루틴.', en: '10-minute breath routine before decisions.' },
    },
    jupiter: {
      archetype: { ko: '확장의 지혜', en: 'Wisdom of expansion' },
      blessing: { ko: '큰 비전과 사람 운이 함께 와요.', en: 'Big vision and people-luck arrive together.' },
      shadow: { ko: '과욕과 미완성.', en: 'Over-ambition and unfinished work.' },
      practice: { ko: '시작한 일 80%만 채우는 연습.', en: 'Practice finishing 80% of what you start.' },
    },
    saturn: {
      archetype: { ko: '뿌리내리는 건축가', en: 'Architect rooting deep' },
      blessing: { ko: '꾸준한 노력으로 큰 건물을 세워요.', en: 'Steady effort builds great structures.' },
      shadow: { ko: '경직되기 쉬워요.', en: 'Tends to rigidity.' },
      practice: { ko: '매년 작은 휴식 여행을 두세요.', en: 'Keep a small rest-trip each year.' },
    },
  },
  fire: {
    sun: {
      archetype: { ko: '빛나는 무대인', en: 'Radiant performer' },
      blessing: { ko: '존재감과 카리스마가 자산.', en: 'Presence and charisma are assets.' },
      shadow: { ko: '번아웃 위험 최대치.', en: 'Burnout risk at maximum.' },
      practice: { ko: '에너지 회복 루틴 두 가지를 박아두세요.', en: 'Pin down two recovery routines.' },
    },
    moon: {
      archetype: { ko: '열정 어린 감수성', en: 'Passionate sensitivity' },
      blessing: { ko: '감정 표현이 풍부하고 인기가 많아요.', en: 'Rich emotional expression — popular.' },
      shadow: { ko: '감정 기복이 큽니다.', en: 'Mood swings.' },
      practice: { ko: '감정 기록 일기를 두세요.', en: 'Keep an emotion journal.' },
    },
    mercury: {
      archetype: { ko: '열정의 전달자', en: 'Conveyor of passion' },
      blessing: { ko: '말과 글이 사람을 움직여요.', en: 'Words move people.' },
      shadow: { ko: '말이 앞서 행동이 따라가지 못해요.', en: 'Speech outruns action.' },
      practice: { ko: '말한 약속을 캘린더에 박으세요.', en: 'Pin spoken promises to your calendar.' },
    },
    venus: {
      archetype: { ko: '뜨거운 매력가', en: 'Hot magnetism' },
      blessing: { ko: '연애와 사교 운이 화려해요.', en: 'Love and social luck are glamorous.' },
      shadow: { ko: '쉽게 식고 갈증이 와요.', en: 'Cools easily — chronic thirst.' },
      practice: { ko: '한 사람과 깊이 가는 연습.', en: 'Practice depth with one person.' },
    },
    mars: {
      archetype: { ko: '돌격대장', en: 'Charge commander' },
      blessing: { ko: '한 방의 결단력과 추진력.', en: 'One-strike decisiveness and drive.' },
      shadow: { ko: '폭발과 외상.', en: 'Explosions and injuries.' },
      practice: { ko: '결정 후 5분 호흡 의식.', en: '5-minute breath ritual after deciding.' },
    },
    jupiter: {
      archetype: { ko: '비전의 전도사', en: 'Vision evangelist' },
      blessing: { ko: '큰 그림과 인기가 함께 와요.', en: 'Big picture and popularity arrive together.' },
      shadow: { ko: '과장과 허세.', en: 'Exaggeration and bravado.' },
      practice: { ko: '말한 숫자에 책임지는 루틴.', en: 'Own up to the numbers you speak.' },
    },
    saturn: {
      archetype: { ko: '꺼지지 않는 불의 장인', en: 'Master of an unquenched flame' },
      blessing: { ko: '오래 가는 열정과 책임감.', en: 'Long-lasting passion and responsibility.' },
      shadow: { ko: '열정이 의무로 변해 메말라요.', en: 'Passion turns to duty — runs dry.' },
      practice: { ko: '왜 시작했는지 분기마다 다시 적기.', en: 'Rewrite the original reason each quarter.' },
    },
  },
  earth: {
    sun: {
      archetype: { ko: '안정의 권위자', en: 'Authority of stability' },
      blessing: { ko: '신뢰와 권위가 자기 자산.', en: 'Trust and authority are assets.' },
      shadow: { ko: '경직된 자기 검열.', en: 'Rigid self-censorship.' },
      practice: { ko: '주 1회 즉흥적 결정 만들기.', en: 'One impromptu decision per week.' },
    },
    moon: {
      archetype: { ko: '뿌리 깊은 양육자', en: 'Deep-rooted nurturer' },
      blessing: { ko: '돌봄과 정서적 안정감.', en: 'Caring and emotional steadiness.' },
      shadow: { ko: '변화 거부.', en: 'Resistance to change.' },
      practice: { ko: '연 1회 새 환경 도전.', en: 'New-environment challenge once a year.' },
    },
    mercury: {
      archetype: { ko: '실용 전략가', en: 'Practical strategist' },
      blessing: { ko: '실행 가능한 사고와 계산.', en: 'Actionable thought and calculation.' },
      shadow: { ko: '상상력 부족.', en: 'Lacking imagination.' },
      practice: { ko: '주 1회 아무 쓸모 없는 상상하기.', en: 'Once a week, imagine something useless.' },
    },
    venus: {
      archetype: { ko: '감각의 향유자', en: 'Connoisseur of senses' },
      blessing: { ko: '돈·맛·미적 감각의 안정.', en: 'Stability in money, taste, aesthetics.' },
      shadow: { ko: '소유욕과 게으름.', en: 'Possessiveness and laziness.' },
      practice: { ko: '소유를 한 가지 비우는 월간 의식.', en: 'Monthly ritual: release one possession.' },
    },
    mars: {
      archetype: { ko: '느린 황소의 추진력', en: 'Slow-bull drive' },
      blessing: { ko: '시작은 느려도 끝까지 미는 힘.', en: 'Slow start but pushes to the end.' },
      shadow: { ko: '바꿔야 할 때를 놓쳐요.', en: 'Misses the time to pivot.' },
      practice: { ko: '분기 점검에서 전략 재평가.', en: 'Quarterly review with strategy reassessment.' },
    },
    jupiter: {
      archetype: { ko: '풍요의 농부', en: 'Farmer of abundance' },
      blessing: { ko: '실용적 부가 자라요.', en: 'Practical wealth grows.' },
      shadow: { ko: '과식·과소비.', en: 'Overeating and overspending.' },
      practice: { ko: '매월 자동 저축 루틴.', en: 'Monthly autosave routine.' },
    },
    saturn: {
      archetype: { ko: '돌탑의 장인', en: 'Master of the stone tower' },
      blessing: { ko: '시간이 자기 편이 되는 사람.', en: 'Time is on your side.' },
      shadow: { ko: '냉정함과 우울감.', en: 'Coldness and depression.' },
      practice: { ko: '가까운 사람에게 감사 표현 주 1회.', en: 'Express gratitude to a close one weekly.' },
    },
  },
  metal: {
    sun: {
      archetype: { ko: '정의의 검사', en: 'Prosecutor of justice' },
      blessing: { ko: '결단·정의감·정확함.', en: 'Decision, justice, precision.' },
      shadow: { ko: '날카로움이 관계를 베요.', en: 'Sharpness cuts relationships.' },
      practice: { ko: '비판 앞에 칭찬을 두 개 두기.', en: 'Two compliments before any critique.' },
    },
    moon: {
      archetype: { ko: '예민한 감별가', en: 'Sensitive discerner' },
      blessing: { ko: '미적·정서적 감각이 정밀.', en: 'Aesthetic and emotional precision.' },
      shadow: { ko: '예민함이 일상 피로를 키워요.', en: 'Sensitivity multiplies daily fatigue.' },
      practice: { ko: '주말 디지털 디톡스.', en: 'Weekend digital detox.' },
    },
    mercury: {
      archetype: { ko: '날카로운 분석가', en: 'Sharp analyst' },
      blessing: { ko: '정확함과 명료함이 자산.', en: 'Precision and clarity are assets.' },
      shadow: { ko: '비판으로 사람을 잃어요.', en: 'Loses people via criticism.' },
      practice: { ko: '비판은 문서로, 칭찬은 음성으로.', en: 'Critique in writing, praise out loud.' },
    },
    venus: {
      archetype: { ko: '정련된 매력', en: 'Refined charm' },
      blessing: { ko: '품격과 아름다움이 자기 자산.', en: 'Dignity and beauty are assets.' },
      shadow: { ko: '까다로움.', en: 'Pickiness.' },
      practice: { ko: '완벽 대신 80% 받아들이기.', en: 'Accept 80% over perfection.' },
    },
    mars: {
      archetype: { ko: '단련된 검', en: 'Tempered blade' },
      blessing: { ko: '결단력과 정확한 타격.', en: 'Decisiveness and precise strikes.' },
      shadow: { ko: '폭주와 외상.', en: 'Runaway and injury.' },
      practice: { ko: '결정 후 24시간 유예.', en: '24-hour grace after decisions.' },
    },
    jupiter: {
      archetype: { ko: '정의의 확장가', en: 'Expander of justice' },
      blessing: { ko: '큰 그림의 공정성과 신뢰.', en: 'Big-picture fairness and trust.' },
      shadow: { ko: '독선적 정의감.', en: 'Self-righteous justice.' },
      practice: { ko: '반대편 의견 한 가지를 매주 듣기.', en: 'Listen to one opposing view weekly.' },
    },
    saturn: {
      archetype: { ko: '권위의 칼날', en: 'Authority\'s blade' },
      blessing: { ko: '체계·정확·인내의 결정체.', en: 'Crystallization of system, precision, patience.' },
      shadow: { ko: '냉정함과 고립.', en: 'Coldness and isolation.' },
      practice: { ko: '주 1회 가까운 사람과 식사.', en: 'Weekly meal with a close person.' },
    },
  },
  water: {
    sun: {
      archetype: { ko: '지혜의 권위자', en: 'Authority of wisdom' },
      blessing: { ko: '깊이와 통찰이 자기 자산.', en: 'Depth and insight are assets.' },
      shadow: { ko: '우울과 고립.', en: 'Depression and isolation.' },
      practice: { ko: '주 3회 햇빛 산책.', en: 'Sunlit walks 3x a week.' },
    },
    moon: {
      archetype: { ko: '깊은 직관가', en: 'Deep intuitive' },
      blessing: { ko: '예지력과 공감 능력.', en: 'Foresight and empathy.' },
      shadow: { ko: '경계 없음과 흡수.', en: 'No boundaries, absorption.' },
      practice: { ko: '하루 시작 시 자기 의도 적기.', en: 'Write daily intentions each morning.' },
    },
    mercury: {
      archetype: { ko: '시인의 사고', en: 'Poet\'s thought' },
      blessing: { ko: '풍부한 상상력과 깊은 표현.', en: 'Rich imagination, deep expression.' },
      shadow: { ko: '모호한 결론.', en: 'Vague conclusions.' },
      practice: { ko: '결론 먼저 말하기 화법.', en: 'Conclusion-first speech style.' },
    },
    venus: {
      archetype: { ko: '깊은 낭만가', en: 'Deep romantic' },
      blessing: { ko: '예술적 감수성과 헌신.', en: 'Artistic sensitivity and devotion.' },
      shadow: { ko: '환상에 빠지기 쉬워요.', en: 'Falls into illusion easily.' },
      practice: { ko: '현실 점검 친구 한 명 두기.', en: 'Keep one reality-check friend.' },
    },
    mars: {
      archetype: { ko: '직관적 추진력', en: 'Intuitive drive' },
      blessing: { ko: '직관에 따라 빠르게 움직여요.', en: 'Moves fast on intuition.' },
      shadow: { ko: '감정 기반 충동.', en: 'Emotion-based impulses.' },
      practice: { ko: '결정 전 24시간 데이터 점검.', en: '24-hour data check before deciding.' },
    },
    jupiter: {
      archetype: { ko: '확장된 지혜', en: 'Expanded wisdom' },
      blessing: { ko: '학문·치유·영성에서 큰 운.', en: 'Great luck in scholarship, healing, spirit.' },
      shadow: { ko: '과한 이상주의.', en: 'Excessive idealism.' },
      practice: { ko: '이상을 일정·예산에 박기.', en: 'Pin ideals to schedule and budget.' },
    },
    saturn: {
      archetype: { ko: '깊은 우물의 장인', en: 'Master of the deep well' },
      blessing: { ko: '인내와 깊이가 자기 자산.', en: 'Patience and depth are assets.' },
      shadow: { ko: '우울과 자기 처벌.', en: 'Depression and self-punishment.' },
      practice: { ko: '매일 작은 성취 1개 기록.', en: 'Record one small win each day.' },
    },
  },
};

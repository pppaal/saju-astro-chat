// src/lib/destiny-matrix/data/layer4-timing-overlay.ts
/**
 * ============================================================================
 * Destiny Fusion Matrix™ - Layer 4: Timing Overlay Matrix (타이밍 매트릭스)
 * ============================================================================
 * © 2024 All Rights Reserved. PROPRIETARY AND CONFIDENTIAL.
 * Unauthorized copying, distribution, or reverse engineering is prohibited.
 * ============================================================================
 */

import type { TimingOverlayMatrix, InteractionCode, TimingCycleRow, TransitCycle } from '../types';

const c = (
  level: InteractionCode['level'],
  score: number,
  icon: string,
  colorCode: InteractionCode['colorCode'],
  keyword: string,
  keywordEn: string
): InteractionCode => ({
  level,
  score,
  icon,
  colorCode,
  keyword,
  keywordEn,
});

// 확장된 타이밍 교차 매트릭스
// 행: 대운전환, 목/화/토/금/수 세운, 단기, 월운, 일운 (9행)
// 열: Return/Square 주기 7종 + 역행 5종 (12열)
// 총 108셀

export const TIMING_OVERLAY_MATRIX: TimingOverlayMatrix = {
  // ===========================
  // 대운 전환기 (10년 주기 변화)
  // ===========================
  daeunTransition: {
    // 기존 트랜짓 주기
    saturnReturn: c('extreme', 10, '🔱', 'purple', '대전환', 'Major shift'),
    jupiterReturn: c('amplify', 8, '🚀', 'green', '확장기', 'Expansion'),
    uranusSquare: c('extreme', 9, '⚡', 'purple', '각성', 'Awakening'),
    neptuneSquare: c('amplify', 8, '🌀', 'green', '영적각성', 'Spiritual awakening'),
    plutoTransit: c('extreme', 10, '💥', 'purple', '근본변화', 'Fundamental change'),
    nodeReturn: c('extreme', 9, '🔄', 'purple', '운명전환점', 'Destiny turning'),
    eclipse: c('amplify', 8, '⚡', 'green', '트리거', 'Trigger'),
    // 역행 효과
    mercuryRetrograde: c('clash', 5, '📝', 'yellow', '소통재검토', 'Communication review'),
    venusRetrograde: c('amplify', 7, '💕', 'green', '관계재평가', 'Relationship reassess'),
    marsRetrograde: c('clash', 4, '⚔️', 'yellow', '행동재고', 'Action reconsider'),
    jupiterRetrograde: c('amplify', 7, '🔮', 'green', '내면성장', 'Inner growth'),
    saturnRetrograde: c('extreme', 9, '🏔️', 'purple', '구조재편', 'Structure rebuild'),
  },

  // ===========================
  // 세운 오행별 (연간 운세)
  // ===========================
  '목': {
    saturnReturn: c('amplify', 7, '🌱', 'green', '성장구조화', 'Growth structure'),
    jupiterReturn: c('amplify', 8, '📈', 'green', '발전확대', 'Development expand'),
    uranusSquare: c('amplify', 8, '💡', 'green', '혁신성장', 'Innovation growth'),
    neptuneSquare: c('amplify', 7, '🎨', 'green', '창조영감', 'Creative inspiration'),
    plutoTransit: c('amplify', 7, '🔄', 'green', '재생변환', 'Regeneration'),
    nodeReturn: c('balance', 6, '⚖️', 'blue', '운명조정', 'Destiny adjust'),
    eclipse: c('amplify', 7, '🌱', 'green', '새시작', 'New beginning'),
    mercuryRetrograde: c('amplify', 7, '📚', 'green', '학습복습', 'Learning review'),
    venusRetrograde: c('balance', 6, '🌸', 'blue', '인연재고', 'Connection reconsider'),
    marsRetrograde: c('clash', 5, '🛑', 'yellow', '추진지연', 'Progress delay'),
    jupiterRetrograde: c('amplify', 8, '🌿', 'green', '내적성장', 'Inner development'),
    saturnRetrograde: c('balance', 6, '🌳', 'blue', '기반점검', 'Foundation check'),
  },
  '화': {
    saturnReturn: c('clash', 5, '🔥', 'yellow', '시련극복', 'Trial overcome'),
    jupiterReturn: c('extreme', 9, '🚀', 'purple', '도약성공', 'Leap success'),
    uranusSquare: c('extreme', 9, '⚡', 'purple', '폭발적변화', 'Explosive change'),
    neptuneSquare: c('clash', 5, '💥', 'yellow', '환상파괴', 'Fantasy break'),
    plutoTransit: c('extreme', 10, '🔥', 'purple', '완전변혁', 'Total transform'),
    nodeReturn: c('clash', 5, '💥', 'yellow', '운명충돌', 'Destiny clash'),
    eclipse: c('amplify', 8, '🔥', 'green', '정화', 'Purification'),
    mercuryRetrograde: c('conflict', 3, '😤', 'red', '분쟁재발', 'Conflict resurface'),
    venusRetrograde: c('clash', 4, '💔', 'yellow', '열정냉각', 'Passion cooling'),
    marsRetrograde: c('conflict', 2, '🛑', 'red', '행동정지', 'Action halt'),
    jupiterRetrograde: c('clash', 5, '🔥', 'yellow', '과잉억제', 'Excess restraint'),
    saturnRetrograde: c('clash', 4, '⏳', 'yellow', '추진지연', 'Progress delay'),
  },
  '토': {
    saturnReturn: c('extreme', 9, '🏔️', 'purple', '안정구축', 'Stability build'),
    jupiterReturn: c('amplify', 7, '📊', 'green', '체계정리', 'System organize'),
    uranusSquare: c('balance', 6, '⚖️', 'blue', '구조균형', 'Structure balance'),
    neptuneSquare: c('clash', 4, '🌀', 'yellow', '기반혼란', 'Foundation confusion'),
    plutoTransit: c('amplify', 7, '🔄', 'green', '구조재편', 'Structure reorganize'),
    nodeReturn: c('balance', 6, '⚖️', 'blue', '중립조정', 'Neutral adjust'),
    eclipse: c('balance', 6, '⚖️', 'blue', '미세조정', 'Fine tune'),
    mercuryRetrograde: c('balance', 6, '📋', 'blue', '계획재검토', 'Plan review'),
    venusRetrograde: c('amplify', 7, '🏠', 'green', '가치재정립', 'Value redefine'),
    marsRetrograde: c('amplify', 7, '🛡️', 'green', '수비강화', 'Defense strengthen'),
    jupiterRetrograde: c('balance', 6, '📊', 'blue', '확장점검', 'Expansion check'),
    saturnRetrograde: c('extreme', 9, '🏗️', 'purple', '기반재구축', 'Foundation rebuild'),
  },
  '금': {
    saturnReturn: c('amplify', 8, '✂️', 'green', '정리결산', 'Organize settle'),
    jupiterReturn: c('amplify', 8, '💰', 'green', '수확풍요', 'Harvest abundance'),
    uranusSquare: c('clash', 5, '💥', 'yellow', '충격정리', 'Shock organize'),
    neptuneSquare: c('clash', 4, '🌊', 'yellow', '손실소멸', 'Loss dissolve'),
    plutoTransit: c('conflict', 3, '☠️', 'red', '종결변환', 'End transform'),
    nodeReturn: c('clash', 5, '⚔️', 'yellow', '단절선택', 'Severance choice'),
    eclipse: c('amplify', 7, '✂️', 'green', '결단실행', 'Decision execute'),
    mercuryRetrograde: c('clash', 5, '📝', 'yellow', '계약재검토', 'Contract review'),
    venusRetrograde: c('clash', 4, '💎', 'yellow', '가치손실', 'Value loss'),
    marsRetrograde: c('clash', 4, '⚔️', 'yellow', '행동제한', 'Action limit'),
    jupiterRetrograde: c('balance', 6, '💰', 'blue', '재물점검', 'Wealth check'),
    saturnRetrograde: c('amplify', 7, '📊', 'green', '결산재정비', 'Settlement reorganize'),
  },
  '수': {
    saturnReturn: c('amplify', 7, '🌊', 'green', '흐름구조화', 'Flow structure'),
    jupiterReturn: c('amplify', 8, '🌊', 'green', '확산번영', 'Spread prosperity'),
    uranusSquare: c('extreme', 9, '🌀', 'purple', '혁명변화', 'Revolution change'),
    neptuneSquare: c('extreme', 9, '🔮', 'purple', '영성심화', 'Spirituality deepen'),
    plutoTransit: c('amplify', 8, '🌊', 'green', '깊은침잠', 'Deep immersion'),
    nodeReturn: c('amplify', 7, '🔄', 'green', '순환회귀', 'Cycle return'),
    eclipse: c('amplify', 8, '🌊', 'green', '감정정화', 'Emotion purify'),
    mercuryRetrograde: c('extreme', 9, '🧠', 'purple', '직관활성', 'Intuition activate'),
    venusRetrograde: c('amplify', 8, '💕', 'green', '감정정리', 'Emotion organize'),
    marsRetrograde: c('balance', 6, '🌊', 'blue', '흐름조절', 'Flow adjust'),
    jupiterRetrograde: c('extreme', 9, '🔮', 'purple', '영적확장', 'Spiritual expand'),
    saturnRetrograde: c('amplify', 7, '🌊', 'green', '깊이탐구', 'Depth explore'),
  },

  // ===========================
  // 단기 (기존 shortTerm)
  // ===========================
  shortTerm: {
    saturnReturn: c('balance', 5, '⚖️', 'blue', '미세제한', 'Minor limit'),
    jupiterReturn: c('amplify', 7, '💡', 'green', '기회포착', 'Opportunity seize'),
    uranusSquare: c('clash', 5, '⚡', 'yellow', '순간각성', 'Instant awakening'),
    neptuneSquare: c('balance', 5, '🌀', 'blue', '직관활성', 'Intuition activate'),
    plutoTransit: c('clash', 5, '⚡', 'yellow', '강렬순간', 'Intense moment'),
    nodeReturn: c('amplify', 7, '💫', 'green', '운명순간', 'Destiny moment'),
    eclipse: c('extreme', 9, '⚡', 'purple', '피크포인트', 'Peak point'),
    mercuryRetrograde: c('clash', 5, '📱', 'yellow', '소통오류', 'Communication error'),
    venusRetrograde: c('balance', 5, '💕', 'blue', '관계점검', 'Relationship check'),
    marsRetrograde: c('clash', 4, '🛑', 'yellow', '행동지연', 'Action delay'),
    jupiterRetrograde: c('balance', 6, '🤔', 'blue', '기회재고', 'Opportunity reconsider'),
    saturnRetrograde: c('clash', 4, '⏰', 'yellow', '책임재검토', 'Responsibility review'),
  },

  // ===========================
  // 월운 (Monthly Luck)
  // ===========================
  wolun: {
    saturnReturn: c('balance', 5, '📅', 'blue', '월간안정', 'Monthly stability'),
    jupiterReturn: c('amplify', 7, '🌙', 'green', '월간확장', 'Monthly expansion'),
    uranusSquare: c('clash', 5, '⚡', 'yellow', '월간변동', 'Monthly fluctuation'),
    neptuneSquare: c('balance', 5, '🌌', 'blue', '월간직관', 'Monthly intuition'),
    plutoTransit: c('balance', 5, '🔄', 'blue', '월간변화', 'Monthly change'),
    nodeReturn: c('amplify', 7, '🌙', 'green', '월간운명', 'Monthly destiny'),
    eclipse: c('extreme', 9, '🌑', 'purple', '월간전환점', 'Monthly turning'),
    mercuryRetrograde: c('clash', 5, '📝', 'yellow', '월간소통난', 'Monthly comm issue'),
    venusRetrograde: c('clash', 4, '💔', 'yellow', '월간관계난', 'Monthly relation issue'),
    marsRetrograde: c('conflict', 3, '⏸️', 'red', '월간정체', 'Monthly stagnation'),
    jupiterRetrograde: c('balance', 6, '🔮', 'blue', '월간성찰', 'Monthly reflection'),
    saturnRetrograde: c('clash', 4, '📋', 'yellow', '월간제약', 'Monthly constraint'),
  },

  // ===========================
  // 일운 (Daily Luck)
  // ===========================
  ilun: {
    saturnReturn: c('balance', 5, '☀️', 'blue', '일간안정', 'Daily stability'),
    jupiterReturn: c('amplify', 7, '🌟', 'green', '일간행운', 'Daily fortune'),
    uranusSquare: c('clash', 5, '⚡', 'yellow', '일간돌발', 'Daily surprise'),
    neptuneSquare: c('balance', 5, '💭', 'blue', '일간영감', 'Daily inspiration'),
    plutoTransit: c('clash', 4, '💥', 'yellow', '일간강렬', 'Daily intensity'),
    nodeReturn: c('amplify', 6, '✨', 'green', '일간인연', 'Daily connection'),
    eclipse: c('extreme', 10, '🌓', 'purple', '일간전환', 'Daily pivot'),
    mercuryRetrograde: c('clash', 5, '📱', 'yellow', '일간혼선', 'Daily confusion'),
    venusRetrograde: c('balance', 5, '💕', 'blue', '일간감정', 'Daily emotion'),
    marsRetrograde: c('clash', 4, '🛑', 'yellow', '일간지연', 'Daily delay'),
    jupiterRetrograde: c('balance', 6, '🤔', 'blue', '일간사색', 'Daily contemplation'),
    saturnRetrograde: c('clash', 4, '⏰', 'yellow', '일간제약', 'Daily limit'),
  },
};

// 트랜짓 주기 설명 (확장)
export const TRANSIT_CYCLE_INFO = {
  // 기존 주기
  saturnReturn: {
    period: '약 29년 주기',
    ages: [29, 58, 87],
    ko: '토성회귀 - 성숙/책임/구조화의 시기',
    en: 'Saturn Return - Maturity/Responsibility/Structure',
  },
  jupiterReturn: {
    period: '약 12년 주기',
    ages: [12, 24, 36, 48, 60, 72, 84],
    ko: '목성회귀 - 확장/행운/성장의 시기',
    en: 'Jupiter Return - Expansion/Fortune/Growth',
  },
  uranusSquare: {
    period: '21년/42년/63년',
    ages: [21, 42, 63],
    ko: '천왕성스퀘어 - 혁명/각성/변화의 시기',
    en: 'Uranus Square - Revolution/Awakening/Change',
  },
  neptuneSquare: {
    period: '약 41년',
    ages: [41],
    ko: '해왕성스퀘어 - 영성/환멸/재정립의 시기',
    en: 'Neptune Square - Spirituality/Disillusion/Redefine',
  },
  plutoTransit: {
    period: '개인차 있음 (12-30년 체류)',
    ages: [],
    ko: '명왕성트랜짓 - 근본변혁/죽음과재생의 시기',
    en: 'Pluto Transit - Fundamental transformation/Death-rebirth',
  },
  nodeReturn: {
    period: '약 18.6년 주기',
    ages: [18.6, 37.2, 55.8, 74.4],
    ko: '노드회귀 - 운명/카르마/인생방향의 시기',
    en: 'Node Return - Destiny/Karma/Life direction',
  },
  eclipse: {
    period: '약 6개월 주기',
    ages: [],
    ko: '일/월식 - 급격한 변화/시작과 끝의 시기',
    en: 'Eclipse - Rapid change/Beginnings and endings',
  },
  // 역행 주기 (신규)
  mercuryRetrograde: {
    period: '연 3-4회, 약 3주간',
    frequency: '약 88일마다',
    ko: '수성역행 - 소통/계약/이동의 재검토 시기',
    en: 'Mercury Retrograde - Review of communication/contracts/travel',
    effects: ['소통 오류', '계약 재검토', '이동 지연', '기기 고장', '과거 연락'],
    effectsEn: ['Communication errors', 'Contract reviews', 'Travel delays', 'Tech issues', 'Past contacts'],
  },
  venusRetrograde: {
    period: '약 18개월마다, 약 40일간',
    frequency: '약 584일마다',
    ko: '금성역행 - 관계/가치/재정의 재평가 시기',
    en: 'Venus Retrograde - Reassessment of relationships/values/finances',
    effects: ['전 연인 재회', '가치관 재정립', '재정 재검토', '자기가치 성찰'],
    effectsEn: ['Ex reunions', 'Value reassessment', 'Financial review', 'Self-worth reflection'],
  },
  marsRetrograde: {
    period: '약 2년마다, 약 2.5개월간',
    frequency: '약 780일마다',
    ko: '화성역행 - 행동/욕구/에너지의 재점검 시기',
    en: 'Mars Retrograde - Review of actions/desires/energy',
    effects: ['행동 지연', '분노 재발', '에너지 저하', '과거 갈등'],
    effectsEn: ['Action delays', 'Anger resurfacing', 'Low energy', 'Past conflicts'],
  },
  jupiterRetrograde: {
    period: '연 1회, 약 4개월간',
    frequency: '매년',
    ko: '목성역행 - 성장/확장/철학의 내면화 시기',
    en: 'Jupiter Retrograde - Internalization of growth/expansion/philosophy',
    effects: ['내적 성장', '과잉 억제', '철학적 성찰', '기회 재고'],
    effectsEn: ['Inner growth', 'Excess restraint', 'Philosophical reflection', 'Opportunity review'],
  },
  saturnRetrograde: {
    period: '연 1회, 약 4.5개월간',
    frequency: '매년',
    ko: '토성역행 - 책임/구조/제한의 재구축 시기',
    en: 'Saturn Retrograde - Reconstruction of responsibility/structure/limits',
    effects: ['책임 재검토', '구조 재정비', '과거 카르마', '기반 점검'],
    effectsEn: ['Responsibility review', 'Structure reorganize', 'Past karma', 'Foundation check'],
  },
} as const;

// 대운 주기 설명
export const LUCK_CYCLE_INFO = {
  daeun: {
    period: '10년',
    ko: '대운 - 10년 단위의 큰 운의 흐름',
    en: 'Major Luck - 10-year major fortune cycle',
  },
  saeun: {
    period: '1년',
    ko: '세운 - 1년 단위의 연간 운세',
    en: 'Annual Luck - Yearly fortune',
  },
  wolun: {
    period: '1개월',
    ko: '월운 - 월별 운세 흐름',
    en: 'Monthly Luck - Monthly fortune',
  },
  ilun: {
    period: '1일',
    ko: '일운 - 일별 운세 흐름',
    en: 'Daily Luck - Daily fortune',
  },
} as const;

// 역행 시기 참고 데이터 (2024-2025)
export const RETROGRADE_SCHEDULE = {
  2024: {
    mercury: [
      { start: '2024-04-01', end: '2024-04-25', sign: '양자리' },
      { start: '2024-08-05', end: '2024-08-28', sign: '처녀자리→사자자리' },
      { start: '2024-11-26', end: '2024-12-15', sign: '사수자리' },
    ],
    venus: [], // 2024년 금성역행 없음
    mars: [
      { start: '2024-12-06', end: '2025-02-24', sign: '사자자리→게자리' },
    ],
    jupiter: [
      { start: '2024-10-09', end: '2025-02-04', sign: '쌍둥이자리' },
    ],
    saturn: [
      { start: '2024-06-29', end: '2024-11-15', sign: '물고기자리' },
    ],
  },
  2025: {
    mercury: [
      { start: '2025-03-15', end: '2025-04-07', sign: '양자리' },
      { start: '2025-07-18', end: '2025-08-11', sign: '사자자리' },
      { start: '2025-11-09', end: '2025-11-29', sign: '사수자리' },
    ],
    venus: [
      { start: '2025-03-02', end: '2025-04-13', sign: '양자리→물고기자리' },
    ],
    mars: [], // 2025년 초까지 진행 중 (2024-12-06 시작)
    jupiter: [], // 2025년 초까지 진행 중
    saturn: [
      { start: '2025-07-13', end: '2025-11-28', sign: '물고기자리' },
    ],
  },
} as const;

// 역행 효과 해석 가이드
export const RETROGRADE_INTERPRETATION = {
  mercuryRetrograde: {
    dos: [
      '과거 프로젝트 마무리',
      '재검토와 수정 작업',
      '오래된 친구 연락',
      '백업과 데이터 정리',
    ],
    donts: [
      '새 계약 체결',
      '중요한 결정',
      '새 기기 구매',
      '장거리 여행 계획',
    ],
    sajuConnection: '수(水) 기운과 연결 - 지혜와 소통의 재정립',
  },
  venusRetrograde: {
    dos: [
      '자기 가치 성찰',
      '과거 관계 정리',
      '재정 상태 검토',
      '예술적 영감 탐구',
    ],
    donts: [
      '새 연애 시작',
      '결혼이나 약혼',
      '큰 금액 지출',
      '외모 큰 변화',
    ],
    sajuConnection: '금(金) 기운과 연결 - 가치와 관계의 재정립',
  },
  marsRetrograde: {
    dos: [
      '전략 재수립',
      '에너지 회복',
      '내면의 분노 해소',
      '과거 갈등 해결',
    ],
    donts: [
      '새 프로젝트 시작',
      '법적 분쟁',
      '위험한 활동',
      '충동적 결정',
    ],
    sajuConnection: '화(火) 기운과 연결 - 행동과 열정의 재정비',
  },
  jupiterRetrograde: {
    dos: [
      '내적 성장과 학습',
      '철학적 성찰',
      '과잉된 부분 점검',
      '신앙/신념 재검토',
    ],
    donts: [
      '과도한 확장',
      '무리한 투자',
      '법적 절차 시작',
      '과시적 행동',
    ],
    sajuConnection: '목(木) 기운과 연결 - 성장과 확장의 내면화',
  },
  saturnRetrograde: {
    dos: [
      '구조와 시스템 재정비',
      '과거 책임 정리',
      '장기 목표 재검토',
      '카르마 청산',
    ],
    donts: [
      '새 책임 수용',
      '경직된 계획 고수',
      '과도한 자기 비판',
      '권위자와 충돌',
    ],
    sajuConnection: '토(土) 기운과 연결 - 안정과 책임의 재구축',
  },
} as const;

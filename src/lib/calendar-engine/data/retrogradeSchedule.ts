// 행성 역행 일정 — 연도별 mercury/venus/mars 등 역행 구간.
// (구 destiny-matrix/data/layer4-timing-overlay 에서 이전; 순수 데이터, 타입의존 없음)

export const RETROGRADE_SCHEDULE = {
  2024: {
    mercury: [
      { start: '2024-04-01', end: '2024-04-25', sign: '양자리' },
      { start: '2024-08-05', end: '2024-08-28', sign: '처녀자리→사자자리' },
      { start: '2024-11-26', end: '2024-12-15', sign: '사수자리' },
    ],
    venus: [], // 2024년 금성역행 없음
    mars: [{ start: '2024-12-06', end: '2025-02-24', sign: '사자자리→게자리' }],
    jupiter: [{ start: '2024-10-09', end: '2025-02-04', sign: '쌍둥이자리' }],
    saturn: [{ start: '2024-06-29', end: '2024-11-15', sign: '물고기자리' }],
  },
  2025: {
    mercury: [
      { start: '2025-03-15', end: '2025-04-07', sign: '양자리' },
      { start: '2025-07-18', end: '2025-08-11', sign: '사자자리' },
      { start: '2025-11-09', end: '2025-11-29', sign: '사수자리' },
    ],
    venus: [{ start: '2025-03-02', end: '2025-04-13', sign: '양자리→물고기자리' }],
    mars: [], // 2025년 초까지 진행 중 (2024-12-06 시작)
    jupiter: [], // 2025년 초까지 진행 중
    saturn: [{ start: '2025-07-13', end: '2025-11-28', sign: '물고기자리' }],
  },
} as const

// 역행 효과 해석 가이드
const RETROGRADE_INTERPRETATION = {
  mercuryRetrograde: {
    dos: ['과거 프로젝트 마무리', '재검토와 수정 작업', '오래된 친구 연락', '백업과 데이터 정리'],
    donts: ['새 계약 체결', '중요한 결정', '새 기기 구매', '장거리 여행 계획'],
    sajuConnection: '수(水) 기운과 연결 - 지혜와 소통의 재정립',
  },
  venusRetrograde: {
    dos: ['자기 가치 성찰', '과거 관계 정리', '재정 상태 검토', '예술적 영감 탐구'],
    donts: ['새 연애 시작', '결혼이나 약혼', '큰 금액 지출', '외모 큰 변화'],
    sajuConnection: '금(金) 기운과 연결 - 가치와 관계의 재정립',
  },
  marsRetrograde: {
    dos: ['전략 재수립', '에너지 회복', '내면의 분노 해소', '과거 갈등 해결'],
    donts: ['새 프로젝트 시작', '법적 분쟁', '위험한 활동', '충동적 결정'],
    sajuConnection: '화(火) 기운과 연결 - 행동과 열정의 재정비',
  },
  jupiterRetrograde: {
    dos: ['내적 성장과 학습', '철학적 성찰', '과잉된 부분 점검', '신앙/신념 재검토'],
    donts: ['과도한 확장', '무리한 투자', '법적 절차 시작', '과시적 행동'],
    sajuConnection: '목(木) 기운과 연결 - 성장과 확장의 내면화',
  },
  saturnRetrograde: {
    dos: ['구조와 시스템 재정비', '과거 책임 정리', '장기 목표 재검토', '카르마 청산'],
    donts: ['새 책임 수용', '경직된 계획 고수', '과도한 자기 비판', '권위자와 충돌'],
    sajuConnection: '토(土) 기운과 연결 - 안정과 책임의 재구축',
  },
} as const

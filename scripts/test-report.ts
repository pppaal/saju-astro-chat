// 리포트 생성 테스트 스크립트
import { buildTimingPrompt } from '../src/lib/destiny-matrix/ai-report/prompts/timingPrompts';
import { buildThemedPrompt } from '../src/lib/destiny-matrix/ai-report/prompts/themedPrompts';
import type { TimingData } from '../src/lib/destiny-matrix/ai-report/types';

// 테스트용 타이밍 데이터
const testTimingData: TimingData = {
  seun: {
    year: 2026,
    heavenlyStem: '병',
    earthlyBranch: '오',
    element: '화',
  },
  wolun: {
    month: 1,
    heavenlyStem: '기',
    earthlyBranch: '축',
    element: '토',
  },
  iljin: {
    date: '2026-01-21',
    heavenlyStem: '계',
    earthlyBranch: '묘',
    element: '수',
  },
};

// 테스트용 프로필
const testProfile = {
  name: '홍길동',
  birthDate: '1990-05-15',
  dayMaster: '갑',
  dayMasterElement: '목',
};

// 테스트용 매트릭스 요약
const testMatrixSummary = `### 종합 점수: 78/100 (B등급)

### 주요 인사이트:
1. [strength] 창의적 사고력: 목 에너지가 강해 새로운 아이디어 발현에 유리
2. [opportunity] 성장 시기: 현재 대운과 세운의 조합이 발전을 지지
3. [caution] 건강 관리: 화 에너지 과다로 스트레스 관리 필요

### 도메인별 점수:
- personality: 82/100 (A)
- career: 78/100 (B)
- relationship: 75/100 (B)
- wealth: 70/100 (C)
- health: 72/100 (C)`;

// 타이밍 프롬프트 생성
console.log('='.repeat(80));
console.log('[DAILY TIMING REPORT PROMPT]');
console.log('='.repeat(80));

const dailyPrompt = buildTimingPrompt(
  'daily',
  'ko',
  testProfile,
  testTimingData,
  '2026-01-21',
  testMatrixSummary
);

console.log(dailyPrompt);
console.log('\n');

// 테마별 프롬프트 생성
console.log('='.repeat(80));
console.log('[CAREER THEMED REPORT PROMPT]');
console.log('='.repeat(80));

const themedPrompt = buildThemedPrompt(
  'career',
  'ko',
  { ...testProfile, sibsinDistribution: { '정관': 2, '편관': 1, '식신': 2 } },
  testTimingData,
  testMatrixSummary
);

console.log(themedPrompt);

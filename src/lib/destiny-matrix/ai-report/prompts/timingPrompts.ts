// src/lib/destiny-matrix/ai-report/prompts/timingPrompts.ts
// 타이밍 리포트용 프롬프트 생성

import type { ReportPeriod, TimingData } from '../types';

// ===========================
// 기간별 프롬프트 섹션
// ===========================

const DAILY_SECTIONS = {
  ko: `
## 작성 스타일 (필수!)
- 리스트/점수/이모지 절대 금지
- 친구한테 말하듯이 자연스럽게 글로만 서술
- 사주와 점성술을 50:50 비율로 융합 (번갈아가며 언급)
- 모든 destiny-matrix 데이터를 자연스럽게 녹여서 설명
- 문단으로 나눠서 읽기 편하게
- 1000~1200자 분량

## 필수 내용 (자연스럽게 풀어서)

오늘을 한마디로 표현하면서 시작. 사주로 보면 일진과 일간의 관계(수생목/목극토 등)를 먼저 설명하고, 점성술로 보면 오늘의 행성 배치(금성-목성 트라인 등)를 이어서 설명. 둘이 서로 어떻게 연결되는지 자연스럽게 융합.

시간대별 에너지 흐름을 설명할 때도 사주의 시진 분석과 점성술의 달 이동을 함께 언급. 오전은 어떻고 오후는 어떤지 구체적으로.

기회 포인트는 사주의 십신(식신/정관 등)과 점성술의 행성(수성/금성 등)을 연결해서 설명. 예를 들어 "식신의 창의력이 발동하는데, 수성도 순행이라 소통이 술술 풀리는 날"처럼.

주의할 점도 마찬가지로 융합. 오행 밸런스(목 과다 등)와 행성 역행이나 스퀘어를 함께 언급.

영역별로는 career/love/wealth/health를 각각 3-4문장씩, 사주+점성술 융합해서 설명.

마지막에 오늘의 핵심 메시지를 여운 있게 마무리.
`,
  en: `
## Required Analysis Sections (6 sections)

### 1. overview (Today's Summary)
- Analysis of today's daily pillar interaction with natal chart
- Overall energy tone summary (2-3 sentences)
- 3 key keywords

### 2. energy (Energy Flow)
- Energy changes by time period (morning/afternoon/evening)
- Best times and times to avoid
- Energy utilization tips

### 3. opportunities (Opportunity Points)
- 2-3 potential opportunities today
- Basis for each opportunity (daily pillar & natal chart relation)
- How to utilize

### 4. cautions (Caution Points)
- 2-3 situations to be careful about today
- Basis for each caution
- Avoidance/coping methods

### 5. domains (Domain Fortunes)
- career: Work/study fortune (2-3 sentences)
- love: Romance/relationships fortune (2-3 sentences)
- wealth: Money/wealth fortune (2-3 sentences)
- health: Health/condition fortune (2-3 sentences)

### 6. actionPlan (Today's Action Guide)
- 3 things you must do
- 2 things to avoid
- 1 core message for today
`,
};

const MONTHLY_SECTIONS = {
  ko: `
## 필수 분석 항목 (6개 섹션)

### 1. overview (이번달 총평)
- 이번달 월주의 천간/지지와 본인 명주 + 대운/세운 조합 분석
- 이번달 전체 흐름 요약 (3-4문장)
- 이번달 핵심 테마 3가지

### 2. energy (에너지 흐름)
- 주차별 에너지 변화 (1주차~4주차)
- 에너지 고점과 저점 시기
- 흐름에 맞춘 활동 계획

### 3. opportunities (기회 시기)
- 이번달 최고의 기회 주간/날짜 3개
- 각 기회의 근거 (월운 + 일진 조합)
- 기회 활용 전략

### 4. cautions (주의 시기)
- 이번달 주의해야 할 주간/날짜 2-3개
- 각 주의점의 근거
- 대비 방법

### 5. domains (영역별 월간 운세)
- career: 업무/커리어 월간 흐름 (3-4문장)
- love: 연애/관계 월간 흐름 (3-4문장)
- wealth: 금전/재물 월간 흐름 (3-4문장)
- health: 건강/활력 월간 흐름 (3-4문장)

### 6. actionPlan (이번달 실천 가이드)
- 이번달 핵심 목표 3가지
- 주차별 액션 아이템
- 월말 점검 포인트
`,
  en: `
## Required Analysis Sections (6 sections)

### 1. overview (Monthly Summary)
- Analysis of this month's pillar with natal chart + Daeun/Seun combination
- Overall monthly flow summary (3-4 sentences)
- 3 key themes for this month

### 2. energy (Energy Flow)
- Energy changes by week (Week 1-4)
- Peak and low points
- Activity planning aligned with flow

### 3. opportunities (Opportunity Timing)
- 3 best opportunity weeks/dates this month
- Basis for each (monthly + daily pillar combination)
- Strategy to utilize

### 4. cautions (Caution Timing)
- 2-3 weeks/dates to be careful this month
- Basis for each caution
- Preparation methods

### 5. domains (Monthly Domain Fortunes)
- career: Work/career monthly flow (3-4 sentences)
- love: Romance/relationship monthly flow (3-4 sentences)
- wealth: Money/wealth monthly flow (3-4 sentences)
- health: Health/vitality monthly flow (3-4 sentences)

### 6. actionPlan (Monthly Action Guide)
- 3 key goals for this month
- Weekly action items
- Month-end check points
`,
};

const YEARLY_SECTIONS = {
  ko: `
## 필수 분석 항목 (6개 섹션)

### 1. overview (올해 총평)
- 올해 세운의 천간/지지와 본인 명주 + 대운 조합 심층 분석
- 올해 전체 흐름과 테마 요약 (4-5문장)
- 올해의 핵심 키워드 5가지
- 작년 대비 변화 포인트

### 2. energy (연간 에너지 흐름)
- 분기별 에너지 변화 (1분기~4분기)
- 상반기 vs 하반기 특징
- 에너지 전환점 (월 단위)
- 전체 흐름에 맞춘 연간 전략

### 3. opportunities (기회 시기)
- 올해 황금 기회 시기 3-5개 (월 단위)
- 각 기회의 근거 (세운 + 월운 조합)
- 기회별 추천 행동
- 최대 효과를 위한 준비 사항

### 4. cautions (주의 시기)
- 올해 주의해야 할 시기 3-4개 (월 단위)
- 각 주의 시기의 근거
- 위험 요소별 대비 전략
- 위기를 기회로 바꾸는 방법

### 5. domains (영역별 연간 운세)
- career: 커리어/사업 연간 흐름 (5-6문장, 분기별 포인트 포함)
- love: 연애/결혼 연간 흐름 (5-6문장, 중요 시기 포함)
- wealth: 재물/투자 연간 흐름 (5-6문장, 재테크 조언 포함)
- health: 건강/웰빙 연간 흐름 (5-6문장, 계절별 주의점 포함)

### 6. actionPlan (연간 실천 가이드)
- 올해 핵심 목표 5가지
- 분기별 마일스톤
- 상반기/하반기 중점 사항
- 연말 성찰 포인트
- 내년을 위한 준비 사항
`,
  en: `
## Required Analysis Sections (6 sections)

### 1. overview (Yearly Summary)
- Deep analysis of this year's Seun with natal chart + Daeun combination
- Overall yearly flow and theme summary (4-5 sentences)
- 5 key keywords for this year
- Changes compared to last year

### 2. energy (Annual Energy Flow)
- Quarterly energy changes (Q1-Q4)
- First half vs second half characteristics
- Energy transition points (monthly)
- Annual strategy aligned with overall flow

### 3. opportunities (Opportunity Timing)
- 3-5 golden opportunity periods this year (monthly)
- Basis for each (Seun + monthly pillar combination)
- Recommended actions per opportunity
- Preparation for maximum effect

### 4. cautions (Caution Timing)
- 3-4 periods to be careful this year (monthly)
- Basis for each caution period
- Preparation strategy by risk factor
- How to turn crisis into opportunity

### 5. domains (Annual Domain Fortunes)
- career: Career/business annual flow (5-6 sentences, quarterly points)
- love: Romance/marriage annual flow (5-6 sentences, key timing)
- wealth: Wealth/investment annual flow (5-6 sentences, financial advice)
- health: Health/wellness annual flow (5-6 sentences, seasonal notes)

### 6. actionPlan (Annual Action Guide)
- 5 key goals for this year
- Quarterly milestones
- First/second half focus areas
- Year-end reflection points
- Preparation for next year
`,
};

// ===========================
// 타이밍 데이터 포맷터
// ===========================

function formatTimingData(timing: TimingData, lang: 'ko' | 'en'): string {
  const lines: string[] = [];

  if (lang === 'ko') {
    lines.push('## 현재 운세 주기 데이터\n');

    if (timing.daeun) {
      lines.push(`### 대운 (10년 주기)`);
      lines.push(`- 천간: ${timing.daeun.heavenlyStem}`);
      lines.push(`- 지지: ${timing.daeun.earthlyBranch}`);
      lines.push(`- 오행: ${timing.daeun.element}`);
      lines.push(`- 기간: ${timing.daeun.startAge}세 ~ ${timing.daeun.endAge}세`);
      lines.push(`- 현재: ${timing.daeun.isCurrent ? '진행 중' : '아님'}\n`);
    }

    if (timing.seun) {
      lines.push(`### 세운 (올해 연운)`);
      lines.push(`- 연도: ${timing.seun.year}년`);
      lines.push(`- 천간: ${timing.seun.heavenlyStem}`);
      lines.push(`- 지지: ${timing.seun.earthlyBranch}`);
      lines.push(`- 오행: ${timing.seun.element}\n`);
    }

    if (timing.wolun) {
      lines.push(`### 월운 (이번달)`);
      lines.push(`- 월: ${timing.wolun.month}월`);
      lines.push(`- 천간: ${timing.wolun.heavenlyStem}`);
      lines.push(`- 지지: ${timing.wolun.earthlyBranch}`);
      lines.push(`- 오행: ${timing.wolun.element}\n`);
    }

    if (timing.iljin) {
      lines.push(`### 일진 (오늘)`);
      lines.push(`- 날짜: ${timing.iljin.date}`);
      lines.push(`- 천간: ${timing.iljin.heavenlyStem}`);
      lines.push(`- 지지: ${timing.iljin.earthlyBranch}`);
      lines.push(`- 오행: ${timing.iljin.element}\n`);
    }
  } else {
    lines.push('## Current Fortune Cycle Data\n');

    if (timing.daeun) {
      lines.push(`### Daeun (10-Year Cycle)`);
      lines.push(`- Heavenly Stem: ${timing.daeun.heavenlyStem}`);
      lines.push(`- Earthly Branch: ${timing.daeun.earthlyBranch}`);
      lines.push(`- Element: ${timing.daeun.element}`);
      lines.push(`- Period: Age ${timing.daeun.startAge} ~ ${timing.daeun.endAge}`);
      lines.push(`- Current: ${timing.daeun.isCurrent ? 'Active' : 'No'}\n`);
    }

    if (timing.seun) {
      lines.push(`### Seun (Annual Fortune)`);
      lines.push(`- Year: ${timing.seun.year}`);
      lines.push(`- Heavenly Stem: ${timing.seun.heavenlyStem}`);
      lines.push(`- Earthly Branch: ${timing.seun.earthlyBranch}`);
      lines.push(`- Element: ${timing.seun.element}\n`);
    }

    if (timing.wolun) {
      lines.push(`### Wolun (Monthly Fortune)`);
      lines.push(`- Month: ${timing.wolun.month}`);
      lines.push(`- Heavenly Stem: ${timing.wolun.heavenlyStem}`);
      lines.push(`- Earthly Branch: ${timing.wolun.earthlyBranch}`);
      lines.push(`- Element: ${timing.wolun.element}\n`);
    }

    if (timing.iljin) {
      lines.push(`### Iljin (Daily Fortune)`);
      lines.push(`- Date: ${timing.iljin.date}`);
      lines.push(`- Heavenly Stem: ${timing.iljin.heavenlyStem}`);
      lines.push(`- Earthly Branch: ${timing.iljin.earthlyBranch}`);
      lines.push(`- Element: ${timing.iljin.element}\n`);
    }
  }

  return lines.join('\n');
}

// ===========================
// 메인 프롬프트 빌더
// ===========================

export function buildTimingPrompt(
  period: ReportPeriod,
  lang: 'ko' | 'en',
  profileData: {
    name?: string;
    birthDate?: string;
    dayMaster: string;
    dayMasterElement: string;
  },
  timingData: TimingData,
  targetDate: string,
  matrixSummary: string
): string {
  const isKo = lang === 'ko';

  // 기간별 섹션 선택
  const sections = period === 'daily'
    ? DAILY_SECTIONS[lang]
    : period === 'monthly'
      ? MONTHLY_SECTIONS[lang]
      : YEARLY_SECTIONS[lang];

  // 기간 라벨
  const periodLabel = {
    daily: isKo ? '오늘 운세' : "Today's Fortune",
    monthly: isKo ? '이번달 운세' : 'Monthly Fortune',
    yearly: isKo ? '올해 운세' : 'Yearly Fortune',
    comprehensive: isKo ? '종합 리포트' : 'Comprehensive Report',
  }[period];

  const prompt = isKo
    ? `당신은 동양 사주명리학과 서양 점성술을 융합한 전문 운세 상담사입니다.
아래 데이터를 기반으로 ${periodLabel} 분석 리포트를 작성하세요.

═══════════════════════════════════════════════════════════════
[${periodLabel.toUpperCase()} PREMIUM REPORT]
분석 기준일: ${targetDate}
═══════════════════════════════════════════════════════════════

## 프로필
- 이름: ${profileData.name || '미입력'}
- 생년월일: ${profileData.birthDate || '미입력'}
- 일간(Day Master): ${profileData.dayMaster} (${profileData.dayMasterElement})

${formatTimingData(timingData, lang)}

## 매트릭스 분석 요약
${matrixSummary}

═══════════════════════════════════════════════════════════════
${sections}
═══════════════════════════════════════════════════════════════

## 작성 규칙
1. 모든 분석은 위 데이터(일간, 대운, 세운, 월운, 일진)를 근거로 작성
2. 근거 없는 추측이나 일반론 금지
3. 따뜻하고 격려하는 톤, 실용적인 조언 포함
4. 추상적 표현 대신 구체적인 행동 가이드 제시
5. 의료/법률/금융 전문 조언은 피하고 일반적 가이드만 제공

## 응답 형식
반드시 아래 JSON 형식으로만 응답하세요:
{
  "overview": "...",
  "energy": "...",
  "opportunities": "...",
  "cautions": "...",
  "domains": {
    "career": "...",
    "love": "...",
    "wealth": "...",
    "health": "..."
  },
  "actionPlan": "...",
  "luckyElements": "행운의 색상, 방향, 숫자 등 (선택사항)"
}`
    : `You are an expert fortune consultant combining Eastern Saju and Western Astrology.
Based on the data below, write a ${periodLabel} analysis report.

═══════════════════════════════════════════════════════════════
[${periodLabel.toUpperCase()} PREMIUM REPORT]
Analysis Date: ${targetDate}
═══════════════════════════════════════════════════════════════

## Profile
- Name: ${profileData.name || 'Not provided'}
- Birth Date: ${profileData.birthDate || 'Not provided'}
- Day Master: ${profileData.dayMaster} (${profileData.dayMasterElement})

${formatTimingData(timingData, lang)}

## Matrix Analysis Summary
${matrixSummary}

═══════════════════════════════════════════════════════════════
${sections}
═══════════════════════════════════════════════════════════════

## Writing Rules
1. All analysis must be based on the above data (Day Master, Daeun, Seun, Wolun, Iljin)
2. No baseless speculation or generalizations
3. Warm, encouraging tone with practical advice
4. Provide specific action guides instead of abstract expressions
5. Avoid medical/legal/financial professional advice

## Response Format
Respond ONLY in this JSON format:
{
  "overview": "...",
  "energy": "...",
  "opportunities": "...",
  "cautions": "...",
  "domains": {
    "career": "...",
    "love": "...",
    "wealth": "...",
    "health": "..."
  },
  "actionPlan": "...",
  "luckyElements": "Lucky colors, directions, numbers, etc. (optional)"
}`;

  return prompt;
}

// ===========================
// 점수 계산 프롬프트
// ===========================

export function buildTimingScorePrompt(
  period: ReportPeriod,
  lang: 'ko' | 'en',
  timingData: TimingData,
  dayMasterElement: string
): string {
  const isKo = lang === 'ko';

  return isKo
    ? `다음 데이터를 기반으로 ${period === 'daily' ? '오늘' : period === 'monthly' ? '이번달' : '올해'}의 운세 점수를 계산하세요.

일간 오행: ${dayMasterElement}
${formatTimingData(timingData, lang)}

각 영역별 점수를 0-100 사이로 계산하세요:
- overall: 전체 운세 점수
- career: 커리어/사업 점수
- love: 연애/관계 점수
- wealth: 재물/금전 점수
- health: 건강/활력 점수

JSON 형식으로 응답:
{ "overall": 75, "career": 80, "love": 70, "wealth": 65, "health": 85 }`
    : `Based on the following data, calculate the fortune scores for ${period === 'daily' ? 'today' : period === 'monthly' ? 'this month' : 'this year'}.

Day Master Element: ${dayMasterElement}
${formatTimingData(timingData, lang)}

Calculate scores between 0-100 for each domain:
- overall: Overall fortune score
- career: Career/business score
- love: Romance/relationship score
- wealth: Wealth/money score
- health: Health/vitality score

Respond in JSON format:
{ "overall": 75, "career": 80, "love": 70, "wealth": 65, "health": 85 }`;
}

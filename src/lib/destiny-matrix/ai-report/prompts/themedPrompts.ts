// src/lib/destiny-matrix/ai-report/prompts/themedPrompts.ts
// 테마별 심화 리포트용 프롬프트 생성

import type { ReportTheme, TimingData } from '../types';

// ===========================
// 테마별 프롬프트 섹션
// ===========================

const LOVE_SECTIONS = {
  ko: `
## 작성 스타일 (필수!)
- 리스트/점수/이모지 절대 금지
- 친구한테 연애 상담해주듯이 편하게 글로만
- 사주와 점성술을 50:50으로 융합 (번갈아가며)
- 모든 destiny-matrix 데이터 자연스럽게 녹이기
- 문단 나눠서 읽기 편하게
- 1500~1800자 분량

## 필수 내용 (자연스럽게 풀어서)

당신의 연애 DNA를 분석해볼게. 사주로 보면 관성(정관/편관)과 재성이 어떻게 배치됐는지, 점성술로는 금성과 7하우스가 어떤지 함께 봐야 해. 이 둘이 만나서 어떤 연애 스타일이 나오는지 설명.

끌리는 이성 타입도 사주의 일간과 점성술의 하강궁을 연결해서. 예를 들어 "사주에선 금 에너지가 부족해서 결단력 있는 사람한테 끌리는데, 하강궁이 사수자리라 자유롭고 모험적인 사람을 만나게 될 거야" 이런 식으로.

현재 연애운은 대운/세운과 트랜싯 행성을 함께 분석. 올해 어느 달이 좋은지, 도화살이나 홍염살 같은 신살도 언급하면서 금성-화성 배치도 함께.

궁합 얘기할 때는 일간 궁합과 별자리 궁합을 융합해서. 잘 맞는 조합과 피해야 할 조합 모두.

이상형 분석은 배우자궁(일지/7하우스)을 중심으로 구체적으로. 어떤 사람을 어디서 만날 가능성이 높은지.

현재 상황별 조언(연애중/솔로/문제있음)도 사주+점성술 융합해서.

마지막에 실천 가이드와 핵심 메시지로 마무리.
`,
  en: `
## Required Analysis Sections (8 sections)

### 1. deepAnalysis (Love Deep Analysis)
- Romance tendencies based on Day Master and Officer/Wealth star relationships
- Emotional expression style from Sun/Venus/Moon placements
- 7th/5th house analysis
- 3+ East-West cross insights

### 2. patterns (Romance Patterns)
- Attractive partner types (appearance, personality, vibe)
- Early dating vs stable relationship behavior patterns
- Breakup/conflict response patterns
- Recurring relationship issues and solutions

### 3. timing (Romance Timing)
- Current romance fortune status (Daeun/Seun based)
- Best meeting times this year (monthly)
- Times to be careful
- Marriage timing analysis (if applicable)

### 4. compatibility (Compatibility Analysis)
- Day Master/zodiac/star sign combinations that match well
- Combinations to avoid
- What you need from a partner
- What you need to provide in relationships

### 5. idealPartner (Ideal Partner Analysis)
- Partner trait predictions (element, career type, personality)
- High probability meeting places/situations
- Relationship development scenarios

### 6. currentAdvice (Current Advice)
- If in a relationship: relationship growth tips
- If single: meeting preparation guide
- If having issues: resolution direction

### 7. recommendations (Recommendations)
- 5 actions to boost romance luck
- 3 actions to avoid
- Self-improvement points

### 8. actionPlan (Action Plan)
- 3 romance missions for this month
- Long-term relationship goals
- Core message
`,
};

const CAREER_SECTIONS = {
  ko: `
## 필수 분석 항목 (8개 섹션)

### 1. deepAnalysis (커리어 심층 분석)
- 일간 오행과 관성(官星)/식상(食傷) 관계로 본 직업 적성
- MC/10하우스/6하우스 분석
- 성공 DNA와 잠재력
- 동양+서양 교차 인사이트 3개 이상

### 2. patterns (성공 패턴)
- 업무 스타일 (리더형/실무형/창의형/분석형)
- 강점이 발휘되는 환경
- 약점이 드러나는 상황
- 성장 곡선 예측

### 3. timing (커리어 타이밍)
- 현재 직업운 상태 (대운/세운 기준)
- 올해 승진/이직/창업 적기
- 주의해야 할 시기
- 중장기 커리어 전환점

### 4. strategy (성공 전략)
- 직장인 vs 사업가 적합도
- 추천 업종/직종 5개
- 협업 스타일과 팀 역할
- 리더십 스타일

### 5. wealthConnection (재물 연결)
- 커리어로 인한 재물 흐름
- 수입 증가 시기
- 투자 vs 저축 성향
- 부업/사이드 프로젝트 추천

### 6. challenges (도전과 극복)
- 커리어에서 만날 장애물
- 경쟁자/적 유형
- 극복 전략
- 실패를 성공으로 바꾸는 법

### 7. recommendations (추천 사항)
- 커리어 성장 행동 5가지
- 피해야 할 실수 3가지
- 스킬 개발 방향

### 8. actionPlan (실천 가이드)
- 이번 분기 커리어 목표
- 1년/3년/5년 로드맵
- 핵심 메시지
`,
  en: `
## Required Analysis Sections (8 sections)

### 1. deepAnalysis (Career Deep Analysis)
- Career aptitude from Day Master and Officer/Output star relationships
- MC/10th house/6th house analysis
- Success DNA and potential
- 3+ East-West cross insights

### 2. patterns (Success Patterns)
- Work style (leader/executor/creative/analyst type)
- Environments where strengths shine
- Situations where weaknesses appear
- Growth curve prediction

### 3. timing (Career Timing)
- Current career fortune status (Daeun/Seun based)
- Best timing for promotion/job change/startup this year
- Times to be careful
- Mid-long term career turning points

### 4. strategy (Success Strategy)
- Employee vs entrepreneur suitability
- 5 recommended industries/positions
- Collaboration style and team role
- Leadership style

### 5. wealthConnection (Wealth Connection)
- Wealth flow from career
- Income increase timing
- Investment vs savings tendency
- Side business/project recommendations

### 6. challenges (Challenges and Overcoming)
- Career obstacles to expect
- Competitor/rival types
- Overcoming strategies
- How to turn failure into success

### 7. recommendations (Recommendations)
- 5 career growth actions
- 3 mistakes to avoid
- Skill development direction

### 8. actionPlan (Action Plan)
- This quarter's career goals
- 1/3/5 year roadmap
- Core message
`,
};

const WEALTH_SECTIONS = {
  ko: `
## 필수 분석 항목 (8개 섹션)

### 1. deepAnalysis (재물 심층 분석)
- 일간 오행과 재성(財星) 관계로 본 재물 성향
- 2하우스/8하우스/목성 배치 분석
- 타고난 재복과 한계
- 동양+서양 교차 인사이트 3개 이상

### 2. patterns (금전 패턴)
- 돈을 버는 방식 (노동형/사업형/투자형/상속형)
- 소비 패턴과 습관
- 저축/투자 성향
- 금전적 결정 스타일

### 3. timing (재물 타이밍)
- 현재 재물운 상태 (대운/세운 기준)
- 올해 금전 고점/저점 시기
- 투자 적기
- 큰 지출 주의 시기

### 4. strategy (재테크 전략)
- 적합한 투자 유형 (주식/부동산/채권/사업)
- 리스크 허용도
- 단기 vs 장기 투자 성향
- 추천 포트폴리오 방향

### 5. incomeStreams (수입원 분석)
- 주 수입원 최적화 방법
- 부수입 가능성
- 의외의 재물 채널
- 수입 다각화 전략

### 6. risks (재물 리스크)
- 금전적 위험 요소
- 사기/손실 주의 시기
- 보험/안전장치 필요성
- 재물 누수 포인트

### 7. recommendations (추천 사항)
- 재물운 상승 행동 5가지
- 피해야 할 금전 행동 3가지
- 재무 습관 개선 포인트

### 8. actionPlan (실천 가이드)
- 이번 달 재무 미션
- 올해 재무 목표
- 핵심 메시지
`,
  en: `
## Required Analysis Sections (8 sections)

### 1. deepAnalysis (Wealth Deep Analysis)
- Wealth tendencies from Day Master and Wealth star relationships
- 2nd house/8th house/Jupiter placement analysis
- Innate wealth fortune and limits
- 3+ East-West cross insights

### 2. patterns (Money Patterns)
- Money-making style (labor/business/investment/inheritance type)
- Spending patterns and habits
- Savings/investment tendencies
- Financial decision style

### 3. timing (Wealth Timing)
- Current wealth fortune status (Daeun/Seun based)
- Financial peak/low points this year
- Investment timing
- Major expense caution periods

### 4. strategy (Financial Strategy)
- Suitable investment types (stocks/real estate/bonds/business)
- Risk tolerance
- Short vs long term investment tendency
- Recommended portfolio direction

### 5. incomeStreams (Income Stream Analysis)
- Main income optimization methods
- Side income possibilities
- Unexpected wealth channels
- Income diversification strategy

### 6. risks (Wealth Risks)
- Financial risk factors
- Fraud/loss caution periods
- Insurance/safety net needs
- Wealth leakage points

### 7. recommendations (Recommendations)
- 5 wealth-boosting actions
- 3 financial actions to avoid
- Financial habit improvement points

### 8. actionPlan (Action Plan)
- This month's financial mission
- This year's financial goals
- Core message
`,
};

const HEALTH_SECTIONS = {
  ko: `
## 필수 분석 항목 (8개 섹션)

### 1. deepAnalysis (건강 심층 분석)
- 오행 균형으로 본 체질과 건강 성향
- 6하우스/12하우스 분석
- 타고난 건강 강점과 취약점
- 동양+서양 교차 인사이트 3개 이상

### 2. patterns (건강 패턴)
- 에너지 리듬 (아침형/저녁형, 활동적/차분)
- 스트레스 반응 패턴
- 회복력과 면역력 특성
- 건강 무시 경향과 위험 신호

### 3. timing (건강 타이밍)
- 현재 건강운 상태 (대운/세운 기준)
- 올해 건강 주의 시기
- 활력 고점 시기
- 검진/관리 추천 시기

### 4. prevention (예방 가이드)
- 오행별 취약 장기/시스템
- 계절별 건강 관리 포인트
- 나이대별 주의사항
- 가족력 관련 주의점

### 5. lifestyle (생활 습관)
- 추천 운동 유형과 시간
- 식이 조언 (오행 균형 기반)
- 수면 최적화 방법
- 스트레스 관리법

### 6. mentalHealth (정신 건강)
- 감정 패턴과 정서 안정
- 번아웃 위험도
- 마음 회복 방법
- 명상/휴식 추천

### 7. recommendations (추천 사항)
- 건강 유지 행동 5가지
- 피해야 할 습관 3가지
- 보충제/영양 방향 (일반적 가이드)

### 8. actionPlan (실천 가이드)
- 이번 주 건강 미션
- 분기별 건강 목표
- 핵심 메시지

⚠️ 의료 진단이나 처방은 전문 의료진과 상담하세요.
`,
  en: `
## Required Analysis Sections (8 sections)

### 1. deepAnalysis (Health Deep Analysis)
- Constitution and health tendencies from Five Elements balance
- 6th house/12th house analysis
- Innate health strengths and vulnerabilities
- 3+ East-West cross insights

### 2. patterns (Health Patterns)
- Energy rhythm (morning/evening person, active/calm)
- Stress response patterns
- Recovery and immunity characteristics
- Health neglect tendencies and warning signs

### 3. timing (Health Timing)
- Current health fortune status (Daeun/Seun based)
- Health caution periods this year
- Peak vitality periods
- Recommended checkup/management timing

### 4. prevention (Prevention Guide)
- Vulnerable organs/systems by element
- Seasonal health management points
- Age-related cautions
- Family history considerations

### 5. lifestyle (Lifestyle Habits)
- Recommended exercise types and timing
- Dietary advice (Five Elements balance based)
- Sleep optimization methods
- Stress management techniques

### 6. mentalHealth (Mental Health)
- Emotional patterns and stability
- Burnout risk level
- Mental recovery methods
- Meditation/rest recommendations

### 7. recommendations (Recommendations)
- 5 health maintenance actions
- 3 habits to avoid
- Supplement/nutrition direction (general guide)

### 8. actionPlan (Action Plan)
- This week's health mission
- Quarterly health goals
- Core message

⚠️ Consult healthcare professionals for medical diagnosis or prescriptions.
`,
};

const FAMILY_SECTIONS = {
  ko: `
## 필수 분석 항목 (8개 섹션)

### 1. deepAnalysis (가족 관계 심층 분석)
- 일간과 인성(印星)/비겁(比劫) 관계로 본 가족 역학
- 4하우스/10하우스 분석
- 가족 내 역할과 위치
- 동양+서양 교차 인사이트 3개 이상

### 2. patterns (관계 패턴)
- 부모와의 관계 패턴
- 형제자매와의 관계 패턴
- 자녀 관계 (있는 경우 또는 예측)
- 세대 간 반복되는 패턴

### 3. timing (가족 타이밍)
- 현재 가족운 상태 (대운/세운 기준)
- 화합이 잘 되는 시기
- 갈등 주의 시기
- 중요한 가족 이벤트 시기

### 4. dynamics (가족 역학)
- 가족 내 에너지 균형
- 갈등 원인과 해소법
- 각 가족 구성원과의 궁합
- 화합 포인트

### 5. communication (소통 방법)
- 가족별 효과적 소통법
- 피해야 할 말과 행동
- 오해 해소 방법
- 사랑 표현 방식

### 6. legacy (가업/유산)
- 가족으로부터 받는 것
- 가족에게 줄 수 있는 것
- 세대 간 연결고리
- 가족 전통 의미

### 7. recommendations (추천 사항)
- 가족 화합 행동 5가지
- 피해야 할 행동 3가지
- 관계 개선 포인트

### 8. actionPlan (실천 가이드)
- 이번 달 가족 미션
- 장기적 가족 관계 목표
- 핵심 메시지
`,
  en: `
## Required Analysis Sections (8 sections)

### 1. deepAnalysis (Family Relationship Deep Analysis)
- Family dynamics from Day Master and Resource/Companion star relationships
- 4th house/10th house analysis
- Role and position within family
- 3+ East-West cross insights

### 2. patterns (Relationship Patterns)
- Relationship patterns with parents
- Relationship patterns with siblings
- Child relationships (if applicable or predicted)
- Generational repeating patterns

### 3. timing (Family Timing)
- Current family fortune status (Daeun/Seun based)
- Harmonious periods
- Conflict caution periods
- Important family event timing

### 4. dynamics (Family Dynamics)
- Energy balance within family
- Conflict causes and resolutions
- Compatibility with each family member
- Harmony points

### 5. communication (Communication Methods)
- Effective communication by family member
- Words and actions to avoid
- Misunderstanding resolution methods
- Love expression styles

### 6. legacy (Family Legacy)
- What you receive from family
- What you can give to family
- Generational connections
- Meaning of family traditions

### 7. recommendations (Recommendations)
- 5 family harmony actions
- 3 actions to avoid
- Relationship improvement points

### 8. actionPlan (Action Plan)
- This month's family mission
- Long-term family relationship goals
- Core message
`,
};

// ===========================
// 테마 섹션 매퍼
// ===========================

const THEME_SECTIONS: Record<ReportTheme, { ko: string; en: string }> = {
  love: LOVE_SECTIONS,
  career: CAREER_SECTIONS,
  wealth: WEALTH_SECTIONS,
  health: HEALTH_SECTIONS,
  family: FAMILY_SECTIONS,
};

// ===========================
// 테마 라벨
// ===========================

const THEME_LABELS: Record<ReportTheme, { ko: string; en: string }> = {
  love: { ko: '사랑 & 연애 심층 분석', en: 'Love & Romance Deep Analysis' },
  career: { ko: '커리어 & 직업 심층 분석', en: 'Career & Work Deep Analysis' },
  wealth: { ko: '재물 & 금전 심층 분석', en: 'Wealth & Money Deep Analysis' },
  health: { ko: '건강 & 웰빙 심층 분석', en: 'Health & Wellness Deep Analysis' },
  family: { ko: '가족 & 관계 심층 분석', en: 'Family & Relationships Deep Analysis' },
};

// ===========================
// 메인 프롬프트 빌더
// ===========================

export function buildThemedPrompt(
  theme: ReportTheme,
  lang: 'ko' | 'en',
  profileData: {
    name?: string;
    birthDate?: string;
    dayMaster: string;
    dayMasterElement: string;
    sibsinDistribution?: Record<string, number>;
  },
  timingData: TimingData,
  matrixSummary: string,
  astroSummary?: string
): string {
  const isKo = lang === 'ko';
  const sections = THEME_SECTIONS[theme][lang];
  const themeLabel = THEME_LABELS[theme][lang];

  // 십신 분포 포맷
  const sibsinText = profileData.sibsinDistribution
    ? Object.entries(profileData.sibsinDistribution)
        .map(([k, v]) => `${k}(${v})`)
        .join(', ')
    : isKo ? '없음' : 'None';

  const prompt = isKo
    ? `당신은 동양 사주명리학과 서양 점성술을 융합한 전문 운세 상담사입니다.
아래 데이터를 기반으로 ${themeLabel} 리포트를 작성하세요.

═══════════════════════════════════════════════════════════════
[${themeLabel.toUpperCase()}]
═══════════════════════════════════════════════════════════════

## 프로필
- 이름: ${profileData.name || '미입력'}
- 생년월일: ${profileData.birthDate || '미입력'}
- 일간(Day Master): ${profileData.dayMaster} (${profileData.dayMasterElement})
- 십신 분포: ${sibsinText}

## 현재 운세 주기
${timingData.daeun ? `- 대운: ${timingData.daeun.heavenlyStem}${timingData.daeun.earthlyBranch} (${timingData.daeun.element})` : ''}
${timingData.seun ? `- 세운: ${timingData.seun.year}년 ${timingData.seun.heavenlyStem}${timingData.seun.earthlyBranch} (${timingData.seun.element})` : ''}

## 매트릭스 분석 요약
${matrixSummary}

${astroSummary ? `## 점성술 분석 요약\n${astroSummary}` : ''}

═══════════════════════════════════════════════════════════════
${sections}
═══════════════════════════════════════════════════════════════

## 작성 규칙
1. 모든 분석은 위 데이터를 근거로 작성 (근거 명시)
2. 추상적 표현 대신 구체적이고 실용적인 조언 제시
3. 따뜻하고 격려하는 톤 유지
4. 동양과 서양 데이터를 "교차 융합"하여 분석
5. 운명론적 단정 피하고 "경향", "가능성" 표현 사용

## 응답 형식
반드시 아래 JSON 형식으로만 응답하세요:
{
  "deepAnalysis": "...",
  "patterns": "...",
  "timing": "...",
  ${theme === 'love' ? '"compatibility": "...",' : ''}
  ${theme === 'career' || theme === 'wealth' ? '"strategy": "...",' : ''}
  ${theme === 'health' ? '"prevention": "...",' : ''}
  ${theme === 'family' ? '"dynamics": "...",' : ''}
  "recommendations": ["...", "...", "...", "...", "..."],
  "actionPlan": "..."
}`
    : `You are an expert fortune consultant combining Eastern Saju and Western Astrology.
Based on the data below, write a ${themeLabel} report.

═══════════════════════════════════════════════════════════════
[${themeLabel.toUpperCase()}]
═══════════════════════════════════════════════════════════════

## Profile
- Name: ${profileData.name || 'Not provided'}
- Birth Date: ${profileData.birthDate || 'Not provided'}
- Day Master: ${profileData.dayMaster} (${profileData.dayMasterElement})
- Sibsin Distribution: ${sibsinText}

## Current Fortune Cycle
${timingData.daeun ? `- Daeun: ${timingData.daeun.heavenlyStem}${timingData.daeun.earthlyBranch} (${timingData.daeun.element})` : ''}
${timingData.seun ? `- Seun: ${timingData.seun.year} ${timingData.seun.heavenlyStem}${timingData.seun.earthlyBranch} (${timingData.seun.element})` : ''}

## Matrix Analysis Summary
${matrixSummary}

${astroSummary ? `## Astrology Analysis Summary\n${astroSummary}` : ''}

═══════════════════════════════════════════════════════════════
${sections}
═══════════════════════════════════════════════════════════════

## Writing Rules
1. All analysis must cite the above data as basis
2. Provide specific and practical advice instead of abstract expressions
3. Maintain warm and encouraging tone
4. Analyze by "cross-fusing" Eastern and Western data
5. Avoid deterministic statements, use "tendency", "possibility" expressions

## Response Format
Respond ONLY in this JSON format:
{
  "deepAnalysis": "...",
  "patterns": "...",
  "timing": "...",
  ${theme === 'love' ? '"compatibility": "...",' : ''}
  ${theme === 'career' || theme === 'wealth' ? '"strategy": "...",' : ''}
  ${theme === 'health' ? '"prevention": "...",' : ''}
  ${theme === 'family' ? '"dynamics": "...",' : ''}
  "recommendations": ["...", "...", "...", "...", "..."],
  "actionPlan": "..."
}`;

  return prompt;
}

// ===========================
// 테마별 점수 프롬프트
// ===========================

export function buildThemedScorePrompt(
  theme: ReportTheme,
  lang: 'ko' | 'en',
  dayMasterElement: string,
  sibsinDistribution?: Record<string, number>
): string {
  const isKo = lang === 'ko';
  const themeLabel = THEME_LABELS[theme][lang];

  return isKo
    ? `다음 데이터를 기반으로 ${themeLabel} 점수를 계산하세요.

일간 오행: ${dayMasterElement}
십신 분포: ${sibsinDistribution ? JSON.stringify(sibsinDistribution) : '없음'}

점수를 0-100 사이로 계산하세요:
- overall: 전체 ${themeLabel} 점수
- potential: 잠재력 점수
- timing: 현재 타이밍 점수
- compatibility: 조화도 점수

JSON 형식으로 응답:
{ "overall": 75, "potential": 80, "timing": 70, "compatibility": 65 }`
    : `Based on the following data, calculate the ${themeLabel} scores.

Day Master Element: ${dayMasterElement}
Sibsin Distribution: ${sibsinDistribution ? JSON.stringify(sibsinDistribution) : 'None'}

Calculate scores between 0-100:
- overall: Overall ${themeLabel} score
- potential: Potential score
- timing: Current timing score
- compatibility: Harmony score

Respond in JSON format:
{ "overall": 75, "potential": 80, "timing": 70, "compatibility": 65 }`;
}

// src/lib/destiny-matrix/ai-report/prompts/themedPrompts.ts
// 테마별 심화 리포트용 프롬프트 생성

import type { ReportTheme, TimingData } from '../types'

// ===========================
// 테마별 프롬프트 섹션
// ===========================

const LOVE_SECTIONS = {
  ko: `
## 작성 스타일 (필수!)
- 리스트/점수/이모지 절대 금지
- 친구한테 연애 상담해주듯이 편하게 글로만
- **교차 분석 핵심**: 사주와 점성술이 같은 연애 특징을 다른 방식으로 확인할 때 그게 진실
- 사주와 점성술을 50:50으로 융합 (번갈아가며)
- 모든 destiny-matrix 10개 레이어 데이터 자연스럽게 녹이기
- **마음을 관통하는 깊이**: 연애 패턴의 본질, 상처, 갈망까지 파고들기
- 문단 나눠서 읽기 편하게
- **8000~10000자 분량** (연애의 모든 측면을 심층 분석)

## 교차 분석 예시
"네 연애 스타일을 보면, 사주로는 정관이 강해서 진지하고 안정적인 관계를 원해.
점성술로도 금성이 황소자리라 천천히 깊어지는 연애를 선호하지.
이렇게 둘 다 안정 지향이라고 하니 번개 같은 사랑보다는 오래 알고 사귀는 게 네 스타일이야."

"끌리는 타입은, 사주에서 금 기운이 부족해서 결단력 있는 사람한테 끌리는데,
점성술로도 하강궁이 사수자리라 자유롭고 모험적인 사람을 만나게 돼.
둘 다 정반대 에너지를 말하니 나랑 다른 사람한테 끌리는 게 맞아."

## 필수 내용 (자연스럽게 풀어서)

연애 DNA를 분석해볼게. 사주로 보면 관성(정관/편관)과 재성이 어떻게 배치됐는지, 점성술로는 금성과 7하우스가 어떤지 함께 봐야 해. **이 둘이 만나서 어떤 연애 스타일이 교차 확인되는지 명확히 설명**.

끌리는 이성 타입도 사주의 일간과 점성술의 하강궁을 연결해서. "사주에선 금 에너지가 부족해서 결단력 있는 사람한테 끌리는데, 점성술로도 하강궁이 사수자리라 자유롭고 모험적인 사람을 만나게 될 거야. **둘 다 정반대 매력을 말하니 이게 확실한 네 이상형**"처럼.

현재 연애운은 대운/세운과 트랜싯 행성을 함께 분석. 올해 어느 달이 좋은지, 도화살이나 홍염살 같은 신살도 언급하면서 금성-화성 배치도 함께. **둘 다 좋은 시기면 진짜 골든타임, 둘 다 나쁘면 진짜 조심**.

궁합 얘기할 때는 일간 궁합과 별자리 궁합을 융합해서. 잘 맞는 조합과 피해야 할 조합 모두. **사주와 점성술이 둘 다 추천하는 궁합이면 진짜 찰떡, 둘 다 경고하면 진짜 위험**.

이상형 분석은 배우자궁(일지/7하우스)을 중심으로 구체적으로. 어떤 사람을 어디서 만날 가능성이 높은지. **두 시스템이 공통으로 말하는 특징 중심으로**.

현재 상황별 조언(연애중/솔로/문제있음)도 사주+점성술 융합해서. **둘이 공통으로 추천하는 행동 위주로**.

마지막에 실천 가이드와 핵심 메시지로 마무리. 사주와 점성술이 공통으로 강조하는 핵심 포인트로.
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
}

const CAREER_SECTIONS = {
  ko: `
## 작성 스타일 (필수!)
- 리스트/점수/이모지 절대 금지
- 친구한테 커리어 상담해주듯이 편하게 글로만
- **교차 분석 핵심**: 사주와 점성술이 같은 커리어 적성을 다른 방식으로 확인할 때 그게 진실
- 사주와 점성술을 50:50으로 융합 (번갈아가며)
- 모든 destiny-matrix 10개 레이어 데이터 자연스럽게 녹이기
- 문단 나눠서 읽기 편하게
- 8000~10000자 분량 (테마의 모든 측면을 심층 분석)

## 교차 분석 예시
"네 커리어 적성을 보면, 사주로는 정관이 강해서 조직 내에서 인정받고 싶은 욕구가 커.
점성술로도 MC가 염소자리라 안정적이고 권위 있는 자리를 원하지.
둘 다 조직인을 말하니 프리랜서보다는 회사 생활이 맞아."

"창의력은, 사주에서 식신격이라 아이디어가 샘솟는 스타일인데,
점성술로도 MC가 물고기자리라 예술적/창의적 커리어에 적합해.
둘 다 크리에이티브를 강조하니 네가 기획이나 디자인 쪽에서 진짜 빛날 거야."

## 필수 내용 (자연스럽게 풀어서)

커리어 DNA를 분석해볼게. 사주로 보면 일간과 관성/식상이 어떻게 배치됐는지, 점성술로는 MC와 10하우스가 어떤지 함께 봐야 해. **이 둘이 만나서 어떤 직업 적성이 교차 확인되는지 명확히 설명**.

업무 스타일도 사주의 일간 특성과 점성술의 태양/화성 배치를 연결해서. "사주로는 갑목이라 리더십 강한데, 점성술로도 화성 사자자리라 앞장서는 타입이야. **둘 다 리더형이라고 하니 팀장 역할이 네 길**"처럼.

현재 커리어운은 대운/세운과 트랜싯 행성을 함께 분석. 올해 승진이나 이직 타이밍은 언제인지, 사주의 관성 작용과 점성술의 10하우스 트랜싯을 융합해서. **둘 다 좋은 시기면 진짜 기회, 둘 다 나쁘면 현상유지**.

추천 업종은 사주의 십신 구조와 점성술의 하우스 배치를 융합해서. "사주로 식신+정인 조합은 교육이나 컨설팅 잘 맞고, 점성술로도 3하우스 강하니 소통 분야 적합해. **둘 다 가르치고 전달하는 일을 말하니 확실해**"처럼.

직장 vs 창업은 사주의 비겁/재성 강도와 점성술의 2하우스/8하우스를 보고. **둘이 공통으로 추천하는 방향 제시**.

성장 곡선과 전환점도 대운 변화와 메이저 트랜싯을 함께 봐서. **두 시스템이 동시에 말하는 중요 시기 강조**.

마지막에 실천 가이드와 핵심 메시지로 마무리. 사주와 점성술이 공통으로 강조하는 커리어 포인트로

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
}

const WEALTH_SECTIONS = {
  ko: `
## 작성 스타일 (필수!)
- 리스트/점수/이모지 절대 금지
- 친구한테 재테크 상담해주듯이 편하게 글로만
- **교차 분석 핵심**: 사주와 점성술이 같은 재물 성향을 다른 방식으로 확인할 때 그게 진실
- 사주와 점성술을 50:50으로 융합 (번갈아가며)
- 모든 destiny-matrix 10개 레이어 데이터 자연스럽게 녹이기
- 문단 나눠서 읽기 편하게
- 8000~10000자 분량 (테마의 모든 측면을 심층 분석)

## 교차 분석 예시
"네 재물 성향을 보면, 사주로는 편재가 강해서 사업이나 투자로 돈 버는 스타일이야.
점성술로도 2하우스에 목성이 있어서 재물 확장 욕구가 크지.
둘 다 공격적 재테크를 말하니 정기예금보다는 투자 쪽이 네 길이야."

"리스크 관리는, 사주로 재성이 너무 많아서 돈에 집착할 수 있는데,
점성술로도 토성이 2하우스 스퀘어라 재물 손실 조심해야 해.
둘 다 과욕 경고하니 분산 투자가 진짜 중요해."

## 필수 내용 (자연스럽게 풀어서)

재물 DNA를 분석해볼게. 사주로 보면 재성이 어떻게 배치됐는지, 점성술로는 2하우스와 목성이 어떤지 함께 봐야 해. **이 둘이 만나서 어떤 금전 성향이 교차 확인되는지 명확히 설명**.

돈 버는 방식도 사주의 십신 구조와 점성술의 하우스 배치를 연결해서. "사주로 정재 강하면 월급형인데, 점성술로도 6하우스 강하면 노동 소득형이야. **둘 다 안정적 수입을 말하니 프리랜서보다 직장인이 맞아**"처럼.

현재 재물운은 대운/세운과 트랜싯 행성을 함께 분석. 올해 언제 돈이 들어오고 언제 조심해야 하는지, 사주의 재성 작용과 점성술의 2하우스 트랜싯을 융합해서. **둘 다 좋은 시기면 진짜 기회, 둘 다 나쁘면 방어**.

투자 전략은 사주의 오행 밸런스와 점성술의 행성 배치를 보고. "사주로 화 기운 강하면 단기 수익형이고, 점성술로도 화성 강하면 공격적 투자 맞아. **둘 다 빠른 판단을 말하니 주식 단타가 맞아**"처럼.

부수입 가능성도 사주의 편재와 점성술의 8하우스를 함께 봐서. **둘이 공통으로 추천하는 수입원 제시**.

재물 리스크는 둘 다 경고하는 시기와 유형을 강조. **두 시스템이 동시에 말하는 위험 요소 명확히**.

마지막에 실천 가이드와 핵심 메시지로 마무리. 사주와 점성술이 공통으로 강조하는 재테크 포인트로.
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
}

const HEALTH_SECTIONS = {
  ko: `
## 작성 스타일 (필수!)
- 리스트/점수/이모지 절대 금지
- 친구한테 건강 상담해주듯이 편하게 글로만
- **교차 분석 핵심**: 사주와 점성술이 같은 건강 취약점을 다른 방식으로 확인할 때 그게 진실
- 사주와 점성술을 50:50으로 융합 (번갈아가며)
- 모든 destiny-matrix 10개 레이어 데이터 자연스럽게 녹이기
- 문단 나눠서 읽기 편하게
- 8000~10000자 분량 (테마의 모든 측면을 심층 분석)

## 교차 분석 예시
"네 건강을 보면, 사주로는 화 기운이 너무 강해서 열이 많고 불면증 올 수 있어.
점성술로도 화성이 상승궁에 있어서 에너지 과잉으로 피곤할 수 있지.
둘 다 열과 과잉 활동을 말하니 쿨다운이 진짜 필요해."

"소화기는, 사주로 토 기운 부족해서 위장 약한데,
점성술로도 6하우스에 처녀자리 강조돼서 소화 예민해.
둘 다 소화기 주의라고 하니 식습관 관리가 진짜 중요해."

## 필수 내용 (자연스럽게 풀어서)

건강 DNA를 분석해볼게. 사주로 보면 오행 밸런스가 어떤지, 점성술로는 6하우스와 12하우스가 어떤지 함께 봐야 해. **이 둘이 만나서 어떤 체질과 취약점이 교차 확인되는지 명확히 설명**.

에너지 패턴도 사주의 일간 특성과 점성술의 태양/화성 배치를 연결해서. "사주로 목이 강하면 아침형이고, 점성술로도 태양 상승이면 새벽에 에너지 최고야. **둘 다 아침형을 말하니 일찍 자고 일찍 일어나는 게 맞아**"처럼.

현재 건강운은 대운/세운과 트랜싯 행성을 함께 분석. 올해 언제 조심해야 하고 언제 활력이 최고인지, 사주의 오행 충극과 점성술의 6하우스 트랜싯을 융합해서. **둘 다 경고하는 시기는 진짜 조심**.

취약 부위는 사주의 부족/과다 오행과 점성술의 행성 배치를 보고. "사주로 금 부족하면 호흡기 약하고, 점성술로도 12하우스에 토성 있으면 폐 주의야. **둘 다 호흡기를 말하니 확실히 관리 필요**"처럼.

생활 습관 추천도 사주의 오행 균형과 점성술의 하우스 배치를 함께 봐서. **둘이 공통으로 추천하는 운동이나 식이법 제시**.

정신 건강도 사주의 식상/관성과 점성술의 달/해왕성을 함께 분석. **두 시스템이 동시에 말하는 스트레스 요인 명확히**.

마지막에 실천 가이드와 핵심 메시지로 마무리. 사주와 점성술이 공통으로 강조하는 건강 관리 포인트로.

⚠️ 의료 진단이나 처방은 전문 의료진과 상담하세요

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
}

const FAMILY_SECTIONS = {
  ko: `
## 작성 스타일 (필수!)
- 리스트/점수/이모지 절대 금지
- 친구한테 가족 상담해주듯이 편하게 글로만
- **교차 분석 핵심**: 사주와 점성술이 같은 가족 역학을 다른 방식으로 확인할 때 그게 진실
- 사주와 점성술을 50:50으로 융합 (번갈아가며)
- 모든 destiny-matrix 10개 레이어 데이터 자연스럽게 녹이기
- 문단 나눠서 읽기 편하게
- 8000~10000자 분량 (테마의 모든 측면을 심층 분석)

## 교차 분석 예시
"네 가족 관계를 보면, 사주로는 인성이 강해서 부모한테 의지하는 성향이 있어.
점성술로도 4하우스에 달이 있어서 가족이 정서적 안정의 중심이지.
둘 다 가족 중심을 말하니 독립보다는 가족과 가까이 사는 게 맞아."

"형제 관계는, 사주로 비겁이 많아서 경쟁이나 비교 의식이 있을 수 있는데,
점성술로도 3하우스에 화성이 있어서 형제랑 다툼이 잦아.
둘 다 형제 갈등을 말하니 의식적으로 협력 관계 만드는 게 중요해."

## 필수 내용 (자연스럽게 풀어서)

가족 DNA를 분석해볼게. 사주로 보면 인성과 비겁이 어떻게 배치됐는지, 점성술로는 4하우스와 10하우스가 어떤지 함께 봐야 해. **이 둘이 만나서 어떤 가족 역할과 역학이 교차 확인되는지 명확히 설명**.

부모와의 관계도 사주의 인성 작용과 점성술의 4하우스/10하우스를 연결해서. "사주로 인성 과다면 부모 의존도 높고, 점성술로도 4하우스 강하면 부모 영향 크지. **둘 다 부모 중심을 말하니 부모 말씀이 네 인생에 큰 비중**"처럼.

형제자매 관계는 사주의 비겁과 점성술의 3하우스를 함께 분석. **둘 다 같은 패턴 말하면 확실히 맞아**.

현재 가족운은 대운/세운과 트랜싯 행성을 함께 분석. 올해 언제 가족과 화합하고 언제 갈등 조심해야 하는지, 사주의 충극과 점성술의 4하우스 트랜싯을 융합해서. **둘 다 경고하는 시기는 진짜 말조심**.

소통 방법은 사주의 일간 특성과 점성술의 수성/달 배치를 보고. "사주로 목이 강하면 직설적인데, 점성술로도 수성 양자리면 말이 빨라. **둘 다 빠른 소통을 말하니 가족한테도 천천히 설명하는 연습 필요**"처럼.

가족 유산과 패턴은 사주의 격국과 점성술의 IC를 함께 봐서. **두 시스템이 공통으로 말하는 세대 패턴 강조**.

마지막에 실천 가이드와 핵심 메시지로 마무리. 사주와 점성술이 공통으로 강조하는 가족 화합 포인트로.
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
}

// ===========================
// 테마 섹션 매퍼
// ===========================

const THEME_SECTIONS: Record<ReportTheme, { ko: string; en: string }> = {
  love: LOVE_SECTIONS,
  career: CAREER_SECTIONS,
  wealth: WEALTH_SECTIONS,
  health: HEALTH_SECTIONS,
  family: FAMILY_SECTIONS,
}

// ===========================
// 테마 라벨
// ===========================

const THEME_LABELS: Record<ReportTheme, { ko: string; en: string }> = {
  love: { ko: '사랑 & 연애 심층 분석', en: 'Love & Romance Deep Analysis' },
  career: { ko: '커리어 & 직업 심층 분석', en: 'Career & Work Deep Analysis' },
  wealth: { ko: '재물 & 금전 심층 분석', en: 'Wealth & Money Deep Analysis' },
  health: { ko: '건강 & 웰빙 심층 분석', en: 'Health & Wellness Deep Analysis' },
  family: { ko: '가족 & 관계 심층 분석', en: 'Family & Relationships Deep Analysis' },
}

// ===========================
// 메인 프롬프트 빌더
// ===========================

export function buildThemedPrompt(
  theme: ReportTheme,
  lang: 'ko' | 'en',
  profileData: {
    name?: string
    birthDate?: string
    dayMaster: string
    dayMasterElement: string
    sibsinDistribution?: Record<string, number>
  },
  timingData: TimingData,
  matrixSummary: string,
  astroSummary?: string,
  graphRagEvidencePrompt?: string
): string {
  const isKo = lang === 'ko'
  const sections = THEME_SECTIONS[theme][lang]
  const themeLabel = THEME_LABELS[theme][lang]

  // 십신 분포 포맷
  const sibsinText = profileData.sibsinDistribution
    ? Object.entries(profileData.sibsinDistribution)
        .map(([k, v]) => `${k}(${v})`)
        .join(', ')
    : isKo
      ? '없음'
      : 'None'

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
${graphRagEvidencePrompt ? `\n## GraphRAG 근거 앵커\n${graphRagEvidencePrompt}` : ''}

═══════════════════════════════════════════════════════════════
${sections}
═══════════════════════════════════════════════════════════════

## 작성 규칙
1. 모든 분석은 위 데이터를 근거로 작성 (근거 명시)
2. 추상적 표현 대신 구체적이고 실용적인 조언 제시
3. 따뜻하고 격려하는 톤 유지
4. 동양과 서양 데이터를 "교차 융합"하여 분석
5. 운명론적 단정 피하고 "경향", "가능성" 표현 사용
6. 따뜻하고 격려하는 존댓말로 작성하며 모든 섹션은 문장형으로만 구성
7. 목록, 번호, 이모지, 제목 표기는 금지하고 문단만 사용
8. 섹션마다 사주 근거 문장과 점성 근거 문장을 포함한 뒤 교차 결론을 반드시 제시
9. 전체 분량은 예시보다 최소 3배 이상으로 충분히 길게 작성

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
${graphRagEvidencePrompt ? `\n## GraphRAG Evidence Anchors\n${graphRagEvidencePrompt}` : ''}

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
}`

  return prompt
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
  const isKo = lang === 'ko'
  const themeLabel = THEME_LABELS[theme][lang]

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
{ "overall": 75, "potential": 80, "timing": 70, "compatibility": 65 }`
}

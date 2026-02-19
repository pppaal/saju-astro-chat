// src/lib/destiny-matrix/ai-report/prompts/timingPrompts.ts
// 타이밍 리포트용 프롬프트 생성

import type { ReportPeriod, TimingData } from '../types'

// ===========================
// 기간별 프롬프트 섹션
// ===========================

const DAILY_SECTIONS = {
  ko: `
## 작성 스타일 (필수!)
- 리스트/점수/이모지 절대 금지
- 친구한테 말하듯이 자연스럽게 글로만 서술
- **교차 분석 핵심**: 사주와 점성술이 같은 특징을 다른 방식으로 확인할 때 그게 진실
- 사주와 점성술을 50:50 비율로 융합 (번갈아가며 언급)
- 모든 destiny-matrix 10개 레이어 데이터를 자연스럽게 녹여서 설명
- **마음을 관통하는 깊이**: 표면적 분석이 아닌 본질을 파고드는 통찰
- 문단으로 나눠서 읽기 편하게
- **6000~7000자 분량** (상세하고 깊이있게)

## 교차 분석 예시
"네 성격을 보면, 사주로는 갑목이라 곧고 성장 지향적이야.
점성술로도 태양이 황소자리라 안정을 추구하면서도 꾸준히 나아가는 스타일이지.
이 둘이 만나니까 네가 목표를 정하면 흔들림 없이 가는 성격이 나온 거야."

"창의력 얘기를 하자면, 사주에서 식신격이라 아이디어가 샘솟고,
점성술로도 MC가 물고기자리라 예술적/창의적 커리어에 적합해.
이게 교차되니까 네가 크리에이티브한 분야에서 진짜 빛날 수밖에 없어."

## 필수 내용 (자연스럽고 깊이있게 풀어서)

【1부: 오늘의 본질 (800-1000자)】
오늘을 한마디로 표현하면서 시작. 사주로 보면 일진과 일간의 관계(수생목/목극토 등)를 깊이있게 설명하고, 점성술로 보면 오늘의 행성 배치(금성-목성 트라인 등)를 상세히 분석. **이 둘이 어떻게 교차 확인되는지 명확히 제시**. 대운과 세운이 만들어내는 큰 흐름 속에서 오늘이 어떤 의미인지, 신살(도화살/역마살/문창귀인 등)이 어떻게 작용하는지도 함께. 단순히 "좋다/나쁘다"가 아니라 "왜 그런지", "어떤 의미인지"를 파고들어 설명.

【2부: 시간대별 에너지 흐름 (1000-1200자)】
새벽부터 밤까지, 시간대별로 에너지가 어떻게 변하는지 상세히. 사주의 시진 분석(자시/축시/인시...)과 점성술의 달 이동, 행성 각도 변화를 함께 언급. 오전에는 어떤 에너지가 강한지, 점심 시간대는 어떤지, 오후 늦게는 어떻게 변하는지, 저녁과 밤은 어떤지. **사주와 점성술이 둘 다 같은 시간대를 좋게/나쁘게 보는 경우 강조**. 각 시간대에 뭘 하면 좋은지, 뭘 피해야 하는지 구체적으로. "이 시간에는 왜 이런 에너지가 흐르는가"에 대한 본질적 이유도 함께.

【3부: 기회와 도전 (1200-1500자)】
오늘의 기회 포인트를 깊이있게 분석. 사주의 십신(식신/정관/편재 등)과 점성술의 행성(수성/금성/화성 등)을 연결. 단순히 "좋다"가 아니라 "왜 좋은지", "어떻게 활용해야 하는지", "이 기회를 놓치면 어떻게 되는지"까지. 예를 들어 "사주로는 식신의 창의력이 발동하는데, 점성술로도 수성이 순행이라 소통이 술술 풀려. **둘 다 표현력을 말하니 오늘 확실히 말발이 선다**. 이건 단순히 말을 잘한다는 게 아니라, 네 내면의 진짜 생각이 왜곡 없이 전달되는 날이라는 거야. 평소 말하고 싶었던 것, 표현하고 싶었던 감정을 오늘 꺼내면 상대방이 정확히 이해할 거야."

주의할 점도 마찬가지로 깊이있게. 오행 밸런스(목 과다/토 부족 등)와 행성 역행이나 스퀘어를 함께 언급. **둘 다 같은 영역을 경고하면 정말 조심해야 함을 강조**. 어떤 상황에서 문제가 생길 수 있는지, 왜 그런 문제가 생기는지, 어떻게 대처해야 하는지까지 구체적으로. "조심하라"로 끝나는 게 아니라 "왜 조심해야 하고, 어떻게 조심해야 하는지" 명확히.

【4부: 영역별 심층 분석 (2000-2500자)】
Career/Love/Wealth/Health를 각각 500-600자씩 깊이있게. **각 영역마다 교차 분석 포인트 최소 2-3개 이상 포함**.

커리어: 오늘 직장에서 어떤 일이 일어날 가능성이 높은지, 상사/동료와의 관계는 어떤지, 프로젝트는 어떻게 진행될지, 중요한 발표나 회의가 있다면 어떻게 대처해야 하는지. 사주의 관성/식상과 점성술의 10하우스/MC를 연결. 단순히 "커리어운이 좋다"가 아니라 "왜 좋은지", "구체적으로 어떤 기회가 오는지", "어떻게 활용해야 하는지"까지.

사랑: 솔로라면 어떤 만남의 기회가 있는지, 어디서 만날 가능성이 높은지, 어떤 타입에게 끌릴지. 커플이라면 오늘 관계가 어떻게 흘러갈지, 어떤 대화를 나누면 좋은지, 피해야 할 주제는 뭔지. 사주의 관성/재성과 점성술의 금성/7하우스를 연결. "연애운이 좋다"가 아니라 "왜 좋은지", "어떤 감정이 움직이는지", "상대방은 어떻게 느낄지"까지 심리적 깊이로.

재물: 오늘 돈이 들어올 가능성, 지출 패턴, 투자 결정을 해야 한다면 어떻게 해야 하는지, 충동구매 위험은 없는지. 사주의 재성과 점성술의 2하우스/목성을 연결. "재물운이 좋다"가 아니라 "왜 돈이 들어오는지", "어떤 경로로 오는지", "어떻게 관리해야 하는지"까지.

건강: 오늘 컨디션은 어떤지, 어느 부위를 조심해야 하는지, 운동은 언제 하면 좋은지, 식사는 어떻게 해야 하는지, 스트레스 관리는 어떻게 할지. 사주의 오행 밸런스와 점성술의 6하우스/화성 에너지를 연결. "건강이 좋다"가 아니라 "왜 그런지", "어떤 에너지가 작용하는지", "어떻게 관리해야 하는지"까지.

【5부: 실천 가이드와 핵심 메시지 (800-1000자)】
오늘 하루를 어떻게 보내야 하는지 구체적인 행동 지침. 아침에 일어나서 뭘 해야 하는지, 출근길에 무슨 생각을 하면 좋은지, 점심시간 어떻게 보내야 하는지, 퇴근 후 뭘 하면 좋은지까지. 단순한 "해야 할 일" 목록이 아니라, "왜 그렇게 해야 하는지"에 대한 깊은 이유와 함께.

마지막에 오늘의 핵심 메시지를 여운있게 마무리. 사주와 점성술이 공통으로 말하는 가장 중요한 포인트로. 오늘 하루가 네 인생에서 어떤 의미인지, 어떤 변화의 시작점이 될 수 있는지, 어떤 깨달음을 얻을 수 있는지까지. 마음을 울리는 한 문장으로 마무리.
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
}

const MONTHLY_SECTIONS = {
  ko: `
## 작성 스타일 (필수!)
- 리스트/점수/이모지 절대 금지
- 친구한테 말하듯이 자연스럽게 글로만 서술
- **교차 분석 핵심**: 사주와 점성술이 같은 흐름을 다른 방식으로 확인할 때 그게 진실
- 사주와 점성술을 50:50 비율로 융합
- 모든 destiny-matrix 10개 레이어 데이터를 자연스럽게 녹여서 설명
- **마음을 관통하는 깊이**: 표면적 분석이 아닌 본질을 파고드는 통찰
- 문단으로 나눠서 읽기 편하게
- **7000~8000자 분량** (한 달 전체를 상세하게)

## 교차 분석 예시
"이번달 커리어를 보면, 사주로는 정관이 강하게 들어와서 인정받을 기회가 많아.
점성술로도 10하우스에 목성이 지나가니 승진이나 새 기회가 온대.
이렇게 둘 다 직장운 상승을 말하니 이번달은 진짜 커리어 도약기야."

"재물 흐름은, 사주로 편재가 약해서 큰 돈은 안 들어오는데,
점성술로도 2하우스가 비어있고 금성도 역행이라 수입 변동 있을 거야.
둘 다 재물에 보수적이라고 하니 이번달은 저축에 집중하는 게 맞아."

## 필수 내용 (자연스럽게 풀어서)

이번달 전체 흐름을 한마디로 표현하면서 시작. 사주로 보면 월운(월지/월간)이 어떻게 작용하는지, 점성술로는 이번달 주요 행성 이동(수성 역행, 금성 이동 등)을 설명. **둘을 교차 분석해서 이번달의 확실한 키워드 제시**.

주차별로 에너지가 어떻게 변하는지 설명. 1주차는 어떻고, 2주차는 어떤지 구체적으로. 사주의 순환과 점성술의 행성 이동을 함께 언급. **특정 주에 둘 다 좋거나 둘 다 나쁘면 강조**.

이번달 기회가 오는 시기와 분야를 사주+점성술 융합해서 설명. "상순에는 사주로 식신 에너지가 강하고 점성술로도 금성이 좋은 위치라 창의적 프로젝트 시작하기 좋아. **둘 다 표현의 달이라고 하니 확실해**"처럼.

주의할 시기와 분야도 마찬가지로 융합. "하순에는 사주로 목극토가 강해지고 점성술로도 화성 스퀘어라 갈등 조심. **둘 다 충돌을 경고하니 정말 말조심**"처럼.

영역별로는 career/love/wealth/health를 각각 4-5문장씩, 사주+점성술 융합해서 설명. **각 영역마다 교차 분석 포인트 최소 1개 이상 포함**.

이번달 실천 가이드를 구체적으로 제시. 언제 무엇을 하면 좋은지. 사주와 점성술이 둘 다 추천하는 행동 중심으로.

마지막에 이번달의 핵심 메시지로 마무리. 사주와 점성술이 공통으로 말하는 가장 중요한 포인트로.
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
}

const YEARLY_SECTIONS = {
  ko: `
## 작성 스타일 (필수!)
- 리스트/점수/이모지 절대 금지
- 친구한테 말하듯이 자연스럽게 글로만 서술
- **교차 분석 핵심**: 사주와 점성술이 같은 흐름을 다른 방식으로 확인할 때 그게 진실
- 사주와 점성술을 50:50 비율로 융합
- 모든 destiny-matrix 10개 레이어 데이터를 자연스럽게 녹여서 설명
- **마음을 관통하는 깊이**: 인생 전환점이 될 수 있는 한 해를 본질적으로 분석
- 문단으로 나눠서 읽기 편하게
- **10000~12000자 분량** (일년 전체를 인생 차원에서 상세하게)

## 교차 분석 예시
"올해 전체 흐름을 보면, 사주로는 세운이 목생화 작용으로 표현의 해야.
점성술로도 목성이 네 3하우스를 지나니 소통과 학습이 확장되는 해지.
둘 다 표현력 강화를 말하니 올해는 확실히 네 목소리를 내는 해야."

"상반기와 하반기가 완전 달라. 상반기는 사주로 식신 작용 강하고 점성술로도 수성 순행이라 아이디어 폭발이야.
근데 하반기는 사주로 비겁 들어오고 점성술로도 토성 스퀘어라 경쟁 심화돼.
둘 다 같은 패턴을 보이니 상반기에 실적 쌓는 게 진짜 중요해."

## 필수 내용 (자연스럽게 풀어서)

올해를 한마디로 표현하면서 시작. 사주로 보면 세운(연지/연간)이 어떻게 작용하는지, 점성술로는 올해 메이저 행성 이동(목성/토성 위치, 일식/월식 등)을 설명. **둘을 교차 분석해서 올해의 확실한 메인 테마 제시**.

분기별로 에너지가 어떻게 변하는지 설명. 1분기는 어떻고, 2분기는 어떤지 구체적으로. 사주의 오행 순환과 점성술의 행성 이동을 함께 언급. **특정 분기에 둘 다 최고조거나 둘 다 침체면 강조**.

올해 기회가 오는 시기와 분야를 사주+점성술 융합해서 설명. "3-4월에는 사주로 목 기운 상승하고 점성술로도 금성 트라인이라 인간관계에서 기회 많아. **둘 다 사람 운을 말하니 이때 네트워킹이 핵심**"처럼.

주의할 시기와 분야도 마찬가지로 융합. "9-10월은 사주로 금극목 충돌 있고 점성술로도 화성 역행이라 갈등 조심. **둘 다 정면충돌 경고하니 이 시기는 방어 모드로**"처럼.

영역별로는 career/love/wealth/health를 각각 6-7문장씩, 사주+점성술 융합해서 설명. **각 영역마다 교차 분석 포인트 최소 2개 이상 포함**. 분기별 특징도 자연스럽게 녹여서.

올해 실천 가이드를 구체적으로 제시. 언제 무엇을 하면 좋은지, 분기별로. 사주와 점성술이 둘 다 추천하는 핵심 행동 중심으로.

마지막에 올해의 핵심 메시지로 마무리. 사주와 점성술이 공통으로 말하는 가장 중요한 포인트와 내년을 위한 준비 방향.
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
}

// ===========================
// 타이밍 데이터 포맷터
// ===========================

function formatTimingData(timing: TimingData, lang: 'ko' | 'en'): string {
  const lines: string[] = []

  if (lang === 'ko') {
    lines.push('## 현재 운세 주기 데이터\n')

    if (timing.daeun) {
      lines.push(`### 대운 (10년 주기)`)
      lines.push(`- 천간: ${timing.daeun.heavenlyStem}`)
      lines.push(`- 지지: ${timing.daeun.earthlyBranch}`)
      lines.push(`- 오행: ${timing.daeun.element}`)
      lines.push(`- 기간: ${timing.daeun.startAge}세 ~ ${timing.daeun.endAge}세`)
      lines.push(`- 현재: ${timing.daeun.isCurrent ? '진행 중' : '아님'}\n`)
    }

    if (timing.seun) {
      lines.push(`### 세운 (올해 연운)`)
      lines.push(`- 연도: ${timing.seun.year}년`)
      lines.push(`- 천간: ${timing.seun.heavenlyStem}`)
      lines.push(`- 지지: ${timing.seun.earthlyBranch}`)
      lines.push(`- 오행: ${timing.seun.element}\n`)
    }

    if (timing.wolun) {
      lines.push(`### 월운 (이번달)`)
      lines.push(`- 월: ${timing.wolun.month}월`)
      lines.push(`- 천간: ${timing.wolun.heavenlyStem}`)
      lines.push(`- 지지: ${timing.wolun.earthlyBranch}`)
      lines.push(`- 오행: ${timing.wolun.element}\n`)
    }

    if (timing.iljin) {
      lines.push(`### 일진 (오늘)`)
      lines.push(`- 날짜: ${timing.iljin.date}`)
      lines.push(`- 천간: ${timing.iljin.heavenlyStem}`)
      lines.push(`- 지지: ${timing.iljin.earthlyBranch}`)
      lines.push(`- 오행: ${timing.iljin.element}\n`)
    }
  } else {
    lines.push('## Current Fortune Cycle Data\n')

    if (timing.daeun) {
      lines.push(`### Daeun (10-Year Cycle)`)
      lines.push(`- Heavenly Stem: ${timing.daeun.heavenlyStem}`)
      lines.push(`- Earthly Branch: ${timing.daeun.earthlyBranch}`)
      lines.push(`- Element: ${timing.daeun.element}`)
      lines.push(`- Period: Age ${timing.daeun.startAge} ~ ${timing.daeun.endAge}`)
      lines.push(`- Current: ${timing.daeun.isCurrent ? 'Active' : 'No'}\n`)
    }

    if (timing.seun) {
      lines.push(`### Seun (Annual Fortune)`)
      lines.push(`- Year: ${timing.seun.year}`)
      lines.push(`- Heavenly Stem: ${timing.seun.heavenlyStem}`)
      lines.push(`- Earthly Branch: ${timing.seun.earthlyBranch}`)
      lines.push(`- Element: ${timing.seun.element}\n`)
    }

    if (timing.wolun) {
      lines.push(`### Wolun (Monthly Fortune)`)
      lines.push(`- Month: ${timing.wolun.month}`)
      lines.push(`- Heavenly Stem: ${timing.wolun.heavenlyStem}`)
      lines.push(`- Earthly Branch: ${timing.wolun.earthlyBranch}`)
      lines.push(`- Element: ${timing.wolun.element}\n`)
    }

    if (timing.iljin) {
      lines.push(`### Iljin (Daily Fortune)`)
      lines.push(`- Date: ${timing.iljin.date}`)
      lines.push(`- Heavenly Stem: ${timing.iljin.heavenlyStem}`)
      lines.push(`- Earthly Branch: ${timing.iljin.earthlyBranch}`)
      lines.push(`- Element: ${timing.iljin.element}\n`)
    }
  }

  return lines.join('\n')
}

// ===========================
// 메인 프롬프트 빌더
// ===========================

export function buildTimingPrompt(
  period: ReportPeriod,
  lang: 'ko' | 'en',
  profileData: {
    name?: string
    birthDate?: string
    dayMaster: string
    dayMasterElement: string
  },
  timingData: TimingData,
  targetDate: string,
  matrixSummary: string,
  graphRagEvidencePrompt?: string
): string {
  const isKo = lang === 'ko'

  // 기간별 섹션 선택
  const sections =
    period === 'daily'
      ? DAILY_SECTIONS[lang]
      : period === 'monthly'
        ? MONTHLY_SECTIONS[lang]
        : YEARLY_SECTIONS[lang]

  // 기간 라벨
  const periodLabel = {
    daily: isKo ? '오늘 운세' : "Today's Fortune",
    monthly: isKo ? '이번달 운세' : 'Monthly Fortune',
    yearly: isKo ? '올해 운세' : 'Yearly Fortune',
    comprehensive: isKo ? '종합 리포트' : 'Comprehensive Report',
  }[period]

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

${graphRagEvidencePrompt ? `## GraphRAG 근거 앵커\n${graphRagEvidencePrompt}\n` : ''}

═══════════════════════════════════════════════════════════════
${sections}
═══════════════════════════════════════════════════════════════

## 작성 규칙
1. 모든 분석은 위 데이터(일간, 대운, 세운, 월운, 일진)를 근거로 작성
2. 근거 없는 추측이나 일반론 금지
3. 따뜻하고 격려하는 톤, 실용적인 조언 포함
4. 추상적 표현 대신 구체적인 행동 가이드 제시
5. 의료/법률/금융 전문 조언은 피하고 일반적 가이드만 제공
6. 따뜻하고 격려하는 존댓말로 작성하며 모든 섹션은 문장형으로만 구성
7. 목록, 번호, 이모지, 제목 표기는 금지하고 문단만 사용
8. 섹션마다 사주 근거 문장과 점성 근거 문장을 포함한 뒤 교차 결론을 반드시 제시
9. 전체 분량은 예시보다 최소 3배 이상으로 충분히 길게 작성

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

${graphRagEvidencePrompt ? `## GraphRAG Evidence Anchors\n${graphRagEvidencePrompt}\n` : ''}

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
}`

  return prompt
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
  const isKo = lang === 'ko'

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
{ "overall": 75, "career": 80, "love": 70, "wealth": 65, "health": 85 }`
}

// src/lib/destiny-matrix/ai-report/aiReportService.ts
// Destiny Fusion Matrix™ - AI Premium Report Generator
// 유료 기능: AI 기반 상세 내러티브 리포트 생성

'use server';

import type { FusionReport, FusionInsight, InsightDomain } from '../interpreter/types';
import type { MatrixCalculationInput } from '../types';

// ===========================
// AI 리포트 타입 정의
// ===========================

export interface AIPremiumReport {
  id: string;
  generatedAt: string;
  lang: 'ko' | 'en';

  // 기본 정보
  profile: {
    name?: string;
    birthDate?: string;
    dayMaster: string;
    dominantElement: string;
    geokguk?: string;
  };

  // AI 생성 섹션
  sections: {
    introduction: string;           // 인트로: 전체 운명 요약
    personalityDeep: string;        // 성격 심층 분석
    careerPath: string;             // 커리어 경로 & 적성
    relationshipDynamics: string;   // 관계 역학
    wealthPotential: string;        // 재물운 & 재테크 조언
    healthGuidance: string;         // 건강 가이드
    lifeMission: string;            // 인생 사명 & 영적 성장
    timingAdvice: string;           // 타이밍 조언 (대운/세운)
    actionPlan: string;             // 실천 가이드
    conclusion: string;             // 마무리 메시지
  };

  // 원본 매트릭스 데이터 참조
  matrixSummary: {
    overallScore: number;
    grade: string;
    topInsights: string[];
    keyStrengths: string[];
    keyChallenges: string[];
  };

  // 메타데이터
  meta: {
    modelUsed: string;
    tokensUsed?: number;
    processingTime?: number;
    reportVersion: string;
  };
}

export interface AIReportGenerationOptions {
  name?: string;
  birthDate?: string;
  lang?: 'ko' | 'en';
  focusDomain?: InsightDomain;
  detailLevel?: 'standard' | 'detailed' | 'comprehensive';
  theme?: string; // Themed report type (career, relationship, wealth, health, timing, comprehensive)
}

// ===========================
// 프롬프트 빌더
// ===========================

/**
 * Builds themed AI prompt with specific focus areas
 */
function buildThemedAIPrompt(
  input: MatrixCalculationInput,
  report: FusionReport,
  theme: string,
  options: AIReportGenerationOptions
): string {
  const lang = options.lang || 'ko';

  // Import theme prompts dynamically
  let themePromptData: { ko: string; en: string } | undefined;
  // TODO: Re-enable when themed-report/prompts is created
  // try {
  //   // eslint-disable-next-line @typescript-eslint/no-var-requires
  //   const { THEME_PROMPT_FOCUS } = require('../themed-report/prompts');
  //   themePromptData = THEME_PROMPT_FOCUS[theme as keyof typeof THEME_PROMPT_FOCUS];
  // } catch (error) {
  //   console.warn('Failed to load theme prompts:', error);
  // }

  const profileInfo = buildProfileInfo(input, options, lang);
  const matrixSummary = buildMatrixSummary(report, lang);
  const themeContext = themePromptData?.[lang] || '';

  if (lang === 'ko') {
    return `${themeContext}

${profileInfo}

## 매트릭스 분석 결과
${matrixSummary}

다음 섹션들을 각각 작성해주세요. 각 섹션은 따뜻하고 격려하는 톤으로, 실용적인 조언을 포함해야 합니다.

### 작성할 섹션:
1. **introduction**: 전체 운명 요약 (200-300자)
2. **personalityDeep**: 성격 심층 분석 (400-600자)
3. **careerPath**: 커리어 경로 & 적성 분석 (400-600자)
4. **relationshipDynamics**: 관계 역학 (400-600자)
5. **wealthPotential**: 재물운 & 재테크 성향 (300-500자)
6. **healthGuidance**: 건강 가이드 (300-400자)
7. **lifeMission**: 인생 사명 & 영적 성장 방향 (300-400자)
8. **timingAdvice**: 중요한 시기 & 타이밍 조언 (300-400자)
9. **actionPlan**: 구체적 실천 가이드 5가지 (400-500자)
10. **conclusion**: 마무리 격려 메시지 (150-200자)

응답은 반드시 아래 JSON 형식으로만 작성하세요:
{
  "introduction": "...",
  "personalityDeep": "...",
  "careerPath": "...",
  "relationshipDynamics": "...",
  "wealthPotential": "...",
  "healthGuidance": "...",
  "lifeMission": "...",
  "timingAdvice": "...",
  "actionPlan": "...",
  "conclusion": "..."
}`;
  }

  // English version
  return `${themeContext}

${profileInfo}

## Matrix Analysis Results
${matrixSummary}

Write each of the following sections. Each section should have a warm, encouraging tone with practical advice.

### Sections to Write:
1. **introduction**: Overall destiny summary (150-250 words)
2. **personalityDeep**: Deep personality analysis (300-400 words)
3. **careerPath**: Career path & aptitude analysis (300-400 words)
4. **relationshipDynamics**: Relationship dynamics (300-400 words)
5. **wealthPotential**: Wealth potential & financial tendencies (200-300 words)
6. **healthGuidance**: Health guidance (200-300 words)
7. **lifeMission**: Life mission & spiritual growth direction (200-300 words)
8. **timingAdvice**: Important timing & period advice (200-300 words)
9. **actionPlan**: 5 specific action items (300-400 words)
10. **conclusion**: Closing encouragement message (100-150 words)

Response MUST be in this JSON format only:
{
  "introduction": "...",
  "personalityDeep": "...",
  "careerPath": "...",
  "relationshipDynamics": "...",
  "wealthPotential": "...",
  "healthGuidance": "...",
  "lifeMission": "...",
  "timingAdvice": "...",
  "actionPlan": "...",
  "conclusion": "..."
}`;
}

function buildAIPrompt(
  input: MatrixCalculationInput,
  report: FusionReport,
  options: AIReportGenerationOptions
): string {
  const lang = options.lang || 'ko';
  const detailLevel = options.detailLevel || 'detailed';

  const profileInfo = buildProfileInfo(input, options, lang);
  const matrixSummary = buildMatrixSummary(report, lang);
  const focusInstruction = options.focusDomain
    ? (lang === 'ko'
      ? `특히 "${getDomainName(options.focusDomain, lang)}" 영역에 집중하여 분석하세요.`
      : `Focus particularly on the "${getDomainName(options.focusDomain, lang)}" domain.`)
    : '';

  if (lang === 'ko') {
    return `당신은 동양 사주명리학과 서양 점성술을 융합한 전문 운세 상담사입니다.
아래 데이터를 기반으로 깊이 있고 개인화된 운명 분석 리포트를 작성하세요.

${profileInfo}

## 매트릭스 분석 결과
${matrixSummary}

## 요청사항
${focusInstruction}
상세도: ${detailLevel === 'comprehensive' ? '매우 상세' : detailLevel === 'detailed' ? '상세' : '표준'}

다음 섹션들을 각각 작성해주세요. 각 섹션은 따뜻하고 격려하는 톤으로, 실용적인 조언을 포함해야 합니다.

### 작성할 섹션:
1. **introduction**: 전체 운명 요약 (200-300자)
2. **personalityDeep**: 성격 심층 분석 - 일간 오행, 격국, 십신 분포 기반 (400-600자)
3. **careerPath**: 커리어 경로 & 적성 분석 (400-600자)
4. **relationshipDynamics**: 관계 역학 - 연애, 결혼, 대인관계 (400-600자)
5. **wealthPotential**: 재물운 & 재테크 성향 (300-500자)
6. **healthGuidance**: 건강 가이드 - 오행 균형 기반 (300-400자)
7. **lifeMission**: 인생 사명 & 영적 성장 방향 (300-400자)
8. **timingAdvice**: 중요한 시기 & 타이밍 조언 (300-400자)
9. **actionPlan**: 구체적 실천 가이드 5가지 (400-500자)
10. **conclusion**: 마무리 격려 메시지 (150-200자)

응답은 반드시 아래 JSON 형식으로만 작성하세요:
{
  "introduction": "...",
  "personalityDeep": "...",
  "careerPath": "...",
  "relationshipDynamics": "...",
  "wealthPotential": "...",
  "healthGuidance": "...",
  "lifeMission": "...",
  "timingAdvice": "...",
  "actionPlan": "...",
  "conclusion": "..."
}`;
  }

  // English version
  return `You are an expert fortune consultant combining Eastern Saju (Four Pillars) and Western Astrology.
Based on the data below, write a deep and personalized destiny analysis report.

${profileInfo}

## Matrix Analysis Results
${matrixSummary}

## Request
${focusInstruction}
Detail Level: ${detailLevel}

Write each of the following sections. Each section should have a warm, encouraging tone with practical advice.

### Sections to Write:
1. **introduction**: Overall destiny summary (150-250 words)
2. **personalityDeep**: Deep personality analysis based on Day Master, Geokguk, Sibsin (300-400 words)
3. **careerPath**: Career path & aptitude analysis (300-400 words)
4. **relationshipDynamics**: Relationship dynamics - love, marriage, interpersonal (300-400 words)
5. **wealthPotential**: Wealth potential & financial tendencies (200-300 words)
6. **healthGuidance**: Health guidance based on Five Elements balance (200-300 words)
7. **lifeMission**: Life mission & spiritual growth direction (200-300 words)
8. **timingAdvice**: Important timing & period advice (200-300 words)
9. **actionPlan**: 5 specific action items (300-400 words)
10. **conclusion**: Closing encouragement message (100-150 words)

Response MUST be in this JSON format only:
{
  "introduction": "...",
  "personalityDeep": "...",
  "careerPath": "...",
  "relationshipDynamics": "...",
  "wealthPotential": "...",
  "healthGuidance": "...",
  "lifeMission": "...",
  "timingAdvice": "...",
  "actionPlan": "...",
  "conclusion": "..."
}`;
}

function buildProfileInfo(
  input: MatrixCalculationInput,
  options: AIReportGenerationOptions,
  lang: 'ko' | 'en'
): string {
  const dayMasterNames: Record<string, { ko: string; en: string }> = {
    '목': { ko: '목(木) - 나무', en: 'Wood' },
    '화': { ko: '화(火) - 불', en: 'Fire' },
    '토': { ko: '토(土) - 흙', en: 'Earth' },
    '금': { ko: '금(金) - 금속', en: 'Metal' },
    '수': { ko: '수(水) - 물', en: 'Water' },
  };

  const dm = dayMasterNames[input.dayMasterElement] || { ko: input.dayMasterElement, en: input.dayMasterElement };

  if (lang === 'ko') {
    return `## 프로필
- 이름: ${options.name || '미입력'}
- 생년월일: ${options.birthDate || '미입력'}
- 일간(Day Master): ${dm.ko}
- 격국: ${input.geokguk || '미분석'}
- 용신: ${input.yongsin || '미분석'}
- 주요 십신: ${Object.entries(input.sibsinDistribution || {}).map(([k, v]) => `${k}(${v})`).join(', ') || '없음'}
- 신살: ${input.shinsalList?.join(', ') || '없음'}
- 현재 대운 오행: ${input.currentDaeunElement || '미입력'}`;
  }

  return `## Profile
- Name: ${options.name || 'Not provided'}
- Birth Date: ${options.birthDate || 'Not provided'}
- Day Master: ${dm.en}
- Geokguk (Pattern): ${input.geokguk || 'Not analyzed'}
- Yongsin (Favorable Element): ${input.yongsin || 'Not analyzed'}
- Sibsin Distribution: ${Object.entries(input.sibsinDistribution || {}).map(([k, v]) => `${k}(${v})`).join(', ') || 'None'}
- Shinsal: ${input.shinsalList?.join(', ') || 'None'}
- Current Daeun Element: ${input.currentDaeunElement || 'Not provided'}`;
}

function buildMatrixSummary(report: FusionReport, lang: 'ko' | 'en'): string {
  const { overallScore, topInsights, domainAnalysis } = report;

  const insightSummary = topInsights.slice(0, 5).map((insight, i) =>
    `${i + 1}. [${insight.category}] ${insight.title}: ${insight.description}`
  ).join('\n');

  const domainSummary = domainAnalysis?.map(d =>
    `- ${d.domain}: ${d.score}/100 (${d.grade})`
  ).join('\n') || '';

  if (lang === 'ko') {
    return `### 종합 점수: ${overallScore.total}/100 (${overallScore.grade}등급)

### 주요 인사이트:
${insightSummary}

### 도메인별 점수:
${domainSummary}`;
  }

  return `### Overall Score: ${overallScore.total}/100 (Grade ${overallScore.grade})

### Key Insights:
${insightSummary}

### Domain Scores:
${domainSummary}`;
}

function getDomainName(domain: InsightDomain, lang: 'ko' | 'en'): string {
  const names: Record<InsightDomain, { ko: string; en: string }> = {
    personality: { ko: '성격', en: 'Personality' },
    career: { ko: '직업/재능', en: 'Career' },
    relationship: { ko: '관계', en: 'Relationships' },
    wealth: { ko: '재물', en: 'Wealth' },
    health: { ko: '건강', en: 'Health' },
    spirituality: { ko: '영성', en: 'Spirituality' },
    timing: { ko: '타이밍', en: 'Timing' },
  };
  return names[domain]?.[lang] || domain;
}

// ===========================
// AI 백엔드 호출
// ===========================

async function callAIBackend(prompt: string, lang: 'ko' | 'en'): Promise<{
  sections: AIPremiumReport['sections'];
  model: string;
  tokensUsed?: number;
}> {
  const backendUrl = process.env.NEXT_PUBLIC_AI_BACKEND || 'http://127.0.0.1:5000';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const apiToken = process.env.ADMIN_API_TOKEN;
  if (apiToken) {
    headers['X-API-KEY'] = apiToken;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2분 타임아웃

  try {
    const response = await fetch(`${backendUrl}/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt,
        mode: 'premium_report',
        locale: lang,
        max_tokens: 4000,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`AI Backend error: ${response.status}`);
    }

    const data = await response.json();

    // Parse JSON response
    let sections: AIPremiumReport['sections'];
    const responseText = data?.data?.response || data?.response || '';

    try {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        sections = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      // Fallback: use raw text
      sections = {
        introduction: responseText.slice(0, 500),
        personalityDeep: '',
        careerPath: '',
        relationshipDynamics: '',
        wealthPotential: '',
        healthGuidance: '',
        lifeMission: '',
        timingAdvice: '',
        actionPlan: '',
        conclusion: lang === 'ko' ? '행운을 빕니다!' : 'Wishing you the best!',
      };
    }

    return {
      sections,
      model: data?.data?.model || 'gpt-4o',
      tokensUsed: data?.data?.usage?.total_tokens,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ===========================
// 메인 생성 함수
// ===========================

export async function generateAIPremiumReport(
  input: MatrixCalculationInput,
  matrixReport: FusionReport,
  options: AIReportGenerationOptions = {}
): Promise<AIPremiumReport> {
  const startTime = Date.now();
  const lang = options.lang || 'ko';

  // 1. 프롬프트 빌드
  let prompt: string;
  if (options.theme && options.theme !== 'comprehensive') {
    // Themed report: use custom prompt with theme focus
    prompt = buildThemedAIPrompt(input, matrixReport, options.theme, options);
  } else {
    // Comprehensive report: use standard prompt
    prompt = buildAIPrompt(input, matrixReport, options);
  }

  // 2. AI 백엔드 호출
  const { sections, model, tokensUsed } = await callAIBackend(prompt, lang);

  // 3. 리포트 조립
  const report: AIPremiumReport = {
    id: `air_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    generatedAt: new Date().toISOString(),
    lang,

    profile: {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dominantElement: input.dominantWesternElement || input.dayMasterElement,
      geokguk: input.geokguk,
    },

    sections,

    matrixSummary: {
      overallScore: matrixReport.overallScore.total,
      grade: matrixReport.overallScore.grade,
      topInsights: matrixReport.topInsights.slice(0, 3).map(i => i.title),
      keyStrengths: matrixReport.topInsights
        .filter(i => i.category === 'strength')
        .slice(0, 3)
        .map(i => i.title),
      keyChallenges: matrixReport.topInsights
        .filter(i => i.category === 'challenge' || i.category === 'caution')
        .slice(0, 3)
        .map(i => i.title),
    },

    meta: {
      modelUsed: model,
      tokensUsed,
      processingTime: Math.max(1, Date.now() - startTime),
      reportVersion: '1.0.0',
    },
  };

  return report;
}

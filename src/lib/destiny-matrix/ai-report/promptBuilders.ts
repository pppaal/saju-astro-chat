// src/lib/destiny-matrix/ai-report/promptBuilders.ts
// AI 리포트 프롬프트 빌더 함수들

import type { FusionReport, InsightDomain } from '../interpreter/types'
import type { MatrixCalculationInput } from '../types'
import type { AIReportGenerationOptions } from './reportTypes'

// ===========================
// 도메인 이름 매핑
// ===========================

const DOMAIN_NAMES: Record<InsightDomain, { ko: string; en: string }> = {
  personality: { ko: '성격', en: 'Personality' },
  career: { ko: '직업/재능', en: 'Career' },
  relationship: { ko: '관계', en: 'Relationships' },
  wealth: { ko: '재물', en: 'Wealth' },
  health: { ko: '건강', en: 'Health' },
  spirituality: { ko: '영성', en: 'Spirituality' },
  timing: { ko: '타이밍', en: 'Timing' },
}

const DAY_MASTER_NAMES: Record<string, { ko: string; en: string }> = {
  목: { ko: '목(木) - 나무', en: 'Wood' },
  화: { ko: '화(火) - 불', en: 'Fire' },
  토: { ko: '토(土) - 흙', en: 'Earth' },
  금: { ko: '금(金) - 금속', en: 'Metal' },
  수: { ko: '수(水) - 물', en: 'Water' },
}

export function getDomainName(domain: InsightDomain, lang: 'ko' | 'en'): string {
  return DOMAIN_NAMES[domain]?.[lang] || domain
}

// ===========================
// 프로필 정보 빌더
// ===========================

export function buildProfileInfo(
  input: MatrixCalculationInput,
  options: AIReportGenerationOptions,
  lang: 'ko' | 'en'
): string {
  const dm = DAY_MASTER_NAMES[input.dayMasterElement] || {
    ko: input.dayMasterElement,
    en: input.dayMasterElement,
  }

  if (lang === 'ko') {
    return `## 프로필
- 이름: ${options.name || '미입력'}
- 생년월일: ${options.birthDate || '미입력'}
- 일간(Day Master): ${dm.ko}
- 격국: ${input.geokguk || '미분석'}
- 용신: ${input.yongsin || '미분석'}
- 주요 십신: ${
      Object.entries(input.sibsinDistribution || {})
        .map(([k, v]) => `${k}(${v})`)
        .join(', ') || '없음'
    }
- 신살: ${input.shinsalList?.join(', ') || '없음'}
- 현재 대운 오행: ${input.currentDaeunElement || '미입력'}`
  }

  return `## Profile
- Name: ${options.name || 'Not provided'}
- Birth Date: ${options.birthDate || 'Not provided'}
- Day Master: ${dm.en}
- Geokguk (Pattern): ${input.geokguk || 'Not analyzed'}
- Yongsin (Favorable Element): ${input.yongsin || 'Not analyzed'}
- Sibsin Distribution: ${
    Object.entries(input.sibsinDistribution || {})
      .map(([k, v]) => `${k}(${v})`)
      .join(', ') || 'None'
  }
- Shinsal: ${input.shinsalList?.join(', ') || 'None'}
- Current Daeun Element: ${input.currentDaeunElement || 'Not provided'}`
}

// ===========================
// 매트릭스 요약 빌더
// ===========================

export function buildMatrixSummary(report: FusionReport, lang: 'ko' | 'en'): string {
  const { overallScore, topInsights, domainAnalysis } = report

  const insightSummary = topInsights
    .slice(0, 5)
    .map((insight, i) => `${i + 1}. [${insight.category}] ${insight.title}: ${insight.description}`)
    .join('\n')

  const domainSummary =
    domainAnalysis?.map((d) => `- ${d.domain}: ${d.score}/100 (${d.grade})`).join('\n') || ''

  if (lang === 'ko') {
    return `### 종합 점수: ${overallScore.total}/100 (${overallScore.grade}등급)

### 주요 인사이트:
${insightSummary}

### 도메인별 점수:
${domainSummary}`
  }

  return `### Overall Score: ${overallScore.total}/100 (Grade ${overallScore.grade})

### Key Insights:
${insightSummary}

### Domain Scores:
${domainSummary}`
}

// ===========================
// JSON 응답 형식 템플릿
// ===========================

const JSON_RESPONSE_TEMPLATE = `{
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
}`

// ===========================
// 섹션 작성 지침
// ===========================

function getSectionInstructions(lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    return `### 작성할 섹션:
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
${JSON_RESPONSE_TEMPLATE}`
  }

  return `### Sections to Write:
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
${JSON_RESPONSE_TEMPLATE}`
}

// ===========================
// 메인 프롬프트 빌더
// ===========================

export function buildAIPrompt(
  input: MatrixCalculationInput,
  report: FusionReport,
  options: AIReportGenerationOptions
): string {
  const lang = options.lang || 'ko'
  const detailLevel = options.detailLevel || 'detailed'

  const profileInfo = buildProfileInfo(input, options, lang)
  const matrixSummary = buildMatrixSummary(report, lang)
  const focusInstruction = options.focusDomain
    ? lang === 'ko'
      ? `특히 "${getDomainName(options.focusDomain, lang)}" 영역에 집중하여 분석하세요.`
      : `Focus particularly on the "${getDomainName(options.focusDomain, lang)}" domain.`
    : ''

  const sectionInstructions = getSectionInstructions(lang)
  const graphRagEvidencePrompt = options.graphRagEvidencePrompt?.trim()
  const requestedChars =
    typeof options.targetChars === 'number' && Number.isFinite(options.targetChars)
      ? Math.max(2500, Math.min(22000, Math.floor(options.targetChars)))
      : detailLevel === 'comprehensive'
        ? lang === 'ko'
          ? 10000
          : 8000
        : undefined
  const outputStyleInstruction =
    lang === 'ko'
      ? [
          '## 출력 제약',
          requestedChars ? `- 전체 최소 분량: ${requestedChars}자` : '',
          options.bilingual
            ? '- 모든 섹션은 한국어 본문 뒤에 English 버전을 이어서 작성 (한/영 동시 제공).'
            : '',
          options.tone === 'realistic'
            ? '- 과장 금지. 현실적인 조건, 제약, 우선순위를 중심으로 작성.'
            : '',
          '- 각 섹션에서 실행 가능 문장을 포함하고, 근거 없는 단정 표현을 피하세요.',
        ]
          .filter(Boolean)
          .join('\n')
      : [
          '## Output Constraints',
          requestedChars ? `- Minimum total length: ${requestedChars} characters` : '',
          options.bilingual
            ? '- Provide both Korean and English for each section (Korean first, then English).'
            : '',
          options.tone === 'realistic'
            ? '- Avoid hype. Prioritize realistic constraints, tradeoffs, and next actions.'
            : '',
          '- Include actionable statements and avoid unsupported absolute claims.',
        ]
          .filter(Boolean)
          .join('\n')

  if (lang === 'ko') {
    return `당신은 동양 사주명리학과 서양 점성술을 융합한 전문 운세 상담사입니다.
아래 데이터를 기반으로 깊이 있고 개인화된 운명 분석 리포트를 작성하세요.

${profileInfo}

## 매트릭스 분석 결과
${matrixSummary}

${graphRagEvidencePrompt ? `## GraphRAG 근거 앵커\n${graphRagEvidencePrompt}\n` : ''}
${outputStyleInstruction}

## 요청사항
${focusInstruction}
상세도: ${detailLevel === 'comprehensive' ? '매우 상세' : detailLevel === 'detailed' ? '상세' : '표준'}

다음 섹션들을 각각 작성해주세요. 각 섹션은 따뜻하고 격려하는 톤으로, 실용적인 조언을 포함해야 합니다.

${sectionInstructions}`
  }

  return `You are an expert fortune consultant combining Eastern Saju (Four Pillars) and Western Astrology.
Based on the data below, write a deep and personalized destiny analysis report.

${profileInfo}

## Matrix Analysis Results
${matrixSummary}

${graphRagEvidencePrompt ? `## GraphRAG Evidence Anchors\n${graphRagEvidencePrompt}\n` : ''}
${outputStyleInstruction}

## Request
${focusInstruction}
Detail Level: ${detailLevel}

Write each of the following sections. Each section should have a warm, encouraging tone with practical advice.

${sectionInstructions}`
}

/**
 * Builds themed AI prompt with specific focus areas
 * @deprecated Use buildThemedPrompt from themedPrompts.ts for proper themed reports
 */
export function buildThemedAIPrompt(
  input: MatrixCalculationInput,
  report: FusionReport,
  _theme: string,
  options: AIReportGenerationOptions
): string {
  const lang = options.lang || 'ko'

  const profileInfo = buildProfileInfo(input, options, lang)
  const matrixSummary = buildMatrixSummary(report, lang)
  const sectionInstructions = getSectionInstructions(lang)
  const graphRagEvidencePrompt = options.graphRagEvidencePrompt?.trim()

  if (lang === 'ko') {
    return `
${profileInfo}

## 매트릭스 분석 결과
${matrixSummary}

${graphRagEvidencePrompt ? `## GraphRAG 근거 앵커\n${graphRagEvidencePrompt}\n` : ''}

다음 섹션들을 각각 작성해주세요. 각 섹션은 따뜻하고 격려하는 톤으로, 실용적인 조언을 포함해야 합니다.

${sectionInstructions}`
  }

  return `
${profileInfo}

## Matrix Analysis Results
${matrixSummary}

${graphRagEvidencePrompt ? `## GraphRAG Evidence Anchors\n${graphRagEvidencePrompt}\n` : ''}

Write each of the following sections. Each section should have a warm, encouraging tone with practical advice.

${sectionInstructions}`
}

import type { AIUserPlan } from './reportTypes'

export function buildNarrativeStyleRepairInstruction(
  lang: 'ko' | 'en',
  listStylePaths: string[]
): string {
  if (lang === 'ko') {
    return [
      '',
      '중요: 현재 문체가 항목형/불릿형으로 감지되었습니다.',
      listStylePaths.length > 0 ? `서사형으로 재작성할 섹션: ${listStylePaths.join(', ')}` : '',
      '반드시 문단형 서사로 재작성하세요. 번호/불릿/체크리스트(1., -, •, ✅ 등)는 금지합니다.',
      '각 섹션은 최소 6문장으로 연결감 있게 작성하고, 실제 상황 예시와 실행 맥락을 함께 포함하세요.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    '',
    'IMPORTANT: List-like style detected.',
    listStylePaths.length > 0
      ? `Rewrite these sections in narrative prose: ${listStylePaths.join(', ')}`
      : '',
    'Rewrite using paragraph narrative only. Do not use bullets, numbering, or checklist style.',
    'Each section should be at least 6 connected sentences with realistic context and actionable framing.',
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildAntiRepetitionInstruction(
  lang: 'ko' | 'en',
  repetitivePaths: string[]
): string {
  if (lang === 'ko') {
    return [
      '',
      '중요: 반복 문장이 감지되었습니다.',
      repetitivePaths.length > 0 ? `반복 제거가 필요한 섹션: ${repetitivePaths.join(', ')}` : '',
      '같은 문장 구조/표현을 반복하지 말고, 각 문단마다 새로운 근거와 다른 사례를 사용하세요.',
      '“이 구간은 …” 같은 템플릿 문장 반복을 금지하고 자연스러운 서술로 다시 작성하세요.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    '',
    'IMPORTANT: Repetitive sentences detected.',
    repetitivePaths.length > 0
      ? `Sections needing dedup rewrite: ${repetitivePaths.join(', ')}`
      : '',
    'Do not repeat sentence templates. Rewrite in natural narrative with new evidence and varied phrasing.',
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildNarrativeRewritePrompt(
  lang: 'ko' | 'en',
  sections: Record<string, unknown>,
  options: {
    minCharsPerSection: number
    minTotalChars: number
    requiredTimingSections: string[]
  }
): string {
  const json = JSON.stringify(sections, null, 2)
  if (lang === 'ko') {
    return [
      'You are a premium Korean copy editor for destiny reports.',
      'Rewrite the JSON text to be vivid, elegant, and human while preserving every fact.',
      'Hard rules:',
      '- Keep section keys unchanged.',
      '- No bullets or numbering; paragraph prose only.',
      '- No new facts, entities, dates, or predictions.',
      '- Keep factual meaning exactly the same.',
      '- Avoid repetitive template openings and repetitive endings.',
      '- Avoid bureaucratic wording: 영역, 구간, 프로토콜, 운영, 핵심은.',
      '- Use natural Korean with varied sentence rhythm and readable flow.',
      '- Add one concrete everyday scene per section without inventing facts.',
      `- Minimum ${options.minCharsPerSection} chars per section.`,
      `- Minimum ${options.minTotalChars} chars total.`,
      `- In ${options.requiredTimingSections.join(', ')}, include timing grounding at least once.`,
      '- Keep practical and realistic action framing; no hype and no absolutes.',
      'Return JSON only:',
      '```json',
      json,
      '```',
    ].join('\n')
  }
  return [
    'You are a premium narrative editor for destiny reports.',
    'Rewrite the JSON sections with vivid, elegant prose while preserving meaning exactly.',
    'Rules:',
    '- Do not change section keys.',
    '- No bullets/numbering; paragraph narrative only.',
    '- No new facts/entities/dates/predictions.',
    '- Avoid repeated sentence templates and repetitive openers.',
    '- Avoid bureaucratic wording.',
    '- Add one concrete everyday scene per section without adding new facts.',
    `- Keep at least ${options.minCharsPerSection} chars per section.`,
    `- Keep at least ${options.minTotalChars} chars total.`,
    `- In ${options.requiredTimingSections.join(', ')}, include timing grounding with Daeun/Seun/Wolun/Iljin/transit at least once.`,
    '- Keep practical actions; avoid hype and absolute claims.',
    'Return JSON only:',
    '```json',
    json,
    '```',
  ].join('\n')
}

export function buildDepthRepairInstruction(
  lang: 'ko' | 'en',
  sectionPaths: string[],
  shortPaths: string[],
  minCharsPerSection: number,
  minTotalChars: number
): string {
  const allPaths = sectionPaths.join(', ')
  const shortList = shortPaths.join(', ')
  if (lang === 'ko') {
    return [
      '',
      '중요: 리포트가 짧거나 일반론적입니다. 아래 기준을 만족하도록 전체를 다시 작성해 주세요.',
      `필수 섹션: ${allPaths}`,
      `각 섹션 최소 길이: ${minCharsPerSection}자, 전체 최소 길이: ${minTotalChars}자`,
      shortPaths.length > 0 ? `특히 보강이 필요한 섹션: ${shortList}` : '',
      '각 섹션은 반드시 1) 핵심 해석 2) 근거 3) 생활 적용 4) 주의 포인트를 문장형으로 포함해 주세요.',
      '어려운 용어를 쓰면 바로 뒤에 쉬운 한국어 설명을 붙여 주세요.',
      '리스트 대신 서술형 문단으로 작성해 주세요.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  return [
    '',
    'IMPORTANT: The report is too short or generic. Rewrite all sections with stronger depth.',
    `Required sections: ${allPaths}`,
    `Minimum length: ${minCharsPerSection} chars per section, ${minTotalChars} chars total`,
    shortPaths.length > 0 ? `Sections needing expansion: ${shortList}` : '',
    'Each section must include: key interpretation, evidence, practical application, and caution point.',
    'If technical terms are used, add plain-language explanations right after them.',
    'Use paragraph-style narrative, not bullet points.',
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildSecondPassInstruction(lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    return [
      '',
      '2차 보강 지시: 여전히 밀도가 부족하면 각 섹션을 최소 6문장으로 확장해 주세요.',
      '각 섹션에 반드시 실전 예시 1개와 실행 순서(오늘-이번주-이번달)를 포함해 주세요.',
      '추상적 미사여구 대신 행동 가능한 문장으로 작성해 주세요.',
    ].join('\n')
  }
  return [
    '',
    'Second-pass rewrite: if depth is still weak, expand each section to at least 6 sentences.',
    'Include one practical example and execution sequence (today-this week-this month) in each section.',
    'Prefer concrete action-oriented language over abstract filler.',
  ].join('\n')
}

export function buildActionRepairInstruction(
  lang: 'ko' | 'en',
  ratio: number,
  targetRatio: number,
  missingPaths: string[]
): string {
  if (lang === 'ko') {
    return [
      '',
      `중요: 실행 문장 비율이 낮습니다. 현재=${Math.round(ratio * 100)}%, 목표=${Math.round(targetRatio * 100)}%`,
      missingPaths.length > 0 ? `보강이 필요한 섹션: ${missingPaths.join(', ')}` : '',
      '각 핵심 섹션마다 반드시 오늘-이번주-이번달 순서의 실행 문장(행동 지시) 최소 2개를 넣어 주세요.',
      '추상적 위로 문장 대신 실제 행동 가능한 문장을 사용해 주세요.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    '',
    `IMPORTANT: Actionable sentence coverage is low. current=${Math.round(ratio * 100)}%, target=${Math.round(targetRatio * 100)}%`,
    missingPaths.length > 0 ? `Sections needing action steps: ${missingPaths.join(', ')}` : '',
    'Each core section must include at least 2 concrete action sentences using a today-this week-this month sequence.',
    'Replace abstract comfort with executable guidance.',
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildCrossRepairInstruction(lang: 'ko' | 'en', missing: string[]): string {
  const list = missing.join(', ')
  if (lang === 'ko') {
    return [
      '',
      '중요: 아래 섹션에서 사주/점성 교차 근거가 누락되었습니다.',
      `누락 섹션: ${list}`,
      '각 누락 섹션에 반드시 포함: 사주 근거 1문장 + 점성 근거 1문장 + 교차 결론 1문장 + 실용 행동 2문장.',
      '문장형 존댓말만 사용하고 리스트/이모지/제목 표기는 금지합니다.',
    ].join('\n')
  }
  return [
    '',
    'IMPORTANT: Cross-basis is missing in the following sections.',
    `Missing sections: ${list}`,
    'Each missing section must include: 1 Saju basis sentence + 1 Astrology basis sentence + 1 cross conclusion sentence + 2 practical action sentences.',
    'Use sentence-form only. No lists, emojis, or headings.',
  ].join('\n')
}

export function buildEvidenceRepairInstruction(
  lang: 'ko' | 'en',
  ratio: number,
  targetRatio: number,
  missingPaths: string[]
): string {
  if (lang === 'ko') {
    return [
      '',
      `중요: 근거 트리플(사주+점성+교차) 비율이 낮습니다. 현재=${Math.round(ratio * 100)}%, 목표=${Math.round(targetRatio * 100)}%`,
      missingPaths.length > 0 ? `보강이 필요한 섹션: ${missingPaths.join(', ')}` : '',
      '각 핵심 섹션에서 반드시 사주 근거 1문장 + 점성 근거 1문장 + 교차 결론 1문장을 포함해 주세요.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    '',
    `IMPORTANT: Evidence triplet coverage (Saju+Astrology+Cross) is low. current=${Math.round(ratio * 100)}%, target=${Math.round(targetRatio * 100)}%`,
    missingPaths.length > 0 ? `Sections needing evidence triplet: ${missingPaths.join(', ')}` : '',
    'For each core section include 1 Saju basis sentence + 1 Astrology basis sentence + 1 cross conclusion sentence.',
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildCrossCoverageRepairInstruction(
  lang: 'ko' | 'en',
  ratio: number,
  targetRatio: number
): string {
  if (lang === 'ko') {
    return [
      '',
      `중요: 사주+점성 교차 서술 비율이 낮습니다. 현재=${Math.round(ratio * 100)}%, 목표=${Math.round(targetRatio * 100)}%`,
      '각 핵심 섹션마다 사주 근거 1문장 + 점성 근거 1문장 + 교차 결론 1문장을 반드시 포함해 주세요.',
      '단순 일반론을 줄이고, 근거어(사주/점성/하우스/대운/트랜짓)를 문장에 명시해 주세요.',
    ].join('\n')
  }
  return [
    '',
    `IMPORTANT: Cross-basis narrative coverage is low. current=${Math.round(ratio * 100)}%, target=${Math.round(targetRatio * 100)}%`,
    'For each core section include: 1 Saju basis sentence + 1 Astrology basis sentence + 1 cross conclusion sentence.',
    'Avoid generic filler and explicitly mention grounding terms (saju/astrology/house/daeun/transit).',
  ].join('\n')
}

export function buildTimingRepairInstruction(
  lang: 'ko' | 'en',
  ratio: number,
  targetRatio: number,
  missingPaths: string[]
): string {
  if (lang === 'ko') {
    return [
      '',
      `중요: 타이밍 근거(대운/세운/월운/일진/트랜짓) 반영 비율이 낮습니다. 현재=${Math.round(ratio * 100)}%, 목표=${Math.round(targetRatio * 100)}%`,
      missingPaths.length > 0 ? `보강이 필요한 섹션: ${missingPaths.join(', ')}` : '',
      '각 보강 섹션에서 반드시 다음을 명시해 주세요: 현재 대운 1문장, 세운/월운/일진 중 2개 이상 1문장, 점성 트랜짓/행성 타이밍 1문장, 실제 실행 시점 1문장.',
      '타이밍은 반드시 절대 표현으로 써 주세요(오늘/이번주/이번달 + 구체 시점).',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    '',
    `IMPORTANT: Timing grounding coverage is low. current=${Math.round(ratio * 100)}%, target=${Math.round(targetRatio * 100)}%`,
    missingPaths.length > 0 ? `Sections needing timing grounding: ${missingPaths.join(', ')}` : '',
    'For each missing section include: 1 current Daeun sentence, 1 sentence using at least two of Seun/Wolun/Iljin, 1 transit timing sentence, and 1 execution timing sentence.',
    'Use explicit timing language (today/this week/this month + concrete windows).',
  ]
    .filter(Boolean)
    .join('\n')
}

export function getMaxRepairPassesByPlan(plan?: AIUserPlan): number {
  switch (plan) {
    case 'premium':
      return 3
    case 'pro':
      return 3
    case 'starter':
      return 2
    case 'free':
    default:
      return 2
  }
}

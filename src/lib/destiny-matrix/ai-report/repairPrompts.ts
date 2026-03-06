import type { AIUserPlan } from './reportTypes'

export function buildNarrativeStyleRepairInstruction(
  lang: 'ko' | 'en',
  listStylePaths: string[]
): string {
  if (lang === 'ko') {
    return [
      '',
      'ì¤‘ìš”: í˜„ìž¬ ë¬¸ì²´ê°€ í•­ëª©í˜•/ë¶ˆë¦¿í˜•ìœ¼ë¡œ ê°ì§€ë˜ì—ˆìŠµë‹ˆë‹¤.',
      listStylePaths.length > 0
        ? `ì„œì‚¬í˜•ìœ¼ë¡œ ìž¬ìž‘ì„±í•  ì„¹ì…˜: ${listStylePaths.join(', ')}`
        : '',
      'ë°˜ë“œì‹œ ë¬¸ë‹¨í˜• ì„œì‚¬ë¡œ ìž¬ìž‘ì„±í•˜ì„¸ìš”. ë²ˆí˜¸/ë¶ˆë¦¿/ì²´í¬ë¦¬ìŠ¤íŠ¸(1., -, â€¢, âœ… ë“±)ëŠ” ê¸ˆì§€í•©ë‹ˆë‹¤.',
      'ê° ì„¹ì…˜ì€ ìµœì†Œ 6ë¬¸ìž¥ìœ¼ë¡œ ì—°ê²°ê° ìžˆê²Œ ìž‘ì„±í•˜ê³ , ì‹¤ì œ ìƒí™© ì˜ˆì‹œì™€ ì‹¤í–‰ ë§¥ë½ì„ í•¨ê»˜ í¬í•¨í•˜ì„¸ìš”.',
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
      'ì¤‘ìš”: ë°˜ë³µ ë¬¸ìž¥ì´ ê°ì§€ë˜ì—ˆìŠµë‹ˆë‹¤.',
      repetitivePaths.length > 0
        ? `ë°˜ë³µ ì œê±°ê°€ í•„ìš”í•œ ì„¹ì…˜: ${repetitivePaths.join(', ')}`
        : '',
      'ê°™ì€ ë¬¸ìž¥ êµ¬ì¡°/í‘œí˜„ì„ ë°˜ë³µí•˜ì§€ ë§ê³ , ê° ë¬¸ë‹¨ë§ˆë‹¤ ìƒˆë¡œìš´ ê·¼ê±°ì™€ ë‹¤ë¥¸ ì‚¬ë¡€ë¥¼ ì‚¬ìš©í•˜ì„¸ìš”.',
      'â€œì´ êµ¬ê°„ì€ â€¦â€ ê°™ì€ í…œí”Œë¦¿ ë¬¸ìž¥ ë°˜ë³µì„ ê¸ˆì§€í•˜ê³  ìžì—°ìŠ¤ëŸ¬ìš´ ì„œìˆ ë¡œ ë‹¤ì‹œ ìž‘ì„±í•˜ì„¸ìš”.',
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
      'ì¤‘ìš”: ë¦¬í¬íŠ¸ê°€ ì§§ê±°ë‚˜ ì¼ë°˜ë¡ ì ìž…ë‹ˆë‹¤. ì•„ëž˜ ê¸°ì¤€ì„ ë§Œì¡±í•˜ë„ë¡ ì „ì²´ë¥¼ ë‹¤ì‹œ ìž‘ì„±í•´ ì£¼ì„¸ìš”.',
      `í•„ìˆ˜ ì„¹ì…˜: ${allPaths}`,
      `ê° ì„¹ì…˜ ìµœì†Œ ê¸¸ì´: ${minCharsPerSection}ìž, ì „ì²´ ìµœì†Œ ê¸¸ì´: ${minTotalChars}ìž`,
      shortPaths.length > 0 ? `íŠ¹ížˆ ë³´ê°•ì´ í•„ìš”í•œ ì„¹ì…˜: ${shortList}` : '',
      'ê° ì„¹ì…˜ì€ ë°˜ë“œì‹œ 1) í•µì‹¬ í•´ì„ 2) ê·¼ê±° 3) ìƒí™œ ì ìš© 4) ì£¼ì˜ í¬ì¸íŠ¸ë¥¼ ë¬¸ìž¥í˜•ìœ¼ë¡œ í¬í•¨í•´ ì£¼ì„¸ìš”.',
      'ì–´ë ¤ìš´ ìš©ì–´ë¥¼ ì“°ë©´ ë°”ë¡œ ë’¤ì— ì‰¬ìš´ í•œêµ­ì–´ ì„¤ëª…ì„ ë¶™ì—¬ ì£¼ì„¸ìš”.',
      'ë¦¬ìŠ¤íŠ¸ ëŒ€ì‹  ì„œìˆ í˜• ë¬¸ë‹¨ìœ¼ë¡œ ìž‘ì„±í•´ ì£¼ì„¸ìš”.',
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
      '2ì°¨ ë³´ê°• ì§€ì‹œ: ì—¬ì „ížˆ ë°€ë„ê°€ ë¶€ì¡±í•˜ë©´ ê° ì„¹ì…˜ì„ ìµœì†Œ 6ë¬¸ìž¥ìœ¼ë¡œ í™•ìž¥í•´ ì£¼ì„¸ìš”.',
      'ê° ì„¹ì…˜ì— ë°˜ë“œì‹œ ì‹¤ì „ ì˜ˆì‹œ 1ê°œì™€ ì‹¤í–‰ ìˆœì„œ(ì˜¤ëŠ˜-ì´ë²ˆì£¼-ì´ë²ˆë‹¬)ë¥¼ í¬í•¨í•´ ì£¼ì„¸ìš”.',
      'ì¶”ìƒì  ë¯¸ì‚¬ì—¬êµ¬ ëŒ€ì‹  í–‰ë™ ê°€ëŠ¥í•œ ë¬¸ìž¥ìœ¼ë¡œ ìž‘ì„±í•´ ì£¼ì„¸ìš”.',
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
      `ì¤‘ìš”: ì‹¤í–‰ ë¬¸ìž¥ ë¹„ìœ¨ì´ ë‚®ìŠµë‹ˆë‹¤. í˜„ìž¬=${Math.round(ratio * 100)}%, ëª©í‘œ=${Math.round(targetRatio * 100)}%`,
      missingPaths.length > 0 ? `ë³´ê°•ì´ í•„ìš”í•œ ì„¹ì…˜: ${missingPaths.join(', ')}` : '',
      'ê° í•µì‹¬ ì„¹ì…˜ë§ˆë‹¤ ë°˜ë“œì‹œ ì˜¤ëŠ˜-ì´ë²ˆì£¼-ì´ë²ˆë‹¬ ìˆœì„œì˜ ì‹¤í–‰ ë¬¸ìž¥(í–‰ë™ ì§€ì‹œ) ìµœì†Œ 2ê°œë¥¼ ë„£ì–´ ì£¼ì„¸ìš”.',
      'ì¶”ìƒì  ìœ„ë¡œ ë¬¸ìž¥ ëŒ€ì‹  ì‹¤ì œ í–‰ë™ ê°€ëŠ¥í•œ ë¬¸ìž¥ì„ ì‚¬ìš©í•´ ì£¼ì„¸ìš”.',
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
      'ì¤‘ìš”: ì•„ëž˜ ì„¹ì…˜ì—ì„œ ì‚¬ì£¼/ì ì„± êµì°¨ ê·¼ê±°ê°€ ëˆ„ë½ë˜ì—ˆìŠµë‹ˆë‹¤.',
      `ëˆ„ë½ ì„¹ì…˜: ${list}`,
      'ê° ëˆ„ë½ ì„¹ì…˜ì— ë°˜ë“œì‹œ í¬í•¨: ì‚¬ì£¼ ê·¼ê±° 1ë¬¸ìž¥ + ì ì„± ê·¼ê±° 1ë¬¸ìž¥ + êµì°¨ ê²°ë¡  1ë¬¸ìž¥ + ì‹¤ìš© í–‰ë™ 2ë¬¸ìž¥.',
      'ë¬¸ìž¥í˜• ì¡´ëŒ“ë§ë§Œ ì‚¬ìš©í•˜ê³  ë¦¬ìŠ¤íŠ¸/ì´ëª¨ì§€/ì œëª© í‘œê¸°ëŠ” ê¸ˆì§€í•©ë‹ˆë‹¤.',
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
      `ì¤‘ìš”: ê·¼ê±° íŠ¸ë¦¬í”Œ(ì‚¬ì£¼+ì ì„±+êµì°¨) ë¹„ìœ¨ì´ ë‚®ìŠµë‹ˆë‹¤. í˜„ìž¬=${Math.round(ratio * 100)}%, ëª©í‘œ=${Math.round(targetRatio * 100)}%`,
      missingPaths.length > 0 ? `ë³´ê°•ì´ í•„ìš”í•œ ì„¹ì…˜: ${missingPaths.join(', ')}` : '',
      'ê° í•µì‹¬ ì„¹ì…˜ì—ì„œ ë°˜ë“œì‹œ ì‚¬ì£¼ ê·¼ê±° 1ë¬¸ìž¥ + ì ì„± ê·¼ê±° 1ë¬¸ìž¥ + êµì°¨ ê²°ë¡  1ë¬¸ìž¥ì„ í¬í•¨í•´ ì£¼ì„¸ìš”.',
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
      `ì¤‘ìš”: ì‚¬ì£¼+ì ì„± êµì°¨ ì„œìˆ  ë¹„ìœ¨ì´ ë‚®ìŠµë‹ˆë‹¤. í˜„ìž¬=${Math.round(ratio * 100)}%, ëª©í‘œ=${Math.round(targetRatio * 100)}%`,
      'ê° í•µì‹¬ ì„¹ì…˜ë§ˆë‹¤ ì‚¬ì£¼ ê·¼ê±° 1ë¬¸ìž¥ + ì ì„± ê·¼ê±° 1ë¬¸ìž¥ + êµì°¨ ê²°ë¡  1ë¬¸ìž¥ì„ ë°˜ë“œì‹œ í¬í•¨í•´ ì£¼ì„¸ìš”.',
      'ë‹¨ìˆœ ì¼ë°˜ë¡ ì„ ì¤„ì´ê³ , ê·¼ê±°ì–´(ì‚¬ì£¼/ì ì„±/í•˜ìš°ìŠ¤/ëŒ€ìš´/íŠ¸ëžœì§“)ë¥¼ ë¬¸ìž¥ì— ëª…ì‹œí•´ ì£¼ì„¸ìš”.',
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
      `ì¤‘ìš”: íƒ€ì´ë° ê·¼ê±°(ëŒ€ìš´/ì„¸ìš´/ì›”ìš´/ì¼ì§„/íŠ¸ëžœì§“) ë°˜ì˜ ë¹„ìœ¨ì´ ë‚®ìŠµë‹ˆë‹¤. í˜„ìž¬=${Math.round(ratio * 100)}%, ëª©í‘œ=${Math.round(targetRatio * 100)}%`,
      missingPaths.length > 0 ? `ë³´ê°•ì´ í•„ìš”í•œ ì„¹ì…˜: ${missingPaths.join(', ')}` : '',
      'ê° ë³´ê°• ì„¹ì…˜ì—ì„œ ë°˜ë“œì‹œ ë‹¤ìŒì„ ëª…ì‹œí•´ ì£¼ì„¸ìš”: í˜„ìž¬ ëŒ€ìš´ 1ë¬¸ìž¥, ì„¸ìš´/ì›”ìš´/ì¼ì§„ ì¤‘ 2ê°œ ì´ìƒ 1ë¬¸ìž¥, ì ì„± íŠ¸ëžœì§“/í–‰ì„± íƒ€ì´ë° 1ë¬¸ìž¥, ì‹¤ì œ ì‹¤í–‰ ì‹œì  1ë¬¸ìž¥.',
      'íƒ€ì´ë°ì€ ë°˜ë“œì‹œ ì ˆëŒ€ í‘œí˜„ìœ¼ë¡œ ì¨ ì£¼ì„¸ìš”(ì˜¤ëŠ˜/ì´ë²ˆì£¼/ì´ë²ˆë‹¬ + êµ¬ì²´ ì‹œì ).',
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

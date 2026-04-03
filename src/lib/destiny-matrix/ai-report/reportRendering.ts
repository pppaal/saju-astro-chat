type JsonLike = Record<string, unknown>

type ProjectionBlocks = {
  structure?: ProjectionBlock
  timing?: ProjectionBlock
  conflict?: ProjectionBlock
  action?: ProjectionBlock
  risk?: ProjectionBlock
  evidence?: ProjectionBlock
  branches?: ProjectionBlock
}

type ProjectionBlock = {
  headline?: string
  summary?: string
  topAxes?: string[]
  window?: string
  granularity?: string
  reasons?: string[]
  detailLines?: string[]
  drivers?: string[]
  counterweights?: string[]
  nextMoves?: string[]
}

type MatrixViewRow = {
  label?: string
  cells?: Array<{
    summary?: string
  }>
}

type SingleUserModel = {
  subject?: string
  facets?: Array<{
    label?: string
    summary?: string
    details?: string[]
  }>
}

type BranchSet = Array<{
  label?: string
  summary?: string
  entry?: string[]
  abort?: string[]
  sustain?: string[]
  reversalRisk?: string
}>

type SingleSubjectView = {
  directAnswer?: string
  nextMove?: string
  actionAxis?: {
    nowAction?: string
    whyThisFirst?: string
  }
  riskAxis?: {
    warning?: string
    hardStops?: string[]
  }
  timingState?: {
    bestWindow?: string
    whyNow?: string
    whyNotYet?: string
  }
  branches?: Array<{
    label?: string
    summary?: string
    entryConditions?: string[]
    abortConditions?: string[]
    nextMove?: string
  }>
}

type RenderExtras = {
  matrixView?: MatrixViewRow[]
  singleUserModel?: SingleUserModel
  branchSet?: BranchSet
  singleSubjectView?: SingleSubjectView
}

function toText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v : ''))
      .join('\n')
      .trim()
  }
  return ''
}

function readPath(data: JsonLike, path: string): string {
  const parts = path.split('.')
  let cur: unknown = data
  for (const part of parts) {
    if (!cur || typeof cur !== 'object') return ''
    cur = (cur as JsonLike)[part]
  }
  return toText(cur)
}

function getProjectionLabels(lang: 'ko' | 'en') {
  return lang === 'ko'
    ? {
        structure: '지금 읽히는 기본 흐름',
        timing: '타이밍 요약',
        conflict: '걸림돌',
        action: '지금 먼저 할 일',
        risk: '주의할 변수',
        evidence: '왜 이렇게 읽히는가',
        branches: '현실적으로 가능한 경로',
        topAxes: '핵심 배경',
        drivers: '힘이 실리는 이유',
        counterweights: '발목을 잡는 요소',
        nextMoves: '지금 맞는 다음 움직임',
        evidencePrefix: '근거',
        section: '섹션',
        matrix: '도메인별 흐름 비교',
        singleUser: '인생 구조 요약',
        branchSet: '현실 경로',
      }
    : {
        structure: 'Structure View',
        timing: 'Timing View',
        conflict: 'Conflict View',
        action: 'Action View',
        risk: 'Risk View',
        evidence: 'Evidence View',
        branches: 'Branch View',
        topAxes: 'Top axes',
        drivers: 'Drivers',
        counterweights: 'Counterweights',
        nextMoves: 'Next moves',
        evidencePrefix: 'Evidence',
        section: 'Section',
        matrix: 'Domain-Time Matrix',
        singleUser: 'Single-Subject Facets',
        branchSet: 'Plausible Branches',
      }
}

function normalizeProjectionHeadline(headline: string | undefined, fallback: string): string {
  const value = String(headline || '').trim()
  if (!value) return fallback
  if (/\?{2,}|�/.test(value)) return fallback
  return value
}

function normalizeRenderLine(value: string | undefined): string {
  return String(value || '')
    .replace(/\?{2,}/g, '')
    .replace(/\bcontract negotiation\b/gi, '조건 협상')
    .replace(/\bspecialist track\b/gi, '전문화 트랙')
    .replace(/\bpromotion review\b/gi, '승진 검토')
    .replace(/\bList promotion criteria\b/gi, '승진 판단 기준을 정리하기')
    .replace(/\bList leverage points\b/gi, '협상 포인트를 정리하기')
    .replace(/\bName your narrow edge\b/gi, '자신의 전문 포지션을 명확히 하기')
    .replace(
      /\bstayed secondary because total support remained below the winner\b/gi,
      '승자축보다 지지가 약해 보조축에 머물렀습니다'
    )
    .replace(
      /\bExpansion without role clarity can create delivery strain\.?\b/gi,
      '역할과 범위가 불분명하면 실행 부담이 커질 수 있습니다'
    )
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function renderProjectionExtras(
  projection: ProjectionBlock | null | undefined,
  labels: ReturnType<typeof getProjectionLabels>,
  bulletPrefix = '- '
): string[] {
  if (!projection) return []
  const lines: string[] = []
  if ((projection.detailLines || []).length > 0) {
    lines.push(...(projection.detailLines || []).slice(0, 3))
  }
  if ((projection.drivers || []).length > 0) {
    lines.push(`${labels.drivers}: ${(projection.drivers || []).slice(0, 4).join(', ')}`)
  }
  if ((projection.counterweights || []).length > 0) {
    lines.push(
      `${labels.counterweights}: ${(projection.counterweights || []).slice(0, 3).join(', ')}`
    )
  }
  if ((projection.nextMoves || []).length > 0) {
    lines.push(`${labels.nextMoves}: ${(projection.nextMoves || []).slice(0, 3).join(', ')}`)
  }
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) =>
      index === 0 && !line.startsWith(bulletPrefix) ? line : `${bulletPrefix}${line}`
    )
}

function formatRenderedSectionText(text: string, lang: 'ko' | 'en'): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed

  if (lang === 'ko') {
    const match = trimmed.match(/^(.*?)(?:\s*)핵심 근거는\s*([^.!?\n]+)\s*입니다\.?$/su)
    if (!match) return trimmed
    const body = match[1].trim()
    const evidence = match[2].trim()
    return `${body}\n\n근거: ${evidence}`.trim()
  }

  const match = trimmed.match(/^(.*?)(?:\s*)Key grounding comes from\s*([^.!?\n]+)\.?$/su)
  if (!match) return trimmed
  const body = match[1].trim()
  const evidence = match[2].trim()
  return `${body}\n\nEvidence: ${evidence}`.trim()
}

export function renderProjectionBlocksAsText(
  projections: ProjectionBlocks | null | undefined,
  lang: 'ko' | 'en' = 'ko',
  extras?: RenderExtras
): string {
  if (!projections) return ''

  const labels = getProjectionLabels(lang)
  const blocks = [
    projections.structure
      ? [
          normalizeProjectionHeadline(projections.structure.headline, labels.structure),
          projections.structure.summary || '',
          (projections.structure.topAxes || []).length > 0
            ? `${labels.topAxes}: ${(projections.structure.topAxes || []).join(', ')}`
            : '',
          ...renderProjectionExtras(projections.structure, labels),
        ]
          .filter(Boolean)
          .join('\n')
      : '',
    projections.timing
      ? [
          normalizeProjectionHeadline(projections.timing.headline, labels.timing),
          projections.timing.summary || '',
          [projections.timing.window, projections.timing.granularity].filter(Boolean).join(' / '),
          ...renderProjectionExtras(projections.timing, labels),
        ]
          .filter(Boolean)
          .join('\n')
      : '',
    projections.conflict
      ? [
          normalizeProjectionHeadline(projections.conflict.headline, labels.conflict),
          projections.conflict.summary || '',
          ...renderProjectionExtras(projections.conflict, labels),
          ...(projections.conflict.reasons || []).slice(0, 3).map((item) => `- ${item}`),
        ]
          .filter(Boolean)
          .join('\n')
      : '',
    projections.action
      ? [
          normalizeProjectionHeadline(projections.action.headline, labels.action),
          projections.action.summary || '',
          ...renderProjectionExtras(projections.action, labels),
          ...(projections.action.reasons || []).slice(0, 3).map((item) => `- ${item}`),
        ]
          .filter(Boolean)
          .join('\n')
      : '',
    projections.risk
      ? [
          normalizeProjectionHeadline(projections.risk.headline, labels.risk),
          projections.risk.summary || '',
          ...renderProjectionExtras(projections.risk, labels),
          ...(projections.risk.reasons || []).slice(0, 3).map((item) => `- ${item}`),
        ]
          .filter(Boolean)
          .join('\n')
      : '',
    projections.evidence
      ? [
          normalizeProjectionHeadline(projections.evidence.headline, labels.evidence),
          projections.evidence.summary || '',
          ...renderProjectionExtras(projections.evidence, labels),
          ...(projections.evidence.reasons || []).slice(0, 4).map((item) => `- ${item}`),
        ]
          .filter(Boolean)
          .join('\n')
      : '',
    projections.branches
      ? [
          normalizeProjectionHeadline(projections.branches.headline, labels.branches),
          projections.branches.summary || '',
          [projections.branches.window, projections.branches.granularity]
            .filter(Boolean)
            .join(' / '),
          ...renderProjectionExtras(projections.branches, labels),
          ...(projections.branches.reasons || []).slice(0, 4).map((item) => `- ${item}`),
        ]
          .filter(Boolean)
          .join('\n')
      : '',
  ].filter(Boolean)

  if ((extras?.matrixView || []).length > 0) {
    blocks.push(
      [
        labels.matrix,
        ...(extras?.matrixView || []).slice(0, 3).map(
          (row) =>
            `${row.label || ''}: ${(row.cells || [])
              .slice(0, 2)
              .map((cell) => cell.summary || '')
              .filter(Boolean)
              .join(' | ')}`
        ),
      ]
        .filter(Boolean)
        .join('\n')
    )
  }

  if (extras?.singleUserModel?.facets?.length) {
    blocks.push(
      [
        labels.singleUser,
        ...(extras.singleUserModel.facets || [])
          .slice(0, 4)
          .map((facet) => `${facet.label || ''}: ${facet.summary || ''}`),
      ]
        .filter(Boolean)
        .join('\n')
    )
  }

  if ((extras?.branchSet || []).length > 0) {
    blocks.push(
      [
        labels.branchSet,
        ...(extras?.branchSet || [])
          .slice(0, 3)
          .flatMap((branch, index) => [
            `${index + 1}. ${normalizeRenderLine(branch.summary || branch.label || '')}`,
            ...(branch.entry || [])
              .slice(0, 1)
              .map((item) =>
                lang === 'ko'
                  ? `- 들어가도 되는 조건: ${normalizeRenderLine(item)}`
                  : `- Entry condition: ${normalizeRenderLine(item)}`
              ),
            ...(branch.abort || [])
              .slice(0, 1)
              .map((item) =>
                lang === 'ko'
                  ? `- 멈춰야 하는 조건: ${normalizeRenderLine(item)}`
                  : `- Stop condition: ${normalizeRenderLine(item)}`
              ),
            ...(branch.sustain || [])
              .slice(0, 1)
              .map((item) =>
                lang === 'ko'
                  ? `- 이어질 때의 모습: ${normalizeRenderLine(item)}`
                  : `- Sustain case: ${normalizeRenderLine(item)}`
              ),
            branch.reversalRisk
              ? lang === 'ko'
                ? `- 서두를 때 생기는 비용: ${normalizeRenderLine(branch.reversalRisk)}`
                : `- Reversal risk: ${normalizeRenderLine(branch.reversalRisk)}`
              : '',
          ]),
      ]
        .filter(Boolean)
        .join('\n')
    )
  }

  if (extras?.singleSubjectView?.directAnswer) {
    const view = extras.singleSubjectView
    blocks.unshift(
      [
        lang === 'ko' ? '단일 해석 뷰' : 'Single-Subject View',
        normalizeRenderLine(view.directAnswer || ''),
        normalizeRenderLine(view.actionAxis?.whyThisFirst || ''),
        view.timingState?.bestWindow
          ? `${lang === 'ko' ? '가장 중요한 창' : 'Best window'}: ${normalizeRenderLine(view.timingState.bestWindow)}`
          : '',
        normalizeRenderLine(view.timingState?.whyNow || ''),
        normalizeRenderLine(view.timingState?.whyNotYet || ''),
        view.actionAxis?.nowAction
          ? `${lang === 'ko' ? '다음 행동' : 'Next move'}: ${normalizeRenderLine(view.actionAxis.nowAction)}`
          : '',
        view.riskAxis?.warning
          ? `${lang === 'ko' ? '리스크' : 'Risk'}: ${normalizeRenderLine(view.riskAxis.warning)}`
          : '',
        ...(view.riskAxis?.hardStops || [])
          .slice(0, 2)
          .map((item) => `- ${normalizeRenderLine(item)}`),
        ...(view.branches || [])
          .slice(0, 2)
          .flatMap((branch, index) => [
            `${lang === 'ko' ? '경로' : 'Branch'} ${index + 1}: ${normalizeRenderLine(branch.summary || '')}`,
            ...(branch.entryConditions || [])
              .slice(0, 1)
              .map((item) =>
                lang === 'ko'
                  ? `- 진입 조건: ${normalizeRenderLine(item)}`
                  : `- Entry condition: ${normalizeRenderLine(item)}`
              ),
            ...(branch.abortConditions || [])
              .slice(0, 1)
              .map((item) =>
                lang === 'ko'
                  ? `- 중단 조건: ${normalizeRenderLine(item)}`
                  : `- Abort condition: ${normalizeRenderLine(item)}`
              ),
          ]),
      ]
        .filter(Boolean)
        .join('\n')
    )
  }

  return blocks.join('\n\n').trim()
}

export function renderProjectionBlocksAsMarkdown(
  projections: ProjectionBlocks | null | undefined,
  lang: 'ko' | 'en' = 'ko',
  extras?: RenderExtras
): string {
  if (!projections) return ''

  const labels = getProjectionLabels(lang)
  const lines: string[] = []
  const pushBlock = (headline: string | undefined, bodyLines: string[]) => {
    if (!headline || bodyLines.filter(Boolean).length === 0) return
    lines.push(`## ${headline}`)
    lines.push('')
    lines.push(...bodyLines.filter(Boolean).map((line) => normalizeRenderLine(line)))
    lines.push('')
  }

  if (extras?.singleSubjectView?.directAnswer) {
    const view = extras.singleSubjectView
    pushBlock(lang === 'ko' ? '단일 해석 뷰' : 'Single-Subject View', [
      view.directAnswer || '',
      view.actionAxis?.whyThisFirst
        ? lang === 'ko'
          ? `- 왜 이렇게 읽히는가: ${view.actionAxis.whyThisFirst}`
          : `- Why it reads this way: ${view.actionAxis.whyThisFirst}`
        : '',
      view.timingState?.bestWindow
        ? lang === 'ko'
          ? `- 가장 좋은 창: ${view.timingState.bestWindow}`
          : `- Best window: ${view.timingState.bestWindow}`
        : '',
      view.timingState?.whyNow
        ? lang === 'ko'
          ? `- 왜 지금인가: ${view.timingState.whyNow}`
          : `- Why now: ${view.timingState.whyNow}`
        : '',
      view.timingState?.whyNotYet
        ? lang === 'ko'
          ? `- 왜 아직 아닌가: ${view.timingState.whyNotYet}`
          : `- Why not yet: ${view.timingState.whyNotYet}`
        : '',
      view.nextMove || view.actionAxis?.nowAction
        ? lang === 'ko'
          ? `- 다음 행동: ${view.nextMove || view.actionAxis?.nowAction || ''}`
          : `- Next move: ${view.nextMove || view.actionAxis?.nowAction || ''}`
        : '',
      view.riskAxis?.warning
        ? lang === 'ko'
          ? `- 리스크: ${view.riskAxis.warning}`
          : `- Risk: ${view.riskAxis.warning}`
        : '',
      ...(view.riskAxis?.hardStops || [])
        .slice(0, 2)
        .map((item) =>
          lang === 'ko'
            ? `- 중단 조건: ${normalizeRenderLine(item)}`
            : `- Hard stop: ${normalizeRenderLine(item)}`
        ),
      ...(view.branches || [])
        .slice(0, 2)
        .flatMap((branch, index) => [
          lang === 'ko'
            ? `- 경로 ${index + 1}: ${normalizeRenderLine(branch.summary || branch.label || '')}`
            : `- Path ${index + 1}: ${normalizeRenderLine(branch.summary || branch.label || '')}`,
          ...(branch.entryConditions || [])
            .slice(0, 1)
            .map((item) =>
              lang === 'ko'
                ? `  - 진입 조건: ${normalizeRenderLine(item)}`
                : `  - Entry condition: ${normalizeRenderLine(item)}`
            ),
          ...(branch.abortConditions || [])
            .slice(0, 1)
            .map((item) =>
              lang === 'ko'
                ? `  - 중단 조건: ${normalizeRenderLine(item)}`
                : `  - Abort condition: ${normalizeRenderLine(item)}`
            ),
        ]),
    ])
  }

  pushBlock(normalizeProjectionHeadline(projections.structure?.headline, labels.structure), [
    projections.structure?.summary || '',
    (projections.structure?.topAxes || []).length > 0
      ? `- ${labels.topAxes}: ${(projections.structure?.topAxes || []).join(', ')}`
      : '',
    ...renderProjectionExtras(projections.structure, labels, '- '),
  ])
  pushBlock(normalizeProjectionHeadline(projections.timing?.headline, labels.timing), [
    projections.timing?.summary || '',
    [projections.timing?.window, projections.timing?.granularity].filter(Boolean).join(' / '),
    ...renderProjectionExtras(projections.timing, labels, '- '),
  ])
  pushBlock(normalizeProjectionHeadline(projections.conflict?.headline, labels.conflict), [
    projections.conflict?.summary || '',
    ...renderProjectionExtras(projections.conflict, labels, '- '),
    ...(projections.conflict?.reasons || []).slice(0, 3).map((item) => `- ${item}`),
  ])
  pushBlock(normalizeProjectionHeadline(projections.action?.headline, labels.action), [
    projections.action?.summary || '',
    ...renderProjectionExtras(projections.action, labels, '- '),
    ...(projections.action?.reasons || []).slice(0, 3).map((item) => `- ${item}`),
  ])
  pushBlock(normalizeProjectionHeadline(projections.risk?.headline, labels.risk), [
    projections.risk?.summary || '',
    ...renderProjectionExtras(projections.risk, labels, '- '),
    ...(projections.risk?.reasons || []).slice(0, 3).map((item) => `- ${item}`),
  ])
  pushBlock(normalizeProjectionHeadline(projections.evidence?.headline, labels.evidence), [
    projections.evidence?.summary || '',
    ...renderProjectionExtras(projections.evidence, labels, '- '),
    ...(projections.evidence?.reasons || []).slice(0, 4).map((item) => `- ${item}`),
  ])

  pushBlock(normalizeProjectionHeadline(projections.branches?.headline, labels.branches), [
    projections.branches?.summary || '',
    [projections.branches?.window, projections.branches?.granularity].filter(Boolean).join(' / '),
    ...renderProjectionExtras(projections.branches, labels, '- '),
    ...(projections.branches?.reasons || []).slice(0, 4).map((item) => `- ${item}`),
  ])

  pushBlock(labels.matrix, [
    ...(extras?.matrixView || []).slice(0, 3).map(
      (row) =>
        `- ${row.label || ''}: ${(row.cells || [])
          .slice(0, 2)
          .map((cell) => cell.summary || '')
          .filter(Boolean)
          .join(' | ')}`
    ),
  ])

  pushBlock(labels.singleUser, [
    ...(extras?.singleUserModel?.facets || [])
      .slice(0, 4)
      .map((facet) => `- ${facet.label || ''}: ${facet.summary || ''}`),
  ])

  pushBlock(labels.branchSet, [
    ...(extras?.branchSet || [])
      .slice(0, 3)
      .flatMap((branch, index) => [
        `- ${index + 1}. ${normalizeRenderLine(branch.summary || branch.label || '')}`,
        ...(branch.entry || [])
          .slice(0, 1)
          .map((item) =>
            lang === 'ko'
              ? `  - 들어가도 되는 조건: ${normalizeRenderLine(item)}`
              : `  - Entry condition: ${normalizeRenderLine(item)}`
          ),
        ...(branch.abort || [])
          .slice(0, 1)
          .map((item) =>
            lang === 'ko'
              ? `  - 멈춰야 하는 조건: ${normalizeRenderLine(item)}`
              : `  - Stop condition: ${normalizeRenderLine(item)}`
          ),
        ...(branch.sustain || [])
          .slice(0, 1)
          .map((item) =>
            lang === 'ko'
              ? `  - 이어질 때의 모습: ${normalizeRenderLine(item)}`
              : `  - Sustain case: ${normalizeRenderLine(item)}`
          ),
        branch.reversalRisk
          ? lang === 'ko'
            ? `  - 서두를 때 생기는 비용: ${normalizeRenderLine(branch.reversalRisk)}`
            : `  - Reversal risk: ${normalizeRenderLine(branch.reversalRisk)}`
          : '',
      ]),
  ])

  return lines.join('\n').trim()
}

export function renderSectionsAsText(
  sections: JsonLike,
  orderedPaths: string[],
  lang: 'ko' | 'en' = 'ko'
): string {
  const lines: string[] = []
  for (const path of orderedPaths) {
    const text = readPath(sections, path)
    if (text) lines.push(formatRenderedSectionText(text, lang))
  }
  return lines.join('\n\n').trim()
}

export function renderSectionsAsMarkdown(
  sections: JsonLike,
  orderedPaths: string[],
  lang: 'ko' | 'en'
): string {
  const labels = getProjectionLabels(lang)
  const sectionTitleMap: Record<string, string> =
    lang === 'ko'
      ? {
          introduction: '판의 방향',
          personalityDeep: '당신의 기본 결',
          careerPath: '일의 칼끝',
          relationshipDynamics: '사람 사이의 거리',
          spouseProfile: '오래 가는 인연의 얼굴',
          wealthPotential: '돈의 물길',
          healthGuidance: '몸의 리듬',
          lifeMission: '길게 남는 과제',
          lifeStages: '인생의 계절',
          turningPoints: '판이 뒤집히는 지점',
          futureOutlook: '앞으로 3~5년',
          timingAdvice: '지금과 다음 창',
          actionPlan: '바로 써먹는 실행안',
          conclusion: '한 방 결론',
        }
      : {
          introduction: 'Overview',
          personalityDeep: 'Inner Pattern',
          careerPath: 'Career',
          relationshipDynamics: 'Relationships',
          spouseProfile: 'Partner Pattern',
          wealthPotential: 'Wealth',
          healthGuidance: 'Health',
          lifeMission: 'Long-Term Task',
          lifeStages: 'Life Stages',
          turningPoints: 'Turning Points',
          futureOutlook: 'Next 3-5 Years',
          timingAdvice: 'Timing',
          actionPlan: 'Action Plan',
          conclusion: 'Conclusion',
        }
  const lines: string[] = []
  for (const path of orderedPaths) {
    const text = readPath(sections, path)
    if (!text) continue
    const title = sectionTitleMap[path] || `${labels.section}: ${path}`
    lines.push(`## ${title}`)
    lines.push('')
    lines.push(formatRenderedSectionText(text, lang))
    lines.push('')
  }
  return lines.join('\n').trim()
}

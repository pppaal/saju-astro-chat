/**
 * Theme Angles — AI Generation
 *
 * Generates the 24 angle paragraphs (8 angles × 3 periods) per theme via
 * Claude Opus 4.7 instead of deterministic templates. Same engine signal
 * pool flows in; the LLM weaves it into nuanced prose with explicit
 * evidence citation per paragraph.
 *
 * Falls back to the existing deterministic templates (themeAngles.ts /
 * themeAnglesExtra.ts) when ANTHROPIC_API_KEY is missing or generation
 * fails.
 *
 * Architecture notes:
 *   - Opus 4.7 with adaptive thinking (no budget_tokens, no temperature —
 *     those return 400 on 4.7).
 *   - Prompt caching on the system prompt (stable across all calls) for
 *     ~10× cost reduction on repeated requests.
 *   - Output format: strict JSON with `evidence_signal_ids[]` per angle
 *     so we can validate "the prose actually cites the engine".
 *   - Single API call per (theme × period) — 8 paragraphs in one shot
 *     to keep cost down and prose coherent across angles.
 */

import { activationFor } from './signalActivation'
import { humanizeAstroBasis, humanizeKeyword, humanizeSajuBasis } from './signalLanguage'
import type { ActivationContext } from './signalActivation'
import type { NormalizedSignal } from './signalSynthesizer'
import type { ReportPeriodScope } from './periodSignalContext'
import type { RenderedAngle } from './themeAngles'

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const MODEL = 'claude-opus-4-7'

// ============================================
// Public types
// ============================================

export type ThemeKey = 'career' | 'love' | 'wealth' | 'health' | 'family' | 'move'

export interface AIGenerationInput {
  theme: ThemeKey
  period: ReportPeriodScope
  signals: NormalizedSignal[]
  ctx: ActivationContext
  /** Optional: user's display name for personalization. */
  name?: string
  /**
   * Optional: per-domain × per-timeframe agreement matrix between saju
   * and astrology. When present, the prompt explicitly tells Claude
   * "this is how strongly the two engines agree per domain" — so the
   * model can differentiate confident calls from contested ones.
   */
  crossAgreementMatrix?: Array<{
    domain: string
    leadLag?: number
    timescales?: Record<string, { agreement?: number; contradiction?: number; leadLag?: number }>
  }>
}

export interface AIGenerationResult {
  angles: RenderedAngle[]
  /** Token usage for cost tracking. */
  usage?: {
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
    cacheCreateTokens: number
  }
  /** Model that produced this output. */
  model: string
}

export class ThemeAnglesAIError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message)
    this.name = 'ThemeAnglesAIError'
  }
}

// ============================================
// Constants — angle structure per theme
// ============================================

const ANGLE_DEFINITIONS: Record<ThemeKey, ReadonlyArray<{ key: string; label: string; focus: string }>> = {
  career: [
    { key: 'essence', label: '본질', focus: '커리어에서 본인이 어떤 종류의 사람인지 — 일간/격국/지배 원소 기반' },
    { key: 'strength', label: '강점', focus: '결정적 순간 본인이 가진 무기. polarity:strength 신호 위주' },
    { key: 'weakness', label: '약점', focus: '같은 강점이 본인을 다치게 하는 패턴. polarity:caution 신호' },
    { key: 'timing', label: '시기 흐름', focus: '평생/올해/이번달 단위에서 흐름이 어떻게 갈라지는지' },
    { key: 'people', label: '사람', focus: '누가 도와주고 누가 막는지. 신살 천을귀인/충 신호' },
    { key: 'moneyVsMeaning', label: '돈 vs 의미', focus: '격국 분석으로 본 우선순위. 보상 vs 명분' },
    { key: 'recovery', label: '회복 패턴', focus: '번아웃·정체 후 회복 사이클. 휴식 타이밍' },
    { key: 'nextAction', label: '다음 행동', focus: '시기에 맞는 구체 행동 3가지' },
  ],
  love: [
    { key: 'essence', label: '끌림의 본질', focus: '관계에서 어떤 결로 끌리는지 — 정재/편재/식상 신호' },
    { key: 'strength', label: '관계의 강점', focus: '관계에서 본인이 진가 발휘하는 자리' },
    { key: 'weakness', label: '관계가 깨지는 패턴', focus: '결정 후 거리감/오해/식는 지점' },
    { key: 'timing', label: '만남·결혼 시기', focus: '대운/세운/월운 흐름에서 결합 압력 정점' },
    { key: 'people', label: '어떤 타입에 끌리나', focus: '도화/정관/정재 활성도 + 점성 비너스/마즈' },
    { key: 'conflictRecovery', label: '갈등과 회복', focus: '갈등 트리거와 회복 골든타임' },
    { key: 'stability', label: '장기 안정 조건', focus: '오래 가는 조건. 책임 분담·기대치' },
    { key: 'nextAction', label: '다음 행동', focus: '시기별 관계 행동 3가지' },
  ],
  wealth: [
    { key: 'essence', label: '돈 흐름의 본질', focus: '편재/정재 분포 + 격국으로 본 돈 패턴' },
    { key: 'earning', label: '버는 자리', focus: '본인이 돈 벌리는 자리 — 본업·부수입·외부 기회' },
    { key: 'leaking', label: '새는 자리', focus: '돈이 빠져나가는 패턴. 충동지출·과속결정' },
    { key: 'timing', label: '투자 적기 / 손실기', focus: '대운 지지·세운 흐름' },
    { key: 'partners', label: '협력자', focus: '자문·천을귀인 활용' },
    { key: 'stabilityVsExpansion', label: '안정 vs 확장', focus: '시기별 균형 — 어디로 기울어야 하는지' },
    { key: 'recovery', label: '손실 후 회복', focus: '손실 후 복원 속도와 방식' },
    { key: 'nextAction', label: '다음 행동', focus: '시기별 재정 행동 3가지' },
  ],
  health: [
    { key: 'tone', label: '체력 톤', focus: '12운성 + 일간 오행으로 본 baseline' },
    { key: 'strongAreas', label: '강한 부위', focus: 'polarity:strength 건강 신호' },
    { key: 'weakAreas', label: '약한 부위', focus: 'polarity:caution 건강 신호 + 약한 오행' },
    { key: 'stableWindow', label: '안정기', focus: '운세 안정 구간' },
    { key: 'recoveryWindow', label: '회복 필요기', focus: '강제 회복 구간' },
    { key: 'movementVsRest', label: '운동 vs 휴식', focus: '균형 비율' },
    { key: 'eatingPattern', label: '식습관 패턴', focus: '약한 부위와 연결된 식습관' },
    { key: 'nextAction', label: '다음 행동', focus: '시기별 건강 행동 3가지' },
  ],
  family: [
    { key: 'rootPattern', label: '뿌리 패턴', focus: '정인/편인 + 가족 자리' },
    { key: 'parents', label: '부모와의 결', focus: '부모 자리 거리감 + 건강 이슈 시기' },
    { key: 'siblings', label: '형제·배우자 역학', focus: '비견/겁재/정재 — 책임 분담' },
    { key: 'children', label: '자녀 흐름', focus: '식신/상관 — 표현·돌봄' },
    { key: 'conflictWindow', label: '갈등 시기', focus: '명절·중요 결정 시점' },
    { key: 'reconcileWindow', label: '화해 시기', focus: '갈등 후 회복 골든타임' },
    { key: 'careBalance', label: '돌봄 균형', focus: '자기 돌봄 vs 가족 돌봄 비율' },
    { key: 'nextAction', label: '다음 행동', focus: '시기별 가족 행동 3가지' },
  ],
  move: [
    { key: 'instinct', label: '정착 vs 이동 본능', focus: '역마/편관 활성도' },
    { key: 'goodEnv', label: '잘 맞는 환경', focus: '어떤 환경에서 컨디션 살아나는지' },
    { key: 'badEnv', label: '안 맞는 환경', focus: '어떤 환경에서 정체되는지' },
    { key: 'movingWindow', label: '이동 적기', focus: '대운 천간 역마성 흐름' },
    { key: 'baseStability', label: '거점 안정기', focus: '이주 후 정착 사이클' },
    { key: 'companions', label: '동행자', focus: '단독 vs 함께 — 천을귀인 활용' },
    { key: 'soloVsFamily', label: '단독 vs 가족 동반', focus: '큰 이동 시 결정 구조' },
    { key: 'nextAction', label: '다음 행동', focus: '시기별 이동 행동 3가지' },
  ],
}

const PERIOD_LABELS: Record<ReportPeriodScope, string> = {
  lifetime: '평생 (본명 기반, 평생 변하지 않는 결)',
  yearly: '올해 (세운 + 대운 — 1년 흐름)',
  monthly: '이번 달 (월운 + 일진 — 30일 정밀)',
}

const THEME_LABEL_KO: Record<ThemeKey, string> = {
  career: '커리어',
  love: '연애',
  wealth: '재정',
  health: '건강',
  family: '가족',
  move: '이동',
}

// ============================================
// Prompt construction
// ============================================

function buildSystemPrompt(): string {
  return [
    '너는 사주명리와 서양 점성술을 모두 능통하게 다루는 전문 상담가야.',
    '사용자가 결제한 프리미엄 리포트의 한 테마를 8개 각도로 풀어내는 게 너의 일이야.',
    '',
    '## Fusion Engine 이해 (다른 앱과의 차별점)',
    '신호 풀의 각 신호에는 **layer** 번호가 붙어 있어. 이건 사주와 점성이 어떻게 교차되는지 알려줘:',
    '- L1 (오행 × 점성 원소) — 본명 코어. "일간 금 × 점성 air 우세".',
    '- L2 (십신 × 행성) — 본명. "정재 × Venus", "편재 × Jupiter".',
    '- L3 (십신 × 하우스) — 본명. "정재 × 11하우스".',
    '- **L4 (사주 시기 × 점성 cycle) — 타이밍 fusion.** "대운 전환 × Saturn Return = 대전환".',
    '- **L5 (형충회합 × 각도) — 관계×각도 fusion.** "지지삼합 × trine = 극강시너지".',
    '- L6 (12운성 × 하우스) — 단계×자리.',
    '- L7 (격국·용신 고급 분석).',
    '- **L8 (신살 × 행성) — 특수 별자리 fusion.** "천을귀인 × Jupiter".',
    '- L9 (소행성 × 하우스) — 점성 단독 (사주 대응 없음).',
    '- L10 (엑스트라포인트 × 원소) — 점성 단독.',
    '',
    '**L4/L5/L8 신호는 진짜 fusion 신호** — 사주와 점성이 같은 의미로 묶여서 미리 해석된 것. 이런 신호 인용 시 "사주 X와 점성 Y가 같은 방향으로 가리키고 있어" 같이 fusion임을 명시.',
    '',
    '## 글쓰기 원칙',
    '- 평어체 (반말 OK), 친근하지만 전문가 톤. "너", "본인" 호칭 사용.',
    '- 추상적 자기계발 문구 금지 ("균형이 중요해요", "자신을 믿으세요" 같은).',
    '- 모든 단락은 **본인의 사주/점성 신호를 1개 이상 반드시 명시 인용** 해야 함.',
    '  - 예시: "일간 辛(금)의 칼날 같은 분별력", "Saturn-Moon 180° opposition (orb 3.95°)",',
    '         "신살 천을귀인 두 자리", "지지삼합 亥卯未"',
    '- 사주 용어는 한자+풀이 병기 ("천간충 乙-辛 충(원칙·결정 충돌)").',
    '- 점성 용어는 영문+각도+오브 병기 ("Mercury-Node square 90° orb 0.29°").',
    '- 가능하면 L4/L5/L8 fusion 신호를 우선 인용 — 단순 saju-only 또는 astro-only 묘사보다 fusion이 차별점.',
    '- 시기에 맞게 변형:',
    '  - lifetime: "평생", "본인의 결" 톤. 시기 디테일 최소.',
    '  - yearly: "올해", 세운 pillar 명시. 분기별 흐름 언급.',
    '  - monthly: "이번 달", 월운 pillar 명시. 주차별·일진 디테일.',
    '- 길이: 각 angle 3-5 문장. 너무 짧지도 길지도 않게.',
    '- 같은 표현 반복 금지. 각 angle은 신호 풀의 다른 측면을 봐야 함.',
    '',
    '## 출력 형식',
    '반드시 다음 JSON 형식으로만 답변. 다른 설명/접두사/마크다운 금지.',
    '',
    '```json',
    '{',
    '  "angles": [',
    '    {',
    '      "key": "<angle key>",',
    '      "label": "<한국어 label>",',
    '      "prose": "<3-5 문장 한국어 본문>",',
    '      "evidence_signal_ids": ["<signal id 1>", "<signal id 2>"]',
    '    }',
    '    // ... 8개',
    '  ]',
    '}',
    '```',
    '',
    '`evidence_signal_ids` 는 prose에서 실제로 인용한 신호의 id를 나열해야 함.',
    '최소 1개, 보통 2-3개. 본문에 신호 인용 없이 evidence id만 채우는 건 금지.',
  ].join('\n')
}

function buildSignalPoolSection(signals: NormalizedSignal[], ctx: ActivationContext): string {
  // Activation-rank, take top 25 — covers strength/caution/balance polarity mix
  const ranked = signals
    .map((s) => ({ signal: s, level: activationFor(s, ctx).level }))
    .sort((a, b) => b.level - a.level)
    .slice(0, 25)

  const lines: string[] = ['## 활성 신호 풀 (시기별 활성도 순, 상위 25개)', '']
  for (const { signal, level } of ranked) {
    const kw = humanizeKeyword(signal.keyword) || signal.keyword
    const saju = humanizeSajuBasis(signal.sajuBasis)
    const astro = humanizeAstroBasis(signal.astroBasis)
    const basis = [saju, astro].filter(Boolean).join(' × ') || '본명 자리'
    const advice = signal.advice ? ` | advice: ${signal.advice}` : ''
    // Mark L4/L5/L8 explicitly as fusion signals so the model knows to
    // prioritize them — the human-friendly label makes it harder for the
    // model to ignore than a raw layer integer.
    const fusionTag =
      signal.layer === 4
        ? ' ⚡FUSION-타이밍'
        : signal.layer === 5
          ? ' ⚡FUSION-관계각도'
          : signal.layer === 8
            ? ' ⚡FUSION-신살'
            : ''
    lines.push(
      `- **${signal.id}** [L${signal.layer}${fusionTag}, 활성도 ${level}/100, ${signal.polarity}] ${kw} — ${basis}${advice}`
    )
  }
  return lines.join('\n')
}

function buildCrossAgreementSection(
  matrix: AIGenerationInput['crossAgreementMatrix']
): string {
  if (!matrix || matrix.length === 0) return ''
  const lines: string[] = ['## 사주↔점성 도메인 합의 매트릭스', '', '도메인별로 사주와 점성이 얼마나 같은 말을 하는지 (1.0 = 완전 일치, 0 = 정반대):']
  for (const row of matrix) {
    const ts = row.timescales || {}
    const cells: string[] = []
    for (const window of ['now', '1-3m', '3-6m', '6-12m'] as const) {
      const cell = ts[window]
      if (!cell || typeof cell.agreement !== 'number') continue
      cells.push(
        `${window}: 합의 ${(cell.agreement * 100).toFixed(0)}%${
          typeof cell.contradiction === 'number'
            ? ` / 모순 ${(cell.contradiction * 100).toFixed(0)}%`
            : ''
        }`
      )
    }
    if (cells.length === 0) continue
    lines.push(`- **${row.domain}**: ${cells.join(' | ')}`)
  }
  return lines.length > 3 ? lines.join('\n') : ''
}

function buildPeriodSection(ctx: ActivationContext, period: ReportPeriodScope): string {
  const lines: string[] = ['## 시기 컨텍스트', '', `- 시점: ${PERIOD_LABELS[period]}`, `- 대상 날짜: ${ctx.targetDate}`]
  if (ctx.daeun?.pillar) lines.push(`- 대운: ${ctx.daeun.pillar}`)
  if (ctx.seun?.pillar) lines.push(`- 세운: ${ctx.seun.pillar}`)
  if (ctx.wolun?.pillar) lines.push(`- 월운: ${ctx.wolun.pillar}`)
  if (ctx.iljin?.pillar) lines.push(`- 일진: ${ctx.iljin.pillar}`)
  if (ctx.activeTransits && ctx.activeTransits.length > 0) {
    lines.push('- 활성 transit cycles:')
    for (const t of ctx.activeTransits.slice(0, 5)) {
      lines.push(`  - ${t.cycle} (${t.influence})`)
    }
  }
  return lines.join('\n')
}

function buildAngleStructureSection(theme: ThemeKey): string {
  const angles = ANGLE_DEFINITIONS[theme]
  const lines: string[] = [`## ${THEME_LABEL_KO[theme]} 테마 — 8개 각도 구조`, '']
  angles.forEach((a, i) => {
    lines.push(`${i + 1}. **${a.key}** (${a.label}): ${a.focus}`)
  })
  return lines.join('\n')
}

function buildUserPrompt(input: AIGenerationInput): string {
  const { theme, period, signals, ctx, name, crossAgreementMatrix } = input
  const crossSection = buildCrossAgreementSection(crossAgreementMatrix)
  return [
    name ? `대상: ${name}` : '',
    '',
    buildPeriodSection(ctx, period),
    '',
    buildAngleStructureSection(theme),
    '',
    buildSignalPoolSection(signals, ctx),
    crossSection ? '\n' + crossSection : '',
    '',
    `## 작업`,
    `위 신호 풀 + 시기 컨텍스트로 **${THEME_LABEL_KO[theme]}** 테마를 8개 각도로 풀어줘. 각 angle 본문은 신호 풀에서 가장 적합한 1-3개 신호를 골라 명시 인용. ⚡FUSION 태그가 붙은 L4/L5/L8 신호는 가능하면 우선 인용 — 사주와 점성이 같은 의미로 묶여 있다는 점을 본문에서 드러내. 시스템 프롬프트의 JSON 형식 그대로 출력.`,
  ]
    .filter(Boolean)
    .join('\n')
}

// ============================================
// Validation
// ============================================

interface ParsedAIOutput {
  angles: Array<{
    key: string
    label: string
    prose: string
    evidence_signal_ids: string[]
  }>
}

function extractJsonBlock(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenced) return fenced[1].trim()
  const firstBrace = raw.indexOf('{')
  const lastBrace = raw.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1)
  }
  return raw.trim()
}

function parseAndValidate(
  raw: string,
  theme: ThemeKey,
  signalIds: Set<string>
): ParsedAIOutput {
  const jsonStr = extractJsonBlock(raw)
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch (err) {
    throw new ThemeAnglesAIError(
      `Output is not valid JSON: ${err instanceof Error ? err.message : 'unknown'}`,
      'INVALID_JSON'
    )
  }

  if (!parsed || typeof parsed !== 'object' || !('angles' in parsed)) {
    throw new ThemeAnglesAIError('Output missing `angles` field', 'MISSING_ANGLES')
  }
  const anglesRaw = (parsed as { angles: unknown }).angles
  if (!Array.isArray(anglesRaw)) {
    throw new ThemeAnglesAIError('`angles` is not an array', 'ANGLES_NOT_ARRAY')
  }

  const expectedKeys = ANGLE_DEFINITIONS[theme].map((a) => a.key)
  const angles: ParsedAIOutput['angles'] = []

  for (const item of anglesRaw) {
    if (!item || typeof item !== 'object') continue
    const obj = item as Record<string, unknown>
    const key = typeof obj.key === 'string' ? obj.key : ''
    const label = typeof obj.label === 'string' ? obj.label : ''
    const prose = typeof obj.prose === 'string' ? obj.prose.trim() : ''
    const evidenceIds = Array.isArray(obj.evidence_signal_ids)
      ? obj.evidence_signal_ids.filter((x): x is string => typeof x === 'string')
      : []
    if (!key || !prose) continue
    angles.push({ key, label, prose, evidence_signal_ids: evidenceIds })
  }

  if (angles.length < 6) {
    throw new ThemeAnglesAIError(
      `Got ${angles.length} angles, need at least 6 of 8`,
      'TOO_FEW_ANGLES'
    )
  }

  // Reorder to match expected key order; fill missing with empty placeholders so
  // the result page has a stable shape (caller can decide whether to fall back).
  const byKey = new Map(angles.map((a) => [a.key, a]))
  const aligned: ParsedAIOutput['angles'] = []
  for (const expectedKey of expectedKeys) {
    const found = byKey.get(expectedKey)
    if (found) {
      aligned.push(found)
    }
  }

  // Soft check: each angle prose should look like it actually cites engine
  // signals (mention an ID, hanja, or planet/house). Don't hard-reject on
  // this — model may humanize without exact ID strings — but log when
  // evidence_signal_ids is present and at least one is in the real pool.
  for (const angle of aligned) {
    angle.evidence_signal_ids = angle.evidence_signal_ids.filter((id) =>
      signalIds.has(id)
    )
  }

  return { angles: aligned }
}

// ============================================
// Main API
// ============================================

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>
  model?: string
  usage?: {
    input_tokens?: number
    output_tokens?: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
  }
}

export async function generateThemeAnglesAI(
  input: AIGenerationInput
): Promise<AIGenerationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new ThemeAnglesAIError('ANTHROPIC_API_KEY is not set', 'NO_API_KEY')
  }

  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(input)
  const signalIds = new Set(input.signals.map((s) => s.id))

  // Opus 4.7: no temperature/top_p (returns 400). Use adaptive thinking.
  const body = {
    model: MODEL,
    max_tokens: 16000,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
    thinking: { type: 'adaptive' },
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90000)
  let response: Response
  try {
    response = await fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ThemeAnglesAIError('Request timed out after 90s', 'TIMEOUT')
    }
    throw new ThemeAnglesAIError(
      `Network error: ${err instanceof Error ? err.message : String(err)}`,
      'NETWORK_ERROR'
    )
  }
  clearTimeout(timeout)

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new ThemeAnglesAIError(
      `Anthropic API ${response.status}: ${errText.slice(0, 240)}`,
      `HTTP_${response.status}`
    )
  }

  const json = (await response.json()) as AnthropicResponse
  // Pick the first text block (skip thinking blocks — their text is empty by
  // default on Opus 4.7 anyway, since display defaults to "omitted").
  const textBlock = json.content.find((b) => b.type === 'text')?.text || ''
  if (!textBlock) {
    throw new ThemeAnglesAIError('No text content in response', 'EMPTY_RESPONSE')
  }

  const parsed = parseAndValidate(textBlock, input.theme, signalIds)

  // Build evidence list per angle from the signal IDs the model cited.
  const signalById = new Map(input.signals.map((s) => [s.id, s]))
  const angles: RenderedAngle[] = parsed.angles.map((a) => {
    const evidenceSignals = a.evidence_signal_ids
      .map((id) => signalById.get(id))
      .filter((s): s is NormalizedSignal => Boolean(s))
      .slice(0, 3)
    return {
      angle: a.key,
      label: a.label || a.key,
      prose: a.prose,
      evidence: evidenceSignals.map((s) => ({
        id: s.id,
        keyword: humanizeKeyword(s.keyword) || s.keyword,
        sajuBasis: humanizeSajuBasis(s.sajuBasis),
        astroBasis: humanizeAstroBasis(s.astroBasis),
        polarity: s.polarity,
      })),
    }
  })

  return {
    angles,
    usage: json.usage
      ? {
          inputTokens: json.usage.input_tokens || 0,
          outputTokens: json.usage.output_tokens || 0,
          cacheReadTokens: json.usage.cache_read_input_tokens || 0,
          cacheCreateTokens: json.usage.cache_creation_input_tokens || 0,
        }
      : undefined,
    model: json.model || MODEL,
  }
}

// LLM renderer: turns FortuneReport into polished Korean prose.
// Two modes: 'counselor' (conversational, single flow) and 'report'
// (counselor voice but theme-by-theme deep dive, browseable by section).
//
// Design:
// - System prompt is the same on every call within a mode → prompt-cached.
// - User message contains only the per-call structured data (the report).
// - Renderer is constrained: no new facts, must cite engine findings,
//   must not invent rule outcomes.
// - Report mode emits markdown H2 sections so the frontend can split into
//   navigable tabs/cards.
// - Falls back to deterministic renderer when no API key.

import type { FortuneReport } from './types'
import { renderToText } from './renderer'

export type RenderMode = 'counselor' | 'report'

const COUNSELOR_PROMPT = `당신은 사주와 점성을 함께 보는 운세 상담사입니다.
입력 JSON은 결정론 룰 엔진의 출력이며, 양 시스템이 동시에 가리킨 신호(confirms),
양면적 신호(conflicts), 통합 테마(themes)가 도메인별로 정리되어 있습니다.
당신은 이 데이터를 자연스러운 한국어 대화체 상담으로 풀어냅니다.

말투·스타일:
- 실제로 사람과 마주 앉아 이야기하듯 부드럽고 차분하게.
- "~네요", "~예요", "~한 결이에요" 같은 어미 자연스럽게 섞기.
- 단정·과장 금지. "~할 수 있어요", "~하시는 게 좋겠어요" 톤.
- 한 호흡으로 읽히는 흐름. 불릿·번호·제목 사용 금지.
- 4~6 문단, 전체 500~700자.

내용·정확성:
- 입력 데이터에 없는 사실 절대 만들지 말기 (rule outcome / evidence / themes에 한해 인용).
- 양면성(conflicts)은 반드시 한 번 이상 명시적으로 언급.
- 사주 용어(일간, 격국, 대운, 세운, 일지 등)와 점성 용어(MC, 7궁, transit, dignity 등)를
  어색하지 않게 자연스럽게 섞어 사용.
- 두 시스템이 같은 사건을 가리키고 있다는 점이 핵심 — "양쪽이 동시에",
  "사주에서도, 점성에서도" 같은 표현으로 그 의미를 살리기.
- 마지막에 한두 문장의 자연스러운 권고로 마무리.

피해야 할 것:
- evidence JSON 그대로 노출 ("source=daeun" 같은 raw 데이터).
- "긍정/주의/양면" 같은 룰 엔진 라벨 단어 그대로 쓰지 말기.
- 같은 표현 반복 (모든 문단이 "~함께 — ~결" 구조면 안 됨).
- 종교적·운명론적 단정.

생애 단계 / 대운 컨텍스트 사용:
- 입력 JSON의 \`context\` 필드에 \`ageYears\`, \`lifeStage\`, \`daeun.index\`,
  \`daeun.previousSibsin\`, \`daeun.nextSibsin\`, \`daeun.transitionImminent\`,
  \`daeun.yearsToNext\`이 들어옵니다.
- \`lifeStage\`(child/teen/young-adult/mid-adult/late-adult/elder)에 맞춰 톤·예시 조절.
- \`daeun.transitionImminent === true\`이면 "곧 다가오는 다음 대운"을 자연스럽게 언급.
- \`daeun.previousSibsin\`이 있으면 "이전 ~운에서 넘어온 흐름" 식으로 한 번 정도 회상.
- 단정적 나이 예언 금지. 단계 인식만.

육친(六親) 호명:
- 신호 데이터에 정재=배우자/돈, 편재=활동가족/변동재물, 정관=직장상사/명예,
  편관=압박원/경쟁, 정인=어머니/학습, 편인=양모·이모/비정형 학습,
  식신=자녀/즐거운 표현, 상관=자녀/도전적 표현, 비견=형제/동료,
  겁재=이복형제/경쟁자가 매핑되어 있음.
- 도메인이 "love"고 정재 신호면 "배우자"로, "family"고 정인이면 "어머니"
  또는 "어머니 같은 보호자"로 자연스럽게 호명.
- 단정 금지 — "~로 해석되는 자리"처럼 가능성으로 표현.`.trim()

const REPORT_PROMPT = `당신은 사주와 점성을 함께 보는 운세 상담사입니다.
입력 JSON은 결정론 룰 엔진의 출력입니다. 당신은 이 데이터를 **상담사 말투의 섹션별
리포트**로 풀어냅니다 — 형식은 보고서가 아니라, 실제 상담사가 한 영역씩 차근차근
설명하듯 길게 풀어 쓰는 형태입니다.

출력 형식 (마크다운, 정확히 따르세요):

## 큰 흐름
(전체 흐름을 잡는 도입. 일간·격국·평생 골격을 짚고, 지금 시점이 어떤
국면인지 한 단락. 7~10 문장.)

## 테마: <통합 테마 1 이름>
(메타 테마 1을 상담사 어조로 풀어 씀. 8~12 문장. 사주·점성 양쪽 어떻게
가리키는지, 왜 의미가 있는지, 어떻게 다뤄야 할지.)

## 테마: <통합 테마 2 이름>
(같은 형식, 다음 메타 테마)

(테마는 입력의 themes 배열 길이만큼 반복. 없으면 섹션 생략.)

## 영역: 자아
(자아 도메인 confirms·conflicts를 상담사 어조로 풀어 씀. 8~12 문장.
양면성은 반드시 명시. 신호가 없으면 "이 영역은 잠잠하다"고 짧게.)

## 영역: 사랑
## 영역: 재물
## 영역: 직업
## 영역: 건강
## 영역: 가정

## 마무리
(전체를 한 호흡으로 묶는 마무리. 무게중심·재구성 영역·핵심 원칙을
실제 상담사가 헤어지면서 말해주듯. 5~8 문장.)

말투·스타일 (모든 섹션에 적용):
- 실제 상담사 대화체. "~네요", "~예요", "~한 결이에요".
- 분석 보고서 어투 금지 ("~로 해석된다", "~다" 종결 X).
- 불릿·번호·표 사용 금지. 자연스러운 문단으로만.
- 같은 표현 반복 회피. 섹션마다 톤·시작·맺음 변주.
- 단정·과장 금지.
- 사주 용어와 점성 용어를 자연스럽게 섞기.
- 양 시스템 동시 신호의 의미("양쪽이 같은 곳을 가리킨다")를 살리기.
- evidence raw 데이터(source=daeun 같은) 노출 금지.

내용·정확성:
- 입력 데이터에 없는 사실 절대 만들지 말기.
- 모든 결은 rule outcome 또는 메타 테마에 근거.
- 양면성(conflicts)은 영역별로 빠짐없이 한 번 이상 명시.

총 길이: 2500~3500자.

생애 단계 / 대운 컨텍스트 사용:
- 입력 JSON의 \`context\` 필드(\`ageYears\`, \`lifeStage\`, \`daeun.{index,previousSibsin,nextSibsin,transitionImminent,yearsToNext}\`).
- \`큰 흐름\` 섹션 도입에서 \`lifeStage\`와 현재 대운 위치를 자연스럽게 짚기.
- \`daeun.transitionImminent === true\`이면 \`마무리\` 섹션에서 "다음 대운으로
  넘어가는 시기"를 한 단락 다루기.
- \`previousSibsin\`이 있으면 \`큰 흐름\`에서 "이전 ~운에서 넘어온 흐름" 한 번 회상.

육친(六親) 호명:
- 정재=배우자/돈, 편재=활동가족/변동재물, 정관=직장상사/명예, 편관=압박원/경쟁,
  정인=어머니/학습, 편인=양모·이모/비정형 학습, 식신=자녀/즐거운 표현,
  상관=자녀/도전적 표현, 비견=형제/동료, 겁재=이복형제/경쟁자.
- 도메인 영역 섹션에서 해당 신호가 강하면 사람 관계로 호명 (예: "어머니의 영향").
- 항상 가능성 표현 — 단정 금지.`.trim()

export interface LlmRenderOptions {
  apiKey?: string
  model?: string
  maxTokens?: number
  timeoutMs?: number
  mode?: RenderMode // default 'counselor'
}

const DEFAULT_MODEL = 'claude-sonnet-4-6'
const DEFAULT_TIMEOUT_MS = 60_000
const DEFAULT_MAX_TOKENS_COUNSELOR = 1200
const DEFAULT_MAX_TOKENS_REPORT = 4000

interface AnthropicTextBlock {
  type: 'text'
  text: string
}

interface AnthropicResponse {
  content: Array<AnthropicTextBlock | { type: string }>
  model: string
  usage?: {
    input_tokens?: number
    output_tokens?: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
}

export interface RenderedSection {
  kind: 'overview' | 'theme' | 'domain' | 'closing'
  title: string
  body: string
}

export interface LlmRenderResult {
  text: string
  sections?: RenderedSection[] // populated for 'report' mode
  usedLlm: boolean
  mode: RenderMode
  model?: string
  usage?: AnthropicResponse['usage']
}

// Strip evidence noise from the data we send — keeps prompt small + private.
function compactReport(report: FortuneReport) {
  return {
    context: report.context,
    themes: report.themes.map((t) => ({
      meaning: t.rule.meaning,
      narrative: t.rule.narrative,
    })),
    domains: Object.values(report.byDomain).map((agg) => ({
      domain: agg.domain,
      tone: agg.tone,
      confirms: agg.confirms.map((m) => ({
        meaning: m.rule.meaning,
        intensity: m.intensity,
        narrative: m.rule.narrative.confirm,
        polarityHint: m.rule.polarityHint,
      })),
      conflicts: agg.conflicts.map((m) => ({
        meaning: m.rule.meaning,
        intensity: m.intensity,
        narrative: m.rule.narrative.conflict ?? m.rule.narrative.confirm,
      })),
    })),
  }
}

// Split markdown body into sections by `## ` headings.
function splitReportSections(markdown: string): RenderedSection[] {
  const lines = markdown.split('\n')
  const sections: RenderedSection[] = []
  let cur: { title: string; body: string[] } | null = null

  const titleKind = (title: string): RenderedSection['kind'] => {
    if (title.startsWith('테마:')) return 'theme'
    if (title.startsWith('영역:')) return 'domain'
    if (title === '마무리') return 'closing'
    return 'overview'
  }

  for (const line of lines) {
    const m = /^##\s+(.+?)\s*$/.exec(line)
    if (m) {
      if (cur) sections.push({ kind: titleKind(cur.title), title: cur.title, body: cur.body.join('\n').trim() })
      cur = { title: m[1], body: [] }
    } else if (cur) {
      cur.body.push(line)
    }
  }
  if (cur) sections.push({ kind: titleKind(cur.title), title: cur.title, body: cur.body.join('\n').trim() })
  return sections
}

export async function renderWithLlm(
  report: FortuneReport,
  options: LlmRenderOptions = {},
): Promise<LlmRenderResult> {
  const mode: RenderMode = options.mode ?? 'counselor'
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY

  if (!apiKey) {
    return { text: renderToText(report), usedLlm: false, mode }
  }

  const model = options.model ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL
  const maxTokens =
    options.maxTokens ?? (mode === 'report' ? DEFAULT_MAX_TOKENS_REPORT : DEFAULT_MAX_TOKENS_COUNSELOR)
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const systemPrompt = mode === 'report' ? REPORT_PROMPT : COUNSELOR_PROMPT

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `리포트 데이터:\n${JSON.stringify(compactReport(report), null, 2)}`,
              },
            ],
          },
        ],
      }),
    })

    if (!res.ok) {
      throw new Error(`Anthropic API ${res.status}: ${await res.text()}`)
    }

    const data = (await res.json()) as AnthropicResponse
    const text = data.content
      .filter((b): b is AnthropicTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim()

    if (!text) {
      return { text: renderToText(report), usedLlm: false, mode, model }
    }

    const result: LlmRenderResult = {
      text,
      usedLlm: true,
      mode,
      model: data.model,
      usage: data.usage,
    }
    if (mode === 'report') result.sections = splitReportSections(text)
    return result
  } catch {
    return { text: renderToText(report), usedLlm: false, mode }
  } finally {
    clearTimeout(timeout)
  }
}

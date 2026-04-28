// Chat module: answers any user question against the FortuneReport.
//
// Design:
// - System prompt is identical across calls and is prompt-cached.
// - The full compacted FortuneReport is sent on every turn (also cached
//   via cache_control: ephemeral, keyed by the data shape — when the
//   user asks N questions in a session, the second+ calls reuse the
//   cached report context).
// - The LLM is hard-constrained to:
//     1. Only assert what is in the report (rule outcomes / themes).
//     2. Say honestly when the question is outside the data scope.
//     3. Cite which signal/theme it is drawing from, naturally.
//     4. Keep counselor tone (대화체) — same voice as the renderer.
// - Falls back to a deterministic "no LLM" message if no API key.

import type { FortuneReport } from './types'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  history?: ChatTurn[] // prior turns; last turn must be NEW user question (passed via `question`)
  apiKey?: string
  model?: string
  maxTokens?: number
  timeoutMs?: number
}

export interface ChatResult {
  answer: string
  usedLlm: boolean
  model?: string
  usage?: {
    input_tokens?: number
    output_tokens?: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
}

const SYSTEM_PROMPT = `당신은 사주와 점성을 함께 보는 운세 상담사입니다.

사용자에게는 결정론 룰 엔진이 미리 계산한 운세 리포트(JSON)가 있고,
당신은 그 리포트를 바탕으로 사용자의 질문에 대답합니다. 리포트는
양 시스템(사주·점성)이 동시에 가리킨 신호(confirms), 양면 신호(conflicts),
그리고 도메인 간 통합 테마(themes)로 구성되어 있습니다.

답변 규칙 — 반드시 지킬 것:

1. 리포트 데이터에 없는 사실을 만들지 마세요.
   - 룰 outcome, evidence, theme, 도메인 톤만 사실로 인용 가능.
   - "사주에 ~한 신살이 있을 것 같다" 같은 추정 절대 금지.
   - 연도·월·일 단위로 구체적이지 않은 시점 예언 금지
     (예: "5월 17일에 ~할 것" 같은 단정).

2. 데이터가 그 질문을 다루지 않으면 정직하게 말하세요.
   - "이번 시기 데이터로는 그 영역에 동시 신호가 잡히지 않아요" 처럼.
   - 모호하게 일반론으로 둘러대지 말기.

3. 양면성(conflicts)은 관련 질문이면 반드시 언급.
   - "한쪽으로는 ~인데 동시에 ~한 면도 있어요" 형태로.

4. 사주 용어와 점성 용어를 자연스럽게 섞기.
   - "양쪽 시스템이 동시에 가리킨다"는 게 이 시스템의 핵심 가치.
   - "사주에서는 ~, 점성에서도 ~" 패턴으로 두 시스템 의견을 같이 인용.

5. 말투는 실제 상담사 대화체.
   - "~네요", "~예요", "~한 결이에요" 같은 어미.
   - 단정·과장 금지. "~할 수 있어요", "~하시는 게 좋겠어요".
   - 답변 길이는 질문에 비례. 짧은 질문엔 3~5 문장, 큰 결정 질문이면
     6~10 문장 정도. 너무 길게 늘이지 말기.

6. 출력 형식: 자연 문장만. 마크다운 헤딩, 불릿, 번호 모두 금지.
   evidence raw 데이터(예: "source=daeun") 노출 금지.

7. 질문이 윤리적·의학적 결정(자살·중대 의료 등)이면 운세 답변 대신
   전문가 상담을 권유.

이렇게만 지키면, 사용자는 자기 사주 + 점성 데이터에 근거한 답을
대화체로 받게 됩니다.`.trim()

const DEFAULT_MODEL = 'claude-sonnet-4-6'
const DEFAULT_MAX_TOKENS = 1200
const DEFAULT_TIMEOUT_MS = 60_000

interface AnthropicTextBlock {
  type: 'text'
  text: string
}

interface AnthropicResponse {
  content: Array<AnthropicTextBlock | { type: string }>
  model: string
  usage?: ChatResult['usage']
}

function compactReport(report: FortuneReport) {
  return {
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
        polarityHint: m.rule.polarityHint,
        narrative: m.rule.narrative.confirm,
        evidence: { saju: m.saju.evidence, astro: m.astro.evidence },
      })),
      conflicts: agg.conflicts.map((m) => ({
        meaning: m.rule.meaning,
        intensity: m.intensity,
        narrative: m.rule.narrative.conflict ?? m.rule.narrative.confirm,
        evidence: { saju: m.saju.evidence, astro: m.astro.evidence },
      })),
    })),
  }
}

export async function chatWithFortune(
  report: FortuneReport,
  question: string,
  options: ChatOptions = {},
): Promise<ChatResult> {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY
  if (!apiKey) {
    return {
      answer:
        'LLM 키가 설정되지 않아 실시간 답변을 만들 수 없습니다. ' +
        'ANTHROPIC_API_KEY 환경변수를 설정하면 사주·점성 교차 데이터에 ' +
        '근거한 답변이 자연 한국어로 생성됩니다.',
      usedLlm: false,
    }
  }

  const model = options.model ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  // Construct messages: prior history + new question.
  // The first user turn carries the report context (cached). Subsequent
  // turns just append.
  const reportPayload = JSON.stringify(compactReport(report), null, 2)
  const messages: Array<{
    role: 'user' | 'assistant'
    content: Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }>
  }> = []

  if (!options.history || options.history.length === 0) {
    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: `다음은 제 운세 리포트입니다.\n\n${reportPayload}\n\n이 리포트를 기억해 두시고, 제가 다음 질문을 드리면 이 데이터에 근거해 답해 주세요.`,
          cache_control: { type: 'ephemeral' },
        },
      ],
    })
    messages.push({
      role: 'assistant',
      content: [{ type: 'text', text: '네, 리포트 잘 봤어요. 어떤 게 궁금하세요?' }],
    })
  } else {
    // Inject the report context as the first turn even with history.
    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: `다음은 제 운세 리포트입니다.\n\n${reportPayload}\n\n이 리포트를 기억해 두시고, 제가 다음 질문을 드리면 이 데이터에 근거해 답해 주세요.`,
          cache_control: { type: 'ephemeral' },
        },
      ],
    })
    messages.push({
      role: 'assistant',
      content: [{ type: 'text', text: '네, 리포트 잘 봤어요. 어떤 게 궁금하세요?' }],
    })
    for (const turn of options.history) {
      messages.push({
        role: turn.role,
        content: [{ type: 'text', text: turn.content }],
      })
    }
  }

  messages.push({
    role: 'user',
    content: [{ type: 'text', text: question }],
  })

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
          { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        ],
        messages,
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
      return {
        answer: '죄송해요, 답변을 만들어 내지 못했어요. 다시 한 번 물어봐 주세요.',
        usedLlm: false,
      }
    }
    return { answer: text, usedLlm: true, model: data.model, usage: data.usage }
  } catch (e) {
    return {
      answer:
        e instanceof Error
          ? `답변 생성 중 오류가 발생했어요: ${e.message}`
          : '답변 생성 중 오류가 발생했어요.',
      usedLlm: false,
    }
  } finally {
    clearTimeout(timeout)
  }
}

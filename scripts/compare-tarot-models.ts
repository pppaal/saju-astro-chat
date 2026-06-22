/**
 * scripts/compare-tarot-models.ts
 *
 * Sonnet vs Haiku A/B 비교 하니스 — 타로 해석(interpret-stream)의 *실제*
 * 프롬프트 빌더(buildInterpretStreamPrompts)를 그대로 써서, 같은 입력을 두
 * 모델에 보내고 출력 품질 + 토큰 + 비용을 나란히 보여준다.
 *
 * 왜: llm-policy.ts 에서 tarot.interpret 를 Sonnet→Haiku 로 내릴지 결정하려면
 * "같은 카드·질문에 두 모델이 실제로 얼마나 다르게 답하나"를 눈으로 봐야 한다.
 *
 * 실행:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/compare-tarot-models.ts
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/compare-tarot-models.ts --lang en
 *
 * I/O 만 여기서; 프롬프트 모양은 프로덕션과 동일(같은 pure 빌더 import).
 */

import { buildInterpretStreamPrompts, type PromptCardInput } from '../src/lib/tarot/promptBuild'

const HAIKU = 'claude-haiku-4-5-20251001'
const SONNET = 'claude-sonnet-4-5-20250929'
// claude.ts 의 CLAUDE_PRICING 과 동일 (per 1M tokens, USD).
const PRICING: Record<string, { input: number; output: number }> = {
  [HAIKU]: { input: 1, output: 5 },
  [SONNET]: { input: 3, output: 15 },
}

const lang: 'ko' | 'en' = process.argv.includes('--lang') ? 'en' : 'ko'

// 대표 픽스처 — 가벼운 질문 1 + 진지한 질문 1 (두 모델 차이가 가장 잘 드러나는 두 결).
const FIXTURES: Array<{
  label: string
  spreadTitle: string
  userQuestion: string
  cards: PromptCardInput[]
}> = [
  {
    label: '가벼운 질문 (오늘 점심)',
    spreadTitle: lang === 'ko' ? '쓰리 카드' : 'Three Card',
    userQuestion: lang === 'ko' ? '오늘 점심 뭐 먹지?' : 'What should I eat for lunch today?',
    cards: [
      {
        name: 'The Sun',
        nameKo: '태양',
        isReversed: false,
        keywords: ['joy', 'vitality', 'success'],
        keywordsKo: ['기쁨', '활력', '성공'],
      },
      {
        name: 'Five of Cups',
        nameKo: '컵 5',
        isReversed: true,
        keywords: ['recovery', 'acceptance'],
        keywordsKo: ['회복', '수용'],
      },
      {
        name: 'Knight of Wands',
        nameKo: '완드 기사',
        isReversed: false,
        keywords: ['energy', 'adventure'],
        keywordsKo: ['에너지', '모험'],
      },
    ],
  },
  {
    label: '진지한 질문 (연애 전개)',
    spreadTitle: lang === 'ko' ? '쓰리 카드' : 'Three Card',
    userQuestion:
      lang === 'ko'
        ? '요즘 자주 연락하는 사람이 있는데, 이 관계가 어떻게 흘러갈까요?'
        : "I've been talking to someone lately — where is this relationship heading?",
    cards: [
      {
        name: 'Two of Cups',
        nameKo: '컵 2',
        isReversed: false,
        keywords: ['connection', 'attraction'],
        keywordsKo: ['연결', '끌림'],
      },
      {
        name: 'The Tower',
        nameKo: '타워',
        isReversed: true,
        keywords: ['avoided disaster', 'fear of change'],
        keywordsKo: ['모면', '변화 두려움'],
      },
      {
        name: 'The Star',
        nameKo: '별',
        isReversed: false,
        keywords: ['hope', 'renewal'],
        keywordsKo: ['희망', '재생'],
      },
    ],
  },
]

async function callModel(model: string, systemPrompt: string, userPrompt: string) {
  const t0 = Date.now()
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY as string,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      temperature: 0.7,
      system: [{ type: 'text', text: systemPrompt }],
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  if (!res.ok) throw new Error(`${model} → ${res.status} ${await res.text()}`)
  const data = (await res.json()) as {
    content: Array<{ type: string; text?: string }>
    usage: { input_tokens: number; output_tokens: number }
  }
  const text = data.content.map((b) => b.text ?? '').join('')
  const { input_tokens: inTok, output_tokens: outTok } = data.usage
  const p = PRICING[model]
  const usd = (inTok * p.input + outTok * p.output) / 1_000_000
  return { text, inTok, outTok, usd, ms: Date.now() - t0 }
}

function pretty(text: string): string {
  try {
    const obj = JSON.parse(text)
    const lines: string[] = []
    lines.push(`  overall: ${obj.overall}`)
    for (const c of obj.cards ?? []) lines.push(`  [${c.position}] ${c.interpretation}`)
    lines.push(`  advice: ${obj.advice}`)
    lines.push(`  hook: ${obj.hook ?? '(none)'}`)
    return lines.join('\n')
  } catch {
    return `  (JSON 파싱 실패 — 원문)\n${text}`
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      'ANTHROPIC_API_KEY 가 없습니다. ANTHROPIC_API_KEY=sk-... npx tsx scripts/compare-tarot-models.ts'
    )
    process.exit(1)
  }
  const costRows: string[] = []
  for (const fx of FIXTURES) {
    const { systemPrompt, userPrompt } = buildInterpretStreamPrompts({
      language: lang,
      spreadTitle: fx.spreadTitle,
      cards: fx.cards,
      userQuestion: fx.userQuestion,
    })
    console.log('\n' + '='.repeat(78))
    console.log(`FIXTURE: ${fx.label}  |  "${fx.userQuestion}"`)
    console.log('='.repeat(78))
    for (const model of [SONNET, HAIKU]) {
      const tag = model === SONNET ? 'SONNET 4.5' : 'HAIKU 4.5 '
      try {
        const r = await callModel(model, systemPrompt, userPrompt)
        console.log(
          `\n── ${tag} ──  (${r.inTok} in / ${r.outTok} out tok · $${r.usd.toFixed(5)} · ${r.ms}ms)`
        )
        console.log(pretty(r.text))
        costRows.push(`${fx.label.padEnd(24)} ${tag}  $${r.usd.toFixed(5)}  (${r.outTok} out)`)
      } catch (e) {
        console.error(`\n── ${tag} ── ERROR:`, e instanceof Error ? e.message : e)
      }
    }
  }
  console.log('\n' + '='.repeat(78))
  console.log('비용 요약 (per reading, prompt-cache 미적용 raw)')
  console.log('='.repeat(78))
  costRows.forEach((r) => console.log('  ' + r))
}

void main()

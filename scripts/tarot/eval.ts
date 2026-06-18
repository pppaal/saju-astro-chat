/**
 * 타로 프롬프트 평가 하니스 — "검증 후에만 머지" 를 가능하게 하는 도구.
 *
 * 운영 interpret-stream 과 *똑같은* 프롬프트(buildInterpretStreamPrompts)로
 * 실제 Claude 를 호출해, 고정 샘플 질문의 리딩 + *펀치라인(hook)* + 지연시간
 * + 토큰을 출력한다. 프롬프트(특히 hook 톤)를 바꾸기 전/후로 돌려 답과 속도를
 * *눈으로* 비교한 뒤에만 운영에 올리기 위함.
 *
 * 실행 (키 있는 로컬/스테이징에서):
 *   ANTHROPIC_API_KEY=sk-... npm run tarot:eval
 *   ANTHROPIC_API_KEY=sk-... npm run tarot:eval -- --lang en
 *
 * 앱/프롬프트는 전혀 건드리지 않는 읽기 전용 도구다.
 */

import { buildInterpretStreamPrompts, type PromptCardInput } from '../../src/lib/tarot/promptBuild'
import {
  callClaude,
  extractJsonObject,
  isClaudeAvailable,
  PREMIUM_CLAUDE_MODEL,
} from '../../src/lib/llm/claude'

type Lang = 'ko' | 'en'

interface SampleCase {
  label: string
  spreadTitle: string
  userQuestion: string
  cards: PromptCardInput[]
}

// 고정 케이스 — 매번 같은 카드/질문이라 프롬프트 변경 전후 비교가 의미 있다.
const CASES: SampleCase[] = [
  {
    label: '연애 2장 (걔 나 좋아하나)',
    spreadTitle: '마음 · 흐름',
    userQuestion: '그 사람 나 좋아하는 거 맞아요?',
    cards: [
      {
        name: 'Eight of Cups',
        nameKo: '컵 8',
        isReversed: false,
        keywordsKo: ['떠남', '미련', '등 돌림'],
      },
      {
        name: 'Four of Wands',
        nameKo: '완드 4',
        isReversed: true,
        keywordsKo: ['불안정', '정착 거부', '도피'],
      },
    ],
  },
  {
    label: '재회 3장',
    spreadTitle: '과거 · 현재 · 미래',
    userQuestion: '3개월 전 헤어진 사람과 다시 잘 될 수 있을까요?',
    cards: [
      {
        name: 'The Lovers',
        nameKo: '연인',
        isReversed: false,
        keywordsKo: ['선택', '결합', '가치관'],
      },
      {
        name: 'Five of Cups',
        nameKo: '컵 5',
        isReversed: true,
        keywordsKo: ['후회', '회복', '용서'],
      },
      { name: 'The Star', nameKo: '별', isReversed: false, keywordsKo: ['희망', '재생', '치유'] },
    ],
  },
  {
    label: '가벼운 1장',
    spreadTitle: '오늘의 한 장',
    userQuestion: '오늘 점심 뭐 먹을까?',
    cards: [
      {
        name: 'Ace of Wands',
        nameKo: '완드 에이스',
        isReversed: false,
        keywordsKo: ['활력', '시작', '열정'],
      },
    ],
  },
]

function parseLang(): Lang {
  const i = process.argv.indexOf('--lang')
  const v = i >= 0 ? process.argv[i + 1] : 'ko'
  return v === 'en' ? 'en' : 'ko'
}

async function runCase(c: SampleCase, lang: Lang): Promise<void> {
  const { systemPrompt, userPrompt } = buildInterpretStreamPrompts({
    language: lang,
    spreadTitle: c.spreadTitle,
    cards: c.cards,
    userQuestion: c.userQuestion,
  })
  const maxTokens = Math.min(6000, 1200 + c.cards.length * 500)

  const t0 = Date.now()
  const { text, outputTokens } = await callClaude({
    systemPrompt,
    userPrompt,
    model: PREMIUM_CLAUDE_MODEL,
    maxTokens,
    temperature: 0.7,
    timeoutMs: 90000,
    label: 'tarot-eval',
  })
  const ms = Date.now() - t0

  const parsed = extractJsonObject<{
    overall?: string
    cards?: Array<{ position?: string; interpretation?: string }>
    advice?: string
    hook?: string
  }>(text)

  const okJson = !!parsed && typeof parsed.overall === 'string'

  console.log('\n' + '='.repeat(72))
  console.log(`[${c.label}] "${c.userQuestion}"  (${c.cards.length}장, ${lang})`)
  console.log(
    `⏱  ${(ms / 1000).toFixed(1)}s  |  out≈${outputTokens ?? '?'} tok  |  JSON ${okJson ? 'OK' : 'FAIL'}`
  )
  console.log('-'.repeat(72))
  if (okJson && parsed) {
    // 펀치라인(hook) 을 제일 위에 — 이게 공유 카드에 박히는 한 줄.
    console.log(`★ HOOK(펀치라인): ${(parsed.hook || '(없음)').trim()}\n`)
    console.log('OVERALL:\n' + (parsed.overall || '').trim() + '\n')
    parsed.cards?.forEach((cd, i) => {
      console.log(`[${i + 1}] ${cd.position || ''}\n${(cd.interpretation || '').trim()}\n`)
    })
    console.log('ADVICE:\n' + (parsed.advice || '').trim())
  } else {
    console.log('⚠ 파싱 실패 — raw 앞부분:\n' + text.slice(0, 500))
  }
}

async function main(): Promise<void> {
  if (!isClaudeAvailable()) {
    console.error('ANTHROPIC_API_KEY 가 없습니다. 예: ANTHROPIC_API_KEY=sk-... npm run tarot:eval')
    process.exit(1)
  }
  const lang = parseLang()
  console.log(
    `타로 프롬프트 평가 — model=${PREMIUM_CLAUDE_MODEL}, lang=${lang}, cases=${CASES.length}`
  )
  const startedAll = Date.now()
  for (const c of CASES) {
    try {
      await runCase(c, lang)
    } catch (err) {
      console.error(`[${c.label}] 호출 실패:`, err instanceof Error ? err.message : err)
    }
  }
  console.log(`\n전체 소요: ${((Date.now() - startedAll) / 1000).toFixed(1)}s`)
}

void main()

/**
 * 타로 프롬프트 평가 하니스 — "검증 후에만 최적화" 를 가능하게 하는 도구.
 *
 * 운영 interpret-stream 과 *똑같은* 프롬프트(buildInterpretStreamPrompts)로
 * 실제 Claude 를 호출해, 고정 샘플 질문 세트의 리딩 결과 + 지연시간 + 토큰을
 * 출력한다. 프롬프트를 바꾸기 전/후로 이걸 돌려 답 품질과 속도를 *눈으로*
 * 비교한 뒤에만 운영에 올리기 위함. (#1487 사고: 검증 없이 프롬프트를 바꿔
 * interpret 가 느려져 운영에서 해석이 안 나왔음.)
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
// (연애 3장 / 이직 5장 / 가벼운 1장 — 무게가 다른 대표 3종.)
const CASES: SampleCase[] = [
  {
    label: '연애 3장',
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
    label: '이직 5장',
    spreadTitle: '상황 · 장애 · 조언 · 흐름 · 결과',
    userQuestion: '지금 회사를 그만두고 이직하는 게 맞을까요?',
    cards: [
      {
        name: 'Eight of Pentacles',
        nameKo: '펜타클 8',
        isReversed: false,
        keywordsKo: ['숙련', '노력', '집중'],
      },
      { name: 'The Devil', nameKo: '악마', isReversed: true, keywordsKo: ['속박', '집착', '해방'] },
      {
        name: 'Two of Swords',
        nameKo: '소드 2',
        isReversed: false,
        keywordsKo: ['결정 보류', '교착', '균형'],
      },
      {
        name: 'The Chariot',
        nameKo: '전차',
        isReversed: false,
        keywordsKo: ['추진', '의지', '승리'],
      },
      {
        name: 'Ten of Pentacles',
        nameKo: '펜타클 10',
        isReversed: false,
        keywordsKo: ['안정', '결실', '기반'],
      },
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
  }>(text)

  const okJson = !!parsed && typeof parsed.overall === 'string'
  const cardCount = parsed?.cards?.length ?? 0

  console.log('\n' + '='.repeat(72))
  console.log(`[${c.label}] "${c.userQuestion}"  (${c.cards.length}장, ${lang})`)
  console.log(
    `⏱  ${(ms / 1000).toFixed(1)}s   |  out≈${outputTokens ?? '?'} tok   |  JSON ${okJson ? 'OK' : 'FAIL'}   |  cards ${cardCount}/${c.cards.length}`
  )
  console.log('-'.repeat(72))
  if (okJson && parsed) {
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

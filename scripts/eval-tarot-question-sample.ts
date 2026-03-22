import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { analyzeTarotQuestionV2 } from '@/lib/Tarot/questionEngineV2'

type EvalRow = {
  question: string
  source: string
  intent: string
  themeId: string
  spreadId: string
  intentLabel: string
}

const QUESTION_POOL = [
  '내일 그 사람이 나한테 연락할까?',
  '걔 지금 내 생각해?',
  '이번 주에 면접 결과 나올까?',
  '내가 먼저 연락하는 게 맞아?',
  '지금 이직해도 될까?',
  '올해 연애운 어떻게 흘러가?',
  '헤어진 사람이 다시 올까?',
  '그 사람 속마음이 뭐야?',
  '이번 시험 붙을까?',
  '이번 달 돈 흐름 괜찮을까?',
  '지금 관계를 이어가도 될까?',
  '다음 달에 직장 옮기면 나을까?',
  '걔가 나 좋아하나?',
  '오늘 나한테 필요한 조언은?',
  '지금 내 흐름이 어떤지 알고 싶어',
  '이번 프로젝트 잘 끝날까?',
  '그 사람과 다시 만날 가능성 있어?',
  '내가 기다리는 게 맞을까?',
  '언제쯤 연락이 올까?',
  '이번 주 안에 결과 나올까?',
  '지금 고백해도 될까?',
  '상대가 왜 이렇게 거리 두는지 궁금해',
  '이번 연애는 오래갈까?',
  '이 관계는 끝난 걸까?',
  '오늘은 그냥 쉬는 게 맞아?',
  '지금 공부 방향 맞아?',
  '취업운이 언제 풀릴까?',
  '그 회사 합격 가능성 어때?',
  '내 커리어 큰 흐름이 어떻게 가고 있어?',
  '이번 거래 성사될까?',
  '그 사람이 다시 생각 바꿀까?',
  '지금 만나는 사람과 결혼 가능성 있어?',
  '내가 움직이면 관계가 달라질까?',
  '언제 이사하는 게 좋을까?',
  '이번 선택이 나중에 후회될까?',
  '걔는 왜 읽씹하는 걸까?',
  '이번 달 매출 오를까?',
  '내 건강 흐름 체크해줘',
  '지금 투자 들어가도 될까?',
  '내가 참고 기다리면 좋아질까?',
  '이번 재회 가능성 현실적으로 있어?',
  '그 사람은 나를 어떻게 보고 있어?',
  '내 마음 정리하는 게 맞을까?',
  '이번 협업 계속해도 될까?',
  '언제쯤 일이 풀릴지 궁금해',
  '이번 주 소개팅 잘될까?',
  '지금 관계에서 내가 놓치고 있는 건 뭐야?',
  '걔가 오늘 연락할 확률 있어?',
  '내일 회의 분위기 어때?',
  '이 계약 사인해도 될까?',
  '이번 달 전체 운세 봐줘',
  '현재 내가 가는 방향이 맞는지 보고 싶어',
  '그 사람은 아직 미련 있어?',
  '내가 고백하면 받아줄까?',
  '이번 분기 사업운 어때?',
  '이번 이별에서 배워야 할 건 뭐야?',
  '지금 집 사는 게 맞아?',
  '언제쯤 재정이 안정될까?',
  '상대방이 다시 찾아올 타이밍이 있을까?',
  '올해 안에 연애 시작할까?',
  '내가 먼저 사과하면 반응이 어떨까?',
  '이 사람 믿어도 될까?',
  '관계 흐름이 왜 자꾸 꼬이는지 보고 싶어',
  '이번 여행 가도 괜찮을까?',
  '그 사람 마음이 식은 걸까?',
  '지금 회사를 그만두면 후회할까?',
  '내 다음 한 수가 뭐여야 해?',
  '결국 우리는 어떻게 될까?',
  '이번 주 중요한 연락 올까?',
  '상대가 숨기는 감정이 있을까?',
  '이번 달 내 전체 흐름이 궁금해',
]

function parseArg(name: string, fallback: string): string {
  const index = process.argv.findIndex((arg) => arg === `--${name}`)
  if (index < 0) return fallback
  return process.argv[index + 1] || fallback
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function pickQuestions(count: number, seed: number): string[] {
  const random = createSeededRandom(seed)
  const pool = [...QUESTION_POOL]

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  return pool.slice(0, Math.min(count, pool.length))
}

function countBy<T extends string>(items: T[]): Array<[T, number]> {
  const map = new Map<T, number>()
  for (const item of items) {
    map.set(item, (map.get(item) || 0) + 1)
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1])
}

async function main() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    Object.assign(process.env, dotenv.parse(fs.readFileSync(envPath)))
  }

  const count = Number.parseInt(parseArg('count', '50'), 10)
  const seed = Number.parseInt(parseArg('seed', '20260320'), 10)
  const questions = pickQuestions(count, seed)

  const results: EvalRow[] = []
  for (const question of questions) {
    const analyzed = await analyzeTarotQuestionV2({ question, language: 'ko' })
    results.push({
      question,
      source: analyzed.source || 'unknown',
      intent: analyzed.intent || 'unknown',
      themeId: analyzed.themeId,
      spreadId: analyzed.spreadId,
      intentLabel: analyzed.intent_label,
    })
  }

  const unknownRows = results.filter((row) => row.intent === 'unknown')
  const fallbackRows = results.filter((row) => row.source === 'fallback')

  console.log(`sample_count=${results.length} seed=${seed}`)
  console.log(`sources=${JSON.stringify(countBy(results.map((row) => row.source)))}`)
  console.log(`intents=${JSON.stringify(countBy(results.map((row) => row.intent)))}`)
  console.log(
    `spreads=${JSON.stringify(countBy(results.map((row) => `${row.themeId}/${row.spreadId}`)).slice(0, 10))}`
  )
  console.log(`unknown_count=${unknownRows.length}`)
  console.log(`fallback_count=${fallbackRows.length}`)

  if (unknownRows.length > 0) {
    console.log('unknown_examples=')
    for (const row of unknownRows.slice(0, 12)) {
      console.log(`- ${row.question} => ${row.themeId}/${row.spreadId} (${row.source})`)
    }
  }

  console.log('sample_rows=')
  for (const row of results) {
    console.log(
      `- [${row.source}] ${row.question} => ${row.intent} | ${row.themeId}/${row.spreadId}`
    )
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

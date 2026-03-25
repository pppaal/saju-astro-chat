import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { analyzeTarotQuestionV2 } from '@/lib/Tarot/questionEngineV2'
import {
  questionEngineGoldenCases,
  type QuestionEngineGoldenCase,
} from '../tests/lib/Tarot/data/questionEngineGoldenCases'

type ReportRow = QuestionEngineGoldenCase & {
  source: string
  actualIntent: string
  actualThemeId: string
  actualSpreadId: string
  passed: boolean
}

function parseArg(name: string, fallback?: string): string | undefined {
  const index = process.argv.findIndex((arg) => arg === `--${name}`)
  if (index < 0) return fallback
  return process.argv[index + 1] || fallback
}

function ensureDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

async function main() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    Object.assign(process.env, dotenv.parse(fs.readFileSync(envPath)))
  }

  const outPath =
    parseArg('out', path.join('reports', 'quality', 'tarot_question_engine_latest.json')) ||
    path.join('reports', 'quality', 'tarot_question_engine_latest.json')

  const rows: ReportRow[] = []

  for (const item of questionEngineGoldenCases) {
    const result = await analyzeTarotQuestionV2({
      question: item.question,
      language: 'ko',
    })

    const passed =
      result.intent === item.intent &&
      result.themeId === item.themeId &&
      result.spreadId === item.spreadId

    rows.push({
      ...item,
      source: result.source,
      actualIntent: result.intent,
      actualThemeId: result.themeId,
      actualSpreadId: result.spreadId,
      passed,
    })
  }

  const summary = {
    count: rows.length,
    passed: rows.filter((row) => row.passed).length,
    failed: rows.filter((row) => !row.passed).length,
    heuristicCount: rows.filter((row) => row.source === 'heuristic').length,
    llmCount: rows.filter((row) => row.source === 'llm').length,
    failures: rows
      .filter((row) => !row.passed)
      .map((row) => ({
        id: row.id,
        question: row.question,
        expected: `${row.intent} | ${row.themeId}/${row.spreadId}`,
        actual: `${row.actualIntent} | ${row.actualThemeId}/${row.actualSpreadId}`,
        source: row.source,
      })),
    rows,
  }

  ensureDir(outPath)
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf-8')

  console.log(`golden_count=${summary.count}`)
  console.log(`golden_passed=${summary.passed}`)
  console.log(`golden_failed=${summary.failed}`)
  console.log(`sources=${JSON.stringify({ heuristic: summary.heuristicCount, llm: summary.llmCount })}`)

  if (summary.failures.length > 0) {
    console.log('golden_failures=')
    for (const item of summary.failures) {
      console.log(`- ${item.id}: ${item.expected} -> ${item.actual} [${item.source}]`)
    }
  }

  console.log(`report_path=${outPath}`)

  if (summary.failed > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

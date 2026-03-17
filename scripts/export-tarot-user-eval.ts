import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { extractStoredQuestionContext } from '../src/lib/Tarot/savedReadingPayload'

type ExportRow = {
  query: string
  question: string
  createdAt: string
  theme: string | null
  spreadId: string
  spreadTitle: string
  locale: string
  source: string
  questionContext: ReturnType<typeof extractStoredQuestionContext>
}

function parseArg(name: string, fallback?: string): string | undefined {
  const idx = process.argv.indexOf(name)
  if (idx >= 0 && process.argv[idx + 1]) {
    return process.argv[idx + 1]
  }
  return fallback
}

function parseIntArg(name: string, fallback: number): number {
  const raw = parseArg(name)
  const parsed = raw ? Number(raw) : fallback
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function normalizeQuestionKey(question: string): string {
  return question.trim().toLowerCase().replace(/\s+/g, ' ')
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to export tarot user eval samples')
  }

  const { prisma } = await import('../src/lib/db/prisma')

  try {
    const limit = parseIntArg('--limit', 500)
    const days = parseIntArg('--days', 120)
    const outPath = parseArg('--out', 'reports/quality/tarot_user_eval_seed.jsonl')!

    const start = new Date()
    start.setDate(start.getDate() - days)

    const rows = await prisma.tarotReading.findMany({
      where: {
        createdAt: { gte: start },
        question: { not: '' },
        source: 'standalone',
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 4,
      select: {
        question: true,
        theme: true,
        spreadId: true,
        spreadTitle: true,
        locale: true,
        source: true,
        createdAt: true,
        cards: true,
      },
    })

    const deduped: ExportRow[] = []
    const seen = new Set<string>()

    for (const row of rows) {
      const question = row.question.trim()
      if (!question) {
        continue
      }

      const key = normalizeQuestionKey(question)
      if (seen.has(key)) {
        continue
      }
      seen.add(key)

      deduped.push({
        query: question,
        question,
        createdAt: row.createdAt.toISOString(),
        theme: row.theme,
        spreadId: row.spreadId,
        spreadTitle: row.spreadTitle,
        locale: row.locale,
        source: row.source,
        questionContext: extractStoredQuestionContext(row.cards),
      })

      if (deduped.length >= limit) {
        break
      }
    }

    const output = deduped.map((row) => JSON.stringify(row)).join('\n')
    const absoluteOutPath = path.resolve(outPath)
    await mkdir(path.dirname(absoluteOutPath), { recursive: true })
    await writeFile(absoluteOutPath, output ? `${output}\n` : '', 'utf8')

    console.log(
      JSON.stringify(
        {
          output: absoluteOutPath,
          exported: deduped.length,
          requestedLimit: limit,
          lookbackDays: days,
        },
        null,
        2
      )
    )
  } finally {
    await prisma.$disconnect().catch(() => undefined)
  }
}

main()
  .catch((error) => {
    console.error('[export-tarot-user-eval] failed', error)
    process.exitCode = 1
  })

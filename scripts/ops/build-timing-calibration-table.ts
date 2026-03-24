import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { prisma } from '../../src/lib/db/prisma'
import {
  aggregateDestinyCalibration,
  type DestinyCalibrationSourceRow,
} from '../../src/lib/destiny-matrix/calibration'

interface CliOptions {
  out?: string
  pretty: boolean
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { pretty: true }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--out') {
      options.out = argv[index + 1]
      index += 1
      continue
    }
    if (arg === '--compact') {
      options.pretty = false
    }
  }
  return options
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  const rows = await prisma.userInteraction.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      metadata: true,
    },
  })

  const report = aggregateDestinyCalibration(rows as DestinyCalibrationSourceRow[])
  const output = JSON.stringify(report, null, options.pretty ? 2 : undefined)

  if (options.out) {
    const absolute = path.isAbsolute(options.out)
      ? options.out
      : path.join(process.cwd(), options.out)
    await mkdir(path.dirname(absolute), { recursive: true })
    await writeFile(absolute, output, 'utf8')
  } else {
    process.stdout.write(`${output}\n`)
  }

  await prisma.$disconnect().catch(() => undefined)
}

main().catch(async (error) => {
  console.error('[build-timing-calibration-table] failed:', error)
  await prisma.$disconnect().catch(() => undefined)
  process.exitCode = 1
})

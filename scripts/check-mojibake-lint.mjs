import { promises as fs } from 'fs'
import path from 'path'

const ROOTS = ['src/app', 'src/components', 'src/i18n', 'src/lib']
const VALID_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mdx', '.json', '.css'])

const SKIP_FILES = new Set([
  path.normalize('src/components/calendar/SelectedDatePanel.tsx'),
  path.normalize('src/components/calendar/CalendarActionPlanView.tsx'),
  path.normalize('src/app/api/demo/ai-review/route.ts'),
])

const SUSPICIOUS_PATTERNS = [
  {
    name: 'replacement-char',
    regex: /\uFFFD/u,
  },
  {
    // Typical UTF-8 decoded as latin-1/cp1252 markers
    name: 'cp1252-marker',
    regex: /(?:[\u00C2\u00C3][^\sA-Za-z0-9]|[\u00E2][^\sA-Za-z0-9])/u,
  },
  {
    // Common broken Hangul byte sequences (e.g., ê°, ë°, ì—, í•)
    name: 'korean-mojibake-marker',
    regex:
      /(?:\u00EA[\u00B0-\u00BF]|\u00EB[\u0080-\u00BF]|\u00EC[\u0080-\u00BF]|\u00ED[\u0080-\u00BF]|\u00C2\u00B7)/u,
  },
  {
    // C1 control range frequently appears in mojibake
    name: 'c1-control-char',
    regex: /[\u0080-\u009F]/u,
  },
]

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        return walk(fullPath)
      }
      return [fullPath]
    })
  )
  return nested.flat()
}

function normalizePath(filePath) {
  return path.normalize(filePath).replace(/\\/g, '/')
}

async function main() {
  const findings = []

  for (const root of ROOTS) {
    const rootPath = path.resolve(root)
    let files

    try {
      files = await walk(rootPath)
    } catch {
      continue
    }

    for (const absoluteFile of files) {
      const ext = path.extname(absoluteFile)
      if (!VALID_EXTENSIONS.has(ext)) {
        continue
      }

      const relativeFile = normalizePath(path.relative(process.cwd(), absoluteFile))
      if (SKIP_FILES.has(path.normalize(relativeFile)) || SKIP_FILES.has(relativeFile)) {
        continue
      }

      const content = await fs.readFile(absoluteFile, 'utf8')
      const lines = content.split(/\r?\n/)

      lines.forEach((line, index) => {
        for (const pattern of SUSPICIOUS_PATTERNS) {
          if (!pattern.regex.test(line)) {
            continue
          }
          findings.push({
            file: relativeFile,
            line: index + 1,
            rule: pattern.name,
            snippet: line.trim().slice(0, 180),
          })
          break
        }
      })
    }
  }

  if (findings.length === 0) {
    console.log('No mojibake markers found in source files.')
    return
  }

  console.error(`Detected ${findings.length} suspicious mojibake line(s):`)
  for (const finding of findings.slice(0, 200)) {
    console.error(
      `- ${finding.file}:${finding.line} [${finding.rule}] ${finding.snippet || '(blank line)'}`
    )
  }

  process.exit(1)
}

main().catch((error) => {
  console.error('Mojibake lint failed with an unexpected error:', error)
  process.exit(1)
})

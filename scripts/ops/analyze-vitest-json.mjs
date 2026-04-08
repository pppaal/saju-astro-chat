import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

function parseFlag(name, fallback = '') {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`))
  if (direct) return direct.slice(name.length + 3)
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]
  return fallback
}

function normalizeFailureEntries(data) {
  const files = data.testResults || data.files || []
  const out = []
  for (const file of files) {
    const assertions = file.assertionResults || file.tests || []
    for (const test of assertions) {
      const status = test.status || test.result?.state
      if (status !== 'failed' && status !== 'fail') continue
      out.push({
        file: file.name || file.file || file.testFilePath || 'unknown',
        title: test.fullName || test.name || 'unknown',
        message: (test.failureMessages || [test.errors?.[0]?.message || test.error || ''])
          .filter(Boolean)
          .join('\n'),
      })
    }
  }
  return out
}

function classifyFailure(item) {
  const haystack = `${item.file}\n${item.title}\n${item.message}`.toLowerCase()
  if (/401|403|unauthorized|forbidden|token/.test(haystack)) return 'auth-or-guard'
  if (/testinglibraryelementerror|accessible element|aria-label|service selector|select service/.test(haystack)) {
    return 'ui-a11y-or-copy'
  }
  if (/missing module file|cannot find module|comprehensive-imports/.test(haystack)) {
    return 'import-or-module-drift'
  }
  if (/expected .* to be|spy.*called with|deeply equal|contract|payload/.test(haystack)) {
    return 'contract-drift'
  }
  if (/typeerror|cannot read properties|not wrapped in act/.test(haystack)) {
    return 'hook-or-runtime'
  }
  if (/rate.?limit|redis/.test(haystack)) return 'rate-limit-or-env'
  if (/destiny-matrix|pdfgenerator|reportservice|compatibility\/route\.mega/.test(haystack)) {
    return 'report-or-engine'
  }
  if (/locale|select service|뉴욕, 미국|new york, us|english|korean/.test(haystack)) {
    return 'i18n-or-copy'
  }
  return 'other'
}

function groupCounts(items, keyFn) {
  const map = new Map()
  for (const item of items) {
    const key = keyFn(item)
    map.set(key, (map.get(key) || 0) + 1)
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, count }))
}

const input = parseFlag('input')
const outputJson = parseFlag('out-json')
const outputMd = parseFlag('out-md')

if (!input || !existsSync(input)) {
  console.error(`[vitest-triage] missing input: ${input}`)
  process.exit(1)
}

const data = JSON.parse(readFileSync(input, 'utf8'))
const failures = normalizeFailureEntries(data).map((item) => ({
  ...item,
  category: classifyFailure(item),
}))

const summary = {
  numTotalTests: data.numTotalTests ?? null,
  numPassedTests: data.numPassedTests ?? null,
  numFailedTests: data.numFailedTests ?? failures.length,
  numPendingTests: data.numPendingTests ?? null,
  categories: groupCounts(failures, (item) => item.category),
  failingFiles: groupCounts(failures, (item) => item.file).slice(0, 20),
  sampleFailures: failures.slice(0, 20),
}

const markdown = [
  '## Vitest Triage Summary',
  '',
  `- Total tests: ${summary.numTotalTests ?? 'unknown'}`,
  `- Passed: ${summary.numPassedTests ?? 'unknown'}`,
  `- Failed: ${summary.numFailedTests}`,
  `- Skipped/Pending: ${summary.numPendingTests ?? 'unknown'}`,
  '',
  '### Failure Categories',
  ...summary.categories.map((item) => `- ${item.key}: ${item.count}`),
  '',
  '### Top Failing Files',
  ...summary.failingFiles.map((item) => `- ${item.key}: ${item.count}`),
  '',
  '### Sample Failures',
  ...summary.sampleFailures.slice(0, 8).map(
    (item) => `- [${item.category}] ${item.file} :: ${item.title}`
  ),
  '',
].join('\n')

if (outputJson) {
  mkdirSync(dirname(outputJson), { recursive: true })
  writeFileSync(outputJson, JSON.stringify(summary, null, 2))
}
if (outputMd) {
  mkdirSync(dirname(outputMd), { recursive: true })
  writeFileSync(outputMd, markdown)
}

console.log(markdown)

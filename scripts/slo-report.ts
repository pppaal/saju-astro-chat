import fs from 'node:fs'
import path from 'node:path'
import {
  buildSLOReport,
  DEFAULT_SLO_THRESHOLDS,
  type SLOInput,
  type SLOThresholds,
} from '../src/lib/ops/slo'

interface TypecheckBaseline {
  generatedAt?: string
  totalErrors?: number
  errorCodes?: Record<string, number>
}

function readArg(flag: string): string | null {
  const index = process.argv.indexOf(flag)
  if (index === -1 || index >= process.argv.length - 1) return null
  return process.argv[index + 1]
}

function asNumber(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function readJsonIfExists<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
}

function ensureParentDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function defaultPeriodLabel(): string {
  const end = new Date()
  const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000)
  const toIsoDate = (date: Date) => date.toISOString().slice(0, 10)
  return `${toIsoDate(start)}..${toIsoDate(end)}`
}

function buildMarkdown(params: {
  report: ReturnType<typeof buildSLOReport>
  typecheckBaseline: TypecheckBaseline | null
  inputPath: string
  outputJsonPath: string
}): string {
  const { report, typecheckBaseline, inputPath, outputJsonPath } = params
  const metricLines = report.metrics
    .map((metric) => {
      const current = metric.current === null ? 'n/a' : `${metric.current}${metric.unit}`
      return `| ${metric.key} | ${metric.status} | ${current} | ${metric.threshold}${metric.unit} |`
    })
    .join('\n')

  const typecheckTotal = typecheckBaseline?.totalErrors ?? 'n/a'
  const typecheckGeneratedAt = typecheckBaseline?.generatedAt ?? 'n/a'

  return `# Weekly SLO Report

- generatedAt: ${report.generatedAt}
- period: ${report.periodLabel}
- overallStatus: ${report.overallStatus}

## SLO Summary

| metric | status | current | threshold |
| --- | --- | --- | --- |
${metricLines}

## Counts

- pass: ${report.summary.pass}
- warning: ${report.summary.warning}
- fail: ${report.summary.fail}
- noData: ${report.summary.noData}

## Typecheck Health

- totalErrors: ${typecheckTotal}
- baselineGeneratedAt: ${typecheckGeneratedAt}

## References

- input: ${inputPath}
- outputJson: ${outputJsonPath}
`
}

const inputPath = readArg('--in') ?? 'reports/ops/slo-input.json'
const outputJsonPath = readArg('--out-json') ?? 'reports/ops/slo-report.json'
const outputMdPath = readArg('--out-md') ?? 'reports/ops/slo-report.md'
const thresholdsPath = readArg('--thresholds')
const periodLabel = readArg('--period') ?? defaultPeriodLabel()

const inputFile = readJsonIfExists<SLOInput>(inputPath)
const thresholdFile = thresholdsPath
  ? readJsonIfExists<Partial<SLOThresholds>>(thresholdsPath)
  : null

const envInput: SLOInput = {
  availabilityPercent: asNumber(process.env.SLO_AVAILABILITY_PERCENT),
  p95LatencyMs: asNumber(process.env.SLO_P95_LATENCY_MS),
  errorRatePercent: asNumber(process.env.SLO_ERROR_RATE_PERCENT),
}

const mergedInput: SLOInput = {
  availabilityPercent: inputFile?.availabilityPercent ?? envInput.availabilityPercent,
  p95LatencyMs: inputFile?.p95LatencyMs ?? envInput.p95LatencyMs,
  errorRatePercent: inputFile?.errorRatePercent ?? envInput.errorRatePercent,
}

const thresholds: SLOThresholds = {
  availabilityPercent:
    thresholdFile?.availabilityPercent ?? DEFAULT_SLO_THRESHOLDS.availabilityPercent,
  p95LatencyMs: thresholdFile?.p95LatencyMs ?? DEFAULT_SLO_THRESHOLDS.p95LatencyMs,
  errorRatePercent: thresholdFile?.errorRatePercent ?? DEFAULT_SLO_THRESHOLDS.errorRatePercent,
}

const report = buildSLOReport(mergedInput, {
  generatedAt: new Date().toISOString(),
  periodLabel,
  thresholds,
})

const typecheckBaseline = readJsonIfExists<TypecheckBaseline>('reports/typecheck/baseline.json')

const reportPayload = {
  ...report,
  sources: {
    inputPath,
    thresholdsPath: thresholdsPath ?? null,
    typecheckBaselinePath: typecheckBaseline ? 'reports/typecheck/baseline.json' : null,
  },
  typecheck: {
    totalErrors: typecheckBaseline?.totalErrors ?? null,
    generatedAt: typecheckBaseline?.generatedAt ?? null,
    errorCodes: typecheckBaseline?.errorCodes ?? null,
  },
}

ensureParentDir(outputJsonPath)
fs.writeFileSync(outputJsonPath, `${JSON.stringify(reportPayload, null, 2)}\n`, 'utf8')

const markdown = buildMarkdown({
  report,
  typecheckBaseline,
  inputPath,
  outputJsonPath,
})
ensureParentDir(outputMdPath)
fs.writeFileSync(outputMdPath, `${markdown.trimEnd()}\n`, 'utf8')

console.log(`[ops:slo:report] wrote ${outputJsonPath}`)
console.log(`[ops:slo:report] wrote ${outputMdPath}`)
console.log(`[ops:slo:report] overallStatus=${report.overallStatus}`)

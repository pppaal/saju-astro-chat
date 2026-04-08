import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { runDestinyCore } from '../../src/lib/destiny-matrix/core/runDestinyCore'
import { adaptCoreToCounselor } from '../../src/lib/destiny-matrix/core/adapters'
import {
  buildCounselorEvidencePacket,
  formatCounselorEvidencePacket,
} from '../../src/lib/destiny-matrix/counselorEvidence'
import {
  createCaseFixture,
  createCounselorRegressionCases,
  getLocalizedText,
  questionDirectnessHit,
  trimText,
  toStatus,
  type QALang,
  type QAStatus,
  type QuestionCase,
} from './destinyQaShared'

type CounselorResult = {
  id: string
  theme: string
  lang: QALang
  question: string
  status: QAStatus
  checks: Array<{ name: string; status: QAStatus; detail: string }>
  focusDomain: string
  topDecisionLabel: string | null
  verdict: string
  guardrail: string
  timingHint: string
  topAnchorSummary: string
  allowedActions: string[]
  blockedActions: string[]
  policyMode?: string
  packetPreview: string
}

function parseLangs(): QALang[] {
  const raw = process.argv.find((arg) => arg.startsWith('--lang='))?.split('=')[1]
  if (!raw || raw === 'both') return ['ko', 'en']
  return raw === 'en' ? ['en'] : ['ko']
}

async function evaluateCase(questionCase: QuestionCase, lang: QALang): Promise<CounselorResult> {
  const { input, matrixSummary, matrixReport } = createCaseFixture(questionCase.theme, lang)
  const question = getLocalizedText(questionCase.question, lang)

  const core = runDestinyCore({
    mode: questionCase.theme === 'life' ? 'comprehensive' : 'themed',
    lang,
    matrixInput: input,
    matrixReport,
    matrixSummary,
  })
  const counselor = adaptCoreToCounselor(core, lang)
  const packet = buildCounselorEvidencePacket({
    theme: questionCase.theme,
    lang,
    questionText: question,
    matrixInput: input,
    matrixReport,
    matrixSummary,
    signalSynthesis: core.signalSynthesis,
    strategyEngine: core.strategyEngine,
    core,
    birthDate: input.profileContext?.birthDate,
  })
  const formatted = formatCounselorEvidencePacket(packet, lang)

  const checks: Array<{ name: string; status: QAStatus; detail: string }> = []

  checks.push({
    name: 'expected domain hit',
    status: questionCase.expectedDomains.includes(packet.focusDomain) ? 'PASS' : 'WARN',
    detail: `expected=${questionCase.expectedDomains.join('/')} actual=${packet.focusDomain}`,
  })

  checks.push({
    name: 'decision exposed',
    status: counselor.topDecisionLabel ? 'PASS' : 'FAIL',
    detail: counselor.topDecisionLabel || 'missing top decision label',
  })

  const actionHints = questionCase.expectedActionHints.map((item) => getLocalizedText(item, lang))
  const actionPool = [
    packet.verdict,
    packet.canonicalBrief?.topDecisionLabel || '',
    packet.canonicalBrief?.primaryAction || '',
    packet.topDomainAdvisory?.action || '',
    packet.topTimingWindow?.whyNow || '',
    ...(packet.canonicalBrief?.allowedActions || []),
    ...(packet.canonicalBrief?.softChecks || []),
  ].join(' ')
  const actionHit = actionHints.some((hint) =>
    actionPool.toLowerCase().includes(String(hint).toLowerCase())
  )
  checks.push({
    name: 'action language fit',
    status: actionHit ? 'PASS' : 'WARN',
    detail: `hints=${actionHints.join('/')} | pool=${trimText(actionPool, 180)}`,
  })

  checks.push({
    name: 'direct answer tone',
    status: questionDirectnessHit(
      [packet.verdict, packet.topDomainAdvisory?.action].join(' '),
      lang
    )
      ? 'PASS'
      : 'WARN',
    detail: trimText(packet.verdict, 140),
  })

  checks.push({
    name: 'guardrail present',
    status: packet.guardrail && packet.guardrail.length > 12 ? 'PASS' : 'FAIL',
    detail: trimText(packet.guardrail, 120),
  })

  checks.push({
    name: 'timing grounding',
    status:
      Boolean(packet.topTimingWindow?.whyNow) || Boolean(packet.canonicalBrief?.timingHint)
        ? 'PASS'
        : 'WARN',
    detail: trimText(
      packet.topTimingWindow?.whyNow || packet.canonicalBrief?.timingHint || '',
      120
    ),
  })

  checks.push({
    name: 'evidence anchor present',
    status: packet.topAnchorSummary ? 'PASS' : 'WARN',
    detail: trimText(packet.topAnchorSummary, 120),
  })

  return {
    id: questionCase.id,
    theme: questionCase.theme,
    lang,
    question,
    status: toStatus(checks),
    checks,
    focusDomain: packet.focusDomain,
    topDecisionLabel: counselor.topDecisionLabel,
    verdict: packet.verdict,
    guardrail: packet.guardrail,
    timingHint: packet.canonicalBrief?.timingHint || packet.topTimingWindow?.whyNow || '',
    topAnchorSummary: packet.topAnchorSummary,
    allowedActions: packet.canonicalBrief?.allowedActions || [],
    blockedActions: packet.canonicalBrief?.blockedActions || [],
    policyMode: packet.canonicalBrief?.policyMode,
    packetPreview: trimText(formatted, 420),
  }
}

function renderMarkdown(results: CounselorResult[], lang: QALang): string {
  const pass = results.filter((item) => item.status === 'PASS').length
  const warn = results.filter((item) => item.status === 'WARN').length
  const fail = results.filter((item) => item.status === 'FAIL').length

  const lines: string[] = [
    '# Counselor Regression',
    '',
    `- Language: ${lang}`,
    `- Generated at: ${new Date().toISOString()}`,
    `- Summary: PASS ${pass}, WARN ${warn}, FAIL ${fail}`,
    '',
  ]

  for (const item of results) {
    lines.push(`## ${item.id} [${item.status}]`)
    lines.push(`- Theme: ${item.theme}`)
    lines.push(`- Question: ${item.question}`)
    lines.push(`- Focus: ${item.focusDomain}`)
    lines.push(`- Top decision: ${item.topDecisionLabel || 'none'}`)
    lines.push(`- Verdict: ${item.verdict}`)
    lines.push(`- Guardrail: ${item.guardrail}`)
    lines.push(`- Timing: ${item.timingHint}`)
    lines.push(`- Anchor: ${item.topAnchorSummary}`)
    lines.push(`- Allowed: ${item.allowedActions.join(', ') || '-'}`)
    lines.push(`- Blocked: ${item.blockedActions.join(', ') || '-'}`)
    lines.push('')
    lines.push('Checks:')
    for (const check of item.checks) {
      lines.push(`- [${check.status}] ${check.name}: ${check.detail}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

async function runForLang(
  lang: QALang
): Promise<{ results: CounselorResult[]; jsonPath: string; mdPath: string }> {
  const cases = createCounselorRegressionCases()
  const results: CounselorResult[] = []

  for (const item of cases) {
    results.push(await evaluateCase(item, lang))
  }

  const outputDir = join(process.cwd(), 'reports', 'ops')
  mkdirSync(outputDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const base = `counselor-regression-${lang}-${stamp}`
  const jsonPath = join(outputDir, `${base}.json`)
  const mdPath = join(outputDir, `${base}.md`)

  writeFileSync(jsonPath, JSON.stringify({ lang, results }, null, 2), 'utf8')
  writeFileSync(mdPath, renderMarkdown(results, lang), 'utf8')

  return { results, jsonPath, mdPath }
}

async function main() {
  const langs = parseLangs()
  let totalPass = 0
  let totalWarn = 0
  let totalFail = 0

  for (const lang of langs) {
    const { results, jsonPath, mdPath } = await runForLang(lang)
    const pass = results.filter((item) => item.status === 'PASS').length
    const warn = results.filter((item) => item.status === 'WARN').length
    const fail = results.filter((item) => item.status === 'FAIL').length
    totalPass += pass
    totalWarn += warn
    totalFail += fail
    console.log(`[counselor-regression][${lang}] wrote ${jsonPath}`)
    console.log(`[counselor-regression][${lang}] wrote ${mdPath}`)
    console.log(`[counselor-regression][${lang}] PASS=${pass} WARN=${warn} FAIL=${fail}`)
  }

  console.log(`[counselor-regression][total] PASS=${totalPass} WARN=${totalWarn} FAIL=${totalFail}`)
}

main().catch((error) => {
  console.error('[counselor-regression] failed', error)
  process.exitCode = 1
})

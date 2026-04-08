import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { runDestinyCore } from '../../src/lib/destiny-matrix/core/runDestinyCore'
import {
  adaptCoreToCalendar,
  adaptCoreToCounselor,
  adaptCoreToReport,
} from '../../src/lib/destiny-matrix/core/adapters'
import { buildCounselorEvidencePacket } from '../../src/lib/destiny-matrix/counselorEvidence'
import {
  generateAIPremiumReport,
  generateThemedReport,
} from '../../src/lib/destiny-matrix/ai-report/aiReportService'
import type { TimingData } from '../../src/lib/destiny-matrix/ai-report/types'
import {
  createCaseFixture,
  createServiceQaCases,
  createTimingData,
  getLocalizedText,
  mapThemeToFocus,
  questionDirectnessHit,
  trimText,
  toStatus,
  type QALang,
  type QAStatus,
  type QuestionCase,
} from './destinyQaShared'

type CaseResult = {
  id: string
  theme: string
  lang: QALang
  question: string
  status: QAStatus
  checks: Array<{ name: string; status: QAStatus; detail: string }>
  core: {
    focusDomain: string
    topDecisionId: string | null
    topDecisionLabel: string | null
    phase: string
    phaseLabel: string
    riskControl: string
    topScenarioIds: string[]
  }
  calendar: {
    focusDomain: string
    topDecisionLabel: string | null
    riskControl: string
    allowedActions: string[]
    blockedActions: string[]
  }
  counselor: {
    focusDomain: string
    verdict: string
    guardrail: string
    topAnchorSummary: string
    topDecisionLabel: string | null
    allowedActions: string[]
    blockedActions: string[]
  }
  report: {
    mode: 'comprehensive' | 'themed'
    focusDomain?: string
    topDecisionLabel?: string | null
    actionPlanSnippet: string
    conclusionSnippet: string
  }
}

function parseLangs(): QALang[] {
  const raw = process.argv.find((arg) => arg.startsWith('--lang='))?.split('=')[1]
  if (!raw || raw === 'both') return ['ko', 'en']
  return raw === 'en' ? ['en'] : ['ko']
}

async function evaluateCase(
  questionCase: QuestionCase,
  lang: QALang,
  timingData: TimingData
): Promise<CaseResult> {
  const { input, matrixSummary, matrixReport } = createCaseFixture(questionCase.theme, lang)
  const question = getLocalizedText(questionCase.question, lang)

  const core = runDestinyCore({
    mode: questionCase.theme === 'life' ? 'comprehensive' : 'themed',
    lang,
    matrixInput: input,
    matrixReport,
    matrixSummary,
  })

  const calendar = adaptCoreToCalendar(core, lang)
  const counselor = adaptCoreToCounselor(core, lang)
  const counselorPacket = buildCounselorEvidencePacket({
    theme: questionCase.theme,
    lang,
    matrixInput: input,
    matrixReport,
    matrixSummary,
    signalSynthesis: core.signalSynthesis,
    strategyEngine: core.strategyEngine,
    core,
    birthDate: input.profileContext?.birthDate,
  })

  const report =
    questionCase.theme === 'life'
      ? await generateAIPremiumReport(input, matrixReport, {
          deterministicOnly: true,
          matrixSummary,
          timingData,
          birthDate: input.profileContext?.birthDate,
          name: 'QA User',
          lang,
          userQuestion: question,
        })
      : await generateThemedReport(input, matrixReport, questionCase.theme as any, timingData, {
          deterministicOnly: true,
          matrixSummary,
          birthDate: input.profileContext?.birthDate,
          name: 'QA User',
          lang,
          userQuestion: question,
        })

  const checks: Array<{ name: string; status: QAStatus; detail: string }> = []
  const sharedFocus = core.canonical.focusDomain
  const serviceFocus =
    questionCase.theme === 'life'
      ? sharedFocus
      : counselor.actionFocusDomain || calendar.actionFocusDomain || sharedFocus

  checks.push({
    name: 'core-calendar focus sync',
    status: calendar.focusDomain === sharedFocus ? 'PASS' : 'FAIL',
    detail: `core=${sharedFocus} calendar=${calendar.focusDomain}`,
  })

  checks.push({
    name: 'core-counselor decision sync',
    status:
      counselor.topDecisionLabel && counselor.topDecisionLabel === calendar.topDecisionLabel
        ? 'PASS'
        : 'WARN',
    detail: `calendar=${calendar.topDecisionLabel || 'none'} counselor=${counselor.topDecisionLabel || 'none'}`,
  })

  checks.push({
    name: 'riskControl parity',
    status:
      calendar.riskControl === counselor.riskControl && counselor.riskControl === report.riskControl
        ? 'PASS'
        : 'FAIL',
    detail: `calendar=${trimText(calendar.riskControl, 72)} | counselor=${trimText(counselor.riskControl, 72)} | report=${trimText((report as any).riskControl, 72)}`,
  })

  checks.push({
    name: 'expected domain hit',
    status: questionCase.expectedDomains.includes(serviceFocus) ? 'PASS' : 'WARN',
    detail: `expected=${questionCase.expectedDomains.join('/')} actual=${serviceFocus} core_focus=${sharedFocus}`,
  })

  const actionHints = questionCase.expectedActionHints.map((item) => getLocalizedText(item, lang))
  const actionPool = [
    counselor.topDecisionLabel || '',
    ...(calendar.judgmentPolicy.allowedActionLabels || []),
    ...(counselorPacket.canonicalBrief?.allowedActions || []),
    trimText((report.sections as any).actionPlan || '', 220),
  ].join(' ')
  const actionHit = actionHints.some((hint) =>
    actionPool.toLowerCase().includes(String(hint).toLowerCase())
  )
  checks.push({
    name: 'action language fit',
    status: actionHit ? 'PASS' : 'WARN',
    detail: `hints=${actionHints.join('/')} | pool=${trimText(actionPool, 180)}`,
  })

  const directnessPool = [
    counselorPacket.canonicalBrief?.answerThesis,
    counselorPacket.topDomainAdvisory?.action,
    counselorPacket.verdict,
  ]
    .filter(Boolean)
    .join(' ')
  checks.push({
    name: 'counselor directness',
    status: questionDirectnessHit(directnessPool, lang) ? 'PASS' : 'WARN',
    detail: trimText(counselorPacket.verdict, 120),
  })

  const reportActionPlan = trimText((report.sections as any).actionPlan || '', 220)
  const reportGroundedPool = [
    reportActionPlan,
    calendar.topDecisionLabel || '',
    core.canonical.riskControl,
    counselorPacket.canonicalBrief?.primaryAction || '',
    ...(calendar.judgmentPolicy.allowedActionLabels || []),
    ...(counselorPacket.canonicalBrief?.allowedActions || []),
  ].join(' ')
  const reportGroundedByHint = actionHints.some((hint) =>
    reportGroundedPool.toLowerCase().includes(String(hint).toLowerCase())
  )
  const reportGroundedByPolicy =
    reportActionPlan.includes(calendar.topDecisionLabel || '') ||
    reportActionPlan.includes(core.canonical.riskControl) ||
    reportActionPlan.includes(counselorPacket.canonicalBrief?.primaryAction || '')
  checks.push({
    name: 'report action plan grounded',
    status: reportGroundedByPolicy || reportGroundedByHint ? 'PASS' : 'WARN',
    detail: reportActionPlan,
  })

  return {
    id: questionCase.id,
    theme: questionCase.theme,
    lang,
    question,
    status: toStatus(checks),
    checks,
    core: {
      focusDomain: sharedFocus,
      topDecisionId: core.canonical.topDecision?.id || null,
      topDecisionLabel: calendar.topDecisionLabel,
      phase: core.canonical.phase,
      phaseLabel: core.canonical.phaseLabel,
      riskControl: core.canonical.riskControl,
      topScenarioIds: core.canonical.topScenarios.map((item) => item.id).slice(0, 5),
    },
    calendar: {
      focusDomain: calendar.focusDomain,
      topDecisionLabel: calendar.topDecisionLabel,
      riskControl: calendar.riskControl,
      allowedActions: calendar.judgmentPolicy.allowedActionLabels || [],
      blockedActions: calendar.judgmentPolicy.blockedActionLabels || [],
    },
    counselor: {
      focusDomain: counselorPacket.focusDomain,
      verdict: counselorPacket.verdict,
      guardrail: counselorPacket.guardrail,
      topAnchorSummary: counselorPacket.topAnchorSummary,
      topDecisionLabel: counselor.topDecisionLabel,
      allowedActions: counselorPacket.canonicalBrief?.allowedActions || [],
      blockedActions: counselorPacket.canonicalBrief?.blockedActions || [],
    },
    report: {
      mode: questionCase.theme === 'life' ? 'comprehensive' : 'themed',
      focusDomain: (report as any).focusDomain || mapThemeToFocus(questionCase.theme),
      topDecisionLabel:
        (report as any).topDecisionLabel || adaptCoreToReport(core, lang).topDecisionLabel,
      actionPlanSnippet: trimText((report.sections as any).actionPlan || '', 200),
      conclusionSnippet: trimText(
        (report.sections as any).conclusion || (report.sections as any).timingAdvice || '',
        200
      ),
    },
  }
}

function renderMarkdown(results: CaseResult[], lang: QALang): string {
  const pass = results.filter((item) => item.status === 'PASS').length
  const warn = results.filter((item) => item.status === 'WARN').length
  const fail = results.filter((item) => item.status === 'FAIL').length

  const lines: string[] = [
    '# Destiny Three-Service Regression',
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
    lines.push(
      `- Core: ${item.core.focusDomain} / ${item.core.topDecisionLabel || item.core.topDecisionId || 'none'} / ${item.core.phaseLabel}`
    )
    lines.push(`- Top scenarios: ${item.core.topScenarioIds.join(', ')}`)
    lines.push(
      `- Calendar: ${item.calendar.topDecisionLabel || 'none'} | allowed=${item.calendar.allowedActions.join(', ') || '-'}`
    )
    lines.push(`- Counselor verdict: ${item.counselor.verdict}`)
    lines.push(`- Counselor guardrail: ${item.counselor.guardrail}`)
    lines.push(`- Counselor anchor: ${item.counselor.topAnchorSummary}`)
    lines.push(`- Report action: ${item.report.actionPlanSnippet}`)
    lines.push(`- Report conclusion: ${item.report.conclusionSnippet}`)
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
): Promise<{ results: CaseResult[]; jsonPath: string; mdPath: string }> {
  const timingData = createTimingData()
  const cases = createServiceQaCases()
  const results: CaseResult[] = []

  for (const item of cases) {
    results.push(await evaluateCase(item, lang, timingData))
  }

  const outputDir = join(process.cwd(), 'reports', 'ops')
  mkdirSync(outputDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const base = `three-services-regression-${lang}-${stamp}`
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
    console.log(`[three-services][${lang}] wrote ${jsonPath}`)
    console.log(`[three-services][${lang}] wrote ${mdPath}`)
    console.log(`[three-services][${lang}] PASS=${pass} WARN=${warn} FAIL=${fail}`)
  }

  console.log(`[three-services][total] PASS=${totalPass} WARN=${totalWarn} FAIL=${totalFail}`)
}

main().catch((error) => {
  console.error('[three-services] failed', error)
  process.exitCode = 1
})

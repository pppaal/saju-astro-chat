// @ts-nocheck
import fs from 'node:fs'
import path from 'node:path'
import { buildDeterministicCore } from '../src/lib/destiny-matrix/ai-report/deterministicCore'

type Profile = 'strict' | 'balanced' | 'aggressive'

const INPUT_DUMP = path.join(process.cwd(), 'reports', '1995-02-09_0640_seoul_FULL_CROSS_DUMP.json')
const OUT_JSON = path.join(process.cwd(), 'reports', 'deterministic_profile_compare_latest.json')
const OUT_MD = path.join(process.cwd(), 'reports', 'deterministic_profile_compare_latest.md')

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function buildMinimalFusionReportFromDump(dump: any): any {
  const totalScore = Number(dump?.matrixSummary?.totalScore || 65)
  const grade = totalScore >= 80 ? 'A' : totalScore >= 65 ? 'B' : 'C'
  return {
    overallScore: {
      total: totalScore,
      grade,
      gradeDescription: '-',
      gradeDescriptionEn: '-',
      categoryScores: {
        strength: 0,
        opportunity: 0,
        balance: 0,
        caution: 0,
        challenge: 0,
      },
    },
    topInsights: Array.isArray(dump?.topInsights) ? dump.topInsights : [],
    domainAnalysis: Array.isArray(dump?.matrixSummary?.domainScores)
      ? dump.matrixSummary.domainScores
      : [],
  }
}

function run(): void {
  const dump = readJson(INPUT_DUMP)
  const matrixInput = dump?.matrixInput || {}
  const graphEvidence = dump?.graphRagEvidence || null
  const matrixReport = buildMinimalFusionReportFromDump(dump)
  const question = '여기로 가는게 맞냐? 맞다면 어떻게 해야 해?'

  const profiles: Profile[] = ['strict', 'balanced', 'aggressive']
  const results = profiles.map((profile) =>
    buildDeterministicCore({
      matrixInput,
      matrixReport,
      graphEvidence,
      userQuestion: question,
      lang: 'ko',
      profile,
    })
  )

  const payload = {
    generatedAt: new Date().toISOString(),
    question,
    inputProfile: dump?.profile || null,
    results,
  }

  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2), 'utf8')

  const lines: string[] = []
  lines.push('# Deterministic Profile Compare')
  lines.push('')
  lines.push(`- Generated: ${payload.generatedAt}`)
  lines.push(`- Question: ${question}`)
  lines.push('')
  lines.push('| Profile | Verdict | Score | Confidence | Blockers |')
  lines.push('| --- | --- | ---: | ---: | --- |')
  for (const item of results) {
    lines.push(
      `| ${item.profile} | ${item.decision.verdict} | ${item.decision.score} | ${item.decision.confidence} | ${item.decision.blockers.join(', ') || '-'} |`
    )
  }
  lines.push('')
  lines.push('## Reasons')
  for (const item of results) {
    lines.push(`### ${item.profile}`)
    lines.push(`- ${item.decision.reasons.join('\n- ') || '-'}`)
    lines.push('')
  }
  lines.push('## Coverage Snapshot')
  lines.push('```json')
  lines.push(JSON.stringify(results[0]?.coverage || {}, null, 2))
  lines.push('```')
  lines.push('')

  fs.writeFileSync(OUT_MD, lines.join('\n'), 'utf8')
  console.log(`Saved: ${OUT_JSON}`)
  console.log(`Saved: ${OUT_MD}`)
}

run()

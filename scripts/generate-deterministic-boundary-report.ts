// @ts-nocheck
import fs from 'node:fs'
import path from 'node:path'
import { buildDeterministicCore } from '../src/lib/destiny-matrix/ai-report/deterministicCore'

type Profile = 'strict' | 'balanced' | 'aggressive'

const INPUT_DUMP = path.join(process.cwd(), 'reports', '1995-02-09_0640_seoul_FULL_CROSS_DUMP.json')
const OUT_JSON = path.join(process.cwd(), 'reports', 'deterministic_boundary_compare_latest.json')
const OUT_MD = path.join(process.cwd(), 'reports', 'deterministic_boundary_compare_latest.md')

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function toReport(dump: any): any {
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

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

function makeCases(baseInput: any, baseGraph: any, baseReport: any) {
  const cases: Array<{ id: string; note: string; input: any; graph: any; report: any }> = []

  cases.push({
    id: 'C1_full_reference',
    note: '기준 케이스(데이터 풍부)',
    input: deepClone(baseInput),
    graph: deepClone(baseGraph),
    report: deepClone(baseReport),
  })

  const c2 = deepClone(baseInput)
  const g2 = deepClone(baseGraph)
  g2.anchors = (g2.anchors || []).slice(0, 4)
  cases.push({
    id: 'C2_low_anchor',
    note: '교차 앵커 부족',
    input: c2,
    graph: g2,
    report: deepClone(baseReport),
  })

  cases.push({
    id: 'C3_no_graph',
    note: 'GraphRAG 없음',
    input: deepClone(baseInput),
    graph: { mode: 'comprehensive', anchors: [] },
    report: deepClone(baseReport),
  })

  const c4 = deepClone(baseInput)
  c4.aspects = (c4.aspects || []).slice(0, 2)
  cases.push({
    id: 'C4_sparse_aspects',
    note: 'aspect 빈약',
    input: c4,
    graph: deepClone(baseGraph),
    report: deepClone(baseReport),
  })

  const c5 = deepClone(baseInput)
  c5.relations = []
  c5.shinsalList = []
  cases.push({
    id: 'C5_no_relations_shinsal',
    note: '관계/신살 정보 없음',
    input: c5,
    graph: deepClone(baseGraph),
    report: deepClone(baseReport),
  })

  const c6 = deepClone(baseInput)
  c6.yongsin = '화'
  c6.currentSaeunElement = '수'
  cases.push({
    id: 'C6_yongsin_mismatch',
    note: '용신-세운 불일치',
    input: c6,
    graph: deepClone(baseGraph),
    report: deepClone(baseReport),
  })

  const c7 = deepClone(baseInput)
  c7.profileContext = { ...c7.profileContext, birthTime: undefined }
  cases.push({
    id: 'C7_missing_birth_time',
    note: '출생시각 누락',
    input: c7,
    graph: deepClone(baseGraph),
    report: deepClone(baseReport),
  })

  const c8 = deepClone(baseInput)
  c8.yongsin = undefined
  c8.currentSaeunElement = undefined
  c8.currentDaeunElement = undefined
  cases.push({
    id: 'C8_no_timing_core',
    note: '용신/대운/세운 미제공',
    input: c8,
    graph: deepClone(baseGraph),
    report: deepClone(baseReport),
  })

  const c9 = deepClone(baseInput)
  c9.planetHouses = { Sun: 1, Moon: 4 }
  c9.planetSigns = { Sun: '물병자리', Moon: '쌍둥이자리' }
  c9.asteroidHouses = {}
  c9.extraPointSigns = {}
  cases.push({
    id: 'C9_sparse_astro',
    note: '점성 데이터 희소',
    input: c9,
    graph: deepClone(baseGraph),
    report: deepClone(baseReport),
  })

  const c10 = deepClone(baseInput)
  c10.relations = []
  c10.shinsalList = []
  c10.yongsin = '화'
  c10.currentSaeunElement = '수'
  c10.aspects = (c10.aspects || []).slice(0, 1)
  c10.profileContext = { birthDate: c10.profileContext?.birthDate }
  const g10 = deepClone(baseGraph)
  g10.anchors = (g10.anchors || []).slice(0, 2)
  const r10 = deepClone(baseReport)
  r10.topInsights = [
    { category: 'caution', title: 'high caution 1' },
    { category: 'caution', title: 'high caution 2' },
    { category: 'challenge', title: 'high challenge 1' },
    { category: 'challenge', title: 'high challenge 2' },
  ]
  cases.push({
    id: 'C10_combined_risk',
    note: '복합 리스크(누락+불일치+경고 집중)',
    input: c10,
    graph: g10,
    report: r10,
  })

  return cases
}

function run() {
  const dump = readJson(INPUT_DUMP)
  const baseInput = dump?.matrixInput || {}
  const baseGraph = dump?.graphRagEvidence || { mode: 'comprehensive', anchors: [] }
  const baseReport = toReport(dump)

  const profiles: Profile[] = ['strict', 'balanced', 'aggressive']
  const question = '여기로 가는게 맞냐? 맞다면 어떻게 해야 해?'
  const cases = makeCases(baseInput, baseGraph, baseReport)

  const results = cases.map((c) => {
    const byProfile = profiles.map((p) =>
      buildDeterministicCore({
        matrixInput: c.input,
        matrixReport: c.report,
        graphEvidence: c.graph,
        userQuestion: question,
        lang: 'ko',
        profile: p,
      })
    )
    return { id: c.id, note: c.note, byProfile }
  })

  const payload = {
    generatedAt: new Date().toISOString(),
    question,
    caseCount: results.length,
    results,
  }
  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2), 'utf8')

  const lines: string[] = []
  lines.push('# Deterministic Boundary Compare (10 cases)')
  lines.push('')
  lines.push(`- Generated: ${payload.generatedAt}`)
  lines.push(`- Question: ${question}`)
  lines.push('')
  lines.push('| Case | Note | strict | balanced | aggressive |')
  lines.push('| --- | --- | --- | --- | --- |')

  for (const row of results) {
    const s = row.byProfile.find((x) => x.profile === 'strict')?.decision
    const b = row.byProfile.find((x) => x.profile === 'balanced')?.decision
    const a = row.byProfile.find((x) => x.profile === 'aggressive')?.decision
    lines.push(
      `| ${row.id} | ${row.note} | ${s?.verdict}(${s?.score}) | ${b?.verdict}(${b?.score}) | ${a?.verdict}(${a?.score}) |`
    )
  }

  lines.push('')
  lines.push('## Detail (C10_combined_risk)')
  const c10 = results.find((r) => r.id === 'C10_combined_risk')
  if (c10) {
    for (const r of c10.byProfile) {
      lines.push(`### ${r.profile}`)
      lines.push(`- verdict: ${r.decision.verdict}`)
      lines.push(`- score: ${r.decision.score}`)
      lines.push(`- blockers: ${r.decision.blockers.join(', ') || '-'}`)
      lines.push(`- reasons: ${r.decision.reasons.join(' | ') || '-'}`)
      lines.push('')
    }
  }

  fs.writeFileSync(OUT_MD, lines.join('\n'), 'utf8')
  console.log(`Saved: ${OUT_JSON}`)
  console.log(`Saved: ${OUT_MD}`)
}

run()

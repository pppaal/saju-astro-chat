import fs from 'node:fs'
import path from 'node:path'

const inputPath =
  process.argv[2] || path.resolve('reports', 'matrix-profile-1995-02-09-0640-male-seoul.json')
const outputPath =
  process.argv[3] || path.resolve('reports', 'matrix-profile-1995-02-09-0640-male-seoul.layer-report.md')

const LAYER_LABELS = {
  layer1: 'Layer 1 - Element Core (오행 x 점성 원소)',
  layer2: 'Layer 2 - Sibsin x Planet (십성 x 행성)',
  layer3: 'Layer 3 - Sibsin x House (십성 x 하우스)',
  layer4: 'Layer 4 - Timing Overlay (대운/세운 x 트랜짓)',
  layer5: 'Layer 5 - Relation x Aspect (형충합파 x 메이저 각)',
  layer6: 'Layer 6 - Twelve Stage x House (12운성 x 하우스)',
  layer7: 'Layer 7 - Geokguk/Yongsin x Transit',
  layer8: 'Layer 8 - Shinsal x Planet (신살 x 행성)',
  layer9: 'Layer 9 - Asteroid x House (소행성 x 하우스)',
  layer10: 'Layer 10 - Extra Points x Element (추가 포인트 x 오행)',
}

function pickPoints(summary, key) {
  const list = Array.isArray(summary?.[key]) ? summary[key] : []
  return list.filter(Boolean)
}

function groupByLayer(items) {
  const grouped = {}
  for (const item of items) {
    const layerKey = `layer${Number(item.layer)}`
    if (!grouped[layerKey]) grouped[layerKey] = []
    grouped[layerKey].push(item)
  }
  return grouped
}

function pointLine(item) {
  const level = item?.cell?.interaction?.level || '-'
  const score = item?.cell?.interaction?.score ?? '-'
  const keyword = item?.cell?.interaction?.keyword || item?.cell?.interaction?.keywordEn || '-'
  const sajuBasis = item?.cell?.sajuBasis || '-'
  const astroBasis = item?.cell?.astroBasis || '-'
  const advice = item?.cell?.interaction?.advice || '-'
  return [
    `- [${level}/${score}] ${item.rowKey}.${item.colKey} | ${keyword}`,
    `  - saju: ${sajuBasis}`,
    `  - astro: ${astroBasis}`,
    `  - advice: ${advice}`,
  ].join('\n')
}

function section(title, items) {
  if (!items || items.length === 0) return `### ${title}\n- none\n`
  return `### ${title}\n${items.map(pointLine).join('\n')}\n`
}

function buildMarkdown(payload) {
  const summary = payload.summary || {}
  const strengths = pickPoints(summary, 'strengthPoints')
  const balances = pickPoints(summary, 'balancePoints')
  const cautions = pickPoints(summary, 'cautionPoints')

  const groupedStrengths = groupByLayer(strengths)
  const groupedBalances = groupByLayer(balances)
  const groupedCautions = groupByLayer(cautions)

  const lines = []
  lines.push('# Destiny Matrix Layer Report')
  lines.push('')
  lines.push('## Profile')
  lines.push(`- birthDate: ${payload?.profile?.birthDate || '-'}`)
  lines.push(`- birthTime: ${payload?.profile?.birthTime || '-'}`)
  lines.push(`- birthPlace: ${payload?.profile?.birthPlace || 'Seoul'}`)
  lines.push(`- gender: ${payload?.profile?.gender || '-'}`)
  lines.push('')
  lines.push('## Input Summary')
  for (const [k, v] of Object.entries(payload.inputSummary || {})) {
    lines.push(`- ${k}: ${JSON.stringify(v)}`)
  }
  lines.push('')
  lines.push('## Global Summary')
  lines.push(`- finalScoreAdjusted: ${summary.finalScoreAdjusted ?? '-'}`)
  lines.push(`- confidenceScore: ${summary.confidenceScore ?? '-'}`)
  lines.push(`- alignmentScore: ${summary.alignmentScore ?? '-'}`)
  lines.push(`- overlapStrength: ${summary.overlapStrength ?? '-'}`)
  lines.push(`- totalScore: ${summary.totalScore ?? '-'}`)
  lines.push('')
  lines.push('## Layer-by-Layer Evidence')

  const orderedLayers = Object.keys(LAYER_LABELS)
  for (const layerKey of orderedLayers) {
    lines.push('')
    lines.push(`## ${LAYER_LABELS[layerKey]}`)
    lines.push('')
    lines.push(section('Strength Signals', groupedStrengths[layerKey] || []))
    lines.push(section('Balance Signals', groupedBalances[layerKey] || []))
    lines.push(section('Caution Signals', groupedCautions[layerKey] || []))
  }

  lines.push('')
  lines.push('## Domain Scores')
  const domains = summary.domainScores || {}
  for (const [domain, scoreObj] of Object.entries(domains)) {
    lines.push(
      `- ${domain}: final=${scoreObj.finalScoreAdjusted}, base=${scoreObj.baseFinalScore}, confidence=${scoreObj.confidenceScore}, alignment=${scoreObj.alignmentScore}`
    )
  }

  return lines.join('\n')
}

function main() {
  if (!fs.existsSync(inputPath)) {
    console.error(`input file not found: ${inputPath}`)
    process.exit(1)
  }
  const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
  const md = buildMarkdown(payload)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, md, 'utf8')
  console.log(outputPath)
}

main()

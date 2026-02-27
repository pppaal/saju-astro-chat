import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import dotenv from 'dotenv'

const OUTPUT_JSON = path.resolve('reports/themed_report_1995-02-09_0640_ko.json')
const OUTPUT_MD = path.resolve('reports/themed_report_1995-02-09_0640_ko.md')

const BANNED_PHRASES = [
  '격국의 결',
  '긴장 신호',
  '상호작용',
  '시사',
  '결이',
  '프레임',
  '검증',
  '근거 세트',
]

function snip(text, max = 300) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function loadEnvFiles() {
  dotenv.config({ path: path.resolve('.env.local') })
  dotenv.config({ path: path.resolve('.env') })
}

function runRunner() {
  return new Promise((resolve, reject) => {
    const command =
      process.platform === 'win32'
        ? ['cmd.exe', ['/c', 'npx tsx scripts/regenerate-themed-report.runner.ts']]
        : ['npx', ['tsx', 'scripts/regenerate-themed-report.runner.ts']]
    const child = spawn(command[0], command[1], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: { ...process.env, REVIEW_TOKEN: process.env.REVIEW_TOKEN || '' },
    })
    let combined = ''
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      combined += text
      process.stdout.write(text)
    })
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString()
      combined += text
      process.stderr.write(text)
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve(combined)
        return
      }
      reject(new Error(`runner exited with code ${code}`))
    })
  })
}

async function main() {
  loadEnvFiles()
  const runnerOutput = await runRunner()

  const [rawJson, rawMd] = await Promise.all([
    readFile(OUTPUT_JSON, 'utf8'),
    readFile(OUTPUT_MD, 'utf8'),
  ])
  const parsed = JSON.parse(rawJson)

  const sections = parsed?.sections || {}
  const checksMatch = runnerOutput.match(/\[regen:themed\] checks:\s*(\{[\s\S]*?\})/m)
  const parsedChecks = checksMatch ? JSON.parse(checksMatch[1]) : {}
  const hasDaeun = Boolean(parsedChecks.hasDaeun)
  const hasSaeun = Boolean(parsedChecks.hasSaeun)
  const activeTransitsCount = Number(parsedChecks.activeTransitsCount || 0)
  const dominantWesternElement = parsedChecks.dominantWesternElement || null
  const shinsalListLength = Number(parsedChecks.shinsalListLength || 0)
  const twelveStagesLength = Number(parsedChecks.twelveStagesLength || 0)
  const relationsLength = Number(parsedChecks.relationsLength || 0)

  const bannedFound = BANNED_PHRASES.filter((phrase) => rawMd.includes(phrase))
  const contradiction = hasSaeun && rawMd.includes('세운 미입력')
  const hasMojibake = rawMd.includes('???')

  console.log('[regen:themed:mjs] JSON:', OUTPUT_JSON)
  console.log('[regen:themed:mjs] MD:', OUTPUT_MD)
  console.log(
    '[regen:themed:mjs] checks:',
    JSON.stringify(
      {
        hasDaeun,
        hasSaeun,
        activeTransitsCount,
        dominantWesternElement,
        shinsalListLength,
        twelveStagesLength,
        relationsLength,
      },
      null,
      2
    )
  )
  console.log('[regen:themed:mjs] healthGuidance:', snip(sections.healthGuidance))
  console.log('[regen:themed:mjs] relationshipDynamics:', snip(sections.relationshipDynamics))
  console.log('[regen:themed:mjs] careerPath:', snip(sections.careerPath))
  console.log('[regen:themed:mjs] bannedPhrasesFound:', bannedFound.length ? bannedFound.join(', ') : 'none')
  console.log('[regen:themed:mjs] contradiction(hasSaeun && 세운 미입력):', contradiction)
  console.log('[regen:themed:mjs] readableKorean(no ???):', !hasMojibake)
}

main().catch((error) => {
  console.error('[regen:themed:mjs] failed:', error instanceof Error ? error.message : String(error))
  process.exit(1)
})

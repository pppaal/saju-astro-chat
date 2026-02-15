#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'coverage',
  'venv',
  '.venv',
  '__pycache__',
])

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue
      walk(path.join(dir, entry.name), out)
      continue
    }
    out.push(path.join(dir, entry.name))
  }
  return out
}

function toPosix(p) {
  return p.split(path.sep).join('/')
}

function formatInSeoul(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

const allFiles = walk(ROOT).map((p) => path.relative(ROOT, p))
const apiRouteFiles = allFiles.filter((p) => /^(src\/app\/api\/).+\/route\.(ts|js)$/.test(toPosix(p)))
const pageFiles = allFiles.filter((p) => /^(src\/app\/).+\/page\.(tsx|ts|jsx|js)$/.test(toPosix(p)))
const componentFiles = allFiles.filter((p) => /^(src\/components\/).+\.(tsx|ts|jsx|js)$/.test(toPosix(p)))
const testFiles = allFiles.filter((p) => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(toPosix(p)))
const markdownFiles = allFiles.filter((p) => /\.md$/i.test(p))

const prismaSchemaPath = path.join(ROOT, 'prisma', 'schema.prisma')
let prismaModelCount = 0
if (fs.existsSync(prismaSchemaPath)) {
  const schema = fs.readFileSync(prismaSchemaPath, 'utf8')
  prismaModelCount = (schema.match(/^\s*model\s+\w+/gm) || []).length
}

const envExamplePath = path.join(ROOT, '.env.example')
let envVarCount = 0
if (fs.existsSync(envExamplePath)) {
  const envContent = fs.readFileSync(envExamplePath, 'utf8')
  envVarCount = envContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && /^[A-Z0-9_]+=/.test(line)).length
}

const stats = {
  auditedDateSeoul: formatInSeoul(),
  apiRoutes: apiRouteFiles.length,
  appPages: pageFiles.length,
  components: componentFiles.length,
  prismaModels: prismaModelCount,
  testFiles: testFiles.length,
  markdownDocs: markdownFiles.length,
  envVarsInExample: envVarCount,
}

console.log(JSON.stringify(stats, null, 2))

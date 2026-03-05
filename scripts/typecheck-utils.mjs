import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const FILE_ERROR_RE =
  /^(?<file>.+?)\((?<line>\d+),(?<column>\d+)\): error (?<code>TS\d+): (?<message>.+)$/u
const GLOBAL_ERROR_RE = /^error (?<code>TS\d+): (?<message>.+)$/u

function normalizePath(value) {
  return value.replace(/\\/g, '/')
}

export function parseTypecheckOutput(output) {
  const lines = output.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)
  const errors = []

  for (const line of lines) {
    const fileMatch = line.match(FILE_ERROR_RE)
    if (fileMatch?.groups) {
      errors.push({
        file: normalizePath(fileMatch.groups.file),
        line: Number(fileMatch.groups.line),
        column: Number(fileMatch.groups.column),
        code: fileMatch.groups.code,
        message: fileMatch.groups.message,
      })
      continue
    }

    const globalMatch = line.match(GLOBAL_ERROR_RE)
    if (globalMatch?.groups) {
      errors.push({
        file: 'global',
        line: 0,
        column: 0,
        code: globalMatch.groups.code,
        message: globalMatch.groups.message,
      })
    }
  }

  return errors
}

export function summarizeTypecheckErrors(errors) {
  const byCode = {}
  const byFile = {}

  for (const error of errors) {
    byCode[error.code] = (byCode[error.code] ?? 0) + 1
    byFile[error.file] = (byFile[error.file] ?? 0) + 1
  }

  return {
    totalErrors: errors.length,
    errorCodes: Object.fromEntries(
      Object.entries(byCode).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    ),
    fileHotspots: Object.entries(byFile)
      .map(([file, count]) => ({ file, count }))
      .sort((a, b) => b.count - a.count || a.file.localeCompare(b.file)),
  }
}

export function runTypecheck(project = 'tsconfig.json') {
  const tscBin = require.resolve('typescript/bin/tsc')
  const args = [tscBin, '-p', project, '--noEmit', '--pretty', 'false']
  const result = spawnSync(process.execPath, args, {
    encoding: 'utf8',
    env: process.env,
  })

  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim()
  const errors = parseTypecheckOutput(output)
  const summary = summarizeTypecheckErrors(errors)

  return {
    command: `tsc -p ${project} --noEmit --pretty false`,
    exitCode: result.status ?? 1,
    output,
    errors,
    ...summary,
  }
}

export function ensureParentDir(targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
}

export function writeJson(targetPath, payload) {
  ensureParentDir(targetPath)
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

export function readJson(targetPath) {
  return JSON.parse(fs.readFileSync(targetPath, 'utf8'))
}

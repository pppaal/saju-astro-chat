#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const APP_DIR = path.join(ROOT, 'src', 'app')
const API_DIR = path.join(APP_DIR, 'api')
const OUTPUT_DIR = path.join(ROOT, 'qa-dumps')
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'routes.json')
const OUTPUT_MD = path.join(OUTPUT_DIR, 'ROUTE_INVENTORY.md')

const PAGE_FILE_RE = /^page\.(t|j)sx?$/
const ROUTE_FILE_RE = /^route\.(t|j)sx?$/
const META_FILE_NAMES = new Set(['sitemap.ts', 'robots.ts', 'manifest.ts'])

function normalizeRouteSegments(segments) {
  return segments.filter((segment) => {
    if (!segment) return false
    if (segment.startsWith('_')) return false
    if (segment.startsWith('@')) return false
    if (/^\(.*\)$/.test(segment)) return false
    return true
  })
}

function toRoutePathFromSegments(segments) {
  const normalized = normalizeRouteSegments(segments)
  if (normalized.length === 0) return '/'
  return `/${normalized.join('/')}`
}

function toPosix(p) {
  return p.split(path.sep).join('/')
}

async function walk(dir, fileList = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(full, fileList)
      continue
    }
    fileList.push(full)
  }
  return fileList
}

function parseEnabledServices(fileText) {
  const serviceRegex =
    /id:\s*'([^']+)'[\s\S]*?href:\s*'([^']+)'[\s\S]*?label:\s*\{\s*en:\s*'([^']+)'[\s\S]*?ko:\s*'([^']+)'/g
  const services = []
  for (const match of fileText.matchAll(serviceRegex)) {
    services.push({
      id: match[1],
      href: match[2],
      labelEn: match[3],
      labelKo: match[4],
    })
  }
  const removedRegex = /export const REMOVED_PUBLIC_SERVICE_PREFIXES:[\s\S]*?\[(.*?)\]/m
  const removedMatch = fileText.match(removedRegex)
  const removed = removedMatch
    ? Array.from(removedMatch[1].matchAll(/'([^']+)'/g)).map((m) => m[1])
    : []
  return { services, removedPrefixes: removed }
}

function parseCoreServices(fileText) {
  const keyMatch = fileText.match(/export const coreServiceKeys\s*=\s*\[([\s\S]*?)\]\s*as const/m)
  const keys = keyMatch ? Array.from(keyMatch[1].matchAll(/'([^']+)'/g)).map((m) => m[1]) : []
  const optionRegex =
    /key:\s*'([^']+)'[\s\S]*?labelFallback:\s*'([^']+)'[\s\S]*?path:\s*'([^']+)'[\s\S]*?coreKey:\s*'([^']+)'/g
  const options = []
  for (const match of fileText.matchAll(optionRegex)) {
    options.push({
      key: match[1],
      labelFallback: match[2],
      path: match[3],
      coreKey: match[4],
    })
  }
  return { keys, options }
}

function compareServiceCoverage(enabledServices, coreOptions) {
  const enabledByPath = new Map(enabledServices.map((s) => [s.href, s]))
  const coreByPath = new Map(coreOptions.map((s) => [s.path, s]))
  const onlyEnabled = [...enabledByPath.keys()].filter((href) => !coreByPath.has(href))
  const onlyCore = [...coreByPath.keys()].filter((href) => !enabledByPath.has(href))
  return { onlyEnabled, onlyCore }
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })

  const appFiles = (await walk(APP_DIR)).map((f) => path.normalize(f))

  const pages = []
  const appRoutes = []
  const apiRoutes = []
  const privateExcluded = []

  for (const fullPath of appFiles) {
    const relFromApp = path.relative(APP_DIR, fullPath)
    const relDir = path.dirname(relFromApp)
    const fileName = path.basename(relFromApp)
    const segments = relDir === '.' ? [] : relDir.split(path.sep)
    const hasPrivateSegment = segments.some((s) => s.startsWith('_'))

    if (hasPrivateSegment && ROUTE_FILE_RE.test(fileName)) {
      privateExcluded.push({
        type: 'route_handler_private',
        file: toPosix(path.relative(ROOT, fullPath)),
      })
    }
    if (hasPrivateSegment && PAGE_FILE_RE.test(fileName)) {
      privateExcluded.push({
        type: 'page_private',
        file: toPosix(path.relative(ROOT, fullPath)),
      })
    }
    if (hasPrivateSegment) {
      continue
    }

    if (PAGE_FILE_RE.test(fileName)) {
      const routePath = toRoutePathFromSegments(segments)
      pages.push({
        route: routePath,
        file: toPosix(path.relative(ROOT, fullPath)),
      })
      continue
    }

    if (ROUTE_FILE_RE.test(fileName)) {
      const routePath = toRoutePathFromSegments(segments)
      const entry = {
        route: routePath,
        file: toPosix(path.relative(ROOT, fullPath)),
      }
      if (fullPath.startsWith(API_DIR + path.sep) || fullPath === API_DIR) {
        apiRoutes.push(entry)
      } else {
        appRoutes.push(entry)
      }
      continue
    }

    if (META_FILE_NAMES.has(fileName)) {
      const routePath = toRoutePathFromSegments([...segments, fileName.replace(/\.ts$/, '')])
      appRoutes.push({
        route: routePath,
        file: toPosix(path.relative(ROOT, fullPath)),
        kind: 'metadata',
      })
    }
  }

  pages.sort((a, b) => a.route.localeCompare(b.route))
  appRoutes.sort((a, b) => a.route.localeCompare(b.route))
  apiRoutes.sort((a, b) => a.route.localeCompare(b.route))
  privateExcluded.sort((a, b) => a.file.localeCompare(b.file))

  const enabledServicesText = await fs.readFile(
    path.join(ROOT, 'src', 'config', 'enabledServices.ts'),
    'utf8'
  )
  const coreServicesText = await fs.readFile(path.join(ROOT, 'src', 'lib', 'coreServices.ts'), 'utf8')

  const enabled = parseEnabledServices(enabledServicesText)
  const core = parseCoreServices(coreServicesText)
  const serviceCoverage = compareServiceCoverage(enabled.services, core.options)

  const jsonOutput = {
    generatedAt: new Date().toISOString(),
    source: {
      appDir: toPosix(path.relative(ROOT, APP_DIR)),
      apiDir: toPosix(path.relative(ROOT, API_DIR)),
    },
    counts: {
      pages: pages.length,
      appRouteHandlers: appRoutes.length,
      apiRouteHandlers: apiRoutes.length,
      privateExcluded: privateExcluded.length,
    },
    pages,
    appRouteHandlers: appRoutes,
    apiRouteHandlers: apiRoutes,
    privateExcluded,
    serviceChecks: {
      enabledServices: enabled.services,
      removedPrefixes: enabled.removedPrefixes,
      coreServiceKeys: core.keys,
      coreServiceOptions: core.options,
      coverageDiff: serviceCoverage,
    },
  }

  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(jsonOutput, null, 2)}\n`, 'utf8')

  const md = [
    '# Route Inventory',
    '',
    `Generated: ${jsonOutput.generatedAt}`,
    '',
    '## Counts',
    '',
    `- Pages: ${pages.length}`,
    `- App route handlers: ${appRoutes.length}`,
    `- API route handlers: ${apiRoutes.length}`,
    `- Private files excluded: ${privateExcluded.length}`,
    '',
    '## Service Config Check',
    '',
    `- enabledServices entries: ${enabled.services.length}`,
    `- coreServiceKeys entries: ${core.keys.length}`,
    `- coreServiceOptions entries: ${core.options.length}`,
    `- Paths in enabledServices only: ${serviceCoverage.onlyEnabled.length || 0}`,
    serviceCoverage.onlyEnabled.length > 0
      ? `  - ${serviceCoverage.onlyEnabled.join(', ')}`
      : '  - none',
    `- Paths in coreServiceOptions only: ${serviceCoverage.onlyCore.length || 0}`,
    serviceCoverage.onlyCore.length > 0 ? `  - ${serviceCoverage.onlyCore.join(', ')}` : '  - none',
    '',
    '## Top-Level Public Pages',
    '',
    ...pages
      .filter((p) => p.route.split('/').length <= 3)
      .slice(0, 120)
      .map((p) => `- \`${p.route}\` -> \`${p.file}\``),
    '',
    '## API Route Sample',
    '',
    ...apiRoutes.slice(0, 120).map((r) => `- \`${r.route}\` -> \`${r.file}\``),
    '',
    `Full machine output: \`${toPosix(path.relative(ROOT, OUTPUT_JSON))}\``,
  ].join('\n')

  await fs.writeFile(OUTPUT_MD, `${md}\n`, 'utf8')

  console.log(`Wrote ${toPosix(path.relative(ROOT, OUTPUT_JSON))}`)
  console.log(`Wrote ${toPosix(path.relative(ROOT, OUTPUT_MD))}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

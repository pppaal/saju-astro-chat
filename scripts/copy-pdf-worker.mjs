// Copies the pdf.js worker from the installed pdfjs-dist into public/ so it is
// served same-origin. Loading the worker from an external CDN failed in
// production (network policy / CORS), so we self-host it. Running this at build
// time guarantees the worker version always matches the installed pdfjs-dist
// API version (no "API version X does not match Worker version Y").

import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)

try {
  // Resolve the worker inside the installed package (version-accurate).
  const pkgJson = require.resolve('pdfjs-dist/package.json')
  const pkgDir = dirname(pkgJson)
  const src = join(pkgDir, 'build', 'pdf.worker.min.mjs')

  if (!existsSync(src)) {
    console.warn('[copy-pdf-worker] worker not found at', src, '— skipping')
    process.exit(0)
  }

  const destDir = join(process.cwd(), 'public')
  mkdirSync(destDir, { recursive: true })
  const dest = join(destDir, 'pdf.worker.min.mjs')
  copyFileSync(src, dest)
  console.log('[copy-pdf-worker] copied pdf.worker.min.mjs → public/')
} catch (err) {
  // Don't fail the build over this — the committed copy in public/ is a fallback.
  console.warn('[copy-pdf-worker] skipped:', err?.message || err)
}

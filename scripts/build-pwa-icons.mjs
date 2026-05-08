#!/usr/bin/env node
/**
 * Build PWA icons from scripts/icons/dp-icon.svg.
 *
 * Renders the master SVG to PNGs at every size declared in
 * public/manifest.json and writes them into public/icons/.
 * Also refreshes the legacy /public/icon.png and /public/logo/logo.png.
 *
 * Run: node scripts/build-pwa-icons.mjs
 */

import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')

const SVG_PATH = resolve(ROOT, 'scripts/icons/dp-icon.svg')
const ICONS_DIR = resolve(ROOT, 'public/icons')
const PUBLIC_DIR = resolve(ROOT, 'public')

// Sizes referenced by public/manifest.json
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

// Sizes packed into favicon.ico (Windows + browser tab convention)
const FAVICON_SIZES = [16, 32, 48, 64]

async function renderPng(svg, size) {
  return sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 6, g: 8, b: 26, alpha: 1 } })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function main() {
  const svg = await readFile(SVG_PATH)
  await mkdir(ICONS_DIR, { recursive: true })

  for (const size of SIZES) {
    const out = resolve(ICONS_DIR, `icon-${size}x${size}.png`)
    await writeFile(out, await renderPng(svg, size))
    process.stdout.write(`  ✓ ${out}\n`)
  }

  // Legacy referenced assets
  const legacy = [
    { out: resolve(PUBLIC_DIR, 'icon.png'), size: 512 },
    { out: resolve(PUBLIC_DIR, 'logo.png'), size: 512 },
    { out: resolve(PUBLIC_DIR, 'logo/logo.png'), size: 512 },
  ]
  for (const { out, size } of legacy) {
    await mkdir(dirname(out), { recursive: true })
    await writeFile(out, await renderPng(svg, size))
    process.stdout.write(`  ✓ ${out}\n`)
  }

  // Ship the SVG itself for modern browsers / manifest scalable entry
  await copyFile(SVG_PATH, resolve(ICONS_DIR, 'icon.svg'))
  process.stdout.write(`  ✓ ${resolve(ICONS_DIR, 'icon.svg')}\n`)

  // favicon.ico — multi-resolution, Windows/legacy-browser friendly
  const faviconBuffers = await Promise.all(FAVICON_SIZES.map((s) => renderPng(svg, s)))
  const favicon = await pngToIco(faviconBuffers)
  const faviconOut = resolve(PUBLIC_DIR, 'favicon.ico')
  await writeFile(faviconOut, favicon)
  process.stdout.write(`  ✓ ${faviconOut}\n`)
}

main().catch((err) => {
  console.error('build-pwa-icons failed:', err)
  process.exit(1)
})

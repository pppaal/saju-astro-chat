#!/usr/bin/env node
/**
 * Build native Android app icon + splash source images from the same
 * master mark used for the PWA icons (scripts/icons/dp-icon.svg).
 *
 * Writes into /assets, the source dir @capacitor/assets reads from:
 *   assets/icon.png             - legacy square launcher icon (bg baked in)
 *   assets/icon-foreground.png  - adaptive icon foreground layer (transparent bg)
 *   assets/icon-background.png  - adaptive icon background layer (solid brand color)
 *   assets/splash.png           - splash screen (brand bg + centered mark)
 *   assets/splash-dark.png      - same; app has no light theme to branch on
 *
 * Run: npm run mobile:assets:build
 * Then: npx capacitor-assets generate --android   (writes android/app/src/main/res)
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')

const SVG_PATH = resolve(ROOT, 'scripts/icons/dp-icon.svg')
const ASSETS_DIR = resolve(ROOT, 'assets')

const BRAND_BG = { r: 0x06, g: 0x08, b: 0x1a, alpha: 1 }
const ICON_SIZE = 1024
const SPLASH_SIZE = 2732

async function renderSvg(svg, size, background) {
  return sharp(Buffer.from(svg), { density: 384 })
    .resize(size, size, { fit: 'contain', background })
    .png()
    .toBuffer()
}

async function main() {
  const svg = await readFile(SVG_PATH, 'utf8')
  await mkdir(ASSETS_DIR, { recursive: true })

  // 1) Legacy icon: render the master SVG as-is (its own dark rounded plate
  //    is baked in via the <rect>) — used for older launchers / fallback.
  const iconFull = await renderSvg(svg, ICON_SIZE, BRAND_BG)
  await writeFile(resolve(ASSETS_DIR, 'icon.png'), iconFull)

  // 2) Adaptive icon foreground: same mark, background plate stripped so the
  //    layer is transparent, and re-scaled to Android's ~66% safe zone
  //    (tighter than the 80% PWA-maskable safe zone the master SVG targets —
  //    Android's circular/squircle masks crop more aggressively).
  const foregroundSvg = svg
    .replace(/<rect[^>]*fill="#06081a"\s*\/>\s*/, '')
    .replace('scale(0.82)', 'scale(0.66)')
  const iconForeground = await renderSvg(foregroundSvg, ICON_SIZE, { r: 0, g: 0, b: 0, alpha: 0 })
  await writeFile(resolve(ASSETS_DIR, 'icon-foreground.png'), iconForeground)

  // 3) Adaptive icon background: flat brand color plate.
  const iconBackground = await sharp({
    create: { width: ICON_SIZE, height: ICON_SIZE, channels: 4, background: BRAND_BG },
  })
    .png()
    .toBuffer()
  await writeFile(resolve(ASSETS_DIR, 'icon-background.png'), iconBackground)

  // 4) Splash screen: brand background with the mark (no background plate,
  //    same foreground layer) centered at ~38% of canvas width.
  const markSize = Math.round(SPLASH_SIZE * 0.38)
  const mark = await renderSvg(foregroundSvg, markSize, { r: 0, g: 0, b: 0, alpha: 0 })
  const splash = await sharp({
    create: { width: SPLASH_SIZE, height: SPLASH_SIZE, channels: 4, background: BRAND_BG },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer()
  await writeFile(resolve(ASSETS_DIR, 'splash.png'), splash)
  await writeFile(resolve(ASSETS_DIR, 'splash-dark.png'), splash)

  for (const name of ['icon.png', 'icon-foreground.png', 'icon-background.png', 'splash.png', 'splash-dark.png']) {
    process.stdout.write(`  ✓ ${resolve(ASSETS_DIR, name)}\n`)
  }
}

main().catch((err) => {
  console.error('build-android-assets failed:', err)
  process.exit(1)
})

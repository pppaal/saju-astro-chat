// tests/components/v9/contrast.test.ts
//
// v9 글자 대비 — 공용 부품이 쓰는 모든 글자색 × 바탕 짝이 WCAG AA 4.5:1 이상인지, 토큰 원본
// (src/styles/v9/tokens.module.css)에서 값을 읽어 계산한다. 토큰을 바꿔 대비가 무너지면 여기서
// 깨진다. --on-dark-4 는 실선(달 없는 날 테두리) 전용이라 글자색으로 쓰면 안 된다. 부품 CSS 는
// 토큰만 쓴다(원색 hex 금지).

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../../..')
const TOKENS = readFileSync(path.join(ROOT, 'src/styles/v9/tokens.module.css'), 'utf8')
const V9_DIR = path.join(ROOT, 'src/components/v9')

type RGBA = [number, number, number, number]

function parseTokens(css: string): Record<string, string> {
  const block = css.slice(css.indexOf('.root {'))
  const out: Record<string, string> = {}
  for (const m of block.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}

const RAW = parseTokens(TOKENS)

function color(name: string, depth = 0): RGBA {
  const v = RAW[name]
  if (!v) throw new Error(`missing token --${name}`)
  const ref = v.match(/^var\(--([a-z0-9-]+)\)$/)
  if (ref) {
    if (depth > 4) throw new Error(`token cycle at --${name}`)
    return color(ref[1], depth + 1)
  }
  const hex = v.match(/^#([0-9a-f]{6})$/i)
  if (hex) {
    const n = parseInt(hex[1], 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]
  }
  const rgba = v.match(/^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/)
  if (rgba) return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), Number(rgba[4])]
  throw new Error(`unparsed colour --${name}: ${v}`)
}

function over(fg: RGBA, bg: RGBA): RGBA {
  const a = fg[3]
  return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)).concat(1) as RGBA
}

function luminance([r, g, b]: RGBA): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(fgName: string, bgName: string): number {
  const bg = color(bgName)
  if (bg[3] !== 1) throw new Error(`background --${bgName} must be opaque`)
  const fg = over(color(fgName), bg)
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a)
  return (hi + 0.05) / (lo + 0.05)
}

// [글자색, 바탕, 어디서]
const TEXT_PAIRS: Array<[string, string, string]> = [
  ['ink', 'paper', '본문 제목 · 폴리오 굵은 글자'],
  ['ink', 'surface', '카드 띠 · 교차 행 값 · 판독 띠 값'],
  ['ink', 'paper-2', '스위치(켜진 쪽 바깥)'],
  ['body', 'paper', '교차 행 설명 · 가격 줄'],
  ['body', 'surface', '카드 기둥 읽기 · 푸터 굵은 글자'],
  ['body', 'paper-2', '스위치 꺼진 쪽'],
  ['mute', 'paper', 'mono 라벨 · 폴리오 · 범례 · 캡션'],
  ['mute', 'surface', '카드 mono 라벨 · 판독 띠 라벨 · UNRELATED 판정'],
  ['on-dark', 'ink', '먹 띠 글자 · SAME 판정 · 물 타일'],
  ['ink', 'on-dark', '먹 띠 위 SAME 판정(뒤집힘)'],
  ['on-dark-2', 'ink', '먹 띠 설명 · 교차 행 노트'],
  ['on-dark-3', 'ink', '먹 띠 mono 라벨 · 범례 · 카드 뒷면 라벨'],
  ['on-dark', 'wood', '木 타일'],
  ['on-dark', 'fire', '火 타일'],
  ['ink', 'earth', '土 타일'],
  ['ink', 'metal', '金 타일'],
  ['on-dark', 'water', '水 타일'],
  ['paper', 'seal', '算 도장'],
]

describe('v9 text contrast ≥ 4.5:1', () => {
  it.each(TEXT_PAIRS)('--%s on --%s (%s)', (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5)
  })

  it('--on-dark-4 는 글자로 읽히지 않는다 — 실선 전용', () => {
    expect(contrast('on-dark-4', 'ink')).toBeLessThan(4.5)
  })
})

describe('v9 component CSS', () => {
  const files = readdirSync(V9_DIR).filter((f) => f.endsWith('.module.css'))

  it('부품 CSS 가 하나 이상 있다', () => {
    expect(files.length).toBeGreaterThanOrEqual(10)
  })

  it.each(files)(
    '%s — 토큰만 쓴다(원색 hex·rgb 금지), --on-dark-4 를 글자색으로 쓰지 않는다',
    (f) => {
      const css = readFileSync(path.join(V9_DIR, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i)
      expect(css).not.toMatch(/\brgba?\(/i)
      expect(css).not.toMatch(/(^|[^-])color:\s*var\(--on-dark-4\)/m)
    }
  )
})

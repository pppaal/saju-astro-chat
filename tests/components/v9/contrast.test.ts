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
  ['body', 'paper-2', '스위치 꺼진 쪽 · 홈 카드 우물 눈썹 · 캡션(.wcap)'],
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

  // --mute 는 --paper-2 위에서 4.35:1(AA 미달) — 우물 · 스위치 · 조심 칸 같은 paper-2 바탕 위
  // 글자는 --body 이상을 쓴다(QA R-VH-2 · CI Lighthouse color-contrast).
  it('--mute 는 --paper-2 위 글자로 쓰지 않는다', () => {
    expect(contrast('mute', 'paper-2')).toBeLessThan(4.5)
  })
})

// ---- paper-2 바탕 위 글자 — 우물 안 글자가 --mute 로 돌아가면 깨진다 ----
describe('paper-2 바탕 위 글자색', () => {
  const HOME = readFileSync(path.join(ROOT, 'src/app/(main)/home/home-v9.module.css'), 'utf8')

  it('홈 카드 우물(.well = --paper-2)의 눈썹 · 캡션은 --body', () => {
    expect(HOME).toMatch(/\.well\s*\{[^}]*background:\s*var\(--paper-2\)/)
    const rule = HOME.match(/\.wcap \.eyebrow,\s*\.wcap \.cap\s*\{([^}]*)\}/)
    expect(rule).not.toBeNull()
    expect(rule![1]).toMatch(/color:\s*var\(--body\)/)
    expect(contrast('body', 'paper-2')).toBeGreaterThanOrEqual(4.5)
  })
})

// ---- 지난 날 칸 숫자 — 계산된 색 ----
// MonthGrid 는 지난 날 흐림을 버튼이 아니라 채움(::before)과 자식에 건다(초점 고리를 흐리지 않게).
// 먹 채움(좋음 · 최고) 칸의 종이 숫자까지 한 번 더 흐리면 대비가 1.67:1 로 무너진다(QA R-VC-1).
// axe 는 ::before 바탕을 읽지 못해 이 회귀를 못 본다 — 그래서 CSS 캐스케이드를 직접 풀어 계산한다.
describe('MonthGrid 지난 날 숫자 대비(계산된 색)', () => {
  const GRID = readFileSync(
    path.join(ROOT, 'src/components/calendar/v9/MonthGrid.module.css'),
    'utf8'
  ).replace(/\/\*[\s\S]*?\*\//g, '')
  const PAGE_BG = 'paper'

  type Rule = { selectors: string[]; decls: Record<string, string>; order: number }
  // 최상위 규칙만(@media 안은 폭 조건이라 색 · 흐림을 바꾸지 않는다 — 아래에서 확인).
  const topLevel = GRID.replace(/@media[^{]*\{(?:[^{}]*\{[^}]*\})*\s*\}/g, '')
  const RULES: Rule[] = [...topLevel.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((m, order) => ({
    selectors: m[1].split(',').map((x) => x.trim()),
    decls: Object.fromEntries(
      [...m[2].matchAll(/([a-z-]+)\s*:\s*([^;]+);?/g)].map((d) => [d[1], d[2].trim()])
    ),
    order,
  }))

  it('@media 블록은 opacity · color 를 바꾸지 않는다', () => {
    for (const block of GRID.match(/@media[^{]*\{(?:[^{}]*\{[^}]*\})*\s*\}/g) ?? []) {
      expect(block).not.toMatch(/\b(opacity|color)\s*:/)
    }
  })

  // 단순 선택자만 푼다: 복합 클래스(.a.b), 자식(>) · 자손( ) 결합자, *, ::before.
  type El = { classes: string[]; pseudo?: 'before' }
  function compoundMatches(compound: string, el: El): boolean {
    const pseudo = compound.match(/::([a-z-]+)$/)?.[1]
    const body = compound
      .replace(/::[a-z-]+$/, '')
      .replace(/:[a-z-]+(\([^)]*\))?/g, (p) => (p === ':focus-visible' ? '\u0000' : ''))
    if (body.includes('\u0000')) return false // 상태 선택자는 정적 색에 안 걸린다
    if ((pseudo ?? undefined) !== el.pseudo) return false
    if (body === '*' || body === '') return body === '*' || pseudo !== undefined
    const classes = body.split('.').filter(Boolean)
    return classes.every((c) => el.classes.includes(c))
  }
  function matches(selector: string, chain: El[]): boolean {
    const parts = selector.split(/\s*(>)\s*|\s+/).filter((x) => x !== undefined && x !== '')
    // parts: [compound, comb?, compound, ...] — 오른쪽부터 맞춘다
    let i = chain.length - 1
    let p = parts.length - 1
    if (!compoundMatches(parts[p], chain[i])) return false
    p--
    while (p >= 0) {
      const comb = parts[p] === '>' ? '>' : ' '
      if (comb === '>') p--
      const compound = parts[p]
      if (comb === '>') {
        i--
        if (i < 0 || !compoundMatches(compound, chain[i])) return false
      } else {
        let found = false
        while (--i >= 0)
          if (compoundMatches(compound, chain[i])) {
            found = true
            break
          }
        if (!found) return false
      }
      p--
    }
    return true
  }
  function specificity(selector: string): number {
    const classes = (selector.match(/\.[a-zA-Z][\w-]*/g) ?? []).length
    const pseudoEl = (selector.match(/::[a-z-]+/g) ?? []).length
    return classes * 10 + pseudoEl
  }
  function computed(prop: string, chain: El[]): string | undefined {
    let best: { spec: number; order: number; value: string } | undefined
    for (const r of RULES) {
      if (!(prop in r.decls)) continue
      for (const sel of r.selectors) {
        if (!matches(sel, chain)) continue
        const spec = specificity(sel)
        if (!best || spec > best.spec || (spec === best.spec && r.order >= best.order)) {
          best = { spec, order: r.order, value: r.decls[prop] }
        }
      }
    }
    return best?.value
  }
  function tokenOf(value: string | undefined): string {
    const m = value?.match(/^var\(--([a-z0-9-]+)\)$/)
    if (!m) throw new Error(`not a token: ${value}`)
    return m[1]
  }
  function inherited(prop: string, chain: El[]): string | undefined {
    for (let i = chain.length; i > 0; i--) {
      const v = computed(prop, chain.slice(0, i))
      if (v) return v
    }
    return undefined
  }
  function ratio(a: RGBA, b: RGBA): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }
  function withAlpha([r, g, b]: RGBA, a: number): RGBA {
    return [r, g, b, a]
  }

  /** 지난 날 칸 하나의 숫자 대비 — 숫자색(흐림 적용) vs 채움(흐림 적용)을 페이지 바탕 위에 합성. */
  function pastNumeralContrast(tone: string): number {
    const btn: El = { classes: ['day', tone, 'past'] }
    const fillToken = tokenOf(
      // --tile-bg 는 사용자 속성 — 가장 구체적인 선언을 고른다
      computed('--tile-bg', [btn])
    )
    const fillOpacity = Number(computed('opacity', [{ ...btn, pseudo: 'before' }]) ?? 1)
    const num: El = { classes: ['num'] }
    const numOpacity = Number(computed('opacity', [btn, num]) ?? 1)
    const numToken = tokenOf(inherited('color', [btn, num]))
    const page = color(PAGE_BG)
    const fill = over(withAlpha(color(fillToken), fillOpacity), page)
    const fg = over(withAlpha(over(color(numToken), color(fillToken)), numOpacity), fill)
    return ratio(fg, fill)
  }

  /** 디자인 원본(calendar9.html .day.past) — 칸 전체를 45% 로 흐린 그룹 합성 대비. */
  function wholeTileContrast(tone: string): number {
    const btn: El = { classes: ['day', tone] }
    const fillToken = tokenOf(computed('--tile-bg', [btn]))
    const numToken = tokenOf(inherited('color', [btn, { classes: ['num'] }]))
    const page = color(PAGE_BG)
    const fill = over(withAlpha(color(fillToken), 0.45), page)
    const fg = over(withAlpha(over(color(numToken), color(fillToken)), 0.45), page)
    return ratio(fg, fill)
  }

  it('지난 날 채움은 45% 로 흐리다(디자인 past = 45%)', () => {
    expect(computed('opacity', [{ classes: ['day', 'good', 'past'], pseudo: 'before' }])).toBe(
      '0.45'
    )
  })

  it.each(['good', 'best'])('먹 채움(%s) 지난 날 숫자는 흐리지 않는다 — 대비 ≥ 2.8:1', (tone) => {
    expect(computed('opacity', [{ classes: ['day', tone, 'past'] }, { classes: ['num'] }])).toBe(
      '1'
    )
    expect(pastNumeralContrast(tone)).toBeGreaterThanOrEqual(2.8)
  })

  // 먹 칸은 숫자를 흐리지 않으니 칸째 흐림과 같은 대비다.
  it.each(['good', 'best'])('%s 지난 날 숫자 = 디자인의 칸째 45% 흐림 대비', (tone) => {
    expect(pastNumeralContrast(tone)).toBeCloseTo(wholeTileContrast(tone), 2)
  })
  // 밝은 칸은 먹 숫자를 흐린 채움 위에 합성해 칸째 흐림보다 몇 % 옅다(A11Y-3 이 채움 · 숫자를
  // 따로 흐리며 남긴 작은 차이, 눈으로는 같다) — 5% 안이면 같은 모양으로 본다.
  it.each(['calm', 'caution'])('%s 지난 날 숫자는 칸째 45% 흐림과 거의 같다', (tone) => {
    expect(pastNumeralContrast(tone)).toBeGreaterThanOrEqual(wholeTileContrast(tone) * 0.95)
  })

  it('지난 날 표지(LED · 별 · BEST)는 여전히 흐리다', () => {
    for (const mark of ['led', 'kd', 'bl']) {
      expect(computed('opacity', [{ classes: ['day', 'best', 'past'] }, { classes: [mark] }])).toBe(
        '0.45'
      )
    }
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

// tests/lib/saju/conventions.docSync.test.ts
//
// CONVENTIONS.md §6 지장간 구성표 ↔ constants.ts JIJANGGAN 대조 (엔진 감사 SD-14).
// 예전 §6 은 '子·卯·午·酉 = 정기만' 이라 적었지만 코드의 午 는 丙·己·丁 3층이었다.
// 문서 표의 층 구성(여기·중기·정기 글자와 층수)이 코드와 갈라지면 여기서 실패한다.

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { JIJANGGAN } from '@/lib/saju/constants'

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const
const LAYERS = ['여기', '중기', '정기'] as const

type DocRow = { layers: Record<string, string>; count: number }

function readSection6Table(): Map<string, DocRow> {
  const md = fs.readFileSync(path.join(process.cwd(), 'src/lib/saju/CONVENTIONS.md'), 'utf8')
  const start = md.indexOf('## 6. 지장간')
  const end = md.indexOf('\n## 7.', start)
  expect(start, 'CONVENTIONS.md §6 heading').toBeGreaterThan(-1)
  const section = md.slice(start, end)
  const rows = new Map<string, DocRow>()
  for (const line of section.split('\n')) {
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim())
    if (cells.length !== 5 || !(BRANCHES as readonly string[]).includes(cells[0])) continue
    const layers: Record<string, string> = {}
    LAYERS.forEach((name, i) => {
      if (cells[i + 1] !== '—') layers[name] = cells[i + 1]
    })
    rows.set(cells[0], { layers, count: Number(cells[4]) })
  }
  return rows
}

describe('CONVENTIONS.md §6 지장간 표 = constants.ts JIJANGGAN', () => {
  const doc = readSection6Table()

  it('12지지가 모두 표에 있다', () => {
    expect([...doc.keys()].sort()).toEqual([...BRANCHES].sort())
  })

  it.each(BRANCHES)('%s — 층수 = Object.keys(JIJANGGAN[b]).length', (b) => {
    const row = doc.get(b)!
    expect(row.count).toBe(Object.keys(JIJANGGAN[b]).length)
    expect(Object.keys(row.layers).length).toBe(row.count)
  })

  it.each(BRANCHES)('%s — 여기·중기·정기 글자가 코드와 같다', (b) => {
    expect(doc.get(b)!.layers).toEqual(JIJANGGAN[b])
  })

  it('午 는 3층(丙·己·丁), 子·卯·酉 만 정기 1층', () => {
    const single = BRANCHES.filter((b) => Object.keys(JIJANGGAN[b]).length === 1)
    expect(single).toEqual(['子', '卯', '酉'])
    expect(JIJANGGAN['午']).toEqual({ 여기: '丙', 중기: '己', 정기: '丁' })
  })
})

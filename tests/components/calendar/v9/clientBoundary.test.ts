// tests/components/calendar/v9/clientBoundary.test.ts
//
// 클라이언트 경계 — 운세 달력 클라이언트 트리(CalendarClient + components/calendar/v9)는 뷰모델 모듈을
// 값으로 가져오지 않는다. monthViewModel · dayViewModel · astroDetail 은 천체력 캐시(swisseph)와
// 절기표를 끌고 와 클라이언트 번들 빌드가 깨진다 — 타입만(import type), 값은 잎 모듈(gridTap)에서.

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SERVER_ONLY =
  /from '@\/lib\/calendar-view\/(monthViewModel|dayViewModel|astroDetail|dayHero)'/

function clientFiles(): string[] {
  const dir = path.join(ROOT, 'src/components/calendar/v9')
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
    .map((f) => path.join(dir, f))
  return [...files, path.join(ROOT, 'src/app/calendar/CalendarClient.tsx')]
}

describe('운세 달력 클라이언트 경계', () => {
  it('뷰모델 모듈은 import type 으로만', () => {
    const offenders: string[] = []
    for (const f of clientFiles()) {
      const src = readFileSync(f, 'utf8')
      for (const line of src.split('\n')) {
        if (
          SERVER_ONLY.test(line) &&
          !/^\s*import type /.test(line) &&
          !/^\s*}\s*from/.test(line)
        ) {
          offenders.push(`${path.relative(ROOT, f)}: ${line.trim()}`)
        }
      }
      // 여러 줄 import { a, type B } from '…viewModel' — 값이 하나라도 있으면 위반.
      for (const m of src.matchAll(
        /import\s+\{([^}]*)\}\s+from\s+'@\/lib\/calendar-view\/(monthViewModel|dayViewModel|astroDetail|dayHero)'/g
      )) {
        const names = m[1]
          .split(',')
          .map((n) => n.trim())
          .filter(Boolean)
        if (names.some((n) => !n.startsWith('type ')))
          offenders.push(`${path.relative(ROOT, f)}: ${m[0]}`)
      }
    }
    expect(offenders).toEqual([])
  })
})

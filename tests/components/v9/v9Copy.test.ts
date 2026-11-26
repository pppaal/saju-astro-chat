// tests/components/v9/v9Copy.test.ts — v9 공용 문구: 모든 항목이 ko/en 한 쌍, 영어 쪽에 한글 없음,
// 판정 긴 꼴은 리포트와 같은 TONE_LABEL.

import { describe, it, expect } from 'vitest'
import * as copy from '@/components/v9/v9Copy'
import { TONE_LABEL } from '@/lib/report/toneLabel'
import { TONE_LABEL as REPORT_TONE_LABEL } from '@/lib/report/integratedReportLabels'

type Pair = { ko: string; en: string }
const isPair = (v: unknown): v is Pair =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as Pair).ko === 'string' &&
  typeof (v as Pair).en === 'string'

function collect(v: unknown, path: string, out: Array<[string, Pair]>) {
  if (isPair(v)) out.push([path, v])
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) collect(x, `${path}.${k}`, out)
}

const pairs: Array<[string, Pair]> = []
for (const [name, v] of Object.entries(copy)) if (typeof v === 'object') collect(v, name, pairs)

describe('v9Copy', () => {
  it('문구 쌍이 충분히 모였다', () => {
    expect(pairs.length).toBeGreaterThan(50)
  })

  it.each(pairs)('%s — ko/en 둘 다 비어 있지 않고, en 에 한글이 없다', (_p, bi) => {
    expect(bi.ko.trim()).not.toBe('')
    expect(bi.en.trim()).not.toBe('')
    expect(bi.en).not.toMatch(/[ᄀ-ᇿ㄰-㆏가-힯]/)
  })

  it('판정 긴 꼴 = TONE_LABEL (리포트와 같은 출처)', () => {
    expect(REPORT_TONE_LABEL).toBe(TONE_LABEL)
    expect(copy.VERDICT.same.long).toBe(TONE_LABEL.resonant)
    expect(copy.VERDICT.supportive.long).toBe(TONE_LABEL.complement)
    expect(copy.VERDICT.twoPulls.long).toBe(TONE_LABEL.tension)
    expect(copy.VERDICT.unrelated.long).toBe(TONE_LABEL.neutral)
  })

  it('fill 은 아는 자리표시자만 채운다', () => {
    expect(copy.fill('From {n} credit', { n: 1 })).toBe('From 1 credit')
    expect(copy.fill('{a} {b}', { a: 'x' })).toBe('x {b}')
  })
})

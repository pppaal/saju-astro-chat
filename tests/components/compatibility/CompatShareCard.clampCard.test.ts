// tests/components/compatibility/CompatShareCard.clampCard.test.ts
//
// clampCard — 공유카드 "족집게 한 줄"을 카드 폭에 맞게 자르는 헬퍼.
// 핵심 계약: 넘칠 때 말줄임표(…)를 절대 안 붙이고, 단어 중간에서 끊지 않으며,
// 짝 안 맞는 여는 따옴표·꼬리 접속어를 떼어 완결된 절에서 끝낸다.

import { describe, it, expect } from 'vitest'
import { clampCard } from '@/components/compatibility/CompatShareCard'

// 실제 카드가 쓰는 로케일별 상한(page.tsx: KO 54 · EN 92).
const KO = 54
const EN = 92

describe('clampCard', () => {
  it('상한 이하면 원문 그대로', () => {
    const s = 'Alexandra lands right in Christopher\'s spouse seat — a "passion & spark" match.'
    expect(s.length).toBeLessThanOrEqual(EN)
    expect(clampCard(s, EN)).toBe(s)
  })

  it('상한과 정확히 같으면 원문 그대로', () => {
    const s = 'x'.repeat(EN)
    expect(clampCard(s, EN)).toBe(s)
  })

  it('빈 입력/공백은 빈 문자열', () => {
    expect(clampCard('', EN)).toBe('')
    expect(clampCard('   ', EN)).toBe('')
    // 방어적: null/undefined 가 흘러들어와도 throw 하지 않음
    expect(clampCard(undefined as unknown as string, EN)).toBe('')
  })

  it('넘쳐도 말줄임표(…)를 절대 안 붙인다', () => {
    const s = 'word '.repeat(60) // 300자
    const out = clampCard(s, EN)
    expect(out).not.toContain('…')
    expect(out.length).toBeLessThanOrEqual(EN)
  })

  it('단어 중간에서 끊지 않는다 (마지막 단어 경계에서 컷)', () => {
    const s = 'The quick brown fox jumps over the lazy sleeping watchdog companion nearby today'
    const out = clampCard(s, 40)
    // 컷 결과가 원문의 접두 단어열이어야 하고, 잘린 마지막 조각이 온전한 단어여야 함
    expect(s.startsWith(out)).toBe(true)
    const lastWord = out.split(' ').pop() ?? ''
    expect(s.split(' ')).toContain(lastWord)
  })

  it('짝 안 맞는 여는 따옴표가 남지 않는다 (극단 긴 이름)', () => {
    const s =
      'Bartholomew lands right in Maximiliana\'s spouse seat — a "responsibility & steadiness" match.'
    expect(s.length).toBeGreaterThan(EN)
    const out = clampCard(s, EN)
    expect(out).not.toContain('…')
    // 큰따옴표는 짝이 맞거나(0/2…) 아예 없어야 한다 — 홀수면 여는 따옴표가 대롱거림
    const quotes = (out.match(/["“”]/g) ?? []).length
    expect(quotes % 2).toBe(0)
    // 완결된 절에서 끝 — 대시/접속어로 안 끝남
    expect(out).toBe("Bartholomew lands right in Maximiliana's spouse seat")
  })

  it('꼬리 대시·접속어(— a, and, to …)를 떼어낸다', () => {
    expect(clampCard('the pull is strong and steady between them here — a', 40)).not.toMatch(
      /(?:—|–|-|\b(?:a|an|the|and|&|to))\s*$/i
    )
  })

  it('꼬리 구두점으로 끝나지 않는다', () => {
    const out = clampCard('one two three four five six seven eight nine ten eleven, twelve.', 40)
    expect(out).not.toMatch(/[\s"'“”—–,.·:;]$/u)
  })

  it('KO 상한(54)에서도 말줄임표 없이 컷', () => {
    const s =
      '준영에게 지민은 정말 설레는 짝으로 다가와요 그리고 바로 배우자 자리에 환하게 떠 있어서 더욱 강한 인연 신호가 되어줘요 오래도록'
    const out = clampCard(s, KO)
    expect(out).not.toContain('…')
    expect(out.length).toBeLessThanOrEqual(KO)
  })

  it('결정론적 — 같은 입력이면 같은 출력', () => {
    const s = 'word '.repeat(40)
    expect(clampCard(s, EN)).toBe(clampCard(s, EN))
  })
})

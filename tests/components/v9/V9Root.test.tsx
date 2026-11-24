import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import V9Root from '@/components/v9/server/V9Root'

// V9Root pulls src/app/fonts/v9.ts (next/font/local + server-only). Both are
// mocked globally in tests/setup.ts, so rendering it must not crash.
describe('V9Root', () => {
  it('renders children inside the paper token root', () => {
    render(
      <V9Root>
        <p>paper child</p>
      </V9Root>
    )

    const child = screen.getByText('paper child')
    const root = child.parentElement as HTMLElement
    expect(root).toHaveAttribute('data-surface', 'paper')
    // next/font/local mock returns variable 'v' for each of the three v9 fonts.
    expect(root.className.split(/\s+/).filter((c) => c === 'v')).toHaveLength(3)
  })
})

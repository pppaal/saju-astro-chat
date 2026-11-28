/**
 * BirthGate · BirthInfoModal — 공용 생년월일 모달이 홈 CSS 와 분리된 뒤에도
 * BirthGate(캘린더·리포트 게스트)와 운명 상담사에서 같은 스타일로 뜨는지.
 *
 * 모달 스타일은 components/birth/BirthInfoModal.module.css 가 소유한다. 홈
 * 개편이 홈 CSS 모듈을 갈아엎어도 이 화면들의 오버레이·카드·iOS 16px 입력
 * 규칙이 사라지지 않게 고정한다.
 */
import React from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}))

// useCitySearch 는 도시 DB(fetch) + tz-lookup 을 끌어온다 — 렌더만 확인하므로 스텁.
vi.mock('@/hooks/calendar/useCitySearch', () => ({
  useCitySearch: () => ({
    suggestions: [],
    selectedCity: null,
    openSug: false,
    isUserTyping: false,
    cityErr: null,
    setOpenSug: vi.fn(),
    setSelectedCity: vi.fn(),
    handleCityInputChange: vi.fn(),
    handleCitySelect: vi.fn(),
  }),
}))

import BirthGate from '@/components/birth/BirthGate'
import BirthInfoModal from '@/components/birth/BirthInfoModal'
import styles from '@/components/birth/BirthInfoModal.module.css'

const SRC = (p: string) => join(process.cwd(), 'src', p)
const read = (p: string) => readFileSync(SRC(p), 'utf-8')

function expectModalChrome() {
  const dialog = screen.getByRole('dialog')
  expect(styles.modalOverlay).toBeTruthy()
  expect(dialog.className).toBe(styles.modalOverlay)
  expect(dialog.firstElementChild?.className).toBe(styles.modalCard)
  expect(dialog.querySelector('h2')?.className).toBe(styles.modalTitle)
  return dialog
}

describe('BirthGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('shows the shared birth modal with its own overlay/card classes when nothing is stored', async () => {
    render(<BirthGate base="/calendar" locale="ko" />)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
    expectModalChrome()
    // 한 이름 '출생 정보'(결정 QA-5, COPY-9).
    expect(screen.getByRole('heading', { name: '출생 정보 입력' })).toBeTruthy()
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('redirects with the report birth query when birth info is stored', async () => {
    window.localStorage.setItem(
      'destinypal:birthInfo:v1',
      JSON.stringify({
        birthDate: '1990-05-21',
        birthTime: '14:30',
        gender: 'female',
        savedAt: '2020-01-01T00:00:00.000Z',
      })
    )
    render(<BirthGate base="/calendar" locale="en" />)
    await waitFor(() => expect(router.replace).toHaveBeenCalledTimes(1))
    const target = router.replace.mock.calls[0][0] as string
    expect(target.startsWith('/calendar?')).toBe(true)
    const p = new URLSearchParams(target.split('?')[1])
    expect(p.get('lang')).toBe('en')
    expect(p.get('date')).toBe('1990-05-21')
    expect(p.get('time')).toBe('14:30')
    expect(p.get('gender')).toBe('female')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('BirthInfoModal — destiny-counselor usage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('the counselor page imports the shared modal from components/birth', () => {
    const page = read('app/destiny-counselor/page.tsx')
    expect(page).toMatch(/import BirthInfoModal from '@\/components\/birth\/BirthInfoModal'/)
  })

  it('renders the "view another person" variant with the same modal chrome', () => {
    render(
      <BirthInfoModal
        open
        initial={null}
        persist={false}
        startBlank
        locale="ko"
        title="다른 사람으로 보기"
        submitLabel="이 사람으로 보기"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    )
    const dialog = expectModalChrome()
    expect(screen.getByRole('heading', { name: '다른 사람으로 보기' })).toBeTruthy()
    const save = screen.getByRole('button', { name: '이 사람으로 보기' })
    expect(save.className).toBe(styles.modalSave)
    const nameInput = dialog.querySelector('#birth-info-name')
    expect(nameInput?.className).toBe(styles.modalInput)
  })

  it('renders nothing when closed', () => {
    render(<BirthInfoModal open={false} initial={null} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('BirthInfoModal.module.css', () => {
  const css = read('components/birth/BirthInfoModal.module.css')

  it('owns the overlay, card and action classes', () => {
    for (const cls of [
      'modalOverlay',
      'modalCard',
      'modalTitle',
      'modalInput',
      'modalSave',
      'modalCancel',
      'modalDelete',
      'modalLoadList',
    ]) {
      expect(css).toMatch(new RegExp(`\\.${cls}\\s*\\{`))
    }
  })

  it('keeps the iOS 16px rule on its own input and buttons (no Safari zoom-in on focus)', () => {
    const rule = css.match(/\.modalInput,[\s\S]*?\{\s*font-size:\s*16px !important;\s*\}/)
    expect(rule).not.toBeNull()
    const selectors = rule![0]
    for (const sel of ['.modalCancel', '.modalSave']) {
      expect(selectors).toContain(sel)
    }
  })

  // webpack(next dev --webpack)의 CSS 모듈은 지역 클래스 없는 선택자를 '불순'으로
  // 거부한다. 화면 전체 input 16px 규칙은 globals.css 가 소유한다.
  it('has no pure-global selectors (webpack CSS modules reject them)', () => {
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(rules).not.toMatch(/(^|[,}])\s*:global\(/m)
  })

  it('globals.css owns the page-wide iOS 16px input rule', () => {
    const globals = read('app/globals.css')
    const rule = globals.match(
      /input\[type='text'\],[\s\S]*?\{\s*font-size:\s*16px !important;\s*\}/
    )
    expect(rule).not.toBeNull()
    for (const sel of [
      "input[type='email']",
      "input[type='number']",
      "input[type='tel']",
      "input[type='date']",
      "input[type='time']",
      'textarea',
      'select',
    ]) {
      expect(rule![0]).toContain(sel)
    }
  })
})

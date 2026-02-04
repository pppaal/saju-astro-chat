/**
 * Accessibility Tests for Modal Components
 * Tests CrisisModal, ConfirmDialog, and CreditDepletedModal for WCAG compliance
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { axe } from './axe-helper'
import React from 'react'

// Mock useFocusTrap hook
vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: () => React.createRef(),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => '/test',
}))

// Mock I18n
vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    locale: 'ko',
  }),
}))

// Mock CSS modules
vi.mock('@/components/ui/ConfirmDialog.module.css', () => ({
  default: new Proxy({}, { get: (_, prop) => String(prop) }),
}))

vi.mock('@/components/ui/CreditDepletedModal.module.css', () => ({
  default: new Proxy({}, { get: (_, prop) => String(prop) }),
}))

import CrisisModal from '@/components/destiny-map/modals/CrisisModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import CreditDepletedModal from '@/components/ui/CreditDepletedModal'

describe('Accessibility: CrisisModal', () => {
  const defaultTr = {
    crisisTitle: 'Support Resources',
    crisisMessage: 'If you are in crisis, please reach out.',
    crisisHotline: 'Crisis Hotline',
    crisisHotlineNumber: '1393 (24 hours)',
    groundingTip: 'Take a deep breath.',
    crisisClose: 'Close',
  }

  const defaultStyles = new Proxy({}, { get: (_, prop) => String(prop) }) as Record<string, string>

  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('should have no accessibility violations when open', async () => {
    const { container } = render(
      <CrisisModal isOpen={true} onClose={vi.fn()} tr={defaultTr} styles={defaultStyles} />
    )

    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('should have role="dialog" and aria-modal="true"', () => {
    render(<CrisisModal isOpen={true} onClose={vi.fn()} tr={defaultTr} styles={defaultStyles} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('should have aria-labelledby and aria-describedby', () => {
    render(<CrisisModal isOpen={true} onClose={vi.fn()} tr={defaultTr} styles={defaultStyles} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-labelledby', 'crisis-modal-title')
    expect(dialog).toHaveAttribute('aria-describedby', 'crisis-modal-description')

    expect(document.getElementById('crisis-modal-title')?.textContent).toBe('Support Resources')
    expect(document.getElementById('crisis-modal-description')?.textContent).toBe(
      'If you are in crisis, please reach out.'
    )
  })

  it('should have accessible close button with aria-label', () => {
    render(<CrisisModal isOpen={true} onClose={vi.fn()} tr={defaultTr} styles={defaultStyles} />)

    const closeButton = screen.getByRole('button', { name: 'Close' })
    expect(closeButton).toBeInTheDocument()
  })

  it('should close on Escape key press', () => {
    const onClose = vi.fn()
    render(<CrisisModal isOpen={true} onClose={onClose} tr={defaultTr} styles={defaultStyles} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('should not render when closed', () => {
    const { container } = render(
      <CrisisModal isOpen={false} onClose={vi.fn()} tr={defaultTr} styles={defaultStyles} />
    )

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument()
  })
})

describe('Accessibility: ConfirmDialog', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('should have no accessibility violations when open', async () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={true}
        title="Delete Item"
        message="Are you sure you want to delete this?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        type="danger"
      />
    )

    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('should have role="dialog" and aria-modal="true"', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Action"
        message="Proceed?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('should have aria-labelledby and aria-describedby', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirm"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title')
    expect(dialog).toHaveAttribute('aria-describedby', 'dialog-message')
  })

  it('should have two accessible action buttons', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete"
        message="Are you sure?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('should close on Escape key press', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        isOpen={true}
        title="Test"
        message="Test"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalled()
  })

  it('should not render when closed', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        title="Test"
        message="Test"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument()
  })
})

describe('Accessibility: CreditDepletedModal', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('should have no accessibility violations in depleted state', async () => {
    const { container } = render(
      <CreditDepletedModal isOpen={true} onClose={vi.fn()} remainingCredits={0} type="depleted" />
    )

    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('should have role="dialog" and aria-modal="true"', () => {
    render(<CreditDepletedModal isOpen={true} onClose={vi.fn()} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('should have aria-labelledby pointing to title', () => {
    render(<CreditDepletedModal isOpen={true} onClose={vi.fn()} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-labelledby', 'credit-modal-title')
  })

  it('should have accessible close button with aria-label', () => {
    render(<CreditDepletedModal isOpen={true} onClose={vi.fn()} />)

    const closeButton = screen.getByRole('button', { name: /닫기/ })
    expect(closeButton).toBeInTheDocument()
  })

  it('should have accessible purchase and later buttons', () => {
    render(<CreditDepletedModal isOpen={true} onClose={vi.fn()} type="depleted" />)

    const buttons = screen.getAllByRole('button')
    // Should have purchase, later, and close buttons
    expect(buttons.length).toBeGreaterThanOrEqual(3)
  })

  it('should close on Escape key press', () => {
    const onClose = vi.fn()
    render(<CreditDepletedModal isOpen={true} onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})

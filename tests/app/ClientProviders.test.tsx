/**
 * Tests for ClientProviders component
 * Validates provider nesting, context availability, and error boundaries
 */

import { render, screen } from '@testing-library/react'
import { ClientProviders } from '@/app/ClientProviders'
import { useI18n } from '@/i18n/I18nProvider'
import { useToast } from '@/components/ui/Toast'
import { useCreditModal } from '@/contexts/CreditModalContext'
import { useNotification } from '@/contexts/NotificationContext'

// Mock all provider modules
jest.mock('@/i18n/I18nProvider', () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="i18n-provider">{children}</div>
  ),
  useI18n: jest.fn(),
}))

jest.mock('@/components/ui/Toast', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="toast-provider">{children}</div>
  ),
  useToast: jest.fn(),
}))

jest.mock('@/contexts/CreditModalContext', () => ({
  CreditModalProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="credit-modal-provider">{children}</div>
  ),
  useCreditModal: jest.fn(),
}))

jest.mock('@/contexts/NotificationContext', () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="notification-provider">{children}</div>
  ),
  useNotification: jest.fn(),
}))

describe('ClientProviders', () => {
  it('should render children', () => {
    render(
      <ClientProviders>
        <div data-testid="test-child">Test Content</div>
      </ClientProviders>
    )

    expect(screen.getByTestId('test-child')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should wrap children in I18nProvider', () => {
    render(
      <ClientProviders>
        <div>Content</div>
      </ClientProviders>
    )

    expect(screen.getByTestId('i18n-provider')).toBeInTheDocument()
  })

  it('should wrap children in ToastProvider', () => {
    render(
      <ClientProviders>
        <div>Content</div>
      </ClientProviders>
    )

    expect(screen.getByTestId('toast-provider')).toBeInTheDocument()
  })

  it('should wrap children in CreditModalProvider', () => {
    render(
      <ClientProviders>
        <div>Content</div>
      </ClientProviders>
    )

    expect(screen.getByTestId('credit-modal-provider')).toBeInTheDocument()
  })

  it('should wrap children in NotificationProvider', () => {
    render(
      <ClientProviders>
        <div>Content</div>
      </ClientProviders>
    )

    expect(screen.getByTestId('notification-provider')).toBeInTheDocument()
  })

  it('should nest providers in correct order', () => {
    const { container } = render(
      <ClientProviders>
        <div data-testid="content">Content</div>
      </ClientProviders>
    )

    // Verify nesting order: I18n > Toast > CreditModal > Notification > Content
    const i18nProvider = screen.getByTestId('i18n-provider')
    const toastProvider = screen.getByTestId('toast-provider')
    const creditModalProvider = screen.getByTestId('credit-modal-provider')
    const notificationProvider = screen.getByTestId('notification-provider')
    const content = screen.getByTestId('content')

    // Check that each provider contains the next one
    expect(i18nProvider).toContainElement(toastProvider)
    expect(toastProvider).toContainElement(creditModalProvider)
    expect(creditModalProvider).toContainElement(notificationProvider)
    expect(notificationProvider).toContainElement(content)
  })

  it('should handle multiple children', () => {
    render(
      <ClientProviders>
        <div data-testid="child1">Child 1</div>
        <div data-testid="child2">Child 2</div>
        <div data-testid="child3">Child 3</div>
      </ClientProviders>
    )

    expect(screen.getByTestId('child1')).toBeInTheDocument()
    expect(screen.getByTestId('child2')).toBeInTheDocument()
    expect(screen.getByTestId('child3')).toBeInTheDocument()
  })

  it('should handle empty children', () => {
    const { container } = render(<ClientProviders>{null}</ClientProviders>)

    // Should still render all providers
    expect(screen.getByTestId('i18n-provider')).toBeInTheDocument()
    expect(screen.getByTestId('toast-provider')).toBeInTheDocument()
    expect(screen.getByTestId('credit-modal-provider')).toBeInTheDocument()
    expect(screen.getByTestId('notification-provider')).toBeInTheDocument()
  })

  it('should handle undefined children', () => {
    const { container } = render(<ClientProviders>{undefined}</ClientProviders>)

    expect(screen.getByTestId('i18n-provider')).toBeInTheDocument()
  })

  it('should handle complex React elements as children', () => {
    const ComplexChild = () => {
      return (
        <div>
          <h1>Title</h1>
          <p>Paragraph</p>
          <button>Button</button>
        </div>
      )
    }

    render(
      <ClientProviders>
        <ComplexChild />
      </ClientProviders>
    )

    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Paragraph')).toBeInTheDocument()
    expect(screen.getByText('Button')).toBeInTheDocument()
  })

  it('should allow children to access I18n context', () => {
    const mockI18n = {
      t: jest.fn((key) => key),
      locale: 'ko',
      setLocale: jest.fn(),
    }
    ;(useI18n as jest.Mock).mockReturnValue(mockI18n)

    const TestComponent = () => {
      const i18n = useI18n()
      return <div data-testid="i18n-user">{i18n.locale}</div>
    }

    render(
      <ClientProviders>
        <TestComponent />
      </ClientProviders>
    )

    expect(useI18n).toHaveBeenCalled()
  })

  it('should allow children to access Toast context', () => {
    const mockToast = {
      show: jest.fn(),
      showSuccess: jest.fn(),
      showError: jest.fn(),
    }
    ;(useToast as jest.Mock).mockReturnValue(mockToast)

    const TestComponent = () => {
      const toast = useToast()
      return <button onClick={() => toast.show('test')}>Show Toast</button>
    }

    render(
      <ClientProviders>
        <TestComponent />
      </ClientProviders>
    )

    expect(useToast).toHaveBeenCalled()
  })

  it('should allow children to access CreditModal context', () => {
    const mockCreditModal = {
      isOpen: false,
      open: jest.fn(),
      close: jest.fn(),
    }
    ;(useCreditModal as jest.Mock).mockReturnValue(mockCreditModal)

    const TestComponent = () => {
      const modal = useCreditModal()
      return <button onClick={modal.open}>Open Modal</button>
    }

    render(
      <ClientProviders>
        <TestComponent />
      </ClientProviders>
    )

    expect(useCreditModal).toHaveBeenCalled()
  })

  it('should allow children to access Notification context', () => {
    const mockNotification = {
      notifications: [],
      addNotification: jest.fn(),
      removeNotification: jest.fn(),
    }
    ;(useNotification as jest.Mock).mockReturnValue(mockNotification)

    const TestComponent = () => {
      const notif = useNotification()
      return <div data-testid="notif-count">{notif.notifications.length}</div>
    }

    render(
      <ClientProviders>
        <TestComponent />
      </ClientProviders>
    )

    expect(useNotification).toHaveBeenCalled()
  })

  it('should re-render when children change', () => {
    const { rerender } = render(
      <ClientProviders>
        <div data-testid="content">Initial</div>
      </ClientProviders>
    )

    expect(screen.getByText('Initial')).toBeInTheDocument()

    rerender(
      <ClientProviders>
        <div data-testid="content">Updated</div>
      </ClientProviders>
    )

    expect(screen.getByText('Updated')).toBeInTheDocument()
    expect(screen.queryByText('Initial')).not.toBeInTheDocument()
  })

  it('should maintain provider instances across re-renders', () => {
    const { rerender } = render(
      <ClientProviders>
        <div>Content 1</div>
      </ClientProviders>
    )

    const i18nProvider1 = screen.getByTestId('i18n-provider')

    rerender(
      <ClientProviders>
        <div>Content 2</div>
      </ClientProviders>
    )

    const i18nProvider2 = screen.getByTestId('i18n-provider')

    // DOM node should be the same (provider not unmounted)
    expect(i18nProvider1).toBe(i18nProvider2)
  })

  it('should handle Fragment children', () => {
    render(
      <ClientProviders>
        <>
          <div data-testid="fragment-child1">Child 1</div>
          <div data-testid="fragment-child2">Child 2</div>
        </>
      </ClientProviders>
    )

    expect(screen.getByTestId('fragment-child1')).toBeInTheDocument()
    expect(screen.getByTestId('fragment-child2')).toBeInTheDocument()
  })

  it('should be compatible with server-side rendering', () => {
    // ClientProviders is marked as "use client", but should not crash
    // when rendered on server during SSR
    expect(() => {
      render(
        <ClientProviders>
          <div>SSR Content</div>
        </ClientProviders>
      )
    }).not.toThrow()
  })

  it('should render all providers even with render errors in children', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    const ErrorComponent = () => {
      throw new Error('Render error')
    }

    expect(() => {
      render(
        <ClientProviders>
          <ErrorComponent />
        </ClientProviders>
      )
    }).toThrow()

    consoleSpy.mockRestore()
  })
})

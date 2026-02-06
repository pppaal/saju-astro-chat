'use client'

/**
 * Unified Error Boundary
 * Consolidates duplicate error boundary implementations
 *
 * Previously duplicated in:
 * - src/components/ErrorBoundary.tsx
 * - src/components/ui/ErrorBoundary.tsx
 */

import Link from 'next/link'
import React, { Component, ErrorInfo, ReactNode } from 'react'
import { logger } from '@/lib/logger'
import styles from './ErrorBoundary.module.css'

// ============ Types ============

export interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode
  /** Custom fallback UI */
  fallback?: ReactNode
  /** Error callback */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Variant for different UI styles */
  variant?: 'default' | 'card' | 'inline' | 'chat'
  /** Whether to show error details (default: dev only) */
  showDetails?: boolean
  /** Custom reset callback */
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

// ============ Main Component ============

/**
 * Unified Error Boundary Component
 *
 * @example
 * // Basic usage
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @example
 * // With custom fallback
 * <ErrorBoundary fallback={<CustomError />}>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @example
 * // Chat variant
 * <ErrorBoundary variant="chat" onReset={handleReset}>
 *   <ChatComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    logger.error('[ErrorBoundary] Caught an error:', { error, errorInfo })

    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    this.props.onReset?.()
  }

  handleRefresh = () => {
    window.location.reload()
  }

  render() {
    const {
      hasError,
      error,
    } = this.state

    const {
      children,
      fallback,
      variant = 'default',
      showDetails = process.env.NODE_ENV === 'development',
    } = this.props

    if (!hasError) {
      return children
    }

    // Custom fallback
    if (fallback) {
      return fallback
    }

    // Variant-specific rendering
    switch (variant) {
      case 'chat':
        return <ChatErrorFallback error={error} reset={this.handleReset} />
      case 'inline':
        return <InlineErrorFallback error={error} reset={this.handleReset} />
      case 'card':
        return (
          <CardErrorFallback
            error={error}
            reset={this.handleReset}
            showDetails={showDetails}
          />
        )
      default:
        return (
          <DefaultErrorFallback
            error={error}
            reset={this.handleReset}
            refresh={this.handleRefresh}
            showDetails={showDetails}
          />
        )
    }
  }
}

// ============ Fallback Components ============

interface FallbackProps {
  error: Error | null
  reset: () => void
  refresh?: () => void
  showDetails?: boolean
}

/**
 * Default error fallback with full details
 */
function DefaultErrorFallback({ error, reset, refresh, showDetails }: FallbackProps) {
  return (
    <div className={styles.container} role="alert" aria-live="assertive">
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <span className={styles.icon} role="img" aria-label="error">
            ⚠️
          </span>
        </div>

        <h2 className={styles.title}>Something went wrong</h2>
        <p className={styles.message}>
          {error?.message || 'An unexpected error occurred'}
        </p>

        <div className={styles.actions}>
          <button onClick={reset} className={styles.primaryButton} type="button">
            Try Again
          </button>
          {refresh && (
            <button onClick={refresh} className={styles.secondaryButton} type="button">
              Refresh Page
            </button>
          )}
          <Link href="/" className={styles.linkButton}>
            Go Home
          </Link>
        </div>

        {showDetails && error && (
          <details className={styles.details}>
            <summary className={styles.detailsSummary}>Error Details</summary>
            <pre className={styles.errorStack}>
              {error.stack || error.toString()}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

/**
 * Card-style error fallback
 */
function CardErrorFallback({ error, reset, showDetails }: FallbackProps) {
  return (
    <div className={styles.cardContainer} role="alert">
      <div className={styles.errorCard}>
        <span className={styles.cardIcon}>⚠️</span>
        <h3 className={styles.cardTitle}>Oops! Something went wrong</h3>
        <p className={styles.cardMessage}>
          {error?.message || 'An unexpected error occurred'}
        </p>
        <button onClick={reset} className={styles.cardButton} type="button">
          Try Again
        </button>
        {showDetails && error && (
          <details className={styles.cardDetails}>
            <summary>Details</summary>
            <pre>{error.toString()}</pre>
          </details>
        )}
      </div>
    </div>
  )
}

/**
 * Inline error fallback (minimal)
 */
function InlineErrorFallback({ error, reset }: FallbackProps) {
  return (
    <div className={styles.inlineContainer} role="alert">
      <span className={styles.inlineIcon}>⚠️</span>
      <span className={styles.inlineMessage}>
        {error?.message || 'Error loading content'}
      </span>
      <button onClick={reset} className={styles.inlineButton} type="button">
        Retry
      </button>
    </div>
  )
}

/**
 * Chat-specific error fallback
 */
function ChatErrorFallback({ error: _error, reset }: FallbackProps) {
  return (
    <div className={styles.chatContainer} role="alert" aria-live="assertive">
      <div className={styles.chatIcon} aria-hidden="true">
        💫
      </div>
      <h2 className={styles.chatTitle}>Chat Connection Lost</h2>
      <p className={styles.chatMessage}>
        We encountered an issue with the chat. Please try refreshing or starting
        a new conversation.
      </p>
      <div className={styles.chatActions}>
        <button onClick={reset} className={styles.chatPrimaryButton} type="button">
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          className={styles.chatSecondaryButton}
          type="button"
        >
          Refresh Page
        </button>
      </div>
    </div>
  )
}

// ============ Exports ============

export default ErrorBoundary

// Re-export specialized fallbacks for direct use
export { ChatErrorFallback, CardErrorFallback, InlineErrorFallback, DefaultErrorFallback }

// HOC for wrapping components
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }
}

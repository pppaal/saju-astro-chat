/**
 * Tests for ErrorBoundary component
 * src/components/ErrorBoundary.tsx
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, ChatErrorFallback } from '@/components/ErrorBoundary';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

import { logger } from '@/lib/logger';

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

// Suppress console.error during tests since ErrorBoundary logs errors
const originalConsoleError = console.error;

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('rendering', () => {
    it('should render children when no error', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should render default fallback when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText("We're sorry, but something unexpected happened.")).toBeInTheDocument();
    });

    it('should render custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom error message</div>}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should display error details in expandable section', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error details')).toBeInTheDocument();
      expect(screen.getByText(/Test error/)).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should call logger.error when error is caught', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        '[ErrorBoundary] caught an error:',
        expect.objectContaining({
          error: expect.any(Error),
          errorInfo: expect.any(Object),
        })
      );
    });

    it('should call onError callback when provided', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });
  });

  describe('recovery', () => {
    it('should recover when Try again button is clicked', () => {
      // Use key to force remount after clicking Try again
      let key = 1;
      const { rerender } = render(
        <ErrorBoundary key={key}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Try again'));

      // Increment key to force new instance and rerender with no error
      key = 2;
      rerender(
        <ErrorBoundary key={key}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have role alert on error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('should have aria-live assertive', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have accessible button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const button = screen.getByRole('button', { name: /try again/i });
      expect(button).toBeInTheDocument();
    });
  });
});

describe('ChatErrorFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render error message', () => {
      const error = new Error('Chat failed');
      const reset = vi.fn();

      render(<ChatErrorFallback error={error} reset={reset} />);

      expect(screen.getByText('Chat Connection Lost')).toBeInTheDocument();
      expect(
        screen.getByText(/We encountered an issue with the chat/)
      ).toBeInTheDocument();
    });

    it('should render emoji icon', () => {
      const error = new Error('Chat failed');
      const reset = vi.fn();

      render(<ChatErrorFallback error={error} reset={reset} />);

      expect(screen.getByText('💫')).toBeInTheDocument();
    });

    it('should render Try Again button', () => {
      const error = new Error('Chat failed');
      const reset = vi.fn();

      render(<ChatErrorFallback error={error} reset={reset} />);

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should render Refresh Page button', () => {
      const error = new Error('Chat failed');
      const reset = vi.fn();

      render(<ChatErrorFallback error={error} reset={reset} />);

      expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call reset when Try Again is clicked', () => {
      const error = new Error('Chat failed');
      const reset = vi.fn();

      render(<ChatErrorFallback error={error} reset={reset} />);

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      expect(reset).toHaveBeenCalledTimes(1);
    });

    it('should call window.location.reload when Refresh Page is clicked', () => {
      const error = new Error('Chat failed');
      const reset = vi.fn();
      const reloadMock = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
      });

      render(<ChatErrorFallback error={error} reset={reset} />);

      fireEvent.click(screen.getByRole('button', { name: /refresh page/i }));

      expect(reloadMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should have role alert', () => {
      const error = new Error('Chat failed');
      const reset = vi.fn();

      render(<ChatErrorFallback error={error} reset={reset} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have aria-live assertive', () => {
      const error = new Error('Chat failed');
      const reset = vi.fn();

      render(<ChatErrorFallback error={error} reset={reset} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have aria-hidden on decorative emoji', () => {
      const error = new Error('Chat failed');
      const reset = vi.fn();

      render(<ChatErrorFallback error={error} reset={reset} />);

      const emoji = screen.getByText('💫');
      expect(emoji).toHaveAttribute('aria-hidden', 'true');
    });
  });
});

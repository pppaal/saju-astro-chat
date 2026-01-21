/**
 * Accessibility Tests for ErrorBoundary Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { axe } from './axe-helper';
import React from 'react';

// Mock logger - must be before imports that use it
vi.mock('@/lib/logger', () => {
  return {
    logger: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
  };
});

import { ErrorBoundary, ChatErrorFallback } from '@/components/ErrorBoundary';

// Component that throws an error
function ThrowError(): never {
  throw new Error('Test error');
}

describe('Accessibility: ErrorBoundary', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    // Suppress console.error for error boundary tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Error state', () => {
    it('should have no accessibility violations in error state', async () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('should have role="alert"', () => {
      const { getByRole } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByRole('alert')).toBeInTheDocument();
    });

    it('should have aria-live="assertive"', () => {
      const { getByRole } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have accessible retry button', () => {
      const { getByRole } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const retryButton = getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Normal state', () => {
    it('should render children without violations', async () => {
      const { container } = render(
        <ErrorBoundary>
          <div>Normal content</div>
        </ErrorBoundary>
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });
  });
});

describe('Accessibility: ChatErrorFallback', () => {
  beforeEach(() => {
    cleanup();
  });

  it('should have no accessibility violations', async () => {
    const mockReset = vi.fn();
    const { container } = render(
      <ChatErrorFallback error={new Error('Test')} reset={mockReset} />
    );

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('should have role="alert"', () => {
    const mockReset = vi.fn();
    const { getByRole } = render(
      <ChatErrorFallback error={new Error('Test')} reset={mockReset} />
    );

    expect(getByRole('alert')).toBeInTheDocument();
  });

  it('should have two accessible action buttons', () => {
    const mockReset = vi.fn();
    const { getByRole } = render(
      <ChatErrorFallback error={new Error('Test')} reset={mockReset} />
    );

    expect(getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
  });
});

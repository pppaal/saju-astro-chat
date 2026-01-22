'use client';

import { ReactNode } from 'react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

/**
 * Client-side ErrorBoundary wrapper for Next.js 15 App Router
 *
 * This wrapper allows ErrorBoundary to be used in Server Components (like layout.tsx)
 * by wrapping it in a Client Component.
 */
export function ErrorBoundaryProvider({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

export default ErrorBoundaryProvider;

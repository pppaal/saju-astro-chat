"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the whole app
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("[ErrorBoundary] caught an error:", { error, errorInfo });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="p-8 m-4 rounded-lg bg-red-50 border border-red-200 text-red-700"
          role="alert"
          aria-live="assertive"
        >
          <h2 className="mt-0 text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="mb-4">We&apos;re sorry, but something unexpected happened.</p>
          <details className="mt-4 cursor-pointer">
            <summary className="text-red-600 hover:text-red-800 transition-colors">
              Error details
            </summary>
            <pre className="mt-2 p-4 bg-white rounded text-sm overflow-auto text-red-600">
              {this.state.error?.toString()}
            </pre>
          </details>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-red-600 text-white border-none rounded cursor-pointer
              hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
              transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Chat Error Boundary - Specialized fallback for chat components
 */
export function ChatErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center px-4 py-12 text-center min-h-[400px]"
      role="alert"
      aria-live="assertive"
    >
      <div className="text-6xl mb-4" aria-hidden="true">💫</div>
      <h2 className="mb-2 text-2xl font-semibold">Chat Connection Lost</h2>
      <p className="text-gray-500 mb-8 max-w-[400px]">
        We encountered an issue with the chat. Please try refreshing or starting a new conversation.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="px-6 py-3 bg-violet-500 text-white border-none rounded-lg cursor-pointer
            text-base font-medium hover:bg-violet-600
            focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2
            transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-gray-200 text-gray-700 border-none rounded-lg cursor-pointer
            text-base font-medium hover:bg-gray-300
            focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
            transition-colors"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

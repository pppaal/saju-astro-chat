"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

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
    // Log error to console
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // You can also log to an error reporting service here
    // e.g., Sentry.captureException(error);
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI or default error message
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: "2rem",
            margin: "1rem",
            borderRadius: "8px",
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            color: "#c00",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Something went wrong</h2>
          <p>We&apos;re sorry, but something unexpected happened.</p>
          <details style={{ marginTop: "1rem", cursor: "pointer" }}>
            <summary>Error details</summary>
            <pre
              style={{
                marginTop: "0.5rem",
                padding: "1rem",
                backgroundColor: "#fff",
                borderRadius: "4px",
                overflow: "auto",
                fontSize: "0.875rem",
              }}
            >
              {this.state.error?.toString()}
            </pre>
          </details>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              backgroundColor: "#c00",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
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
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1rem",
        textAlign: "center",
        minHeight: "400px",
      }}
    >
      <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>💫</div>
      <h2 style={{ marginBottom: "0.5rem", fontSize: "1.5rem", fontWeight: 600 }}>
        Chat Connection Lost
      </h2>
      <p style={{ color: "#666", marginBottom: "2rem", maxWidth: "400px" }}>
        We encountered an issue with the chat. Please try refreshing or starting a new conversation.
      </p>
      <div style={{ display: "flex", gap: "1rem" }}>
        <button
          onClick={reset}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#8b5cf6",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: 500,
          }}
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#e5e7eb",
            color: "#374151",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: 500,
          }}
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

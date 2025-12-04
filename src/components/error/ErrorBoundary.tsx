"use client";

import React, { Component, ReactNode } from "react";
import styles from "./ErrorBoundary.module.css";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={styles.errorContainer} role="alert" aria-live="assertive">
          <div className={styles.errorCard}>
            <div className={styles.errorIcon}>⚠️</div>
            <h2 className={styles.errorTitle}>Oops! Something went wrong</h2>
            <p className={styles.errorMessage}>
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <div className={styles.errorActions}>
              <button
                className={styles.primaryButton}
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
              <button
                className={styles.secondaryButton}
                onClick={() => (window.location.href = "/")}
              >
                Go Home
              </button>
            </div>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className={styles.errorDetails}>
                <summary>Error Details</summary>
                <pre>{this.state.error.stack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Simpler inline error fallback component
export function ErrorFallback({
  error,
  resetError,
}: {
  error: Error;
  resetError?: () => void;
}) {
  return (
    <div className={styles.inlineError} role="alert">
      <span className={styles.inlineErrorIcon}>⚠️</span>
      <span className={styles.inlineErrorText}>{error.message}</span>
      {resetError && (
        <button className={styles.inlineErrorButton} onClick={resetError}>
          Retry
        </button>
      )}
    </div>
  );
}

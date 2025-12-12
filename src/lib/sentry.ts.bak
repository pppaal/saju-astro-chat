// Sentry Error Tracking
// This file provides error tracking functionality
// To use Sentry, install: npm install @sentry/nextjs
// Then run: npx @sentry/wizard@latest -i nextjs

// Example Sentry configuration (uncomment after installing @sentry/nextjs)

/*
import * as Sentry from "@sentry/nextjs";

export function initSentry() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Performance Monitoring
      tracesSampleRate: 1.0, // Capture 100% of transactions for performance monitoring

      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

      // Environment
      environment: process.env.NODE_ENV,

      // Filter out errors we don't care about
      beforeSend(event, hint) {
        // Don't send errors from localhost in development
        if (process.env.NODE_ENV === 'development') {
          return null;
        }

        // Filter out known browser extension errors
        const error = hint.originalException;
        if (
          error &&
          typeof error === 'object' &&
          'message' in error &&
          typeof error.message === 'string' &&
          (error.message.includes('chrome-extension') ||
           error.message.includes('moz-extension'))
        ) {
          return null;
        }

        return event;
      },

      integrations: [
        new Sentry.BrowserTracing({
          tracePropagationTargets: ["localhost", /^https:\/\/yoursite\.com\/api/],
        }),
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
    });
  }
}

// Helper functions for error tracking
export const captureError = (error: Error, context?: Record<string, any>) => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    console.error('Error:', error, context);
  }
};

export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  } else {
    console[level === 'error' ? 'error' : 'log'](message);
  }
};

export const setUser = (user: { id: string; email?: string; username?: string }) => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setUser(user);
  }
};

export const clearUser = () => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setUser(null);
  }
};
*/

// Fallback error tracking (logs to console when Sentry is not configured)
export const captureError = (error: Error, context?: Record<string, any>) => {
  console.error("Error:", error, context);
};

export const captureMessage = (
  message: string,
  level: "info" | "warning" | "error" = "info"
) => {
  console[level === "error" ? "error" : "log"](message);
};

export const setUser = (user: {
  id: string;
  email?: string;
  username?: string;
}) => {
  console.log("User set:", user);
};

export const clearUser = () => {
  console.log("User cleared");
};

// Installation instructions
console.info(`
📊 Sentry Setup Instructions:
1. Install Sentry: npm install @sentry/nextjs
2. Run setup wizard: npx @sentry/wizard@latest -i nextjs
3. Add NEXT_PUBLIC_SENTRY_DSN to .env.local
4. Uncomment the Sentry code in src/lib/sentry.ts
`);

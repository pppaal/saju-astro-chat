/**
 * Web Vitals Reporter
 *
 * Reports Core Web Vitals to analytics
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay)
 * - CLS (Cumulative Layout Shift)
 * - FCP (First Contentful Paint)
 * - TTFB (Time to First Byte)
 * - INP (Interaction to Next Paint)
 */

import { Metric } from 'web-vitals';
import { logger } from '@/lib/logger';

// Thresholds for Core Web Vitals (Google's recommended values)
const VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
} as const;

type VitalName = keyof typeof VITALS_THRESHOLDS;

/**
 * Get rating for a metric value
 */
function getRating(name: VitalName, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = VITALS_THRESHOLDS[name];
  if (value <= threshold.good) {
    return 'good';
  }
  if (value <= threshold.poor) {
    return 'needs-improvement';
  }
  return 'poor';
}

/**
 * Report Web Vital to analytics
 */
export function reportWebVitals(metric: Metric) {
  const { name, value, rating, id, navigationType } = metric;

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    const vitalRating = name in VITALS_THRESHOLDS
      ? getRating(name as VitalName, value)
      : rating;

    console.log(`[Web Vitals] ${name}:`, {
      value: Math.round(value),
      rating: vitalRating,
      id,
      navigationType,
    });
  }

  // Send to analytics in production
  if (process.env.NODE_ENV === 'production') {
    try {
      // Send to Google Analytics
      if (typeof window !== 'undefined' && 'gtag' in window) {
        (window as any).gtag('event', name, {
          event_category: 'Web Vitals',
          event_label: id,
          value: Math.round(value),
          metric_rating: rating,
          navigation_type: navigationType,
          non_interaction: true,
        });
      }

      // Send to Vercel Analytics
      if (typeof window !== 'undefined' && 'va' in window) {
        (window as any).va('track', 'Web Vitals', {
          metric: name,
          value: Math.round(value),
          rating,
          id,
        });
      }

      // Log warnings for poor vitals
      if (rating === 'poor') {
        logger.warn(`Poor Web Vital: ${name}`, {
          value: Math.round(value),
          id,
          navigationType,
        });
      }
    } catch (error) {
      logger.error('Failed to report web vitals', error);
    }
  }
}

/**
 * Initialize Web Vitals tracking
 */
export function initWebVitals() {
  if (typeof window === 'undefined') {
    return;
  }

  // Dynamically import web-vitals to avoid SSR issues
  import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB, onINP }) => {
    onCLS(reportWebVitals);
    onFID(reportWebVitals);
    onFCP(reportWebVitals);
    onLCP(reportWebVitals);
    onTTFB(reportWebVitals);
    onINP(reportWebVitals);
  }).catch((error) => {
    logger.error('Failed to initialize web vitals', error);
  });
}

/**
 * Performance observer for custom metrics
 */
export class PerformanceMonitor {
  private static marks = new Map<string, number>();

  /**
   * Mark the start of a performance measurement
   */
  static mark(name: string) {
    if (typeof performance === 'undefined') {
      return;
    }

    const markName = `${name}-start`;
    performance.mark(markName);
    this.marks.set(name, performance.now());
  }

  /**
   * Measure and report the duration
   */
  static measure(name: string, reportToAnalytics = true) {
    if (typeof performance === 'undefined') {
      return null;
    }

    const startMark = `${name}-start`;
    const endMark = `${name}-end`;

    try {
      performance.mark(endMark);
      const measure = performance.measure(name, startMark, endMark);
      const duration = Math.round(measure.duration);

      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${name}: ${duration}ms`);
      }

      // Report to analytics
      if (reportToAnalytics && process.env.NODE_ENV === 'production') {
        if (typeof window !== 'undefined' && 'gtag' in window) {
          (window as any).gtag('event', 'timing_complete', {
            name,
            value: duration,
            event_category: 'Performance',
          });
        }
      }

      // Cleanup
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(name);
      this.marks.delete(name);

      return duration;
    } catch (error) {
      logger.error(`Failed to measure performance for ${name}`, error);
      return null;
    }
  }

  /**
   * Get current duration without ending the measurement
   */
  static getDuration(name: string): number | null {
    const startTime = this.marks.get(name);
    if (!startTime || typeof performance === 'undefined') {
      return null;
    }

    return Math.round(performance.now() - startTime);
  }

  /**
   * Report resource timing
   */
  static reportResourceTiming() {
    if (typeof performance === 'undefined' || !performance.getEntriesByType) {
      return;
    }

    const resources = performance.getEntriesByType('resource');
    const slowResources = resources.filter((r: any) => r.duration > 1000);

    if (slowResources.length > 0) {
      logger.warn('Slow resource loading detected', {
        count: slowResources.length,
        resources: slowResources.map((r: any) => ({
          name: r.name,
          duration: Math.round(r.duration),
          size: r.transferSize,
        })),
      });
    }
  }
}

// Export for use in _app.tsx
export default reportWebVitals;

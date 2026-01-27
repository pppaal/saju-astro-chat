'use client';

/**
 * Web Vitals Reporter Component
 *
 * Automatically reports Core Web Vitals to analytics
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay)
 * - CLS (Cumulative Layout Shift)
 * - FCP (First Contentful Paint)
 * - TTFB (Time to First Byte)
 * - INP (Interaction to Next Paint)
 */

import { useEffect } from 'react';
import { useReportWebVitals } from 'next/web-vitals';
import { reportWebVitals } from '@/lib/performance/web-vitals-reporter';

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    reportWebVitals(metric);
  });

  return null;
}

export default WebVitalsReporter;

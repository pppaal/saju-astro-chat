/**
 * Accessibility Testing Setup
 * Uses axe-core for automated accessibility violation detection
 */

// Re-export axe helper for convenience
export { axe, configureAxe, formatViolations } from './axe-helper';

// Common axe options for different test scenarios
export const axeOptions = {
  // For component tests - focus on component-level issues
  component: {
    rules: {
      'region': { enabled: false },
      'landmark-one-main': { enabled: false },
      'page-has-heading-one': { enabled: false },
    },
  },
  // For page tests - full page accessibility
  page: {
    rules: {
      'region': { enabled: true },
      'landmark-one-main': { enabled: true },
      'page-has-heading-one': { enabled: true },
    },
  },
  // Strict mode - all rules enabled
  strict: {
    rules: {},
  },
};

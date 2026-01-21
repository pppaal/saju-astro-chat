/**
 * Axe-core helper for accessibility testing
 */

import axeCore, { AxeResults, RunOptions } from 'axe-core';

// Default axe options - disable rules not relevant for component testing
const defaultOptions: RunOptions = {
  rules: {
    region: { enabled: false },
    'landmark-one-main': { enabled: false },
    'page-has-heading-one': { enabled: false },
  },
};

/**
 * Configure axe with custom options
 */
export function configureAxe(options: RunOptions = {}): RunOptions {
  return {
    ...defaultOptions,
    ...options,
    rules: {
      ...defaultOptions.rules,
      ...options.rules,
    },
  };
}

/**
 * Run axe accessibility checks on a container element
 */
export async function axe(
  container: Element,
  options: RunOptions = {}
): Promise<AxeResults> {
  const mergedOptions = configureAxe(options);
  return axeCore.run(container, mergedOptions);
}

/**
 * Format violations for better error messages
 */
export function formatViolations(violations: AxeResults['violations']): string {
  if (violations.length === 0) {
    return 'No accessibility violations found';
  }

  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => `  - ${node.html}\n    ${node.failureSummary}`)
        .join('\n');
      return `${violation.id}: ${violation.description}\n${nodes}`;
    })
    .join('\n\n');
}

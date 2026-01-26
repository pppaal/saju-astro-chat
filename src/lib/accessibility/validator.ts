/**
 * Accessibility Validation Utilities
 *
 * Tools for ensuring WCAG compliance and accessibility best practices
 */

// ============ Color Contrast Checker ============

/**
 * Calculate relative luminance (WCAG formula)
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const val = c / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Parse hex color to RGB
 * Supports both #RRGGBB and RRGGBB formats
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace(/^#/, '');
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate contrast ratio between two colors
 *
 * @param color1 - Hex color (e.g., '#ffffff')
 * @param color2 - Hex color (e.g., '#000000')
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    throw new Error('Invalid hex color format');
  }

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color contrast meets WCAG standards
 *
 * @param foreground - Foreground hex color
 * @param background - Background hex color
 * @param level - 'AA' or 'AAA'
 * @param size - 'normal' or 'large' (large is >= 18pt or >= 14pt bold)
 * @returns Object with pass/fail for each standard
 */
export function checkContrast(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  size: 'normal' | 'large' = 'normal'
): {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  minRequired: number;
} {
  const ratio = getContrastRatio(foreground, background);

  // WCAG 2.1 contrast requirements
  const requirements = {
    AA: size === 'large' ? 3 : 4.5,
    AAA: size === 'large' ? 4.5 : 7,
  };

  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= requirements.AA,
    passesAAA: ratio >= requirements.AAA,
    minRequired: requirements[level],
  };
}

// ============ ARIA Validation ============

/**
 * Valid ARIA roles
 */
const VALID_ARIA_ROLES = new Set([
  'alert',
  'alertdialog',
  'application',
  'article',
  'banner',
  'button',
  'cell',
  'checkbox',
  'columnheader',
  'combobox',
  'complementary',
  'contentinfo',
  'definition',
  'dialog',
  'directory',
  'document',
  'feed',
  'figure',
  'form',
  'grid',
  'gridcell',
  'group',
  'heading',
  'img',
  'link',
  'list',
  'listbox',
  'listitem',
  'log',
  'main',
  'marquee',
  'math',
  'menu',
  'menubar',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'navigation',
  'none',
  'note',
  'option',
  'presentation',
  'progressbar',
  'radio',
  'radiogroup',
  'region',
  'row',
  'rowgroup',
  'rowheader',
  'scrollbar',
  'search',
  'searchbox',
  'separator',
  'slider',
  'spinbutton',
  'status',
  'switch',
  'tab',
  'table',
  'tablist',
  'tabpanel',
  'term',
  'textbox',
  'timer',
  'toolbar',
  'tooltip',
  'tree',
  'treegrid',
  'treeitem',
]);

/**
 * Check if ARIA role is valid
 */
export function isValidAriaRole(role: string): boolean {
  return VALID_ARIA_ROLES.has(role);
}

/**
 * Required ARIA attributes for specific roles
 */
const REQUIRED_ARIA_ATTRS: Record<string, string[]> = {
  checkbox: ['aria-checked'],
  combobox: ['aria-expanded', 'aria-controls'],
  radio: ['aria-checked'],
  scrollbar: ['aria-controls', 'aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
  slider: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
  spinbutton: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
  switch: ['aria-checked'],
  tab: ['aria-selected'],
};

/**
 * Validate ARIA attributes for a role
 */
export function validateAriaAttributes(
  role: string,
  attributes: Record<string, string>
): {
  valid: boolean;
  missing: string[];
  invalid: string[];
} {
  const required = REQUIRED_ARIA_ATTRS[role] || [];
  const provided = Object.keys(attributes);

  const missing = required.filter((attr) => !provided.includes(attr));
  const invalid = provided.filter(
    (attr) => !attr.startsWith('aria-') && !attr.startsWith('role')
  );

  return {
    valid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
  };
}

// ============ Alt Text Validation ============

/**
 * Check if alt text is meaningful
 */
export function isValidAltText(
  alt: string | undefined
): { valid: true } | { valid: false; reason: string } {
  if (alt === undefined) {
    return { valid: false, reason: 'Alt attribute is missing' };
  }

  if (alt === '') {
    // Empty alt is valid for decorative images
    return { valid: true };
  }

  // Check for useless alt text
  const uselessPatterns = [
    /^image$/i,
    /^img$/i,
    /^picture$/i,
    /^photo$/i,
    /^graphic$/i,
    /^icon$/i,
    /\.(jpg|jpeg|png|gif|svg|webp)$/i,
  ];

  if (uselessPatterns.some((pattern) => pattern.test(alt))) {
    return { valid: false, reason: 'Alt text is not descriptive' };
  }

  // Alt text should not be too long
  if (alt.length > 125) {
    return { valid: false, reason: 'Alt text is too long (max 125 characters)' };
  }

  return { valid: true };
}

// ============ Heading Structure Validation ============

export interface HeadingInfo {
  level: number;
  text: string;
  id?: string;
}

/**
 * Validate heading structure (no skipped levels)
 */
export function validateHeadingStructure(headings: HeadingInfo[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  let previousLevel = 0;

  headings.forEach((heading, index) => {
    // Check for skipped levels
    if (heading.level > previousLevel + 1 && previousLevel !== 0) {
      errors.push(
        `Heading ${index + 1} (h${heading.level}) skips level h${previousLevel + 1}`
      );
    }

    // Check for empty heading
    if (!heading.text.trim()) {
      errors.push(`Heading ${index + 1} (h${heading.level}) is empty`);
    }

    previousLevel = heading.level;
  });

  // Check if document starts with h1
  if (headings.length > 0 && headings[0].level !== 1) {
    errors.push('Document should start with an h1 heading');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============ Focus Management ============

/**
 * Check if element is keyboard accessible
 */
export function isKeyboardAccessible(element: {
  tabIndex?: number;
  role?: string;
  disabled?: boolean;
}): boolean {
  if (element.disabled) {return false;}

  const interactiveRoles = new Set([
    'button',
    'link',
    'textbox',
    'checkbox',
    'radio',
    'combobox',
    'listbox',
    'menu',
    'menuitem',
    'tab',
  ]);

  // Has explicit tabindex
  if (element.tabIndex !== undefined && element.tabIndex >= 0) {
    return true;
  }

  // Has interactive role
  if (element.role && interactiveRoles.has(element.role)) {
    return true;
  }

  return false;
}

// ============ Touch Target Size ============

/**
 * Check if touch target meets minimum size (44x44px WCAG)
 */
export function isValidTouchTarget(width: number, height: number): {
  valid: boolean;
  recommendation: string;
} {
  const MIN_SIZE = 44;
  const valid = width >= MIN_SIZE && height >= MIN_SIZE;

  if (!valid) {
    return {
      valid: false,
      recommendation: `Touch target should be at least ${MIN_SIZE}x${MIN_SIZE}px. Current: ${width}x${height}px`,
    };
  }

  return { valid: true, recommendation: 'Touch target size is adequate' };
}

// ============ Comprehensive Accessibility Check ============

export interface AccessibilityReport {
  contrast: {
    checked: boolean;
    results: Array<{
      foreground: string;
      background: string;
      ratio: number;
      passes: boolean;
    }>;
  };
  aria: {
    validRoles: boolean;
    missingAttributes: string[];
  };
  altText: {
    checked: number;
    invalid: string[];
  };
  headings: {
    valid: boolean;
    errors: string[];
  };
  keyboard: {
    accessible: number;
    inaccessible: number;
  };
  touchTargets: {
    valid: number;
    invalid: number;
  };
  score: number;
}

/**
 * Generate accessibility report
 */
export function generateAccessibilityReport(checks: {
  colors?: Array<{ foreground: string; background: string }>;
  ariaElements?: Array<{ role: string; attributes: Record<string, string> }>;
  images?: Array<{ alt: string | undefined }>;
  headings?: HeadingInfo[];
  interactiveElements?: Array<{ tabIndex?: number; role?: string }>;
  touchTargets?: Array<{ width: number; height: number }>;
}): AccessibilityReport {
  const report: AccessibilityReport = {
    contrast: { checked: false, results: [] },
    aria: { validRoles: true, missingAttributes: [] },
    altText: { checked: 0, invalid: [] },
    headings: { valid: true, errors: [] },
    keyboard: { accessible: 0, inaccessible: 0 },
    touchTargets: { valid: 0, invalid: 0 },
    score: 100,
  };

  let totalChecks = 0;
  let failedChecks = 0;

  // Check contrast
  if (checks.colors) {
    report.contrast.checked = true;
    checks.colors.forEach((color) => {
      const result = checkContrast(color.foreground, color.background);
      report.contrast.results.push({
        ...color,
        ratio: result.ratio,
        passes: result.passesAA,
      });
      totalChecks++;
      if (!result.passesAA) {failedChecks++;}
    });
  }

  // Check ARIA
  if (checks.ariaElements) {
    checks.ariaElements.forEach((el) => {
      if (!isValidAriaRole(el.role)) {
        report.aria.validRoles = false;
        failedChecks++;
      }
      const validation = validateAriaAttributes(el.role, el.attributes);
      if (!validation.valid) {
        report.aria.missingAttributes.push(...validation.missing);
        failedChecks++;
      }
      totalChecks++;
    });
  }

  // Check alt text
  if (checks.images) {
    checks.images.forEach((img) => {
      report.altText.checked++;
      const validation = isValidAltText(img.alt);
      if (!validation.valid) {
        report.altText.invalid.push(validation.reason);
        failedChecks++;
      }
      totalChecks++;
    });
  }

  // Check headings
  if (checks.headings) {
    const validation = validateHeadingStructure(checks.headings);
    report.headings = validation;
    if (!validation.valid) {
      failedChecks += validation.errors.length;
      totalChecks += validation.errors.length;
    }
  }

  // Check keyboard accessibility
  if (checks.interactiveElements) {
    checks.interactiveElements.forEach((el) => {
      if (isKeyboardAccessible(el)) {
        report.keyboard.accessible++;
      } else {
        report.keyboard.inaccessible++;
        failedChecks++;
      }
      totalChecks++;
    });
  }

  // Check touch targets
  if (checks.touchTargets) {
    checks.touchTargets.forEach((target) => {
      const validation = isValidTouchTarget(target.width, target.height);
      if (validation.valid) {
        report.touchTargets.valid++;
      } else {
        report.touchTargets.invalid++;
        failedChecks++;
      }
      totalChecks++;
    });
  }

  // Calculate score
  report.score = totalChecks > 0 ? Math.round(((totalChecks - failedChecks) / totalChecks) * 100) : 100;

  return report;
}

// Export all utilities
export const Accessibility = {
  checkContrast,
  getContrastRatio,
  isValidAriaRole,
  validateAriaAttributes,
  isValidAltText,
  validateHeadingStructure,
  isKeyboardAccessible,
  isValidTouchTarget,
  generateAccessibilityReport,
};

export default Accessibility;

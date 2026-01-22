/**
 * Accessibility Validator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  getContrastRatio,
  checkContrast,
  isValidAriaRole,
  validateAriaAttributes,
  isValidAltText,
  validateHeadingStructure,
  isKeyboardAccessible,
  isValidTouchTarget,
  generateAccessibilityReport,
  type HeadingInfo,
  type AccessibilityReport,
} from '@/lib/accessibility/validator';

describe('Color Contrast', () => {
  describe('getContrastRatio', () => {
    it('should calculate correct contrast ratio for black and white', () => {
      const ratio = getContrastRatio('#000000', '#ffffff');
      expect(ratio).toBe(21);
    });

    it('should calculate correct contrast ratio for same colors', () => {
      const ratio = getContrastRatio('#ffffff', '#ffffff');
      expect(ratio).toBe(1);
    });

    it('should handle colors without # prefix', () => {
      const ratio = getContrastRatio('000000', 'ffffff');
      expect(ratio).toBe(21);
    });

    it('should throw error for invalid hex color', () => {
      expect(() => getContrastRatio('invalid', '#ffffff')).toThrow('Invalid hex color format');
    });
  });

  describe('checkContrast', () => {
    it('should pass AA for high contrast', () => {
      const result = checkContrast('#000000', '#ffffff', 'AA', 'normal');
      expect(result.passesAA).toBe(true);
      expect(result.passesAAA).toBe(true);
      expect(result.ratio).toBe(21);
    });

    it('should fail AA for low contrast', () => {
      const result = checkContrast('#888888', '#999999', 'AA', 'normal');
      expect(result.passesAA).toBe(false);
    });

    it('should have lower requirements for large text', () => {
      const result = checkContrast('#777777', '#ffffff', 'AA', 'large');
      expect(result.minRequired).toBe(3);
    });

    it('should have higher requirements for AAA normal text', () => {
      const result = checkContrast('#595959', '#ffffff', 'AAA', 'normal');
      expect(result.minRequired).toBe(7);
      expect(result.passesAAA).toBe(true);
    });
  });
});

describe('ARIA Validation', () => {
  describe('isValidAriaRole', () => {
    it('should validate correct ARIA roles', () => {
      expect(isValidAriaRole('button')).toBe(true);
      expect(isValidAriaRole('dialog')).toBe(true);
      expect(isValidAriaRole('navigation')).toBe(true);
    });

    it('should reject invalid ARIA roles', () => {
      expect(isValidAriaRole('invalid-role')).toBe(false);
      expect(isValidAriaRole('div')).toBe(false);
    });
  });

  describe('validateAriaAttributes', () => {
    it('should pass validation when all required attributes present', () => {
      const result = validateAriaAttributes('checkbox', {
        'aria-checked': 'true',
        'aria-label': 'Accept terms',
      });
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should detect missing required attributes', () => {
      const result = validateAriaAttributes('checkbox', {
        'aria-label': 'Accept terms',
      });
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('aria-checked');
    });

    it('should detect invalid attributes', () => {
      const result = validateAriaAttributes('button', {
        'data-test': 'value',
        'aria-label': 'Click me',
      });
      expect(result.valid).toBe(false);
      expect(result.invalid).toContain('data-test');
    });

    it('should pass for roles without required attributes', () => {
      const result = validateAriaAttributes('button', {
        'aria-label': 'Click me',
      });
      expect(result.valid).toBe(true);
    });
  });
});

describe('Alt Text Validation', () => {
  describe('isValidAltText', () => {
    it('should reject missing alt text', () => {
      const result = isValidAltText(undefined);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('missing');
    });

    it('should accept empty alt for decorative images', () => {
      const result = isValidAltText('');
      expect(result.valid).toBe(true);
    });

    it('should accept descriptive alt text', () => {
      const result = isValidAltText('Person holding a red balloon');
      expect(result.valid).toBe(true);
    });

    it('should reject useless alt text patterns', () => {
      const patterns = ['image', 'img', 'picture', 'photo', 'graphic', 'icon', 'logo.png'];
      patterns.forEach((pattern) => {
        const result = isValidAltText(pattern);
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('not descriptive');
      });
    });

    it('should reject alt text that is too long', () => {
      const longText = 'A'.repeat(126);
      const result = isValidAltText(longText);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('too long');
    });

    it('should accept alt text at max length', () => {
      const maxText = 'A'.repeat(125);
      const result = isValidAltText(maxText);
      expect(result.valid).toBe(true);
    });
  });
});

describe('Heading Structure Validation', () => {
  describe('validateHeadingStructure', () => {
    it('should pass for correct heading structure', () => {
      const headings: HeadingInfo[] = [
        { level: 1, text: 'Main Title' },
        { level: 2, text: 'Section 1' },
        { level: 3, text: 'Subsection 1.1' },
        { level: 2, text: 'Section 2' },
      ];
      const result = validateHeadingStructure(headings);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect skipped heading levels', () => {
      const headings: HeadingInfo[] = [
        { level: 1, text: 'Main Title' },
        { level: 3, text: 'Skipped h2' },
      ];
      const result = validateHeadingStructure(headings);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('skips level'))).toBe(true);
    });

    it('should detect empty headings', () => {
      const headings: HeadingInfo[] = [
        { level: 1, text: 'Main Title' },
        { level: 2, text: '   ' },
      ];
      const result = validateHeadingStructure(headings);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('empty'))).toBe(true);
    });

    it('should require document to start with h1', () => {
      const headings: HeadingInfo[] = [
        { level: 2, text: 'Section' },
        { level: 3, text: 'Subsection' },
      ];
      const result = validateHeadingStructure(headings);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('start with an h1'))).toBe(true);
    });

    it('should handle empty heading list', () => {
      const result = validateHeadingStructure([]);
      expect(result.valid).toBe(true);
    });
  });
});

describe('Keyboard Accessibility', () => {
  describe('isKeyboardAccessible', () => {
    it('should identify elements with positive tabindex', () => {
      expect(isKeyboardAccessible({ tabIndex: 0 })).toBe(true);
      expect(isKeyboardAccessible({ tabIndex: 1 })).toBe(true);
    });

    it('should identify interactive roles', () => {
      expect(isKeyboardAccessible({ role: 'button' })).toBe(true);
      expect(isKeyboardAccessible({ role: 'link' })).toBe(true);
      expect(isKeyboardAccessible({ role: 'checkbox' })).toBe(true);
    });

    it('should reject disabled elements', () => {
      expect(isKeyboardAccessible({ tabIndex: 0, disabled: true })).toBe(false);
      expect(isKeyboardAccessible({ role: 'button', disabled: true })).toBe(false);
    });

    it('should reject elements without accessibility features', () => {
      expect(isKeyboardAccessible({})).toBe(false);
      expect(isKeyboardAccessible({ tabIndex: -1 })).toBe(false);
      expect(isKeyboardAccessible({ role: 'presentation' })).toBe(false);
    });
  });
});

describe('Touch Target Size', () => {
  describe('isValidTouchTarget', () => {
    it('should pass for adequate touch targets', () => {
      const result = isValidTouchTarget(44, 44);
      expect(result.valid).toBe(true);
    });

    it('should pass for larger touch targets', () => {
      const result = isValidTouchTarget(48, 48);
      expect(result.valid).toBe(true);
    });

    it('should fail for small touch targets', () => {
      const result = isValidTouchTarget(32, 32);
      expect(result.valid).toBe(false);
      expect(result.recommendation).toContain('32x32');
    });

    it('should fail if only one dimension is too small', () => {
      expect(isValidTouchTarget(44, 32).valid).toBe(false);
      expect(isValidTouchTarget(32, 44).valid).toBe(false);
    });
  });
});

describe('Comprehensive Accessibility Report', () => {
  describe('generateAccessibilityReport', () => {
    it('should generate report with all passing checks', () => {
      const report = generateAccessibilityReport({
        colors: [{ foreground: '#000000', background: '#ffffff' }],
        ariaElements: [{ role: 'button', attributes: { 'aria-label': 'Click' } }],
        images: [{ alt: 'Descriptive text' }],
        headings: [
          { level: 1, text: 'Title' },
          { level: 2, text: 'Section' },
        ],
        interactiveElements: [{ tabIndex: 0 }],
        touchTargets: [{ width: 48, height: 48 }],
      });

      expect(report.score).toBe(100);
      expect(report.contrast.results[0].passes).toBe(true);
      expect(report.aria.validRoles).toBe(true);
      expect(report.altText.invalid).toHaveLength(0);
      expect(report.headings.valid).toBe(true);
      expect(report.keyboard.accessible).toBe(1);
      expect(report.keyboard.inaccessible).toBe(0);
      expect(report.touchTargets.valid).toBe(1);
    });

    it('should calculate correct score with failures', () => {
      const report = generateAccessibilityReport({
        colors: [
          { foreground: '#000000', background: '#ffffff' }, // Pass
          { foreground: '#888888', background: '#999999' }, // Fail
        ],
        images: [
          { alt: 'Good description' }, // Pass
          { alt: 'image' }, // Fail
        ],
      });

      expect(report.score).toBe(50); // 2 passes, 2 fails = 50%
      expect(report.contrast.results).toHaveLength(2);
      expect(report.altText.invalid).toHaveLength(1);
    });

    it('should handle empty checks gracefully', () => {
      const report = generateAccessibilityReport({});
      expect(report.score).toBe(100);
      expect(report.contrast.checked).toBe(false);
    });

    it('should detect ARIA issues', () => {
      const report = generateAccessibilityReport({
        ariaElements: [
          { role: 'invalid-role', attributes: {} },
          { role: 'checkbox', attributes: {} }, // Missing aria-checked
        ],
      });

      expect(report.aria.validRoles).toBe(false);
      expect(report.aria.missingAttributes).toContain('aria-checked');
      expect(report.score).toBeLessThan(100);
    });

    it('should track keyboard accessibility', () => {
      const report = generateAccessibilityReport({
        interactiveElements: [
          { tabIndex: 0 }, // Accessible
          { role: 'button' }, // Accessible
          {}, // Not accessible
          { disabled: true }, // Not accessible
        ],
      });

      expect(report.keyboard.accessible).toBe(2);
      expect(report.keyboard.inaccessible).toBe(2);
    });
  });
});

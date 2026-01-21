/**
 * Tests for src/lib/utils.ts
 * Tests the cn() utility function for merging Tailwind CSS classes
 */
import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn (className merger)', () => {
  describe('Basic functionality', () => {
    it('should return empty string for no arguments', () => {
      expect(cn()).toBe('');
    });

    it('should return single class as-is', () => {
      expect(cn('flex')).toBe('flex');
    });

    it('should merge multiple classes', () => {
      expect(cn('flex', 'items-center')).toBe('flex items-center');
    });

    it('should handle string classes', () => {
      expect(cn('p-4', 'm-2', 'bg-white')).toBe('p-4 m-2 bg-white');
    });
  });

  describe('Conditional classes (clsx behavior)', () => {
    it('should filter out falsy values', () => {
      expect(cn('flex', false, 'items-center')).toBe('flex items-center');
      expect(cn('flex', null, 'items-center')).toBe('flex items-center');
      expect(cn('flex', undefined, 'items-center')).toBe('flex items-center');
      expect(cn('flex', '', 'items-center')).toBe('flex items-center');
      expect(cn('flex', 0, 'items-center')).toBe('flex items-center');
    });

    it('should handle conditional objects', () => {
      expect(cn({ 'flex': true, 'p-4': false })).toBe('flex');
      // Note: tailwind-merge treats 'flex' and 'hidden' as conflicting display classes
      // so 'hidden' wins. Use non-conflicting classes for both-true test.
      expect(cn({ 'p-4': true, 'm-2': true })).toBe('p-4 m-2');
    });

    it('should handle conditional expressions', () => {
      const isActive = true;
      const isDisabled = false;
      expect(cn(
        'base-class',
        isActive && 'active-class',
        isDisabled && 'disabled-class'
      )).toBe('base-class active-class');
    });

    it('should handle arrays', () => {
      expect(cn(['flex', 'items-center'])).toBe('flex items-center');
      expect(cn(['flex'], ['items-center'])).toBe('flex items-center');
    });

    it('should handle nested arrays', () => {
      expect(cn(['flex', ['items-center', 'justify-center']])).toBe('flex items-center justify-center');
    });
  });

  describe('Tailwind merge behavior', () => {
    it('should merge conflicting padding classes', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2');
      expect(cn('px-4', 'px-2')).toBe('px-2');
      expect(cn('py-4', 'py-2')).toBe('py-2');
    });

    it('should merge conflicting margin classes', () => {
      expect(cn('m-4', 'm-2')).toBe('m-2');
      expect(cn('mx-4', 'mx-2')).toBe('mx-2');
      expect(cn('my-4', 'my-2')).toBe('my-2');
    });

    it('should merge conflicting background colors', () => {
      expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
      expect(cn('bg-white', 'bg-black')).toBe('bg-black');
    });

    it('should merge conflicting text colors', () => {
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
      expect(cn('text-white', 'text-black')).toBe('text-black');
    });

    it('should merge conflicting display classes', () => {
      expect(cn('flex', 'block')).toBe('block');
      expect(cn('hidden', 'flex')).toBe('flex');
    });

    it('should merge conflicting width/height classes', () => {
      expect(cn('w-4', 'w-8')).toBe('w-8');
      expect(cn('h-4', 'h-8')).toBe('h-8');
      expect(cn('w-full', 'w-1/2')).toBe('w-1/2');
    });

    it('should keep non-conflicting classes', () => {
      expect(cn('flex', 'p-4', 'bg-white', 'text-black'))
        .toBe('flex p-4 bg-white text-black');
    });

    it('should handle partial conflicts', () => {
      // px-4 should not conflict with py-2
      expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
      // mx-4 should not conflict with my-2
      expect(cn('mx-4', 'my-2')).toBe('mx-4 my-2');
    });
  });

  describe('Complex scenarios', () => {
    it('should handle mixed inputs', () => {
      expect(cn(
        'base-class',
        ['array-class'],
        { 'conditional-class': true },
        undefined,
        'final-class'
      )).toBe('base-class array-class conditional-class final-class');
    });

    it('should handle responsive classes', () => {
      expect(cn('sm:flex', 'md:block', 'lg:grid'))
        .toBe('sm:flex md:block lg:grid');
    });

    it('should handle hover/focus states', () => {
      expect(cn('hover:bg-blue-500', 'focus:ring-2'))
        .toBe('hover:bg-blue-500 focus:ring-2');
    });

    it('should merge responsive conflicting classes', () => {
      expect(cn('md:p-4', 'md:p-8')).toBe('md:p-8');
    });

    it('should handle common UI component patterns', () => {
      // Button pattern
      const buttonClasses = cn(
        'px-4 py-2 rounded-md font-medium',
        'bg-blue-500 text-white',
        'hover:bg-blue-600',
        'disabled:opacity-50',
        false && 'hidden'
      );
      expect(buttonClasses).toContain('px-4');
      expect(buttonClasses).toContain('py-2');
      expect(buttonClasses).toContain('rounded-md');
      expect(buttonClasses).not.toContain('hidden');
    });

    it('should handle card component patterns', () => {
      const cardClasses = cn(
        'p-4 rounded-lg shadow-md',
        'bg-white dark:bg-gray-800',
        { 'border border-gray-200': true }
      );
      expect(cardClasses).toContain('p-4');
      expect(cardClasses).toContain('rounded-lg');
      expect(cardClasses).toContain('border');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty strings', () => {
      expect(cn('', 'flex', '')).toBe('flex');
    });

    it('should handle whitespace-only strings', () => {
      expect(cn('  ', 'flex', '  ')).toBe('flex');
    });

    it('should handle many arguments', () => {
      const result = cn('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j');
      expect(result).toBe('a b c d e f g h i j');
    });

    it('should handle duplicate classes', () => {
      expect(cn('flex', 'flex', 'flex')).toBe('flex');
    });

    it('should preserve important modifier', () => {
      expect(cn('!p-4', 'p-2')).toContain('!p-4');
    });

    it('should handle arbitrary values', () => {
      expect(cn('p-[20px]', 'text-[#ff0000]')).toBe('p-[20px] text-[#ff0000]');
    });
  });

  describe('Real-world usage patterns', () => {
    it('should work with component props merging', () => {
      const defaultClasses = 'px-4 py-2 bg-blue-500';
      const propsClasses = 'bg-red-500 font-bold';

      // Props should override defaults
      const result = cn(defaultClasses, propsClasses);
      expect(result).toContain('px-4');
      expect(result).toContain('py-2');
      expect(result).toContain('bg-red-500');
      expect(result).toContain('font-bold');
      expect(result).not.toContain('bg-blue-500');
    });

    it('should work with variant selection', () => {
      const variants = {
        primary: 'bg-blue-500 text-white',
        secondary: 'bg-gray-500 text-white',
        danger: 'bg-red-500 text-white',
      };

      const variant = 'primary' as keyof typeof variants;
      const result = cn('px-4 py-2 rounded', variants[variant]);

      expect(result).toContain('px-4');
      expect(result).toContain('bg-blue-500');
    });

    it('should work with size selection', () => {
      const sizes = {
        sm: 'px-2 py-1 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
      };

      const size = 'lg' as keyof typeof sizes;
      const result = cn('rounded font-medium', sizes[size]);

      expect(result).toContain('px-6');
      expect(result).toContain('py-3');
      expect(result).toContain('text-lg');
    });
  });
});

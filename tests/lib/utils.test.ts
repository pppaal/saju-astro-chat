import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('utils', () => {
  describe('cn (className merge utility)', () => {
    it('should merge simple class names', () => {
      const result = cn('foo', 'bar');
      expect(result).toContain('foo');
      expect(result).toContain('bar');
    });

    it('should handle conditional classes', () => {
      const result = cn('base', true && 'active', false && 'hidden');
      expect(result).toContain('base');
      expect(result).toContain('active');
      expect(result).not.toContain('hidden');
    });

    it('should merge tailwind conflicting classes (last wins)', () => {
      const result = cn('p-4', 'p-8');
      expect(result).toBe('p-8');
    });

    it('should handle arrays of classes', () => {
      const result = cn(['foo', 'bar'], 'baz');
      expect(result).toContain('foo');
      expect(result).toContain('bar');
      expect(result).toContain('baz');
    });

    it('should handle objects with boolean values', () => {
      const result = cn({
        foo: true,
        bar: false,
        baz: true,
      });
      expect(result).toContain('foo');
      expect(result).not.toContain('bar');
      expect(result).toContain('baz');
    });

    it('should handle empty input', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle undefined and null', () => {
      const result = cn('foo', undefined, null, 'bar');
      expect(result).toContain('foo');
      expect(result).toContain('bar');
    });

    it('should handle duplicate classes', () => {
      const result = cn('foo', 'foo', 'bar');
      // cn may or may not deduplicate non-tailwind classes
      expect(result).toContain('foo');
      expect(result).toContain('bar');
    });

    it('should merge complex tailwind classes correctly', () => {
      // Test Tailwind merge functionality
      const result = cn('text-red-500', 'text-blue-500');
      expect(result).toBe('text-blue-500');
    });

    it('should handle spacing classes', () => {
      const result = cn('m-2', 'm-4');
      expect(result).toBe('m-4');
    });

    it('should handle multiple types of inputs', () => {
      const result = cn(
        'base',
        ['array-class-1', 'array-class-2'],
        { 'object-class': true, 'hidden-class': false },
        undefined,
        'final'
      );
      expect(result).toContain('base');
      expect(result).toContain('array-class-1');
      expect(result).toContain('array-class-2');
      expect(result).toContain('object-class');
      expect(result).not.toContain('hidden-class');
      expect(result).toContain('final');
    });

    it('should handle nested arrays', () => {
      const result = cn([['nested', 'classes'], 'top']);
      expect(result).toContain('nested');
      expect(result).toContain('classes');
      expect(result).toContain('top');
    });

    it('should preserve non-conflicting tailwind classes', () => {
      const result = cn('text-red-500', 'bg-blue-500', 'p-4');
      expect(result).toContain('text-red-500');
      expect(result).toContain('bg-blue-500');
      expect(result).toContain('p-4');
    });

    it('should handle responsive classes', () => {
      const result = cn('text-sm', 'md:text-lg', 'lg:text-xl');
      expect(result).toContain('text-sm');
      expect(result).toContain('md:text-lg');
      expect(result).toContain('lg:text-xl');
    });

    it('should resolve conflicting responsive classes', () => {
      const result = cn('md:p-2', 'md:p-4');
      expect(result).toBe('md:p-4');
    });

    it('should handle pseudo-classes', () => {
      const result = cn('hover:bg-blue-500', 'focus:bg-green-500');
      expect(result).toContain('hover:bg-blue-500');
      expect(result).toContain('focus:bg-green-500');
    });

    it('should handle dark mode classes', () => {
      const result = cn('bg-white', 'dark:bg-black');
      expect(result).toContain('bg-white');
      expect(result).toContain('dark:bg-black');
    });

    it('should handle arbitrary values', () => {
      const result = cn('top-[117px]', 'w-[calc(100%-2rem)]');
      expect(result).toContain('top-[117px]');
      expect(result).toContain('w-[calc(100%-2rem)]');
    });
  });
});

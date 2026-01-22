/**
 * Comprehensive tests for lib/utils.ts
 * Testing cn() function with all possible combinations
 */
import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('lib/utils - cn() comprehensive tests', () => {
  describe('Basic functionality', () => {
    it('should return empty string for no arguments', () => {
      expect(cn()).toBe('');
    });

    it('should return single class name', () => {
      expect(cn('foo')).toBe('foo');
    });

    it('should merge two class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should merge three class names', () => {
      expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz');
    });

    it('should handle empty strings', () => {
      expect(cn('', 'foo', '')).toBe('foo');
    });

    it('should handle null', () => {
      expect(cn(null, 'foo')).toBe('foo');
    });

    it('should handle undefined', () => {
      expect(cn(undefined, 'foo')).toBe('foo');
    });

    it('should handle false', () => {
      expect(cn(false, 'foo')).toBe('foo');
    });

    it('should handle true (ignored)', () => {
      expect(cn(true, 'foo')).toBe('foo');
    });
  });

  describe('Array inputs', () => {
    it('should handle array of classes', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('should handle nested arrays', () => {
      expect(cn(['foo', ['bar', 'baz']])).toBe('foo bar baz');
    });

    it('should handle empty arrays', () => {
      expect(cn([], 'foo')).toBe('foo');
    });

    it('should handle arrays with null/undefined', () => {
      expect(cn(['foo', null, 'bar', undefined])).toBe('foo bar');
    });
  });

  describe('Object inputs (conditional classes)', () => {
    it('should include class when condition is true', () => {
      expect(cn({ foo: true })).toBe('foo');
    });

    it('should exclude class when condition is false', () => {
      expect(cn({ foo: false })).toBe('');
    });

    it('should handle multiple conditions', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });

    it('should handle empty object', () => {
      expect(cn({}, 'foo')).toBe('foo');
    });
  });

  describe('Tailwind CSS deduplication', () => {
    it('should deduplicate same classes', () => {
      expect(cn('foo', 'foo')).toBe('foo');
    });

    it('should handle Tailwind class conflicts', () => {
      const result = cn('px-2', 'px-4');
      expect(result).toBe('px-4');
    });

    it('should merge responsive classes', () => {
      const result = cn('text-sm', 'md:text-lg');
      expect(result).toContain('text-sm');
      expect(result).toContain('md:text-lg');
    });

    it('should handle hover states', () => {
      const result = cn('hover:bg-blue-500', 'hover:text-white');
      expect(result).toContain('hover:bg-blue-500');
      expect(result).toContain('hover:text-white');
    });
  });

  describe('Complex combinations', () => {
    it('should handle mixed string and object', () => {
      expect(cn('foo', { bar: true, baz: false })).toBe('foo bar');
    });

    it('should handle mixed string and array', () => {
      expect(cn('foo', ['bar', 'baz'])).toBe('foo bar baz');
    });

    it('should handle mixed array and object', () => {
      expect(cn(['foo', 'bar'], { baz: true })).toBe('foo bar baz');
    });

    it('should handle all types together', () => {
      expect(cn('a', ['b', 'c'], { d: true, e: false }, 'f')).toBe('a b c d f');
    });
  });

  describe('Tailwind utility classes', () => {
    it('should handle padding classes', () => {
      expect(cn('p-2', 'p-4')).toBe('p-4');
    });

    it('should handle margin classes', () => {
      expect(cn('m-2', 'm-4')).toBe('m-4');
    });

    it('should handle width classes', () => {
      expect(cn('w-full', 'w-1/2')).toBe('w-1/2');
    });

    it('should handle height classes', () => {
      expect(cn('h-full', 'h-screen')).toBe('h-screen');
    });

    it('should handle background colors', () => {
      expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    });

    it('should handle text colors', () => {
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('should handle flex classes', () => {
      expect(cn('flex', 'flex-col')).toContain('flex');
      expect(cn('flex', 'flex-col')).toContain('flex-col');
    });

    it('should handle grid classes', () => {
      expect(cn('grid', 'grid-cols-2')).toContain('grid');
      expect(cn('grid', 'grid-cols-2')).toContain('grid-cols-2');
    });
  });

  describe('Whitespace handling', () => {
    it('should trim whitespace', () => {
      expect(cn('  foo  ', 'bar')).toBe('foo bar');
    });

    it('should handle multiple spaces', () => {
      expect(cn('foo  bar')).toBe('foo bar');
    });

    it('should handle tabs', () => {
      expect(cn('foo\tbar')).toBe('foo bar');
    });

    it('should handle newlines', () => {
      expect(cn('foo\nbar')).toBe('foo bar');
    });
  });

  describe('Edge cases', () => {
    it('should handle very long class strings', () => {
      const longClass = 'a '.repeat(100).trim();
      expect(cn(longClass)).toBe('a');
    });

    it('should handle special characters in class names', () => {
      expect(cn('foo-bar_baz')).toBe('foo-bar_baz');
    });

    it('should handle numbers in class names', () => {
      expect(cn('foo123', 'bar456')).toBe('foo123 bar456');
    });

    it('should handle kebab-case', () => {
      expect(cn('my-custom-class')).toBe('my-custom-class');
    });

    it('should handle snake_case', () => {
      expect(cn('my_custom_class')).toBe('my_custom_class');
    });
  });

  describe('Responsive and state variants', () => {
    it('should handle sm: prefix', () => {
      expect(cn('sm:text-lg')).toBe('sm:text-lg');
    });

    it('should handle md: prefix', () => {
      expect(cn('md:text-xl')).toBe('md:text-xl');
    });

    it('should handle lg: prefix', () => {
      expect(cn('lg:text-2xl')).toBe('lg:text-2xl');
    });

    it('should handle xl: prefix', () => {
      expect(cn('xl:text-3xl')).toBe('xl:text-3xl');
    });

    it('should handle 2xl: prefix', () => {
      expect(cn('2xl:text-4xl')).toBe('2xl:text-4xl');
    });

    it('should handle hover: prefix', () => {
      expect(cn('hover:bg-blue-500')).toBe('hover:bg-blue-500');
    });

    it('should handle focus: prefix', () => {
      expect(cn('focus:ring-2')).toBe('focus:ring-2');
    });

    it('should handle active: prefix', () => {
      expect(cn('active:scale-95')).toBe('active:scale-95');
    });

    it('should handle dark: prefix', () => {
      expect(cn('dark:bg-gray-800')).toBe('dark:bg-gray-800');
    });

    it('should handle group-hover: prefix', () => {
      expect(cn('group-hover:visible')).toBe('group-hover:visible');
    });
  });

  describe('Multiple values per type', () => {
    it('should handle multiple padding values', () => {
      expect(cn('p-1', 'p-2', 'p-3', 'p-4')).toBe('p-4');
    });

    it('should handle multiple margin values', () => {
      expect(cn('m-1', 'm-2', 'm-3')).toBe('m-3');
    });

    it('should handle multiple background colors', () => {
      expect(cn('bg-red-100', 'bg-red-200', 'bg-red-300')).toBe('bg-red-300');
    });
  });

  describe('Arbitrary values', () => {
    it('should handle arbitrary padding', () => {
      expect(cn('p-[20px]')).toBe('p-[20px]');
    });

    it('should handle arbitrary colors', () => {
      expect(cn('bg-[#1da1f2]')).toBe('bg-[#1da1f2]');
    });

    it('should handle arbitrary sizes', () => {
      expect(cn('w-[500px]')).toBe('w-[500px]');
    });
  });

  describe('Negative values', () => {
    it('should handle negative margin', () => {
      expect(cn('-m-4')).toBe('-m-4');
    });

    it('should handle negative spacing', () => {
      expect(cn('-space-x-4')).toBe('-space-x-4');
    });

    it('should handle negative translate', () => {
      expect(cn('-translate-x-1/2')).toBe('-translate-x-1/2');
    });
  });

  describe('Performance edge cases', () => {
    it('should handle many arguments', () => {
      const result = cn('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j');
      expect(result).toContain('a');
      expect(result).toContain('j');
    });

    it('should handle deep nesting', () => {
      const result = cn(['a', ['b', ['c', ['d']]]]);
      expect(result).toContain('a');
      expect(result).toContain('d');
    });

    it('should handle large objects', () => {
      const obj = { a: true, b: false, c: true, d: false, e: true };
      expect(cn(obj)).toContain('a');
      expect(cn(obj)).toContain('c');
      expect(cn(obj)).toContain('e');
    });
  });

  describe('Real-world usage patterns', () => {
    it('should handle button variant pattern', () => {
      const variant = 'primary';
      const result = cn(
        'px-4 py-2 rounded',
        {
          'bg-blue-500 text-white': variant === 'primary',
          'bg-gray-200 text-black': variant === 'secondary',
        }
      );
      expect(result).toContain('px-4');
      expect(result).toContain('bg-blue-500');
    });

    it('should handle size variant pattern', () => {
      const size = 'lg';
      const result = cn(
        'rounded',
        {
          'px-2 py-1 text-sm': size === 'sm',
          'px-4 py-2 text-base': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        }
      );
      expect(result).toContain('px-6');
      expect(result).toContain('text-lg');
    });

    it('should handle disabled state pattern', () => {
      const disabled = true;
      const result = cn(
        'px-4 py-2',
        {
          'opacity-50 cursor-not-allowed': disabled,
          'hover:bg-blue-600': !disabled,
        }
      );
      expect(result).toContain('opacity-50');
      expect(result).toContain('cursor-not-allowed');
    });
  });

  describe('Type safety', () => {
    it('should always return string', () => {
      expect(typeof cn()).toBe('string');
      expect(typeof cn('foo')).toBe('string');
      expect(typeof cn(['foo'])).toBe('string');
      expect(typeof cn({ foo: true })).toBe('string');
    });

    it('should handle null safety', () => {
      expect(() => cn(null)).not.toThrow();
      expect(() => cn(undefined)).not.toThrow();
      expect(() => cn(null, undefined, false)).not.toThrow();
    });
  });
});

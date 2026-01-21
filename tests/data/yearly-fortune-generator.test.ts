/**
 * Tests for src/data/yearly-fortune-generator.ts
 * Validates yearly fortune blog post generation based on Chinese zodiac
 */
import { describe, it, expect } from 'vitest';
import { generateYearlyFortuneBlogPost } from '@/data/yearly-fortune-generator';

describe('Yearly Fortune Generator', () => {
  describe('generateYearlyFortuneBlogPost', () => {
    it('should generate a blog post for a given year', () => {
      const post = generateYearlyFortuneBlogPost(2024);

      expect(post).toBeDefined();
      expect(post.slug).toBeDefined();
      expect(post.title).toBeDefined();
      expect(post.titleKo).toBeDefined();
      expect(post.content).toBeDefined();
      expect(post.contentKo).toBeDefined();
    });

    it('should have correct blog post structure', () => {
      const post = generateYearlyFortuneBlogPost(2025);

      expect(post).toHaveProperty('slug');
      expect(post).toHaveProperty('title');
      expect(post).toHaveProperty('titleKo');
      expect(post).toHaveProperty('excerpt');
      expect(post).toHaveProperty('excerptKo');
      expect(post).toHaveProperty('category');
      expect(post).toHaveProperty('categoryKo');
      expect(post).toHaveProperty('icon');
      expect(post).toHaveProperty('date');
      expect(post).toHaveProperty('readTime');
      expect(post).toHaveProperty('featured');
      expect(post).toHaveProperty('content');
      expect(post).toHaveProperty('contentKo');
    });

    it('should have Saju category', () => {
      const post = generateYearlyFortuneBlogPost(2024);

      expect(post.category).toBe('Saju');
      expect(post.categoryKo).toBe('사주');
    });

    it('should be marked as featured', () => {
      const post = generateYearlyFortuneBlogPost(2024);
      expect(post.featured).toBe(true);
    });

    it('should have correct date format (YYYY-01-01)', () => {
      const post = generateYearlyFortuneBlogPost(2025);
      expect(post.date).toBe('2025-01-01');

      const post2024 = generateYearlyFortuneBlogPost(2024);
      expect(post2024.date).toBe('2024-01-01');
    });

    it('should have reasonable read time', () => {
      const post = generateYearlyFortuneBlogPost(2024);
      expect(post.readTime).toBeGreaterThan(0);
      expect(post.readTime).toBeLessThanOrEqual(30);
    });

    describe('60-year cycle (갑자 cycle)', () => {
      it('should generate correct data for 1984 (갑자년 - Wood Rat)', () => {
        const post = generateYearlyFortuneBlogPost(1984);

        expect(post.slug).toContain('1984');
        expect(post.slug).toContain('rat');
        expect(post.title).toContain('1984');
        expect(post.title).toContain('Rat');
        expect(post.icon).toBe('🐀');
      });

      it('should generate correct data for 2024 (갑진년 - Wood Dragon)', () => {
        const post = generateYearlyFortuneBlogPost(2024);

        expect(post.slug).toContain('2024');
        expect(post.slug).toContain('dragon');
        expect(post.title).toContain('Dragon');
        expect(post.icon).toBe('🐉');
      });

      it('should generate correct data for 2025 (을사년 - Wood Snake)', () => {
        const post = generateYearlyFortuneBlogPost(2025);

        expect(post.slug).toContain('2025');
        expect(post.slug).toContain('snake');
        expect(post.title).toContain('Snake');
        expect(post.icon).toBe('🐍');
      });

      it('should generate correct data for 2026 (병오년 - Fire Horse)', () => {
        const post = generateYearlyFortuneBlogPost(2026);

        expect(post.slug).toContain('2026');
        expect(post.slug).toContain('horse');
        expect(post.title).toContain('Horse');
        expect(post.icon).toBe('🐴');
      });

      it('should correctly cycle through 12 animals', () => {
        const animals = [
          { year: 1984, animal: 'rat', icon: '🐀' },
          { year: 1985, animal: 'ox', icon: '🐂' },
          { year: 1986, animal: 'tiger', icon: '🐅' },
          { year: 1987, animal: 'rabbit', icon: '🐇' },
          { year: 1988, animal: 'dragon', icon: '🐉' },
          { year: 1989, animal: 'snake', icon: '🐍' },
          { year: 1990, animal: 'horse', icon: '🐴' },
          { year: 1991, animal: 'goat', icon: '🐐' },
          { year: 1992, animal: 'monkey', icon: '🐵' },
          { year: 1993, animal: 'rooster', icon: '🐓' },
          { year: 1994, animal: 'dog', icon: '🐕' },
          { year: 1995, animal: 'pig', icon: '🐖' },
        ];

        animals.forEach(({ year, animal, icon }) => {
          const post = generateYearlyFortuneBlogPost(year);
          expect(post.slug).toContain(animal);
          expect(post.icon).toBe(icon);
        });
      });

      it('should correctly cycle through 10 heavenly stems', () => {
        // 1984 starts with 甲 (Jia/Wood/Blue)
        const stems = [
          { year: 1984, color: 'blue', element: 'Wood' },
          { year: 1985, color: 'blue', element: 'Wood' },
          { year: 1986, color: 'red', element: 'Fire' },
          { year: 1987, color: 'red', element: 'Fire' },
          { year: 1988, color: 'yellow', element: 'Earth' },
          { year: 1989, color: 'yellow', element: 'Earth' },
          { year: 1990, color: 'white', element: 'Metal' },
          { year: 1991, color: 'white', element: 'Metal' },
          { year: 1992, color: 'black', element: 'Water' },
          { year: 1993, color: 'black', element: 'Water' },
        ];

        stems.forEach(({ year, color, element }) => {
          const post = generateYearlyFortuneBlogPost(year);
          expect(post.slug.toLowerCase()).toContain(color);
          expect(post.title).toContain(element);
        });
      });

      it('should complete 60-year cycle correctly', () => {
        // 1984 and 2044 should be the same combination (甲子)
        const post1984 = generateYearlyFortuneBlogPost(1984);
        const post2044 = generateYearlyFortuneBlogPost(2044);

        // Same animal
        expect(post1984.icon).toBe(post2044.icon);

        // Same element/color combination (both should be Wood/Blue Rat)
        expect(post1984.slug).toContain('blue');
        expect(post2044.slug).toContain('blue');
        expect(post1984.slug).toContain('rat');
        expect(post2044.slug).toContain('rat');
      });
    });

    describe('Content generation', () => {
      it('should include English content sections', () => {
        const post = generateYearlyFortuneBlogPost(2024);

        expect(post.content).toContain('Welcome to the Year');
        expect(post.content).toContain('Understanding');
        expect(post.content).toContain('Heavenly Stem');
        expect(post.content).toContain('Earthly Branch');
        expect(post.content).toContain('Day Master');
      });

      it('should include Korean content sections', () => {
        const post = generateYearlyFortuneBlogPost(2024);

        expect(post.contentKo).toContain('년');
        expect(post.contentKo).toContain('천간');
        expect(post.contentKo).toContain('지지');
        // Uses '일간' instead of '일주' in Korean content
        expect(post.contentKo).toContain('일간');
      });

      it('should include predictions for all five elements', () => {
        const post = generateYearlyFortuneBlogPost(2024);

        // Wood, Fire, Earth, Metal, Water day masters
        expect(post.content).toContain('Wood Day Masters');
        expect(post.content).toContain('Fire Day Masters');
        expect(post.content).toContain('Earth Day Masters');
        expect(post.content).toContain('Metal Day Masters');
        expect(post.content).toContain('Water Day Masters');
      });

      it('should include Korean translations in excerpt', () => {
        const post = generateYearlyFortuneBlogPost(2024);

        expect(post.excerptKo).toContain('사주');
        // Uses '행운' instead of '운세' in excerpt
        expect(post.excerptKo).toContain('행운');
        expect(post.excerptKo.length).toBeGreaterThan(20);
      });

      it('should have year in title', () => {
        const post2024 = generateYearlyFortuneBlogPost(2024);
        const post2025 = generateYearlyFortuneBlogPost(2025);

        expect(post2024.title).toContain('2024');
        expect(post2024.titleKo).toContain('2024');
        expect(post2025.title).toContain('2025');
        expect(post2025.titleKo).toContain('2025');
      });
    });

    describe('Edge cases', () => {
      it('should handle years before 1984', () => {
        const post = generateYearlyFortuneBlogPost(1960);

        expect(post).toBeDefined();
        expect(post.slug).toContain('1960');
        expect(post.icon).toBeDefined();
      });

      it('should handle years far in the future', () => {
        const post = generateYearlyFortuneBlogPost(2100);

        expect(post).toBeDefined();
        expect(post.slug).toContain('2100');
        expect(post.date).toBe('2100-01-01');
      });

      it('should handle historical years', () => {
        const post = generateYearlyFortuneBlogPost(1900);

        expect(post).toBeDefined();
        expect(post.slug).toContain('1900');
      });
    });

    describe('Slug format', () => {
      it('should have valid URL-friendly slug', () => {
        const post = generateYearlyFortuneBlogPost(2024);

        // Slug should be lowercase
        expect(post.slug).toBe(post.slug.toLowerCase());

        // Slug should not contain special characters except hyphens
        expect(post.slug).toMatch(/^[a-z0-9-]+$/);

        // Slug should start with 'saju-' and year
        expect(post.slug).toMatch(/^saju-\d{4}-/);
      });
    });
  });
});

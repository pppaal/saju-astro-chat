import { describe, it, expect } from 'vitest';
import { findPlanetSign } from '@/components/destiny-map/fun-insights/utils/helpers';

describe('destiny-map/fun-insights/utils/helpers', () => {
  describe('findPlanetSign', () => {
    describe('planets as array', () => {
      it('should find planet sign from array of planets', () => {
        const astro = {
          planets: [
            { name: 'Sun', sign: 'Aries' },
            { name: 'Moon', sign: 'Taurus' },
            { name: 'Mercury', sign: 'Gemini' },
          ],
        };

        expect(findPlanetSign(astro, 'Sun')).toBe('aries');
        expect(findPlanetSign(astro, 'Moon')).toBe('taurus');
        expect(findPlanetSign(astro, 'Mercury')).toBe('gemini');
      });

      it('should handle case-insensitive planet names', () => {
        const astro = {
          planets: [
            { name: 'Sun', sign: 'Aries' },
            { name: 'MOON', sign: 'Taurus' },
          ],
        };

        expect(findPlanetSign(astro, 'sun')).toBe('aries');
        expect(findPlanetSign(astro, 'SUN')).toBe('aries');
        expect(findPlanetSign(astro, 'moon')).toBe('taurus');
        expect(findPlanetSign(astro, 'Moon')).toBe('taurus');
      });

      it('should lowercase the returned sign', () => {
        const astro = {
          planets: [
            { name: 'Sun', sign: 'ARIES' },
            { name: 'Moon', sign: 'Taurus' },
            { name: 'Mercury', sign: 'gEmInI' },
          ],
        };

        expect(findPlanetSign(astro, 'Sun')).toBe('aries');
        expect(findPlanetSign(astro, 'Moon')).toBe('taurus');
        expect(findPlanetSign(astro, 'Mercury')).toBe('gemini');
      });

      it('should return null for non-existent planet in array', () => {
        const astro = {
          planets: [
            { name: 'Sun', sign: 'Aries' },
          ],
        };

        expect(findPlanetSign(astro, 'Moon')).toBeNull();
        expect(findPlanetSign(astro, 'NonExistent')).toBeNull();
      });

      it('should handle planets without sign property', () => {
        const astro = {
          planets: [
            { name: 'Sun' },
            { name: 'Moon', sign: 'Taurus' },
          ],
        };

        expect(findPlanetSign(astro, 'Sun')).toBeNull();
        expect(findPlanetSign(astro, 'Moon')).toBe('taurus');
      });

      it('should handle empty planets array', () => {
        const astro = { planets: [] };
        expect(findPlanetSign(astro, 'Sun')).toBeNull();
      });
    });

    describe('planets as record', () => {
      it('should find planet sign from planets record', () => {
        const astro = {
          planets: {
            Sun: { sign: 'Aries' },
            Moon: { sign: 'Taurus' },
            Mercury: { sign: 'Gemini' },
          },
        };

        expect(findPlanetSign(astro, 'Sun')).toBe('aries');
        expect(findPlanetSign(astro, 'Moon')).toBe('taurus');
        expect(findPlanetSign(astro, 'Mercury')).toBe('gemini');
      });

      it('should lowercase the sign from record', () => {
        const astro = {
          planets: {
            Sun: { sign: 'ARIES' },
            Moon: { sign: 'tAuRuS' },
          },
        };

        expect(findPlanetSign(astro, 'Sun')).toBe('aries');
        expect(findPlanetSign(astro, 'Moon')).toBe('taurus');
      });

      it('should return null for non-existent planet in record', () => {
        const astro = {
          planets: {
            Sun: { sign: 'Aries' },
          },
        };

        expect(findPlanetSign(astro, 'Moon')).toBeNull();
        expect(findPlanetSign(astro, 'NonExistent')).toBeNull();
      });

      it('should handle planets record without sign property', () => {
        const astro = {
          planets: {
            Sun: {},
            Moon: { sign: 'Taurus' },
          },
        };

        expect(findPlanetSign(astro, 'Sun')).toBeNull();
        expect(findPlanetSign(astro, 'Moon')).toBe('taurus');
      });

      it('should handle empty planets record', () => {
        const astro = { planets: {} };
        expect(findPlanetSign(astro, 'Sun')).toBeNull();
      });
    });

    describe('facts fallback', () => {
      it('should fallback to facts when planets not available', () => {
        const astro = {
          facts: {
            Sun: { sign: 'Aries' },
            Moon: { sign: 'Taurus' },
          },
        };

        expect(findPlanetSign(astro, 'Sun')).toBe('aries');
        expect(findPlanetSign(astro, 'Moon')).toBe('taurus');
      });

      it('should lowercase sign from facts', () => {
        const astro = {
          facts: {
            Sun: { sign: 'ARIES' },
            Moon: { sign: 'TaUrUs' },
          },
        };

        expect(findPlanetSign(astro, 'Sun')).toBe('aries');
        expect(findPlanetSign(astro, 'Moon')).toBe('taurus');
      });

      it('should return null for non-existent planet in facts', () => {
        const astro = {
          facts: {
            Sun: { sign: 'Aries' },
          },
        };

        expect(findPlanetSign(astro, 'Moon')).toBeNull();
      });

      it('should prioritize planets over facts', () => {
        const astro = {
          planets: [
            { name: 'Sun', sign: 'Aries' },
          ],
          facts: {
            Sun: { sign: 'Leo' },
          },
        };

        // Should use planets array, not facts
        expect(findPlanetSign(astro, 'Sun')).toBe('aries');
      });

      it('should use facts when planet not in planets array', () => {
        const astro = {
          planets: [
            { name: 'Sun', sign: 'Aries' },
          ],
          facts: {
            Moon: { sign: 'Taurus' },
          },
        };

        expect(findPlanetSign(astro, 'Sun')).toBe('aries');
        expect(findPlanetSign(astro, 'Moon')).toBe('taurus');
      });
    });

    describe('null and undefined handling', () => {
      it('should return null for null astro', () => {
        expect(findPlanetSign(null, 'Sun')).toBeNull();
      });

      it('should return null for undefined astro', () => {
        expect(findPlanetSign(undefined, 'Sun')).toBeNull();
      });

      it('should return null for astro without planets or facts', () => {
        expect(findPlanetSign({}, 'Sun')).toBeNull();
      });

      it('should handle null planets', () => {
        const astro = { planets: null };
        expect(findPlanetSign(astro, 'Sun')).toBeNull();
      });

      it('should handle undefined planets', () => {
        const astro = { planets: undefined };
        expect(findPlanetSign(astro, 'Sun')).toBeNull();
      });
    });

    describe('edge cases', () => {
      it('should handle planets with only name but no sign', () => {
        const astro = {
          planets: [
            { name: 'Sun' },
            { name: 'Moon' },
          ],
        };

        expect(findPlanetSign(astro, 'Sun')).toBeNull();
      });

      it('should handle mixed planets (some with sign, some without)', () => {
        const astro = {
          planets: [
            { name: 'Sun', sign: 'Aries' },
            { name: 'Moon' },
            { name: 'Mercury', sign: 'Gemini' },
          ],
        };

        expect(findPlanetSign(astro, 'Sun')).toBe('aries');
        expect(findPlanetSign(astro, 'Moon')).toBeNull();
        expect(findPlanetSign(astro, 'Mercury')).toBe('gemini');
      });

      it('should handle empty string planet name', () => {
        const astro = {
          planets: [
            { name: 'Sun', sign: 'Aries' },
          ],
        };

        expect(findPlanetSign(astro, '')).toBeNull();
      });

      it('should handle special characters in planet names', () => {
        const astro = {
          planets: [
            { name: 'North Node', sign: 'Aries' },
          ],
        };

        expect(findPlanetSign(astro, 'North Node')).toBe('aries');
        expect(findPlanetSign(astro, 'north node')).toBe('aries');
      });

      it('should handle planets record with case sensitivity', () => {
        const astro = {
          planets: {
            'Sun': { sign: 'Aries' },
          },
        };

        // Record lookup is case-sensitive
        expect(findPlanetSign(astro, 'Sun')).toBe('aries');
        expect(findPlanetSign(astro, 'sun')).toBeNull(); // Won't find 'sun' in record
      });

      it('should handle all zodiac signs', () => {
        const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                       'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

        signs.forEach((sign, index) => {
          const astro = {
            planets: [{ name: `Planet${index}`, sign }],
          };

          expect(findPlanetSign(astro, `Planet${index}`)).toBe(sign.toLowerCase());
        });
      });
    });
  });
});

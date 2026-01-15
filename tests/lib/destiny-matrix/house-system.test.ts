import { describe, it, expect } from 'vitest';
import {
  HOUSE_SYSTEM_CONFIG,
  getHouseSystem,
  getHouseSystemWarning,
  validateLatitude,
  HOUSE_SYSTEM_INFO,
  type HouseSystemType,
} from '@/lib/destiny-matrix/house-system';

describe('house-system', () => {
  describe('HOUSE_SYSTEM_CONFIG', () => {
    it('should have default as placidus', () => {
      expect(HOUSE_SYSTEM_CONFIG.default).toBe('placidus');
    });

    it('should have whole-sign as fallback for high latitude', () => {
      expect(HOUSE_SYSTEM_CONFIG.fallbackForHighLatitude).toBe('whole-sign');
    });

    it('should have threshold at 66 degrees', () => {
      expect(HOUSE_SYSTEM_CONFIG.highLatitudeThreshold).toBe(66);
    });
  });

  describe('getHouseSystem', () => {
    it('should return placidus for mid-latitude locations', () => {
      expect(getHouseSystem(37.5665)).toBe('placidus'); // Seoul
      expect(getHouseSystem(40.7128)).toBe('placidus'); // New York
      expect(getHouseSystem(35.6762)).toBe('placidus'); // Tokyo
      expect(getHouseSystem(-33.8688)).toBe('placidus'); // Sydney
    });

    it('should return whole-sign for high latitude locations', () => {
      expect(getHouseSystem(67)).toBe('whole-sign'); // Above Arctic Circle
      expect(getHouseSystem(70)).toBe('whole-sign'); // Tromsø
      expect(getHouseSystem(-67)).toBe('whole-sign'); // Antarctica
      expect(getHouseSystem(-70)).toBe('whole-sign'); // Antarctica
    });

    it('should return placidus at exactly threshold boundary', () => {
      expect(getHouseSystem(65.9)).toBe('placidus');
      expect(getHouseSystem(-65.9)).toBe('placidus');
    });

    it('should return whole-sign at exactly threshold', () => {
      expect(getHouseSystem(66)).toBe('whole-sign');
      expect(getHouseSystem(-66)).toBe('whole-sign');
    });

    it('should handle equator latitude', () => {
      expect(getHouseSystem(0)).toBe('placidus');
    });

    it('should handle extreme latitudes', () => {
      expect(getHouseSystem(90)).toBe('whole-sign'); // North Pole
      expect(getHouseSystem(-90)).toBe('whole-sign'); // South Pole
    });
  });

  describe('getHouseSystemWarning', () => {
    it('should return null for mid-latitude locations', () => {
      expect(getHouseSystemWarning(37.5665)).toBeNull();
      expect(getHouseSystemWarning(40.7128)).toBeNull();
      expect(getHouseSystemWarning(-33.8688)).toBeNull();
    });

    it('should return Korean warning for high latitude', () => {
      const warning = getHouseSystemWarning(70, 'ko');

      expect(warning).not.toBeNull();
      expect(warning).toContain('70.0°');
      expect(warning).toContain('극지방');
      expect(warning).toContain('Whole Sign');
    });

    it('should return English warning for high latitude', () => {
      const warning = getHouseSystemWarning(70, 'en');

      expect(warning).not.toBeNull();
      expect(warning).toContain('70.0°');
      expect(warning).toContain('extreme');
      expect(warning).toContain('Whole Sign');
    });

    it('should default to Korean warning', () => {
      const warning = getHouseSystemWarning(70);

      expect(warning).toContain('극지방');
    });

    it('should return warning for negative high latitude', () => {
      const warning = getHouseSystemWarning(-70, 'ko');

      expect(warning).not.toBeNull();
      expect(warning).toContain('-70.0°');
    });

    it('should return null at boundary minus epsilon', () => {
      expect(getHouseSystemWarning(65.9)).toBeNull();
    });

    it('should return warning at exactly boundary', () => {
      const warning = getHouseSystemWarning(66, 'ko');

      expect(warning).not.toBeNull();
    });
  });

  describe('validateLatitude', () => {
    it('should return true for valid latitudes', () => {
      expect(validateLatitude(0)).toBe(true);
      expect(validateLatitude(45)).toBe(true);
      expect(validateLatitude(-45)).toBe(true);
      expect(validateLatitude(37.5665)).toBe(true);
    });

    it('should return true for boundary values', () => {
      expect(validateLatitude(90)).toBe(true);
      expect(validateLatitude(-90)).toBe(true);
    });

    it('should return false for invalid latitudes', () => {
      expect(validateLatitude(91)).toBe(false);
      expect(validateLatitude(-91)).toBe(false);
      expect(validateLatitude(100)).toBe(false);
      expect(validateLatitude(-180)).toBe(false);
    });
  });

  describe('HOUSE_SYSTEM_INFO', () => {
    it('should have info for placidus', () => {
      expect(HOUSE_SYSTEM_INFO.placidus).toBeDefined();
      expect(HOUSE_SYSTEM_INFO.placidus.name).toBe('Placidus');
      expect(HOUSE_SYSTEM_INFO.placidus.nameKo).toBe('플라시더스');
      expect(HOUSE_SYSTEM_INFO.placidus.pros.length).toBeGreaterThan(0);
      expect(HOUSE_SYSTEM_INFO.placidus.cons.length).toBeGreaterThan(0);
    });

    it('should have info for whole-sign', () => {
      expect(HOUSE_SYSTEM_INFO['whole-sign']).toBeDefined();
      expect(HOUSE_SYSTEM_INFO['whole-sign'].name).toBe('Whole Sign');
      expect(HOUSE_SYSTEM_INFO['whole-sign'].nameKo).toBe('홀 사인');
    });

    it('should have info for koch', () => {
      expect(HOUSE_SYSTEM_INFO.koch).toBeDefined();
      expect(HOUSE_SYSTEM_INFO.koch.name).toBe('Koch');
      expect(HOUSE_SYSTEM_INFO.koch.nameKo).toBe('코흐');
    });

    it('should have info for equal', () => {
      expect(HOUSE_SYSTEM_INFO.equal).toBeDefined();
      expect(HOUSE_SYSTEM_INFO.equal.name).toBe('Equal House');
      expect(HOUSE_SYSTEM_INFO.equal.nameKo).toBe('이퀄 하우스');
    });

    it('should have both English and Korean descriptions', () => {
      const systems: HouseSystemType[] = ['placidus', 'whole-sign', 'koch', 'equal'];

      for (const system of systems) {
        const info = HOUSE_SYSTEM_INFO[system];
        expect(info.description).toBeDefined();
        expect(info.descriptionKo).toBeDefined();
        expect(info.pros.length).toBeGreaterThan(0);
        expect(info.prosKo.length).toBeGreaterThan(0);
        expect(info.cons.length).toBeGreaterThan(0);
        expect(info.consKo.length).toBeGreaterThan(0);
      }
    });
  });
});

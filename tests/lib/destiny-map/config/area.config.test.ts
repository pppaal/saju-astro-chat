// tests/lib/destiny-map/config/area.config.test.ts
import { describe, it, expect } from 'vitest';
import { AREA_CONFIG, type FortuneArea } from '@/lib/destiny-map/config/area.config';

describe('AREA_CONFIG', () => {
  const areas: FortuneArea[] = ['career', 'wealth', 'love', 'health', 'study', 'travel'];

  it('should have config for all fortune areas', () => {
    areas.forEach(area => {
      expect(AREA_CONFIG).toHaveProperty(area);
    });
  });

  it('should have required properties for each area', () => {
    areas.forEach(area => {
      const config = AREA_CONFIG[area];
      expect(config).toHaveProperty('relatedElements');
      expect(config).toHaveProperty('boostSibsin');
      expect(config).toHaveProperty('penaltySibsin');
    });
  });

  it('should have valid elements', () => {
    const validElements = ['fire', 'earth', 'metal', 'water', 'wood'];
    
    areas.forEach(area => {
      const config = AREA_CONFIG[area];
      config.relatedElements.forEach(element => {
        expect(validElements).toContain(element);
      });
    });
  });

  it('should have valid sibsin names', () => {
    const validSibsin = [
      '비견', '겁재', '식신', '상관', 
      '편재', '정재', '편관', '정관', 
      '편인', '정인'
    ];
    
    areas.forEach(area => {
      const config = AREA_CONFIG[area];
      
      config.boostSibsin.forEach(s => {
        expect(validSibsin).toContain(s);
      });
      
      config.penaltySibsin.forEach(s => {
        expect(validSibsin).toContain(s);
      });
    });
  });

  it('should not have overlapping boost and penalty sibsin', () => {
    areas.forEach(area => {
      const config = AREA_CONFIG[area];
      const overlap = config.boostSibsin.filter(s => 
        config.penaltySibsin.includes(s)
      );
      expect(overlap).toEqual([]);
    });
  });

  it('should have non-empty arrays', () => {
    areas.forEach(area => {
      const config = AREA_CONFIG[area];
      expect(config.relatedElements.length).toBeGreaterThan(0);
      expect(config.boostSibsin.length).toBeGreaterThan(0);
      expect(config.penaltySibsin.length).toBeGreaterThan(0);
    });
  });

  it('should have career related to metal and earth', () => {
    expect(AREA_CONFIG.career.relatedElements).toContain('metal');
    expect(AREA_CONFIG.career.relatedElements).toContain('earth');
  });

  it('should have wealth boosted by 재 sibsin', () => {
    expect(AREA_CONFIG.wealth.boostSibsin).toContain('정재');
    expect(AREA_CONFIG.wealth.boostSibsin).toContain('편재');
  });
});

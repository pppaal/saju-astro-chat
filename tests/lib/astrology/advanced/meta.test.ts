import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildEngineMeta } from '@/lib/astrology/advanced/meta';
import type { ChartMeta } from '@/lib/astrology/foundation/types';

vi.mock('@/lib/astrology/foundation/ephe', () => ({
  getSwisseph: vi.fn(() => ({
    swe_version: vi.fn(() => '2.10.03'),
  })),
}));

describe('buildEngineMeta', () => {
  const baseMeta: ChartMeta = {
    name: 'Test Chart',
    datetime: '2024-01-15T12:00:00Z',
    location: { lat: 37.5665, lng: 126.978, city: 'Seoul' },
  };

  it('should add engine metadata', () => {
    const result = buildEngineMeta(baseMeta, {
      theme: 'western',
      houseSystem: 'Placidus',
      nodeType: 'true',
      includeMinorAspects: false,
      enable: { chiron: false, lilith: false, pof: false },
    });

    expect(result.engine).toBe('Swiss Ephemeris');
    expect(result.seVersion).toBe('2.10.03');
    expect(result.nodeType).toBe('true');
  });

  it('should preserve original meta fields', () => {
    const result = buildEngineMeta(baseMeta, {
      theme: 'western',
      houseSystem: 'Placidus',
      nodeType: 'mean',
      includeMinorAspects: false,
      enable: { chiron: false, lilith: false, pof: false },
    });

    expect(result.name).toBe('Test Chart');
    expect(result.datetime).toBe('2024-01-15T12:00:00Z');
    expect(result.location).toEqual(baseMeta.location);
  });

  it('should use mean node type when specified', () => {
    const result = buildEngineMeta(baseMeta, {
      theme: 'saju',
      houseSystem: 'WholeSign',
      nodeType: 'mean',
      includeMinorAspects: false,
      enable: { chiron: false, lilith: false, pof: false },
    });

    expect(result.nodeType).toBe('mean');
  });
});

import { describe, it, expect } from 'vitest';
import { buildSummary, buildErrorSummary } from '@/lib/destiny-map/astrology/summary-builder';

describe('buildSummary', () => {
  const baseInput = {
    planets: [
      { name: 'Sun', sign: 'Aries' },
      { name: 'Moon', sign: 'Cancer' },
      { name: 'Mercury', sign: 'Gemini' },
    ],
    ascendant: { sign: 'Leo' },
    mc: { sign: 'Taurus' },
    astrologyFacts: {
      elementRatios: { fire: 40, water: 30, earth: 20, air: 10 },
    } as any,
    dayMaster: { name: '甲', element: 'Wood' },
  };

  it('should include Sun sign', () => {
    const result = buildSummary(baseInput);
    expect(result).toContain('Sun: Aries');
  });

  it('should include Moon sign', () => {
    const result = buildSummary(baseInput);
    expect(result).toContain('Moon: Cancer');
  });

  it('should include Ascendant sign', () => {
    const result = buildSummary(baseInput);
    expect(result).toContain('Asc: Leo');
  });

  it('should include MC sign', () => {
    const result = buildSummary(baseInput);
    expect(result).toContain('MC: Taurus');
  });

  it('should include dominant element', () => {
    const result = buildSummary(baseInput);
    expect(result).toContain('Dominant Element: fire');
  });

  it('should include day master with name and element', () => {
    const result = buildSummary(baseInput);
    expect(result).toContain('Day Master: 甲 (Wood)');
  });

  it('should include name when provided', () => {
    const result = buildSummary({ ...baseInput, name: 'John' });
    expect(result).toContain('Name: John');
  });

  it('should not include name part when not provided', () => {
    const result = buildSummary(baseInput);
    expect(result).not.toContain('Name:');
  });

  it('should handle missing Sun planet', () => {
    const input = {
      ...baseInput,
      planets: [{ name: 'Moon', sign: 'Cancer' }],
    };
    const result = buildSummary(input);
    expect(result).toContain('Sun: -');
  });

  it('should handle missing Moon planet', () => {
    const input = {
      ...baseInput,
      planets: [{ name: 'Sun', sign: 'Aries' }],
    };
    const result = buildSummary(input);
    expect(result).toContain('Moon: -');
  });

  it('should handle missing ascendant', () => {
    const input = { ...baseInput, ascendant: undefined };
    const result = buildSummary(input);
    expect(result).toContain('Asc: -');
  });

  it('should handle missing MC', () => {
    const input = { ...baseInput, mc: undefined };
    const result = buildSummary(input);
    expect(result).toContain('MC: -');
  });

  it('should handle missing elementRatios', () => {
    const input = {
      ...baseInput,
      astrologyFacts: {} as any,
    };
    const result = buildSummary(input);
    expect(result).not.toContain('Dominant Element');
  });

  it('should handle dayMaster with only element', () => {
    const input = {
      ...baseInput,
      dayMaster: { element: 'Fire' },
    };
    const result = buildSummary(input);
    expect(result).toContain('Day Master: (Fire)');
  });

  it('should show Unknown for missing dayMaster', () => {
    const input = {
      ...baseInput,
      dayMaster: undefined,
    };
    const result = buildSummary(input);
    expect(result).toContain('Day Master: Unknown');
  });

  it('should join parts with pipe separator', () => {
    const result = buildSummary(baseInput);
    expect(result).toContain(' | ');
  });
});

describe('buildErrorSummary', () => {
  it('should return error summary string', () => {
    const result = buildErrorSummary();
    expect(result).toBe('Calculation error occurred. Returning data-only result.');
  });
});

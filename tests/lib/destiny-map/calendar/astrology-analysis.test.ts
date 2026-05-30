import { describe, it, expect } from 'vitest';
import { getLunarPhase } from '@/lib/destiny-map/calendar/astrology-analysis';

// The astrology-analysis facade was slimmed to a single live export
// (getLunarPhase). The aspects / eclipse / retrograde / transits /
// voidOfCourse / planetaryHours helpers it used to re-export were dead code
// (zero importers) and were deleted, so the tests that exercised them through
// this facade are gone too.

describe('getLunarPhase', () => {
  it('should calculate lunar phase', () => {
    const result = getLunarPhase(new Date('2025-01-15'));
    expect(result).toHaveProperty('phase');
    expect(result).toHaveProperty('phaseName');
    expect(result).toHaveProperty('phaseScore');
  });

  it('should return phase between 0 and 29.5', () => {
    const result = getLunarPhase(new Date('2025-01-15'));
    expect(result.phase).toBeGreaterThanOrEqual(0);
    expect(result.phase).toBeLessThan(29.6);
  });

  it('should identify new moon phase', () => {
    const result = getLunarPhase(new Date('2000-01-06'));
    expect(result.phaseName).toBe('newMoon');
  });

  it('should provide phase score', () => {
    const result = getLunarPhase(new Date('2025-01-15'));
    expect(typeof result.phaseScore).toBe('number');
  });

  it('should use UTC to avoid timezone issues', () => {
    const result = getLunarPhase(new Date('2025-01-15'));
    expect(result.phase).toBeGreaterThanOrEqual(0);
  });
});

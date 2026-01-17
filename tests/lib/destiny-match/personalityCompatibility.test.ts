import { describe, it, expect } from 'vitest';

// Sample PersonalityScores for testing
const samplePerson1 = {
  energy: 70,
  cognition: 60,
  decision: 50,
  rhythm: 40,
};

const samplePerson2 = {
  energy: 80,
  cognition: 30,
  decision: 55,
  rhythm: 45,
};

const samplePerson3 = {
  energy: 70,
  cognition: 60,
  decision: 50,
  rhythm: 40,
};

describe('Personality Compatibility Module', () => {
  it('should export calculatePersonalityCompatibility function', async () => {
    const { calculatePersonalityCompatibility } = await import('@/lib/destiny-match/personalityCompatibility');
    expect(typeof calculatePersonalityCompatibility).toBe('function');
  });

  it('should export quickPersonalityScore function', async () => {
    const { quickPersonalityScore } = await import('@/lib/destiny-match/personalityCompatibility');
    expect(typeof quickPersonalityScore).toBe('function');
  });

  it('should calculate personality compatibility', async () => {
    const { calculatePersonalityCompatibility } = await import('@/lib/destiny-match/personalityCompatibility');
    const result = calculatePersonalityCompatibility(samplePerson1, samplePerson2);

    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('grade');
    expect(result).toHaveProperty('chemistry');
    expect(result).toHaveProperty('strengths');
    expect(result).toHaveProperty('challenges');
    expect(result).toHaveProperty('tips');
    expect(typeof result.score).toBe('number');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('should calculate quick personality score', async () => {
    const { quickPersonalityScore } = await import('@/lib/destiny-match/personalityCompatibility');
    const result = quickPersonalityScore(samplePerson1, samplePerson2);

    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it('should return high score for identical personalities', async () => {
    const { quickPersonalityScore } = await import('@/lib/destiny-match/personalityCompatibility');
    const result = quickPersonalityScore(samplePerson1, samplePerson3);

    expect(result).toBeGreaterThanOrEqual(70);
  });

  it('should return null for null inputs', async () => {
    const { quickPersonalityScore } = await import('@/lib/destiny-match/personalityCompatibility');

    expect(quickPersonalityScore(null, samplePerson1)).toBe(null);
    expect(quickPersonalityScore(samplePerson1, null)).toBe(null);
    expect(quickPersonalityScore(null, null)).toBe(null);
  });

  it('should handle various personality score combinations', async () => {
    const { quickPersonalityScore } = await import('@/lib/destiny-match/personalityCompatibility');

    const profiles = [
      { energy: 0, cognition: 0, decision: 0, rhythm: 0 },
      { energy: 50, cognition: 50, decision: 50, rhythm: 50 },
      { energy: 100, cognition: 100, decision: 100, rhythm: 100 },
      { energy: 20, cognition: 80, decision: 30, rhythm: 70 },
    ];

    for (const p1 of profiles) {
      for (const p2 of profiles) {
        const result = quickPersonalityScore(p1, p2);
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(100);
      }
    }
  });

  it('should return grade in compatibility result', async () => {
    const { calculatePersonalityCompatibility } = await import('@/lib/destiny-match/personalityCompatibility');
    const result = calculatePersonalityCompatibility(samplePerson1, samplePerson2);

    expect(['S', 'A', 'B', 'C', 'D']).toContain(result.grade);
  });
});

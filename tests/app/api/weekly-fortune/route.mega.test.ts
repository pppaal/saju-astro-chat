// tests/app/api/weekly-fortune/route.mega.test.ts
// Comprehensive tests for Weekly Fortune API

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/weekly-fortune/route';

// Mock dependencies
vi.mock('@/lib/weeklyFortune', () => ({
  getWeeklyFortuneImage: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { getWeeklyFortuneImage } from '@/lib/weeklyFortune';
import { logger } from '@/lib/logger';

describe('GET /api/weekly-fortune', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return weekly fortune image data', async () => {
    vi.mocked(getWeeklyFortuneImage).mockResolvedValue({
      imageUrl: 'https://example.com/fortune.png',
      week: '2024-W01',
      title: 'Weekly Fortune',
      description: 'This week brings good luck',
      createdAt: '2024-01-01T00:00:00Z',
    });

    const req = new NextRequest('http://localhost:3000/api/weekly-fortune', {
      method: 'GET',
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.imageUrl).toBe('https://example.com/fortune.png');
    expect(data.week).toBe('2024-W01');
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=300');
  });

  it('should return null when no fortune image available', async () => {
    vi.mocked(getWeeklyFortuneImage).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.imageUrl).toBeNull();
    expect(data.message).toBe('No weekly fortune image available yet');
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=60');
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(getWeeklyFortuneImage).mockRejectedValue(new Error('Database error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch weekly fortune image');
    expect(logger.error).toHaveBeenCalledWith(
      '[WeeklyFortune] Error fetching',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it('should set appropriate cache headers for success', async () => {
    vi.mocked(getWeeklyFortuneImage).mockResolvedValue({
      imageUrl: 'https://example.com/fortune.png',
      week: '2024-W01',
    });

    const response = await GET();

    const cacheControl = response.headers.get('Cache-Control');
    expect(cacheControl).toContain('public');
    expect(cacheControl).toContain('s-maxage=300');
    expect(cacheControl).toContain('stale-while-revalidate=600');
  });

  it('should set shorter cache for no data', async () => {
    vi.mocked(getWeeklyFortuneImage).mockResolvedValue(null);

    const response = await GET();

    const cacheControl = response.headers.get('Cache-Control');
    expect(cacheControl).toContain('public');
    expect(cacheControl).toContain('s-maxage=60');
    expect(cacheControl).toContain('stale-while-revalidate=300');
  });

  it('should return all fortune data fields', async () => {
    vi.mocked(getWeeklyFortuneImage).mockResolvedValue({
      imageUrl: 'https://example.com/fortune.png',
      week: '2024-W12',
      title: 'Spring Fortune',
      description: 'Renewal and growth',
      createdAt: '2024-03-18T00:00:00Z',
      zodiacSign: 'Aries',
    });

    const response = await GET();
    const data = await response.json();

    expect(data.imageUrl).toBe('https://example.com/fortune.png');
    expect(data.week).toBe('2024-W12');
    expect(data.title).toBe('Spring Fortune');
    expect(data.description).toBe('Renewal and growth');
    expect(data.createdAt).toBe('2024-03-18T00:00:00Z');
    expect(data.zodiacSign).toBe('Aries');
  });
});

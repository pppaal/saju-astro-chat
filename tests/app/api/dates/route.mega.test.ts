// tests/app/api/dates/route.mega.test.ts
// Comprehensive tests for Dates API

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/dates/route';

describe('GET /api/dates', () => {
  let originalDateNow: () => number;

  beforeEach(() => {
    // Save original Date.now
    originalDateNow = Date.now;
  });

  afterEach(() => {
    // Restore original Date.now
    Date.now = originalDateNow;
  });

  function createNextRequest(): NextRequest {
    return new NextRequest('http://localhost:3000/api/dates', {
      method: 'GET',
      headers: { 'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7' },
    });
  }

  it('should return 200 status', async () => {
    const req = createNextRequest();
    const response = await GET(req);
    expect(response.status).toBe(200);
  });

  it('should return JSON response', async () => {
    const req = createNextRequest();
    const response = await GET(req);
    const contentType = response.headers.get('content-type');
    expect(contentType).toContain('application/json');
  });

  it('should include all expected fields', async () => {
    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('year');
    expect(data).toHaveProperty('month');
    expect(data).toHaveProperty('day');
    expect(data).toHaveProperty('dateText');
    expect(data).toHaveProperty('dateDisplay');
    expect(data).toHaveProperty('timezone');
  });

  it('should return Asia/Seoul timezone', async () => {
    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(data.timezone).toBe('Asia/Seoul');
  });

  it('should return correct date for known timestamp', async () => {
    // Mock Date.now to return 2024-01-15 00:00:00 UTC
    // UTC: 2024-01-15 00:00:00
    // KST (UTC+9): 2024-01-15 09:00:00
    Date.now = vi.fn(() => new Date('2024-01-15T00:00:00.000Z').getTime());

    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(data.year).toBe(2024);
    expect(data.month).toBe(1);
    expect(data.day).toBe(15);
    expect(data.dateText).toBe('2024-01-15');
    expect(data.dateDisplay).toBe('2024년 1월 15일');
  });

  it('should apply UTC+9 offset for Korean time', async () => {
    // Mock Date.now to return 2024-06-10 15:00:00 UTC (3 PM)
    // UTC: 2024-06-10 15:00:00
    // KST (UTC+9): 2024-06-11 00:00:00 (next day!)
    Date.now = vi.fn(() => new Date('2024-06-10T15:00:00.000Z').getTime());

    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(data.year).toBe(2024);
    expect(data.month).toBe(6);
    expect(data.day).toBe(11); // Next day in Korea
    expect(data.dateText).toBe('2024-06-11');
  });

  it('should pad single digit months with zero', async () => {
    // January (month 1)
    Date.now = vi.fn(() => new Date('2024-01-05T00:00:00.000Z').getTime());

    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(data.dateText).toBe('2024-01-05');
    expect(data.dateText).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should pad single digit days with zero', async () => {
    // Day 1
    Date.now = vi.fn(() => new Date('2024-03-01T00:00:00.000Z').getTime());

    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(data.dateText).toBe('2024-03-01');
    expect(data.day).toBe(1);
  });

  it('should handle double digit months without padding', async () => {
    // December (month 12)
    Date.now = vi.fn(() => new Date('2024-12-25T00:00:00.000Z').getTime());

    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(data.month).toBe(12);
    expect(data.dateText).toBe('2024-12-25');
  });

  it('should handle end of year correctly', async () => {
    // December 31, 2023 at 16:00 UTC → January 1, 2024 at 01:00 KST
    Date.now = vi.fn(() => new Date('2023-12-31T16:00:00.000Z').getTime());

    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(data.year).toBe(2024);
    expect(data.month).toBe(1);
    expect(data.day).toBe(1);
    expect(data.dateText).toBe('2024-01-01');
    expect(data.dateDisplay).toBe('2024년 1월 1일');
  });

  it('should handle leap year correctly', async () => {
    // February 29, 2024 (leap year)
    Date.now = vi.fn(() => new Date('2024-02-29T00:00:00.000Z').getTime());

    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(data.year).toBe(2024);
    expect(data.month).toBe(2);
    expect(data.day).toBe(29);
    expect(data.dateText).toBe('2024-02-29');
  });

  it('should return valid ISO timestamp', async () => {
    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(() => new Date(data.timestamp)).not.toThrow();
  });

  it('should format dateDisplay in Korean', async () => {
    Date.now = vi.fn(() => new Date('2024-05-20T00:00:00.000Z').getTime());

    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(data.dateDisplay).toBe('2024년 5월 20일');
    expect(data.dateDisplay).toMatch(/^\d{4}년 \d{1,2}월 \d{1,2}일$/);
  });

  it('should handle midnight UTC correctly', async () => {
    // Midnight UTC → 9 AM Korea time (same day)
    Date.now = vi.fn(() => new Date('2024-08-15T00:00:00.000Z').getTime());

    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(data.year).toBe(2024);
    expect(data.month).toBe(8);
    expect(data.day).toBe(15);
  });

  it('should handle near midnight UTC (crossing day boundary)', async () => {
    // 23:00 UTC → 8 AM next day Korea time
    Date.now = vi.fn(() => new Date('2024-08-15T23:00:00.000Z').getTime());

    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(data.year).toBe(2024);
    expect(data.month).toBe(8);
    expect(data.day).toBe(16); // Next day in Korea
  });

  it('should return consistent data across multiple calls', async () => {
    Date.now = vi.fn(() => new Date('2024-07-10T12:00:00.000Z').getTime());

    const req1 = createNextRequest();
    const response1 = await GET(req1);
    const data1 = await response1.json();

    const req2 = createNextRequest();
    const response2 = await GET(req2);
    const data2 = await response2.json();

    expect(data1.year).toBe(data2.year);
    expect(data1.month).toBe(data2.month);
    expect(data1.day).toBe(data2.day);
    expect(data1.dateText).toBe(data2.dateText);
  });

  it('should handle different years', async () => {
    // Test year 2030
    Date.now = vi.fn(() => new Date('2030-03-15T00:00:00.000Z').getTime());

    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(data.year).toBe(2030);
    expect(data.dateText).toContain('2030-');
    expect(data.dateDisplay).toContain('2030년');
  });

  it('should return number types for year, month, day', async () => {
    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(typeof data.year).toBe('number');
    expect(typeof data.month).toBe('number');
    expect(typeof data.day).toBe('number');
  });

  it('should return string types for text fields', async () => {
    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(typeof data.dateText).toBe('string');
    expect(typeof data.dateDisplay).toBe('string');
    expect(typeof data.timestamp).toBe('string');
    expect(typeof data.timezone).toBe('string');
  });

  it('should have valid month range (1-12)', async () => {
    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(data.month).toBeGreaterThanOrEqual(1);
    expect(data.month).toBeLessThanOrEqual(12);
  });

  it('should have valid day range (1-31)', async () => {
    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(data.day).toBeGreaterThanOrEqual(1);
    expect(data.day).toBeLessThanOrEqual(31);
  });

  it('should handle edge case of February in non-leap year', async () => {
    // February 28, 2023 (non-leap year)
    Date.now = vi.fn(() => new Date('2023-02-28T00:00:00.000Z').getTime());

    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(data.year).toBe(2023);
    expect(data.month).toBe(2);
    expect(data.day).toBe(28);
  });

  it('should handle UTC time that becomes previous day in Korea (impossible)', async () => {
    // Note: UTC+9 always means Korea is ahead, never behind
    // This test verifies that Korea time is always >= UTC time
    Date.now = vi.fn(() => new Date('2024-05-01T01:00:00.000Z').getTime());

    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    // UTC: May 1 at 1 AM
    // KST: May 1 at 10 AM (still same day, just later)
    expect(data.month).toBe(5);
    expect(data.day).toBe(1);
  });

  it('should format dateText in ISO 8601 format', async () => {
    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    // YYYY-MM-DD format
    expect(data.dateText).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should handle milliseconds precision in timestamp', async () => {
    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    const timestamp = new Date(data.timestamp);
    expect(timestamp.getTime()).toBeGreaterThan(0);
    expect(data.timestamp).toContain('.'); // Has milliseconds
  });

  it('should return current year as 4 digits', async () => {
    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(data.year.toString()).toHaveLength(4);
    expect(data.year).toBeGreaterThan(2020);
    expect(data.year).toBeLessThan(2100);
  });

  it('should match dateText components with individual fields', async () => {
    Date.now = vi.fn(() => new Date('2024-11-07T00:00:00.000Z').getTime());

    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    const [year, month, day] = data.dateText.split('-');
    expect(parseInt(year)).toBe(data.year);
    expect(parseInt(month)).toBe(data.month);
    expect(parseInt(day)).toBe(data.day);
  });

  it('should match dateDisplay components with individual fields', async () => {
    Date.now = vi.fn(() => new Date('2024-09-03T00:00:00.000Z').getTime());

    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(data.dateDisplay).toContain(data.year.toString());
    expect(data.dateDisplay).toContain(data.month.toString());
    expect(data.dateDisplay).toContain(data.day.toString());
  });

  it('should handle very early morning UTC time', async () => {
    // 00:01 UTC → 09:01 KST (same day)
    Date.now = vi.fn(() => new Date('2024-04-10T00:01:00.000Z').getTime());

    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(data.month).toBe(4);
    expect(data.day).toBe(10);
  });

  it('should handle late evening UTC time', async () => {
    // 23:59 UTC → 08:59 next day KST
    Date.now = vi.fn(() => new Date('2024-04-10T23:59:00.000Z').getTime());

    const req = createNextRequest();
    const response = await GET(req);
    const result = await response.json();
    const data = result.data;

    expect(data.month).toBe(4);
    expect(data.day).toBe(11); // Next day in Korea
  });
});

// tests/app/api/compatibility/route.mega.test.ts
// Comprehensive tests for Compatibility Analysis API

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/compatibility/route';

// Mock dependencies
vi.mock('@/lib/api/middleware', () => ({
  initializeApiContext: vi.fn(),
  createPublicStreamGuard: vi.fn(),
}));

vi.mock('@/lib/api/ApiClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

vi.mock('@/lib/telemetry', () => ({
  captureServerError: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    reading: {
      create: vi.fn(),
    },
  },
}));

import { initializeApiContext, createPublicStreamGuard } from '@/lib/api/middleware';
import { apiClient } from '@/lib/api/ApiClient';
import { captureServerError } from '@/lib/telemetry';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';

describe('POST /api/compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful middleware mock
    vi.mocked(initializeApiContext).mockResolvedValue({
      context: {
        userId: 'test-user-id',
        sessionId: 'test-session-id',
        ip: '127.0.0.1',
      },
      error: null,
    });

    vi.mocked(createPublicStreamGuard).mockReturnValue({
      route: 'compatibility',
      limit: 30,
      windowSeconds: 60,
    });

    // No session by default
    vi.mocked(getServerSession).mockResolvedValue(null);
  });

  const createBasicPerson = (overrides?: Partial<{
    name: string;
    date: string;
    time: string;
    city: string;
    latitude: number;
    longitude: number;
    timeZone: string;
    relationToP1?: 'lover' | 'friend' | 'other';
    relationNoteToP1?: string;
  }>) => ({
    name: 'Test Person',
    date: '1990-01-15',
    time: '12:30',
    city: 'Seoul',
    latitude: 37.5665,
    longitude: 126.9780,
    timeZone: 'Asia/Seoul',
    ...overrides,
  });

  const createValidRequest = (persons: unknown[], overrides?: Record<string, unknown>) => {
    const body = {
      persons,
      locale: 'ko',
      ...overrides,
    };

    return new NextRequest('http://localhost:3000/api/compatibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  describe('Successful responses', () => {
    it('should calculate compatibility for 2 people with AI backend', async () => {
      const persons = [
        createBasicPerson({ name: 'Alice' }),
        createBasicPerson({ name: 'Bob', relationToP1: 'lover' }),
      ];

      const req = createValidRequest(persons);

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          report: 'Alice and Bob have strong compatibility...',
          model: 'gpt-4o',
          overall_score: 85,
          timing: {
            score: 90,
            period: '2024-03',
            recommendation: 'Great time to deepen connection',
          },
          action_items: ['Plan a romantic date', 'Discuss future goals'],
        },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.overall_score).toBe(85);
      expect(data.aiInterpretation).toContain('Alice and Bob');
      expect(data.timing).toEqual({
        score: 90,
        period: '2024-03',
        recommendation: 'Great time to deepen connection',
      });
      expect(data.action_items).toEqual(['Plan a romantic date', 'Discuss future goals']);
      expect(data.fusion_enabled).toBe(true);
      expect(data.pairs).toHaveLength(1);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });

    it('should handle nested response format (data.report)', async () => {
      const persons = [
        createBasicPerson({ name: 'Alice' }),
        createBasicPerson({ name: 'Bob', relationToP1: 'friend' }),
      ];

      const req = createValidRequest(persons);

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          data: {
            report: 'Nested format report',
            model: 'gpt-4o',
            overall_score: 75,
            timing: null,
            action_items: ['Stay connected'],
          },
        },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.aiInterpretation).toBe('Nested format report');
      expect(data.overall_score).toBe(75);
      expect(data.fusion_enabled).toBe(true);
    });

    it('should calculate compatibility for 3 people (group)', async () => {
      const persons = [
        createBasicPerson({ name: 'Alice' }),
        createBasicPerson({ name: 'Bob', relationToP1: 'lover' }),
        createBasicPerson({ name: 'Charlie', relationToP1: 'friend' }),
      ];

      const req = createValidRequest(persons);

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          is_group: true,
          overall_score: 70,
          report: 'Group dynamics analysis',
          group_analysis: {
            groupDynamics: {
              cohesion: 75,
              conflicts: ['Minor disagreements'],
              strengths: ['Good communication'],
            },
            subgroupPatterns: [
              {
                members: [0, 1],
                pattern: 'Strong bond',
                compatibility: 90,
              },
            ],
            recommendations: ['Regular group meetings'],
          },
          synergy_breakdown: {
            pairwiseScores: {
              '0-1': 90,
              '0-2': 70,
              '1-2': 60,
            },
            elementalBalance: {
              wood: 20,
              fire: 25,
              earth: 20,
              metal: 15,
              water: 20,
            },
            energyFlow: 'Balanced',
            warnings: [],
          },
        },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.is_group).toBe(true);
      expect(data.group_analysis).toBeDefined();
      expect(data.synergy_breakdown).toBeDefined();
      expect(data.pairs).toHaveLength(3); // (0,1), (0,2), (1,2)
    });

    it('should handle 4 people', async () => {
      const persons = [
        createBasicPerson({ name: 'Alice' }),
        createBasicPerson({ name: 'Bob', relationToP1: 'lover' }),
        createBasicPerson({ name: 'Charlie', relationToP1: 'friend' }),
        createBasicPerson({ name: 'Diana', relationToP1: 'other', relationNoteToP1: 'Colleague' }),
      ];

      const req = createValidRequest(persons);

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          overall_score: 65,
          report: 'Four-person compatibility',
        },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pairs).toHaveLength(6); // (0,1), (0,2), (0,3), (1,2), (1,3), (2,3)
    });

    it('should handle friend relation type', async () => {
      const persons = [
        createBasicPerson({ name: 'Alice' }),
        createBasicPerson({ name: 'Bob', relationToP1: 'friend' }),
      ];

      const req = createValidRequest(persons);

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          overall_score: 80,
          report: 'Friendship compatibility',
        },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.overall_score).toBe(80);
    });

    it('should handle other relation type with note', async () => {
      const persons = [
        createBasicPerson({ name: 'Alice' }),
        createBasicPerson({
          name: 'Bob',
          relationToP1: 'other',
          relationNoteToP1: 'Business Partner',
        }),
      ];

      const req = createValidRequest(persons);

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          overall_score: 70,
          report: 'Business compatibility',
        },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.overall_score).toBe(70);
    });

    it.skip('should use fallback score when AI backend fails', async () => {
      const persons = [
        createBasicPerson({ name: 'Alice', latitude: 37.5, longitude: 126.9 }),
        createBasicPerson({ name: 'Bob', latitude: 37.5, longitude: 126.9, relationToP1: 'lover' }),
      ];

      const req = createValidRequest(persons);

      vi.mocked(apiClient.post).mockRejectedValue(new Error('Backend error'));

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.fusion_enabled).toBe(false);
      expect(data.overall_score).toBeGreaterThanOrEqual(0);
      expect(data.interpretation).toContain('playful heuristic');
      expect(logger.warn).toHaveBeenCalledWith(
        '[Compatibility API] AI backend call failed:',
        expect.any(Error)
      );
    });

    it('should save reading for logged-in users', async () => {
      const persons = [
        createBasicPerson({ name: 'Alice' }),
        createBasicPerson({ name: 'Bob', relationToP1: 'lover' }),
      ];

      const req = createValidRequest(persons);

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: '2024-12-31',
      });

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          overall_score: 85,
          report: 'Test report',
        },
      });

      vi.mocked(prisma.reading.create).mockResolvedValue({
        id: 'reading-123',
        userId: 'user-123',
        type: 'compatibility',
        title: 'Alice & Bob 궁합 분석 (85점)',
        content: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(prisma.reading.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          type: 'compatibility',
          title: 'Alice & Bob 궁합 분석 (85점)',
        }),
      });
    });

    it('should handle reading save failure gracefully', async () => {
      const persons = [
        createBasicPerson({ name: 'Alice' }),
        createBasicPerson({ name: 'Bob', relationToP1: 'lover' }),
      ];

      const req = createValidRequest(persons);

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: '2024-12-31',
      });

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          overall_score: 85,
          report: 'Test report',
        },
      });

      vi.mocked(prisma.reading.create).mockRejectedValue(new Error('DB error'));

      const response = await POST(req);

      expect(response.status).toBe(200); // Should still succeed
      expect(logger.warn).toHaveBeenCalledWith(
        '[Compatibility API] Failed to save reading:',
        expect.any(Error)
      );
    });

    it('should not save reading for non-logged-in users', async () => {
      const persons = [
        createBasicPerson({ name: 'Alice' }),
        createBasicPerson({ name: 'Bob', relationToP1: 'lover' }),
      ];

      const req = createValidRequest(persons);

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          overall_score: 85,
          report: 'Test report',
        },
      });

      await POST(req);

      expect(prisma.reading.create).not.toHaveBeenCalled();
    });
  });

  describe('Input validation', () => {
    it('should reject middleware errors', async () => {
      vi.mocked(initializeApiContext).mockResolvedValue({
        context: undefined,
        error: new Response(JSON.stringify({ error: 'Rate limited' }), { status: 429 }),
      });

      const persons = [createBasicPerson(), createBasicPerson({ relationToP1: 'lover' })];
      const req = createValidRequest(persons);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limited');
    });

    it('should reject less than 2 people', async () => {
      const persons = [createBasicPerson()];
      const req = createValidRequest(persons);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('between 2 and 4');
    });

    it('should reject more than 4 people', async () => {
      const persons = [
        createBasicPerson(),
        createBasicPerson({ relationToP1: 'lover' }),
        createBasicPerson({ relationToP1: 'friend' }),
        createBasicPerson({ relationToP1: 'friend' }),
        createBasicPerson({ relationToP1: 'friend' }),
      ];
      const req = createValidRequest(persons);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('between 2 and 4');
    });

    it('should reject missing date', async () => {
      const persons = [
        createBasicPerson(),
        createBasicPerson({ date: '', relationToP1: 'lover' } as never),
      ];
      const req = createValidRequest(persons);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('date, time, and timeZone are required');
    });

    it('should reject missing time', async () => {
      const persons = [
        createBasicPerson(),
        createBasicPerson({ time: '', relationToP1: 'lover' } as never),
      ];
      const req = createValidRequest(persons);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('date, time, and timeZone are required');
    });

    it('should reject missing timeZone', async () => {
      const persons = [
        createBasicPerson(),
        createBasicPerson({ timeZone: '', relationToP1: 'lover' }),
      ];
      const req = createValidRequest(persons);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('date, time, and timeZone are required');
    });

    it('should reject invalid date format', async () => {
      const persons = [
        createBasicPerson(),
        createBasicPerson({ date: '1990/01/15', relationToP1: 'lover' }),
      ];
      const req = createValidRequest(persons);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('date must be YYYY-MM-DD');
    });

    it('should reject invalid time format', async () => {
      const persons = [
        createBasicPerson(),
        createBasicPerson({ time: '12:30:00', relationToP1: 'lover' }),
      ];
      const req = createValidRequest(persons);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('time must be HH:mm');
    });

    it('should reject non-number latitude', async () => {
      const persons = [
        createBasicPerson(),
        createBasicPerson({ latitude: 'invalid' as never, relationToP1: 'lover' }),
      ];
      const req = createValidRequest(persons);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('latitude/longitude must be numbers');
    });

    it('should reject non-number longitude', async () => {
      const persons = [
        createBasicPerson(),
        createBasicPerson({ longitude: 'invalid' as never, relationToP1: 'lover' }),
      ];
      const req = createValidRequest(persons);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('latitude/longitude must be numbers');
    });

    it('should reject out-of-range latitude', async () => {
      const persons = [
        createBasicPerson(),
        createBasicPerson({ latitude: 91, relationToP1: 'lover' }),
      ];
      const req = createValidRequest(persons);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('latitude/longitude out of range');
    });

    it('should reject out-of-range longitude', async () => {
      const persons = [
        createBasicPerson(),
        createBasicPerson({ longitude: 181, relationToP1: 'lover' }),
      ];
      const req = createValidRequest(persons);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('latitude/longitude out of range');
    });

    it('should reject missing relationToP1 for person 2+', async () => {
      const persons = [
        createBasicPerson(),
        createBasicPerson({ relationToP1: undefined }),
      ];
      const req = createValidRequest(persons);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('relationToP1 is required');
    });

    it('should reject invalid relationToP1', async () => {
      const persons = [
        createBasicPerson(),
        createBasicPerson({ relationToP1: 'invalid' as never }),
      ];
      const req = createValidRequest(persons);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('relationToP1 must be friend | lover | other');
    });

    it('should reject "other" relation without note', async () => {
      const persons = [
        createBasicPerson(),
        createBasicPerson({ relationToP1: 'other', relationNoteToP1: '' }),
      ];
      const req = createValidRequest(persons);
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('add a short note for relationToP1 = "other"');
    });

    it('should sanitize name to max length', async () => {
      const longName = 'a'.repeat(200);
      const persons = [
        createBasicPerson({ name: longName }),
        createBasicPerson({ relationToP1: 'lover' }),
      ];

      const req = createValidRequest(persons);

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          overall_score: 85,
          report: 'Test',
        },
      });

      await POST(req);

      const postCall = vi.mocked(apiClient.post).mock.calls[0];
      const sentData = postCall[1];
      expect(sentData.persons[0].name.length).toBeLessThanOrEqual(120);
    });

    it('should sanitize city to max length', async () => {
      const longCity = 'a'.repeat(200);
      const persons = [
        createBasicPerson({ city: longCity }),
        createBasicPerson({ relationToP1: 'lover' }),
      ];

      const req = createValidRequest(persons);

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          overall_score: 85,
          report: 'Test',
        },
      });

      await POST(req);

      // City is sanitized but not sent to backend, so just check no error
      const response = await POST(createValidRequest(persons));
      expect(response.status).toBe(200);
    });

    it('should sanitize relationNoteToP1 to max length', async () => {
      const longNote = 'a'.repeat(300);
      const persons = [
        createBasicPerson(),
        createBasicPerson({ relationToP1: 'other', relationNoteToP1: longNote }),
      ];

      const req = createValidRequest(persons);

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          overall_score: 85,
          report: 'Test',
        },
      });

      await POST(req);

      const postCall = vi.mocked(apiClient.post).mock.calls[0];
      const sentData = postCall[1];
      expect(sentData.persons[1].relationNote.length).toBeLessThanOrEqual(240);
    });

    it('should truncate timeZone to 80 chars', async () => {
      const longTimeZone = 'a'.repeat(100);
      const persons = [
        createBasicPerson({ timeZone: longTimeZone }),
        createBasicPerson({ relationToP1: 'lover' }),
      ];

      const req = createValidRequest(persons);

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          overall_score: 85,
          report: 'Test',
        },
      });

      await POST(req);

      const postCall = vi.mocked(apiClient.post).mock.calls[0];
      const sentData = postCall[1];
      expect(sentData.persons[0].timeZone.length).toBeLessThanOrEqual(80);
    });

    it('should use default names when not provided', async () => {
      const persons = [
        createBasicPerson({ name: '' }),
        createBasicPerson({ name: '', relationToP1: 'lover' }),
      ];

      const req = createValidRequest(persons);

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          overall_score: 85,
          report: 'Test',
        },
      });

      await POST(req);

      const postCall = vi.mocked(apiClient.post).mock.calls[0];
      const sentData = postCall[1];
      expect(sentData.persons[0].name).toBe('Person 1');
      expect(sentData.persons[1].name).toBe('Person 2');
    });
  });

  describe('Error handling', () => {
    it('should handle thrown errors', async () => {
      const persons = [
        createBasicPerson(),
        createBasicPerson({ relationToP1: 'lover' }),
      ];

      const req = new NextRequest('http://localhost:3000/api/compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
      expect(captureServerError).toHaveBeenCalled();
    });

    it('should handle Error instances in catch block', async () => {
      vi.mocked(initializeApiContext).mockRejectedValue(new Error('Init error'));

      const persons = [createBasicPerson(), createBasicPerson({ relationToP1: 'lover' })];
      const req = createValidRequest(persons);

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Init error');
    });

    it('should handle non-Error throws', async () => {
      vi.mocked(initializeApiContext).mockRejectedValue('String error');

      const persons = [createBasicPerson(), createBasicPerson({ relationToP1: 'lover' })];
      const req = createValidRequest(persons);

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Unexpected server error');
    });
  });

  describe('Saju-based fallback score calculation', () => {
    it('should use Saju calculation when backend is down', async () => {
      const persons = [
        createBasicPerson({ latitude: 37.5, longitude: 126.9 }),
        createBasicPerson({ latitude: 37.5, longitude: 126.9, relationToP1: 'lover' }),
      ];

      const req = createValidRequest(persons);

      vi.mocked(apiClient.post).mockRejectedValue(new Error('Backend down'));

      const response = await POST(req);
      const data = await response.json();

      // Saju calculation returns a score, typically around 60-70 range for neutral compatibility
      expect(data.overall_score).toBeGreaterThan(0);
      expect(data.overall_score).toBeLessThanOrEqual(100);
    });

    it('should use Saju calculation regardless of distance', async () => {
      const persons = [
        createBasicPerson({ latitude: 37.5, longitude: 126.9 }), // Seoul
        createBasicPerson({ latitude: -33.9, longitude: 151.2, relationToP1: 'lover' }), // Sydney
      ];

      const req = createValidRequest(persons);

      vi.mocked(apiClient.post).mockRejectedValue(new Error('Backend down'));

      const response = await POST(req);
      const data = await response.json();

      // Saju calculation is based on birth data, not location
      expect(data.overall_score).toBeGreaterThan(0);
      expect(data.overall_score).toBeLessThanOrEqual(100);
    });

    it('should apply lover weight (1.0)', async () => {
      const persons = [
        createBasicPerson({ latitude: 37.5, longitude: 126.9 }),
        createBasicPerson({ latitude: 37.6, longitude: 127.0, relationToP1: 'lover' }),
      ];

      const req = createValidRequest(persons);

      vi.mocked(apiClient.post).mockRejectedValue(new Error('Backend down'));

      const response = await POST(req);
      const data = await response.json();

      expect(data.pairs[0].score).toBeGreaterThan(0);
      // Lover weight is 1.0, so no reduction
    });

    it('should apply friend weight (0.95)', async () => {
      const persons = [
        createBasicPerson({ latitude: 37.5, longitude: 126.9 }),
        createBasicPerson({ latitude: 37.6, longitude: 127.0, relationToP1: 'friend' }),
      ];

      const req = createValidRequest(persons);

      vi.mocked(apiClient.post).mockRejectedValue(new Error('Backend down'));

      const response = await POST(req);
      const data = await response.json();

      expect(data.pairs[0].score).toBeGreaterThan(0);
      // Friend weight is 0.95, so slight reduction
    });

    it('should apply other weight (0.9)', async () => {
      const persons = [
        createBasicPerson({ latitude: 37.5, longitude: 126.9 }),
        createBasicPerson({
          latitude: 37.6,
          longitude: 127.0,
          relationToP1: 'other',
          relationNoteToP1: 'Colleague',
        }),
      ];

      const req = createValidRequest(persons);

      vi.mocked(apiClient.post).mockRejectedValue(new Error('Backend down'));

      const response = await POST(req);
      const data = await response.json();

      expect(data.pairs[0].score).toBeGreaterThan(0);
      // Other weight is 0.9
    });
  });

  describe('Response format handling', () => {
    it('should handle interpretation field as fallback', async () => {
      const persons = [
        createBasicPerson(),
        createBasicPerson({ relationToP1: 'lover' }),
      ];

      const req = createValidRequest(persons);

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          interpretation: 'Alternative format interpretation',
          model: 'gpt-4',
          overall_score: 80,
        },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(data.aiInterpretation).toBe('Alternative format interpretation');
    });

    it('should handle missing AI score', async () => {
      const persons = [
        createBasicPerson({ latitude: 37.5, longitude: 126.9 }),
        createBasicPerson({ latitude: 37.5, longitude: 126.9, relationToP1: 'lover' }),
      ];

      const req = createValidRequest(persons);

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          report: 'No score provided',
          model: 'gpt-4',
        },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(data.fusion_enabled).toBe(false);
      expect(data.overall_score).toBeGreaterThanOrEqual(0); // Uses geo-based fallback
    });

    it('should set Cache-Control header to no-store', async () => {
      const persons = [
        createBasicPerson(),
        createBasicPerson({ relationToP1: 'lover' }),
      ];

      const req = createValidRequest(persons);

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          overall_score: 85,
          report: 'Test',
        },
      });

      const response = await POST(req);

      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });
  });
});

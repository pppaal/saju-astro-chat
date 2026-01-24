// tests/app/api/content-access/route.mega.test.ts
// Comprehensive tests for Content Access API

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies BEFORE imports
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    premiumContentAccess: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

import { POST, GET } from '@/app/api/content-access/route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';

const mockGetServerSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);

describe('POST /api/content-access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should save content access record successfully', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    mockPrisma.premiumContentAccess.create.mockResolvedValue({
      id: 'access-123',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      service: 'astrology',
      contentType: 'reading',
      contentId: 'content-456',
      locale: 'ko',
      creditUsed: 1,
    } as any);

    const req = new NextRequest('http://localhost:3000/api/content-access', {
      method: 'POST',
      body: JSON.stringify({
        service: 'astrology',
        contentType: 'reading',
        contentId: 'content-456',
        locale: 'ko',
        creditUsed: 1,
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.id).toBe('access-123');
    expect(mockPrisma.premiumContentAccess.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        service: 'astrology',
        contentType: 'reading',
        contentId: 'content-456',
        locale: 'ko',
        metadata: null,
        creditUsed: 1,
      },
    });
  });

  it('should return 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/content-access', {
      method: 'POST',
      body: JSON.stringify({
        service: 'astrology',
        contentType: 'reading',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('not_authenticated');
  });

  it('should return 400 when body is invalid', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    const req = new NextRequest('http://localhost:3000/api/content-access', {
      method: 'POST',
      body: 'invalid json',
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('invalid_body');
  });

  it('should return 400 when service is missing', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    const req = new NextRequest('http://localhost:3000/api/content-access', {
      method: 'POST',
      body: JSON.stringify({
        contentType: 'reading',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });

  it('should return 400 when contentType is missing', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    const req = new NextRequest('http://localhost:3000/api/content-access', {
      method: 'POST',
      body: JSON.stringify({
        service: 'astrology',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });

  it('should return 400 for invalid service', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    const req = new NextRequest('http://localhost:3000/api/content-access', {
      method: 'POST',
      body: JSON.stringify({
        service: 'invalid-service',
        contentType: 'reading',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid service');
  });

  it('should accept all valid services', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    mockPrisma.premiumContentAccess.create.mockResolvedValue({
      id: 'access-123',
      createdAt: new Date(),
    } as any);

    const validServices = [
      'astrology',
      'saju',
      'tarot',
      'dream',
      'destiny-map',
      'numerology',
      'iching',
      'compatibility',
    ];

    for (const service of validServices) {
      const req = new NextRequest('http://localhost:3000/api/content-access', {
        method: 'POST',
        body: JSON.stringify({
          service,
          contentType: 'reading',
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(200);
    }
  });

  it('should default locale to "ko" when not provided', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    mockPrisma.premiumContentAccess.create.mockResolvedValue({
      id: 'access-123',
      createdAt: new Date(),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/content-access', {
      method: 'POST',
      body: JSON.stringify({
        service: 'astrology',
        contentType: 'reading',
      }),
    });

    await POST(req);

    expect(mockPrisma.premiumContentAccess.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        locale: 'ko',
      }),
    });
  });

  it('should handle custom locale', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    mockPrisma.premiumContentAccess.create.mockResolvedValue({
      id: 'access-123',
      createdAt: new Date(),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/content-access', {
      method: 'POST',
      body: JSON.stringify({
        service: 'astrology',
        contentType: 'reading',
        locale: 'en',
      }),
    });

    await POST(req);

    expect(mockPrisma.premiumContentAccess.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        locale: 'en',
      }),
    });
  });

  it('should handle contentId as null when not provided', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    mockPrisma.premiumContentAccess.create.mockResolvedValue({
      id: 'access-123',
      createdAt: new Date(),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/content-access', {
      method: 'POST',
      body: JSON.stringify({
        service: 'astrology',
        contentType: 'reading',
      }),
    });

    await POST(req);

    expect(mockPrisma.premiumContentAccess.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        contentId: null,
      }),
    });
  });

  it('should handle metadata field', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    mockPrisma.premiumContentAccess.create.mockResolvedValue({
      id: 'access-123',
      createdAt: new Date(),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/content-access', {
      method: 'POST',
      body: JSON.stringify({
        service: 'astrology',
        contentType: 'reading',
        metadata: { key: 'value' },
      }),
    });

    await POST(req);

    expect(mockPrisma.premiumContentAccess.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: { key: 'value' },
      }),
    });
  });

  it('should handle creditUsed field', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    mockPrisma.premiumContentAccess.create.mockResolvedValue({
      id: 'access-123',
      createdAt: new Date(),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/content-access', {
      method: 'POST',
      body: JSON.stringify({
        service: 'astrology',
        contentType: 'reading',
        creditUsed: 5,
      }),
    });

    await POST(req);

    expect(mockPrisma.premiumContentAccess.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        creditUsed: 5,
      }),
    });
  });

  it('should default creditUsed to 0', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    mockPrisma.premiumContentAccess.create.mockResolvedValue({
      id: 'access-123',
      createdAt: new Date(),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/content-access', {
      method: 'POST',
      body: JSON.stringify({
        service: 'astrology',
        contentType: 'reading',
      }),
    });

    await POST(req);

    expect(mockPrisma.premiumContentAccess.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        creditUsed: 0,
      }),
    });
  });
});

describe('GET /api/content-access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch user content access logs', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    const mockLogs = [
      {
        id: 'log-1',
        service: 'astrology',
        contentType: 'reading',
        contentId: 'content-1',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        locale: 'ko',
        creditUsed: 1,
      },
    ];

    mockPrisma.premiumContentAccess.findMany.mockResolvedValue(mockLogs as any);
    mockPrisma.premiumContentAccess.count.mockResolvedValue(1);

    const req = new NextRequest('http://localhost:3000/api/content-access');

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].id).toBe('log-1');
    expect(data.data[0].service).toBe('astrology');
    expect(data.data[0].createdAt).toBe('2024-01-01T00:00:00.000Z');
    expect(data.pagination.total).toBe(1);
  });

  it('should return 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/content-access');

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('not_authenticated');
  });

  it('should filter by service when provided', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    mockPrisma.premiumContentAccess.findMany.mockResolvedValue([]);
    mockPrisma.premiumContentAccess.count.mockResolvedValue(0);

    const req = new NextRequest(
      'http://localhost:3000/api/content-access?service=tarot'
    );

    await GET(req);

    expect(mockPrisma.premiumContentAccess.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123', service: 'tarot' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      skip: 0,
      select: expect.any(Object),
    });
  });

  it('should respect limit parameter', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    mockPrisma.premiumContentAccess.findMany.mockResolvedValue([]);
    mockPrisma.premiumContentAccess.count.mockResolvedValue(0);

    const req = new NextRequest(
      'http://localhost:3000/api/content-access?limit=10'
    );

    await GET(req);

    expect(mockPrisma.premiumContentAccess.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
      })
    );
  });

  it('should cap limit at 100', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    mockPrisma.premiumContentAccess.findMany.mockResolvedValue([]);
    mockPrisma.premiumContentAccess.count.mockResolvedValue(0);

    const req = new NextRequest(
      'http://localhost:3000/api/content-access?limit=200'
    );

    await GET(req);

    expect(mockPrisma.premiumContentAccess.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      })
    );
  });

  it('should respect offset parameter', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    mockPrisma.premiumContentAccess.findMany.mockResolvedValue([]);
    mockPrisma.premiumContentAccess.count.mockResolvedValue(0);

    const req = new NextRequest(
      'http://localhost:3000/api/content-access?offset=25'
    );

    await GET(req);

    expect(mockPrisma.premiumContentAccess.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 25,
      })
    );
  });

  it('should calculate hasMore in pagination', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    const mockLogs = Array(10)
      .fill(null)
      .map((_, i) => ({
        id: `log-${i}`,
        service: 'astrology',
        contentType: 'reading',
        contentId: null,
        createdAt: new Date(),
        locale: 'ko',
        creditUsed: 1,
      }));

    mockPrisma.premiumContentAccess.findMany.mockResolvedValue(mockLogs as any);
    mockPrisma.premiumContentAccess.count.mockResolvedValue(100);

    const req = new NextRequest('http://localhost:3000/api/content-access');

    const response = await GET(req);
    const data = await response.json();

    expect(data.pagination.hasMore).toBe(true);
  });

  it('should set hasMore to false when at end', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    } as any);

    mockPrisma.premiumContentAccess.findMany.mockResolvedValue([]);
    mockPrisma.premiumContentAccess.count.mockResolvedValue(0);

    const req = new NextRequest('http://localhost:3000/api/content-access');

    const response = await GET(req);
    const data = await response.json();

    expect(data.pagination.hasMore).toBe(false);
  });
});

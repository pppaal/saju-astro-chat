// tests/app/api/csp-report/route.mega.test.ts
// Comprehensive tests for CSP Report API

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(),
}))

import { POST, GET } from '@/app/api/csp-report/route'
import { getClientIp } from '@/lib/request-ip'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rateLimit'

const mockGetClientIp = vi.mocked(getClientIp)
const mockRateLimit = vi.mocked(rateLimit)

describe('POST /api/csp-report', () => {
  const validCSPReport = {
    'csp-report': {
      'document-uri': 'https://example.com/page',
      'violated-directive': 'script-src',
      'blocked-uri': 'https://evil.com/script.js',
      'source-file': 'https://example.com/app.js',
      'line-number': 42,
      'column-number': 10,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockGetClientIp.mockReturnValue('127.0.0.1')
    mockRateLimit.mockResolvedValue({
      allowed: true,
      headers: new Headers([
        ['X-RateLimit-Limit', '100'],
        ['X-RateLimit-Remaining', '99'],
      ]),
    })
  })

  it('should accept valid CSP violation report', async () => {
    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify(validCSPReport),
      headers: { 'content-type': 'application/csp-report' },
    })

    const response = await POST(req)

    expect(response.status).toBe(204)
    expect(logger.warn).toHaveBeenCalledWith(
      '[CSP Violation]',
      expect.objectContaining({
        ip: '127.0.0.1',
        violatedDirective: 'script-src',
        blockedUri: 'https://evil.com/script.js',
      })
    )
  })

  it('should enforce rate limiting', async () => {
    mockRateLimit.mockResolvedValue({
      allowed: false,
      headers: new Headers([
        ['X-RateLimit-Limit', '100'],
        ['X-RateLimit-Remaining', '0'],
        ['Retry-After', '60'],
      ]),
    })

    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify(validCSPReport),
    })

    const response = await POST(req)

    expect(response.status).toBe(429)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('should use client IP for rate limiting', async () => {
    mockGetClientIp.mockReturnValue('192.168.1.100')

    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify(validCSPReport),
    })

    await POST(req)

    expect(mockRateLimit).toHaveBeenCalledWith('csp-report:csp-report:192.168.1.100', {
      limit: 100,
      windowSeconds: 60,
    })
  })

  it('should reject reports larger than 16KB', async () => {
    const largeReport = {
      'csp-report': {
        'document-uri': 'x'.repeat(20000),
      },
    }

    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify(largeReport),
    })

    const response = await POST(req)

    expect(response.status).toBe(413)
  })

  it('should check content-length header', async () => {
    // Note: NextRequest automatically sets content-length based on body
    // We can't manually override it to test the header check
    // This test verifies the body size check instead
    const smallBody = JSON.stringify(validCSPReport)
    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: smallBody,
    })

    const response = await POST(req)

    // Body is small, so should succeed
    expect(response.status).toBe(204)
  })

  it('should reject invalid JSON', async () => {
    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: 'invalid json {',
    })

    const response = await POST(req)

    expect(response.status).toBe(400)
  })

  it('should filter out browser extension violations', async () => {
    const extensionReport = {
      'csp-report': {
        'blocked-uri': 'chrome-extension://abcd1234/script.js',
        'violated-directive': 'script-src',
      },
    }

    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify(extensionReport),
    })

    const response = await POST(req)

    expect(response.status).toBe(204)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('should filter out data: URIs', async () => {
    const dataUriReport = {
      'csp-report': {
        'blocked-uri': 'data:image/png;base64,iVBORw0KG...',
        'violated-directive': 'img-src',
      },
    }

    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify(dataUriReport),
    })

    const response = await POST(req)

    expect(response.status).toBe(204)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('should filter out blob: URIs', async () => {
    const blobReport = {
      'csp-report': {
        'blocked-uri': 'blob:https://example.com/123-456',
        'violated-directive': 'img-src',
      },
    }

    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify(blobReport),
    })

    const response = await POST(req)

    expect(response.status).toBe(204)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('should filter out inline violations in development', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const inlineReport = {
      'csp-report': {
        'blocked-uri': 'inline',
        'violated-directive': 'script-src',
      },
    }

    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify(inlineReport),
    })

    const response = await POST(req)

    expect(response.status).toBe(204)
    expect(logger.warn).not.toHaveBeenCalled()

    process.env.NODE_ENV = originalEnv
  })

  it('should log inline violations in production', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const inlineReport = {
      'csp-report': {
        'blocked-uri': 'inline',
        'violated-directive': 'script-src',
      },
    }

    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify(inlineReport),
    })

    const response = await POST(req)

    expect(response.status).toBe(204)
    expect(logger.warn).toHaveBeenCalled()

    process.env.NODE_ENV = originalEnv
  })

  it('should include all violation details in log', async () => {
    const detailedReport = {
      'csp-report': {
        'document-uri': 'https://example.com/page',
        'violated-directive': 'script-src',
        'effective-directive': 'script-src-elem',
        'blocked-uri': 'https://evil.com/script.js',
        'source-file': 'https://example.com/app.js',
        'line-number': 42,
        'column-number': 10,
        disposition: 'enforce',
      },
    }

    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify(detailedReport),
    })

    await POST(req)

    expect(logger.warn).toHaveBeenCalledWith(
      '[CSP Violation]',
      expect.objectContaining({
        ip: '127.0.0.1',
        documentUri: 'https://example.com/page',
        violatedDirective: 'script-src',
        effectiveDirective: 'script-src-elem',
        blockedUri: 'https://evil.com/script.js',
        sourceFile: 'https://example.com/app.js',
        lineNumber: 42,
        columnNumber: 10,
        disposition: 'enforce',
        timestamp: expect.any(String),
      })
    )
  })

  it('should handle missing csp-report field', async () => {
    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify({ invalid: 'structure' }),
    })

    const response = await POST(req)

    expect(response.status).toBe(204)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('should handle empty report', async () => {
    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(req)

    expect(response.status).toBe(204)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('should handle report with missing fields', async () => {
    const partialReport = {
      'csp-report': {
        'violated-directive': 'script-src',
      },
    }

    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify(partialReport),
    })

    const response = await POST(req)

    expect(response.status).toBe(204)
    expect(logger.warn).toHaveBeenCalled()
  })

  it('should handle errors gracefully', async () => {
    // Mock text() to throw an error to trigger catch block
    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify(validCSPReport),
    })

    // Mock the text method to throw
    vi.spyOn(req, 'text').mockRejectedValue(new Error('Network error'))

    const response = await POST(req)

    expect(response.status).toBe(500)
    expect(logger.error).toHaveBeenCalled()
  })

  it('should include rate limit headers in response', async () => {
    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify(validCSPReport),
    })

    const response = await POST(req)

    expect(response.headers.get('X-RateLimit-Limit')).toBe('100')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('99')
  })

  it('should handle unknown IP address', async () => {
    mockGetClientIp.mockReturnValue(null)

    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify(validCSPReport),
    })

    await POST(req)

    expect(mockRateLimit).toHaveBeenCalledWith('csp-report:csp-report:unknown', expect.any(Object))
  })

  it('should filter moz-extension violations', async () => {
    const mozReport = {
      'csp-report': {
        'blocked-uri': 'moz-extension://xyz123/content.js',
        'violated-directive': 'script-src',
      },
    }

    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify(mozReport),
    })

    const response = await POST(req)

    expect(response.status).toBe(204)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('should filter safari-extension violations', async () => {
    const safariReport = {
      'csp-report': {
        'source-file': 'safari-extension://com.company.extension/script.js',
        'violated-directive': 'script-src',
      },
    }

    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify(safariReport),
    })

    const response = await POST(req)

    expect(response.status).toBe(204)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('should filter edge violations', async () => {
    const edgeReport = {
      'csp-report': {
        'blocked-uri': 'edge://extensions/script.js',
        'violated-directive': 'script-src',
      },
    }

    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify(edgeReport),
    })

    const response = await POST(req)

    expect(response.status).toBe(204)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('should filter about: URIs', async () => {
    const aboutReport = {
      'csp-report': {
        'blocked-uri': 'about:blank',
        'violated-directive': 'frame-src',
      },
    }

    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify(aboutReport),
    })

    const response = await POST(req)

    expect(response.status).toBe(204)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('should log legitimate script-src violations', async () => {
    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify(validCSPReport),
    })

    await POST(req)

    expect(logger.warn).toHaveBeenCalledWith('[CSP Violation]', expect.any(Object))
  })

  it('should handle img-src violations', async () => {
    const imgReport = {
      'csp-report': {
        'violated-directive': 'img-src',
        'blocked-uri': 'https://untrusted.com/image.jpg',
      },
    }

    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify(imgReport),
    })

    const response = await POST(req)

    expect(response.status).toBe(204)
    expect(logger.warn).toHaveBeenCalled()
  })

  it('should handle style-src violations', async () => {
    const styleReport = {
      'csp-report': {
        'violated-directive': 'style-src',
        'blocked-uri': 'https://untrusted.com/style.css',
      },
    }

    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify(styleReport),
    })

    const response = await POST(req)

    expect(response.status).toBe(204)
    expect(logger.warn).toHaveBeenCalled()
  })

  it('should include timestamp in logged violation', async () => {
    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify(validCSPReport),
    })

    await POST(req)

    expect(logger.warn).toHaveBeenCalledWith(
      '[CSP Violation]',
      expect.objectContaining({
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
      })
    )
  })
})

describe('GET /api/csp-report', () => {
  it('should return health check status', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('ok')
    expect(data.endpoint).toBe('csp-report')
  })

  it('should return JSON content type', async () => {
    const response = await GET()
    const contentType = response.headers.get('content-type')

    expect(contentType).toContain('application/json')
  })
})

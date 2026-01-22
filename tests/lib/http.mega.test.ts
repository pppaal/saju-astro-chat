/**
 * Mega comprehensive tests for lib/http.ts
 * Testing enforceBodySize with all scenarios
 */
import { describe, it, expect } from 'vitest';
import { enforceBodySize } from '@/lib/http';

describe('lib/http - enforceBodySize comprehensive tests', () => {
  const createRequest = (contentLength?: string, body?: any): Request => {
    const headers = new Headers();
    if (contentLength !== undefined) {
      headers.set('content-length', contentLength);
    }
    return new Request('http://localhost:3000/api/test', {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  describe('Basic functionality', () => {
    it('should return null when no content-length header', () => {
      const req = createRequest(undefined);
      expect(enforceBodySize(req)).toBeNull();
    });

    it('should return null when size is within limit', () => {
      const req = createRequest('100');
      expect(enforceBodySize(req, 256 * 1024)).toBeNull();
    });

    it('should return 413 when size exceeds limit', () => {
      const req = createRequest('300000');
      const res = enforceBodySize(req, 256 * 1024);
      expect(res).not.toBeNull();
      expect(res?.status).toBe(413);
    });

    it('should use default limit of 256KB', () => {
      const req = createRequest('300000');
      const res = enforceBodySize(req);
      expect(res).not.toBeNull();
    });

    it('should allow custom limit', () => {
      const req = createRequest('1000');
      expect(enforceBodySize(req, 500)).not.toBeNull();
    });
  });

  describe('Content-Length header variations', () => {
    it('should handle zero length', () => {
      const req = createRequest('0');
      expect(enforceBodySize(req, 1024)).toBeNull();
    });

    it('should handle exact limit match', () => {
      const req = createRequest('1024');
      expect(enforceBodySize(req, 1024)).toBeNull();
    });

    it('should reject when one byte over limit', () => {
      const req = createRequest('1025');
      expect(enforceBodySize(req, 1024)).not.toBeNull();
    });

    it('should handle very large numbers', () => {
      const req = createRequest('999999999');
      expect(enforceBodySize(req, 1024)).not.toBeNull();
    });

    it('should handle decimal numbers', () => {
      const req = createRequest('100.5');
      expect(enforceBodySize(req, 1024)).toBeNull();
    });

    it('should handle negative numbers', () => {
      const req = createRequest('-100');
      expect(enforceBodySize(req, 1024)).toBeNull();
    });

    it('should handle invalid number format', () => {
      const req = createRequest('abc');
      expect(enforceBodySize(req, 1024)).toBeNull();
    });

    it('should handle empty string', () => {
      const req = createRequest('');
      expect(enforceBodySize(req, 1024)).toBeNull();
    });

    it('should handle NaN string', () => {
      const req = createRequest('NaN');
      expect(enforceBodySize(req, 1024)).toBeNull();
    });

    it('should handle Infinity string', () => {
      const req = createRequest('Infinity');
      expect(enforceBodySize(req, 1024)).toBeNull();
    });
  });

  describe('Different limit sizes', () => {
    const testSizes = [
      { limit: 1, size: '2', shouldBlock: true },
      { limit: 1024, size: '1000', shouldBlock: false },
      { limit: 1024, size: '2000', shouldBlock: true },
      { limit: 256 * 1024, size: '200000', shouldBlock: false },
      { limit: 256 * 1024, size: '300000', shouldBlock: true },
      { limit: 1024 * 1024, size: '500000', shouldBlock: false },
      { limit: 1024 * 1024, size: '2000000', shouldBlock: true },
      { limit: 10 * 1024 * 1024, size: '5000000', shouldBlock: false },
      { limit: 10 * 1024 * 1024, size: '15000000', shouldBlock: true },
    ];

    testSizes.forEach(({ limit, size, shouldBlock }) => {
      it(`should ${shouldBlock ? 'block' : 'allow'} size ${size} with limit ${limit}`, () => {
        const req = createRequest(size);
        const res = enforceBodySize(req, limit);
        if (shouldBlock) {
          expect(res).not.toBeNull();
        } else {
          expect(res).toBeNull();
        }
      });
    });
  });

  describe('Response structure when blocked', () => {
    it('should return JSON response', async () => {
      const req = createRequest('300000');
      const res = enforceBodySize(req, 256 * 1024);
      expect(res).not.toBeNull();
      const body = await res!.json();
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('limit');
    });

    it('should have error field as payload_too_large', async () => {
      const req = createRequest('300000');
      const res = enforceBodySize(req, 256 * 1024);
      const body = await res!.json();
      expect(body.error).toBe('payload_too_large');
    });

    it('should include the limit in response', async () => {
      const req = createRequest('300000');
      const limit = 256 * 1024;
      const res = enforceBodySize(req, limit);
      const body = await res!.json();
      expect(body.limit).toBe(limit);
    });

    it('should have 413 status code', () => {
      const req = createRequest('300000');
      const res = enforceBodySize(req, 256 * 1024);
      expect(res?.status).toBe(413);
    });
  });

  describe('Passthrough headers', () => {
    it('should work without passthrough headers', () => {
      const req = createRequest('300000');
      const res = enforceBodySize(req, 256 * 1024);
      expect(res).not.toBeNull();
    });

    it('should include passthrough headers in response', () => {
      const req = createRequest('300000');
      const headers = { 'X-Custom': 'value' };
      const res = enforceBodySize(req, 256 * 1024, headers);
      expect(res?.headers.get('X-Custom')).toBe('value');
    });

    it('should handle multiple passthrough headers', () => {
      const req = createRequest('300000');
      const headers = {
        'X-Custom-1': 'value1',
        'X-Custom-2': 'value2',
        'X-Custom-3': 'value3',
      };
      const res = enforceBodySize(req, 256 * 1024, headers);
      expect(res?.headers.get('X-Custom-1')).toBe('value1');
      expect(res?.headers.get('X-Custom-2')).toBe('value2');
      expect(res?.headers.get('X-Custom-3')).toBe('value3');
    });

    it('should handle empty headers object', () => {
      const req = createRequest('300000');
      const res = enforceBodySize(req, 256 * 1024, {});
      expect(res).not.toBeNull();
    });

    it('should handle Headers instance', () => {
      const req = createRequest('300000');
      const headers = new Headers();
      headers.set('X-Test', 'test-value');
      const res = enforceBodySize(req, 256 * 1024, headers);
      expect(res?.headers.get('X-Test')).toBe('test-value');
    });
  });

  describe('Edge cases', () => {
    it('should handle very small limit (1 byte)', () => {
      const req = createRequest('100');
      expect(enforceBodySize(req, 1)).not.toBeNull();
    });

    it('should handle very large limit', () => {
      const req = createRequest('1000');
      expect(enforceBodySize(req, 1000000000)).toBeNull();
    });

    it('should handle limit of 0', () => {
      const req = createRequest('1');
      expect(enforceBodySize(req, 0)).not.toBeNull();
    });

    it('should handle content-length with whitespace', () => {
      const req = createRequest(' 1000 ');
      expect(enforceBodySize(req, 500)).not.toBeNull();
    });

    it('should handle scientific notation', () => {
      const req = createRequest('1e6');
      expect(enforceBodySize(req, 500000)).not.toBeNull();
    });
  });

  describe('Boundary testing', () => {
    it('should allow at exactly limit - 1', () => {
      const req = createRequest('1023');
      expect(enforceBodySize(req, 1024)).toBeNull();
    });

    it('should allow at exactly limit', () => {
      const req = createRequest('1024');
      expect(enforceBodySize(req, 1024)).toBeNull();
    });

    it('should reject at exactly limit + 1', () => {
      const req = createRequest('1025');
      expect(enforceBodySize(req, 1024)).not.toBeNull();
    });

    it('should handle boundary at default limit', () => {
      const defaultLimit = 256 * 1024;
      expect(enforceBodySize(createRequest(String(defaultLimit)))).toBeNull();
      expect(enforceBodySize(createRequest(String(defaultLimit + 1)))).not.toBeNull();
    });
  });

  describe('Common request sizes', () => {
    const commonSizes = [
      '100',     // 100 bytes
      '1024',    // 1 KB
      '10240',   // 10 KB
      '102400',  // 100 KB
      '262144',  // 256 KB (default limit)
      '524288',  // 512 KB
      '1048576', // 1 MB
      '5242880', // 5 MB
    ];

    commonSizes.forEach(size => {
      it(`should handle ${size} bytes correctly`, () => {
        const req = createRequest(size);
        const numSize = parseInt(size);
        const result = enforceBodySize(req, 256 * 1024);
        if (numSize <= 256 * 1024) {
          expect(result).toBeNull();
        } else {
          expect(result).not.toBeNull();
        }
      });
    });
  });

  describe('HTTP method variations', () => {
    const createRequestWithMethod = (method: string, contentLength: string): Request => {
      const headers = new Headers();
      headers.set('content-length', contentLength);
      return new Request('http://localhost:3000/api/test', {
        method,
        headers,
      });
    };

    it('should work with POST', () => {
      const req = createRequestWithMethod('POST', '300000');
      expect(enforceBodySize(req, 256 * 1024)).not.toBeNull();
    });

    it('should work with PUT', () => {
      const req = createRequestWithMethod('PUT', '300000');
      expect(enforceBodySize(req, 256 * 1024)).not.toBeNull();
    });

    it('should work with PATCH', () => {
      const req = createRequestWithMethod('PATCH', '300000');
      expect(enforceBodySize(req, 256 * 1024)).not.toBeNull();
    });

    it('should work with GET (even though unusual)', () => {
      const req = createRequestWithMethod('GET', '300000');
      expect(enforceBodySize(req, 256 * 1024)).not.toBeNull();
    });
  });

  describe('Real-world scenarios', () => {
    it('should block 1MB JSON when limit is 256KB', () => {
      const req = createRequest('1048576');
      expect(enforceBodySize(req, 256 * 1024)).not.toBeNull();
    });

    it('should allow 100KB JSON when limit is 256KB', () => {
      const req = createRequest('102400');
      expect(enforceBodySize(req, 256 * 1024)).toBeNull();
    });

    it('should block file upload exceeding limit', () => {
      const req = createRequest('10485760'); // 10MB
      expect(enforceBodySize(req, 5 * 1024 * 1024)).not.toBeNull();
    });

    it('should allow small API requests', () => {
      const req = createRequest('500');
      expect(enforceBodySize(req, 256 * 1024)).toBeNull();
    });
  });

  describe('Return value types', () => {
    it('should return null or NextResponse', () => {
      const req1 = createRequest('100');
      const res1 = enforceBodySize(req1);
      expect(res1 === null || typeof res1 === 'object').toBe(true);

      const req2 = createRequest('300000');
      const res2 = enforceBodySize(req2);
      expect(res2 === null || typeof res2 === 'object').toBe(true);
    });

    it('should return NextResponse with json method when blocked', async () => {
      const req = createRequest('300000');
      const res = enforceBodySize(req);
      expect(res).not.toBeNull();
      expect(typeof res!.json).toBe('function');
    });
  });
});

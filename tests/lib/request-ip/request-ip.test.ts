import { describe, it, expect } from 'vitest';

describe('getClientIp', () => {
  it('should export getClientIp function', async () => {
    const { getClientIp } = await import('@/lib/request-ip');
    expect(typeof getClientIp).toBe('function');
  });

  it('should return IP from x-forwarded-for header', async () => {
    const { getClientIp } = await import('@/lib/request-ip');

    const headers = new Headers({ 'x-forwarded-for': '192.168.1.1' });
    const result = getClientIp(headers);

    expect(result).toBe('192.168.1.1');
  });

  it('should return first IP from comma-separated x-forwarded-for', async () => {
    const { getClientIp } = await import('@/lib/request-ip');

    const headers = new Headers({
      'x-forwarded-for': '192.168.1.1, 10.0.0.1, 172.16.0.1',
    });
    const result = getClientIp(headers);

    expect(result).toBe('192.168.1.1');
  });

  it('should trim whitespace from IP addresses', async () => {
    const { getClientIp } = await import('@/lib/request-ip');

    const headers = new Headers({
      'x-forwarded-for': '  192.168.1.1  ,  10.0.0.1  ',
    });
    const result = getClientIp(headers);

    expect(result).toBe('192.168.1.1');
  });

  it('should return IP from x-real-ip header if x-forwarded-for is absent', async () => {
    const { getClientIp } = await import('@/lib/request-ip');

    const headers = new Headers({ 'x-real-ip': '192.168.1.2' });
    const result = getClientIp(headers);

    expect(result).toBe('192.168.1.2');
  });

  it('should return IP from cf-connecting-ip header if others are absent', async () => {
    const { getClientIp } = await import('@/lib/request-ip');

    const headers = new Headers({ 'cf-connecting-ip': '192.168.1.3' });
    const result = getClientIp(headers);

    expect(result).toBe('192.168.1.3');
  });

  it('should return "unknown" when no IP headers present', async () => {
    const { getClientIp } = await import('@/lib/request-ip');

    const headers = new Headers();
    const result = getClientIp(headers);

    expect(result).toBe('unknown');
  });

  it('should prioritize x-forwarded-for over x-real-ip', async () => {
    const { getClientIp } = await import('@/lib/request-ip');

    const headers = new Headers({
      'x-forwarded-for': '192.168.1.1',
      'x-real-ip': '192.168.1.2',
    });
    const result = getClientIp(headers);

    expect(result).toBe('192.168.1.1');
  });

  it('should prioritize x-real-ip over cf-connecting-ip', async () => {
    const { getClientIp } = await import('@/lib/request-ip');

    const headers = new Headers({
      'x-real-ip': '192.168.1.2',
      'cf-connecting-ip': '192.168.1.3',
    });
    const result = getClientIp(headers);

    expect(result).toBe('192.168.1.2');
  });

  it('should skip empty x-forwarded-for entries', async () => {
    const { getClientIp } = await import('@/lib/request-ip');

    const headers = new Headers({
      'x-forwarded-for': ', , 192.168.1.1',
    });
    const result = getClientIp(headers);

    expect(result).toBe('192.168.1.1');
  });

  it('should handle IPv6 addresses', async () => {
    const { getClientIp } = await import('@/lib/request-ip');

    const headers = new Headers({
      'x-forwarded-for': '2001:db8::1',
    });
    const result = getClientIp(headers);

    expect(result).toBe('2001:db8::1');
  });
});

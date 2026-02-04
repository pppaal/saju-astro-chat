import { describe, it, expect } from 'vitest'
import { getClientIp } from '@/lib/request-ip'

describe('getClientIp', () => {
  it('should extract IP from x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.168.1.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should use first IP from x-forwarded-for list', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.168.1.1, 10.0.0.1, 172.16.0.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should trim whitespace in x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '  192.168.1.1  , 10.0.0.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should fallback to x-real-ip', () => {
    const headers = new Headers({ 'x-real-ip': '10.0.0.1' })
    expect(getClientIp(headers)).toBe('10.0.0.1')
  })

  it('should fallback to cf-connecting-ip', () => {
    const headers = new Headers({ 'cf-connecting-ip': '172.16.0.1' })
    expect(getClientIp(headers)).toBe('172.16.0.1')
  })

  it('should prioritize cf-connecting-ip over x-real-ip', () => {
    const headers = new Headers({
      'cf-connecting-ip': '172.16.0.1',
      'x-real-ip': '10.0.0.1',
    })
    expect(getClientIp(headers)).toBe('172.16.0.1')
  })

  it('should prioritize x-real-ip over x-forwarded-for', () => {
    const headers = new Headers({
      'x-real-ip': '10.0.0.1',
      'x-forwarded-for': '192.168.1.1',
    })
    expect(getClientIp(headers)).toBe('10.0.0.1')
  })

  it('should return unknown when no IP headers present', () => {
    const headers = new Headers()
    expect(getClientIp(headers)).toBe('unknown')
  })

  it('should skip empty values in x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': ' , , 192.168.1.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })
})

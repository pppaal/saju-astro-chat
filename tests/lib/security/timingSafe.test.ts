import { describe, it, expect } from 'vitest'
import {
  timingSafeCompare,
  timingSafeCompareBuffers,
  timingSafeCompareHashes,
} from '@/lib/security/timingSafe'

describe('timingSafe', () => {
  describe('timingSafeCompare', () => {
    it('should return true for identical strings', () => {
      expect(timingSafeCompare('secret123', 'secret123')).toBe(true)
    })

    it('should return false for different strings', () => {
      expect(timingSafeCompare('secret123', 'secret456')).toBe(false)
    })

    it('should return false for strings with different lengths', () => {
      expect(timingSafeCompare('short', 'much_longer_string')).toBe(false)
    })

    it('should handle empty strings', () => {
      expect(timingSafeCompare('', '')).toBe(true)
      expect(timingSafeCompare('', 'nonempty')).toBe(false)
    })

    it('should return false for non-string inputs', () => {
      // @ts-expect-error Testing invalid input
      expect(timingSafeCompare(null, 'string')).toBe(false)
      // @ts-expect-error Testing invalid input
      expect(timingSafeCompare(undefined, 'string')).toBe(false)
    })

    it('should be case-sensitive', () => {
      expect(timingSafeCompare('Secret', 'secret')).toBe(false)
    })

    it('compares full multibyte (Korean) content without truncation', () => {
      // 회귀: 코드유닛 길이로 버퍼를 잡아 UTF-8 멀티바이트가 잘리면, 절단 지점
      // 이후만 다른 두 문자열이 같다고 오판정됐다(시크릿 우회). byte 비교로 차단.
      expect(timingSafeCompare('비밀번호12345', '비밀번호12345')).toBe(true)
      // 앞부분은 같고 뒤만 다른 멀티바이트 — 반드시 다르다고 판정.
      expect(timingSafeCompare('비밀번호AAAA', '비밀번호BBBB')).toBe(false)
      // 멀티바이트 vs 같은 코드유닛 길이의 ASCII — 다르다.
      expect(timingSafeCompare('한글', 'ab')).toBe(false)
      // 이모지(서로게이트 쌍) 포함도 정확히.
      expect(timingSafeCompare('key🔑x', 'key🔑x')).toBe(true)
      expect(timingSafeCompare('key🔑x', 'key🔒x')).toBe(false)
    })
  })

  describe('timingSafeCompareBuffers', () => {
    it('should return true for identical buffers', () => {
      const buf1 = Buffer.from('secret123')
      const buf2 = Buffer.from('secret123')
      expect(timingSafeCompareBuffers(buf1, buf2)).toBe(true)
    })

    it('should return false for different buffers', () => {
      const buf1 = Buffer.from('secret123')
      const buf2 = Buffer.from('secret456')
      expect(timingSafeCompareBuffers(buf1, buf2)).toBe(false)
    })

    it('should return false for non-buffer inputs', () => {
      const buf = Buffer.from('data')
      // @ts-expect-error Testing invalid input
      expect(timingSafeCompareBuffers(null, buf)).toBe(false)
    })
  })

  describe('timingSafeCompareHashes', () => {
    it('should return true for identical hashes', () => {
      const hash = 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3'
      expect(timingSafeCompareHashes(hash, hash)).toBe(true)
    })

    it('should return false for different hashes', () => {
      const hash1 = 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3'
      const hash2 = 'b94a8fe5ccb19ba61c4c0873d391e987982fbbd3'
      expect(timingSafeCompareHashes(hash1, hash2)).toBe(false)
    })
  })
})

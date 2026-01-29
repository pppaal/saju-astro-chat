/**
 * Tests for src/lib/cache/cache-versions.ts
 * 캐시 버전 관리 테스트
 */

import { describe, it, expect } from 'vitest'
import {
  CACHE_VERSIONS,
  getCacheKey,
} from '@/lib/cache/cache-versions'

describe('cache-versions', () => {
  describe('CACHE_VERSIONS', () => {
    describe('Data structure', () => {
      it('should define all cache version keys', () => {
        const keys = Object.keys(CACHE_VERSIONS)
        expect(keys.length).toBeGreaterThan(0)
      })

      it('should have all values as positive integers', () => {
        Object.values(CACHE_VERSIONS).forEach((version) => {
          expect(typeof version).toBe('number')
          expect(Number.isInteger(version)).toBe(true)
          expect(version).toBeGreaterThan(0)
        })
      })

      it('should have expected number of cache types', () => {
        const keys = Object.keys(CACHE_VERSIONS)
        expect(keys).toHaveLength(13)
      })
    })

    describe('Saju cache versions', () => {
      it('should define SAJU_BASIC version', () => {
        expect(CACHE_VERSIONS.SAJU_BASIC).toBe(1)
      })

      it('should define SAJU_DETAILED version', () => {
        expect(CACHE_VERSIONS.SAJU_DETAILED).toBe(1)
      })

      it('should define SAJU_FULL version', () => {
        expect(CACHE_VERSIONS.SAJU_FULL).toBe(1)
      })
    })

    describe('Tarot cache versions', () => {
      it('should define TAROT_ONE_CARD version', () => {
        expect(CACHE_VERSIONS.TAROT_ONE_CARD).toBe(1)
      })

      it('should define TAROT_THREE_CARD version', () => {
        expect(CACHE_VERSIONS.TAROT_THREE_CARD).toBe(1)
      })

      it('should define TAROT_SPREAD version', () => {
        expect(CACHE_VERSIONS.TAROT_SPREAD).toBe(1)
      })
    })

    describe('Compatibility cache versions', () => {
      it('should define COMPATIBILITY version', () => {
        expect(CACHE_VERSIONS.COMPATIBILITY).toBe(1)
      })

      it('should define COMPATIBILITY_GROUP version', () => {
        expect(CACHE_VERSIONS.COMPATIBILITY_GROUP).toBe(1)
      })
    })

    describe('Astrology cache versions', () => {
      it('should define ASTROLOGY_CHART version', () => {
        expect(CACHE_VERSIONS.ASTROLOGY_CHART).toBe(1)
      })

      it('should define ASTROLOGY_TRANSITS version', () => {
        expect(CACHE_VERSIONS.ASTROLOGY_TRANSITS).toBe(1)
      })
    })

    describe('User cache versions', () => {
      it('should define USER_PROFILE version', () => {
        expect(CACHE_VERSIONS.USER_PROFILE).toBe(1)
      })

      it('should define USER_PREMIUM version', () => {
        expect(CACHE_VERSIONS.USER_PREMIUM).toBe(1)
      })
    })

    describe('Daily fortune cache version', () => {
      it('should define DAILY_FORTUNE version', () => {
        expect(CACHE_VERSIONS.DAILY_FORTUNE).toBe(1)
      })
    })

    describe('Version consistency', () => {
      it('should have all versions at 1 (initial state)', () => {
        Object.values(CACHE_VERSIONS).forEach((version) => {
          expect(version).toBe(1)
        })
      })

      it('should have unique cache type names', () => {
        const keys = Object.keys(CACHE_VERSIONS)
        const uniqueKeys = new Set(keys)
        expect(uniqueKeys.size).toBe(keys.length)
      })

      it('should follow naming convention (SCREAMING_SNAKE_CASE)', () => {
        Object.keys(CACHE_VERSIONS).forEach((key) => {
          expect(key).toMatch(/^[A-Z_]+$/)
        })
      })
    })
  })

  describe('getCacheKey', () => {
    describe('Basic functionality', () => {
      it('should generate cache key with prefix, params, and version', () => {
        const key = getCacheKey('saju', { userId: '123' }, 1)
        expect(key).toContain('saju')
        expect(key).toContain('v1')
        expect(key).toContain('userId:123')
      })

      it('should include version in key', () => {
        const key = getCacheKey('test', {}, 2)
        expect(key).toContain('v2')
      })

      it('should handle empty params', () => {
        const key = getCacheKey('empty', {}, 1)
        expect(key).toBe('empty:v1:')
      })

      it('should handle single param', () => {
        const key = getCacheKey('single', { id: 'abc' }, 1)
        expect(key).toBe('single:v1:id:abc')
      })

      it('should handle multiple params', () => {
        const key = getCacheKey('multi', { a: '1', b: '2' }, 1)
        expect(key).toContain('a:1')
        expect(key).toContain('b:2')
      })
    })

    describe('Parameter sorting', () => {
      it('should sort params alphabetically', () => {
        const key1 = getCacheKey('test', { z: '1', a: '2', m: '3' }, 1)
        expect(key1).toBe('test:v1:a:2|m:3|z:1')
      })

      it('should generate same key regardless of param order', () => {
        const key1 = getCacheKey('test', { userId: '123', date: '2024-01-01' }, 1)
        const key2 = getCacheKey('test', { date: '2024-01-01', userId: '123' }, 1)
        expect(key1).toBe(key2)
      })

      it('should be deterministic', () => {
        const params = { c: 'charlie', a: 'alpha', b: 'bravo' }
        const key1 = getCacheKey('test', params, 1)
        const key2 = getCacheKey('test', params, 1)
        expect(key1).toBe(key2)
      })
    })

    describe('Parameter types', () => {
      it('should handle string values', () => {
        const key = getCacheKey('test', { str: 'hello' }, 1)
        expect(key).toContain('str:hello')
      })

      it('should handle number values', () => {
        const key = getCacheKey('test', { num: 42 }, 1)
        expect(key).toContain('num:42')
      })

      it('should handle boolean values', () => {
        const key = getCacheKey('test', { bool: true }, 1)
        expect(key).toContain('bool:true')
      })

      it('should handle null values', () => {
        const key = getCacheKey('test', { val: null }, 1)
        expect(key).toContain('val:null')
      })

      it('should handle undefined values', () => {
        const key = getCacheKey('test', { val: undefined }, 1)
        expect(key).toContain('val:undefined')
      })
    })

    describe('Version changes', () => {
      it('should generate different keys for different versions', () => {
        const params = { userId: '123' }
        const keyV1 = getCacheKey('test', params, 1)
        const keyV2 = getCacheKey('test', params, 2)
        expect(keyV1).not.toBe(keyV2)
      })

      it('should include version number in key format', () => {
        const key1 = getCacheKey('test', {}, 1)
        const key2 = getCacheKey('test', {}, 5)
        expect(key1).toContain('v1')
        expect(key2).toContain('v5')
      })

      it('should handle large version numbers', () => {
        const key = getCacheKey('test', {}, 999)
        expect(key).toContain('v999')
      })
    })

    describe('Key format', () => {
      it('should use colon separators', () => {
        const key = getCacheKey('prefix', { a: '1' }, 1)
        expect(key.split(':')).toHaveLength(4) // prefix:v1:a:1
      })

      it('should use pipe separator between params', () => {
        const key = getCacheKey('test', { a: '1', b: '2' }, 1)
        expect(key).toMatch(/\|/)
      })

      it('should follow format prefix:vN:key:value', () => {
        const key = getCacheKey('saju', { userId: '123' }, 1)
        expect(key).toMatch(/^[^:]+:v\d+:.+$/)
      })

      it('should create consistent format for same inputs', () => {
        const key1 = getCacheKey('test', { x: '1', y: '2' }, 1)
        const key2 = getCacheKey('test', { x: '1', y: '2' }, 1)
        expect(key1).toBe(key2)
      })
    })

    describe('Real-world examples', () => {
      it('should generate key for saju analysis', () => {
        const key = getCacheKey(
          'saju',
          { userId: '123', date: '2024-01-01' },
          CACHE_VERSIONS.SAJU_BASIC
        )
        expect(key).toBe('saju:v1:date:2024-01-01|userId:123')
      })

      it('should generate key for compatibility', () => {
        const key = getCacheKey(
          'compatibility',
          { user1: 'alice', user2: 'bob' },
          CACHE_VERSIONS.COMPATIBILITY
        )
        expect(key).toContain('compatibility:v1')
        expect(key).toContain('user1:alice')
        expect(key).toContain('user2:bob')
      })

      it('should generate key for astrology chart', () => {
        const key = getCacheKey(
          'astrology',
          { lat: 37.5665, lon: 126.978, date: '2024-01-01' },
          CACHE_VERSIONS.ASTROLOGY_CHART
        )
        expect(key).toContain('astrology:v1')
        expect(key).toContain('date:2024-01-01')
        expect(key).toContain('lat:37.5665')
        expect(key).toContain('lon:126.978')
      })

      it('should generate key for user profile', () => {
        const key = getCacheKey(
          'user',
          { id: 'user-123', type: 'profile' },
          CACHE_VERSIONS.USER_PROFILE
        )
        expect(key).toBe('user:v1:id:user-123|type:profile')
      })
    })

    describe('Edge cases', () => {
      it('should handle special characters in values', () => {
        const key = getCacheKey('test', { name: 'hello-world' }, 1)
        expect(key).toContain('name:hello-world')
      })

      it('should handle spaces in values', () => {
        const key = getCacheKey('test', { name: 'hello world' }, 1)
        expect(key).toContain('name:hello world')
      })

      it('should handle numeric string values', () => {
        const key = getCacheKey('test', { id: '123' }, 1)
        expect(key).toContain('id:123')
      })

      it('should handle empty string values', () => {
        const key = getCacheKey('test', { empty: '' }, 1)
        expect(key).toContain('empty:')
      })

      it('should handle zero as version', () => {
        const key = getCacheKey('test', {}, 0)
        expect(key).toBe('test:v0:')
      })

      it('should handle many parameters', () => {
        const params = {
          a: '1', b: '2', c: '3', d: '4', e: '5',
          f: '6', g: '7', h: '8', i: '9', j: '10',
        }
        const key = getCacheKey('test', params, 1)
        expect(key).toContain('a:1')
        expect(key).toContain('j:10')
        expect(key.split('|')).toHaveLength(10)
      })
    })
  })

  describe('Integration', () => {
    describe('Cache version usage', () => {
      it('should use CACHE_VERSIONS constants with getCacheKey', () => {
        const key = getCacheKey('saju', { userId: '123' }, CACHE_VERSIONS.SAJU_BASIC)
        expect(key).toContain('v1')
      })

      it('should create different keys for different cache types', () => {
        const params = { userId: '123' }
        const sajuKey = getCacheKey('saju', params, CACHE_VERSIONS.SAJU_BASIC)
        const tarotKey = getCacheKey('tarot', params, CACHE_VERSIONS.TAROT_ONE_CARD)
        expect(sajuKey).not.toBe(tarotKey)
      })

      it('should invalidate cache when version changes', () => {
        const params = { userId: '123' }
        const oldKey = getCacheKey('saju', params, 1)
        const newKey = getCacheKey('saju', params, 2)
        expect(oldKey).not.toBe(newKey)
      })
    })

    describe('Key uniqueness', () => {
      it('should generate unique keys for different prefixes', () => {
        const params = { id: '1' }
        const key1 = getCacheKey('prefix1', params, 1)
        const key2 = getCacheKey('prefix2', params, 1)
        expect(key1).not.toBe(key2)
      })

      it('should generate unique keys for different params', () => {
        const key1 = getCacheKey('test', { a: '1' }, 1)
        const key2 = getCacheKey('test', { a: '2' }, 1)
        expect(key1).not.toBe(key2)
      })

      it('should generate unique keys for different versions', () => {
        const params = { id: '1' }
        const key1 = getCacheKey('test', params, 1)
        const key2 = getCacheKey('test', params, 2)
        expect(key1).not.toBe(key2)
      })
    })

    describe('Version management strategy', () => {
      it('should have all versions starting at 1', () => {
        // Initial deployment state
        Object.values(CACHE_VERSIONS).forEach((version) => {
          expect(version).toBe(1)
        })
      })

      it('should support version increments', () => {
        // Simulate version increment
        const oldVersion = 1
        const newVersion = 2
        const params = { userId: '123' }
        const oldKey = getCacheKey('test', params, oldVersion)
        const newKey = getCacheKey('test', params, newVersion)
        expect(oldKey).not.toBe(newKey)
      })
    })
  })
})

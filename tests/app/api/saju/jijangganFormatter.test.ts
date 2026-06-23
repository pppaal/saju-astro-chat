import { describe, it, expect } from 'vitest'
import {
  isRecord,
  toJGItem,
  normalizeStemName,
  toHangulStem,
  coerceJijanggan,
  enrichSibsin,
  buildJijangganRaw,
} from '@/app/api/saju/services/jijangganFormatter'

describe('jijangganFormatter', () => {
  describe('isRecord', () => {
    it('plain object는 true', () => {
      expect(isRecord({})).toBe(true)
      expect(isRecord({ a: 1 })).toBe(true)
    })

    it('array, null, primitive는 false', () => {
      expect(isRecord([])).toBe(false)
      expect(isRecord([1, 2])).toBe(false)
      expect(isRecord(null)).toBe(false)
      expect(isRecord(undefined)).toBe(false)
      expect(isRecord('x')).toBe(false)
      expect(isRecord(42)).toBe(false)
      expect(isRecord(0)).toBe(false)
    })
  })

  describe('toJGItem', () => {
    it('falsy는 undefined', () => {
      expect(toJGItem(undefined)).toBeUndefined()
      expect(toJGItem(null)).toBeUndefined()
      expect(toJGItem('')).toBeUndefined()
      expect(toJGItem(0)).toBeUndefined()
    })

    it('string은 name으로 래핑', () => {
      expect(toJGItem('甲')).toEqual({ name: '甲' })
    })

    it('record with name', () => {
      expect(toJGItem({ name: '乙' })).toEqual({ name: '乙', sibsin: undefined })
    })

    it('record with sibsin only', () => {
      expect(toJGItem({ sibsin: '비견' })).toEqual({ name: undefined, sibsin: '비견' })
    })

    it('record with both name and sibsin', () => {
      expect(toJGItem({ name: '甲', sibsin: '비견' })).toEqual({ name: '甲', sibsin: '비견' })
    })

    it('record with non-string name/sibsin returns undefined', () => {
      expect(toJGItem({ name: 123, sibsin: true })).toBeUndefined()
    })

    it('empty record returns undefined', () => {
      expect(toJGItem({})).toBeUndefined()
    })

    it('array is not a record => undefined', () => {
      expect(toJGItem(['甲'])).toBeUndefined()
    })
  })

  describe('normalizeStemName', () => {
    it('falsy passthrough', () => {
      expect(normalizeStemName(undefined)).toBeUndefined()
      expect(normalizeStemName('')).toBe('')
    })

    it('한글 → 한자', () => {
      expect(normalizeStemName('갑')).toBe('甲')
      expect(normalizeStemName('계')).toBe('癸')
      expect(normalizeStemName('경')).toBe('庚')
    })

    it('이미 한자면 그대로', () => {
      expect(normalizeStemName('甲')).toBe('甲')
      expect(normalizeStemName('癸')).toBe('癸')
    })

    it('알 수 없는 값은 그대로', () => {
      expect(normalizeStemName('X')).toBe('X')
    })
  })

  describe('toHangulStem', () => {
    it('falsy passthrough', () => {
      expect(toHangulStem(undefined)).toBeUndefined()
      expect(toHangulStem('')).toBe('')
    })

    it('한자 → 한글', () => {
      expect(toHangulStem('甲')).toBe('갑')
      expect(toHangulStem('癸')).toBe('계')
    })

    it('이미 한글이면 그대로', () => {
      expect(toHangulStem('갑')).toBe('갑')
    })

    it('알 수 없는 값은 그대로', () => {
      expect(toHangulStem('Z')).toBe('Z')
    })
  })

  describe('coerceJijanggan', () => {
    it('falsy => 빈 객체', () => {
      expect(coerceJijanggan(null)).toEqual({})
      expect(coerceJijanggan(undefined)).toEqual({})
    })

    it('record 형태', () => {
      const result = coerceJijanggan({
        chogi: '甲',
        junggi: { name: '丙' },
        jeonggi: '戊',
      })
      expect(result.chogi).toEqual({ name: '甲' })
      expect(result.junggi).toEqual({ name: '丙', sibsin: undefined })
      expect(result.jeonggi).toEqual({ name: '戊' })
    })

    it('record with missing keys', () => {
      const result = coerceJijanggan({ jeonggi: '癸' })
      expect(result.chogi).toBeUndefined()
      expect(result.junggi).toBeUndefined()
      expect(result.jeonggi).toEqual({ name: '癸' })
    })

    it('string => 글자 분해', () => {
      const result = coerceJijanggan('甲丙戊')
      expect(result.chogi).toEqual({ name: '甲' })
      expect(result.junggi).toEqual({ name: '丙' })
      expect(result.jeonggi).toEqual({ name: '戊' })
    })

    it('array of strings', () => {
      const result = coerceJijanggan(['甲', '丙'])
      expect(result.chogi).toEqual({ name: '甲' })
      expect(result.junggi).toEqual({ name: '丙' })
      expect(result.jeonggi).toBeUndefined()
    })

    it('array of objects', () => {
      const result = coerceJijanggan([{ name: '甲', sibsin: '비견' }])
      expect(result.chogi).toEqual({ name: '甲', sibsin: '비견' })
    })
  })

  describe('enrichSibsin', () => {
    it('일간 甲 기준으로 십신 부착', () => {
      const jg = { chogi: { name: '甲' }, junggi: { name: '丙' }, jeonggi: { name: '戊' } }
      const result = enrichSibsin(jg, '甲')
      expect(result.chogi?.sibsin).toBe('비견')
      expect(result.junggi?.sibsin).toBe('식신')
      expect(result.jeonggi?.sibsin).toBe('편재')
    })

    it('한글 일간/한글 name도 한자로 통일', () => {
      const jg = { jeonggi: { name: '계' } }
      const result = enrichSibsin(jg, '갑')
      expect(result.jeonggi?.name).toBe('癸')
      expect(result.jeonggi?.sibsin).toBe('정인')
    })

    it('알 수 없는 일간이면 그대로 반환', () => {
      const jg = { chogi: { name: '甲' } }
      const result = enrichSibsin(jg, 'X')
      expect(result.chogi?.sibsin).toBeUndefined()
    })

    it('이미 sibsin이 있으면 name만 정규화', () => {
      const jg = { chogi: { name: '갑', sibsin: '기존' } }
      const result = enrichSibsin(jg, '甲')
      expect(result.chogi?.sibsin).toBe('기존')
      expect(result.chogi?.name).toBe('甲')
    })

    it('name이 없는 item은 건너뜀', () => {
      const jg = { chogi: { sibsin: '비견' }, junggi: undefined }
      const result = enrichSibsin(jg, '甲')
      expect(result.chogi).toEqual({ sibsin: '비견' })
    })

    it('알 수 없는 stem name은 매핑 없음 -> name만 정규화', () => {
      const jg = { chogi: { name: 'Q' } }
      const result = enrichSibsin(jg, '甲')
      // normalizeStemName('Q') => 'Q', map['Q'] undefined => else branch sets name
      expect(result.chogi?.name).toBe('Q')
      expect(result.chogi?.sibsin).toBeUndefined()
    })
  })

  describe('buildJijangganRaw', () => {
    it('string 입력', () => {
      expect(buildJijangganRaw('甲丙戊')).toEqual({ raw: '甲丙戊', list: ['甲', '丙', '戊'] })
    })

    it('string with empty filtered', () => {
      expect(buildJijangganRaw('')).toEqual({ raw: '', list: [] })
    })

    it('array of strings', () => {
      expect(buildJijangganRaw(['甲', '丙'])).toEqual({ raw: '甲丙', list: ['甲', '丙'] })
    })

    it('array of objects with name', () => {
      const result = buildJijangganRaw([{ name: '甲' }, { name: '丙' }])
      expect(result).toEqual({ raw: '甲丙', list: ['甲', '丙'] })
    })

    it('array with missing name filtered out', () => {
      const result = buildJijangganRaw([{ name: '甲' }, {} as never])
      expect(result).toEqual({ raw: '甲', list: ['甲'] })
    })

    it('record => 한글로 환원', () => {
      const result = buildJijangganRaw({
        chogi: '甲',
        junggi: { name: '丙' },
        jeonggi: '戊',
      })
      expect(result).toEqual({ raw: '갑병무', list: ['갑', '병', '무'] })
    })

    it('record with missing/empty values', () => {
      const result = buildJijangganRaw({ chogi: '甲', junggi: null, jeonggi: { name: '' } })
      expect(result).toEqual({ raw: '갑', list: ['갑'] })
    })

    it('null/undefined => 빈 결과', () => {
      expect(buildJijangganRaw(null)).toEqual({ raw: '', list: [] })
      expect(buildJijangganRaw(undefined)).toEqual({ raw: '', list: [] })
    })
  })
})

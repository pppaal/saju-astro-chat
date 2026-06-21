import { describe, it, expect } from 'vitest'
import { toSajuElementId, toStemId, toBranchId, toGanjiId } from '@/lib/saju/graphIds'

describe('graphIds', () => {
  describe('toSajuElementId', () => {
    it('한글 오행', () => {
      expect(toSajuElementId('목')).toBe('EL_목')
      expect(toSajuElementId('수')).toBe('EL_수')
    })

    it('한자 오행', () => {
      expect(toSajuElementId('木')).toBe('EL_목')
      expect(toSajuElementId('火')).toBe('EL_화')
    })

    it('영문 대소문자 무관', () => {
      expect(toSajuElementId('WOOD')).toBe('EL_목')
      expect(toSajuElementId('water')).toBe('EL_수')
      expect(toSajuElementId('Metal')).toBe('EL_금')
    })

    it('괄호 표기 정리 후 매핑', () => {
      expect(toSajuElementId('목(木)')).toBe('EL_목')
      expect(toSajuElementId('fire (화)')).toBe('EL_화')
    })

    it('알 수 없는 값/빈 값은 null', () => {
      expect(toSajuElementId('xyz')).toBeNull()
      expect(toSajuElementId('')).toBeNull()
      expect(toSajuElementId(null)).toBeNull()
      expect(toSajuElementId(undefined)).toBeNull()
    })
  })

  describe('toStemId', () => {
    it('한자 천간', () => {
      expect(toStemId('甲')).toBe('GAN_갑')
      expect(toStemId('癸')).toBe('GAN_계')
    })

    it('한글 천간', () => {
      expect(toStemId('갑')).toBe('GAN_갑')
      expect(toStemId('계')).toBe('GAN_계')
    })

    it('공백 제거', () => {
      expect(toStemId(' 甲 ')).toBe('GAN_갑')
    })

    it('이미 GAN_ 접두사면 그대로', () => {
      expect(toStemId('GAN_갑')).toBe('GAN_갑')
      expect(toStemId('GAN_갑자')).toBe('GAN_갑자')
    })

    it('알 수 없는/빈 값은 null', () => {
      expect(toStemId('X')).toBeNull()
      expect(toStemId('')).toBeNull()
      expect(toStemId(null)).toBeNull()
      expect(toStemId(undefined)).toBeNull()
    })
  })

  describe('toBranchId', () => {
    it('한자 지지', () => {
      expect(toBranchId('子')).toBe('BR_자')
      expect(toBranchId('亥')).toBe('BR_해')
    })

    it('한글 지지', () => {
      expect(toBranchId('자')).toBe('BR_자')
      expect(toBranchId('해')).toBe('BR_해')
    })

    it('공백 제거', () => {
      expect(toBranchId(' 子 ')).toBe('BR_자')
    })

    it('이미 BR_ 접두사면 그대로', () => {
      expect(toBranchId('BR_자')).toBe('BR_자')
    })

    it('알 수 없는/빈 값은 null', () => {
      expect(toBranchId('X')).toBeNull()
      expect(toBranchId('')).toBeNull()
      expect(toBranchId(null)).toBeNull()
      expect(toBranchId(undefined)).toBeNull()
    })
  })

  describe('toGanjiId', () => {
    it('한자 간지 2글자', () => {
      expect(toGanjiId('甲子')).toBe('GAN_갑자')
      expect(toGanjiId('癸亥')).toBe('GAN_계해')
    })

    it('한글 간지 2글자', () => {
      expect(toGanjiId('갑자')).toBe('GAN_갑자')
    })

    it('혼합 한자/한글', () => {
      expect(toGanjiId('甲자')).toBe('GAN_갑자')
    })

    it('공백 제거 후 매핑', () => {
      expect(toGanjiId(' 甲子 ')).toBe('GAN_갑자')
    })

    it('이미 GAN_ 접두사면 그대로', () => {
      expect(toGanjiId('GAN_갑자')).toBe('GAN_갑자')
    })

    it('2글자가 아니면 null', () => {
      expect(toGanjiId('甲')).toBeNull()
      expect(toGanjiId('甲子丑')).toBeNull()
    })

    it('천간/지지 중 하나라도 매핑 안되면 null', () => {
      expect(toGanjiId('X子')).toBeNull()
      expect(toGanjiId('甲X')).toBeNull()
    })

    it('빈 값/null은 null', () => {
      expect(toGanjiId('')).toBeNull()
      expect(toGanjiId(null)).toBeNull()
      expect(toGanjiId(undefined)).toBeNull()
    })
  })
})

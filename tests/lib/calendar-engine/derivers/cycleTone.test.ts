import { describe, it, expect } from 'vitest'
import { favorOf, SIBSIN_CAT, type YongsinLike } from '@/lib/calendar-engine/derivers/cycleTone'

/**
 * cycleTone.favorOf — 순탄/고비 톤 SSOT.
 * 모든 arm 을 덮는다:
 *   1순위(용신운): element + yongsin 주어지면 용신/희신=good, 기신=hard, 한신=mid.
 *   2순위(fallback): 오행/용신 없을 때 신강·신약 × 십신 카테고리.
 */

describe('favorOf — 1순위 용신운 판정 (element + yongsin)', () => {
  const yongsin: YongsinLike = { primary: '목', secondary: '수', avoid: ['금', '토'] }

  it('element 가 primary 용신이면 good', () => {
    expect(favorOf('strong', '재성', '목', yongsin)).toBe('good')
  })

  it('element 가 secondary 희신이면 good', () => {
    expect(favorOf('weak', '관성', '수', yongsin)).toBe('good')
  })

  it('element 가 avoid(기신·구신) 목록에 있으면 hard', () => {
    expect(favorOf('weak', '인성', '금', yongsin)).toBe('hard')
    expect(favorOf('strong', '비겁', '토', yongsin)).toBe('hard')
  })

  it('element 가 한신(용신도 기신도 아님)이면 mid', () => {
    expect(favorOf('strong', '식상', '화', yongsin)).toBe('mid')
  })

  it('강약이 어떻든 용신운 판정이 fallback 보다 우선한다', () => {
    // 신약 + 비겁 이면 fallback 으로는 good 이지만, element 가 기신(금)이므로 hard.
    expect(favorOf('weak', '비겁', '금', yongsin)).toBe('hard')
  })

  it('avoid 가 비어 있어도 primary/secondary 매칭은 동작', () => {
    const y: YongsinLike = { primary: '화', secondary: undefined, avoid: undefined }
    expect(favorOf('strong', '재성', '화', y)).toBe('good')
    expect(favorOf('strong', '재성', '수', y)).toBe('mid')
  })
})

describe('favorOf — 2순위 fallback (element 또는 yongsin 누락)', () => {
  it('yongsin 없으면 fallback 으로 빠진다 (element 만 있어도)', () => {
    // element 만 주고 yongsin 없으면 1순위 게이트(element && yongsin) 통과 못함.
    expect(favorOf('weak', '인성', '목', undefined)).toBe('good')
  })

  it('element 없으면 fallback (yongsin 만 있어도)', () => {
    const yongsin: YongsinLike = { primary: '목', avoid: ['금'] }
    expect(favorOf('weak', '인성', undefined, yongsin)).toBe('good')
  })

  it('신약(weak): 인성·비겁은 good, 그 외는 hard', () => {
    expect(favorOf('weak', '인성')).toBe('good')
    expect(favorOf('weak', '비겁')).toBe('good')
    expect(favorOf('weak', '식상')).toBe('hard')
    expect(favorOf('weak', '재성')).toBe('hard')
    expect(favorOf('weak', '관성')).toBe('hard')
  })

  it('신강(strong): 인성·비겁은 hard, 그 외는 good', () => {
    expect(favorOf('strong', '인성')).toBe('hard')
    expect(favorOf('strong', '비겁')).toBe('hard')
    expect(favorOf('strong', '식상')).toBe('good')
    expect(favorOf('strong', '재성')).toBe('good')
    expect(favorOf('strong', '관성')).toBe('good')
  })

  it('중립 강약(medium/undefined/그외)은 항상 mid', () => {
    expect(favorOf('medium', '인성')).toBe('mid')
    expect(favorOf('medium', '재성')).toBe('mid')
    expect(favorOf(undefined, '비겁')).toBe('mid')
    expect(favorOf('unknown-strength', '관성')).toBe('mid')
  })
})

describe('SIBSIN_CAT — 십신명 → 카테고리 매핑 re-export', () => {
  it('10 십신을 5 카테고리로 매핑한다', () => {
    expect(SIBSIN_CAT['비견']).toBe('비겁')
    expect(SIBSIN_CAT['겁재']).toBe('비겁')
    expect(SIBSIN_CAT['식신']).toBe('식상')
    expect(SIBSIN_CAT['상관']).toBe('식상')
    expect(SIBSIN_CAT['정재']).toBe('재성')
    expect(SIBSIN_CAT['편재']).toBe('재성')
    expect(SIBSIN_CAT['정관']).toBe('관성')
    expect(SIBSIN_CAT['편관']).toBe('관성')
    expect(SIBSIN_CAT['정인']).toBe('인성')
    expect(SIBSIN_CAT['편인']).toBe('인성')
  })
})

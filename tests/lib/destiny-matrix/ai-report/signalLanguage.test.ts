import { describe, expect, it } from 'vitest'
import {
  humanizeAstroBasis,
  humanizeKeyword,
  humanizeSajuBasis,
} from '@/lib/destiny-matrix/ai-report/signalLanguage'

describe('humanizeKeyword', () => {
  it('expands common engine keywords', () => {
    expect(humanizeKeyword('최상조화')).toContain('조화')
    expect(humanizeKeyword('극심충돌')).toContain('충돌')
    expect(humanizeKeyword('횡재')).toContain('편재')
    expect(humanizeKeyword('자아공백')).toContain('공백')
  })

  it('returns unknown keywords unchanged', () => {
    expect(humanizeKeyword('foo-bar')).toBe('foo-bar')
  })

  it('handles empty / undefined', () => {
    expect(humanizeKeyword(undefined)).toBe('')
    expect(humanizeKeyword('')).toBe('')
    expect(humanizeKeyword('   ')).toBe('')
  })
})

describe('humanizeSajuBasis', () => {
  it('expands 지지삼합', () => {
    expect(humanizeSajuBasis('지지삼합 (亥·卯·未 삼합(목))')).toBe(
      '지지삼합 亥卯未 (목 기운 (성장·확장) 결집)'
    )
  })

  it('expands 천간충', () => {
    const out = humanizeSajuBasis('천간충 (乙-辛 충)')
    expect(out).toContain('天간충 乙-辛'.replace('天', '천'))
    expect(out).toContain('원칙')
  })

  it('expands 신살 천을귀인 / 화개', () => {
    expect(humanizeSajuBasis('신살 천을귀인')).toContain('외부 멘토')
    expect(humanizeSajuBasis('신살 화개')).toContain('영성')
  })

  it('expands 십신 코드', () => {
    expect(humanizeSajuBasis('십신 편재')).toContain('외부 보상')
    expect(humanizeSajuBasis('십신 정인')).toContain('학습')
    expect(humanizeSajuBasis('십신 상관')).toContain('재능')
  })

  it('expands 12운성', () => {
    expect(humanizeSajuBasis('십이운성 절')).toContain('단절')
    expect(humanizeSajuBasis('십이운성 제왕')).toContain('정점')
  })

  it('expands 사주 오행 우세', () => {
    expect(humanizeSajuBasis('사주 금')).toContain('금')
    expect(humanizeSajuBasis('사주 금')).toContain('분별')
  })

  it('expands 격국·용신·대운 코드', () => {
    expect(humanizeSajuBasis('geokguk=정재격')).toContain('정재격')
    expect(humanizeSajuBasis('yongsin=화')).toContain('용신')
    expect(humanizeSajuBasis('daeun=금')).toContain('대운')
  })

  it('passes unknown forms through', () => {
    expect(humanizeSajuBasis('unknown form')).toBe('unknown form')
  })
})

describe('humanizeAstroBasis', () => {
  it('expands aspect basis with orb', () => {
    const out = humanizeAstroBasis(
      'Saturn-True Node trine angle=120deg orb=2.63deg allowed=6deg'
    )
    expect(out).toContain('토성')
    expect(out).toContain('사명 자리')
    expect(out).toContain('120°')
    expect(out).toContain('오브 2.63°')
  })

  it('expands square / opposition / conjunction', () => {
    expect(humanizeAstroBasis('Mercury-True Node square angle=90deg orb=0.29deg')).toContain('긴장')
    expect(humanizeAstroBasis('Moon-Pluto opposition angle=180deg orb=3.95deg')).toContain('대립')
    expect(humanizeAstroBasis('Uranus-Neptune conjunction angle=0deg orb=3.72deg')).toContain('합')
  })

  it('expands "Planet in H<n>"', () => {
    expect(humanizeAstroBasis('Jupiter in H10')).toBe('목성이 직업·명예·사회적 위치 영역에 자리')
    expect(humanizeAstroBasis('Venus in H11')).toContain('금성')
    expect(humanizeAstroBasis('Venus in H11')).toContain('친구')
    expect(humanizeAstroBasis('Sun in H1')).toContain('자아')
  })

  it('expands element dominance', () => {
    expect(humanizeAstroBasis('점성 air')).toContain('공기')
    expect(humanizeAstroBasis('Dominant element air')).toContain('공기')
    expect(humanizeAstroBasis('Dominant element fire')).toContain('불')
  })

  it('passes unknown forms through', () => {
    expect(humanizeAstroBasis('totally unknown')).toBe('totally unknown')
  })

  it('handles empty / undefined', () => {
    expect(humanizeAstroBasis(undefined)).toBe('')
    expect(humanizeAstroBasis('')).toBe('')
  })
})

import { describe, it, expect } from 'vitest'
import {
  crossTypeName,
  composeCrossTypeName,
  pickHeadlineSibsin,
  toStemHan,
} from '@/lib/report/crossType'
import { buildViralSummary } from '@/lib/report/viralArchetype'

// 홈 샘플 명식(1997-03-21 14:30 서울 여) — 壬 일간, 정재·정관 2개씩 동률.
const SAMPLE = {
  sibsinCount: { 정재: 2, 정관: 2, 겁재: 1, 상관: 1, 편관: 1 },
  monthStemSibsin: '겁재',
  dayBranchSibsin: '편관',
  dayStem: '壬',
}

describe('crossTypeName', () => {
  it('샘플 명식 → steady-building Free Spirit / 착실히 쌓는 자유인', () => {
    expect(crossTypeName(SAMPLE, 'en')).toBe('steady-building Free Spirit')
    expect(crossTypeName(SAMPLE, 'ko')).toBe('착실히 쌓는 자유인')
  })

  it('동률 tie-break: SIBSIN_NAMES 순서상 앞선 십성이 이기고, 월간 십성이 뒤에 있으면 월간이 이긴다', () => {
    // 정재(6번째)·정관(8번째) 2:2 동률, 월간이 둘 다 아님 → 순서상 앞선 정재.
    expect(pickHeadlineSibsin(SAMPLE.sibsinCount, '겁재', '편관')).toBe('정재')
    // 월간이 정관(뒤쪽)이면 동률에서 월간 우선 → 정관.
    expect(pickHeadlineSibsin(SAMPLE.sibsinCount, '정관', '편관')).toBe('정관')
    expect(crossTypeName({ ...SAMPLE, monthStemSibsin: '정관' }, 'en')).toBe(
      'straight-arrow Free Spirit'
    )
    expect(crossTypeName({ ...SAMPLE, monthStemSibsin: '정관' }, 'ko')).toBe('반듯한 자유인')
  })

  it('지배 십성(≥2)이 없으면 월간 → 일지 순으로 폴백', () => {
    const flat = { 정재: 1, 정관: 1, 겁재: 1 }
    expect(crossTypeName({ ...SAMPLE, sibsinCount: flat }, 'en')).toBe(
      'never-backing-down Free Spirit'
    )
    expect(crossTypeName({ ...SAMPLE, sibsinCount: null, monthStemSibsin: '日干' }, 'en')).toBe(
      'hard-charging Free Spirit'
    )
  })

  it('일간은 한자·한글 둘 다 받는다', () => {
    expect(toStemHan('임')).toBe('壬')
    expect(toStemHan('壬')).toBe('壬')
    expect(crossTypeName({ ...SAMPLE, dayStem: '임' }, 'ko')).toBe('착실히 쌓는 자유인')
  })

  it('주도 십성이나 일간을 못 찾으면 null', () => {
    expect(
      crossTypeName(
        { sibsinCount: undefined, monthStemSibsin: null, dayBranchSibsin: null, dayStem: '壬' },
        'en'
      )
    ).toBeNull()
    expect(crossTypeName({ ...SAMPLE, dayStem: '?' }, 'en')).toBeNull()
    expect(toStemHan('?')).toBeNull()
  })

  it('리포트 바이럴 카드 이름과 같은 소스 — 10간 × 10십성 전부 일치', () => {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
    const sibsins = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인']
    for (const lang of ['ko', 'en'] as const) {
      for (const stem of stems) {
        for (const sib of sibsins) {
          const viral = buildViralSummary({
            dayMaster: stem,
            strengths: [],
            resonant: [],
            dominantSibsin: sib,
            lang,
          })
          expect(composeCrossTypeName(stem, sib, lang)).toBe(viral?.name)
        }
      }
    }
  })
})

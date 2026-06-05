// tests/lib/saju/nayin.test.ts
import { describe, it, expect } from 'vitest'
import { getNayin, getNayinForPillars } from '@/lib/saju/nayin'

describe('getNayin — 60갑자 납음 룩업', () => {
  it('대표 예: 甲子 → 海中金 (metal)', () => {
    expect(getNayin('甲', '子')).toEqual({
      ganji: '甲子',
      nayin: '海中金',
      nayinKo: '해중금',
      element: 'metal',
    })
  })

  it('짝 페어: 乙丑 도 海中金 (같은 페어)', () => {
    expect(getNayin('乙', '丑')?.nayin).toBe('海中金')
    expect(getNayin('乙', '丑')?.element).toBe('metal')
  })

  it('壬戌 → 大海水', () => {
    expect(getNayin('壬', '戌')).toEqual({
      ganji: '壬戌',
      nayin: '大海水',
      nayinKo: '대해수',
      element: 'water',
    })
  })

  it('癸亥 → 大海水 (페어)', () => {
    expect(getNayin('癸', '亥')?.element).toBe('water')
  })

  it('전체 60갑자 매핑 — 30 페어 모두 정확히 2개씩', () => {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
    const seen = new Map<string, number>()
    // 60갑자 = (천간 인덱스 i, 지지 인덱스 i+offset) 조합
    for (let i = 0; i < 60; i++) {
      const stem = stems[i % 10]
      const branch = branches[i % 12]
      const r = getNayin(stem, branch)
      expect(r).not.toBeNull()
      const key = r!.nayin
      seen.set(key, (seen.get(key) ?? 0) + 1)
    }
    // 30개 납음 각각 정확히 2번씩
    expect(seen.size).toBe(30)
    for (const [, count] of seen) expect(count).toBe(2)
  })

  it('잘못된 입력 → null', () => {
    expect(getNayin(undefined, '子')).toBeNull()
    expect(getNayin('甲', undefined)).toBeNull()
    expect(getNayin('Z', '子')).toBeNull()
    expect(getNayin('甲', 'XX')).toBeNull()
  })
})

describe('getNayinForPillars — 4기둥 일괄', () => {
  it('4기둥 모두 매핑', () => {
    const result = getNayinForPillars({
      year: { stem: '甲', branch: '子' },
      month: { stem: '丙', branch: '寅' },
      day: { stem: '戊', branch: '辰' },
      time: { stem: '庚', branch: '午' },
    })
    expect(result.year?.nayin).toBe('海中金')
    expect(result.month?.nayin).toBe('爐中火')
    expect(result.day?.nayin).toBe('大林木')
    expect(result.time?.nayin).toBe('路傍土')
  })
})

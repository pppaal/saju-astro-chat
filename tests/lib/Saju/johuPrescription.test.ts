import { describe, expect, it } from 'vitest'
import { getJohuPrescription } from '@/lib/Saju/johuYongsin'

describe('getJohuPrescription — 1995-02-09 사용자 케이스', () => {
  it('辛金 寅月 → 정통 처방 己·庚·壬 우선순위', () => {
    const r = getJohuPrescription({
      dayStem: '辛',
      monthBranch: '寅',
      geokguk: '정인격',
      strength: 'strong',
    })
    expect(r).not.toBeNull()
    expect(r!.prescriptionStems).toEqual(['己', '庚', '壬'])
    expect(r!.stemRoles['己']).toContain('인성')
    expect(r!.stemRoles['庚']).toContain('비겁')
    expect(r!.stemRoles['壬']).toContain('식상')
  })

  it('정인격 신강 → "식상으로 설기" 권고', () => {
    const r = getJohuPrescription({
      dayStem: '辛',
      monthBranch: '寅',
      geokguk: '정인격',
      strength: 'strong',
    })
    expect(r!.recommendation.geokgukNote).toContain('식상')
    expect(r!.recommendation.geokgukNote).toContain('설기')
  })

  it('비가역 행동 가드 한 줄 포함', () => {
    const r = getJohuPrescription({
      dayStem: '辛',
      monthBranch: '寅',
    })
    expect(r!.recommendation.irreversibleAction).toMatch(/계약|결혼|이주/)
  })

  it('편관격 → 24h hold rule', () => {
    const r = getJohuPrescription({
      dayStem: '甲',
      monthBranch: '午',
      geokguk: '편관격',
    })
    expect(r!.recommendation.irreversibleAction).toMatch(/24시간|hold/i)
  })
})

describe('getJohuPrescription — 12월령 풀 커버리지', () => {
  it('10일간 × 12월령 = 120 케이스 모두 처방 stems 보유', () => {
    const stems = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
    const branches = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑']
    let coverage = 0
    for (const s of stems) {
      for (const b of branches) {
        const r = getJohuPrescription({ dayStem: s, monthBranch: b })
        if (r && r.prescriptionStems.length > 0) coverage += 1
      }
    }
    expect(coverage).toBe(120)
  })
})

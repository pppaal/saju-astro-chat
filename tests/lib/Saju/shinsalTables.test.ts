/**
 * 신살 룩업 테이블 골든 — 암록(暗祿)·양인(羊刃).
 *
 * 회귀: 암록은 "건록의 충"으로 잘못 정의돼 10간 전부 엉뚱한 지지로 떴고,
 * 양인은 음간에도 부여돼 geokguk 의 양인격(양간만)과 어긋났다. 정통 교리값을
 * getShinsalHitsForDailyTarget(공개 API)로 잠근다.
 */
import { describe, it, expect } from 'vitest'
import { getShinsalHitsForDailyTarget } from '@/lib/saju/shinsal'

const hitKinds = (dayStem: string, target: string): string[] =>
  getShinsalHitsForDailyTarget(dayStem, '子', target).map((h) => h.kind)

describe('암록(暗祿) = 건록의 육합신', () => {
  // 건록 표 × 육합: 甲寅→亥 乙卯→戌 丙巳→申 丁午→未 戊巳→申 己午→未 庚申→巳
  //                辛酉→辰 壬亥→寅 癸子→丑
  const AMNOK: Record<string, string> = {
    甲: '亥',
    乙: '戌',
    丙: '申',
    丁: '未',
    戊: '申',
    己: '未',
    庚: '巳',
    辛: '辰',
    壬: '寅',
    癸: '丑',
  }
  for (const [stem, branch] of Object.entries(AMNOK)) {
    it(`${stem} 일간의 암록은 ${branch}`, () => {
      expect(hitKinds(stem, branch)).toContain('암록')
    })
  }
  it('잘못된 옛 값(甲→酉)은 더 이상 암록이 아니다(회귀 가드)', () => {
    expect(hitKinds('甲', '酉')).not.toContain('암록')
  })
})

describe('양인(羊刃) = 양간(陽干)만', () => {
  // 양간: 甲卯 丙午 戊午 庚酉 壬子
  it('양간은 양인을 갖는다', () => {
    expect(hitKinds('甲', '卯')).toContain('양인')
    expect(hitKinds('丙', '午')).toContain('양인')
    expect(hitKinds('戊', '午')).toContain('양인')
    expect(hitKinds('庚', '酉')).toContain('양인')
    expect(hitKinds('壬', '子')).toContain('양인')
  })
  it('음간은 양인이 없다(乙卯·丁午·己午·辛酉·癸子 모두 비양인)', () => {
    expect(hitKinds('乙', '卯')).not.toContain('양인')
    expect(hitKinds('丁', '午')).not.toContain('양인')
    expect(hitKinds('己', '午')).not.toContain('양인')
    expect(hitKinds('辛', '酉')).not.toContain('양인')
    expect(hitKinds('癸', '子')).not.toContain('양인')
  })
})

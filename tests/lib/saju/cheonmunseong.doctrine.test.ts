/**
 * 천문성(天門星) 도그마 잠금.
 *
 * 천문성 = '하늘의 문'(건괘 戌亥 방위). 원국에 戌/亥 가 있으면 통찰·직관·종교·
 * 철학·역학 인연 — 앱 해석 텍스트('Heavenly Gate Star')와 동일 정의. 예전 코드는
 * 子/午(태극귀인 갑을행을 오기 복붙)였고, 이는 앱 자신의 해석과도 어긋났다.
 * 단일 정의(CHEONMUNSEONG_BRANCHES)를 SSOT 로 두고 그 값과 신살 산출을 잠근다.
 */
import { describe, it, expect } from 'vitest'
import { CHEONMUNSEONG_BRANCHES, getShinsalHitsForDailyTarget } from '@/lib/saju/shinsal'

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

// 천문성은 target branch 단독 기준(일간/일지 무관)이라, 임의 일주로 target 만 바꿔 검사.
const cheonmunFires = (targetBranch: string): boolean =>
  getShinsalHitsForDailyTarget('甲', '子', targetBranch).some((h) => h.kind === '천문성')

describe('천문성(天門星) doctrine', () => {
  it('SSOT 정의는 戌·亥 (건괘 천문 방위)', () => {
    expect([...CHEONMUNSEONG_BRANCHES].sort()).toEqual(['亥', '戌'].sort())
  })

  it('戌·亥 에서만 천문성이 뜨고, 옛 子/午 에서는 안 뜬다', () => {
    for (const br of BRANCHES) {
      const expected = br === '戌' || br === '亥'
      expect(cheonmunFires(br), `branch ${br}`).toBe(expected)
    }
    // 회귀: 예전 버그값 子/午 는 더 이상 천문성이 아니다.
    expect(cheonmunFires('子')).toBe(false)
    expect(cheonmunFires('午')).toBe(false)
  })
})

/**
 * 타이밍/초정밀 레이어의 천간·지지 상수(오행·음양·이름·지장간)가 saju/constants
 * 정본과 어긋나지 않도록 잠그는 가드. 전부 정본에서 파생(import)하므로 자동
 * 통과하지만, 누군가 다시 리터럴로 하드코딩하면서 값을 바꾸면 여기서 바로 실패한다.
 */
import { describe, it, expect } from 'vitest'
import {
  STEMS as CANON_STEMS,
  BRANCHES as CANON_BRANCHES,
  STEM_NAMES,
  BRANCH_NAMES,
  JIJANGGAN,
  JIJANGGAN_ORDERED,
} from '@/lib/saju/constants'
import { STEMS as TIMING_STEMS } from '@/lib/calendar-engine/timing-helpers/timing/constants/stemData'
import {
  BRANCHES as TIMING_BRANCHES,
  BRANCH_ORDER,
} from '@/lib/calendar-engine/timing-helpers/timing/constants/branchData'
import {
  STEMS as ULTRA_STEMS,
  BRANCHES as ULTRA_BRANCHES,
  HOUR_BRANCHES as ULTRA_HOUR_BRANCHES,
  HIDDEN_STEMS as ULTRA_HIDDEN_STEMS,
} from '@/lib/calendar-engine/timing-helpers/ultra-precision-constants'

const asSet = (xs: string[]) => [...xs].sort().join(',')

describe('timing/ultra 천간·지지 상수 ↔ saju/constants 정본 SSOT', () => {
  it('timing stemData.STEMS 의 오행/음양/이름이 정본과 일치', () => {
    for (const s of CANON_STEMS) {
      expect(TIMING_STEMS[s.name]).toEqual({
        name: s.name,
        element: s.element,
        yinYang: s.yin_yang,
      })
    }
    expect(Object.keys(TIMING_STEMS)).toEqual(STEM_NAMES)
  })

  it('timing branchData.BRANCHES 의 오행/음양/이름이 정본과 일치', () => {
    for (const b of CANON_BRANCHES) {
      const entry = TIMING_BRANCHES[b.name]
      expect(entry.name).toBe(b.name)
      expect(entry.element).toBe(b.element)
      expect(entry.yinYang).toBe(b.yin_yang)
    }
    expect(Object.keys(TIMING_BRANCHES)).toEqual(BRANCH_NAMES)
  })

  it('BRANCH_ORDER 가 정본 BRANCH_NAMES 와 동일', () => {
    expect(BRANCH_ORDER).toEqual(BRANCH_NAMES)
  })

  it('ultra-precision 의 천간/지지 이름 배열이 정본과 동일', () => {
    expect(ULTRA_STEMS).toEqual(STEM_NAMES)
    expect(ULTRA_BRANCHES).toEqual(BRANCH_NAMES)
    expect(ULTRA_HOUR_BRANCHES).toEqual(BRANCH_NAMES)
  })

  // 지장간(hiddenStems)도 정본 JIJANGGAN 에서 파생한 강도순 배열(JIJANGGAN_ORDERED)을
  // timing·ultra 가 그대로 쓴다. 글자 구성(집합)은 물론, 배열 자체와 [0]=정기(본기)
  // 순서까지 정본과 정확히 일치해야 한다.
  it('지장간 배열이 정본 JIJANGGAN_ORDERED ↔ timing ↔ ultra 에서 정확히 일치', () => {
    for (const name of BRANCH_NAMES) {
      const ordered = JIJANGGAN_ORDERED[name]
      // 집합은 dict 와, 배열·순서는 ORDERED 와 일치.
      expect(asSet(ordered), `set ${name}`).toBe(asSet(Object.values(JIJANGGAN[name])))
      expect(ordered[0], `정기 first ${name}`).toBe(JIJANGGAN[name]['정기'])
      expect(TIMING_BRANCHES[name].hiddenStems, `timing ${name}`).toEqual(ordered)
      expect(ULTRA_HIDDEN_STEMS[name], `ultra ${name}`).toEqual(ordered)
    }
  })
})

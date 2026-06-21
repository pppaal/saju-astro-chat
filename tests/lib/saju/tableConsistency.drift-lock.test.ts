/**
 * Drift-lock — "derive don't copy" 정합 골든.
 *
 * 같은 사실(천간/지지 → 오행, 지지 본기, 오행 KO↔EN)을 여러 곳이 따로 들고 있으면
 * 한쪽만 고쳐 조용히 어긋난다(이 코드베이스의 반복 실패 클래스). 표를 SSOT 에서
 * 파생하도록 바꾼 곳은 import 가 곧 잠금이고, 의도적으로 별도 표를 두는 곳(궁합
 * 모듈의 Hanja 전용 표·리포트의 리치 라벨)은 이 테스트가 SSOT 와 등가임을 강제한다.
 */
import { describe, it, expect } from 'vitest'
import {
  STEM_TO_ELEMENT,
  BRANCH_TO_ELEMENT,
  JIJANGGAN,
  ELEMENT_KO_TO_EN,
  ELEMENT_EN_TO_KO,
} from '@/lib/saju/constants'
import { STEM_EL, BRANCH_EL, BRANCH_MAIN_STEM } from '@/lib/compatibility/sajuSynastryData'
import { ELEMENT_LABEL } from '@/lib/report/chartLabels'

const STEMS_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

describe('drift-lock: compat saju tables derive from the engine SSOT', () => {
  it('STEM_EL (compat) === STEM_TO_ELEMENT (engine) for every stem', () => {
    expect(Object.keys(STEM_EL).sort()).toEqual([...STEMS_HANJA].sort())
    for (const stem of STEMS_HANJA) {
      expect(STEM_EL[stem], `stem ${stem}`).toBe(STEM_TO_ELEMENT[stem])
    }
  })

  it('BRANCH_EL (compat) === BRANCH_TO_ELEMENT (engine) for every branch', () => {
    expect(Object.keys(BRANCH_EL).sort()).toEqual([...BRANCHES_HANJA].sort())
    for (const br of BRANCHES_HANJA) {
      expect(BRANCH_EL[br], `branch ${br}`).toBe(BRANCH_TO_ELEMENT[br])
    }
  })

  it('BRANCH_MAIN_STEM (compat) === JIJANGGAN 정기 (engine) for every branch', () => {
    expect(Object.keys(BRANCH_MAIN_STEM).sort()).toEqual([...BRANCHES_HANJA].sort())
    for (const br of BRANCHES_HANJA) {
      expect(BRANCH_MAIN_STEM[br], `branch ${br} 본기`).toBe(JIJANGGAN[br]?.['정기'])
    }
  })
})

describe('drift-lock: report ELEMENT_LABEL stays consistent with the element SSOT', () => {
  it('every label.en matches ELEMENT_KO_TO_EN[label.ko]', () => {
    for (const [enKey, label] of Object.entries(ELEMENT_LABEL)) {
      // ko(짧은 한글)는 SSOT 의 KO 키여야 하고, en 은 그 KO 의 SSOT EN 라벨과 일치.
      expect(ELEMENT_KO_TO_EN[label.ko], `${enKey}.ko=${label.ko}`).toBe(label.en)
      // lowercase EN 키 ↔ KO 라운드트립(EN→KO SSOT)도 닫혀 있어야 한다.
      expect(ELEMENT_EN_TO_KO[label.en], `${enKey}.en=${label.en}`).toBe(label.ko)
    }
  })
})

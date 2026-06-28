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
  FIVE_ELEMENT_RELATIONS,
  ELEMENT_RELATIONS_EN,
} from '@/lib/saju/constants'
import {
  STEM_EL,
  BRANCH_EL,
  BRANCH_MAIN_STEM,
  EL_CONTROLS,
} from '@/lib/compatibility/sajuSynastryData'
import { GENERATES, CONTROLS } from '@/lib/saju/elementBridge'
import { ELEMENT_LABEL } from '@/lib/report/chartLabels'

const ELEMENTS_KO = ['목', '화', '토', '금', '수'] as const
const ELEMENTS_EN = ['wood', 'fire', 'earth', 'metal', 'water'] as const

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

describe('drift-lock: 오행 생/극 사이클 — 모든 복제본이 FIVE_ELEMENT_RELATIONS SSOT 와 등가', () => {
  // 오행 생극(生克)은 *방향*이 핵심이라 한 칸만 뒤집혀도 십신·용신·궁합이 조용히
  // 틀어진다. 같은 사이클을 KO(FIVE_ELEMENT_RELATIONS)·EN(ELEMENT_RELATIONS_EN)·
  // elementBridge(EN 단순맵)·compat(EL_CONTROLS) 가 따로 들고 있으므로, 전부 정본
  // 한글표에서 파생됨을 강제한다(20축 감사가 지목한, 잠금 없던 드리프트 면).
  // ELEMENT_KO_TO_EN 은 'Wood'(대문자), ELEMENT_RELATIONS_EN 키는 'wood'(소문자) — 소문자로 정규화.
  const koToEn = (ko: string) => ELEMENT_KO_TO_EN[ko].toLowerCase()
  it('ELEMENT_RELATIONS_EN (정본 EN) === FIVE_ELEMENT_RELATIONS 를 ELEMENT_KO_TO_EN 로 사상', () => {
    for (const ko of ELEMENTS_KO) {
      const en = koToEn(ko)
      expect(ELEMENT_RELATIONS_EN[en].generates, `${ko} 생`).toBe(
        koToEn(FIVE_ELEMENT_RELATIONS.생하는관계[ko])
      )
      expect(ELEMENT_RELATIONS_EN[en].controls, `${ko} 극`).toBe(
        koToEn(FIVE_ELEMENT_RELATIONS.극하는관계[ko])
      )
    }
  })

  it('elementBridge.GENERATES/CONTROLS === ELEMENT_RELATIONS_EN generates/controls', () => {
    expect(Object.keys(GENERATES).sort()).toEqual([...ELEMENTS_EN].sort())
    for (const en of ELEMENTS_EN) {
      expect(GENERATES[en], `${en} generates`).toBe(ELEMENT_RELATIONS_EN[en].generates)
      expect(CONTROLS[en], `${en} controls`).toBe(ELEMENT_RELATIONS_EN[en].controls)
    }
  })

  it('compat EL_CONTROLS (KO) === FIVE_ELEMENT_RELATIONS.극하는관계', () => {
    expect(Object.keys(EL_CONTROLS).sort()).toEqual([...ELEMENTS_KO].sort())
    for (const ko of ELEMENTS_KO) {
      expect(EL_CONTROLS[ko], `${ko} 극`).toBe(FIVE_ELEMENT_RELATIONS.극하는관계[ko])
    }
  })
})

describe('drift-lock: report ELEMENT_LABEL stays consistent with the element SSOT', () => {
  it('every label.en matches ELEMENT_KO_TO_EN[label.ko]', () => {
    for (const [enKey, label] of Object.entries(ELEMENT_LABEL)) {
      // ko(짧은 한글)는 SSOT 의 KO 키여야 하고, en 은 그 KO 의 SSOT EN 라벨과 일치.
      expect(ELEMENT_KO_TO_EN[label.ko], `${enKey}.ko=${label.ko}`).toBe(label.en)
    }
  })
})

/**
 * signalI18n — 신살 이름 EN 정본 표(SHINSAL_NAME_EN)와 translateSignalLabel 의 신살 치환.
 *
 * 재감사 SI-2·CC-4: 신살 표가 11개뿐이라 EN 화면에 '건록'·'문창'·'금여성' 같은 한글이 샜고,
 * '육해' 는 관계어 '해'만 치환돼 '육harm' 이 됐다. 캘린더가 낼 수 있는 신살 전부가 표에 있다.
 */
import { describe, it, expect } from 'vitest'
import {
  SHINSAL_NAME_EN,
  shinsalNameEn,
  translateSignalLabel,
} from '@/lib/calendar-engine/derivers/signalI18n'
import { SHINSAL_POLARITY } from '@/lib/calendar-engine/extractors/saju-shinsal'
import { getShinsalInterpretation } from '@/lib/saju/interpretations'

const HANGUL = /[가-힣]/

describe('SHINSAL_NAME_EN — 신살 이름 EN 정본', () => {
  it('캘린더 신살 전부(SHINSAL_POLARITY 키)가 표에 있고 translateSignalLabel 도 한글 없이 옮긴다', () => {
    for (const name of Object.keys(SHINSAL_POLARITY)) {
      expect(shinsalNameEn(name), name).toBeTruthy()
      const t = translateSignalLabel(name, 'en')
      expect(HANGUL.test(t), `${name} → ${t}`).toBe(false)
    }
  })

  it('영문은 interpretations.json shinsal name_en 과 같다(있는 이름은 전부)', () => {
    for (const [ko, en] of Object.entries(SHINSAL_NAME_EN)) {
      const info = getShinsalInterpretation(ko)
      if (info?.name_en) expect(en, ko).toBe(info.name_en)
    }
  })

  it("부분 치환 없음 — '육해' 는 'Six Harms Star'(예전 '육harm'), '장성살' 은 'General Star'", () => {
    expect(translateSignalLabel('육해', 'en')).toBe('Six Harms Star')
    expect(translateSignalLabel('장성살', 'en')).toBe('General Star')
    expect(translateSignalLabel('건록', 'en')).toBe('Established Stipend')
  })

  it('관계어 공망·원진은 예전 치환(void·resentment)을 유지한다', () => {
    expect(translateSignalLabel('공망', 'en')).toBe('void')
    expect(translateSignalLabel('원진', 'en')).toBe('resentment')
  })

  it('ko 로케일은 그대로', () => {
    expect(translateSignalLabel('건록', 'ko')).toBe('건록')
  })
})

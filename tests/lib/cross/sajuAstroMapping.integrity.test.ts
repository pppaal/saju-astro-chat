// @vitest-environment node
// 교차 사전(SAJU_ASTRO_MAPPINGS) 무결성 — 사주×점성 융합의 SSOT 데이터 가드.
//
// crossInterpret 의 CROSS_INDEX 는 (saju|astro) 키로 Map 을 만들기 때문에
// 중복 쌍은 *조용히* 마지막 항목으로 덮어써진다 — 로직 테스트로는 안 잡히는
// 데이터 결함이라 사전 자체를 직접 검증한다. EN 의미의 한국어 누수도 이 레포의
// 알려진 실패 클래스(글로벌 품질 회귀)라 여기서 잠근다.
import { describe, it, expect } from 'vitest'
import { SAJU_ASTRO_MAPPINGS } from '@/lib/calendar-engine/data/saju-astro-mapping'
import { lookupCross } from '@/lib/cross/crossInterpret'

const HANGUL = /[가-힣]/

describe('SAJU_ASTRO_MAPPINGS 무결성', () => {
  it('(saju, astro) 쌍이 중복되지 않는다 — 중복은 CROSS_INDEX 에서 조용히 덮어써짐', () => {
    const seen = new Map<string, number>()
    const dupes: string[] = []
    SAJU_ASTRO_MAPPINGS.forEach((m, i) => {
      const key = `${m.saju}|${m.astro}`
      if (seen.has(key)) dupes.push(`${key} (index ${seen.get(key)} vs ${i})`)
      seen.set(key, i)
    })
    expect(dupes).toEqual([])
  })

  it('모든 항목이 ko/en 의미를 갖고, ko 는 한국어·en 은 한국어 무누수', () => {
    for (const m of SAJU_ASTRO_MAPPINGS) {
      const label = `${m.saju}×${m.astro}`
      expect(m.meaning.ko.trim(), `${label} ko meaning 비어 있음`).not.toBe('')
      expect(m.meaning.en.trim(), `${label} en meaning 비어 있음`).not.toBe('')
      expect(HANGUL.test(m.meaning.ko), `${label} ko meaning 에 한국어 없음`).toBe(true)
      expect(HANGUL.test(m.meaning.en), `${label} en meaning 에 한국어 누수: ${m.meaning.en}`).toBe(
        false
      )
    }
  })

  it('polarity 는 정의된 범위(-2..2)·grade 는 A/B/C', () => {
    for (const m of SAJU_ASTRO_MAPPINGS) {
      const label = `${m.saju}×${m.astro}`
      expect([-2, -1, 0, 1, 2], `${label} polarity=${m.polarity}`).toContain(m.polarity)
      expect(['A', 'B', 'C'], `${label} grade=${m.grade}`).toContain(m.grade)
    }
  })

  it('사전의 모든 쌍이 lookupCross 로 왕복 조회된다 (인덱스-사전 정합)', () => {
    for (const m of SAJU_ASTRO_MAPPINGS) {
      const hit = lookupCross(m.saju, m.astro)
      expect(hit, `${m.saju}×${m.astro} 인덱스 miss`).not.toBeNull()
      // 중복이 없으므로 인덱스가 돌려주는 항목은 사전 항목 그 자체여야 한다.
      expect(hit).toBe(m)
    }
  })

  it('십신 1차 등치(정통 페어)가 사전에 존재한다 — 대표 매핑 회귀 가드', () => {
    // 리포트의 십신→대표행성 단일화가 기대는 정통 등치 쌍. 사전 리팩터링 때
    // 실수로 빠지면 리포트 대표 교차가 통째로 사라진다.
    const canonical: Array<[string, string]> = [
      ['정관', 'Saturn'],
      ['편관', 'Mars'],
      ['정재', 'Venus'],
      ['정인', 'Jupiter'],
    ]
    for (const [saju, astro] of canonical) {
      expect(lookupCross(saju, astro), `${saju}×${astro} 정통 등치 누락`).not.toBeNull()
    }
  })
})

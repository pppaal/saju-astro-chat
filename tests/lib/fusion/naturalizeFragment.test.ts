import { describe, it, expect } from 'vitest'
import { naturalizeFragment, plainifyKo } from '@/lib/fusion/lifeReport/templates/sentences'
import { allRules } from '@/lib/fusion/rules'
import { RULE_NARRATIVE_EN } from '@/lib/fusion/rules/narrativeEn'

describe('plainifyKo — stylized 결 → 성향', () => {
  it('replaces the standalone noun 결 in its various forms', () => {
    expect(plainifyKo('천천히 쌓는 형의 재물 결.')).toBe('천천히 쌓는 형의 재물 성향.')
    expect(plainifyKo('관계가 핵심인 결이에요.')).toBe('관계가 핵심인 성향이에요.')
    expect(plainifyKo('자기 결의 기반.')).toBe('자기 성향의 기반.')
    expect(plainifyKo('그 결이 자아 영역에서 드러나요.')).toBe('그 성향이 자아 영역에서 드러나요.')
    expect(plainifyKo('잡힌 결로, 회복력이 좋아요.')).toBe('잡힌 성향으로, 회복력이 좋아요.')
    expect(plainifyKo('권력 영역의 특수 결.')).toBe('권력 영역의 특별한 성향.')
  })

  it('never touches compounds that merely contain 결', () => {
    const compounds =
      '결단과 정의, 관계 결합, 결산 습관, 결과로 끝맺기, 결혼 시기, 결정적 시기, 문제 해결, 연결고리'
    expect(plainifyKo(compounds)).toBe(compounds)
  })

  it('leaves strings without 결 (incl. English) untouched', () => {
    expect(plainifyKo('a steady wealth pattern.')).toBe('a steady wealth pattern.')
    expect(plainifyKo('관계가 평생 핵심 테마.')).toBe('관계가 평생 핵심 테마.')
  })
})

const SURFACED_DOMAINS = new Set([
  'money',
  'career',
  'love',
  'family',
  'health',
  'children',
  'wisdom',
  'creativity',
  'spirituality',
])

describe('naturalizeFragment', () => {
  it('drops the technical evidence clause before the em-dash', () => {
    const raw = '사주 정재격 + 점성 Saturn 2궁 stellium — 천천히 쌓는 형의 재물 결.'
    expect(naturalizeFragment(raw)).toBe('천천히 쌓는 형의 재물 결.')
  })

  it('scrubs residual English planet names into Korean', () => {
    expect(naturalizeFragment('Jupiter와 Venus가 함께 닿는 결.')).toBe(
      '목성와 금성가 함께 닿는 결.'
    )
  })

  it('scrubs astro jargon tokens (stellium/dignity/element words)', () => {
    const out = naturalizeFragment('fire 사인 stellium 의 dignity 패턴')
    expect(out).toBe('불 사인 밀집 의 제 자리 패턴')
  })

  it('returns the (scrubbed) original when there is no evidence clause', () => {
    expect(naturalizeFragment('관계가 평생 핵심 테마.')).toBe('관계가 평생 핵심 테마.')
  })

  it('softens classical hanja idioms', () => {
    expect(naturalizeFragment('— 평생 재물·자산이 인생 중심인 특수 결. 재성 운에 형통.')).toBe(
      '평생 재물·자산이 인생 중심인 특수 결. 재물의 시기에 크게 풀림.'
    )
  })

  it('leaves no raw jargon in any surfaced (non-timing) confirm/conflict narrative', () => {
    // The free report surfaces confirm/conflict for these domains (self is
    // not surfaced, timing layer is filtered out at the route projection).
    const surfaced = SURFACED_DOMAINS
    // Korean prose has no latin lowercase, so any 3+ lowercase run is an
    // un-scrubbed English jargon token (planet names, stellium, dignity…).
    // Upper-case loanwords like "CEO" are acceptable and intentionally allowed.
    const jargon = /[a-z]{3,}|사주\s|점성|형통/
    const offenders: string[] = []
    for (const r of allRules) {
      if (r.layer === 'timing' || !surfaced.has(r.domain)) continue
      for (const key of ['confirm', 'conflict'] as const) {
        const raw = r.narrative?.[key]
        if (!raw) continue
        const out = naturalizeFragment(raw)
        if (jargon.test(out)) offenders.push(`${r.id}/${key}: ${out}`)
      }
    }
    expect(offenders).toEqual([])
  })
})

describe('RULE_NARRATIVE_EN — English parity for surfaced fragments', () => {
  const surfacedRules = allRules.filter(
    (r) => r.layer !== 'timing' && SURFACED_DOMAINS.has(r.domain)
  )

  it('provides an English confirm for every surfaced rule', () => {
    const missing = surfacedRules.filter((r) => !RULE_NARRATIVE_EN[r.id]?.confirm).map((r) => r.id)
    expect(missing).toEqual([])
  })

  it('provides an English conflict wherever the Korean rule defines one', () => {
    const missing = surfacedRules
      .filter((r) => r.narrative?.conflict && !RULE_NARRATIVE_EN[r.id]?.conflict)
      .map((r) => r.id)
    expect(missing).toEqual([])
  })

  it('has no orphan keys that do not map to a surfaced rule', () => {
    const surfacedIds = new Set(surfacedRules.map((r) => r.id))
    const orphans = Object.keys(RULE_NARRATIVE_EN).filter((id) => !surfacedIds.has(id))
    expect(orphans).toEqual([])
  })

  it('keeps English fragments free of Korean characters', () => {
    const hangul = /[가-힣]/
    const offenders: string[] = []
    for (const [id, en] of Object.entries(RULE_NARRATIVE_EN)) {
      if (hangul.test(en.confirm)) offenders.push(`${id}/confirm`)
      if (en.conflict && hangul.test(en.conflict)) offenders.push(`${id}/conflict`)
    }
    expect(offenders).toEqual([])
  })
})

/**
 * natalCross 교차 해석 — 강화 회귀 스위트.
 *
 * 기존 natalCross.test.ts 가 기본 톤 분기를 다룬다면, 이 파일은 최근 추가된
 * 개인화 로직(성별 육친 / 오행 정확 분포 / 공기 별자리 라벨 교정 / 변주 결정성)
 * 과 전역 불변식(EN 한글 누출 0 / 결정성)을 잠근다. 천체력 불필요 — eval 함수는
 * 원시값만 받으므로 mock 환경에서 빠르게 돈다.
 */
import { describe, it, expect } from 'vitest'
import {
  evalIdentity,
  evalRomance,
  evalRelations,
  evalNeeds,
  evalStrength,
  evalDrive,
  synthesize,
  type CrossVerdict,
} from '@/lib/report/natalCross'

const HANGUL = /[가-힣]/
const SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]
const ELS = ['목', '화', '토', '금', '수']

describe('교차 — 성별 배우자성(연애축)', () => {
  it('남자는 재성, 여자는 관성을 배우자 자리로 명시', () => {
    const m = evalRomance(true, true, 1, 'male', 2)!
    const f = evalRomance(true, true, 1, 'female', 2)!
    expect(m.reason.ko).toContain('남자')
    expect(m.reason.ko).toContain('재성')
    expect(f.reason.ko).toContain('여자')
    expect(f.reason.ko).toContain('관성')
    // 같은 차트라도 성별이 다르면 본문이 갈린다
    expect(m.reason.ko).not.toBe(f.reason.ko)
    expect(m.reason.en).not.toBe(f.reason.en)
  })
  it('배우자성 유무로 문구가 갈린다', () => {
    const present = evalRomance(true, false, 0, 'male', 3)!
    const absent = evalRomance(true, false, 0, 'male', 0)!
    expect(present.reason.ko).not.toBe(absent.reason.ko)
    expect(present.reason.ko).toContain('또렷')
    expect(absent.reason.ko).toContain('스스로')
  })
  it('배우자성만 있어도(도화·금성 없음) 축이 뜬다', () => {
    expect(evalRomance(false, false, 0, 'male', 2)).not.toBeNull()
    expect(evalRomance(false, false, 0, 'male', 0)).toBeNull()
  })
})

describe('교차 — 성별 자식성(관계축)', () => {
  it('남자는 관성, 여자는 식상을 자식 자리로 명시', () => {
    const m = evalRelations(3, 0, 4, 1, 'male', 2)!
    const f = evalRelations(3, 0, 4, 1, 'female', 2)!
    expect(m.reason.ko).toContain('관성')
    expect(f.reason.ko).toContain('식상')
    expect(m.reason.ko).not.toBe(f.reason.ko)
  })
  it('관계 본문 톤은 성별과 무관하게 유지된다', () => {
    expect(evalRelations(3, 0, 4, 1, 'male', 0)!.tone).toBe('resonant')
    expect(evalRelations(0, 3, 1, 4, 'female', 0)!.tone).toBe('tension')
  })
})

describe('교차 — 종합에 오행 정확 분포 주입', () => {
  const verdicts: CrossVerdict[] = [
    { tone: 'resonant', reason: { ko: 'x', en: 'x' } },
    { tone: 'complement', reason: { ko: 'y', en: 'y' } },
  ]
  it('우세 원소+개수와 결핍 원소를 문장에 담는다', () => {
    const s = synthesize(verdicts, undefined, { wood: 3, fire: 0, earth: 2, metal: 2, water: 1 })!
    expect(s.text.ko).toContain('목')
    expect(s.text.ko).toContain('3개')
    expect(s.text.ko).toContain('화') // 결핍(0)
    expect(s.text.en).toMatch(/Wood is thickest at 3/)
  })
  it('분포가 다르면 종합 문장이 달라진다', () => {
    const a = synthesize(verdicts, undefined, { wood: 3, fire: 0, earth: 2, metal: 2, water: 1 })!
    const b = synthesize(verdicts, undefined, { wood: 0, fire: 6, earth: 1, metal: 1, water: 0 })!
    expect(a.text.ko).not.toBe(b.text.ko)
  })
  it('다섯 기운이 고르면 균형형 문구', () => {
    const s = synthesize(verdicts, undefined, { wood: 2, fire: 2, earth: 2, metal: 1, water: 1 })!
    expect(s.text.ko).toContain('고르게')
  })
  it('elementCounts 없으면 분포 문장 생략(하위호환)', () => {
    const s = synthesize(verdicts)!
    expect(s.text.ko).not.toContain('오행으로 보면')
  })
})

describe('교차 — 공기 별자리 라벨 교정(정체성축)', () => {
  it('공기 태양은 木이 아니라 "공기 · 퍼뜨리고 연결하는"으로 표기', () => {
    const v = evalIdentity('금', 'Aquarius')! // 물병=공기
    expect(v.right?.ko).toContain('공기')
    expect(v.right?.ko).toContain('퍼뜨리고 연결하는')
    expect(v.right?.ko).not.toContain('목')
  })
  it('일간木 + 공기태양(같은 木 매핑)이라도 "둘 다 뻗어나가" 모순이 없다', () => {
    const v = evalIdentity('목', 'Gemini')! // 쌍둥이=공기→木, same 관계
    expect(v.tone).toBe('resonant')
    expect(v.reason.ko).not.toContain('둘 다 뻗어나가 키우는')
    expect(v.reason.ko).toContain('뿌리는 같은 흐름')
  })
  it('공기 아닌 별자리는 정상 오행 라벨', () => {
    expect(evalIdentity('화', 'Leo')!.right?.ko).toContain('화') // 사자=화
    expect(evalIdentity('수', 'Cancer')!.right?.ko).toContain('수') // 게=수
  })
})

describe('미활용 데이터 활성화 (slice 1)', () => {
  it('기신: 욕망축에 "채울 건 X, 피할 건 Y" 덧붙음', () => {
    const withAvoid = evalNeeds('화', 'Leo', '금')!
    const without = evalNeeds('화', 'Leo')!
    expect(withAvoid.reason.ko).toContain('피할 건')
    expect(withAvoid.reason.ko).toContain('금')
    expect(without.reason.ko).not.toContain('피할 건')
    // 용신과 기신이 같으면 덧붙이지 않음
    expect(evalNeeds('화', 'Leo', '화')!.reason.ko).not.toContain('피할 건')
  })
  it('통근: 강점축에 rooted 분기', () => {
    const rooted = evalStrength('제왕', null, true)!
    const unrooted = evalStrength('제왕', null, false)!
    const unknown = evalStrength('제왕', null)!
    expect(rooted.reason.ko).toContain('통근')
    expect(unrooted.reason.ko).toContain('통근하지 못해')
    expect(rooted.reason.ko).not.toBe(unrooted.reason.ko)
    expect(unknown.reason.ko).not.toContain('통근')
  })
  it('궁위: 연애축에 일지 충/합 분기', () => {
    const clash = evalRomance(true, true, 1, 'male', 1, true, false)!
    const combine = evalRomance(true, true, 1, 'male', 1, false, true)!
    const none = evalRomance(true, true, 1, 'male', 1, false, false)!
    expect(clash.reason.ko).toContain('일지(배우자궁)에 충')
    expect(combine.reason.ko).toContain('일지(배우자궁)에 합')
    expect(none.reason.ko).not.toContain('일지(배우자궁)')
  })
  it('slice1 EN 한글 누출 없음', () => {
    expect(HANGUL.test(evalNeeds('화', 'Leo', '금')!.reason.en)).toBe(false)
    expect(HANGUL.test(evalStrength('제왕', null, false)!.reason.en)).toBe(false)
    expect(HANGUL.test(evalRomance(true, true, 1, 'male', 1, true, false)!.reason.en)).toBe(false)
  })
})

describe('dignity 강도 활성화 (slice 2)', () => {
  it('추진 행성 dignity로 추진력축 뉘앙스 분기', () => {
    const strong = evalDrive('신강', true, 'strong')!
    const weak = evalDrive('신강', true, 'weak')!
    const neutral = evalDrive('신강', true, 'neutral')!
    expect(strong.reason.ko).toContain('거침없이')
    expect(weak.reason.ko).toContain('엇나가')
    expect(neutral.reason.ko).not.toContain('거침없이')
    expect(strong.reason.ko).not.toBe(weak.reason.ko)
  })
  it('selfEmphasized=false면 dignity 절 무시(태양·화성 안 강조)', () => {
    expect(evalDrive('신강', false, 'strong')!.reason.ko).not.toContain('거침없이')
  })
  it('slice2 EN 한글 누출 없음', () => {
    expect(HANGUL.test(evalDrive('신강', true, 'strong')!.reason.en)).toBe(false)
    expect(HANGUL.test(evalDrive('신약', true, 'weak')!.reason.en)).toBe(false)
  })
})

describe('불변식 — 결정성(같은 입력 → 같은 출력)', () => {
  it('evalIdentity 재호출 동일', () => {
    expect(JSON.stringify(evalIdentity('금', 'Aquarius', 'Leo'))).toBe(
      JSON.stringify(evalIdentity('금', 'Aquarius', 'Leo'))
    )
  })
  it('synthesize 재호출 동일', () => {
    const v: CrossVerdict[] = [{ tone: 'tension', reason: { ko: 'a', en: 'a' } }]
    const counts = { wood: 1, fire: 2, earth: 3, metal: 1, water: 1 }
    expect(JSON.stringify(synthesize(v, undefined, counts))).toBe(
      JSON.stringify(synthesize(v, undefined, counts))
    )
  })
})

describe('불변식 — EN 경로에 한글 누출 0', () => {
  it('evalIdentity: 모든 오행×별자리 조합의 EN 본문/라벨에 한글 없음', () => {
    for (const el of ELS) {
      for (const sign of SIGNS) {
        const v = evalIdentity(el, sign, sign)
        if (!v) continue
        expect(HANGUL.test(v.reason.en), `EN reason: ${el}/${sign}`).toBe(false)
        expect(HANGUL.test(v.left?.en ?? ''), `EN left: ${el}/${sign}`).toBe(false)
        expect(HANGUL.test(v.right?.en ?? ''), `EN right: ${el}/${sign}`).toBe(false)
      }
    }
  })
  it('성별 육친 EN 본문에 한글 없음', () => {
    for (const g of ['male', 'female'] as const) {
      for (const cnt of [0, 2]) {
        expect(HANGUL.test(evalRomance(true, true, 1, g, cnt)!.reason.en)).toBe(false)
        expect(HANGUL.test(evalRelations(3, 0, 4, 1, g, cnt)!.reason.en)).toBe(false)
      }
    }
  })
  it('종합 분포 EN 본문에 한글 없음(한자 병기 제외)', () => {
    const v: CrossVerdict[] = [{ tone: 'resonant', reason: { ko: 'a', en: 'a' } }]
    const s = synthesize(v, undefined, { wood: 3, fire: 0, earth: 2, metal: 2, water: 1 })!
    expect(HANGUL.test(s.text.en)).toBe(false)
  })
})

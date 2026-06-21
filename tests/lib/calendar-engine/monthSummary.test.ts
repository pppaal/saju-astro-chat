import { describe, it, expect } from 'vitest'
import {
  deriveMonthSummary,
  type MonthSummaryInput,
} from '@/lib/calendar-engine/derivers/monthSummary'

/**
 * deriveMonthSummary — 월 데이터 조각을 한 문단 총평으로 합성하는 순수 함수.
 */

const base: MonthSummaryInput = {
  goodDays: 5,
  cautionDays: 5,
  totalDays: 30,
  topReasons: [],
  lang: 'ko',
}

describe('deriveMonthSummary — 전반 톤(bright/mixed/careful)', () => {
  it('good >= caution*2 면 bright 톤(순한 흐름)', () => {
    const s = deriveMonthSummary({ ...base, goodDays: 10, cautionDays: 4 })
    expect(s).toContain('순하게 풀리는')
  })

  it('caution > good 이면 careful 톤(조심스러운 결)', () => {
    const s = deriveMonthSummary({ ...base, goodDays: 3, cautionDays: 8 })
    expect(s).toContain('조심스러운 결')
  })

  it('나머지는 mixed 톤(굴곡)', () => {
    const s = deriveMonthSummary({ ...base, goodDays: 5, cautionDays: 5 })
    expect(s).toContain('굴곡이 또렷한')
  })

  it('영문 bright/careful/mixed 톤도 분기된다', () => {
    expect(deriveMonthSummary({ ...base, lang: 'en', goodDays: 10, cautionDays: 4 })).toContain(
      'favorable month'
    )
    expect(deriveMonthSummary({ ...base, lang: 'en', goodDays: 3, cautionDays: 8 })).toContain(
      'steadier hand'
    )
    expect(deriveMonthSummary({ ...base, lang: 'en', goodDays: 5, cautionDays: 5 })).toContain(
      'A month of swings'
    )
  })
})

describe('deriveMonthSummary — 날수/우룬 문구', () => {
  it('total>0 이면 날수 문구가 한글로 섞인다', () => {
    const s = deriveMonthSummary({ ...base, totalDays: 30, goodDays: 12, cautionDays: 6 })
    expect(s).toContain('전체 30일')
    expect(s).toContain('12일')
    expect(s).toContain('6일')
  })

  it('total=0 이면 날수 문구가 생략된다', () => {
    const s = deriveMonthSummary({ ...base, totalDays: 0, goodDays: 0, cautionDays: 0 })
    expect(s).not.toContain('전체')
  })

  it('영문은 날수 문구가 영문으로 섞인다', () => {
    const s = deriveMonthSummary({
      ...base,
      lang: 'en',
      totalDays: 28,
      goodDays: 14,
      cautionDays: 6,
    })
    expect(s).toContain('Of its 28 days')
  })

  it('woolunKr 가 있으면 한글 도입에 "OO월은" 으로 들어간다', () => {
    const s = deriveMonthSummary({ ...base, woolunKr: '갑오', goodDays: 10, cautionDays: 3 })
    expect(s).toContain('갑오월은')
  })

  it('영문 로케일에서는 woolunKr 가 도입에 안 들어간다', () => {
    const s = deriveMonthSummary({
      ...base,
      lang: 'en',
      woolunKr: '갑오',
      goodDays: 10,
      cautionDays: 3,
    })
    expect(s).not.toContain('갑오')
  })
})

describe('deriveMonthSummary — 지배 테마(themePhrase)', () => {
  it('topReasons 가 있으면 테마 문장이 들어간다(상위 2개)', () => {
    const s = deriveMonthSummary({
      ...base,
      topReasons: ['목성 좋은 자리(고양) (게자리)', '토성 압박', '추가 신호'],
    })
    expect(s).toContain('무엇보다')
    expect(s).toContain('목성 좋은 자리')
    // 괄호 그룹(글로스/별자리)은 제거된다.
    expect(s).not.toContain('(고양)')
    expect(s).not.toContain('(게자리)')
    // 3번째 테마는 잘려서 안 들어간다.
    expect(s).not.toContain('추가 신호')
  })

  it('topReasons 가 비면 테마 문장이 생략된다', () => {
    const s = deriveMonthSummary({ ...base, topReasons: [] })
    expect(s).not.toContain('무엇보다')
  })

  it('선행 마크·라벨·꼬리(— 설명)는 coreReason 으로 정리된다', () => {
    const s = deriveMonthSummary({
      ...base,
      topReasons: ['↑ [month] 이달 · 강한 재성 흐름 — 자세한 설명'],
    })
    expect(s).toContain('강한 재성 흐름')
    expect(s).not.toContain('자세한 설명')
    expect(s).not.toContain('[month]')
  })

  it('정리 후 빈 문자열이 되는 테마는 필터된다', () => {
    const s = deriveMonthSummary({ ...base, topReasons: ['(글로스만)', '실제 테마'] })
    expect(s).toContain('실제 테마')
  })

  it('영문 테마는 and 로 연결된다', () => {
    const s = deriveMonthSummary({ ...base, lang: 'en', topReasons: ['Jupiter', 'Saturn'] })
    expect(s).toContain('Above all')
    expect(s).toContain('Jupiter and Saturn')
  })
})

describe('deriveMonthSummary — 가장 좋은 날', () => {
  it('bestDay 가 있으면 날짜가 한글 포맷으로 들어간다', () => {
    const s = deriveMonthSummary({ ...base, bestDay: '03-15' })
    expect(s).toContain('3월 15일')
    expect(s).toContain('미뤄둔 일')
  })

  it('bestDayReason 이 있으면 이유가 — 로 덧붙는다', () => {
    const s = deriveMonthSummary({ ...base, bestDay: '03-15', bestDayReason: '재성 절정 — 디테일' })
    expect(s).toContain('재성 절정')
    expect(s).not.toContain('디테일')
  })

  it('영문 bestDay 는 M/D 포맷', () => {
    const s = deriveMonthSummary({ ...base, lang: 'en', bestDay: '03-15' })
    expect(s).toContain('3/15')
  })

  it('잘못된 MM-DD(파싱 실패)는 원본 그대로 출력된다', () => {
    const s = deriveMonthSummary({ ...base, bestDay: 'XX-YY' })
    expect(s).toContain('XX-YY')
  })
})

describe('deriveMonthSummary — 조심할 날 / 수렴일', () => {
  it('cautionDay 는 "다만" 으로 전환된다', () => {
    const s = deriveMonthSummary({ ...base, cautionDay: '03-20' })
    expect(s).toContain('다만')
    expect(s).toContain('3월 20일')
  })

  it('convergeDate 가 bestDay 와 다르면 "또" 로 덧붙는다', () => {
    const s = deriveMonthSummary({ ...base, bestDay: '03-15', convergeDate: '03-25' })
    expect(s).toContain('또')
    expect(s).toContain('3월 25일')
    expect(s).toContain('분기점')
  })

  it('convergeDate 가 bestDay 와 같으면 중복 출력하지 않는다', () => {
    const s = deriveMonthSummary({ ...base, bestDay: '03-15', convergeDate: '03-15' })
    expect(s).not.toContain('분기점')
  })

  it('영문 cautionDay / convergeDate 도 영문 문구로 나온다', () => {
    const s = deriveMonthSummary({
      ...base,
      lang: 'en',
      cautionDay: '03-20',
      bestDay: '03-10',
      convergeDate: '03-25',
    })
    expect(s).toContain('That said')
    expect(s).toContain('pivot where Saju and astrology converge')
  })
})

describe('deriveMonthSummary — 마무리 문장(톤별)', () => {
  it('bright 톤 마무리', () => {
    const s = deriveMonthSummary({ ...base, goodDays: 10, cautionDays: 2 })
    expect(s).toContain('밀어붙여 보세요')
  })

  it('careful 톤 마무리', () => {
    const s = deriveMonthSummary({ ...base, goodDays: 2, cautionDays: 9 })
    expect(s).toContain('마무리와 점검')
  })

  it('mixed 톤 마무리', () => {
    const s = deriveMonthSummary({ ...base, goodDays: 5, cautionDays: 5 })
    expect(s).toContain('리듬만 지키면')
  })

  it('영문 마무리 3종', () => {
    expect(deriveMonthSummary({ ...base, lang: 'en', goodDays: 10, cautionDays: 2 })).toContain(
      'this is the time to push'
    )
    expect(deriveMonthSummary({ ...base, lang: 'en', goodDays: 2, cautionDays: 9 })).toContain(
      'it passes smoothly'
    )
    expect(deriveMonthSummary({ ...base, lang: 'en', goodDays: 5, cautionDays: 5 })).toContain(
      'the rhythm carries you through'
    )
  })
})

describe('deriveMonthSummary — 통합 출력', () => {
  it('모든 조각이 한 문단(공백 join)으로 합쳐진다', () => {
    const s = deriveMonthSummary({
      woolunKr: '갑오',
      goodDays: 12,
      cautionDays: 4,
      totalDays: 30,
      topReasons: ['목성 확장', '재성 강세'],
      bestDay: '03-15',
      bestDayReason: '절정',
      cautionDay: '03-20',
      convergeDate: '03-25',
      lang: 'ko',
    })
    expect(s).toContain('갑오월은')
    expect(s).toContain('무엇보다')
    expect(s).toContain('3월 15일')
    expect(s).toContain('다만')
    expect(s).toContain('또')
    // 줄바꿈 없이 한 문단.
    expect(s).not.toContain('\n')
    expect(s.length).toBeGreaterThan(50)
  })
})

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
    // bright 변형은 모두 "순하게" 흐름을 묘사한다(어떤 시드든).
    expect(s).toContain('순하게')
  })

  it('caution > good 이면 careful 톤(조심스러운 결)', () => {
    const s = deriveMonthSummary({ ...base, goodDays: 3, cautionDays: 8 })
    expect(s).toContain('조심스러운 결')
  })

  it('나머지는 mixed 톤(굴곡)', () => {
    const s = deriveMonthSummary({ ...base, goodDays: 5, cautionDays: 5 })
    expect(s).toContain('굴곡이 또렷한')
  })

  it('나쁜 날(avoidDays)은 주의-측에 합산돼 톤을 뒤집지 않는다', () => {
    // 좋은 8 · 주의 3 · 나쁜 19 인 달: avoid 를 무시하면 good(8)>=caution(3)*2 라
    // 'bright'(순한 달)로 뒤집힌다. avoid 를 주의-측(3+19=22)에 합산하면 caution>good
    // 이라 'careful'(조심스러운 결)이 정답.
    const s = deriveMonthSummary({ ...base, goodDays: 8, cautionDays: 3, avoidDays: 19 })
    // 톤은 careful — bright 도입("전반적으로 …순하게 풀리는")이 아니다.
    expect(s).toContain('조심스러운 결')
    // 날수 문구의 주의-측 숫자도 22(=3+19)로 나와, 나쁜 날이 증발하지 않는다.
    expect(s).toContain('22일')
  })

  it('avoidDays 미지정은 0 과 동일(하위호환)', () => {
    expect(deriveMonthSummary({ ...base, goodDays: 8, cautionDays: 3 })).toEqual(
      deriveMonthSummary({ ...base, goodDays: 8, cautionDays: 3, avoidDays: 0 })
    )
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
    // 동적 날수 슬롯은 어떤 변형에서도 그대로 들어간다.
    expect(s).toContain('30일')
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
    expect(s).toContain('28 days')
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
    // 연결어(무엇보다/그 중심에는…)는 시드별로 달라지지만 '이 달의 결'은 모든 변형 공통.
    expect(s).toContain('이 달의 결')
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
    // 영문 테마는 'and' 로 연결된다(연결어 자체는 시드별로 달라짐).
    expect(s).toContain('Jupiter and Saturn')
  })
})

describe('deriveMonthSummary — 가장 좋은 날', () => {
  it('bestDay 가 있으면 날짜가 한글 포맷으로 들어간다', () => {
    const s = deriveMonthSummary({ ...base, bestDay: '03-15' })
    expect(s).toContain('3월 15일')
    // 모든 좋은-날 변형은 '무게가 실리는/실려요' 로 가장 좋은 날을 묘사한다.
    expect(s).toContain('무게')
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

  it('convergeDate 가 cautionDay 와 같으면 수렴 문장을 생략한다(같은 날 이중 언급 방지)', () => {
    const s = deriveMonthSummary({ ...base, cautionDay: '03-20', convergeDate: '03-20' })
    // '조심할 날'(다만)만 나오고 '분기점'(수렴) 문장은 안 붙는다.
    expect(s).toContain('3월 20일')
    expect(s).not.toContain('분기점')
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
    // 모든 수렴일 변형은 Saju×astrology 'pivot' 으로 표현된다(연결 문구는 시드별 차이).
    expect(s).toContain('pivot')
    expect(s).toContain('Saju and astrology')
  })
})

describe('deriveMonthSummary — 마무리 문장(톤별)', () => {
  // 마무리 변형은 톤별 풀에서 시드로 회전한다. 모든 변형 공통 키워드로 확인.
  it('bright 톤 마무리', () => {
    const s = deriveMonthSummary({ ...base, goodDays: 10, cautionDays: 2 })
    expect(s).toContain('달이니')
  })

  it('careful 톤 마무리', () => {
    const s = deriveMonthSummary({ ...base, goodDays: 2, cautionDays: 9 })
    expect(s).toContain('마무리와 점검')
  })

  it('mixed 톤 마무리', () => {
    const s = deriveMonthSummary({ ...base, goodDays: 5, cautionDays: 5 })
    expect(s).toContain('리듬')
  })

  it('영문 마무리 3종', () => {
    expect(deriveMonthSummary({ ...base, lang: 'en', goodDays: 10, cautionDays: 2 })).toContain(
      'time to push'
    )
    expect(deriveMonthSummary({ ...base, lang: 'en', goodDays: 2, cautionDays: 9 })).toContain(
      'passes smoothly'
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
    expect(s).toContain('이 달의 결')
    expect(s).toContain('3월 15일')
    expect(s).toContain('다만')
    expect(s).toContain('분기점') // 수렴일(연결어 또/더불어… 는 시드별로 달라짐)
    // 줄바꿈 없이 한 문단.
    expect(s).not.toContain('\n')
    expect(s.length).toBeGreaterThan(50)
  })
})

describe('deriveMonthSummary — 개인화 시드(seed)', () => {
  const rich: MonthSummaryInput = {
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
  }

  it('다른 시드는 동일 입력에서도 다른 문구를 만든다', () => {
    const a = deriveMonthSummary({ ...rich, seed: 1 })
    const b = deriveMonthSummary({ ...rich, seed: 2 })
    expect(a).not.toEqual(b)
  })

  it('seed 없으면 seed=0 과 동일(기본값 안정)', () => {
    expect(deriveMonthSummary(rich)).toEqual(deriveMonthSummary({ ...rich, seed: 0 }))
  })

  it('같은 시드+입력은 재현 가능(결정론적)', () => {
    expect(deriveMonthSummary({ ...rich, seed: 42 })).toEqual(
      deriveMonthSummary({ ...rich, seed: 42 })
    )
  })

  it('큰/음수 시드도 빈 풀 에러 없이 한 변형을 고른다', () => {
    expect(deriveMonthSummary({ ...rich, seed: 2 ** 31 }).length).toBeGreaterThan(50)
    expect(deriveMonthSummary({ ...rich, seed: -7 }).length).toBeGreaterThan(50)
  })

  it('시드가 달라도 판단(날수·날짜·근거)은 그대로 유지된다', () => {
    for (const seed of [0, 1, 7, 99, 12345]) {
      const s = deriveMonthSummary({ ...rich, seed })
      expect(s).toContain('30일')
      expect(s).toContain('12일')
      expect(s).toContain('4일')
      expect(s).toContain('3월 15일') // bestDay
      expect(s).toContain('3월 20일') // cautionDay
      expect(s).toContain('3월 25일') // convergeDate
      expect(s).toContain('절정') // bestDayReason
      expect(s).toContain('갑오월은')
      expect(s).toContain('목성 확장')
      expect(s).not.toContain('\n')
    }
  })

  it('영문도 시드별로 변형되며 동적 슬롯은 유지된다', () => {
    const en = { ...rich, lang: 'en' as const }
    const a = deriveMonthSummary({ ...en, seed: 1 })
    const b = deriveMonthSummary({ ...en, seed: 2 })
    expect(a).not.toEqual(b)
    for (const seed of [0, 1, 2, 3]) {
      const s = deriveMonthSummary({ ...en, seed })
      expect(s.length).toBeGreaterThan(50)
      expect(s).toContain('30 days')
      expect(s).toContain('3/15')
      expect(s).toContain('3/20')
      expect(s).toContain('3/25')
    }
  })

  it('ko/en 모두 비어있지 않은 문단을 만든다', () => {
    expect(deriveMonthSummary({ ...rich, lang: 'ko', seed: 5 }).trim().length).toBeGreaterThan(0)
    expect(deriveMonthSummary({ ...rich, lang: 'en', seed: 5 }).trim().length).toBeGreaterThan(0)
  })
})

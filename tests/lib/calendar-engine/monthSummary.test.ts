import { describe, it, expect } from 'vitest'
import {
  deriveMonthSummary,
  monthThemeCandidates,
  selectMonthThemes,
  type MonthSummaryInput,
  type MonthTheme,
} from '@/lib/calendar-engine/derivers/monthSummary'
import type { ActiveSignal } from '@/lib/calendar-engine/types'

/** 테마 후보 — KO·EN 라벨 짝(id 는 테스트용). */
const th = (ko: string, en: string, id = `t.${ko}`): MonthTheme => ({ id, ko, en })

/**
 * deriveMonthSummary — 월 데이터 조각을 한 문단 총평으로 합성하는 순수 함수.
 */

const base: MonthSummaryInput = {
  goodDays: 5,
  cautionDays: 5,
  totalDays: 30,
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

describe('deriveMonthSummary — 평이한 달(flat, U4 회귀)', () => {
  // good·caution 둘 다 0 = 중간 밴드만 가득 찬 실제로 고른 달. mixed("굴곡이 또렷한")
  // 로 떨어지면 사실과 반대다. 여는 문장·닫는 문장 모두 flat 전용이어야 한다.
  const flat = { ...base, goodDays: 0, cautionDays: 0, avoidDays: 0 }

  it('여는 문장이 "고르게 흐르는 달" 이고 mixed 굴곡 표현이 없다', () => {
    const s = deriveMonthSummary(flat)
    expect(s).toContain('고르게 흐르는 달')
    expect(s).not.toContain('굴곡이 또렷한')
  })

  it('마무리가 없는 좋은날/조심날을 전제한 mixed 리듬 문장이 아니다', () => {
    const s = deriveMonthSummary(flat)
    // mixed 마무리는 "좋은 날엔 밀고 조심할 날엔…" — 없는 날을 겨냥하므로 flat 에선 금지.
    expect(s).not.toContain('조심할 날엔 쉬어')
    // flat 마무리는 "루틴/기본기/쌓기" 쪽으로 닫는다(어떤 시드든 공통 어휘 존재).
    expect(s).toMatch(/루틴|기본기|쌓기|리듬만 꾸준히/)
  })

  it('영문 flat 도 evenly paced 로 열고 mixed 리듬 문장이 아니다', () => {
    const s = deriveMonthSummary({ ...flat, lang: 'en' })
    expect(s).toContain('evenly paced month')
    expect(s).not.toContain('A month of swings')
    expect(s).not.toContain('rest on the cautious ones')
  })

  it('good·caution 중 하나라도 있으면 flat 이 아니다(경계)', () => {
    expect(deriveMonthSummary({ ...base, goodDays: 1, cautionDays: 0 })).not.toContain(
      '고르게 흐르는 달'
    )
    expect(deriveMonthSummary({ ...base, goodDays: 0, cautionDays: 1 })).not.toContain(
      '고르게 흐르는 달'
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
  it('themes 가 있으면 테마 문장이 들어간다(상위 2개)', () => {
    const s = deriveMonthSummary({
      ...base,
      themes: [
        th('목성 좋은 자리(고양) (게자리)', 'Jupiter at its best (Cancer)'),
        th('토성 압박', 'Saturn pressure'),
        th('추가 신호', 'extra signal'),
      ],
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

  it('themes 가 비면 테마 문장이 생략된다', () => {
    expect(deriveMonthSummary({ ...base, themes: [] })).not.toContain('무엇보다')
    expect(deriveMonthSummary(base)).not.toContain('무엇보다')
  })

  it('선행 마크·라벨·꼬리(— 설명)는 coreReason 으로 정리된다', () => {
    const s = deriveMonthSummary({
      ...base,
      themes: [th('↑ [month] 이달 · 강한 재성 흐름 — 자세한 설명', 'strong wealth — detail')],
    })
    expect(s).toContain('강한 재성 흐름')
    expect(s).not.toContain('자세한 설명')
    expect(s).not.toContain('[month]')
  })

  it('정리 후 빈 문자열이 되는 테마는 필터된다', () => {
    const s = deriveMonthSummary({
      ...base,
      themes: [th('(글로스만)', '(gloss only)'), th('실제 테마', 'real theme')],
    })
    expect(s).toContain('실제 테마')
  })

  it('영문 테마는 and 로 연결되고 동사는 복수형', () => {
    for (const seed of [0, 1, 2, 3]) {
      const s = deriveMonthSummary({
        ...base,
        lang: 'en',
        seed,
        themes: [th('목성', 'Jupiter'), th('토성', 'Saturn')],
      })
      expect(s).toContain('Jupiter and Saturn')
      expect(s).toMatch(/Jupiter and Saturn (set|shape|define) /)
    }
  })

  it('영문 테마가 하나면 동사는 단수형(sets/shapes/defines) — "Venus at home shape" 금지', () => {
    for (const seed of [0, 1, 2, 3, 4, 5, 6, 7]) {
      const s = deriveMonthSummary({
        ...base,
        lang: 'en',
        seed,
        themes: [th('금성 도미사일 (자기 자리)', 'Venus in Domicile (home sign) (Libra)')],
      })
      expect(s).toMatch(/Venus at home (sets|shapes|defines) /)
    }
  })

  it("영문 위계 'in Domicile' 은 'at home' — 'Venus in at home' 이 되지 않는다", () => {
    for (const seed of [0, 1, 2, 3]) {
      const s = deriveMonthSummary({
        ...base,
        lang: 'en',
        seed,
        themes: [
          th(
            '금성 도미사일 (자기 자리) (천칭자리)',
            'Venus in Domicile (home sign) (Libra) — operates at full natural strength'
          ),
          th('토성 폴 (추락) (양자리)', 'Saturn in Fall (Aries) — is weakened and out of place'),
        ],
      })
      expect(s).toContain('Venus at home and Saturn weakened')
      expect(s).not.toContain('in at home')
      expect(s).not.toMatch(/\bin weakened\b/)
    }
    const ex = deriveMonthSummary({
      ...base,
      lang: 'en',
      themes: [
        th('목성 엑잘테이션 (고양) (게자리)', 'Jupiter in Exaltation (Cancer) — is honoured'),
        th('화성 디트리먼트 (전갈자리)', 'Mars in Detriment (Scorpio) — works against its nature'),
      ],
    })
    expect(ex).toContain('Jupiter exalted and Mars out of place')
    expect(ex).not.toMatch(/\bin (at its best|out of place)\b/)
  })
})

// 재감사 SI-4 — 이달 총평 테마: 신호 id 로 한 번 고르고 두 로케일이 같은 테마를 말한다.
describe('이달 총평 테마 — 로케일 무관 선택 + 문구 (재감사 SI-4)', () => {
  const sig = (over: Partial<ActiveSignal> & { id: string }): ActiveSignal =>
    ({
      source: 'astro',
      kind: 'transit',
      name: over.id,
      polarity: 1,
      weight: 0.5,
      layer: 'monthly',
      active: {
        start: '2026-11-01T00:00:00Z',
        peak: '2026-11-15T00:00:00Z',
        end: '2026-11-30T00:00:00Z',
      },
      ...over,
    }) as ActiveSignal

  const JUP_MOON = sig({
    id: 'astro.transit.Jupiter|Moon|conjunction.2026-10-14',
    korean: '목성이 본명 달과 정면으로 겹쳐 드는 흐름 — 두 행성이 한 자리에 겹쳐요.',
    english: 'Jupiter fuses directly with natal Moon — Two planets sit on the same spot.',
    weight: 0.75,
  })
  const VENUS_HOME = sig({
    id: 'astro.dignity.Venus|domicile|Libra.2026-10-26',
    korean: '금성 도미사일 (자기 자리) (천칭자리)',
    english: 'Venus in Domicile (home sign) (Libra) — operates at full natural strength',
    polarity: 2,
    weight: 0.7,
  })
  const JOHU = sig({
    id: 'saju.johu-yongsin.2026-11-07.화',
    source: 'saju',
    kind: 'pillar-sibsin',
    korean: '亥月 조후 — 화가 한 균형에 필요',
    english: 'Hai-month climate balance — Fire is needed to temper the season',
    polarity: 3,
    weight: 0.65,
  })
  const ZR = sig({
    id: 'astro.zr.fortune.l2.Aquarius.1.Pisces',
    kind: 'zodiacal-releasing',
    korean: '운명 ZR L2 Peak — Pisces',
    english: 'Fortune ZR L2 Peak — Pisces',
    polarity: 2,
    weight: 0.9,
  })
  const TODAY_SHINSAL = sig({
    id: 'saju.shinsal.천을귀인.2026-11-12',
    source: 'saju',
    kind: 'shinsal',
    layer: 'daily',
    korean: '오늘 천을귀인 — 귀인의 도움',
    english: 'Heavenly Benefactor active today — help arrives',
    polarity: 3,
    weight: 0.9,
  })
  const FIRE_TRINE = sig({
    id: 'saju.hyeongchung.samhap.寅午戌.2026-11-12',
    source: 'saju',
    kind: 'hyeongchung',
    layer: 'daily',
    korean: '호랑이·말·개가 모여 활활 타오르는 불을 이루는 흐름 — 열정의 합국',
    english: 'Tiger, Horse and Dog gather into a blazing fire — a trine of passion',
    polarity: 2,
    weight: 0.9,
  })
  const MINOR_DIGNITY = sig({
    id: 'astro.dignity.Mars|triplicity|Leo.2026-11-04',
    korean: '화성 트리플리시티 (Triplicity) (사자자리)',
    english: 'Mars in minor dignity Triplicity (Leo) — a mild supportive placement',
    polarity: 2,
    weight: 0.9,
  })

  // 셀 30개 — 한 달 내내 켜진 월 신호 + 그 달 하루짜리 신호(점수 높은 날)
  const cells = Array.from({ length: 30 }, (_, i) => ({
    signals: [
      JOHU,
      ZR,
      MINOR_DIGNITY,
      VENUS_HOME,
      JUP_MOON,
      ...(i === 11 ? [TODAY_SHINSAL, FIRE_TRINE] : []),
    ],
  }))

  it('월 층 우호 신호만, 그 달 영향(polarity×weight 날짜 합) 순 — 하루 신호·메커닉·소위계는 후보가 아니다', () => {
    const ids = monthThemeCandidates(cells).map((t) => t.id)
    expect(ids).toEqual([VENUS_HOME.id, JUP_MOON.id])
  })

  it('한 달 내내 켜진 신호가 사흘짜리 신호를 이긴다(날짜 합)', () => {
    const MOON_HOME = sig({
      id: 'astro.dignity.Moon|domicile|Cancer.2026-11-01',
      korean: '달 도미사일 (자기 자리) (게자리)',
      english: 'Moon in Domicile (home sign) (Cancer)',
      polarity: 2,
      weight: 0.7,
    })
    const mixed = cells.map((c, i) => ({ signals: i < 3 ? [MOON_HOME, ...c.signals] : c.signals }))
    expect(monthThemeCandidates(mixed)[0].id).toBe(VENUS_HOME.id)
    expect(monthThemeCandidates(mixed).map((t) => t.id)).toContain(MOON_HOME.id)
  })

  it('KO·EN 이 같은 두 테마를 말한다 — "흐름 흐름" 없음, 오늘/today·조후·ZR 없음', () => {
    const themes = monthThemeCandidates(cells)
    for (let seed = 0; seed < 8; seed++) {
      const ko = deriveMonthSummary({ ...base, seed, themes })
      const en = deriveMonthSummary({ ...base, lang: 'en', seed, themes })
      expect(ko).toContain('금성 제자리 · 목성이 본명 달과 정면으로 겹쳐 드는 흐름이')
      expect(en).toContain('Venus at home and Jupiter fusing directly with natal Moon')
      expect(ko).not.toContain('흐름 흐름')
      for (const bad of ['오늘', '천을귀인', '조후', 'ZR', '亥', '트리플리시티']) {
        expect(ko).not.toContain(bad)
      }
      for (const bad of ['today', 'Benefactor', 'climate', 'ZR', 'Triplicity']) {
        expect(en).not.toContain(bad)
      }
    }
  })

  it('selectMonthThemes — 한쪽 라벨이 테마로 부적합하면 두 로케일 모두에서 뺀다', () => {
    const picked = selectMonthThemes([
      // EN 이 7단어 절 → 둘 다 탈락
      th('긴 영문 짝', 'progressed Mercury flows easily with natal North Node'),
      // KO 가 서술문 → 둘 다 탈락
      th('흐름이 좋아요', 'good flow'),
      // EN 에 한글 → 둘 다 탈락
      th('목성 고양', '목성 exalted'),
      th('금성 제자리', 'Venus at home'),
    ])
    expect(picked.map((p) => [p.ko, p.en])).toEqual([['금성 제자리', 'Venus at home']])
  })

  it('하루 표지 정리 — "오늘 X — …" / "X active today — …" 는 X 만 남는다', () => {
    const [p] = selectMonthThemes([
      th('오늘 천을귀인 — 귀인의 도움', 'Heavenly Benefactor active today — help arrives'),
    ])
    expect(p).toEqual({
      id: 't.오늘 천을귀인 — 귀인의 도움',
      ko: '천을귀인',
      en: 'Heavenly Benefactor',
    })
  })

  it("명사 '흐름'으로 끝나는 KO 테마 — 마지막 테마만 템플릿 '흐름'과 합친다(앞 테마는 명사 유지)", () => {
    const flowFirst = [
      th(
        '목성이 본명 달과 정면으로 겹쳐 드는 흐름 — 설명',
        'Jupiter fuses directly with natal Moon — detail'
      ),
      th('금성 도미사일 (자기 자리)', 'Venus in Domicile (home sign)'),
    ]
    const ko = deriveMonthSummary({ ...base, themes: flowFirst })
    expect(ko).toContain('목성이 본명 달과 정면으로 겹쳐 드는 흐름 · 금성 제자리 흐름이')
    expect(ko).not.toContain('흐름 흐름')
    const single = deriveMonthSummary({ ...base, themes: flowFirst.slice(0, 1) })
    expect(single).toContain('정면으로 겹쳐 드는 흐름이')
    expect(single).not.toContain('흐름 흐름')
  })

  it("EN 월운 줄 'X runs through the month' 은 명사구 X 로(KO '…흐르는 한 달이에요' 와 짝)", () => {
    const [p] = selectMonthThemes([
      th(
        '배움과 도움이 들어오는 기운이 흐르는 한 달이에요 — 결',
        'learning and support coming in runs through the month — grain'
      ),
    ])
    expect(p.ko).toBe('배움과 도움이 들어오는 기운')
    expect(p.en).toBe('learning and support coming in')
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

// F3 — 최고의 날이 이미 지나 PUSH 가 앞으로 남은 첫 좋은 날로 대체되면(pickTryThis 폴백)
// '가장 무게가 실리는 날' / 'carries the most weight' 는 과장이다 → 부드러운 대체일 문장.
describe('deriveMonthSummary — 대체된 좋은 날(bestDayKind next-good)', () => {
  const SEEDS = [0, 1, 2, 3, 7, 123456789]

  it('어떤 시드든 ko 는 "가장"·"무게" 없이 앞으로 남은 날로 짚는다', () => {
    for (const seed of SEEDS) {
      const s = deriveMonthSummary({ ...base, seed, bestDay: '11-24', bestDayKind: 'next-good' })
      expect(s).toContain('11월 24일')
      expect(s).not.toContain('무게')
      expect(s).not.toContain('가장')
      expect(s).toMatch(/남은|앞으로|이제부터/)
    }
  })

  it('어떤 시드든 en 은 "most weight"·"heaviest" 없이 앞으로의 날로 짚는다', () => {
    for (const seed of SEEDS) {
      const s = deriveMonthSummary({
        ...base,
        lang: 'en',
        seed,
        bestDay: '11-24',
        bestDayKind: 'next-good',
      })
      expect(s).toContain('11/24')
      expect(s).not.toMatch(/most weight|heaviest/)
      expect(s).toMatch(/ahead|From here on|rest of the month/)
    }
  })

  it('대체일에도 이유 꼬리(— 이유)와 행동 제안은 그대로 붙는다', () => {
    const s = deriveMonthSummary({
      ...base,
      bestDay: '11-24',
      bestDayKind: 'next-good',
      bestDayReason: '비견 × 태양 — 디테일',
    })
    expect(s).toContain('11월 24일')
    expect(s).toContain('— 비견 × 태양')
    expect(s).not.toContain('디테일')
    expect(s).toMatch(/미뤄둔|묵혀둔|보류해둔/)
  })

  it("기본값(bestDayKind 미지정)·'best' 는 종전 '가장 무게' 문장 그대로", () => {
    for (const seed of SEEDS) {
      const plain = deriveMonthSummary({ ...base, seed, bestDay: '11-24' })
      const best = deriveMonthSummary({ ...base, seed, bestDay: '11-24', bestDayKind: 'best' })
      expect(best).toBe(plain)
      expect(plain).toContain('무게')
      const en = deriveMonthSummary({ ...base, lang: 'en', seed, bestDay: '11-24' })
      expect(en).toMatch(/most weight|heaviest weight/)
    }
  })

  it('ko/en 은 같은 시드에서 같은 변형(한 쌍)을 고른다', () => {
    // NEXT_GOOD_DAY 는 ko/en 이 한 항목 — 같은 index. 변형마다 고유한 표지로 짝을 확인.
    const pairs: Array<[RegExp, RegExp]> = [
      [/남은 날 가운데선/, /Of the days still ahead/],
      [/앞으로 남은 날 중엔/, /Looking ahead/],
      [/이제부터는/, /From here on/],
      [/남은 기간에선/, /For the rest of the month/],
    ]
    for (let seed = 0; seed < 4; seed++) {
      const ko = deriveMonthSummary({ ...base, seed, bestDay: '11-24', bestDayKind: 'next-good' })
      const en = deriveMonthSummary({
        ...base,
        lang: 'en',
        seed,
        bestDay: '11-24',
        bestDayKind: 'next-good',
      })
      const i = pairs.findIndex(([k]) => k.test(ko))
      expect(i).toBeGreaterThanOrEqual(0)
      expect(en).toMatch(pairs[i][1])
    }
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
      themes: [th('목성 확장', 'Jupiter expanding'), th('재성 강세', 'strong wealth')],
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
    themes: [th('목성 확장', 'Jupiter expanding'), th('재성 강세', 'strong wealth')],
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

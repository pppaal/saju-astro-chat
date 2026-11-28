import { describe, it, expect } from 'vitest'
import { toUser } from '@/lib/calendar-view/toUser'
import { makeNatal, makeChart, makePlanet } from './_fixtures'

describe('toUser — NatalContext → destinypal user', () => {
  describe('birth 문자열', () => {
    it('input 으로 birth / birthKo 를 zero-pad 하여 만든다', () => {
      const natal = makeNatal({
        input: { year: 1995, month: 2, date: 9, hour: 6, minute: 40 },
      })
      const u = toUser(natal)
      expect(u.birth).toBe('1995-02-09 06:40')
      expect(u.birthKo).toBe('1995년 2월 9일 06:40')
    })

    it('birthDisplay 옵션이 input 파생값을 덮어쓴다 (birth 만, birthKo 는 input 유지)', () => {
      const natal = makeNatal({ input: { year: 2000, month: 12, date: 31, hour: 23, minute: 5 } })
      const u = toUser(natal, { birthDisplay: '커스텀 표시' })
      expect(u.birth).toBe('커스텀 표시')
      expect(u.birthKo).toBe('2000년 12월 31일 23:05')
    })

    it('input 이 없으면 birth / birthKo 는 빈 문자열', () => {
      const natal = makeNatal()
      // @ts-expect-error — input 결손 시 폴백 경로 검증
      natal.input = undefined
      const u = toUser(natal)
      expect(u.birth).toBe('')
      expect(u.birthKo).toBe('')
    })
  })

  describe('일간 (ilgan)', () => {
    it('한글 일간명 "신"을 한자/한글음/영문으로 평탄화', () => {
      const natal = makeNatal({ dayMasterName: '신', dayMasterElement: '금' })
      const u = toUser(natal)
      expect(u.ilgan).toEqual({
        hanja: '辛',
        kr: '신금',
        en: 'Sin · Yin Metal',
        element: '금',
      })
    })

    it('한자 일간명 "甲" 도 그대로 매핑', () => {
      const natal = makeNatal({ dayMasterName: '甲', dayMasterElement: '목' })
      const u = toUser(natal)
      expect(u.ilgan.hanja).toBe('甲')
      expect(u.ilgan.kr).toBe('갑목')
      expect(u.ilgan.en).toBe('Gap · Yang Wood')
    })

    it('미지의 일간명은 폴백(kr/en 에 원본)', () => {
      const natal = makeNatal({ dayMasterName: 'ZZZ', dayMasterElement: '' })
      const u = toUser(natal)
      expect(u.ilgan.hanja).toBe('ZZZ')
      expect(u.ilgan.kr).toBe('ZZZ')
      expect(u.ilgan.en).toBe('ZZZ')
    })
  })

  describe('용신 / 희신 triad', () => {
    it('primary+secondary 가 있으면 join (FiveElement 는 한글 키)', () => {
      // FiveElement 는 '목'|'화'|'토'|'금'|'수' (한글). hanja 필드는 실제로 한글 join.
      const natal = makeNatal({ yongsin: { primary: '화', secondary: '토', avoid: [] } })
      const u = toUser(natal)
      expect(u.yongsin).toEqual({ hanja: '화·토', kr: '화·토', en: 'Fire · Earth' })
      // huisin = secondary 만
      expect(u.huisin).toEqual({ hanja: '토', kr: '토', en: 'Earth' })
    })

    it('secondary 가 없으면 huisin 은 빈 셋, yongsin 은 primary 만', () => {
      const natal = makeNatal({ yongsin: { primary: '수', avoid: [] } })
      const u = toUser(natal)
      expect(u.yongsin).toEqual({ hanja: '수', kr: '수', en: 'Water' })
      expect(u.huisin).toEqual({ hanja: '', kr: '', en: '' })
    })
  })

  describe('오행 분포 elements', () => {
    it('fiveElements 를 한글 키 객체로 매핑', () => {
      const natal = makeNatal({
        fiveElements: { wood: 3, fire: 0, earth: 2, metal: 1, water: 2 },
      })
      const u = toUser(natal)
      expect(u.elements).toEqual({ 목: 3, 화: 0, 토: 2, 금: 1, 수: 2 })
    })

    it('fiveElements 결손 시 0 으로 채움', () => {
      const natal = makeNatal()
      // @ts-expect-error 결손 경로
      natal.saju.fiveElements = undefined
      const u = toUser(natal)
      expect(u.elements).toEqual({ 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 })
    })
  })

  describe('강약 (gangyak)', () => {
    it.each([
      ['strong', '강(强)'],
      ['weak', '약(弱)'],
      ['medium', '중화(中和)'],
    ] as const)('strength=%s → %s', (strength, expected) => {
      const natal = makeNatal({ strength })
      expect(toUser(natal).gangyak).toBe(expected)
    })

    // 5단계 밴드가 있어도 표기(personSeed 입력)는 3분류 그대로. EN 5단계 라벨은 v9.2 화면이
    // 읽지 않아 페이로드에서 뺐다(D30).
    it.each([
      ['극신강', 'strong'],
      ['중화', 'medium'],
      ['극신약', 'weak'],
    ] as const)('band=%s → 3분류 표기, gangyakEn 없음', (band, strength) => {
      const natal = makeNatal({ strength, analyses: { yongsin: { daymasterStrength: band } } })
      const u = toUser(natal)
      expect(u.gangyak).toBe({ strong: '강(强)', medium: '중화(中和)', weak: '약(弱)' }[strength])
      expect(u).not.toHaveProperty('gangyakEn')
    })
  })

  describe('격국 (gyeokguk)', () => {
    it('알려진 격국은 영문명(한글 접두 없이)', () => {
      const natal = makeNatal({ analyses: { geokguk: { primary: '정인격' } } })
      const u = toUser(natal)
      expect(u.gyeokguk).toBe('정인격')
      expect(u.gyeokgukEn).toBe('Jeongin (Direct-resource)')
    })

    it('analyses 가 없으면 "미정" 폴백 — EN 은 Undetermined', () => {
      const natal = makeNatal({ analyses: undefined })
      const u = toUser(natal)
      expect(u.gyeokguk).toBe('미정')
      expect(u.gyeokgukEn).toBe('Undetermined')
      expect(u.geokgukStatus).toBeUndefined()
    })

    // 재감사 SI-1 — 엔진이 낼 수 있는 격국 전부(정격·종격·비격·화기격·특수격)가 EN 이름을 갖는다.
    it.each([
      ['건록격', 'Geonrok (Officer stipend)'],
      ['상관격', 'Sanggwan (Hurting-officer)'],
      ['정임화목격', 'Jeong-Im Wood transformation'],
      ['종살격', 'Jongsal (Dominant officer)'],
      ['월겁격', 'Wolgeop (Monthly rob)'],
      ['잡기격', 'Japgi (Mixed storage)'],
      ['곡직격', 'Gokjik (Curved-straight Wood)'],
    ] as const)('%s → %s', (primary, en) => {
      const u = toUser(makeNatal({ analyses: { geokguk: { primary } } }))
      expect(u.gyeokgukEn).toBe(en)
      expect(u.gyeokgukEn).not.toMatch(/[가-힣]/)
    })

    it('격국 상태 줄은 이름 · 성패(요인) — EN 짝은 싣지 않는다(D30)', () => {
      const natal = makeNatal({
        analyses: {
          geokguk: {
            primary: '건록격',
            statusResult: { status: '성격', factors: { positive: ['관성이 비겁 제어'] } },
          },
        },
      })
      const u = toUser(natal)
      expect(u.geokgukStatus).toBe('건록격 · 성격 (관성이 비겁 제어)')
      expect(u).not.toHaveProperty('geokgukStatusEn')
    })
  })

  describe('dominantSibsin', () => {
    it('카테고리 카운트 중 최대값 + 백분율(반올림)', () => {
      const natal = makeNatal({
        analyses: {
          sibsin: { categoryCount: { 비겁: 1, 식상: 2, 재성: 4, 관성: 2, 인성: 1 } },
        },
      })
      const u = toUser(natal)
      // sum=10, 재성=4 → 40%
      expect(u.dominantSibsin).toEqual({ name: '재성', pct: 40 })
    })

    it('합이 0 이면 빈 기본값', () => {
      const natal = makeNatal({
        analyses: { sibsin: { categoryCount: { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 } } },
      })
      expect(toUser(natal).dominantSibsin).toEqual({ name: '', pct: 0 })
    })

    it('analyses.sibsin 결손 시 빈 기본값', () => {
      const natal = makeNatal({ analyses: {} })
      expect(toUser(natal).dominantSibsin).toEqual({ name: '', pct: 0 })
    })
  })

  describe('geokgukStatus / rootStatus 라인', () => {
    it('반성반파 + positive/negative → "+.. / -.." 형식', () => {
      const natal = makeNatal({
        analyses: {
          geokguk: {
            primary: '정인격',
            statusResult: {
              status: '반성반파',
              factors: { positive: ['편인 보호'], negative: ['재성 분탈'] },
            },
          },
        },
      })
      const u = toUser(natal)
      expect(u.geokgukStatus).toBe('정인격 · 반성반파 (+편인 보호 / -재성 분탈)')
    })

    it('rootStatus 는 월령+통근 강도로 압축', () => {
      const natal = makeNatal({
        pillars: { month: { earthlyBranch: { name: '寅' } } },
        analyses: { deukryeong: { status: '실령' }, tonggeun: { totalStrength: 30 } },
      })
      const u = toUser(natal)
      expect(u.rootStatus).toBe('월령 寅 실령 · 통근 얇음')
      expect(u).not.toHaveProperty('rootStatusEn')
    })

    it('월령/통근 정보가 전혀 없으면 rootStatus undefined', () => {
      const natal = makeNatal({ analyses: {} })
      expect(toUser(natal).rootStatus).toBeUndefined()
    })
  })

  describe('astro (sun/asc/mc)', () => {
    it('차트에서 Sun/Asc/MC 사인을 한글+영문으로', () => {
      const chart = makeChart({
        planets: [makePlanet('Sun', 'Aquarius', 5)],
        ascSign: 'Cancer',
        mcSign: 'Aries',
      })
      const u = toUser(makeNatal({ chart }))
      expect(u.astro.sunEn).toBe('Aquarius')
      expect(u.astro.sun).toBe('물병자리')
      expect(u.astro.ascEn).toBe('Cancer')
      expect(u.astro.asc).toBe('게자리')
      expect(u.astro.mcEn).toBe('Aries')
      expect(u.astro.mc).toBe('양자리')
    })

    it('Sun 행성이 없으면 sun 관련 필드 undefined', () => {
      const chart = makeChart({ planets: [makePlanet('Moon', 'Leo')] })
      const u = toUser(makeNatal({ chart }))
      expect(u.astro.sun).toBeUndefined()
      expect(u.astro.sunEn).toBeUndefined()
    })
  })

  describe('sect', () => {
    it('낮/밤 차트 → sectKind', () => {
      expect(toUser(makeNatal({ sect: 'day' })).sectKind).toBe('day')
      expect(toUser(makeNatal({ sect: 'night' })).sectKind).toBe('night')
    })
  })

  describe('almutenFiguris', () => {
    it('winner + runnerUps(top2) 산출', () => {
      const natal = makeNatal({
        almutenFiguris: {
          winner: 'Saturn',
          scores: { Saturn: 12, Mars: 8, Venus: 5, Sun: 2 },
        },
      })
      const u = toUser(natal)
      expect(u.almutenFiguris.planet).toBe('Saturn')
      expect(u.almutenFiguris.score).toBe(12)
      expect(u.almutenFiguris.runnerUps).toEqual([
        { planet: 'Mars', score: 8 },
        { planet: 'Venus', score: 5 },
      ])
    })

    it('winner 없으면 폴백 (planet "—", score 0)', () => {
      expect(toUser(makeNatal({ almutenFiguris: null })).almutenFiguris).toEqual({
        planet: '—',
        score: 0,
      })
    })
  })

  describe('dignities (D9)', () => {
    it('본명 품위 목록은 user 에 싣지 않는다 — 읽는 화면이 없고 Life 는 natal 에서 직접 읽는다', () => {
      const natal = makeNatal({
        dignities: [
          { planet: 'Mars', sign: 'Aries', degree: 5, tiers: { domicile: true }, score: 5 },
        ],
      })
      const u = toUser(natal) as unknown as Record<string, unknown>
      expect(u).not.toHaveProperty('dignities')
    })
  })

  describe('intro / place / sex 옵션', () => {
    it('옵션을 그대로 노출, 미지정 시 빈 문자열', () => {
      const u = toUser(makeNatal(), {
        place: '서울',
        sex: '여',
        intro: '안녕',
        introEn: 'hi',
      })
      expect(u.place).toBe('서울')
      expect(u.sex).toBe('여')
      expect(u.intro).toBe('안녕')
      expect(u.introEn).toBe('hi')

      const u2 = toUser(makeNatal())
      expect(u2.place).toBe('')
      expect(u2.sex).toBe('')
      expect(u2.intro).toBe('')
      expect(u2.introEn).toBe('')
    })
  })
})

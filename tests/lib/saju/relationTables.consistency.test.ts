// 지지/천간 관계 도그마 SSOT(relationTables.ts) 교차 일치 + 골든 테스트.
//
// 목적: 과거 같은 표(특히 원진)가 여러 파일에 복제돼 한 곳만 고치면 드리프트가
// 나던 버그를 구조적으로 차단한다. 모든 소비 모듈의 (파생) 표가 canon 과 정확히
// 일치함을 강제하므로, 누군가 어느 한 곳에서만 값을 바꾸면 이 테스트가 즉시 깬다.

import { describe, it, expect } from 'vitest'
import * as canon from '@/lib/saju/relationTables'
import { YUKHAP, CHUNG, SAMHAP, XING, HAI, PA } from '@/lib/saju/constants'
import { BRANCH_HYEONG_PAIR, SELF_HYEONG, isHyeong } from '@/lib/saju/hyeong'
import * as compat from '@/lib/compatibility/sajuSynastryData'
import { CHEONEUL_GWIIN_MAP, STEMS } from '@/lib/saju/constants'
import { analyzeRelations, DEFAULT_RELATION_OPTIONS, type PillarInput } from '@/lib/saju/relations'
import { detectUnseRelations } from '@/lib/saju/currentUnse'
import type { SajuPillars } from '@/lib/saju/types'
import hyeongchungExtractor from '@/lib/calendar-engine/extractors/saju-hyeongchung'
import { isXing } from '@/lib/calendar/utils'
import { relationForDay } from '@/lib/fortune/zodiacDaily'
import type { ActiveSignal, ExtractorContext } from '@/lib/calendar-engine/types'

// 방향 무관 쌍 시그니처(두 글자를 정렬해 합침) 집합.
const sig = (a: string, b: string) => [a, b].sort().join('')
const fromPairs = (pairs: ReadonlyArray<canon.Pair>) => new Set(pairs.map(([a, b]) => sig(a, b)))
const fromRecord = (rec: Record<string, string>) =>
  new Set(Object.entries(rec).map(([a, b]) => sig(a, b)))
// compat 표는 partner 대신 `other` 키를 쓴다.
const fromOtherRecord = (rec: Record<string, { other: string }>) =>
  new Set(Object.entries(rec).map(([a, v]) => sig(a, v.other)))

describe('relationTables — 도그마 골든값', () => {
  it('원진(怨嗔)은 표준 6쌍: 子未 丑午 寅酉 卯申 辰亥 巳戌', () => {
    const expected: canon.Pair[] = [
      ['子', '未'],
      ['丑', '午'],
      ['寅', '酉'],
      ['卯', '申'],
      ['辰', '亥'],
      ['巳', '戌'],
    ]
    expect(fromPairs(canon.RESENTMENT_PAIRS)).toEqual(fromPairs(expected))
  })

  it('원진 ≠ 해(害) — 子未·丑午 두 쌍만 공통, 나머지는 다르다', () => {
    const wonjin = fromPairs(canon.RESENTMENT_PAIRS)
    const hae = fromPairs(canon.HARM_PAIRS)
    expect(wonjin).not.toEqual(hae)
    const shared = [...wonjin].filter((s) => hae.has(s))
    expect(new Set(shared)).toEqual(new Set([sig('子', '未'), sig('丑', '午')]))
    // 회귀 가드: 寅酉=원진/寅巳=해, 卯申=원진/卯辰=해 가 뒤바뀌지 않았는지
    expect(wonjin.has(sig('寅', '酉'))).toBe(true)
    expect(wonjin.has(sig('寅', '巳'))).toBe(false)
    expect(hae.has(sig('寅', '巳'))).toBe(true)
    expect(hae.has(sig('寅', '酉'))).toBe(false)
  })

  it('해(害) 표준 6쌍: 子未 丑午 寅巳 卯辰 申亥 酉戌', () => {
    const expected: canon.Pair[] = [
      ['子', '未'],
      ['丑', '午'],
      ['寅', '巳'],
      ['卯', '辰'],
      ['申', '亥'],
      ['酉', '戌'],
    ]
    expect(fromPairs(canon.HARM_PAIRS)).toEqual(fromPairs(expected))
  })

  it('충(沖) 6쌍 / 파(破) 6쌍 / 육합 6쌍 / 천간합 5쌍', () => {
    expect(fromPairs(canon.BRANCH_CLASH)).toEqual(
      fromPairs([
        ['子', '午'],
        ['丑', '未'],
        ['寅', '申'],
        ['卯', '酉'],
        ['辰', '戌'],
        ['巳', '亥'],
      ])
    )
    expect(canon.BREAK_PAIRS.length).toBe(6)
    expect(canon.SIX_HARMONY.length).toBe(6)
    expect(canon.STEM_COMBINE.length).toBe(5)
  })
})

describe('relationTables — 어댑터 정확성', () => {
  it('toBidiRecord 는 양방향 Record 를 만든다', () => {
    const r = canon.toBidiRecord([['子', '丑']])
    expect(r['子']).toBe('丑')
    expect(r['丑']).toBe('子')
  })
  it('toPairKeySet 는 양방향 키 Set 을 만든다', () => {
    const s = canon.toPairKeySet([['子', '午']])
    expect(s.has('子-午')).toBe(true)
    expect(s.has('午-子')).toBe(true)
  })
})

describe('relationTables — 소비 모듈 ↔ canon 교차 일치', () => {
  it('constants.ts 의 합충형파해가 canon 과 일치', () => {
    expect(fromRecord(YUKHAP)).toEqual(fromPairs(canon.SIX_HARMONY.map((h) => h.pair)))
    expect(fromRecord(CHUNG)).toEqual(fromPairs(canon.BRANCH_CLASH))
    expect(fromRecord(HAI)).toEqual(fromPairs(canon.HARM_PAIRS))
    expect(fromRecord(PA)).toEqual(fromPairs(canon.BREAK_PAIRS))
    // 삼합: 오행키별 멤버 집합 비교
    for (const t of canon.THREE_HARMONY) {
      expect(new Set(SAMHAP[t.element])).toEqual(new Set(t.members))
    }
    // 형: 자형·상형·삼형이 canon 빌딩블록을 반영. 충 페어(寅申·丑未)는 형이 아니다 —
    // XING 은 hyeong.isHyeong 에서 파생(78쌍 일치는 아래 SD-07 블록).
    expect(XING['辰']).toEqual(['辰'])
    expect(new Set(XING['子'])).toEqual(new Set(['卯']))
    expect(new Set(XING['寅'])).toEqual(new Set(['巳']))
    expect(new Set(XING['丑'])).toEqual(new Set(['戌']))
  })

  // (옛 'compatibility/constants.ts ↔ canon' 교차 검증은 레거시 궁합 엔진
  //  saju/compatibility 삭제와 함께 제거 — 라이브 표는 아래 sajuSynastryData 검증이 커버.)

  it('hyeong.ts(엄격 형) 빌딩블록이 canon 과 일치', () => {
    expect(new Set(SELF_HYEONG)).toEqual(new Set(canon.SELF_PUNISHMENT_STRICT))
    expect(fromRecord(BRANCH_HYEONG_PAIR)).toEqual(fromPairs([canon.PUNISHMENT_PAIR]))
  })

  it('compatibility/sajuSynastryData.ts 의 cross 표가 canon 과 일치(드리프트 락)', () => {
    // 궁합 포매터/팩트가 쓰는 합충형해파·삼합·방합 표가 SSOT 와 한 글자라도
    // 어긋나면 깬다. (예전 같은 표가 여러 파일에 복제돼 한 곳만 바뀌던 버그 방지.)
    expect(fromOtherRecord(compat.STEM_HAP)).toEqual(
      fromPairs(canon.STEM_COMBINE.map((s) => s.pair))
    )
    expect(fromRecord(compat.STEM_CHUNG)).toEqual(fromPairs(canon.STEM_CLASH))
    expect(fromOtherRecord(compat.BRANCH_HAP)).toEqual(
      fromPairs(canon.SIX_HARMONY.map((h) => h.pair))
    )
    expect(fromRecord(compat.BRANCH_CHUNG)).toEqual(fromPairs(canon.BRANCH_CLASH))
    expect(fromRecord(compat.BRANCH_HAE)).toEqual(fromPairs(canon.HARM_PAIRS))
    expect(fromRecord(compat.BRANCH_PA)).toEqual(fromPairs(canon.BREAK_PAIRS))
    // 천간합 합화오행도 canon 과 일치
    for (const { pair, element } of canon.STEM_COMBINE) {
      expect(compat.STEM_HAP[pair[0]]?.element).toBe(element)
      expect(compat.STEM_HAP[pair[1]]?.element).toBe(element)
    }
    // 삼합/방합 멤버 집합
    for (const t of canon.THREE_HARMONY) {
      expect(
        compat.TRI_HAP.some(
          (x) => new Set(x.branches).size === 3 && t.members.every((m) => x.branches.includes(m))
        )
      ).toBe(true)
    }
    for (const d of canon.DIRECTIONAL_HARMONY) {
      expect(compat.BANG_HAP.some((x) => d.members.every((m) => x.branches.includes(m)))).toBe(true)
    }
  })

  it('compatibility 천을귀인이 CHEONEUL_GWIIN_MAP(SSOT)과 동일 멤버', () => {
    // CHEONULGWIIN 은 이제 SSOT 재사용이라 참조 동일이지만, 회귀로 멤버 집합도 잠근다.
    for (const stem of Object.keys(CHEONEUL_GWIIN_MAP)) {
      expect(new Set(compat.CHEONULGWIIN[stem])).toEqual(new Set(CHEONEUL_GWIIN_MAP[stem]))
    }
  })
})

describe('삼재(三災) 골든 — 12지지 전체', () => {
  // 정통 교리: 삼합국의 생지와 충하는 지지에서 시작하는 방합 3년.
  //   申子辰(水)→寅卯辰, 亥卯未(木)→巳午未, 寅午戌(火)→申酉戌, 巳酉丑(金)→亥子丑.
  // 회귀: 직전 복제본은 4개 삼합국 중 3개(巳酉丑·申子辰·亥卯未)를 엉뚱한 연지로
  //   매핑해 해당 띠 전원의 삼재 연도가 틀렸다. 12지지 전부의 지지셋을 잠근다.
  const EXPECTED: Record<string, string[]> = {
    // 申子辰 → 寅卯辰
    申: ['寅', '卯', '辰'],
    子: ['寅', '卯', '辰'],
    辰: ['寅', '卯', '辰'],
    // 亥卯未 → 巳午未
    亥: ['巳', '午', '未'],
    卯: ['巳', '午', '未'],
    未: ['巳', '午', '未'],
    // 寅午戌 → 申酉戌
    寅: ['申', '酉', '戌'],
    午: ['申', '酉', '戌'],
    戌: ['申', '酉', '戌'],
    // 巳酉丑 → 亥子丑
    巳: ['亥', '子', '丑'],
    酉: ['亥', '子', '丑'],
    丑: ['亥', '子', '丑'],
  }

  it('12지지 모두 정확한 삼재 지지셋을 갖는다', () => {
    expect(Object.keys(canon.SAMJAE_BY_YEAR_BRANCH)).toHaveLength(12)
    for (const [branch, samjae] of Object.entries(EXPECTED)) {
      expect(Array.from(canon.SAMJAE_BY_YEAR_BRANCH[branch])).toEqual(samjae)
    }
  })

  it('shinsal·calendar 소비처가 SSOT 와 참조 동일(드리프트 차단)', async () => {
    const calendar = await import('@/lib/calendar/constants')
    expect(calendar.SAMJAE_BY_YEAR_BRANCH).toBe(canon.SAMJAE_BY_YEAR_BRANCH)
  })
})

// ─── 형(刑)·천간충 단일 교리 — 표면 간 동작 일치 (E2: SD-07 / SD-11) ───
// 표(테이블) 비교가 아니라 실제 출력으로 잠근다: 본명 relations, hyeong.isHyeong,
// 캘린더 saju-hyeongchung 추출기(일진 × 본명)가 같은 쌍에서 같은 답을 내야 한다.

const ALL_STEMS = STEMS.map((s) => s.name)

/** 네 기둥이 모두 같은 간지인 본명(추출기 입력). */
function natalCtx(stem: string, branch: string, days: number): ExtractorContext {
  const pillar = { heavenlyStem: { name: stem }, earthlyBranch: { name: branch } }
  const end = new Date(Date.UTC(2026, 0, 1) + (days - 1) * 86_400_000)
  const m = new Map<string, unknown>()
  return {
    natal: { saju: { pillars: { year: pillar, month: pillar, day: pillar, time: pillar } } },
    range: {
      start: '2026-01-01T00:00:00.000Z',
      end: `${end.toISOString().slice(0, 10)}T23:59:59.999Z`,
      granularity: 'day',
    },
    cache: {
      get: <T>(k: string) => m.get(k) as T | undefined,
      set: <T>(k: string, v: T) => void m.set(k, v),
    },
  } as unknown as ExtractorContext
}
const kindLabel = (s: ActiveSignal) => (s.evidence.detail as { kindLabel?: string }).kindLabel
const detailOf = (s: ActiveSignal) => s.evidence.detail as Record<string, string>

function twoPillars(a: [string, string], b: [string, string]): PillarInput {
  // 비교 대상은 year·month 두 기둥 — day/time 은 year/month 복제(아래에서 pillars 로 필터)
  return {
    year: { heavenlyStem: a[0], earthlyBranch: a[1] },
    month: { heavenlyStem: b[0], earthlyBranch: b[1] },
    day: { heavenlyStem: a[0], earthlyBranch: a[1] },
    time: { heavenlyStem: b[0], earthlyBranch: b[1] },
  }
}
const isYearMonth = (p: string[]) => p.length === 2 && p[0] === 'year' && p[1] === 'month'

describe('형(刑) — relations · hyeong · saju-hyeongchung 추출기 78쌍 일치 (SD-07)', () => {
  // 추출기: 본명 지지 b 에 대해 12일 창(일진 지지 12개 전부)을 돌려 일진 지지 → 형 여부.
  const extractorHyeong = new Map<string, boolean>()
  for (const b of canon.ALL_BRANCHES) {
    const signals = hyeongchungExtractor.extract(natalCtx('甲', b, 12)) as ActiveSignal[]
    for (const s of signals) {
      const d = detailOf(s)
      if (d.natalPillar !== 'year' || !d.targetBranch) continue
      if (kindLabel(s) === '지지형') extractorHyeong.set(`${d.targetBranch}${b}`, true)
    }
  }

  it('the 12-day window covers all 12 daily branches', () => {
    const covered = new Set<string>()
    for (const b of canon.ALL_BRANCHES) {
      for (const s of hyeongchungExtractor.extract(natalCtx('甲', b, 12)) as ActiveSignal[]) {
        covered.add(detailOf(s).targetBranch)
      }
    }
    expect([...covered].filter(Boolean).sort()).toEqual([...canon.ALL_BRANCHES].sort())
  })

  const pairs: Array<[string, string]> = []
  canon.ALL_BRANCHES.forEach((a, i) =>
    canon.ALL_BRANCHES.slice(i).forEach((b) => pairs.push([a, b]))
  )

  it('covers exactly 78 unordered branch pairs (66 distinct + 12 self)', () => {
    expect(pairs).toHaveLength(78)
  })

  it.each(pairs)('%s-%s: same 형 verdict on every surface', (a, b) => {
    const want = isHyeong(a, b)
    expect(isHyeong(b, a)).toBe(want) // 대칭
    for (const [x, y] of [
      [a, b],
      [b, a],
    ]) {
      const natal = analyzeRelations({
        pillars: twoPillars(['甲', x], ['甲', y]),
        options: { includeHeavenly: false, includeGongmang: false },
      }).some((h) => h.kind === '지지형' && isYearMonth(h.pillars))
      expect(natal).toBe(want)
      expect(extractorHyeong.get(`${x}${y}`) ?? false).toBe(want)
      // 옛 XING 표(삼형 세트의 임의 두 지지 = 형)도 이제 isHyeong 파생 (F2).
      expect(XING[x].includes(y)).toBe(want)
      expect(isXing(x, y)).toBe(want)
      // 띠 운세: 충이 먼저, 같은 지지는 'same' — 그 밖의 형 판정은 isHyeong 과 같다.
      if (x !== y && CHUNG[x] !== y) {
        expect(relationForDay(x, y) === 'xing').toBe(want)
      }
    }
  })
})

describe('천간충 — 단일 모드(STEM_CLASH_MODE) 를 본명·운·캘린더·궁합이 공유 (SD-11)', () => {
  it('the shared mode is the 4-pair base, and relations defaults to it', () => {
    expect(canon.STEM_CLASH_MODE).toBe('4')
    expect(canon.STEM_CLASH).toBe(canon.STEM_CLASH_BY_MODE[canon.STEM_CLASH_MODE])
    expect(fromPairs(canon.STEM_CLASH)).toEqual(fromPairs(canon.STEM_CLASH_4))
    expect(DEFAULT_RELATION_OPTIONS.heavenlyClashMode).toBe(canon.STEM_CLASH_MODE)
  })

  // 추출기: 본명 천간 b 에 대해 10일 창(일진 천간 10개 전부) → 일진 천간 → 충 여부.
  const extractorClash = new Map<string, boolean>()
  for (const b of ALL_STEMS) {
    for (const s of hyeongchungExtractor.extract(natalCtx(b, '子', 10)) as ActiveSignal[]) {
      const d = detailOf(s)
      if (kindLabel(s) === '천간충' && d.natalPillar === 'year') {
        extractorClash.set(`${d.targetStem}${b}`, true)
      }
    }
  }
  const clashSet = fromPairs(canon.STEM_CLASH)

  it('all 100 stem pairs: relations = currentUnse = extractor = compat = canon', () => {
    let positives = 0
    for (const a of ALL_STEMS) {
      for (const b of ALL_STEMS) {
        const want = a !== b && clashSet.has(sig(a, b))
        if (want) positives++
        const natal = analyzeRelations({
          pillars: twoPillars([a, '子'], [b, '丑']),
          options: { includeEarthly: false, includeGongmang: false },
        }).some((h) => h.kind === '천간충' && isYearMonth(h.pillars))
        expect(natal, `relations ${a}-${b}`).toBe(want)
        const pillar = { heavenlyStem: { name: b }, earthlyBranch: { name: '丑' } }
        const unse = detectUnseRelations(
          { year: pillar, month: pillar, day: pillar, time: pillar } as unknown as SajuPillars,
          a,
          '子'
        ).some((h) => h.kind === '천간충' && h.pillars[0] === 'year')
        expect(unse, `currentUnse ${a}-${b}`).toBe(want)
        expect(extractorClash.get(`${a}${b}`) ?? false, `extractor ${a}-${b}`).toBe(want)
        expect(compat.STEM_CHUNG[a] === b, `compat ${a}-${b}`).toBe(want)
      }
    }
    expect(positives).toBe(8) // 4쌍 × 양방향
  })
})

// ─── saju-hyeongchung 추출기의 합·충·원진·방합·파·해 = canon (F2 / D8·E17 표 SSOT) ───
// 추출기는 예전에 이 표들을 로컬 복제로 들고 있었다. 실제 출력(kindLabel·detail)을 canon
// 에서 독립적으로 만든 기대값과 144 지지쌍·100 천간쌍 전부 비교해, 표가 어디서 오든 같은
// 신호가 나는지 잠근다.
describe('saju-hyeongchung 추출기 관계표 = relationTables canon (F2)', () => {
  type Hit = { label: string; target: string; natal: string; detail: Record<string, unknown> }
  const hits: Hit[] = []
  for (const b of canon.ALL_BRANCHES) {
    for (const s of hyeongchungExtractor.extract(natalCtx('甲', b, 12)) as ActiveSignal[]) {
      const d = s.evidence.detail as Record<string, unknown>
      if (d.natalPillar !== 'year' || typeof d.targetBranch !== 'string') continue
      hits.push({ label: kindLabel(s) ?? '', target: d.targetBranch, natal: b, detail: d })
    }
  }
  const branchHits = (label: string) =>
    new Set(hits.filter((h) => h.label === label).map((h) => `${h.target}${h.natal}`))
  const orderedPairs = (pairs: ReadonlyArray<canon.Pair>) =>
    new Set(pairs.flatMap(([a, b]) => [`${a}${b}`, `${b}${a}`]))
  const groupPairs = (groups: ReadonlyArray<{ members: readonly string[] }>) =>
    new Set(
      groups.flatMap(({ members }) =>
        members.flatMap((x) => members.filter((y) => y !== x).map((y) => `${x}${y}`))
      )
    )

  it.each([
    ['육합', () => orderedPairs(canon.SIX_HARMONY.map((h) => h.pair))],
    ['지지충', () => orderedPairs(canon.BRANCH_CLASH)],
    ['원진', () => orderedPairs(canon.RESENTMENT_PAIRS)],
    ['파', () => orderedPairs(canon.BREAK_PAIRS)],
    ['해', () => orderedPairs(canon.HARM_PAIRS)],
    ['삼합', () => groupPairs(canon.THREE_HARMONY)],
    ['방합', () => groupPairs(canon.DIRECTIONAL_HARMONY)],
  ] as const)('%s: 144 branch pairs match the canon', (label, expected) => {
    expect(branchHits(label)).toEqual(expected())
  })

  it('삼합·방합 detail carries the canon group (and the season label for 방합)', () => {
    const SEASON = { 동방: '봄', 남방: '여름', 서방: '가을', 북방: '겨울' } as const
    for (const h of hits) {
      if (h.label === '삼합') {
        const t = canon.THREE_HARMONY.find((g) => g.members.includes(h.target))
        expect(h.detail.samhapGroup).toEqual([...(t?.members ?? [])])
      }
      if (h.label === '방합') {
        const g = canon.DIRECTIONAL_HARMONY.find((x) => x.members.includes(h.target))
        expect(h.detail.banghapGroup).toEqual([...(g?.members ?? [])])
        expect(h.detail.element).toBe(g?.element)
        expect(h.detail.season).toBe(g ? SEASON[g.direction] : undefined)
      }
    }
  })

  it('천간합: 100 stem pairs match STEM_COMBINE, with the transformed element', () => {
    const got = new Map<string, unknown>()
    for (const b of ALL_STEMS) {
      for (const s of hyeongchungExtractor.extract(natalCtx(b, '子', 10)) as ActiveSignal[]) {
        const d = detailOf(s)
        if (kindLabel(s) === '천간합' && d.natalPillar === 'year') {
          got.set(`${d.targetStem}${b}`, d.transformed)
        }
      }
    }
    const want = new Map<string, unknown>()
    for (const { pair, element } of canon.STEM_COMBINE) {
      want.set(`${pair[0]}${pair[1]}`, element)
      want.set(`${pair[1]}${pair[0]}`, element)
    }
    expect(got).toEqual(want)
  })
})

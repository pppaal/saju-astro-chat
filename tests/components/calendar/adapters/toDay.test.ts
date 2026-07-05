import { describe, it, expect } from 'vitest'
import { toDay, ONE_LINE_POOL } from '@/components/calendar/adapters/toDay'
import { makeNatal, makeCell, makeSignal } from './_fixtures'

// 본명 — 일간 甲, 일주 甲子 (공망 戌/亥), 지장간 미(己/乙/丁) 등.
function natal(over = {}) {
  return makeNatal({
    dayMasterName: '甲',
    pillars: {
      year: { heavenlyStem: { name: '庚' }, earthlyBranch: { name: '午' } },
      month: { heavenlyStem: { name: '丁' }, earthlyBranch: { name: '亥' } },
      day: { heavenlyStem: { name: '甲' }, earthlyBranch: { name: '子' } },
      time: { heavenlyStem: { name: '丙' }, earthlyBranch: { name: '寅' } },
    },
    dayJijanggan: { jeonggi: '己', junggi: '乙', yeogi: '丁' },
    ...over,
  })
}

describe('toDay — CalendarCell → destinypal day', () => {
  describe('날짜 / 일진', () => {
    it('datetime 에서 date / dateKo 추출', () => {
      const cell = makeCell({ datetime: '2026-06-15T09:00:00.000Z' })
      const d = toDay({ cell, natal: natal() })
      expect(d.date).toBe('2026-06-15')
      expect(d.dateKo).toBe('2026년 6월 15일')
    })

    it('iljin 지정 시 간지 + 일간 기준 십신 (甲 vs 丙=식신)', () => {
      const cell = makeCell({ datetime: '2026-06-15T00:00:00.000Z' })
      const d = toDay({ cell, natal: natal(), iljinStem: '丙', iljinBranch: '午' })
      expect(d.iljin.hanja).toBe('丙午')
      expect(d.iljinSibsin).toBe('식신')
    })

    it('iljin 미지정 시 빈 간지 + "—"', () => {
      const cell = makeCell({ datetime: '2026-06-15T00:00:00.000Z' })
      const d = toDay({ cell, natal: natal() })
      expect(d.iljin).toEqual({ hanja: '', kr: '', en: '' })
      expect(d.iljinSibsin).toBe('—')
    })
  })

  describe('signals 평탄화 — kind → cat', () => {
    it('shinsal / pillar-sibsin / transit cat 라벨', () => {
      const cell = makeCell({
        datetime: '2026-06-15T00:00:00.000Z',
        signals: [
          makeSignal({
            kind: 'shinsal',
            name: '도화살',
            polarity: 1,
            evidence: { module: 'm', detail: {}, shinsalName: '도화' },
          }),
          makeSignal({ kind: 'pillar-sibsin', name: '정관', polarity: 2 }),
        ],
      })
      const d = toDay({ cell, natal: natal() })
      const cats = d.signals.map((s) => s.cat)
      expect(cats).toContain('saju/shinsal')
      expect(cats).toContain('saju/pillar-sibsin')
    })

    it('알 수 없는 kind 는 source/kind 로 폴백', () => {
      const cell = makeCell({
        datetime: '2026-06-15T00:00:00.000Z',
        signals: [makeSignal({ kind: 'tonggeun-shift' as never, source: 'saju', name: 'x' })],
      })
      // tonggeun-shift 는 매핑에 있음 → saju/tonggeun-shift; 진짜 미지의 kind 테스트:
      const cell2 = makeCell({
        datetime: '2026-06-15T00:00:00.000Z',
        signals: [makeSignal({ kind: 'totally-unknown' as never, source: 'astro', name: 'x' })],
      })
      const d = toDay({ cell: cell2, natal: natal() })
      expect(d.signals[0].cat).toBe('astro/totally-unknown')
    })

    it('totalSignals / allSignals 미러', () => {
      const cell = makeCell({
        datetime: '2026-06-15T00:00:00.000Z',
        signals: [
          makeSignal({ kind: 'pillar-sibsin', name: 'a' }),
          makeSignal({ kind: 'pillar-sibsin', name: 'b' }),
        ],
      })
      const d = toDay({ cell, natal: natal() })
      expect(d.totalSignals).toBe(2)
      expect(d.allSignals).toBe(d.signals)
    })
  })

  describe('transit 평탄화', () => {
    it('transit 신호를 body/aspect/target/glyph 로', () => {
      const cell = makeCell({
        datetime: '2026-06-15T00:00:00.000Z',
        signals: [
          makeSignal({
            kind: 'transit',
            source: 'astro',
            name: 'Mercury □ Sun',
            polarity: -1,
            evidence: {
              module: 'm',
              detail: {},
              planets: ['Mercury', 'Sun'],
              aspectType: 'square',
            },
          }),
        ],
      })
      const d = toDay({ cell, natal: natal() })
      expect(d.transits).toHaveLength(1)
      expect(d.transits[0]).toMatchObject({
        body: 'Mercury',
        bodyKo: '수성',
        aspect: '마찰',
        target: '본명 Sun',
        glyph: '☿',
        polarity: -1,
      })
      // transit 은 continue → signals 에는 안 들어감
      expect(d.signals.find((s) => s.kind === 'transit')).toBeUndefined()
    })

    it('알 수 없는 aspectType 은 원본 그대로, target 없으면 빈 문자열', () => {
      const cell = makeCell({
        datetime: '2026-06-15T00:00:00.000Z',
        signals: [
          makeSignal({
            kind: 'transit',
            evidence: { module: 'm', detail: {}, planets: ['Mars'], aspectType: 'novile' },
          }),
        ],
      })
      const d = toDay({ cell, natal: natal() })
      expect(d.transits[0].aspect).toBe('novile')
      expect(d.transits[0].target).toBe('')
    })
  })

  describe('신살 active 칩', () => {
    it('shinsalName 을 모으되 12운성(건록/제왕)은 제외', () => {
      const cell = makeCell({
        datetime: '2026-06-15T00:00:00.000Z',
        signals: [
          makeSignal({
            kind: 'shinsal',
            evidence: { module: 'm', detail: {}, shinsalName: '도화' },
          }),
          makeSignal({
            kind: 'shinsal',
            evidence: { module: 'm', detail: {}, shinsalName: '건록' },
          }),
          makeSignal({
            kind: 'shinsal',
            evidence: { module: 'm', detail: {}, shinsalName: '제왕' },
          }),
        ],
      })
      const d = toDay({ cell, natal: natal() })
      expect(d.shinsalActive).toEqual(['도화'])
    })
  })

  describe('applied-pattern / cross-activation', () => {
    it('applied-pattern 추출 (body 포함)', () => {
      const cell = makeCell({
        datetime: '2026-06-15T00:00:00.000Z',
        signals: [
          makeSignal({
            kind: 'applied-pattern',
            id: 'ap1',
            name: '상관견관',
            polarity: -2,
            evidence: { module: 'm', detail: { body: '관을 깨는 형국' } },
          }),
        ],
      })
      const d = toDay({ cell, natal: natal() })
      expect(d.appliedPatterns).toEqual([
        { id: 'ap1', name: '상관견관', body: '관을 깨는 형국', polarity: -2 },
      ])
      // continue → signals 에는 없음
      expect(d.signals.find((s) => s.kind === 'applied-pattern')).toBeUndefined()
    })

    it('cross-activation 추출 (sajuLine/astroLine/meaning)', () => {
      const cell = makeCell({
        datetime: '2026-06-15T00:00:00.000Z',
        signals: [
          makeSignal({
            kind: 'cross-activation',
            id: 'cx1',
            name: '정재 × 금성',
            polarity: 2,
            evidence: {
              module: 'm',
              detail: { sajuName: '정재', astroName: 'Venus', meaning: '재물 신호' },
            },
          }),
        ],
      })
      const d = toDay({ cell, natal: natal() })
      expect(d.crossActivations).toEqual([
        {
          signalId: 'cx1',
          name: '정재 × 금성',
          sajuLine: '정재',
          astroLine: 'Venus',
          meaning: '재물 신호',
          polarity: 2,
        },
      ])
    })

    it('crossSignals / narrative 는 항상 빈 배열로 prefill', () => {
      const d = toDay({ cell: makeCell({ datetime: '2026-06-15T00:00:00.000Z' }), natal: natal() })
      expect(d.crossSignals).toEqual([])
      expect(d.narrative).toEqual([])
    })
  })

  describe('polarity 캡 / 클램프', () => {
    it('신살 polarity 는 common ±2 캡 (도화 +3 → +2)', () => {
      const cell = makeCell({
        datetime: '2026-06-15T00:00:00.000Z',
        signals: [
          makeSignal({
            kind: 'shinsal',
            name: '도화살',
            polarity: 3,
            evidence: { module: 'm', detail: {}, shinsalName: '도화' },
          }),
        ],
      })
      const d = toDay({ cell, natal: natal() })
      expect(d.signals[0].polarity).toBe(2)
    })

    it('classical-noble 신살은 ±3 캡 (천을귀인 +3 유지)', () => {
      const cell = makeCell({
        datetime: '2026-06-15T00:00:00.000Z',
        signals: [
          makeSignal({
            kind: 'shinsal',
            name: '천을귀인',
            polarity: 3,
            evidence: { module: 'm', detail: {}, shinsalName: '천을귀인' },
          }),
        ],
      })
      const d = toDay({ cell, natal: natal() })
      expect(d.signals[0].polarity).toBe(3)
    })

    it('applyShinsalCap=false 면 신살 캡 미적용 (단, clampPolarity 로 ±3)', () => {
      const cell = makeCell({
        datetime: '2026-06-15T00:00:00.000Z',
        signals: [
          makeSignal({
            kind: 'shinsal',
            name: '도화살',
            polarity: 3,
            evidence: { module: 'm', detail: {}, shinsalName: '도화' },
          }),
        ],
      })
      const d = toDay({ cell, natal: natal(), applyShinsalCap: false })
      expect(d.signals[0].polarity).toBe(3)
    })

    it('비-신살 polarity 는 ±3 으로 clamp', () => {
      const cell = makeCell({
        datetime: '2026-06-15T00:00:00.000Z',
        signals: [makeSignal({ kind: 'pillar-sibsin', name: 'x', polarity: 5 as never })],
      })
      const d = toDay({ cell, natal: natal() })
      expect(d.signals[0].polarity).toBe(3)
    })
  })

  describe('지장간 객체', () => {
    it('정기/중기/여기 3층 + 십신 + 오행', () => {
      const d = toDay({ cell: makeCell({ datetime: '2026-06-15T00:00:00.000Z' }), natal: natal() })
      // 일간 甲: 己=정재, 乙=겁재, 丁=상관
      expect(d.jijanggan.jeonggi).toEqual({
        stem: '己',
        sibsin: '정재',
        element: '토',
        layer: '정기',
      })
      expect(d.jijanggan.junggi).toEqual({
        stem: '乙',
        sibsin: '겁재',
        element: '목',
        layer: '중기',
      })
      expect(d.jijanggan.yeogi).toEqual({
        stem: '丁',
        sibsin: '상관',
        element: '화',
        layer: '여기',
      })
    })

    it('지장간 결손 시 정기 "—" 폴백, 중기/여기 undefined', () => {
      const d = toDay({
        cell: makeCell({ datetime: '2026-06-15T00:00:00.000Z' }),
        natal: natal({ dayJijanggan: {} }),
      })
      expect(d.jijanggan.jeonggi).toEqual({ stem: '—', sibsin: '—', element: '토', layer: '정기' })
      expect(d.jijanggan.junggi).toBeUndefined()
      expect(d.jijanggan.yeogi).toBeUndefined()
    })
  })

  describe('공망 (gongmang)', () => {
    it('본명 일주 甲子 → 공망 戌/亥 (비활성 기본)', () => {
      const d = toDay({ cell: makeCell({ datetime: '2026-06-15T00:00:00.000Z' }), natal: natal() })
      expect(d.gongmang.natalBranches).toEqual(['戌', '亥'])
      expect(d.gongmang.active).toBe(false)
      expect(d.gongmang.activeBranches).toEqual([])
      expect(d.gongmang.activeAxes).toEqual([])
      expect(d.gongmang.note).toBeUndefined()
      // legacy alias
      expect(d.gongmang.branches).toEqual(['戌', '亥'])
    })

    it('gongmang 신호가 있으면 active=true + activeAxes=[일진]', () => {
      const cell = makeCell({
        datetime: '2026-06-15T00:00:00.000Z',
        signals: [
          makeSignal({
            kind: 'gongmang',
            name: '공망',
            evidence: { module: 'm', detail: { gongmangBranches: ['戌'], reason: '닿음' } },
          }),
        ],
      })
      const d = toDay({ cell, natal: natal() })
      expect(d.gongmang.active).toBe(true)
      expect(d.gongmang.activeBranches).toEqual(['戌'])
      expect(d.gongmang.activeAxes).toEqual(['일진'])
      expect(d.gongmang.note).toBe('닿음')
      // gongmang 신호는 signals 풀에도 들어감 (continue 없음)
      expect(d.signals.find((s) => s.kind === 'gongmang')).toBeDefined()
    })

    it('일주 정보가 없으면 공망 "—" 폴백', () => {
      const d = toDay({
        cell: makeCell({ datetime: '2026-06-15T00:00:00.000Z' }),
        natal: natal({ pillars: {} }),
      })
      expect(d.gongmang.natalBranches).toEqual(['—', '—'])
    })
  })

  describe('12운성 매트릭스', () => {
    it('iljinBranch 가 있으면 4기둥 천간 × 일진지지 단계', () => {
      const cell = makeCell({ datetime: '2026-06-15T00:00:00.000Z' })
      const d = toDay({ cell, natal: natal(), iljinStem: '丙', iljinBranch: '午' })
      expect(d.twelveStageMatrix).toHaveLength(4)
      expect(d.twelveStageMatrix.map((c) => c.pillar)).toEqual(['年', '月', '日', '時'])
      // 모두 일진 지지 午 기준
      expect(d.twelveStageMatrix.every((c) => c.branch === '午')).toBe(true)
      // 각 천간이 실제값 (—아님)
      expect(d.twelveStageMatrix[0].stem).toBe('庚')
      expect(d.twelveStageMatrix[0].stage).not.toBe('—')
    })

    it('iljinBranch 가 없으면 매트릭스 빈 배열', () => {
      const d = toDay({ cell: makeCell({ datetime: '2026-06-15T00:00:00.000Z' }), natal: natal() })
      expect(d.twelveStageMatrix).toEqual([])
    })
  })

  describe('score / dayTone / oneLine', () => {
    it('favorScore 가 derivedScore 보다 우선, 반올림', () => {
      const cell = makeCell({ datetime: '2026-06-15T00:00:00.000Z', derivedScore: 40 })
      const d = toDay({ cell, natal: natal(), favorScore: 72.6 })
      expect(d.score).toBe(73)
      expect(d.dayTone.band).toBe('good')
      expect(d.dayTone.tone).toBe('positive')
    })

    it('favorScore 미지정 시 derivedScore 사용', () => {
      const cell = makeCell({ datetime: '2026-06-15T00:00:00.000Z', derivedScore: 20.4 })
      const d = toDay({ cell, natal: natal() })
      expect(d.score).toBe(20)
      expect(d.dayTone.band).toBe('low')
    })

    it('positive 톤 → oneLine 은 긍정 풀의 한 문장 (칩 라벨 누수 없음)', () => {
      const cell = makeCell({
        datetime: '2026-06-15T00:00:00.000Z',
        derivedScore: 80,
        topReasons: ['↑ [이달] 좋은 흐름이에요 (게자리)'],
      })
      const d = toDay({ cell, natal: natal() })
      // 풀에서 뽑은 깨끗한 verdict — 칩 라벨/마커를 그대로 노출하지 않는다(누수 회귀 방지).
      expect(ONE_LINE_POOL.positive.ko).toContain(d.oneLine)
      expect(d.oneLine).not.toContain('↑')
      expect(d.oneLine).not.toContain('[')
      expect(d.oneLine).not.toContain('좋은 흐름이에요')
    })

    it('positive 톤 폴백 — 풀 문장', () => {
      const cell = makeCell({ datetime: '2026-06-15T00:00:00.000Z', derivedScore: 80 })
      const d = toDay({ cell, natal: natal() })
      expect(ONE_LINE_POOL.positive.ko).toContain(d.oneLine)
    })

    it('caution 톤 — oneLine(ko) + oneLineEn(en) 둘 다 각 풀에서 산출', () => {
      const cell = makeCell({ datetime: '2026-06-15T00:00:00.000Z', derivedScore: 10 })
      // 토글 안전을 위해 toDay 는 양쪽 로케일을 항상 채운다(lang 무관).
      const d = toDay({ cell, natal: natal(), lang: 'en' })
      expect(ONE_LINE_POOL.caution.ko).toContain(d.oneLine)
      expect(ONE_LINE_POOL.caution.en).toContain(d.oneLineEn)
    })

    it('opts.oneLine 직주입이 derive 보다 우선', () => {
      const cell = makeCell({ datetime: '2026-06-15T00:00:00.000Z', derivedScore: 80 })
      const d = toDay({ cell, natal: natal(), oneLine: '주입 한 줄' })
      expect(d.oneLine).toBe('주입 한 줄')
    })
  })

  describe('topReasons / cautions (lang 분기 + humanize)', () => {
    it('ko 기본 — topReasons/cautions humanize', () => {
      const cell = makeCell({
        datetime: '2026-06-15T00:00:00.000Z',
        derivedScore: 80,
        topReasons: ['↑ [대운] 삼합격'],
        cautions: ['↓ [일진] 지지충 申↔寅 (월주)'],
      })
      const d = toDay({ cell, natal: natal() })
      expect(d.topReasons[0]).toBe('↑ 10년 흐름 · 삼합격')
      expect(d.cautions[0]).toBe('↓ 오늘 · 지지충 申↔寅 (월주)')
    })

    it('양쪽 로케일을 항상 채운다 — topReasons(ko) + topReasonsEn(en)', () => {
      const cell = makeCell({
        datetime: '2026-06-15T00:00:00.000Z',
        derivedScore: 80,
        topReasons: ['ko-only'],
        topReasonsEn: ['en reason'],
        cautions: ['ko 주의'],
        cautionsEn: ['en caution'],
      })
      // lang 과 무관하게 양쪽 보관 — DayTier 가 클라이언트 로케일로 고른다.
      const d = toDay({ cell, natal: natal(), lang: 'en' })
      expect(d.topReasons).toContain('ko-only')
      expect(d.topReasonsEn).toContain('en reason')
      expect(d.cautions).toContain('ko 주의')
      expect(d.cautionsEn).toContain('en caution')
    })

    it('사유가 전혀 없으면 빈 배열', () => {
      const d = toDay({ cell: makeCell({ datetime: '2026-06-15T00:00:00.000Z' }), natal: natal() })
      expect(d.topReasons).toEqual([])
      expect(d.cautions).toEqual([])
    })
  })

  describe('reasonNet → dayTone 화해', () => {
    it('낮은 점수(low)인데 사유 net 우호 → bright/ mixed 로 상향', () => {
      // daily layer pillar-sibsin polarity +3 (reason layer, non-static) → reasonNet>0
      const cell = makeCell({
        datetime: '2026-06-15T00:00:00.000Z',
        derivedScore: 10, // band low
        topReasons: ['좋은 사유'],
        signals: [
          makeSignal({ kind: 'pillar-sibsin', layer: 'daily', polarity: 3, weight: 1, name: 'p' }),
        ],
      })
      const d = toDay({ cell, natal: natal() })
      expect(d.dayTone.band).toBe('low')
      expect(d.dayTone.bright).toBe(true)
      expect(d.dayTone.tone).toBe('mixed')
    })

    it('static natal kind 는 reasonNet 에서 제외 (band 그대로 caution)', () => {
      const cell = makeCell({
        datetime: '2026-06-15T00:00:00.000Z',
        derivedScore: 10,
        signals: [
          makeSignal({ kind: 'geokguk-status', layer: 'daily', polarity: 3, weight: 1, name: 'g' }),
        ],
      })
      const d = toDay({ cell, natal: natal() })
      // 좋은/주의 사유 둘 다 없고 reasonNet=0 → bright 안 켜짐
      expect(d.dayTone.bright).toBe(false)
      expect(d.dayTone.tone).toBe('caution')
    })
  })

  describe('geokgukStatus', () => {
    it('파격 + negative → 라인 합성', () => {
      const d = toDay({
        cell: makeCell({ datetime: '2026-06-15T00:00:00.000Z' }),
        natal: natal({
          analyses: {
            geokguk: {
              primary: '정관격',
              statusResult: { status: '파격', factors: { negative: ['상관 견관'] } },
            },
          },
        }),
      })
      expect(d.geokgukStatus).toBe('정관격 · 파격 (상관 견관)')
    })
  })
})

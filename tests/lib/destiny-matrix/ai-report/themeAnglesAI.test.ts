import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  generateThemeAnglesAI,
  ThemeAnglesAIError,
} from '@/lib/destiny-matrix/ai-report/themeAnglesAI'
import type { NormalizedSignal } from '@/lib/destiny-matrix/ai-report/signalSynthesizer'

const SIGNALS: NormalizedSignal[] = [
  {
    id: 'L5:samhap:trine',
    layer: 5,
    rowKey: 'samhap',
    colKey: 'trine',
    family: 'identity_drive',
    domainHints: ['career'],
    polarity: 'strength',
    score: 10,
    rankScore: 10,
    keyword: '최상조화',
    sajuBasis: '지지삼합 (亥·卯·未 삼합(목))',
    astroBasis: 'Saturn-True Node trine angle=120deg orb=2.63deg',
    advice: '',
    tags: [],
  },
  {
    id: 'L5:cheongan:chung',
    layer: 5,
    rowKey: 'cheongan',
    colKey: 'chung',
    family: 'career_guardrail',
    domainHints: ['career'],
    polarity: 'caution',
    score: 8,
    rankScore: 8,
    keyword: '파괴위험',
    sajuBasis: '천간충 (乙-辛 충)',
    astroBasis: 'Mercury-True Node square angle=90deg orb=0.29deg',
    advice: '',
    tags: [],
  },
]

const TARGET_DATE = '2026-05-06'

describe('themeAnglesAI/generateThemeAnglesAI', () => {
  const originalKey = process.env.ANTHROPIC_API_KEY
  const originalFetch = global.fetch

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
  })

  afterEach(() => {
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY
    else process.env.ANTHROPIC_API_KEY = originalKey
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('throws NO_API_KEY when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY
    await expect(
      generateThemeAnglesAI({
        theme: 'career',
        period: 'monthly',
        signals: SIGNALS,
        ctx: { targetDate: TARGET_DATE },
      })
    ).rejects.toMatchObject({ code: 'NO_API_KEY' })
  })

  it('parses a well-formed response into RenderedAngle[]', async () => {
    const goodPayload = {
      angles: [
        { key: 'essence', label: '본질', prose: '너는 커리어에서 칼날 같은 분별력을 가진 사람이야.', evidence_signal_ids: ['L5:samhap:trine'] },
        { key: 'strength', label: '강점', prose: '평생 강점은 신호를 정밀하게 가르는 힘이야.', evidence_signal_ids: ['L5:samhap:trine'] },
        { key: 'weakness', label: '약점', prose: '같은 칼이 인간관계를 끊는 패턴.', evidence_signal_ids: ['L5:cheongan:chung'] },
        { key: 'timing', label: '시기 흐름', prose: '대운 끝물이라 정리 구간.', evidence_signal_ids: [] },
        { key: 'people', label: '사람', prose: '외부 멘토 자리가 비어있으면 안 돼.', evidence_signal_ids: ['L5:samhap:trine'] },
        { key: 'moneyVsMeaning', label: '돈 vs 의미', prose: '의미·권위 우선형이야.', evidence_signal_ids: [] },
        { key: 'recovery', label: '회복 패턴', prose: '몰입과 휴식 사이클 잡아야 함.', evidence_signal_ids: [] },
        { key: 'nextAction', label: '다음 행동', prose: '기준선 적기 / confirm / 한 박자 늦게.', evidence_signal_ids: [] },
      ],
    }
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ type: 'text', text: JSON.stringify(goodPayload) }],
          model: 'claude-opus-4-7',
          usage: {
            input_tokens: 100,
            output_tokens: 500,
            cache_read_input_tokens: 50,
            cache_creation_input_tokens: 0,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    const result = await generateThemeAnglesAI({
      theme: 'career',
      period: 'monthly',
      signals: SIGNALS,
      ctx: { targetDate: TARGET_DATE },
    })

    expect(result.angles).toHaveLength(8)
    expect(result.angles[0].angle).toBe('essence')
    expect(result.angles[0].prose).toContain('칼날')
    expect(result.angles[0].evidence).toHaveLength(1)
    expect(result.angles[0].evidence[0].id).toBe('L5:samhap:trine')
    expect(result.usage?.cacheReadTokens).toBe(50)
    expect(result.model).toBe('claude-opus-4-7')
  })

  it('extracts JSON from a fenced markdown block', async () => {
    const wrapped = '```json\n' + JSON.stringify({
      angles: Array.from({ length: 8 }, (_, i) => ({
        key: ['essence', 'strength', 'weakness', 'timing', 'people', 'moneyVsMeaning', 'recovery', 'nextAction'][i],
        label: 'L',
        prose: 'P'.repeat(20),
        evidence_signal_ids: ['L5:samhap:trine'],
      })),
    }) + '\n```'

    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ type: 'text', text: wrapped }],
          model: 'claude-opus-4-7',
        }),
        { status: 200 }
      )
    )

    const result = await generateThemeAnglesAI({
      theme: 'career',
      period: 'lifetime',
      signals: SIGNALS,
      ctx: { targetDate: TARGET_DATE },
    })
    expect(result.angles).toHaveLength(8)
  })

  it('drops evidence ids that are not in the signal pool', async () => {
    const payload = {
      angles: Array.from({ length: 8 }, (_, i) => ({
        key: ['essence', 'strength', 'weakness', 'timing', 'people', 'moneyVsMeaning', 'recovery', 'nextAction'][i],
        label: 'L',
        prose: 'real prose '.repeat(5),
        evidence_signal_ids: ['L5:samhap:trine', 'fake_id_999', 'L5:cheongan:chung'],
      })),
    }
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(payload) }] }),
        { status: 200 }
      )
    )

    const result = await generateThemeAnglesAI({
      theme: 'career',
      period: 'lifetime',
      signals: SIGNALS,
      ctx: { targetDate: TARGET_DATE },
    })
    for (const angle of result.angles) {
      const ids = angle.evidence.map((e) => e.id)
      expect(ids).not.toContain('fake_id_999')
    }
  })

  it('throws INVALID_JSON on garbage output', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ content: [{ type: 'text', text: 'I cannot help with that.' }] }),
        { status: 200 }
      )
    )

    await expect(
      generateThemeAnglesAI({
        theme: 'career',
        period: 'lifetime',
        signals: SIGNALS,
        ctx: { targetDate: TARGET_DATE },
      })
    ).rejects.toBeInstanceOf(ThemeAnglesAIError)
  })

  it('throws TOO_FEW_ANGLES if fewer than 6 valid angles are returned', async () => {
    const payload = {
      angles: [
        { key: 'essence', label: 'L', prose: 'P', evidence_signal_ids: [] },
        { key: 'strength', label: 'L', prose: 'P', evidence_signal_ids: [] },
      ],
    }
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(payload) }] }),
        { status: 200 }
      )
    )

    await expect(
      generateThemeAnglesAI({
        theme: 'career',
        period: 'lifetime',
        signals: SIGNALS,
        ctx: { targetDate: TARGET_DATE },
      })
    ).rejects.toMatchObject({ code: 'TOO_FEW_ANGLES' })
  })

  it('surfaces non-200 HTTP status as a typed error', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response('rate limited', { status: 429 })
    )
    await expect(
      generateThemeAnglesAI({
        theme: 'career',
        period: 'lifetime',
        signals: SIGNALS,
        ctx: { targetDate: TARGET_DATE },
      })
    ).rejects.toMatchObject({ code: 'HTTP_429' })
  })
})

/**
 * lifePattern 구조 필드(A4) — 서사 머리(lead) · 본문(body) · 한 줄 태그(tagline) · 정점(peak).
 *
 * v9.2 Life 는 서사를 인용 머리와 본문으로 나눠 그리고, 정점 절은 10년 시간표의 그 해 행에
 * 따로 붙인다. 상담사 · 캘린더는 예전 한 줄(line/lineEn)을 그대로 쓴다 — 문장이 바뀌면 안 된다.
 */
import { describe, it, expect } from 'vitest'
import {
  deriveLifePattern,
  lifePatternTagline,
  type LifePatternKey,
} from '@/lib/calendar-engine/derivers/lifePattern'
import { lifeTypeStyle } from '@/components/calendar/lifeTypeStyle'

// 甲 일간 · 신약: 壬子(인성 둘) = +2, 丙午(식상 둘) = −2.
const FAV = { stem: '壬', branch: '子' }
const UNFAV = { stem: '丙', branch: '午' }
const BIRTH_YEAR = 1997

/** 4세부터 10년마다 — 74세(2071) 대운만 우호, 앞쪽은 불리(실제 음수 골). */
function lateBloomerSaju() {
  const ages = [4, 14, 24, 34, 44, 54, 64, 74, 84, 94]
  return {
    dayMaster: { name: '甲' },
    strength: 'weak',
    daeun: ages.map((startAge) => ({
      ...(startAge >= 74 ? FAV : UNFAV),
      startAge,
      startYear: BIRTH_YEAR + startAge,
    })),
  }
}

/** 0–80세 꾸준히 올라 80세가 마루, 그 뒤 내려가는 곡선(장년 정점 → 대기만성). */
function lateCurve() {
  const points: Array<{ age: number; macro: number }> = []
  for (let age = 0; age <= 90; age++) {
    const macro = age <= 80 ? -0.5 + age / 80 : 0.5 - (age - 80) * 0.05
    points.push({ age, macro })
  }
  return { points }
}

// 예전(A4 이전) late-bloomer 한 줄 — 상담사 · 캘린더가 읽는 문장은 그대로여야 한다.
const LATE_BLOOMER_LINE_EN =
  'Early on you probably ached inside, wondering “why am I the slow one?” But you’re simply built to land late. You don’t pop off early — yet once you settle in, you don’t waver. Your real worth shows more with age.'
const LATE_BLOOMER_LINE_KO =
  '어릴 땐 “왜 나만 이렇게 더디지” 싶어 속으로 많이 앓았을 거예요. 근데 당신은 원래 늦게 자리 잡는 사람이에요. 급하게 안 터지는 대신, 한번 잡으면 안 흔들려요. 나이 들수록 진가가 드러나는 쪽.'

describe('lifePattern — lead / body / tagline / peak', () => {
  it('late-bloomer: lead · body (ko/en) + 구조 정점 {age 80, year 2077}; lineEn 은 예전 문장 + 정점 절', () => {
    const p = deriveLifePattern(lateBloomerSaju(), 29, lateCurve())
    expect(p?.key).toBe('late-bloomer')
    expect(p?.leadEn).toBe('Early on you probably ached inside, wondering “why am I the slow one?”')
    expect(p?.bodyEn).toBe(
      'But you’re simply built to land late. You don’t pop off early — yet once you settle in, you don’t waver. Your real worth shows more with age.'
    )
    expect(p?.lead).toBe('어릴 땐 “왜 나만 이렇게 더디지” 싶어 속으로 많이 앓았을 거예요.')
    expect(p?.body.startsWith('근데 당신은 원래 늦게 자리 잡는 사람이에요.')).toBe(true)
    expect(p?.tagline).toBe('늦게 피어 오래가는')
    expect(p?.taglineEn).toBe('Blooms late, lasts long')
    expect(p?.peak).toEqual({
      age: 80,
      year: 2077,
      past: false,
      note: '특히 2077년(80세) 무렵부터, 학문·후원 쪽으로 가장 크게 열려요.',
      noteEn: 'It opens widest around 2077 (age 80) onward, toward learning and support.',
    })
    // 한 줄 서사 = 예전 문장 + 정점 절(바뀌지 않음).
    expect(p?.lineEn).toBe(`${LATE_BLOOMER_LINE_EN} ${p?.peak?.noteEn}`)
    expect(p?.line).toBe(`${LATE_BLOOMER_LINE_KO} ${p?.peak?.note}`)
  })

  it('정점 절이 없으면 peak 도 없고 line = lead + body', () => {
    // 인고형 — 모든 대운이 불리라 가리킬 순풍(favor>0)이 없다 → 정점 절 없음.
    const ages = [5, 15, 25, 35, 45, 55, 65, 75, 85]
    const saju = {
      dayMaster: { name: '甲' },
      strength: 'weak',
      daeun: ages.map((startAge) => ({ ...UNFAV, startAge, startYear: 1990 + startAge })),
    }
    const p = deriveLifePattern(saju, 30)
    expect(p?.key).toBe('hard')
    expect(p?.peak).toBeUndefined()
    expect(p?.lineEn).toBe(`${p?.leadEn} ${p?.bodyEn}`)
    expect(p?.line).toBe(`${p?.lead} ${p?.body}`)
  })

  it('대운 시작 연도를 모르면 정점 절은 남되 구조 peak 는 싣지 않는다(연도 없는 정점 금지)', () => {
    const ages = [15, 25, 35, 45, 55, 65, 75, 85]
    const saju = {
      dayMaster: { name: '甲' },
      strength: 'weak',
      daeun: ages.map((startAge) => ({ ...(startAge >= 45 ? FAV : UNFAV), startAge })),
    }
    const p = deriveLifePattern(saju, 30)
    expect(p?.peak).toBeUndefined()
    expect(p?.lineEn.startsWith(`${p?.leadEn} ${p?.bodyEn}`)).toBe(true)
  })

  it('회고형(정점 창이 지남) — midlife-peak EN 은 한 문장이라 body 가 비고 line = lead (+ 절)', () => {
    const ages = [5, 15, 25, 35, 45, 55, 65, 75, 85]
    const saju = {
      dayMaster: { name: '甲' },
      strength: 'weak',
      daeun: ages.map((startAge) => ({
        ...(startAge >= 40 && startAge < 60 ? FAV : UNFAV),
        startAge,
        startYear: 1940 + startAge,
      })),
    }
    const p = deriveLifePattern(saju, 85)
    expect(p?.key).toBe('midlife-peak')
    expect(p?.leadEn).toBe(
      'Your prime was the middle of life — the type whose early groundwork all paid off at once back then.'
    )
    expect(p?.bodyEn).toBe('')
    expect(p?.lead).toBe('당신의 전성기는 인생 한가운데였어요.')
    expect(p?.peak?.past).toBe(true)
    expect(p?.lineEn).toBe(`${p?.leadEn} ${p?.peak?.noteEn}`)
  })

  it('태그는 lifePattern 이 가진다 — lifeTypeStyle 은 그 값을 읽는다(옮긴 문구 그대로)', () => {
    const expected: Record<LifePatternKey, [string, string]> = {
      'late-bloomer': ['늦게 피어 오래가는', 'Blooms late, lasts long'],
      'youth-peak': ['이십·삼십대가 전성기', 'Peaks in your 20s–30s'],
      'early-peak': ['일찍부터 두각', 'Ahead from the start'],
      'midlife-peak': ['한가운데가 절정', 'Peaks at the middle'],
      'steady-rise': ['멈춘 적 없이 오르는', 'Never stops climbing'],
      smooth: ['큰 파도 없이 멀리', 'Calm and far-reaching'],
      hard: ['버틴 만큼 단단한', 'Forged by endurance'],
      undulating: ['오르내림이 무기인', 'Rides the waves'],
    }
    for (const [key, [ko, en]] of Object.entries(expected)) {
      expect(lifePatternTagline(key)).toEqual({ ko, en })
      expect(lifeTypeStyle(key)).toMatchObject({ taglineKo: ko, taglineEn: en })
    }
    expect(lifePatternTagline('toString')).toBeNull()
    expect(lifeTypeStyle('nope').taglineEn).toBe('Your own life flow')
  })
})

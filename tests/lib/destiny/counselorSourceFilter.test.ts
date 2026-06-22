/**
 * 운명상담사 데이터 소스 토글(사주만/점성만/둘 다) — LLM 에 들어가는 컨텍스트·
 * 시스템 프롬프트가 선택한 소스만 담는지 검증한다.
 *
 * 실제 Anthropic 호출은 비결정적이라 CI 에 못 박는다. 대신 모델 *입력*(컨텍스트
 * 데이터 + 시스템 프롬프트)에서 선택 안 한 시스템이 통째로 빠지는지를 결정론적으로
 * 검증한다 — 입력에 점성 데이터·지시가 없으면 모델이 점성을 근거로 답할 수 없다.
 */
import { describe, it, expect } from 'vitest'
import { buildDestinyContext } from '@/lib/destiny/counselorContext'
import { buildDestinyCounselorPrompt } from '@/lib/prompts/destinyCounselorPrompt'

const NOW = new Date('2026-06-22T12:00:00')
const BIRTH = {
  birthDate: '1990-05-15',
  birthTime: '14:30',
  gender: 'male' as const,
  timezone: 'Asia/Seoul',
  latitude: 37.5665,
  longitude: 126.978,
  birthTimeUnknown: false,
  birthCityUnknown: false,
}

// 각 시스템 고유 마커 — 한쪽 소스로 빌드한 컨텍스트에 반대 시스템 마커가 하나도
// 없어야 한다. 헤더(## 사주/## 점성)는 섹션 자체, 나머지는 그 시스템 고유 개념.
const SAJU_MARKERS = ['## 사주', '## 일진', '대운', '일간']
const ASTRO_MARKERS = ['## 점성', '프로펙션', '트랜짓', '솔라리턴']

describe('counselor source toggle — 컨텍스트 데이터 격리', () => {
  it('사주만: 사주 데이터 포함, 점성 데이터 0 (헤더·프로펙션·트랜짓·솔라리턴 누수 없음)', async () => {
    const { stable, daily } = await buildDestinyContext(BIRTH, NOW, 'ko', undefined, {
      saju: true,
      astro: false,
    })
    const all = `${stable}\n${daily}`
    expect(stable).toContain('## 사주')
    for (const m of ASTRO_MARKERS) expect(all).not.toContain(m)
  })

  it('점성만: 점성 데이터 포함, 사주 데이터 0 (사주·일진·대운·일간 누수 없음)', async () => {
    const { stable, daily } = await buildDestinyContext(BIRTH, NOW, 'ko', undefined, {
      saju: false,
      astro: true,
    })
    const all = `${stable}\n${daily}`
    expect(stable).toContain('## 점성')
    for (const m of SAJU_MARKERS) expect(all).not.toContain(m)
  })

  it('둘 다: 사주·점성 데이터 모두 포함 (기존 동작)', async () => {
    const { stable, daily } = await buildDestinyContext(BIRTH, NOW, 'ko', undefined, {
      saju: true,
      astro: true,
    })
    const all = `${stable}\n${daily}`
    expect(stable).toContain('## 사주')
    expect(stable).toContain('## 점성')
    expect(all).toContain('## 일진') // 사주 일진
    expect(all).toContain('프로펙션') // 점성
  })

  it('점성만 + 출생시간 미상: 크래시 없이 점성 데이터, 사주 누수 0', async () => {
    const { stable, daily } = await buildDestinyContext(
      { ...BIRTH, birthTime: '00:00', birthTimeUnknown: true },
      NOW,
      'ko',
      undefined,
      { saju: false, astro: true }
    )
    const all = `${stable}\n${daily}`
    expect(stable).toContain('## 점성')
    for (const m of SAJU_MARKERS) expect(all).not.toContain(m)
  })

  it('EN 로케일도 동일하게 격리된다 (사주만 → 점성 섹션 없음)', async () => {
    const { stable, daily } = await buildDestinyContext(BIRTH, NOW, 'en', undefined, {
      saju: true,
      astro: false,
    })
    const all = `${stable}\n${daily}`
    expect(stable).toContain('## SAJU')
    expect(all).not.toContain('## ASTRO')
    expect(all).not.toContain('profection')
  })
})

describe('counselor source toggle — 시스템 프롬프트 지시', () => {
  it('사주만: 사주-범위 지시 + 융합 규칙 제거 + 일진 규칙 유지, 점성-범위 지시 없음', () => {
    const ko = buildDestinyCounselorPrompt('ko', { saju: true, astro: false })
    expect(ko).toContain('사주(four pillars)만')
    expect(ko).toContain('일진 8일') // 일진 규칙 유지(사주 데이터 존재)
    expect(ko).toContain('이전 대화에서 점성을 언급했더라도') // 대화 누수 차단
    expect(ko).not.toContain('한 흐름 안에서 통합') // 융합 규칙 제거
    expect(ko).not.toContain('서양 점성(astrology)만')
  })

  it('점성만: 점성-범위 지시 + 융합/일진 규칙 제거, 사주-범위 지시 없음', () => {
    const ko = buildDestinyCounselorPrompt('ko', { saju: false, astro: true })
    expect(ko).toContain('서양 점성(astrology)만')
    expect(ko).toContain('이전 대화에서 사주를 언급했더라도')
    expect(ko).not.toContain('일진 8일') // 일진 규칙 제거(일진 데이터 없음)
    expect(ko).not.toContain('한 흐름 안에서 통합')
    expect(ko).not.toContain('사주(four pillars)만')
  })

  it('둘 다(기본): 융합 규칙 유지, 단일-소스 범위 지시 없음', () => {
    const ko = buildDestinyCounselorPrompt('ko')
    expect(ko).toContain('한 흐름 안에서 통합')
    expect(ko).toContain('사주에서 최소 하나') // 균형 규칙
    expect(ko).not.toContain('사주(four pillars)만')
    expect(ko).not.toContain('서양 점성(astrology)만')
  })

  it('EN 단일 소스도 ko/en 모두 비지 않는다 (드리프트 가드)', () => {
    for (const s of [
      { saju: true, astro: false },
      { saju: false, astro: true },
    ]) {
      expect(buildDestinyCounselorPrompt('en', s).length).toBeGreaterThan(100)
      expect(buildDestinyCounselorPrompt('ko', s).length).toBeGreaterThan(100)
    }
  })
})

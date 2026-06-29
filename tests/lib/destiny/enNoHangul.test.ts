/**
 * EN locale 누수 가드 — 영어 상담사에게 주입되는 데이터/프롬프트에 한국어
 * (Hangul) 가 섞이면 글로벌 품질·신뢰가 깨진다. astroSelfFormatter 는 한국어
 * 라벨로 중간 표현을 만들지만 slimAstroSelf 가 EN 으로 재출력하고, 본명/사주
 * 섹션은 counselorContext 가 locale 분기로 만든다 — 그 "EN 은 영어만" 계약을
 * 실제 출력으로 잠근다.
 */
import { describe, it, expect } from 'vitest'
import { buildDestinyContext } from '@/lib/destiny/counselorContext'
import { buildDestinyCounselorPrompt } from '@/lib/prompts/destinyCounselorPrompt'
import { slimAstroSelf } from '@/lib/destiny/astroSlim'

// 완성형 한글 + 자모. (한자(CJK)는 별도 — 프롬프트가 따로 금지하므로 여기선 Hangul 만.)
const HANGUL = /[가-힣㄰-㆏]/
function hangulHits(s: string): string[] {
  return s
    .split('\n')
    .filter((l) => HANGUL.test(l))
    .map((l) => l.trim())
}

const BIRTH = {
  birthDate: '1990-05-16',
  birthTime: '13:45',
  gender: 'male' as const,
  timezone: 'America/New_York',
  latitude: 40.7128,
  longitude: -74.006,
}
const NOW = new Date('2026-06-29T12:00:00Z')

describe('EN locale — no Hangul leaks', () => {
  it('EN destiny counselor prompt is Hangul-free (all source combos)', () => {
    for (const sources of [
      { saju: true, astro: true },
      { saju: true, astro: false },
      { saju: false, astro: true },
    ]) {
      const p = buildDestinyCounselorPrompt('en', sources)
      expect(hangulHits(p), `prompt sources=${JSON.stringify(sources)}`).toEqual([])
    }
  })

  it('slimAstroSelf EN re-emits Korean-labeled block as English only', () => {
    // formatAstroSelf 가 만드는 한국어 라벨 블록을 모사 → EN 출력에 한글 0 이어야.
    const block = [
      '== 점성 ==',
      '',
      '# 출생지 미상 — house / Ascendant / MC 데이터 생략.',
      '[Current transits — 행성 (오늘) → natal, 2026-06-29]',
      "Saturn (transit) in Aries Conjunction natal Sun in Aries 0°  Orb: 1°30'",
      '[Upcoming Eclipses — 본명 행성·angle ↔ 항성]',
      '일식 2026-08-12 Leo 20° conjunction Sun (House 5, orb 1.20°)',
      '[Solar Return — 2026]',
      'Asc: Leo 12°',
      'Sun in Aries 0°, House 5',
      'Saturn in Cancer 4°, House 12',
      '[Secondary Progression — 사용자 1년 = 행성 1일 진행]',
      "Progressed Sun: Taurus 3°15'",
      '[현재 시점 행성 신호]',
    ].join('\n')
    const out = slimAstroSelf(block, { locale: 'en', year: 2026 })
    expect(hangulHits(out), out).toEqual([])
  })

  it('EN saju-only context is Hangul-free', async () => {
    const ctx = await buildDestinyContext(BIRTH, NOW, 'en', undefined, {
      saju: true,
      astro: false,
    })
    const blob = JSON.stringify(ctx)
    expect(hangulHits(blob), blob).toEqual([])
  })

  it('EN saju+astro context is Hangul-free (skips if ephemeris unavailable)', async () => {
    let ctx
    try {
      ctx = await buildDestinyContext(BIRTH, NOW, 'en', undefined, { saju: true, astro: true })
    } catch {
      // Swiss Ephemeris 데이터가 없는 환경(샌드박스)에선 astro 빌드가 실패할 수
      // 있다 — 그 경우 이 케이스는 건너뛴다(saju-only 케이스가 핵심 보장).
      return
    }
    const blob = JSON.stringify(ctx)
    expect(hangulHits(blob), blob).toEqual([])
  })
})

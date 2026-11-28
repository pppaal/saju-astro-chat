/**
 * 상담사 EN 컨텍스트 라벨은 띄어 쓴 영어다 (재감사 SI-6).
 *
 * 예전엔 한국어 조합 규칙(壬임(양수), 년쇠·월사)을 영어에도 그대로 써서 'day_master: 壬(yangWater)',
 * '12-stages(...): Ydecline·Mdeath·Dcoming-of-age·Hnurture' 처럼 붙었다 — LLM 이 'yangWater'·
 * 'Ydecline' 을 영어 사용자에게 그대로 되풀이할 위험. 한국어는 붙여 쓰는 게 자연스러워 그대로 둔다.
 *
 * 표본: 1997-03-21 14:30 여 서울(판정의 corrected_expected — 12운성은 壬 기준 丑 쇠·卯 사·戌 관대·
 * 未 양을 손으로 대조한 값).
 */
import { describe, it, expect } from 'vitest'
import { buildDestinyContext, type DestinyBirth } from '@/lib/destiny/counselorContext'

const NOW = new Date(Date.UTC(2026, 10, 25, 12))
const SAJU_ONLY = { saju: true, astro: false }
const SAMPLE: DestinyBirth = {
  birthDate: '1997-03-21',
  birthTime: '14:30',
  gender: 'female',
  timezone: 'Asia/Seoul',
  latitude: 37.5665,
  longitude: 126.978,
}
const ELEMENTS = 'Wood|Fire|Earth|Metal|Water'
const STAGES =
  'birth|bath|coming-of-age|prosperity|peak|decline|illness|death|tomb|void|conception|nurture'

describe('상담사 EN 라벨 띄어쓰기 (SI-6)', () => {
  it('EN: day master 와 12 stages 가 띄어 쓴 영어', async () => {
    const { stable } = await buildDestinyContext(SAMPLE, NOW, 'en', undefined, SAJU_ONLY)
    expect(stable).toContain('day_master: 壬 (yang Water) weak rooted')
    expect(stable).toContain(
      '12 stages (rel. to day master 壬): Y decline · M death · D coming-of-age · H nurture'
    )
    // 붙은 형태가 어디에도 없다.
    expect(stable).not.toMatch(new RegExp(`\\b(yin|yang)(${ELEMENTS})\\b`))
    expect(stable).not.toMatch(new RegExp(`\\b[YMDH](${STAGES})\\b`))
  })

  it('EN 시간 미상(삼주)도 같은 규칙 — 1985-11-02 뉴욕', async () => {
    const { stable } = await buildDestinyContext(
      {
        birthDate: '1985-11-02',
        birthTime: '12:00',
        birthTimeUnknown: true,
        gender: 'male',
        timezone: 'America/New_York',
        latitude: 40.71,
        longitude: -74.0,
      },
      NOW,
      'en',
      undefined,
      SAJU_ONLY
    )
    expect(stable).toMatch(/^day_master: 乙 \(yin Wood\) /m)
    expect(stable).toMatch(/^12 stages \(rel\. to day master 乙\): Y \S+ · M \S+ · D \S+$/m)
  })

  it('KO 는 그대로 붙여 쓴다(회귀 없음)', async () => {
    const { stable } = await buildDestinyContext(SAMPLE, NOW, 'ko', undefined, SAJU_ONLY)
    expect(stable).toContain('일간: 壬임(양수) ')
    expect(stable).toContain('12운성(일간 壬 기준): 년쇠·월사·일관대·시양')
  })
})

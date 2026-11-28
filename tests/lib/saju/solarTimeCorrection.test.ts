/**
 * 시각 보정 SSOT — solarTimeCorrectionMinutes() 회귀.
 *
 * 사주 전 경로(본명 saju.ts, 달력 시진 saju-hour.ts)가 *이 함수 하나만* 호출한다.
 * 여기서 값이 고정되면, 어느 경로든 같은 보정을 쓰는 게 보장된다(복붙 재발 방지).
 *   보정분 = round((경도 − 표준자오선)×4), 표준자오선 = tzOffset/60×15, 평균태양시(균시차 없음).
 */
import { describe, it, expect } from 'vitest'
import { solarTimeCorrectionMinutes } from '@/lib/saju/timezone'

// DST 없는 날(중국·한국)과 DST 있는 날(미동부 4월=EDT) 섞어 결정론·DST 둘 다 확인.
const D = new Date('2030-04-20T03:00:00.000Z')

describe('solarTimeCorrectionMinutes — 시각 보정 SSOT', () => {
  it('서울 126.98°E (KST 135°) → −32분', () => {
    expect(solarTimeCorrectionMinutes(D, 126.978, 'Asia/Seoul')).toBe(-32)
  })
  it('부산 129.08°E (KST) → −24분', () => {
    expect(solarTimeCorrectionMinutes(D, 129.0756, 'Asia/Seoul')).toBe(-24)
  })
  it('카슈가르 76°E (베이징시간 120°) → −176분 (넓은 타임존 ~3시간)', () => {
    expect(solarTimeCorrectionMinutes(D, 75.99, 'Asia/Shanghai')).toBe(-176)
  })
  it('뉴욕 −74°W (4월=EDT, 자오선 −60°) → −56분 (DST 인식)', () => {
    expect(solarTimeCorrectionMinutes(D, -74.0, 'America/New_York')).toBe(-56)
  })
  it('표준자오선 정위치(135°E, KST) → 0', () => {
    expect(solarTimeCorrectionMinutes(D, 135, 'Asia/Seoul')).toBe(0)
  })
  it('경도 미상 → 존 기준 경도 (Asia/Seoul 126.978 → −32분, OD-2)', () => {
    expect(solarTimeCorrectionMinutes(D, undefined, 'Asia/Seoul')).toBe(-32)
    expect(solarTimeCorrectionMinutes(D, null, 'Asia/Seoul')).toBe(-32)
    expect(solarTimeCorrectionMinutes(D, Number.NaN, 'Asia/Seoul')).toBe(-32)
    // 경도 없는 서울 = 서울 기본값 경도 — 구조적으로 같은 보정.
    expect(solarTimeCorrectionMinutes(D, undefined, 'Asia/Seoul')).toBe(
      solarTimeCorrectionMinutes(D, 126.978, 'Asia/Seoul')
    )
    // 뉴욕 존 기준 경도 −74.01°(zone1970.tab) → EDT 자오선 −60° 대비 −56분.
    expect(solarTimeCorrectionMinutes(D, undefined, 'America/New_York')).toBe(-56)
  })
  it('존 자오선에서 60° 넘게 떨어진 경도는 버리고 존 기준 경도 (OD-14, SAJU-9)', () => {
    // LA 타임존 + 서울 경도(레거시 프로필·딥링크) — 예전엔 +928분(~15시간) 보정.
    const la = new Date('1990-06-15T19:00:00.000Z')
    expect(solarTimeCorrectionMinutes(la, 126.978, 'America/Los_Angeles')).toBe(
      solarTimeCorrectionMinutes(la, undefined, 'America/Los_Angeles')
    )
    expect(Math.abs(solarTimeCorrectionMinutes(la, 126.978, 'America/Los_Angeles'))).toBeLessThan(
      60
    )
    // 서울 타임존 + 뉴욕 경도 — 반대 방향도 같다.
    expect(solarTimeCorrectionMinutes(D, -74, 'Asia/Seoul')).toBe(-32)
    // 정상 최대치(카슈가르 44°)는 그대로 쓴다.
    expect(solarTimeCorrectionMinutes(D, 75.99, 'Asia/Shanghai')).toBe(-176)
  })
  it('날짜변경선 근처는 각도를 감아 하루를 더하지 않는다 (Kiritimati +14)', () => {
    // UTC+14 → 자오선 210° ≡ −150°. 크리스마스섬 −157.4° → −30분(−1470분 아님).
    expect(solarTimeCorrectionMinutes(D, -157.4, 'Pacific/Kiritimati')).toBe(-30)
  })
})

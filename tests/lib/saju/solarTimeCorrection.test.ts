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
  it('경도 미상 → 0 (보정 없음, 옛 동작 보존)', () => {
    expect(solarTimeCorrectionMinutes(D, undefined, 'Asia/Seoul')).toBe(0)
    expect(solarTimeCorrectionMinutes(D, null, 'Asia/Seoul')).toBe(0)
    expect(solarTimeCorrectionMinutes(D, Number.NaN, 'Asia/Seoul')).toBe(0)
  })
})

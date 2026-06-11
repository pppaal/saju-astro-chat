import { describe, it, expect } from 'vitest'
import { parseHourMinute } from '@/lib/saju/timeParse'

describe('parseHourMinute', () => {
  describe('24시간 표기', () => {
    it('HH:MM 을 그대로 파싱한다', () => {
      expect(parseHourMinute('13:45')).toEqual({ h: 13, m: 45 })
      expect(parseHourMinute('00:00')).toEqual({ h: 0, m: 0 })
      expect(parseHourMinute('23:59')).toEqual({ h: 23, m: 59 })
    })

    it('한 자리 시(7:05)도 허용한다', () => {
      expect(parseHourMinute('7:05')).toEqual({ h: 7, m: 5 })
    })

    it('분이 없으면 0분으로 처리한다', () => {
      expect(parseHourMinute('7')).toEqual({ h: 7, m: 0 })
    })
  })

  describe('AM/PM 변환', () => {
    it('PM 은 12를 더한다 (1:45 PM → 13:45)', () => {
      expect(parseHourMinute('1:45 PM')).toEqual({ h: 13, m: 45 })
      expect(parseHourMinute('11:30 PM')).toEqual({ h: 23, m: 30 })
    })

    it('AM 은 시를 유지한다 (9:05 AM → 9:05)', () => {
      expect(parseHourMinute('9:05 AM')).toEqual({ h: 9, m: 5 })
    })

    it('12 PM(정오)은 12시 그대로다', () => {
      expect(parseHourMinute('12:00 PM')).toEqual({ h: 12, m: 0 })
      expect(parseHourMinute('12:30 PM')).toEqual({ h: 12, m: 30 })
    })

    it('12 AM(자정)은 0시가 된다', () => {
      expect(parseHourMinute('12:00 AM')).toEqual({ h: 0, m: 0 })
      expect(parseHourMinute('12:59 AM')).toEqual({ h: 0, m: 59 })
    })

    it('이미 24시간제인 시각에 PM 이 붙어도 12시간 어긋나지 않는다 (13:00 PM → 13:00)', () => {
      expect(parseHourMinute('13:00 PM')).toEqual({ h: 13, m: 0 })
    })

    it('소문자 am/pm 도 인식한다', () => {
      expect(parseHourMinute('1:45 pm')).toEqual({ h: 13, m: 45 })
      expect(parseHourMinute('12:00 am')).toEqual({ h: 0, m: 0 })
    })

    it('공백 없이 붙은 PM 도 12시간 가산이 적용된다 (버그 수정)', () => {
      // 과거엔 /\bPM$/ 가 '45PM' 의 경계 부재로 미매치 → strip 만 되어
      // 01:45 로 오파싱(시주 12시간 어긋남)됐다. 접미사 매치로 교정.
      expect(parseHourMinute('1:45PM')).toEqual({ h: 13, m: 45 })
      expect(parseHourMinute('12AM')).toEqual({ h: 0, m: 0 })
      expect(parseHourMinute('12:30am')).toEqual({ h: 0, m: 30 })
    })
  })

  describe('비표준/오염 입력 정규화', () => {
    it('양끝 공백을 무시한다', () => {
      expect(parseHourMinute('  08:30  ')).toEqual({ h: 8, m: 30 })
    })

    it('범위를 벗어난 시/분은 경계로 clamp 한다 (25:99 → 23:59)', () => {
      expect(parseHourMinute('25:99')).toEqual({ h: 23, m: 59 })
    })

    it('음수 시는 0으로 clamp 한다', () => {
      expect(parseHourMinute('-3:10')).toEqual({ h: 0, m: 10 })
    })

    it('분에 섞인 비숫자 문자는 제거하고 파싱한다', () => {
      expect(parseHourMinute('10:30분')).toEqual({ h: 10, m: 30 })
    })

    it('숫자가 아닌 입력은 0:00 으로 폴백한다', () => {
      expect(parseHourMinute('abc')).toEqual({ h: 0, m: 0 })
      expect(parseHourMinute('')).toEqual({ h: 0, m: 0 })
    })

    it('null/undefined 가 흘러들어와도 throw 하지 않고 0:00 을 반환한다', () => {
      expect(parseHourMinute(null as unknown as string)).toEqual({ h: 0, m: 0 })
      expect(parseHourMinute(undefined as unknown as string)).toEqual({ h: 0, m: 0 })
    })
  })
})

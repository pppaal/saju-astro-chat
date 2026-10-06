// tests/lib/payments/money.test.ts
//
// 금액 단위를 타입으로 강제하는 것의 **동작** 검증 + 100배 사고의 회귀 가드.
//
// 이 레포에서 같은 버그가 11번 반복됐다: "A 에서 맞는 규칙을 B 에 복붙했는데
// B 에선 전제가 깨짐", 그리고 **틀려도 결과가 그럴듯해서** 못 본다.
// 금액에서 그 전제는 *단위*다:
//
//   packAmount('standard','USD') → 9.99   (Major, 달러)
//   session.amount_total         → 999    (Minor, 센트)
//
// 둘 다 number 였을 때 섞으면 100배 틀린 금액이 조용히 나갔다
// (`formatMinorUnits(9.99,'USD')` → "$0.10"). 실제 사고도 이 계열이었다:
// 원화 고정 수수료 300 이 USD 결제에 $3.00 으로 붙어 작은 팩 환불이 실패했다.
//
// 타입 차단 자체는 컴파일 타임 성질이라 런타임 테스트로 증명할 수 없다.
// 대신 (a) 변환이 정확한지, (b) 섞었을 때 실제로 100배 틀리는지(그래서 차단이
// 필요한지)를 수치로 못 박는다.

import { describe, it, expect } from 'vitest'
import {
  ZERO_DECIMAL_CURRENCIES,
  addMinor,
  asMajor,
  asMinor,
  clampMinor,
  formatMajor,
  formatMinor,
  minorPerMajor,
  pctOfMinor,
  subMinor,
  toMajor,
  toMinor,
} from '@/lib/payments/money'
import { packAmount } from '@/lib/config/pricing'
import { formulaFeeMinorUnits } from '@/lib/payments/stripeFees'

describe('minorPerMajor — 0-decimal 여부', () => {
  it('KRW·JPY 는 1, USD·EUR 는 100', () => {
    expect(minorPerMajor('krw')).toBe(1)
    expect(minorPerMajor('KRW')).toBe(1)
    expect(minorPerMajor('jpy')).toBe(1)
    expect(minorPerMajor('usd')).toBe(100)
    expect(minorPerMajor('eur')).toBe(100)
  })

  it('0-decimal 목록이 money 모듈 소유다 (수수료 모듈이 아니라)', () => {
    expect(ZERO_DECIMAL_CURRENCIES.has('krw')).toBe(true)
    expect(ZERO_DECIMAL_CURRENCIES.has('usd')).toBe(false)
  })
})

describe('toMinor / toMajor — 왕복', () => {
  it('USD $9.99 ↔ 999센트', () => {
    expect(toMinor(asMajor(9.99), 'USD')).toBe(999)
    expect(toMajor(asMinor(999), 'USD')).toBeCloseTo(9.99)
  })

  it('KRW ₩12,900 ↔ 12900 (0-decimal 이라 동일)', () => {
    expect(toMinor(asMajor(12900), 'KRW')).toBe(12900)
    expect(toMajor(asMinor(12900), 'KRW')).toBe(12900)
  })

  it('실제 팩 전부 왕복한다', () => {
    const packs = ['starter', 'mini', 'standard', 'plus', 'mega', 'ultimate'] as const
    for (const pack of packs) {
      for (const cur of ['KRW', 'USD'] as const) {
        const major = packAmount(pack, cur)
        const back = toMajor(toMinor(major, cur), cur)
        expect(back, `${pack} ${cur}`).toBeCloseTo(major, 2)
      }
    }
  })

  it('소수 센트는 반올림한다 — 정수 최소 단위만 Stripe 에 보낼 수 있다', () => {
    expect(toMinor(asMajor(0.3), 'USD')).toBe(30)
    expect(toMinor(asMajor(0.005), 'USD')).toBe(1)
    expect(Number.isInteger(toMinor(asMajor(19.995), 'USD'))).toBe(true)
  })
})

describe('단위를 섞으면 100배 틀린다 — 타입 차단이 필요한 이유', () => {
  it('Major 를 최소 단위 포매터에 넣으면 $9.99 가 $0.10 으로 나온다', () => {
    const major = packAmount('standard', 'USD') // 9.99 (Major)
    // 타입 차단 전엔 이게 그냥 통과했다. 지금은 캐스트가 있어야만 재현된다.
    const wrong = formatMinor(asMinor(major as unknown as number), 'USD')
    const right = formatMajor(major, 'USD')
    expect(right).toBe('$9.99')
    expect(wrong).toBe('$0.10') // 100배 축소 — 조용히 그럴듯하다
    expect(wrong).not.toBe(right)
  })

  it('Major 를 수수료 공식에 넣으면 수수료가 0.3 달러로 뭉개진다', () => {
    const majorUsd = packAmount('standard', 'USD') // 9.99
    const minorUsd = toMinor(majorUsd, 'USD') // 999
    const wrongFee = formulaFeeMinorUnits(asMinor(majorUsd as unknown as number), 'usd')
    const rightFee = formulaFeeMinorUnits(minorUsd, 'usd')
    // round(9.99*0.035)+30 = 0+30 = 30 vs round(999*0.035)+30 = 35+30 = 65
    expect(rightFee).toBe(65)
    expect(wrongFee).toBe(30)
    expect(wrongFee).toBeLessThan(rightFee)
  })

  it('KRW 는 0-decimal 이라 섞여도 티가 안 난다 — 그래서 USD 를 켤 때 터진다', () => {
    const major = packAmount('standard', 'KRW') // 12900
    expect(formatMajor(major, 'KRW')).toBe('₩12,900')
    expect(formatMinor(asMinor(major as unknown as number), 'KRW')).toBe('₩12,900')
    // 국내만 팔 때는 두 경로가 같은 값이라 버그가 잠복한다.
  })
})

describe('최소 단위 산술 — 브랜드 유지', () => {
  it('덧셈·뺄셈·퍼센트·클램프', () => {
    expect(addMinor(asMinor(999), asMinor(65))).toBe(1064)
    expect(subMinor(asMinor(999), asMinor(65))).toBe(934)
    expect(pctOfMinor(asMinor(999), 3.5)).toBe(35)
    expect(clampMinor(asMinor(-100))).toBe(0)
    expect(clampMinor(asMinor(934))).toBe(934)
  })

  it('퍼센트는 반올림해 정수 최소 단위를 유지한다', () => {
    for (const amt of [199, 499, 999, 1999, 3499, 5999]) {
      expect(Number.isInteger(pctOfMinor(asMinor(amt), 3.5)), String(amt)).toBe(true)
    }
  })
})

describe('표시 — 통화별 자릿수', () => {
  it('KRW 는 정수, USD 는 2자리', () => {
    expect(formatMinor(asMinor(12900), 'KRW')).toBe('₩12,900')
    expect(formatMinor(asMinor(999), 'USD')).toBe('$9.99')
    expect(formatMinor(asMinor(30), 'USD')).toBe('$0.30')
    expect(formatMajor(asMajor(12900), 'KRW')).toBe('₩12,900')
    expect(formatMajor(asMajor(9.99), 'USD')).toBe('$9.99')
  })

  it('모르는 통화도 0-decimal 여부에 맞춰 찍는다', () => {
    expect(formatMinor(asMinor(1234), 'EUR')).toBe('12.34 EUR')
    expect(formatMinor(asMinor(1234), 'JPY')).toBe('1234 JPY')
  })
})

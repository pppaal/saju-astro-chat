import { describe, expect, it } from 'vitest'
import {
  getIrreversibleActionGuards,
  summarizeGuards,
} from '@/lib/Saju/irreversibleActionGuards'

describe('getIrreversibleActionGuards', () => {
  it('용신 운 + 신강 → sign-contract = go', () => {
    const guards = getIrreversibleActionGuards({
      daymaster: '辛',
      geokguk: '정인격',
      strength: 'strong',
      primaryYongsin: '화',
      kibsin: ['수'],
      currentDaeunStem: '丙',  // 화
      currentSaeunStem: '丁',  // 화
    })
    const signGuard = guards.find((g) => g.action === 'sign-contract')
    expect(signGuard?.level).toBe('go')
  })

  it('기신 대운 → sign-contract = wait', () => {
    const guards = getIrreversibleActionGuards({
      daymaster: '辛',
      strength: 'mid',
      primaryYongsin: '화',
      kibsin: ['수'],
      currentDaeunStem: '壬',  // 수 = 기신
      currentSaeunStem: '甲',
    })
    const signGuard = guards.find((g) => g.action === 'sign-contract')
    expect(signGuard?.level).toBe('wait')
    expect(signGuard?.recheckAt).toContain('용신')
  })

  it('기신 대운 + 편관격 → sign-contract = block', () => {
    const guards = getIrreversibleActionGuards({
      daymaster: '甲',
      geokguk: '편관격',
      strength: 'weak',
      primaryYongsin: '수',
      kibsin: ['금'],
      currentDaeunStem: '庚',  // 금 = 기신
    })
    const signGuard = guards.find((g) => g.action === 'sign-contract')
    expect(signGuard?.level).toBe('block')
  })

  it('결혼은 go라도 caution으로 한 단계 보수화', () => {
    const guards = getIrreversibleActionGuards({
      daymaster: '辛',
      strength: 'strong',
      primaryYongsin: '화',
      kibsin: ['수'],
      currentDaeunStem: '丙',
      currentSaeunStem: '丁',
    })
    const marriage = guards.find((g) => g.action === 'marriage')
    expect(marriage?.level).toBe('caution')
    expect(marriage?.reason).toMatch(/결혼은/)
  })

  it('summarizeGuards 한 줄 narrative', () => {
    const guards = getIrreversibleActionGuards({
      daymaster: '甲',
      geokguk: '편관격',
      strength: 'weak',
      primaryYongsin: '수',
      kibsin: ['금'],
      currentDaeunStem: '庚',
    })
    const sum = summarizeGuards(guards)
    expect(sum).toMatch(/막아야|미루는/)
  })
})

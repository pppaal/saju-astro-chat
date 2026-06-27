import { describe, it, expect } from 'vitest'
import { humanizeReason } from '@/components/calendar/adapters/humanizeReason'

describe('humanizeReason — 표시 평어화', () => {
  it('영어 트랜짓을 한국어 관계 평어로 재구성', () => {
    expect(humanizeReason('↓ [세운] Uranus 어포지션 본명 Pluto')).toBe(
      '↓ 올해 · 천왕성 ↔ 타고난 명왕성 · 대립각'
    )
    expect(humanizeReason('↓ [월운] Mars 스퀘어 본명 Mars')).toBe(
      '↓ 이달 · 화성 ↔ 타고난 화성 · 긴장각'
    )
  })

  it('layer 태그를 시간대 평어로', () => {
    expect(humanizeReason('↑ [대운] 삼합격')).toBe('↑ 10년 흐름 · 삼합격')
    expect(humanizeReason('↓ [일진] 지지충 申↔寅 (월주)')).toBe('↓ 오늘 · 지지충 申↔寅 (월주)')
  })

  it('사주 한국어 용어는 그대로 둔다 (과번역=노이즈)', () => {
    // 丙午·정관·용신 등은 손대지 않음.
    expect(humanizeReason('↑ [세운] 丙午 (정관)')).toBe('↑ 올해 · 丙午 (정관)')
    expect(humanizeReason('↑ [세운] 용신 활성 — 丙午 세운')).toBe('↑ 올해 · 용신 활성 — 丙午 세운')
  })

  it('dignity 라벨은 행성+일상어로 (음역·별자리 괄호 제거)', () => {
    expect(humanizeReason('↑ [월운] Jupiter 엑잘테이션 (고양) (Cancer)')).toBe(
      '↑ 이달 · 목성이 가장 좋은 자리'
    )
    expect(humanizeReason('↓ [세운] Saturn 폴 (추락) (Aries)')).toBe(
      '↓ 올해 · 토성이 가장 약한 자리'
    )
    expect(humanizeReason('↓ [월운] Mars 디트리먼트 (반대 자리) (Taurus)')).toBe(
      '↓ 이달 · 화성이 약해지는 자리'
    )
  })

  it('조후용신 라벨은 계절+일상어로 (한자 月支·오행 음역 제거)', () => {
    expect(humanizeReason('↑ [월운] 午月 조후 — 수가 열 균형에 필요')).toBe(
      '↑ 이달 · 여름엔 물 기운이 균형에 도움'
    )
    expect(humanizeReason('↑ [월운] 子月 조후 — 화가 한 균형에 필요')).toBe(
      '↑ 이달 · 겨울엔 불 기운이 균형에 도움'
    )
  })

  it('ZR 챕터의 별자리·행성만 한국어화', () => {
    expect(humanizeReason('↑ [대운] 운명 ZR 챕터 — Sagittarius (Jupiter, 12년)')).toBe(
      '↑ 10년 흐름 · 운명 ZR 챕터 — 사수자리 (목성, 12년)'
    )
  })

  it('형식 안 맞으면 라벨만 평어화 (견고)', () => {
    expect(humanizeReason('Venus 트라인 본명 Moon')).toBe('금성 ↔ 타고난 달 · 조화각')
  })
})

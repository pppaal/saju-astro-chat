// src/lib/Saju/irreversibleActionGuards.ts
//
// 정통 자평진전·궁통보감 기반 비가역 행동 (서명·계약·결혼·이주·송금·
// 큰 매수/매도) 가드 매트릭스.
//
// 입력: 일간, 격국, 신강/신약, 용신, 기신, 현재 운기 (대운/세운/월운).
// 출력: 비가역 행동에 대한 'go' / 'wait' / 'block' 추천 + 이유.

import type { FiveElement } from './types'

const ELEMENT_OF_STEM: Record<string, FiveElement> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토',
  庚: '금', 辛: '금', 壬: '수', 癸: '수',
}

const ELEMENT_OF_BRANCH: Record<string, FiveElement> = {
  寅: '목', 卯: '목', 巳: '화', 午: '화', 辰: '토', 戌: '토',
  丑: '토', 未: '토', 申: '금', 酉: '금', 亥: '수', 子: '수',
}

export type IrreversibleAction =
  | 'sign-contract'   // 서명·계약
  | 'marriage'        // 결혼·약혼
  | 'relocation'      // 이주·이사
  | 'large-payment'   // 큰 송금·투자
  | 'major-purchase'  // 큰 매수 (부동산·주식)
  | 'major-sale'      // 큰 매도

export type GuardLevel = 'go' | 'caution' | 'wait' | 'block'

export interface ActionGuard {
  action: IrreversibleAction
  level: GuardLevel
  reason: string
  /** 다시 검토할 시점 (예: '용신 화 운 진입 후') */
  recheckAt?: string
}

export interface GuardInput {
  daymaster: string                      // 일간 (甲~癸)
  geokguk?: string                       // 격국 라벨
  strength?: 'strong' | 'mid' | 'weak'   // 신강/중간/신약
  primaryYongsin?: FiveElement
  kibsin?: FiveElement[]                 // 기신 (피해야 할 오행)
  currentDaeunStem?: string              // 현재 대운 천간
  currentDaeunBranch?: string            // 현재 대운 지지
  currentSaeunStem?: string              // 현재 세운 천간
  currentSaeunBranch?: string            // 현재 세운 지지
}

function periodElement(stem?: string, branch?: string): FiveElement | undefined {
  if (stem && ELEMENT_OF_STEM[stem]) return ELEMENT_OF_STEM[stem]
  if (branch && ELEMENT_OF_BRANCH[branch]) return ELEMENT_OF_BRANCH[branch]
  return undefined
}

function isYongsinPeriod(period: FiveElement | undefined, yongsin?: FiveElement): boolean {
  if (!period || !yongsin) return false
  return period === yongsin
}

function isKibsinPeriod(period: FiveElement | undefined, kibsin?: FiveElement[]): boolean {
  if (!period || !kibsin?.length) return false
  return kibsin.includes(period)
}

/**
 * 비가역 행동에 대한 정통 가드 산출.
 *
 * 룰:
 *   - 용신 운 + 신강 = go (자기 결정 적기)
 *   - 용신 운 + 신약 = caution (도움받을 결, 단독 결정 X)
 *   - 기신 운 = wait (그 운기 끝날 때까지)
 *   - 기신 운 + 편관격 = block (충동 결정 가장 큰 손실)
 *   - 가종/파격 + 정격 운 = wait
 *   - 결혼은 +배우자궁 (점성 7H) 동시 활성 시에만 go
 */
export function getIrreversibleActionGuards(input: GuardInput): ActionGuard[] {
  const out: ActionGuard[] = []

  const daeunEl = periodElement(input.currentDaeunStem, input.currentDaeunBranch)
  const saeunEl = periodElement(input.currentSaeunStem, input.currentSaeunBranch)

  const inYongsinDaeun = isYongsinPeriod(daeunEl, input.primaryYongsin)
  const inYongsinSaeun = isYongsinPeriod(saeunEl, input.primaryYongsin)
  const inKibsinDaeun = isKibsinPeriod(daeunEl, input.kibsin)
  const inKibsinSaeun = isKibsinPeriod(saeunEl, input.kibsin)

  const isPyeongwan = input.geokguk?.includes('편관') || input.geokguk?.includes('칠살') || /pyeongwan/i.test(input.geokguk || '')
  const isJong = /jong|종/i.test(input.geokguk || '')
  const isWeak = input.strength === 'weak'
  const isStrong = input.strength === 'strong'

  for (const action of [
    'sign-contract',
    'marriage',
    'relocation',
    'large-payment',
    'major-purchase',
    'major-sale',
  ] as IrreversibleAction[]) {
    let level: GuardLevel = 'caution'
    let reason = '일반 컨디션 — 평소처럼 검토 후 진행'
    let recheckAt: string | undefined

    // 기신 대운/세운 — 가장 강한 block.
    if (inKibsinDaeun) {
      level = isPyeongwan ? 'block' : 'wait'
      reason = `현재 대운(${input.currentDaeunStem}${input.currentDaeunBranch})이 기신 ${daeunEl}` +
        (isPyeongwan ? ' + 편관격이라 충동 결정이 가장 큰 손실' : '')
      recheckAt = `다음 대운 또는 세운에 용신 ${input.primaryYongsin} 진입 후 재검토`
    } else if (inKibsinSaeun) {
      level = 'wait'
      reason = `올해 세운(${input.currentSaeunStem}${input.currentSaeunBranch}) 기신 ${saeunEl} — 12개월 hold 권장`
      recheckAt = '내년 세운 진입 후 재검토'
    } else if (inYongsinDaeun && inYongsinSaeun && isStrong) {
      level = 'go'
      reason = `대운+세운 동시 용신 ${input.primaryYongsin} + 신강 — 자기 결정 적기`
    } else if (inYongsinDaeun && isWeak) {
      level = 'caution'
      reason = `용신 대운이지만 신약 — 도움받는 결로 진행, 단독 결정 X`
    } else if (inYongsinDaeun || inYongsinSaeun) {
      level = 'go'
      reason = `용신 ${input.primaryYongsin} 운기 진입 — 적극 권장`
    }

    // 종격 + 정격 운 = wait.
    if (isJong && (inKibsinDaeun || inKibsinSaeun)) {
      level = 'wait'
      reason = '종격이 정격 운(인비 강세) 만난 시기 — 흐름 충돌 큼'
      recheckAt = '종격 흐름 운 재진입 시'
    }

    // 결혼은 더 보수적.
    if (action === 'marriage') {
      if (level === 'go') {
        // go라도 결혼은 한 단계 보수적.
        level = 'caution'
        reason = `결혼은 사주만으로 결정 X — ${reason}. 점성 7H ruler 동시 활성 + 양쪽 사주 궁합도 확인.`
      } else if (level === 'caution') {
        level = 'wait'
        reason = `결혼은 매우 보수적으로 — ${reason}. 약혼 단계까지만, 본 결혼은 다음 시기로.`
      }
    }

    // 큰 매도는 자원 = 재성 약할 때 + 신약 시 더 위험.
    if (action === 'major-sale' && isWeak && (inKibsinDaeun || inKibsinSaeun)) {
      level = 'block'
      reason = `신약 + 기신 운에 큰 매도 = 자원 손실 패턴. ${reason}`
    }

    out.push({ action, level, reason, recheckAt })
  }

  return out
}

/**
 * 가드 결과를 한국어 한 줄 narrative로 컴팩트화.
 */
export function summarizeGuards(guards: ActionGuard[]): string {
  const blocks = guards.filter((g) => g.level === 'block')
  const waits = guards.filter((g) => g.level === 'wait')
  const gos = guards.filter((g) => g.level === 'go')

  const parts: string[] = []
  if (blocks.length) {
    parts.push(`🚫 막아야 할 결정: ${blocks.map((b) => actionKo(b.action)).join(', ')}`)
  }
  if (waits.length) {
    parts.push(`⏸ 미루는 게 안전: ${waits.map((b) => actionKo(b.action)).join(', ')}`)
  }
  if (gos.length) {
    parts.push(`✅ 가도 되는 결정: ${gos.map((b) => actionKo(b.action)).join(', ')}`)
  }
  return parts.join(' / ')
}

function actionKo(action: IrreversibleAction): string {
  switch (action) {
    case 'sign-contract': return '계약·서명'
    case 'marriage': return '결혼'
    case 'relocation': return '이주'
    case 'large-payment': return '큰 송금·투자'
    case 'major-purchase': return '큰 매수 (부동산·주식)'
    case 'major-sale': return '큰 매도'
  }
}

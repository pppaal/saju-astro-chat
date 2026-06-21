import { describe, it, expect, beforeEach } from 'vitest'
import {
  readPendingTurn,
  writePendingTurn,
  clearPendingTurn,
  PENDING_TURN_TTL_MS,
  type PendingTurn,
} from '@/lib/chat/pendingTurn'

const makeTurn = (over: Partial<PendingTurn> = {}): PendingTurn => ({
  turnId: 't-123',
  userText: '안녕하세요',
  ts: Date.now(),
  ...over,
})

describe('pendingTurn (끊긴 턴 복원 영속 식별자)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('write → read 라운드트립 (destiny)', () => {
    const turn = makeTurn()
    writePendingTurn('destiny', turn)
    expect(readPendingTurn('destiny')).toEqual(turn)
  })

  it('write → read 라운드트립 (compat)', () => {
    const turn = makeTurn({ turnId: 'c-9' })
    writePendingTurn('compat', turn)
    expect(readPendingTurn('compat')).toEqual(turn)
  })

  it('kind 별로 키가 분리된다', () => {
    writePendingTurn('destiny', makeTurn({ turnId: 'd' }))
    writePendingTurn('compat', makeTurn({ turnId: 'c' }))
    expect(readPendingTurn('destiny')?.turnId).toBe('d')
    expect(readPendingTurn('compat')?.turnId).toBe('c')
    // 키 검증: 각 kind 가 올바른 localStorage 키를 쓴다.
    expect(window.localStorage.getItem('destinyCounselor:pendingTurn')).toBeTruthy()
    expect(window.localStorage.getItem('compatCounselor:pendingTurn')).toBeTruthy()
  })

  it('없으면 null', () => {
    expect(readPendingTurn('destiny')).toBeNull()
    expect(readPendingTurn('compat')).toBeNull()
  })

  it('clear 후엔 null', () => {
    writePendingTurn('destiny', makeTurn())
    clearPendingTurn('destiny')
    expect(readPendingTurn('destiny')).toBeNull()
  })

  it('clear 는 해당 kind 만 지운다', () => {
    writePendingTurn('destiny', makeTurn({ turnId: 'd' }))
    writePendingTurn('compat', makeTurn({ turnId: 'c' }))
    clearPendingTurn('destiny')
    expect(readPendingTurn('destiny')).toBeNull()
    expect(readPendingTurn('compat')?.turnId).toBe('c')
  })

  it('잘못된 JSON → null (catch 경로)', () => {
    window.localStorage.setItem('destinyCounselor:pendingTurn', '{not valid json')
    expect(readPendingTurn('destiny')).toBeNull()
  })

  it('turnId 없는 페이로드 → null', () => {
    window.localStorage.setItem(
      'destinyCounselor:pendingTurn',
      JSON.stringify({ userText: 'x', ts: Date.now() })
    )
    expect(readPendingTurn('destiny')).toBeNull()
  })

  it('ts 가 숫자가 아니면 → null', () => {
    window.localStorage.setItem(
      'compatCounselor:pendingTurn',
      JSON.stringify({ turnId: 't', userText: 'x', ts: 'nope' })
    )
    expect(readPendingTurn('compat')).toBeNull()
  })

  it('TTL 상수는 10분', () => {
    expect(PENDING_TURN_TTL_MS).toBe(10 * 60 * 1000)
  })

  it('덮어쓰기 — 마지막 write 가 이긴다', () => {
    writePendingTurn('destiny', makeTurn({ turnId: 'first' }))
    writePendingTurn('destiny', makeTurn({ turnId: 'second' }))
    expect(readPendingTurn('destiny')?.turnId).toBe('second')
  })
})

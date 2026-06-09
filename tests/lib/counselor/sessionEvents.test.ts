import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  SESSION_DELETED_EVENT,
  emitSessionDeleted,
  onSessionDeleted,
} from '@/lib/counselor/sessionEvents'

describe('counselor sessionEvents', () => {
  afterEach(() => vi.restoreAllMocks())

  it('delivers the deleted id to subscribers', () => {
    const cb = vi.fn()
    const off = onSessionDeleted(cb)
    emitSessionDeleted('sess_123')
    expect(cb).toHaveBeenCalledWith('sess_123')
    off()
  })

  it('stops delivering after unsubscribe', () => {
    const cb = vi.fn()
    const off = onSessionDeleted(cb)
    off()
    emitSessionDeleted('sess_456')
    expect(cb).not.toHaveBeenCalled()
  })

  it('ignores empty ids (no event dispatched)', () => {
    const cb = vi.fn()
    const off = onSessionDeleted(cb)
    emitSessionDeleted('')
    expect(cb).not.toHaveBeenCalled()
    off()
  })

  it('fans out to multiple subscribers (both list views update)', () => {
    const sidebar = vi.fn()
    const chatRail = vi.fn()
    const offA = onSessionDeleted(sidebar)
    const offB = onSessionDeleted(chatRail)
    emitSessionDeleted('sess_789')
    expect(sidebar).toHaveBeenCalledWith('sess_789')
    expect(chatRail).toHaveBeenCalledWith('sess_789')
    offA()
    offB()
  })

  it('uses the documented event name', () => {
    const handler = vi.fn()
    window.addEventListener(SESSION_DELETED_EVENT, handler)
    emitSessionDeleted('sess_evt')
    expect(handler).toHaveBeenCalledOnce()
    window.removeEventListener(SESSION_DELETED_EVENT, handler)
  })
})

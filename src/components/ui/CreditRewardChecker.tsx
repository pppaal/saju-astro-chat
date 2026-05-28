'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import CreditRewardModal from './CreditRewardModal'
import { logger } from '@/lib/logger'

interface RewardItem {
  id: string
  amount: number
  source: string
  createdAt: string
}

/**
 * 로그인 사용자가 페이지 진입 / 다른 탭에서 로그인 후 돌아왔을 때 자동 지급된
 * 보너스 (추천 보상 등) 가 미확인 상태면 모달로 1 회 노출.
 *
 * 로그아웃 → 친구가 결제 → 추천 보상 grant → 사용자가 나중에 로그인 → 이 컴포
 * 넌트가 unseen 발견 → 모달. 보고 닫으면 acknowledge POST 로 다시 안 뜨게.
 *
 * 이미 grant 시점에 in-app session 이 있어도 (페이지 새로고침 / 다른 탭 활성화
 * 등) visibilitychange 로 재조회.
 */
export default function CreditRewardChecker() {
  const { status } = useSession()
  const [rewards, setRewards] = useState<RewardItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const inFlightRef = useRef(false)
  const lastCheckRef = useRef(0)

  const check = useCallback(async () => {
    if (inFlightRef.current) return
    // 30 초 throttle — 탭 활성화 자주 일어나도 과한 호출 방지.
    if (Date.now() - lastCheckRef.current < 30_000) return
    inFlightRef.current = true
    try {
      const res = await fetch('/api/me/credit-rewards', { cache: 'no-store' })
      if (!res.ok) return
      const json = (await res.json()) as { rewards?: RewardItem[] }
      const list = Array.isArray(json.rewards) ? json.rewards : []
      if (list.length > 0) {
        setRewards(list)
        setIsOpen(true)
      }
      lastCheckRef.current = Date.now()
    } catch (err) {
      logger.debug('[CreditRewardChecker] fetch failed', { err })
    } finally {
      inFlightRef.current = false
    }
  }, [])

  // 인증 상태가 authenticated 으로 전환되거나 페이지 visible 일 때 체크.
  useEffect(() => {
    if (status !== 'authenticated') return
    check()
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [status, check])

  const handleClose = useCallback(async () => {
    setIsOpen(false)
    if (rewards.length === 0) return
    // Fire-and-forget — UI 는 즉시 닫고 ack 만 백그라운드.
    try {
      await fetch('/api/me/credit-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: rewards.map((r) => r.id) }),
      })
    } catch (err) {
      logger.debug('[CreditRewardChecker] ack failed', { err })
    }
  }, [rewards])

  return <CreditRewardModal isOpen={isOpen} rewards={rewards} onClose={handleClose} />
}

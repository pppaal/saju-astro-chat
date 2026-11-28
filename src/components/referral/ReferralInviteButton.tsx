'use client'

/**
 * ReferralInviteButton — 무료 결과 화면에서 로그인 유저가 자기 추천 링크
 * (/?ref=CODE)를 바로 공유하게 한다. 공유 버튼(결과 자랑)과 달리 이건 "친구
 * 데려오면 둘 다 크레딧" 동기를 노출하는 자리다.
 *
 * 로그인 유저만 코드가 있으므로 비로그인 시엔 렌더하지 않는다(게스트는 이미
 * 결과 공유 버튼으로 바이럴에 기여). 보상은 친구의 첫 결제 시 지급(서버 정책)
 * 이라 카피도 그대로 정직하게 적는다.
 *
 * 흐름은 useShareLink(추천 링크 발급 → Web Share → 복사), 버튼은
 * ShareLinkButton(pill · brass · sm).
 */

import { useSession } from 'next-auth/react'
import { Gift } from 'lucide-react'
import { ShareLinkButton } from '@/components/share/ShareLinkButton'
import { trackFunnel } from '@/lib/metrics/trackFunnel'
import { REFERRER_CREDITS, REFEREE_CREDITS } from '@/lib/referral/rewards'
import type { UseShareLinkOptions } from '@/lib/share/useShareLink'

function readReferralUrl(json: unknown): string | null {
  const url = (json as { data?: { referralUrl?: unknown } } | null)?.data?.referralUrl
  return typeof url === 'string' && url ? url : null
}

function referralLinkOptions(isKo: boolean): UseShareLinkOptions {
  return {
    endpoint: '/api/referral/create-code',
    title: isKo ? 'DestinyPal 초대' : 'DestinyPal invite',
    text: isKo
      ? 'DestinyPal에서 사주·궁합 무료로 봐봐!'
      : 'Check your free Saju & compatibility on DestinyPal!',
    isKo,
    readUrl: readReferralUrl,
    onStart: () => trackFunnel('referral.invite_clicked'),
    messages: isKo
      ? {
          createFailed: '초대 링크를 만들지 못했어요.',
          manualCopy: (url) => `초대 링크: ${url}`,
        }
      : {
          createFailed: 'Could not create an invite link.',
          manualCopy: (url) => `Invite link: ${url}`,
        },
    logTag: '[ReferralInvite]',
  }
}

export function ReferralInviteButton({ isKo }: { isKo: boolean }) {
  const { status } = useSession()

  // 비로그인 유저는 추천 코드가 없으므로 노출하지 않는다.
  if (status !== 'authenticated') return null

  return (
    <ShareLinkButton
      link={referralLinkOptions(isKo)}
      tone="brass"
      size="sm"
      icon={Gift}
      label={
        isKo
          ? `친구 초대하고 ${REFERRER_CREDITS} 크레딧 받기`
          : `Invite a friend, earn ${REFERRER_CREDITS} credits`
      }
      copiedLabel={isKo ? '초대 링크 복사됨!' : 'Invite link copied!'}
      caption={
        isKo
          ? `친구가 첫 결제하면 나 +${REFERRER_CREDITS} · 친구 +${REFEREE_CREDITS} 크레딧.`
          : `When your friend makes their first purchase: you +${REFERRER_CREDITS}, they +${REFEREE_CREDITS} credits.`
      }
    />
  )
}

'use client'

import { useState } from 'react'
import { Check, Copy, Share2, UserPlus } from 'lucide-react'
import { logger } from '@/lib/logger'
import { copyToClipboard } from '@/lib/utils/clipboard'
import {
  GOLD,
  INK,
  type Locale,
  type ReferralResponse,
  SectionSkeleton,
  cardCls,
  ghostBtnCls,
  inkBtnCls,
  loadingCls,
  sectionLabelCls,
  serifStyle,
} from './profileShared'

interface Props {
  referral: ReferralResponse | null
  loading: boolean
  locale: Locale
}

// 친구 추천 — 추천 코드/링크 복사·공유 + 보상 통계.
export function ReferralSection({ referral, loading, locale }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopyReferral = async () => {
    if (!referral?.referralUrl) return
    const ok = await copyToClipboard(referral.referralUrl)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } else {
      logger.warn('[profile/referral] clipboard failed')
    }
  }

  const handleShareReferral = async () => {
    if (!referral?.referralUrl) return
    // 공유 문구는 항상 영어로 통일(글로벌 일관성). URL 은 text 에 넣지 않고 url
    // 필드로만 보낸다 — text 에도 넣으면 카톡 등에서 링크가 두 번 찍힌다.
    const text = 'Join me on DestinyPal!'
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
          title: 'DestinyPal',
          text,
          url: referral.referralUrl,
        })
        return
      } catch {
        // user cancelled or share not supported — fall through to copy
      }
    }
    void handleCopyReferral()
  }

  return (
    <section className={`mt-6 ${cardCls}`}>
      <h2 className={sectionLabelCls}>
        <UserPlus className="h-3.5 w-3.5 text-[#a07a3c]" />
        {locale === 'ko' ? '친구 추천' : 'Refer a friend'}
      </h2>

      {loading ? (
        <SectionSkeleton rows={2} />
      ) : !referral ? (
        <p className={loadingCls}>
          {locale === 'ko' ? '추천 정보를 불러올 수 없어요' : 'Could not load referral info'}
        </p>
      ) : (
        <>
          <p className="mt-3 text-[12.5px] leading-relaxed text-[#78716c]">
            {locale === 'ko'
              ? '친구가 내 추천 링크로 가입한 뒤 첫 크레딧을 구매하면, 회원님은 10 크레딧, 친구는 5 크레딧을 받아요.'
              : 'When a friend signs up through your referral link and makes their first credit purchase, you get 10 credits and your friend gets 5 credits.'}
          </p>

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#ece4d4] bg-gradient-to-br from-[#faf6ee] to-[#fcfbf9] p-3.5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-[#a07a3c]">
                {locale === 'ko' ? '내 추천 코드' : 'My code'}
              </p>
              <p className="mt-1 truncate font-mono text-[1.1rem] font-semibold tracking-wider text-[#1c1917]">
                {referral.referralCode}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleCopyReferral()}
                className={ghostBtnCls}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    {locale === 'ko' ? '복사됨' : 'Copied'}
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    {locale === 'ko' ? '링크 복사' : 'Copy link'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => void handleShareReferral()}
                className={inkBtnCls}
              >
                <Share2 className="h-3.5 w-3.5" />
                {locale === 'ko' ? '공유' : 'Share'}
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <ReferralStat
              label={locale === 'ko' ? '가입' : 'Joined'}
              value={referral.stats.total}
            />
            <ReferralStat
              label={locale === 'ko' ? '받은 크레딧' : 'Credits earned'}
              value={`+${referral.stats.creditsEarned}`}
              gold
            />
          </div>
        </>
      )}
    </section>
  )
}

function ReferralStat({
  label,
  value,
  gold,
}: {
  label: string
  value: number | string
  gold?: boolean
}) {
  return (
    <div className="rounded-2xl border border-[#e7e5e4] bg-[#fcfbfa] px-3 py-3 text-center">
      <p
        className="text-[1.3rem] font-semibold leading-none"
        style={{ color: gold ? GOLD : INK, ...serifStyle }}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-[#a8a29e]">
        {label}
      </p>
    </div>
  )
}

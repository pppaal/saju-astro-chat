'use client'

import Link from 'next/link'
import { ArrowRight, Coins } from 'lucide-react'
import {
  type CreditsResponse,
  type Locale,
  type PurchasesResponse,
  SectionSkeleton,
  cardCls,
  formatDateOnly,
  linkCls,
  loadingCls,
  sectionLabelCls,
  serifStyle,
} from './profileShared'

interface Props {
  credits: CreditsResponse | null
  loading: boolean
  /** 다음 만료일 안내용 — 아직 로드 전이면 null (안내 없이 잔액만 표시) */
  purchases: PurchasesResponse | null
  locale: Locale
}

// 크레딧 — 남은 크레딧 잔액 + 가장 가까운 만료일.
export function CreditsSection({ credits, loading, purchases, locale }: Props) {
  return (
    <section className={`mt-6 ${cardCls}`}>
      <div className="flex items-center justify-between">
        <h2 className={sectionLabelCls}>
          <Coins className="h-3.5 w-3.5 text-[#a07a3c]" />
          {locale === 'ko' ? '크레딧' : 'Credits'}
        </h2>
        <Link href="/pricing" className={linkCls}>
          {locale === 'ko' ? '크레딧 충전' : 'Top up'}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <SectionSkeleton rows={2} />
      ) : !credits ? (
        <p className={loadingCls}>
          {locale === 'ko' ? '크레딧 정보를 불러올 수 없어요' : 'Could not load credit info'}
        </p>
      ) : (
        (() => {
          // 가장 빨리 만료될 (아직 만료 안 됐고 남은 게 있는) 구매분의 만료일을
          // 우측에 안내. purchases 가 아직 로드 안 됐거나 없으면 안내만 표시.
          const upcoming = (purchases?.purchases || [])
            .filter((p) => !p.expired && p.remaining > 0 && p.expiresAt)
            .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())[0]
          return (
            <div className="mt-4 flex items-end justify-between gap-4 rounded-2xl border border-[#ece4d4] bg-gradient-to-br from-[#faf6ee] to-[#fcfbf9] px-4 py-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#a07a3c]">
                  {locale === 'ko' ? '남은 크레딧' : 'Remaining'}
                </p>
                <p
                  className="mt-1.5 text-[2.1rem] font-semibold leading-none text-[#1c1917]"
                  style={serifStyle}
                >
                  {credits.credits.remaining}
                </p>
                <p className="mt-2 text-[11.5px] text-[#8b857d]">
                  {locale === 'ko'
                    ? '구매 후 3개월간 사용 가능'
                    : 'Valid for 3 months after purchase'}
                </p>
              </div>
              {upcoming && (
                <div className="text-right text-[11px] text-[#a8a29e]">
                  <p>{locale === 'ko' ? '다음 만료' : 'Next expiry'}</p>
                  <p className="mt-0.5 text-[12px] font-medium text-[#57534e]">
                    {formatDateOnly(upcoming.expiresAt, locale)}
                  </p>
                </div>
              )}
            </div>
          )
        })()
      )}
    </section>
  )
}

'use client'

/**
 * 리포트 → 운명 상담사 연결 CTA. 사주·점성 리포트 / 운흐름 캘린더 / 인생 흐름
 * 하단에 붙어, 저장된 생일(localStorage)을 그대로 실어 상담 채팅으로 이어준다
 * (없으면 그냥 /destiny-counselor 로).
 *
 * variant
 * - 'gold'(기본): 페이지 테마와 무관하게 읽히는 골드 그라데이션 버튼 + 색 상속 캡션
 *   (/integrated-report · /calendar).
 * - 'v9': v9 paper 화면(인생 흐름)의 검은 알약(CSS 모듈 클래스) + 캡션 + 가격 줄. 가격은
 *   PriceLine 이 SSOT(CREDIT_COSTS · creditsFromLabel)에서만 읽는다 — 숫자를 여기 적지 않는다.
 *
 * subject — 질문이 화면에 그린 차트의 판단(예: 그 달의 PUSH · HOLD 날짜)을 담을 때 그 차트의 본명.
 * 상담은 저장된 본명으로 열리므로, 저장된 본명이 subject.birth 와 같을 때만 question 을 싣고 아니면
 * subject.genericQuestion 을 싣는다(QA-8 — 남의 차트를 전제로 한 유료 질문 방지). 마운트 전에도 일반 질문.
 */
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { getStoredBirthInfo, buildCounselorHref, type StoredBirthInfo } from '@/lib/birth/storage'
import { isSameBirth, type BirthSubject } from '@/lib/birth/sameBirth'
import { trackFunnel, type FunnelEvent } from '@/lib/metrics/trackFunnel'
import PriceLine from '@/components/v9/PriceLine'
import s from './CounselorCTA.module.css'

interface CounselorCTAProps {
  lang: 'ko' | 'en'
  /** 상담 채팅에 미리 채울 첫 질문(ko/en). */
  question?: { ko: string; en: string }
  /** question 이 이 본명의 차트 판단을 담는다 — 저장된 본명과 다르면 genericQuestion 을 싣는다. */
  subject?: { birth: BirthSubject; genericQuestion: { ko: string; en: string } }
  /** 퍼널 집계용 이벤트 — 지정 시 CTA 클릭을 비콘으로 보낸다(서버 컴포넌트도 문자열로 전달 가능). */
  funnelEvent?: FunnelEvent
  variant?: 'gold' | 'v9'
  className?: string
}

const COPY = {
  label: { ko: '운명 상담사에게 물어보기', en: 'Ask the destiny counselor' },
  goldSub: {
    ko: '내 사주·별자리를 기억한 채로 바로 대화가 이어져요 · 크레딧으로 이용해요',
    en: 'Picks up with your chart already in context · uses credits',
  },
  v9Sub: {
    ko: '내 차트를 기억한 채로 바로 대화가 이어져요',
    en: 'Picks up with your chart already in context',
  },
} as const

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export default function CounselorCTA({
  lang,
  question,
  subject,
  funnelEvent,
  variant = 'gold',
  className,
}: CounselorCTAProps) {
  const [info, setInfo] = useState<StoredBirthInfo | null>(null)
  useEffect(() => {
    setInfo(getStoredBirthInfo())
  }, [])

  const chosen = subject && !isSameBirth(subject.birth, info) ? subject.genericQuestion : question
  const q = chosen ? chosen[lang] : ''
  const href = info
    ? buildCounselorHref(info, q, lang)
    : `/destiny-counselor?lang=${lang}${q ? `&q=${encodeURIComponent(q)}` : ''}`
  const onClick = funnelEvent ? () => trackFunnel(funnelEvent) : undefined

  if (variant === 'v9') {
    return (
      <div className={[s.cta, className].filter(Boolean).join(' ')} data-counselor-cta="v9">
        <Link href={href} prefetch={false} onClick={onClick} className={s.pill}>
          {COPY.label[lang]}
          <ArrowIcon />
        </Link>
        <p className={s.cap}>{COPY.v9Sub[lang]}</p>
        <PriceLine locale={lang} showLink={false} className={s.price} />
      </div>
    )
  }

  return (
    <div
      style={{ maxWidth: 660, margin: '12px auto 44px', padding: '0 20px', textAlign: 'center' }}
    >
      <Link
        href={href}
        prefetch={false}
        onClick={onClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '13px 26px',
          borderRadius: 999,
          background: 'linear-gradient(180deg, #b88f43, #a9833b)',
          color: '#fff',
          textDecoration: 'none',
          fontSize: 15,
          fontWeight: 700,
          boxShadow: '0 12px 32px -14px rgba(120, 90, 30, 0.65)',
        }}
      >
        <Sparkles className="w-4 h-4" />
        {`${COPY.label[lang]} →`}
      </Link>
      <p style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.6, opacity: 0.7 }}>
        {COPY.goldSub[lang]}
      </p>
    </div>
  )
}

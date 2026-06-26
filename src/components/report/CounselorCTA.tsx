'use client'

/**
 * 리포트 → 운명 상담사 연결 CTA. 사주·점성 리포트 / 운흐름 캘린더 / 인생 흐름
 * 하단에 붙어, 저장된 생일(localStorage)을 그대로 실어 상담 채팅으로 이어준다
 * (없으면 그냥 /destiny-counselor 로). 페이지 테마와 무관하게 읽히도록 골드
 * 그라데이션 버튼 + 색 상속 캡션으로 테마 중립 디자인.
 */
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import {
  getStoredBirthInfo,
  buildCounselorHref,
  type StoredBirthInfo,
} from '@/app/(main)/birthInfoStorage'
import { trackFunnel, type FunnelEvent } from '@/lib/metrics/trackFunnel'

interface CounselorCTAProps {
  lang: 'ko' | 'en'
  /** 상담 채팅에 미리 채울 첫 질문(ko/en). */
  question?: { ko: string; en: string }
  /** 퍼널 집계용 이벤트 — 지정 시 CTA 클릭을 비콘으로 보낸다(서버 컴포넌트도 문자열로 전달 가능). */
  funnelEvent?: FunnelEvent
}

export default function CounselorCTA({ lang, question, funnelEvent }: CounselorCTAProps) {
  const [info, setInfo] = useState<StoredBirthInfo | null>(null)
  useEffect(() => {
    setInfo(getStoredBirthInfo())
  }, [])

  const q = question ? question[lang] : ''
  const href = info
    ? buildCounselorHref(info, q, lang)
    : `/destiny-counselor?lang=${lang}${q ? `&q=${encodeURIComponent(q)}` : ''}`

  const label = lang === 'ko' ? '운명 상담사에게 물어보기 →' : 'Ask the destiny counselor →'
  const sub =
    lang === 'ko'
      ? '내 사주·별자리를 기억한 채로 바로 대화가 이어져요.'
      : 'Picks up with your chart already in context.'

  return (
    <div
      style={{ maxWidth: 660, margin: '12px auto 44px', padding: '0 20px', textAlign: 'center' }}
    >
      <Link
        href={href}
        prefetch={false}
        onClick={funnelEvent ? () => trackFunnel(funnelEvent) : undefined}
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
        {label}
      </Link>
      <p style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.6, opacity: 0.7 }}>{sub}</p>
    </div>
  )
}

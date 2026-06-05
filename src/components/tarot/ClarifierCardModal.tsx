'use client'

// 클래리파이어 카드 한 장을 모달로 펼쳐 보여주고, 사용자가 확인하면
// 본 채팅에 해석 요청 메시지로 흘려보낸다. 운명/궁합/타로 followup 셋 다
// 같은 모달을 공유한다 — 카드는 모달 마운트 시점에 뽑혀 즉시 노출.

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Sparkles } from 'lucide-react'
import { drawClarifierCard, type ClarifierCard } from '@/lib/tarot/drawClarifierCard'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface ClarifierCardModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (card: ClarifierCard) => void
  lang: 'ko' | 'en'
}

export default function ClarifierCardModal({
  isOpen,
  onClose,
  onConfirm,
  lang,
}: ClarifierCardModalProps) {
  const isKo = lang === 'ko'
  const [card, setCard] = useState<ClarifierCard | null>(null)
  const trapRef = useFocusTrap(isOpen)

  // 모달이 열릴 때마다 새 카드를 뽑는다. 닫히면 다음 오픈을 위해 reset.
  useEffect(() => {
    if (isOpen) {
      setCard(drawClarifierCard())
    } else {
      setCard(null)
    }
  }, [isOpen])

  // Esc 로 닫기 + 모달 열린 동안 body 스크롤 잠금.
  // 모바일(iOS Safari/Chrome)에서 body{overflow:hidden} 만으로는 잠금이 안 되고
  // 스크롤 위치가 0(맨 위)으로 튀어, "한 장 더 뽑기" 를 열거나 닫으면 페이지가
  // 맨 위로 올라가던 회귀 → position:fixed + top:-scrollY 로 본문을 그 자리에
  // 고정(표준 모바일 스크롤 락)했다가 닫을 때 정확히 복원한다.
  // alreadyLocked: 인라인 타로 모달 위에 중첩으로 열린 경우엔 부모가 이미 잠갔으니
  // 우리가 건드리지 않는다(닫을 때 배경이 풀려 튀는 것 방지).
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    // Body 스크롤 잠금만 — position:fixed 는 페이지가 맨 위로 점프하는 회귀
    // (CLS=1 poor) 가 있어 overflow:hidden 만 사용. iOS 한정 elastic scroll 은
    // touch-action 으로 대신 막는다.
    const body = document.body
    const prevOverflow = body.style.overflow
    body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      body.style.overflow = prevOverflow
    }
  }, [isOpen, onClose])

  if (!isOpen || !card) return null

  const displayName = isKo && card.nameKo ? card.nameKo : card.name

  return (
    <div
      ref={trapRef}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="clarifier-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 10, 20, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        // 모바일에서 카드 + 텍스트 + 버튼 다 안 보이는 회귀 — overflow auto +
        // align-items flex-start (top-aligned) 로 폰 키보드/주소바 영향 받아도
        // 카드 잘림 X. 작은 폰 (≤ ~700px) 에선 위에서부터 자연 스크롤.
        overflowY: 'auto',
        animation: 'clarifierFadeIn 0.2s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(160deg, #1e1b3a 0%, #0f0c24 100%)',
          border: '1px solid rgba(212, 181, 114, 0.35)',
          borderRadius: '20px',
          padding: '28px 24px',
          maxWidth: '380px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(212, 181, 114, 0.18)',
          animation: 'clarifierCardReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          // 짧은 화면 (모바일 가로 등) 에서도 콘텐츠 다 보이게.
          margin: 'auto',
        }}
      >
        <h2
          id="clarifier-modal-title"
          style={{
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(165, 220, 255, 0.85)',
            margin: 0,
            marginBottom: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Sparkles style={{ width: 14, height: 14 }} aria-hidden="true" />
          {isKo ? '클래리파이어 카드' : 'Clarifier card'}
        </h2>

        <div
          style={{
            position: 'relative',
            margin: '0 auto 16px',
            width: '180px',
            aspectRatio: '5 / 8',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
            transform: card.isReversed ? 'rotate(180deg)' : 'none',
          }}
        >
          {/* 일부 카드 그림은 애니메이션 webp — next/image 최적화 엔드포인트
              (/_next/image)가 애니메이션 webp 를 처리 못 해 이미지가 통째로
              안 뜨던 회귀. unoptimized 로 원본을 직접 서빙해 정적/애니메이션
              둘 다 확실히 표시한다. (Next 경고: "animated image ... add the
              unoptimized property".) */}
          <Image
            src={card.image}
            alt={displayName}
            fill
            sizes="180px"
            style={{ objectFit: 'cover' }}
            priority
            unoptimized
          />
        </div>

        <p
          style={{
            color: '#f1f5f9',
            fontSize: '18px',
            fontWeight: 600,
            margin: '0 0 4px',
          }}
        >
          {displayName}
        </p>
        <p
          style={{
            color: card.isReversed ? '#fb7185' : '#67e8f9',
            fontSize: '13px',
            margin: '0 0 22px',
          }}
        >
          {card.isReversed ? (isKo ? '역방향' : 'Reversed') : isKo ? '정방향' : 'Upright'}
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '11px 16px',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.75)',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {isKo ? '닫기' : 'Close'}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(card)
              onClose()
            }}
            style={{
              flex: 1.4,
              padding: '11px 16px',
              borderRadius: '999px',
              border: '1px solid rgba(212, 181, 114, 0.55)',
              background:
                'linear-gradient(135deg, rgba(193, 155, 86, 0.5) 0%, rgba(160, 122, 60, 0.5) 100%)',
              color: '#ffffff',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {isKo ? '이 카드로 해석 받기' : 'Read this card'}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes clarifierFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes clarifierCardReveal {
          0% {
            opacity: 0;
            transform: scale(0.92) translateY(12px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

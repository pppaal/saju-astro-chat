'use client'

// 클래리파이어 카드 한 장을 모달로 펼쳐 보여주고, 사용자가 확인하면
// 본 채팅에 해석 요청 메시지로 흘려보낸다. 운명/궁합/타로 followup 셋 다
// 같은 모달을 공유한다 — 카드는 모달 마운트 시점에 뽑혀 즉시 노출.

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Sparkles } from 'lucide-react'
import { drawClarifierCard, type ClarifierCard } from '@/lib/tarot/drawClarifierCard'

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

  // 모달이 열릴 때마다 새 카드를 뽑는다. 닫히면 다음 오픈을 위해 reset.
  useEffect(() => {
    if (isOpen) {
      setCard(drawClarifierCard())
    } else {
      setCard(null)
    }
  }, [isOpen])

  // Esc 로 닫기 + 모달 열린 동안 body 스크롤 잠금.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen || !card) return null

  const displayName = isKo && card.nameKo ? card.nameKo : card.name

  return (
    <div
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
        animation: 'clarifierFadeIn 0.2s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(160deg, #1e1b3a 0%, #0f0c24 100%)',
          border: '1px solid rgba(34, 211, 238, 0.35)',
          borderRadius: '20px',
          padding: '28px 24px',
          maxWidth: '380px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(34, 211, 238, 0.18)',
          animation: 'clarifierCardReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
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
          <Image
            src={card.image}
            alt={displayName}
            fill
            sizes="180px"
            style={{ objectFit: 'cover' }}
            priority
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
              border: '1px solid rgba(34, 211, 238, 0.55)',
              background:
                'linear-gradient(135deg, rgba(34, 211, 238, 0.35) 0%, rgba(99, 102, 241, 0.35) 100%)',
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

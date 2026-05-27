'use client'

// 클래리파이어 카드 — 모달에서 뽑은 카드 한 장을 채팅창 위쪽에 인라인
// 패널로 띄운다. 채팅 메시지 마크다운 렌더러가 이미지를 표시하지 않아
// `![alt](url)` 이 그냥 텍스트로 흐르던 문제를 해결하기 위해, 카드 자체는
// 여기 패널에 큼지막하게 그리고 LLM 해석은 채팅 메시지 흐름에 남긴다.

import { forwardRef } from 'react'
import Image from 'next/image'
import { Sparkles, X } from 'lucide-react'
import type { ClarifierCard } from '@/lib/tarot/drawClarifierCard'

interface ClarifierCardPanelProps {
  card: ClarifierCard | null
  lang: 'ko' | 'en'
  onDismiss: () => void
}

const ClarifierCardPanel = forwardRef<HTMLDivElement, ClarifierCardPanelProps>(
  function ClarifierCardPanel({ card, lang, onDismiss }, ref) {
    if (!card) {
      return null
    }

    const isKo = lang === 'ko'
    const displayName = isKo && card.nameKo ? card.nameKo : card.name

    return (
      <div
        ref={ref}
        role="region"
        aria-label={isKo ? '클래리파이어 카드' : 'Clarifier card'}
        style={{
          margin: '12px 16px',
          padding: '14px 16px',
          borderRadius: '16px',
          background: 'linear-gradient(160deg, rgba(30,27,58,0.92) 0%, rgba(15,12,36,0.92) 100%)',
          border: '1px solid rgba(34, 211, 238, 0.28)',
          boxShadow: '0 12px 36px rgba(34, 211, 238, 0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          animation: 'clarifierPanelReveal 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          style={{
            position: 'relative',
            flexShrink: 0,
            width: '78px',
            aspectRatio: '5 / 8',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
            transform: card.isReversed ? 'rotate(180deg)' : 'none',
          }}
        >
          <Image
            src={card.image}
            alt={displayName}
            fill
            sizes="78px"
            style={{ objectFit: 'cover' }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'rgba(165, 220, 255, 0.85)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '4px',
            }}
          >
            <Sparkles style={{ width: 12, height: 12 }} aria-hidden="true" />
            {isKo ? '보충 카드' : 'Clarifier'}
          </div>
          <div
            style={{
              color: '#f1f5f9',
              fontSize: '16px',
              fontWeight: 600,
              lineHeight: 1.25,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </div>
          <div
            style={{
              color: card.isReversed ? '#fb7185' : '#67e8f9',
              fontSize: '12px',
              marginTop: '2px',
            }}
          >
            {card.isReversed ? (isKo ? '역방향' : 'Reversed') : isKo ? '정방향' : 'Upright'}
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label={isKo ? '닫기' : 'Dismiss'}
          title={isKo ? '닫기' : 'Dismiss'}
          style={{
            flexShrink: 0,
            width: '30px',
            height: '30px',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          <X style={{ width: 14, height: 14 }} aria-hidden="true" />
        </button>

        <style jsx>{`
          @keyframes clarifierPanelReveal {
            from {
              opacity: 0;
              transform: translateY(-6px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    )
  }
)

export default ClarifierCardPanel

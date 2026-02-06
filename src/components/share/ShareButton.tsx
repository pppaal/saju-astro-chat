'use client'

import { useState } from 'react'

interface ShareData {
  title: string
  description: string
  imageUrl?: string
  url?: string
}

interface ShareButtonPropsWithData {
  data: ShareData
  className?: string
  children?: React.ReactNode
  // Card generation props (not used with data)
  generateCard?: never
  filename?: never
  shareTitle?: never
  shareText?: never
  label?: never
}

interface ShareButtonPropsWithCard {
  data?: never
  className?: string
  children?: React.ReactNode
  // Card generation props
  generateCard: () => Promise<Blob | null>
  filename: string
  shareTitle: string
  shareText: string
  label?: string
}

type ShareButtonProps = ShareButtonPropsWithData | ShareButtonPropsWithCard

export function ShareButton(props: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Determine if using card mode or data mode
  const isCardMode = 'generateCard' in props && props.generateCard !== undefined

  // For data mode
  const data: ShareData = isCardMode
    ? { title: props.shareTitle!, description: props.shareText! }
    : props.data!

  const shareUrl =
    data.url || (typeof window !== 'undefined' ? window.location.href : 'https://destinypal.com')
  const className = props.className || ''
  const children = props.children

  // 카카오 공유
  const shareKakao = () => {
    if (typeof window !== 'undefined' && (window as Window & { Kakao?: KakaoType }).Kakao) {
      const Kakao = (window as Window & { Kakao: KakaoType }).Kakao
      Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: data.title,
          description: data.description,
          imageUrl: data.imageUrl || 'https://destinypal.com/og-image.png',
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
        buttons: [
          {
            title: '운세 보러가기',
            link: {
              mobileWebUrl: shareUrl,
              webUrl: shareUrl,
            },
          },
        ],
      })
    } else {
      alert('카카오톡 공유 기능을 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
    }
    setShowMenu(false)
  }

  // 인스타그램 스토리 공유
  const shareInstagram = async () => {
    // 카드 모드: 카드 생성 후 다운로드
    if (isCardMode && 'generateCard' in props && props.generateCard) {
      setIsGenerating(true)
      try {
        const blob = await props.generateCard()
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = props.filename || 'share-card.png'
          a.click()
          URL.revokeObjectURL(url)
          alert('이미지를 저장한 후 인스타그램 스토리에 공유해주세요!')
        } else {
          alert('이미지 생성에 실패했습니다.')
        }
      } catch {
        alert('이미지 생성 중 오류가 발생했습니다.')
      } finally {
        setIsGenerating(false)
      }
    } else if (data.imageUrl) {
      // 데이터 모드: 기존 이미지 URL 사용
      window.open(data.imageUrl, '_blank')
      alert('이미지를 저장한 후 인스타그램 스토리에 공유해주세요!')
    } else {
      alert('공유할 이미지가 없습니다.')
    }
    setShowMenu(false)
  }

  // 트위터(X) 공유
  const shareTwitter = () => {
    const text = encodeURIComponent(`${data.title}\n${data.description}\n\n#DestinyPal #운세 #사주`)
    const url = encodeURIComponent(shareUrl)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
    setShowMenu(false)
  }

  // 페이스북 공유
  const shareFacebook = () => {
    const url = encodeURIComponent(shareUrl)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank')
    setShowMenu(false)
  }

  // 링크 복사
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      alert('링크가 복사되었습니다!')
    } catch {
      // fallback
      const textarea = document.createElement('textarea')
      textarea.value = shareUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      alert('링크가 복사되었습니다!')
    }
    setShowMenu(false)
  }

  // 네이티브 공유 (모바일)
  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: data.title,
          text: data.description,
          url: shareUrl,
        })
      } catch {
        // 사용자가 취소한 경우
      }
    } else {
      setShowMenu(true)
    }
  }

  // Button label: children > label (card mode) > default
  const buttonLabel =
    children || (isCardMode && 'label' in props ? props.label : null) || '공유하기'

  return (
    <div className="relative inline-block">
      <button
        onClick={nativeShare}
        disabled={isGenerating}
        className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 ${className}`}
      >
        <ShareIcon />
        {isGenerating ? '생성 중...' : buttonLabel}
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute bottom-full left-0 mb-2 bg-gray-900 rounded-lg shadow-xl p-2 z-50 min-w-[160px]">
            <ShareMenuItem onClick={shareKakao} icon="💬" label="카카오톡" />
            <ShareMenuItem onClick={shareInstagram} icon="📸" label="인스타그램" />
            <ShareMenuItem onClick={shareTwitter} icon="𝕏" label="X (트위터)" />
            <ShareMenuItem onClick={shareFacebook} icon="📘" label="페이스북" />
            <ShareMenuItem onClick={copyLink} icon="🔗" label="링크 복사" />
          </div>
        </>
      )}
    </div>
  )
}

function ShareMenuItem({
  onClick,
  icon,
  label,
}: {
  onClick: () => void
  icon: string
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 text-white hover:bg-gray-800 rounded-lg transition text-left"
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function ShareIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    </svg>
  )
}

// Kakao SDK 타입
interface KakaoType {
  Share: {
    sendDefault: (options: {
      objectType: string
      content: {
        title: string
        description: string
        imageUrl: string
        link: { mobileWebUrl: string; webUrl: string }
      }
      buttons: Array<{
        title: string
        link: { mobileWebUrl: string; webUrl: string }
      }>
    }) => void
  }
}

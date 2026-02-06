/**
 * Share Handlers Hook
 * Consolidates duplicate share logic across 3+ components
 *
 * Common patterns consolidated:
 * - Social media sharing (Kakao, WhatsApp, Twitter/X)
 * - Clipboard copy
 * - Native share API
 * - Share URL management
 */

import { useState, useCallback, useEffect } from 'react'
import { logger } from '@/lib/logger'

// ============ Types ============

export interface ShareOptions {
  /** URL to share */
  url: string
  /** Share message/text */
  message?: string
  /** Share title (for native share) */
  title?: string
}

export interface UseShareReturn {
  /** Copy URL to clipboard */
  copyToClipboard: () => Promise<boolean>
  /** Share via KakaoTalk */
  shareKakao: () => void
  /** Share via WhatsApp */
  shareWhatsApp: () => void
  /** Share via Twitter/X */
  shareTwitter: () => void
  /** Share via native share API */
  shareNative: () => Promise<boolean>
  /** Share via Facebook */
  shareFacebook: () => void
  /** Share via LINE */
  shareLine: () => void
  /** Whether clipboard was recently copied */
  copied: boolean
  /** Whether native share is supported */
  hasNativeShare: boolean
}

// ============ Constants ============

const COPY_FEEDBACK_DURATION = 2000

const SHARE_WINDOW_FEATURES = 'width=600,height=400,left=100,top=100'

// ============ Main Hook ============

/**
 * Hook for social media sharing functionality
 *
 * @example
 * const {
 *   copyToClipboard,
 *   shareKakao,
 *   shareTwitter,
 *   copied,
 *   hasNativeShare,
 * } = useShare({
 *   url: 'https://example.com',
 *   message: 'Check this out!',
 *   title: 'My App',
 * })
 */
export function useShare(options: ShareOptions): UseShareReturn {
  const { url, message = '', title = '' } = options
  const [copied, setCopied] = useState(false)

  // Check native share support
  const hasNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  // Copy to clipboard
  const copyToClipboard = useCallback(async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      return true
    } catch (err) {
      logger.error('[useShare] Failed to copy:', err)
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea')
        textArea.value = url
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopied(true)
        return true
      } catch {
        return false
      }
    }
  }, [url])

  // Reset copied state after delay
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION)
      return () => clearTimeout(timer)
    }
  }, [copied])

  // Share via KakaoTalk
  const shareKakao = useCallback(() => {
    const encodedUrl = encodeURIComponent(url)
    const encodedMessage = encodeURIComponent(message)
    const kakaoLink = `https://story.kakao.com/share?url=${encodedUrl}&text=${encodedMessage}`
    window.open(kakaoLink, '_blank', SHARE_WINDOW_FEATURES)
  }, [url, message])

  // Share via WhatsApp
  const shareWhatsApp = useCallback(() => {
    const fullMessage = message ? `${message} ${url}` : url
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(fullMessage)}`
    window.open(whatsappLink, '_blank')
  }, [url, message])

  // Share via Twitter/X
  const shareTwitter = useCallback(() => {
    const encodedUrl = encodeURIComponent(url)
    const encodedMessage = encodeURIComponent(message)
    const twitterLink = `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`
    window.open(twitterLink, '_blank', SHARE_WINDOW_FEATURES)
  }, [url, message])

  // Share via Facebook
  const shareFacebook = useCallback(() => {
    const encodedUrl = encodeURIComponent(url)
    const facebookLink = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
    window.open(facebookLink, '_blank', SHARE_WINDOW_FEATURES)
  }, [url])

  // Share via LINE
  const shareLine = useCallback(() => {
    const fullMessage = message ? `${message} ${url}` : url
    const lineLink = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(fullMessage)}`
    window.open(lineLink, '_blank', SHARE_WINDOW_FEATURES)
  }, [url, message])

  // Share via native API
  const shareNative = useCallback(async (): Promise<boolean> => {
    if (!hasNativeShare) return false

    try {
      await navigator.share({
        title: title || 'Share',
        text: message,
        url: url,
      })
      return true
    } catch (err) {
      // User cancelled or error
      if ((err as Error).name !== 'AbortError') {
        logger.error('[useShare] Native share failed:', err)
      }
      return false
    }
  }, [url, message, title, hasNativeShare])

  return {
    copyToClipboard,
    shareKakao,
    shareWhatsApp,
    shareTwitter,
    shareNative,
    shareFacebook,
    shareLine,
    copied,
    hasNativeShare,
  }
}

// ============ Share Menu Hook ============

export interface UseShareMenuReturn extends UseShareReturn {
  /** Whether dropdown/menu is open */
  isOpen: boolean
  /** Open the share menu */
  open: () => void
  /** Close the share menu */
  close: () => void
  /** Toggle the share menu */
  toggle: () => void
}

/**
 * Extended hook with menu state management
 *
 * @example
 * const { isOpen, toggle, shareKakao, ... } = useShareMenu({ url })
 */
export function useShareMenu(options: ShareOptions): UseShareMenuReturn {
  const [isOpen, setIsOpen] = useState(false)
  const shareHandlers = useShare(options)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  // Close on outside click (for dropdown)
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = () => setIsOpen(false)
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    // Delay to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  // Wrap share handlers to close menu after share
  const wrappedShareKakao = useCallback(() => {
    shareHandlers.shareKakao()
    close()
  }, [shareHandlers, close])

  const wrappedShareWhatsApp = useCallback(() => {
    shareHandlers.shareWhatsApp()
    close()
  }, [shareHandlers, close])

  const wrappedShareTwitter = useCallback(() => {
    shareHandlers.shareTwitter()
    close()
  }, [shareHandlers, close])

  const wrappedShareFacebook = useCallback(() => {
    shareHandlers.shareFacebook()
    close()
  }, [shareHandlers, close])

  const wrappedShareLine = useCallback(() => {
    shareHandlers.shareLine()
    close()
  }, [shareHandlers, close])

  const wrappedShareNative = useCallback(async () => {
    const result = await shareHandlers.shareNative()
    if (result) close()
    return result
  }, [shareHandlers, close])

  return {
    ...shareHandlers,
    shareKakao: wrappedShareKakao,
    shareWhatsApp: wrappedShareWhatsApp,
    shareTwitter: wrappedShareTwitter,
    shareFacebook: wrappedShareFacebook,
    shareLine: wrappedShareLine,
    shareNative: wrappedShareNative,
    isOpen,
    open,
    close,
    toggle,
  }
}

// ============ Referral Share Hook ============

/**
 * Hook for referral-based sharing with API integration
 */
export function useReferralShare(userId?: string) {
  const [referralUrl, setReferralUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (userId) {
      setLoading(true)
      fetch('/api/referral/create-code', { method: 'POST' })
        .then((res) => res.json())
        .then((data) => {
          if (data.referralUrl) {
            setReferralUrl(data.referralUrl)
          }
        })
        .catch((err) => logger.error('[useReferralShare] Failed to get referral code:', err))
        .finally(() => setLoading(false))
    } else {
      // For non-logged-in users, use base URL
      const baseUrl =
        typeof window !== 'undefined'
          ? process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
          : ''
      setReferralUrl(`${baseUrl}/destiny-pal`)
    }
  }, [userId])

  const shareHandlers = useShareMenu({
    url: referralUrl,
    message: 'Check out DestinyPal - AI Fortune Reading!',
    title: 'DestinyPal',
  })

  return {
    ...shareHandlers,
    referralUrl,
    loading,
    hasReferralUrl: Boolean(referralUrl),
  }
}

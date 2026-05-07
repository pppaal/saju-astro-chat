'use client'

import { useState } from 'react'
import { Share2, Copy, Printer, Check } from 'lucide-react'

interface CompatibilityShareBarProps {
  /** Title shown in OS share / Kakao card. */
  title: string
  /** One-line summary used as body text. */
  summary: string
}

type KakaoShare = {
  isInitialized?: () => boolean
  init?: (key: string) => void
  Share?: {
    sendDefault: (params: {
      objectType: 'feed'
      content: { title: string; description: string; imageUrl: string; link: { mobileWebUrl: string; webUrl: string } }
    }) => void
  }
}

/**
 * Compact action bar for sharing/saving the compatibility report.
 *
 * - Copy link: writes the current URL to clipboard, shows ✓ for 2s.
 * - Share: native `navigator.share` when available, falls back to copy.
 * - Kakao: routes through window.Kakao when SDK is loaded; falls back
 *   to copy too. Init is idempotent.
 * - Print: triggers `window.print()`. The browser's "save as PDF"
 *   destination handles export — no server-side renderer needed.
 */
export default function CompatibilityShareBar({ title, summary }: CompatibilityShareBarProps) {
  const [copied, setCopied] = useState(false)

  const url = typeof window !== 'undefined' ? window.location.href : ''

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore clipboard errors
    }
  }

  const shareNative = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text: summary, url })
        return
      } catch {
        // user cancelled or unsupported — fall through to copy
      }
    }
    void copyLink()
  }

  const shareKakao = () => {
    if (typeof window === 'undefined') return
    const Kakao = (window as unknown as { Kakao?: KakaoShare }).Kakao
    if (!Kakao?.Share) {
      void copyLink()
      return
    }
    if (Kakao.isInitialized && !Kakao.isInitialized()) {
      const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
      if (key && Kakao.init) Kakao.init(key)
    }
    try {
      Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title,
          description: summary,
          imageUrl: `${window.location.origin}/og-image.png`,
          link: { mobileWebUrl: url, webUrl: url },
        },
      })
    } catch {
      void copyLink()
    }
  }

  const print = () => {
    if (typeof window !== 'undefined') window.print()
  }

  return (
    <div className="flex items-center gap-2 flex-wrap rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-md px-4 py-3 print:hidden">
      <span className="text-xs text-slate-400 mr-2 hidden sm:inline">공유 / 저장</span>
      <button
        type="button"
        onClick={shareNative}
        className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs text-slate-100 transition-colors"
      >
        <Share2 className="w-3.5 h-3.5" /> 공유
      </button>
      <button
        type="button"
        onClick={shareKakao}
        className="flex items-center gap-1.5 rounded-lg border border-yellow-300/30 bg-yellow-300/10 hover:bg-yellow-300/20 px-3 py-1.5 text-xs text-yellow-200 transition-colors"
      >
        💬 카카오톡
      </button>
      <button
        type="button"
        onClick={copyLink}
        className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs text-slate-100 transition-colors"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? '복사됨' : '링크'}
      </button>
      <button
        type="button"
        onClick={print}
        className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs text-slate-100 transition-colors"
      >
        <Printer className="w-3.5 h-3.5" /> PDF
      </button>
    </div>
  )
}

'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import type { DMCopy } from './destiny-match-i18n'

interface MatchModalProps {
  copy: DMCopy
  open: boolean
  // 매치 상대 표시용 데이터 (이름 + 사진)
  otherName: string
  otherPhoto: string | null
  // 매치 연결 id — 있으면 메시지 보내기 라우팅 가능, 없으면 닫기로만 동작
  connectionId: string | null
  onClose: () => void
}

export function MatchModal({
  copy,
  open,
  otherName,
  otherPhoto,
  connectionId,
  onClose,
}: MatchModalProps) {
  const router = useRouter()
  if (!open) return null

  const handleSendMessage = () => {
    if (!connectionId) {
      onClose()
      return
    }
    // /destiny-match/chat/[connectionId] 페이지는 별도 PR. 없으면 그냥 404.
    // 매치 발생 자체는 record 됐고 사용자가 follow-up 할 surface 가 필요한
    // 정도라 일단 routing 만 걸어둠.
    router.push(`/destiny-match/chat/${connectionId}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={copy.matchTitle}
      // 페이지 위 전체 덮음 — sidebar / header 위로 올라옴
      className="fixed inset-0 z-[200] flex items-center justify-center bg-gradient-to-br from-rose-700/95 via-fuchsia-700/95 to-violet-800/95 px-6 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 30, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        // backdrop click 으로 닫히게 하되 modal 내부 클릭은 stop.
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm text-center text-white"
      >
        <h2 className="font-serif text-4xl font-bold tracking-tight drop-shadow-md">
          {copy.matchTitle}
        </h2>
        <p className="mt-3 text-sm opacity-90">{copy.matchBody(otherName)}</p>

        <div className="mt-8 flex items-center justify-center gap-3">
          {/* 사용자 자기 placeholder (heart accent) — 본인 photo 까지 가져오면
              로딩 1 회 추가. 일단 상대만 보여줘도 시각적으로 충분. */}
          <Avatar fallback="♥" />
          <Heart className="h-8 w-8 fill-white text-white drop-shadow-md" />
          <Avatar photo={otherPhoto} fallback={otherName.slice(0, 1).toUpperCase()} />
        </div>

        <div className="mt-10 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleSendMessage}
            className="w-full rounded-full bg-white px-6 py-3.5 text-base font-semibold text-rose-700 shadow-lg transition active:scale-[0.98]"
          >
            {copy.matchSendMessage}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full border border-white/40 px-6 py-3 text-sm font-medium text-white/95 transition hover:bg-white/10"
          >
            {copy.matchKeepSwiping}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Avatar({ photo, fallback }: { photo?: string | null; fallback: string }) {
  return (
    <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-white/20 shadow-lg">
      {photo ? (
        <Image src={photo} alt="" fill className="object-cover" unoptimized />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-3xl font-bold">
          {fallback}
        </div>
      )}
    </div>
  )
}

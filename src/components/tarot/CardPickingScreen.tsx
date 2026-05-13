'use client'

import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { RotateCcw, Sparkles } from 'lucide-react'
import BackButton from '@/components/ui/BackButton'
import type { Spread } from '@/lib/tarot/tarot.types'
import type { CardColorOption } from '@/lib/tarot/tarotThemeConfig'

const TOTAL_CARDS = 22 // 메이저 아르카나 22장 펼치기

interface CardPickingScreenProps {
  locale: string
  spreadInfo: Spread
  selectedColor: CardColorOption
  selectedIndices: number[]
  selectionOrderMap: Map<number, number>
  gameState: string
  isSpreading: boolean
  onCardClick: (index: number) => void
  onRedraw: () => void
  /** 메인페이지에서 받은 사용자 질문 */
  userTopic?: string
}

export function CardPickingScreen({
  locale,
  spreadInfo,
  selectedColor,
  selectedIndices,
  selectionOrderMap,
  gameState,
  isSpreading,
  onCardClick,
  onRedraw,
  userTopic,
}: CardPickingScreenProps) {
  const isKo = locale === 'ko'
  const MAX_SELECTED = spreadInfo.cardCount

  const containerRef = useRef<HTMLDivElement>(null)
  const [constraints, setConstraints] = useState({ left: 0, right: 0 })

  // 드래그 영역 계산
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth
      const spreadWidth = 1400
      const bound = Math.max(0, (spreadWidth - containerWidth) / 2 + 150)
      setConstraints({ left: -bound, right: bound })
    }
  }, [])

  // 부채꼴 카드 위치 계산
  const getCardStyle = (index: number) => {
    const progress = index / (TOTAL_CARDS - 1)
    const normalized = progress - 0.5
    const x = normalized * 1200
    const y = Math.pow(normalized * 2, 2) * 45
    const rotate = normalized * 35
    return { x, y, rotate }
  }

  const title = userTopic?.trim()
    ? `"${userTopic.trim()}"`
    : isKo
      ? '"마음이 이끄는 카드를 선택하세요"'
      : '"Choose the cards your heart calls to"'

  return (
    <div className="relative w-full min-h-screen bg-[#030308] flex flex-col items-center overflow-hidden font-sans selection:bg-transparent">
      {/* 프리미엄 배경 효과 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(49,46,129,0.15)_0%,rgba(3,3,8,1)_100%)] pointer-events-none" />

      {/* BackButton */}
      <div className="absolute top-4 left-4 z-30">
        <BackButton />
      </div>

      {/* 상단 — 질문 + 슬롯 */}
      <div className="w-full flex flex-col items-center pt-16 z-10 pointer-events-none px-4">
        <div className="flex items-center gap-3 mb-6 max-w-[90%]">
          <Sparkles className="w-5 h-5 text-amber-500/60 flex-shrink-0" />
          <h2 className="text-lg md:text-2xl text-amber-50/90 font-light tracking-[0.15em] line-clamp-2 text-center">
            {title}
          </h2>
          <Sparkles className="w-5 h-5 text-amber-500/60 flex-shrink-0" />
        </div>

        {/* 선택된 카드 슬롯 — spreadInfo.cardCount 만큼 */}
        <div
          className="flex justify-center gap-3 md:gap-6 mb-4 flex-wrap"
          style={{ maxWidth: MAX_SELECTED > 8 ? '90vw' : 'auto' }}
        >
          {Array.from({ length: MAX_SELECTED }).map((_, i) => {
            const filled = i < selectedIndices.length
            const positionLabel = spreadInfo.positions?.[i]
            const posTitle = isKo
              ? positionLabel?.titleKo ?? positionLabel?.title
              : positionLabel?.title
            return (
              <div
                key={i}
                className={`relative flex items-center justify-center transition-all duration-500 ${
                  MAX_SELECTED > 6 ? 'w-12 h-20 md:w-16 md:h-24' : 'w-20 h-32 md:w-24 md:h-36'
                } rounded-xl border ${
                  filled
                    ? 'border-amber-500/50 bg-amber-900/20 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                    : 'border-indigo-900/40 bg-indigo-950/10'
                }`}
              >
                {filled ? (
                  <Image
                    src={selectedColor.backImage}
                    alt={`Selected ${i + 1}`}
                    fill
                    sizes="(max-width: 768px) 15vw, 100px"
                    className="object-cover rounded-xl"
                  />
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="text-indigo-800/50 text-xs font-medium tracking-widest">
                      {i + 1}
                    </span>
                    {posTitle && (
                      <span className="text-indigo-700/40 text-[9px] mt-1 px-1 truncate max-w-full">
                        {posTitle}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-indigo-200/60 text-xs md:text-sm tracking-widest font-light text-center">
          {isKo
            ? `${selectedIndices.length}/${MAX_SELECTED} · 마음이 이끄는 카드를 선택하세요`
            : `${selectedIndices.length}/${MAX_SELECTED} · Choose the cards your heart calls to`}
        </p>
      </div>

      {/* 카드 드래그 영역 — 부채꼴 펼침 */}
      <div
        ref={containerRef}
        className="flex-1 w-full relative flex items-center justify-center mt-4 mb-24 cursor-grab active:cursor-grabbing"
      >
        <motion.div
          drag="x"
          dragConstraints={constraints}
          dragElastic={0.2}
          dragTransition={{ bounceStiffness: 100, bounceDamping: 15 }}
          className="absolute flex items-center justify-center"
          style={{ width: '100%', height: '100%' }}
        >
          {Array.from({ length: TOTAL_CARDS }).map((_, index) => {
            const isPicked = selectedIndices.includes(index)
            const sp = getCardStyle(index)
            const pickOrder = selectionOrderMap.get(index)

            return (
              <motion.button
                key={index}
                type="button"
                disabled={isPicked || selectedIndices.length >= MAX_SELECTED || isSpreading}
                initial={{ opacity: 0, y: 150 }}
                animate={{
                  opacity: isPicked ? 0.15 : 1,
                  x: sp.x,
                  y: isPicked ? sp.y - 150 : sp.y,
                  rotate: sp.rotate,
                  scale: isPicked ? 0.85 : 1,
                }}
                transition={{
                  duration: 0.6,
                  type: 'spring',
                  stiffness: 200,
                  damping: 20,
                }}
                whileHover={
                  !isPicked && selectedIndices.length < MAX_SELECTED
                    ? {
                        y: sp.y - 40,
                        scale: 1.08,
                        rotate: 0,
                        zIndex: 100,
                      }
                    : undefined
                }
                onClick={() => onCardClick(index)}
                className="absolute w-20 h-32 md:w-28 md:h-44 rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-amber-900/30 group"
                style={{
                  zIndex: index,
                  pointerEvents: isPicked ? 'none' : 'auto',
                  background: selectedColor.gradient,
                }}
              >
                {/* 카드 뒷면 — 선택된 덱 이미지 */}
                <div className="absolute inset-[3px] rounded-lg overflow-hidden group-hover:brightness-125 transition-all duration-300">
                  <Image
                    src={selectedColor.backImage}
                    alt={`Card ${index}`}
                    fill
                    sizes="(max-width: 768px) 80px, 112px"
                    className="object-cover"
                    priority={index < 4}
                  />
                </div>

                {/* 픽 순서 배지 */}
                {pickOrder !== undefined && (
                  <div
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-amber-500 text-[#030308] text-[10px] font-bold flex items-center justify-center z-10"
                    style={{ boxShadow: '0 0 8px rgba(245,158,11,0.6)' }}
                  >
                    {pickOrder + 1}
                  </div>
                )}

                {/* 호버 골드 글로우 */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 shadow-[0_0_25px_rgba(245,158,11,0.15)] transition-opacity duration-300 pointer-events-none" />
              </motion.button>
            )
          })}
        </motion.div>
      </div>

      {/* 하단 상태바 */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#05050f]/80 backdrop-blur-md border-t border-amber-900/20 flex justify-between items-center px-6 md:px-16 z-50">
        <span className="text-amber-100/60 text-sm font-light tracking-wide">
          {isKo ? '선택된 카드' : 'Selected'}{' '}
          <strong className="text-amber-400 font-medium ml-1">{selectedIndices.length}</strong> /{' '}
          {MAX_SELECTED}
        </span>
        <button
          onClick={onRedraw}
          disabled={selectedIndices.length === 0 || isSpreading || gameState === 'revealing'}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-950/30 hover:bg-indigo-900/50 disabled:opacity-30 disabled:cursor-not-allowed text-amber-100/80 rounded-lg text-sm transition-all duration-300 border border-indigo-800/30 hover:border-amber-700/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.1)]"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="tracking-wider">{isKo ? '다시 섞기' : 'Reshuffle'}</span>
        </button>
      </div>
    </div>
  )
}

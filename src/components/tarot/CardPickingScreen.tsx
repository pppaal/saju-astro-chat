'use client'

import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { motion, useDragControls } from 'framer-motion'
import { RotateCcw, Sparkles } from 'lucide-react'
import BackButton from '@/components/ui/BackButton'
import type { Spread } from '@/lib/tarot/tarot.types'
import type { CardColorOption } from '@/lib/tarot/tarotThemeConfig'

const TOTAL_CARDS = 40 // 부채꼴 펼침 — 시각적으로 더 풍성하고 카드 선택 변화 폭 확보

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
  // 데스크탑(마우스)에서 카드 위를 잡고 드래그하면 button 의 pointer capture
  // 에 막혀 framer-motion 의 drag 가 발동되지 않던 회귀. dragControls 를
  // 사용해 카드/빈 영역 어디서 pointerDown 이 일어나든 드래그가 시작되도록
  // 명시적으로 트리거한다. (모바일에서는 touch event 흐름이 달라 기존에도
  // 동작했음.)
  const dragControls = useDragControls()
  const [constraints, setConstraints] = useState({ left: 0, right: 0 })

  // 드래그 영역 계산 — 40장 호 폭(1400px) + 양쪽 여유 200px
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth
      const spreadWidth = 1600
      const bound = Math.max(0, (spreadWidth - containerWidth) / 2 + 200)
      setConstraints({ left: -bound, right: bound })
    }
  }, [])

  // 부채꼴 카드 위치 계산 — 40장 기준으로 호 폭/곡률 재조정
  const getCardStyle = (index: number) => {
    const progress = index / (TOTAL_CARDS - 1)
    const normalized = progress - 0.5
    // 카드 수 늘어난 만큼 호 폭 1400px 로 확장 (드래그로 양옆 탐색)
    const x = normalized * 1400
    const y = Math.pow(normalized * 2, 2) * 55
    // 부채꼴 각도 — 살짝만 펼쳐서 1자에 가깝게 (45 → 35)
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
              ? (positionLabel?.titleKo ?? positionLabel?.title)
              : positionLabel?.title
            return (
              <div
                key={i}
                className={`relative flex items-center justify-center transition-all duration-500 ${
                  MAX_SELECTED > 6 ? 'w-12 h-20 md:w-16 md:h-24' : 'w-20 h-32 md:w-24 md:h-36'
                } rounded-xl border ${
                  filled
                    ? 'border-amber-500/50 bg-amber-900/20 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                    : 'border-[rgba(160,122,60,0.4)] bg-[rgba(160,122,60,0.1)]'
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
                    <span className="text-[rgba(160,122,60,0.5)] text-xs font-medium tracking-widest">
                      {i + 1}
                    </span>
                    {posTitle && (
                      <span className="text-[rgba(160,122,60,0.4)] text-[9px] mt-1 px-1 truncate max-w-full">
                        {posTitle}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-[rgba(232,204,138,0.6)] text-xs md:text-sm tracking-widest font-light text-center">
          {isKo
            ? `${selectedIndices.length}/${MAX_SELECTED} · 마음이 이끄는 카드를 선택하세요`
            : `${selectedIndices.length}/${MAX_SELECTED} · Choose the cards your heart calls to`}
        </p>
      </div>

      {/* 카드 드래그 영역 — 드래그 안내 + 부채꼴 펼침. 안내문을 카드 바로
          위에 배치해 카드와 시각적으로 가깝게 묶는다. */}
      <div className="flex-1 w-full flex flex-col items-center mt-4 mb-24">
        <motion.p
          className="flex items-center gap-2 text-amber-200/60 text-sm md:text-base tracking-wide font-light mb-3 z-10 pointer-events-none"
          animate={{ opacity: [0.5, 0.95, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span aria-hidden>←</span>
          {isKo ? '좌우로 드래그하세요' : 'Drag left or right'}
          <span aria-hidden>→</span>
        </motion.p>

        <div
          ref={containerRef}
          onPointerDown={(e) => {
            // 빈 공간 어디든 pointerDown 으로 드래그 시작 — 데스크탑/모바일 공통.
            dragControls.start(e)
          }}
          className="flex-1 w-full relative flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'pan-y' }}
        >
          <motion.div
            drag="x"
            dragControls={dragControls}
            dragListener={false}
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
                  // 마운트 fan-out 만 spring — hover/drag 동안에는 빠른 tween 사용 (40장 spring physics 비용 회피)
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={
                    !isPicked && selectedIndices.length < MAX_SELECTED
                      ? {
                          y: sp.y - 40,
                          scale: 1.08,
                          rotate: 0,
                          zIndex: 100,
                          transition: { duration: 0.18, ease: 'easeOut' },
                        }
                      : undefined
                  }
                  onClick={() => onCardClick(index)}
                  onPointerDown={(e) => {
                    // 카드 위에서 마우스 다운 → dragControls 가 framer 의
                    // threshold 로 click vs drag 자동 판정. 짧은 클릭은
                    // onClick 으로, 일정 거리 이상 움직이면 부모 motion.div
                    // 가 함께 이동한다.
                    if (!isPicked) dragControls.start(e)
                  }}
                  className="absolute w-20 h-32 md:w-28 md:h-44 rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-amber-900/30 group"
                  style={{
                    zIndex: index,
                    pointerEvents: isPicked ? 'none' : 'auto',
                    background: selectedColor.gradient,
                    willChange: 'transform',
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
          className="flex items-center gap-2 px-5 py-2.5 bg-[rgba(160,122,60,0.15)] hover:bg-[#a07a3c]/50 disabled:opacity-30 disabled:cursor-not-allowed text-amber-100/80 rounded-lg text-sm transition-all duration-300 border border-[rgba(160,122,60,0.3)] hover:border-amber-700/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.1)]"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="tracking-wider">{isKo ? '다시 섞기' : 'Reshuffle'}</span>
        </button>
      </div>
    </div>
  )
}

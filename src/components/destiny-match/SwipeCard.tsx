'use client'

import * as React from 'react'
import Image from 'next/image'
import {
  motion,
  useMotionValue,
  useTransform,
  useAnimationControls,
  type PanInfo,
} from 'framer-motion'
import { MapPin, Briefcase, Sparkles, X, Star, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DiscoverCard, SwipeAction } from './types'
import type { DMCopy } from './destiny-match-i18n'

// 드래그 threshold — 절대 거리 100px 또는 velocity 500px/s 중 어느 한쪽.
// Tinder/Bumble 감각: 짧은 flick 도 결정.
const SWIPE_DISTANCE_THRESHOLD = 100
const SWIPE_VELOCITY_THRESHOLD = 500
// 스와이프 out animation 의 화면 밖 x 위치
const FLY_OUT_X = 600

export type DragDecision = Exclude<SwipeAction, 'super_like'>

// 부모가 버튼 클릭으로 카드를 날리고 싶을 때 imperative 호출. 드래그 종료는
// 카드 자체가 처리하니 외부에 노출 안 한다.
export interface SwipeCardHandle {
  // direction: 'right' = like, 'left' = pass, 'up' = super_like (특수: y 축).
  flyOut: (direction: 'left' | 'right' | 'up') => Promise<void>
}

interface SwipeCardProps {
  card: DiscoverCard
  copy: DMCopy
  // top card 만 interactive — under-card 는 drag/buttons 모두 disable.
  isTop: boolean
  // 드래그 threshold 초과 → 부모에게 결정 통지.
  onDecide: (action: DragDecision) => void
  // 시각적 stack depth — 0 = top, 1 = 아래, etc.
  depth: number
}

export const SwipeCard = React.forwardRef<SwipeCardHandle, SwipeCardProps>(function SwipeCard(
  { card, copy, isTop, onDecide, depth },
  ref
) {
  const controls = useAnimationControls()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  // 회전: x 드래그 거리에 비례, 최대 ±18deg
  const rotate = useTransform(x, [-220, 0, 220], [-18, 0, 18])
  const likeOpacity = useTransform(x, [40, 140], [0, 1])
  const nopeOpacity = useTransform(x, [-140, -40], [1, 0])

  React.useImperativeHandle(
    ref,
    () => ({
      flyOut: async (direction) => {
        if (direction === 'up') {
          await controls.start({
            y: -FLY_OUT_X,
            opacity: 0,
            transition: { duration: 0.32, ease: 'easeOut' },
          })
          return
        }
        const targetX = direction === 'right' ? FLY_OUT_X : -FLY_OUT_X
        const targetRotate = direction === 'right' ? 30 : -30
        await controls.start({
          x: targetX,
          opacity: 0,
          rotate: targetRotate,
          transition: { duration: 0.28, ease: 'easeOut' },
        })
      },
    }),
    [controls]
  )

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    if (!isTop) return
    const offsetX = info.offset.x
    const vx = info.velocity.x
    const decisive =
      Math.abs(offsetX) > SWIPE_DISTANCE_THRESHOLD || Math.abs(vx) > SWIPE_VELOCITY_THRESHOLD
    if (!decisive) {
      // snap back: framer-motion 의 dragSnapToOrigin 가 처리.
      return
    }
    const direction: 'left' | 'right' = offsetX > 0 ? 'right' : 'left'
    const action: DragDecision = direction === 'right' ? 'like' : 'pass'
    // 드래그-결정 시에도 imperative animation 으로 매끈하게 날린다.
    // animation 끝나면 부모에게 알린다 → 부모가 deck 에서 pop.
    // 실패해도 onDecide 는 호출 — 카드가 화면에 박혀버리는 사고 방지.
    void (async () => {
      try {
        const targetX = direction === 'right' ? FLY_OUT_X : -FLY_OUT_X
        const targetRotate = direction === 'right' ? 30 : -30
        await controls.start({
          x: targetX,
          opacity: 0,
          rotate: targetRotate,
          transition: { duration: 0.22, ease: 'easeOut' },
        })
      } catch {
        /* swallow — onDecide still fires */
      }
      onDecide(action)
    })()
  }

  const photo = card.photos?.[0]
  const stackOffsetY = depth * 8
  const stackScale = 1 - depth * 0.04

  return (
    <motion.div
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      dragSnapToOrigin
      onDragEnd={handleDragEnd}
      animate={controls}
      style={{
        x,
        y,
        rotate,
        zIndex: 100 - depth,
        scale: stackScale,
        translateY: stackOffsetY,
      }}
      className={cn(
        'absolute inset-0 mx-auto w-full max-w-[400px] select-none',
        'rounded-3xl overflow-hidden bg-slate-900 shadow-[0_24px_60px_rgba(0,0,0,0.35)]',
        'touch-pan-y',
        isTop ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
      )}
    >
      {/* Photo */}
      <div className="relative aspect-[3/4] w-full bg-gradient-to-br from-violet-700 via-fuchsia-700 to-amber-600">
        {photo ? (
          <Image
            src={photo}
            alt={card.displayName}
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className="object-cover"
            priority={depth === 0}
            // 사용자 업로드 사진의 host 가 next.config remotePatterns 에 다 등록
            // 안 됐을 수 있어 일단 unoptimized. 추후 image proxy 또는 host
            // allowlist 로 정리.
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-7xl font-bold text-white/85">
            {card.displayName.slice(0, 1).toUpperCase()}
          </div>
        )}

        {/* Compatibility badge */}
        <div className="absolute top-3 right-3 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
          <span className="mr-1">{card.compatibilityEmoji}</span>
          {card.compatibilityScore}
          <span className="opacity-70"> · {card.compatibilityGrade}</span>
        </div>

        {/* LIKE / NOPE drag-feedback badges */}
        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute top-6 left-6 rotate-[-12deg] rounded-md border-4 border-emerald-400 px-3 py-1 text-2xl font-extrabold tracking-wider text-emerald-400"
        >
          LIKE
        </motion.div>
        <motion.div
          style={{ opacity: nopeOpacity }}
          className="absolute top-6 right-6 rotate-[12deg] rounded-md border-4 border-rose-400 px-3 py-1 text-2xl font-extrabold tracking-wider text-rose-400"
        >
          NOPE
        </motion.div>

        {/* Bottom gradient + identity block */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5 text-white">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-2xl font-bold">
                {card.displayName}
                {card.age !== null && (
                  <span className="ml-2 text-xl font-medium opacity-85">{copy.age(card.age)}</span>
                )}
              </h2>
              {card.occupation && (
                <div className="mt-1 flex items-center gap-1.5 text-sm opacity-85">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span className="truncate">{card.occupation}</span>
                </div>
              )}
              {(card.city || card.distance !== null) && (
                <div className="mt-1 flex items-center gap-1.5 text-sm opacity-85">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">
                    {card.city}
                    {card.distance !== null && (
                      <span className="opacity-75"> · {copy.km(card.distance)}</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {(card.bio || card.synergy.saju || card.synergy.astro) && (
            <div className="mt-3 space-y-1.5 text-sm opacity-90">
              {card.bio && <p className="line-clamp-2">{card.bio}</p>}
              {(card.synergy.saju || card.synergy.astro) && (
                <div className="flex flex-wrap gap-1.5">
                  {card.synergy.saju && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs">
                      <Sparkles className="h-3 w-3" />
                      {card.synergy.saju.label}
                      {card.synergy.saju.result && (
                        <span className="opacity-75"> · {card.synergy.saju.result}</span>
                      )}
                    </span>
                  )}
                  {card.synergy.astro && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs">
                      <Sparkles className="h-3 w-3" />
                      {card.synergy.astro.label}
                      <span className="opacity-75"> · {card.synergy.astro.harmony}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
})

// Action buttons — Tinder/Bumble 식 원형 아이콘 row.
export function CardActionButtons(props: {
  copy: DMCopy
  disabled: boolean
  onPass: () => void
  onSuperLike: () => void
  onLike: () => void
}) {
  const { copy, disabled, onPass, onSuperLike, onLike } = props
  return (
    <div className="flex items-center justify-center gap-5 pt-5 pb-2">
      <button
        type="button"
        aria-label={copy.pass}
        disabled={disabled}
        onClick={onPass}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-rose-500 shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition active:scale-95 disabled:opacity-50"
      >
        <X className="h-7 w-7" strokeWidth={2.5} />
      </button>
      <button
        type="button"
        aria-label={copy.superLike}
        disabled={disabled}
        onClick={onSuperLike}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sky-500 shadow-[0_6px_18px_rgba(0,0,0,0.15)] transition active:scale-95 disabled:opacity-50"
      >
        <Star className="h-6 w-6" strokeWidth={2.5} />
      </button>
      <button
        type="button"
        aria-label={copy.like}
        disabled={disabled}
        onClick={onLike}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-emerald-500 shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition active:scale-95 disabled:opacity-50"
      >
        <Heart className="h-7 w-7" strokeWidth={2.5} fill="currentColor" />
      </button>
    </div>
  )
}

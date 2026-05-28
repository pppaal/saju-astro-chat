'use client'

/**
 * Smooth number count-up — score 등 큰 숫자를 0 → target 으로 ease-out 애니메이션.
 * framer-motion 의 animate + useMotionValue 활용. target 바뀌면 새로 카운트.
 *
 *   const animated = useCountUp(78)
 *   <span>{animated}</span>
 *
 * accessibility: prefers-reduced-motion 켜져 있으면 즉시 target 반환.
 */

import { useEffect, useState } from 'react'
import { animate, useMotionValue, useReducedMotion } from 'framer-motion'

export function useCountUp(target: number, duration = 0.5): number {
  const reduce = useReducedMotion()
  const mv = useMotionValue(0)
  const [display, setDisplay] = useState(reduce ? target : 0)

  useEffect(() => {
    if (reduce) {
      setDisplay(target)
      return
    }
    const controls = animate(mv, target, {
      duration,
      ease: [0.2, 0.7, 0.2, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [target, duration, reduce, mv])

  return display
}

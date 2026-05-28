/**
 * 공용 framer-motion variants — 캘린더 카드 스태거 진입 + tab 전환 cinematic.
 *
 * 사용:
 *   <motion.div variants={cardStack} initial="hidden" animate="show">
 *     <motion.div variants={cardItem}>...</motion.div>
 *     <motion.div variants={cardItem}>...</motion.div>
 *   </motion.div>
 */

import type { Variants, Transition } from 'framer-motion'

/** Stack 컨테이너 — 자식들 40ms 간격 stagger (스냅) */
export const cardStack: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
}

/** 카드 한 장 — y6 → 0 fade-up (300ms) */
export const cardItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.2, 0.7, 0.2, 1] },
  },
}

/** Bar fill — width 0 → target. 600ms (이전 900ms 에서 단축) */
export const barFill: Variants = {
  hidden: { width: 0 },
  show: (pct: number) => ({
    width: `${pct}%`,
    transition: { duration: 0.6, ease: [0.2, 0.7, 0.2, 1] },
  }),
}

/** "왜 오늘은" 리스트 항목 — 30ms 짧은 stagger */
export const listStack: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
}

export const listItem: Variants = {
  hidden: { opacity: 0, x: -3 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.22, ease: 'easeOut' },
  },
}

/** 탭 전환 — direction: 'in' (drill down, 년→달→일) / 'out' (반대) */
const SPRING: Transition = { type: 'spring', stiffness: 320, damping: 32, mass: 0.8 }

export function tabVariants(direction: 'in' | 'out'): Variants {
  const inward = direction === 'in'
  return {
    initial: { opacity: 0, scale: inward ? 1.06 : 0.94 },
    animate: { opacity: 1, scale: 1, transition: SPRING },
    exit: { opacity: 0, scale: inward ? 0.94 : 1.06, transition: { duration: 0.18 } },
  }
}

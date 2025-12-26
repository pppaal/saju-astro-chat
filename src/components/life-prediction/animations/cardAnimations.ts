/**
 * Framer Motion 애니메이션 variants
 * Life Prediction 결과 카드용
 */

import { Variants, Transition } from 'framer-motion';

// ===== 공통 Spring 설정 =====
const SPRING = {
  default: { type: 'spring', stiffness: 260, damping: 20 } as Transition,
  snappy: { type: 'spring', stiffness: 400, damping: 25 } as Transition,
  bouncy: { type: 'spring', stiffness: 500, damping: 25 } as Transition,
  gentle: { type: 'spring', stiffness: 100, damping: 15 } as Transition,
  smooth: { type: 'spring', stiffness: 300, damping: 25 } as Transition,
} as const;

// ===== 공통 타이밍 =====
const TIMING = {
  staggerFast: 0.02,
  staggerNormal: 0.05,
  staggerSlow: 0.15,
  delayShort: 0.1,
  delayMedium: 0.2,
  delayLong: 0.3,
  durationShort: 0.2,
  durationMedium: 0.3,
  durationNormal: 0.4,
} as const;

// 카드 컨테이너 애니메이션 (stagger 효과)
export const cardContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: TIMING.staggerSlow,
      delayChildren: TIMING.delayShort,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: TIMING.staggerNormal,
      staggerDirection: -1,
    },
  },
};

// 개별 카드 애니메이션
export const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 60,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: SPRING.default,
  },
  exit: {
    opacity: 0,
    y: -30,
    scale: 0.95,
    transition: { duration: TIMING.durationShort },
  },
  hover: {
    scale: 1.02,
    y: -5,
    transition: SPRING.snappy,
  },
};

// 등급 배지 애니메이션
export const badgeVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0,
    rotate: -180,
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      ...SPRING.bouncy,
      delay: TIMING.delayMedium,
    },
  },
};

// 점수 바 애니메이션
export const scoreBarVariants: Variants = {
  hidden: { scaleX: 0, originX: 0 },
  visible: (score: number) => ({
    scaleX: score / 100,
    transition: {
      ...SPRING.gentle,
      delay: TIMING.delayLong,
    },
  }),
};

// 이유 리스트 아이템 애니메이션
export const reasonVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: SPRING.smooth,
  },
};

// 분석 로더 애니메이션
export const loaderVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: TIMING.durationNormal,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    scale: 1.1,
    transition: { duration: TIMING.durationMedium },
  },
};

// 로더 도트 애니메이션
export const loaderDotVariants: Variants = {
  animate: {
    y: [0, -15, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// 캘린더 날짜 셀 애니메이션
export const calendarCellVariants: Variants = {
  hidden: { opacity: 0, scale: 0 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: SPRING.snappy,
  },
  tap: { scale: 0.95 },
};

// 페이지 전환 애니메이션
export const pageTransitionVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: TIMING.durationNormal,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: TIMING.durationMedium },
  },
};

// 검색창 이동 애니메이션 (별도 spring 설정 - 200 stiffness)
const SPRING_SEARCH = { type: 'spring', stiffness: 200, damping: 25 } as Transition;

export const searchBoxTransitionVariants: Variants = {
  center: {
    y: 0,
    scale: 1,
    transition: SPRING_SEARCH,
  },
  top: {
    y: -100,
    scale: 0.9,
    transition: SPRING_SEARCH,
  },
};

// 펄스 효과 색상
const PULSE_COLOR = 'rgba(139, 92, 246, 0.4)';
const PULSE_COLOR_TRANSPARENT = 'rgba(139, 92, 246, 0)';

// 펄스 효과 (최상위 결과 강조)
export const pulseVariants: Variants = {
  animate: {
    boxShadow: [
      `0 0 0 0 ${PULSE_COLOR}`,
      `0 0 0 10px ${PULSE_COLOR_TRANSPARENT}`,
      `0 0 0 0 ${PULSE_COLOR_TRANSPARENT}`,
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

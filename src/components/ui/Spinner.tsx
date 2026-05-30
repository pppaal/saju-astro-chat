import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * 공통 로딩 스피너. 6 군데에서 hand-rolled 되던 spinner CSS / SVG 를 단일
 * 컴포넌트로 통합. design tokens 골드 stroke 기준.
 *
 * size:
 *   - sm: 12px (h-3 w-3) — 인라인 / 작은 버튼
 *   - md: 16px (h-4 w-4) — 기본
 *   - lg: 24px (h-6 w-6) — 카드 로딩
 *   - xl: 48px (h-12 w-12) — 풀 페이지 로딩
 *
 * tone:
 *   - gold (기본) — 다크/라이트 surface 모두 자연스러움
 *   - neutral — 회색 (저강조)
 *   - current — currentColor 사용 (버튼 안 등 텍스트 색에 맞춤)
 */
export interface SpinnerProps extends React.SVGProps<SVGSVGElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  tone?: 'gold' | 'neutral' | 'current'
  /** 보조 접근성 label. 없으면 aria-hidden. */
  label?: string
}

const SIZE_CLASS: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-6 w-6',
  xl: 'h-12 w-12',
}

const TONE_CLASS: Record<NonNullable<SpinnerProps['tone']>, string> = {
  gold: 'text-[#d4b572]',
  neutral: 'text-stone-400',
  current: 'text-current',
}

export function Spinner({
  size = 'md',
  tone = 'gold',
  label,
  className,
  ...rest
}: SpinnerProps) {
  return (
    <svg
      className={cn('animate-spin', SIZE_CLASS[size], TONE_CLASS[tone], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...rest}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

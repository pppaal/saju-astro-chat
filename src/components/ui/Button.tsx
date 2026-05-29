import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * 공통 버튼 컴포넌트. 현 design tokens (gold + ink + neutral) 기준으로 작성.
 * 옛 blue/violet primary 변형은 폐기 — globals.css 주석 "보라/네온 톤 사용 안 한다".
 *
 * 변형:
 *  - default: 골드 솔리드 (가장 기본 CTA, 라이트/다크 어디서나)
 *  - primary: 골드 그라데이션 (마케팅/CTA 강조 — about, blog post CTA 와 같은 톤)
 *  - destructive: 붉은색 (삭제 등 destructive 액션)
 *  - outline: 투명 + 보더 (다크 surface 보조 액션)
 *  - secondary: 잉크 (라이트 surface primary — compat/profile 와 같은 톤)
 *  - ghost: 호버 시만 bg (메뉴/인라인)
 *  - link: 골드 텍스트 + underline (인라인 링크)
 *  - premium: 골드 그라데이션 (마케팅 강조 — `primary` 와 같지만 별칭 보존)
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a07a3c] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:saturate-0 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#d4b572] text-[#1c1917] shadow-sm hover:bg-[#e8cc8a]",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-500 focus-visible:ring-red-500",
        outline:
          "border border-white/14 bg-transparent text-white/90 shadow-sm hover:bg-white/[0.06] hover:border-[rgba(212,181,114,0.4)]",
        secondary:
          "bg-[#1c1917] text-white shadow-sm hover:bg-[#3a3530]",
        ghost:
          "text-stone-700 hover:bg-stone-100 hover:text-stone-900",
        link:
          "text-[#d4b572] underline-offset-4 hover:underline hover:text-[#e8cc8a]",
        primary:
          "bg-gradient-to-r from-[#c19b56] to-[#a07a3c] text-white shadow-lg hover:from-[#d4b572] hover:to-[#c19b56]",
        premium:
          "bg-gradient-to-r from-[#c19b56] to-[#a07a3c] text-white font-medium shadow-lg hover:from-[#d4b572] hover:to-[#c19b56]",
      },
      size: {
        default: "h-12 px-4 py-2",
        sm: "h-10 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading, loadingText = "Loading...", children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-live={isLoading ? "polite" : undefined}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
            <span>{loadingText}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

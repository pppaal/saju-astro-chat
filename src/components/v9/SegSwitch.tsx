/**
 * 갈래 스위치(.seg) — 캘린더 Monthly / Daily 같은 2~3 갈래 보기 전환. 버튼 aria-pressed.
 * onChange 는 함수라 클라이언트 트리 안에서만 쓴다(훅은 없다 — 상태는 호출자가 갖는다).
 */

import s from './SegSwitch.module.css'

interface SegOption<V extends string> {
  value: V
  label: string
}

interface SegSwitchProps<V extends string> {
  options: ReadonlyArray<SegOption<V>>
  value: V
  onChange: (value: V) => void
  /** 묶음의 스크린 리더 이름. */
  ariaLabel: string
  className?: string
}

export default function SegSwitch<V extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegSwitchProps<V>) {
  return (
    <div
      className={[s.seg, className].filter(Boolean).join(' ')}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            className={[s.opt, on ? s.on : ''].filter(Boolean).join(' ')}
            aria-pressed={on}
            onClick={() => {
              if (!on) onChange(o.value)
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

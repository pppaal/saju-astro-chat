/**
 * 까치(Kkachi) 마크 — 먹 단색 한 실루엣, 배·어깨깃만 밝은 색. v9 워드마크(20px)·까치 한 줄
 * (24px)·카드 머리말이 쓴다. 디자인 원본 gen8.py bird() · life9.tpl.html:74 를 그대로 옮겼다.
 *
 * 색은 currentColor(먹)와 --surface(밝은 깃)를 쓴다 — 어두운 띠에서는 color 를
 * var(--on-dark), light 를 var(--ink) 로 넘긴다. 서버·클라이언트 공용(훅 없음).
 */

interface KkachiMarkProps {
  /** 픽셀 크기(정사각). 기본 20. */
  size?: number
  /** 밝은 깃(배·어깨·눈) 색. 기본 var(--surface). */
  light?: string
  /** 장식이면 true(기본) — 옆에 글자가 있을 때. false 면 role=img + 이름. */
  decorative?: boolean
  /** decorative=false 일 때 스크린 리더 이름. */
  label?: string
  className?: string
}

export default function KkachiMark({
  size = 20,
  light = 'var(--surface)',
  decorative = true,
  label = 'Kkachi',
  className,
}: KkachiMarkProps) {
  const a11y = decorative
    ? ({ 'aria-hidden': true } as const)
    : ({ role: 'img', 'aria-label': label } as const)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      focusable="false"
      data-kkachi=""
      {...a11y}
    >
      <path d="M44.2 64.9 L7 109.5 Q6.8 120.6 17.4 117.3 L49.8 69.1 Z" fill="currentColor" />
      <circle cx="82" cy="34" r="13" fill="currentColor" />
      <path d="M91 28.5 Q100 31 107 35.5 Q99 38.5 91 40.5 Z" fill="currentColor" />
      <path
        d="M71.35 26.54 C64.5 36.4 50 46 42 63 L35 73 L47 68.5 L51 71 C62 82 80 79 88 63 C92 53 92 43 88 37 Z"
        fill="currentColor"
      />
      <path
        d="M57 72 C65 77.5 78 75 84 62.5 C78 65 68 65.5 62 67.5 C59 68.6 57.5 70 57 72 Z"
        style={{ fill: light }}
      />
      <path d="M76 41 C72 49 64 57 51 65 C64 62.5 74 54 76 41 Z" style={{ fill: light }} />
      <circle cx="86" cy="31" r="1.9" style={{ fill: light }} />
    </svg>
  )
}

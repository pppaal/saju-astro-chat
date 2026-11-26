/**
 * 오행 타일 — 천간·지지 한자를 그 오행 색(--wood/--fire/--earth/--metal/--water) 위에 쓴다.
 * 사주 카드 기둥, 일간, 강점 표가 같은 타일을 쓴다. hidden 이면 같은 크기의 점선 빈 칸
 * (시간 미상·숨긴 시주). 서버·클라이언트 공용.
 */

import type { ElementKey } from './v9Copy'
import s from './ElementTile.module.css'

export type TileSize = 'xs' | 'sm' | 'md' | 'card' | 'lg'

interface ElementTileProps {
  /** 한자 한 글자(壬 · 戌 …). hidden 이면 무시. */
  char?: string
  element?: ElementKey
  size?: TileSize
  /** 먹 바탕 위 水 타일의 안쪽 테. */
  keyRing?: boolean
  /** 점선 빈 칸(숨긴 시주). */
  hidden?: boolean
  className?: string
}

export default function ElementTile({
  char,
  element = 'water',
  size = 'sm',
  keyRing = false,
  hidden = false,
  className,
}: ElementTileProps) {
  const sizeClass = size === 'sm' ? '' : s[size]
  if (hidden) {
    return (
      <span
        className={[s.tile, s.hidden, sizeClass, className].filter(Boolean).join(' ')}
        data-tile="hidden"
        aria-hidden="true"
      />
    )
  }
  return (
    <span
      className={[s.tile, s[element], sizeClass, keyRing ? s.keyRing : '', className]
        .filter(Boolean)
        .join(' ')}
      data-tile={element}
    >
      {char}
    </span>
  )
}

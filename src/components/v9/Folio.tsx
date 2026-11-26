/**
 * 폴리오 — 'COMPUTED · 1997.3.21 14:30 · Seoul' 한 줄. 화면당 두 번(상단 바 아래 position
 * 'top', 푸터 위 'end'). stamp 는 lib/birth/format 의 formatBirthStamp 결과를 넘긴다.
 * 서버·클라이언트 공용.
 */

import type { ReactNode } from 'react'
import { PROVENANCE, pick, type Lang } from './v9Copy'
import s from './Folio.module.css'

interface FolioProps {
  /** 출생 스탬프(formatBirthStamp). 비면 'COMPUTED' 만. */
  stamp?: string
  /** 오른쪽 칸 — 'Sample' · 'destinypal.com' 등. */
  right?: ReactNode
  position?: 'top' | 'end'
  theme?: 'light' | 'dark'
  locale: Lang
  className?: string
}

export default function Folio({
  stamp,
  right,
  position = 'top',
  theme = 'light',
  locale,
  className,
}: FolioProps) {
  const cls = [
    s.folio,
    position === 'end' ? s.end : '',
    theme === 'dark' ? s.dark : '',
    locale === 'ko' ? s.ko : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls} data-folio={position}>
      <span className={s.left}>
        {pick(PROVENANCE.computed, locale)}
        {stamp ? (
          <>
            {' · '}
            <b>{stamp}</b>
          </>
        ) : null}
      </span>
      {right != null && right !== '' ? <span className={s.right}>{right}</span> : null}
    </div>
  )
}

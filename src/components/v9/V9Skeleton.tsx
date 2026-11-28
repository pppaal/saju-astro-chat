/**
 * v9 paper 뼈대 — loading.tsx 용. 홈('home')은 카드 자리까지, 안쪽 화면('page')은 제목과
 * 블록 몇 개. 토큰(var(--paper) 등)을 쓰므로 V9Root 안에서 렌더한다. 서버 컴포넌트 가능.
 */

import { CHROME, pick, type Lang } from './v9Copy'
import s from './V9Skeleton.module.css'

export default function V9Skeleton({
  variant = 'home',
  locale = 'en',
}: {
  variant?: 'home' | 'page'
  locale?: Lang
}) {
  return (
    <div className={s.sk} aria-busy="true" role="status" data-v9-skeleton={variant}>
      <span className={s.sr}>{pick(CHROME.loading, locale)}</span>
      <div className={s.bar} aria-hidden="true">
        <span className={`${s.block} ${s.mark}`} />
        <span className={`${s.block} ${s.pill}`} />
      </div>
      <div className={s.folio} aria-hidden="true" />
      <div aria-hidden="true">
        <span className={`${s.block} ${s.h1}`} />
        <span className={`${s.block} ${s.h1b}`} />
        <span className={`${s.block} ${s.lede}`} />
        {variant === 'home' ? (
          <>
            <span className={`${s.block} ${s.btn}`} />
            <span className={`${s.block} ${s.card}`} />
          </>
        ) : (
          <span className={`${s.block} ${s.panel}`} />
        )}
      </div>
    </div>
  )
}

/**
 * 홈 둘러보기 — 'Three ways to read you. One card.' + 제품 다섯 행, 그리고 '카드를 받은 다음'
 * 의 상담사 한 행. 행은 늘 펼쳐져 있고 이모지·아이콘·색이 없다. 가격은 exploreRows 가
 * SSOT(CREDIT_COSTS · creditsFromLabel)에서 만든 라벨 그대로.
 */

import Link from 'next/link'
import { creditsFromLabel } from '@/lib/config/pricing'
import { PRICE, fill } from '@/components/v9/v9Copy'
import { pick, type Lang } from '@/lib/i18n/bi'
import type { StoredBirthInfo } from '@/lib/birth/storage'
import { HOME_COPY } from './homeCopy'
import {
  exploreHref,
  explorePriceLabel,
  exploreRowsIn,
  type ExploreRow as ExploreRowData,
} from './exploreRows'
import s from './home-v9.module.css'

interface HomeExploreProps {
  locale: Lang
  birthInfo: StoredBirthInfo | null
  /** 행을 눌렀을 때(퍼널 home.explore.*). */
  onRowClick: (row: ExploreRowData) => void
}

function Row({ row, locale, birthInfo, onRowClick }: { row: ExploreRowData } & HomeExploreProps) {
  const price = explorePriceLabel(row.price, locale)
  const paid = 'from' in price
  return (
    <li>
      <Link
        href={exploreHref(row, birthInfo, locale)}
        className={[s.row, paid ? s.paid : ''].filter(Boolean).join(' ')}
        prefetch={false}
        onClick={() => onRowClick(row)}
        data-explore={row.id}
      >
        <span className={s.q}>{pick(row.title, locale)}</span>
        {paid ? (
          <span className={s.p}>
            {price.from}
            <span className={s.pr}>{price.packs}</span>
          </span>
        ) : (
          <span className={`${s.p} ${s.pFree}`}>{price.free}</span>
        )}
        <span className={s.d}>{pick(row.desc, locale)}</span>
      </Link>
    </li>
  )
}

export default function HomeExplore(props: HomeExploreProps) {
  const { locale } = props
  const t = (k: keyof typeof HOME_COPY) => pick(HOME_COPY[k], locale)
  const packs = fill(pick(PRICE.creditsFrom, locale), { price: creditsFromLabel(locale) })
  return (
    <section className={s.sec} aria-labelledby="home-explore">
      <div className={s.secHead}>
        <span className={s.eyebrow}>{t('exploreEyebrow')}</span>
        <h2 id="home-explore" className={s.h2}>
          <span>{t('exploreH2a')}</span>
          <span>{t('exploreH2b')}</span>
        </h2>
        <p className={s.sub}>
          <b>{t('exploreSubLead')}</b> {t('exploreSub')} <span className={s.nw}>{packs}.</span>{' '}
          <Link href="/pricing" className={s.ul}>
            {pick(PRICE.seePricing, locale)}
          </Link>
        </p>
      </div>
      <div className={s.secBody}>
        <ul className={s.list} aria-label={t('exploreAria')}>
          {exploreRowsIn('main').map((row) => (
            <Row key={row.id} row={row} {...props} />
          ))}
        </ul>
        <div className={s.later}>
          <span className={s.eyebrow}>{t('afterCard')}</span>
          <ul className={s.list}>
            {exploreRowsIn('after').map((row) => (
              <Row key={row.id} row={row} {...props} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

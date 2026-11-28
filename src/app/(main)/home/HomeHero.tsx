/**
 * 홈 히어로 — 눈썹 · H1(#home-headline) · 리드 · CTA · COST/ACCOUNT/TIME 판독 띠.
 *
 * CTA: 손님은 출생 모달을 여는 <button>('Get my free Saju Card'). 저장된 출생 정보가 있으면
 * 그 사람 리포트로 가는 링크('Open my full card' → /integrated-report?{출생 쿼리})와
 * 스탬프 + 'Edit birth info' 글자 버튼. 상태·핸들러는 부모(MainPageClient)가 갖는다.
 */

import Link from 'next/link'
import ReadoutStrip from '@/components/v9/ReadoutStrip'
import { pick, type Lang } from '@/lib/i18n/bi'
import { HOME_COPY } from './homeCopy'
import s from './home-v9.module.css'

function Arrow() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

interface HomeHeroProps {
  locale: Lang
  /** 저장된 출생 정보 — 있으면 리포트 링크 + 스탬프 + 수정 버튼. */
  saved: { stamp: string; reportHref: string } | null
  /** 손님 CTA — 출생 모달 열기. */
  onCta: () => void
  /** 저장된 링크를 눌렀을 때(퍼널). */
  onOpenReport: () => void
  onEditBirth: () => void
}

export default function HomeHero({
  locale,
  saved,
  onCta,
  onOpenReport,
  onEditBirth,
}: HomeHeroProps) {
  const t = (k: keyof typeof HOME_COPY) => pick(HOME_COPY[k], locale)
  return (
    <section className={s.hero} aria-labelledby="home-headline">
      <span className={s.eyebrow}>{t('eyebrow')}</span>
      <h1 id="home-headline" className={s.h1}>
        {t('h1Before')}
        <span className={s.em}>{t('h1Em')}</span>
        {t('h1After')}
      </h1>
      <p className={s.lede}>{t('lede')}</p>

      {saved ? (
        <>
          <Link
            href={saved.reportHref}
            className={`${s.btn} ${s.dark}`}
            onClick={onOpenReport}
            prefetch={false}
            data-home-cta="open"
          >
            {t('ctaOpen')}
            <Arrow />
          </Link>
          <p className={s.saved} data-home-saved="">
            <span className={s.savedL}>{t('savedBirth')}</span>
            <span className={s.savedV}>{saved.stamp}</span>
            <button
              type="button"
              className={s.edit}
              onClick={onEditBirth}
              aria-label={t('editBirth')}
            >
              {t('editBirth')}
            </button>
          </p>
        </>
      ) : (
        <button
          type="button"
          className={`${s.btn} ${s.dark}`}
          onClick={onCta}
          data-home-cta="guest"
        >
          {t('cta')}
          <Arrow />
        </button>
      )}

      <ReadoutStrip
        className={s.ros}
        ariaLabel={t('roAria')}
        cells={[
          { label: t('roCost'), value: t('roCostValue') },
          { label: t('roAccount'), value: t('roAccountValue') },
          { label: t('roTime'), value: t('roTimeValue'), unit: t('roTimeUnit') },
        ]}
      />
    </section>
  )
}

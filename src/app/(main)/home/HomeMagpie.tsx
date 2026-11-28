/**
 * '왜 까치일까요?' — 24px 먹 마크와 세리프 이탤릭 한 줄. 귀여움은 여기까지(디자인 규칙 8).
 * 영어 눈썹은 'Kkachi' 만(영어 화면에 한글을 넣지 않는다), 한국어는 '까치'.
 */

import KkachiMark from '@/components/branding/KkachiMark'
import { pick, type Lang } from '@/lib/i18n/bi'
import { HOME_COPY } from './homeCopy'
import s from './home-v9.module.css'

export default function HomeMagpie({ locale }: { locale: Lang }) {
  const t = (k: keyof typeof HOME_COPY) => pick(HOME_COPY[k], locale)
  return (
    <section className={s.mag} aria-labelledby="home-magpie">
      <span className={s.eyebrow}>{t('magpieEyebrow')}</span>
      <h2 id="home-magpie" className={s.h3}>
        {t('magpieH3')}
      </h2>
      <p className={s.sub}>
        <span className={s.br}>{t('magpieSub1')}</span>
        <span className={s.br}>{t('magpieSub2')}</span>
      </p>
      <div className={s.kk}>
        <span className={s.av}>
          <KkachiMark size={24} />
        </span>
        <p className={s.voice}>
          <span className={s.br}>{t('magpieVoice1')}</span>
          <span className={s.br}>{t('magpieVoice2')}</span>
        </p>
      </div>
    </section>
  )
}

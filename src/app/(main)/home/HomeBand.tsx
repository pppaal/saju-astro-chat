/**
 * '리딩은 이렇게 만들어져요' 먹 띠 — 세 단계, 3단계는 교차 행이 주인공, 그 아래 60갑자
 * 다이얼(작고 차분하게)과 출처 줄('Math: our engine · Words in the counselor: AI').
 *
 * 3단계 행: 샘플의 이 10년 겹침(타이밍 행)이 있으면 그것을 ▲/▼ 마크와 함께, 없으면(지금의
 * 샘플 — E12 정직성 게이트 뒤 빈 목록) 축 행 둘(정체성 · 기질)을 마크 없이 판정 라벨로
 * 그린다. 합의나 방향을 지어내지 않는다. ▲/▼ 범례는 타이밍 행이 있을 때만 블록 맨 아래 한 번 —
 * 축 행엔 마크가 없으므로 범례도 없다(parts9 축 목록 규칙 'No ▲/▼ here').
 *
 * 다이얼 모델은 서버(page.tsx → homeDial)가 보는 사람의 날짜로 만든다 — 여기서는 그리기만.
 */

import CrossCheckRow, { CrossCheckList } from '@/components/v9/CrossCheckRow'
import XLegend from '@/components/v9/XLegend'
import SixtyDial from '@/components/v9/SixtyDial'
import type { PlanetGlyph } from '@/components/v9/Glyph'
import { PROVENANCE, SYSTEMS, VERDICT, fill } from '@/components/v9/v9Copy'
import { SIBSIN_HANJA } from '@/lib/saju/sibsinLabels'
import { pick, type Lang } from '@/lib/i18n/bi'
import type { DialModel } from '@/lib/v9/sixtyDial'
import type { CardTraitRow } from '@/lib/card/types'
import type { DestinyDecadeCross } from '@/types/calendar'
import { HOME_COPY } from './homeCopy'
import s from './home-v9.module.css'

const PLANET_GLYPHS: readonly PlanetGlyph[] = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
]

function planetGlyphOf(astroEn: string): PlanetGlyph | undefined {
  const key = astroEn.trim().toLowerCase() as PlanetGlyph
  return PLANET_GLYPHS.includes(key) ? key : undefined
}

interface HomeBandProps {
  locale: Lang
  dial: DialModel
  /** 이 10년의 겹침(타이밍) — 비면 traits 로 대신한다. */
  timing: readonly DestinyDecadeCross[]
  /** 대체 축 행(보는 언어의 문구). */
  traits: readonly CardTraitRow[]
}

function StepRows({ locale, timing, traits }: Omit<HomeBandProps, 'dial'>) {
  if (timing.length > 0) {
    return (
      <CrossCheckList theme="dark" className={s.rows}>
        {timing.map((row, i) => (
          <CrossCheckRow
            key={`${row.saju}-${row.astro}-${i}`}
            kind="timing"
            theme="dark"
            first={i === 0}
            locale={locale}
            saju={{
              hanja: SIBSIN_HANJA[row.saju],
              text: locale === 'ko' ? row.saju : row.sajuEn,
            }}
            stars={{
              glyph: planetGlyphOf(row.astroEn),
              text: locale === 'ko' ? row.astro : row.astroEn,
            }}
            mark={row.polarity > 0 ? 'up' : row.polarity < 0 ? 'down' : undefined}
            note={locale === 'ko' ? row.meaning : row.meaningEn}
          />
        ))}
      </CrossCheckList>
    )
  }
  return (
    <CrossCheckList theme="dark" className={s.rows}>
      {traits.map((row, i) => (
        <CrossCheckRow
          key={row.key}
          kind="trait"
          theme="dark"
          first={i === 0}
          locale={locale}
          axis={row.axis}
          verdict={row.verdict}
          saju={row.saju ? { text: row.saju.text, w: row.saju.w } : undefined}
          stars={row.stars ? { text: row.stars.text, w: row.stars.w } : undefined}
        />
      ))}
    </CrossCheckList>
  )
}

export default function HomeBand({ locale, dial, timing, traits }: HomeBandProps) {
  const t = (k: keyof typeof HOME_COPY) => pick(HOME_COPY[k], locale)
  const verdicts = (['same', 'supportive', 'twoPulls', 'unrelated'] as const)
    .map((v) => pick(VERDICT[v].short, locale).toLowerCase())
    .join(' · ')
  const steps = [
    { n: '01', title: t('step1Title'), text: t('step1Text') },
    { n: '02', title: t('step2Title'), text: t('step2Text') },
  ]
  return (
    <section
      className={timing.length > 0 ? s.band : `${s.band} ${s.bandNoLegend}`}
      aria-labelledby="home-band"
    >
      <div className={s.bandHead}>
        <span className={s.eyebrow}>{t('bandEyebrow')}</span>
        <h2 id="home-band" className={s.h2}>
          <span>{t('bandH2a')}</span>
          <span className={s.lt}>{t('bandH2b')}</span>
        </h2>
      </div>
      <ol className={s.steps}>
        {steps.map((st) => (
          <li key={st.n} className={s.step}>
            <span className={s.n}>{st.n}</span>
            <div>
              <h3 className={s.t}>{st.title}</h3>
              <p className={s.sd}>{st.text}</p>
            </div>
          </li>
        ))}
        <li className={s.step} data-step="03">
          <span className={s.n}>03</span>
          <div>
            <h3 className={s.t}>{t('step3Title')}</h3>
            <p className={s.sd}>{fill(t('step3Text'), { verdicts })}</p>
          </div>
          <div className={s.span}>
            <div className={s.lr}>
              <span>{pick(SYSTEMS.pair, locale)}</span>
              <span>{timing.length > 0 ? t('step3Timing') : t('step3Traits')}</span>
            </div>
            <StepRows locale={locale} timing={timing} traits={traits} />
            {timing.length > 0 ? <XLegend theme="dark" locale={locale} /> : null}
          </div>
        </li>
      </ol>
      <div className={s.bandAside}>
        <div className={s.lr}>
          <span>
            {t('dialCorner')} ·{' '}
            <span className={s.hj} lang="ko">
              六十甲子
            </span>
          </span>
          <span>{t('dialUnit')}</span>
        </div>
        <div className={s.dialWrap}>
          <SixtyDial model={dial} theme="dark" />
        </div>
      </div>
      <p className={s.by}>
        <span className={s.seal} role="img" aria-label={pick(PROVENANCE.seal, locale)}>
          算
        </span>
        <span>
          {pick(PROVENANCE.mathLabel, locale)}: <b>{pick(PROVENANCE.mathValue, locale)}</b>
        </span>
        <span className={s.bySep} aria-hidden="true">
          ·
        </span>
        <span>
          {pick(PROVENANCE.wordsLabel, locale)}: <b>{pick(PROVENANCE.wordsValue, locale)}</b>
        </span>
      </p>
    </section>
  )
}

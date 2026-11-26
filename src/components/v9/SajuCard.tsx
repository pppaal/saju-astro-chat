/**
 * 사주 카드 — v9 의 유일한 채도 높은 물건(포일 포토카드). 홈 샘플 카드, 인생 흐름 공유 블록
 * (mini), 공유 PNG(export) 가 같은 컴포넌트를 쓴다.
 *
 * variant
 * - 'full'  : 띠 5개 — 머리말 · 기둥(+ 캡션) · 일간 + 빅 쓰리 · 사주 타입 이름(+ 인생 모양) ·
 *             정체성 + 합의 줄. backYear 를 주면 뒷면(60갑자 고리 + '丙午 · 2026')이 비친다.
 * - 'mini'  : 머리말 · 기둥 · 타입 띠 하나(정체성 띠 없음, 일간·빅 쓰리 없음).
 * - 'export': 공유 PNG — 기둥·ASC·연도 없이 머리말 + 타입 띠만(오너 결정: 공유 개인정보).
 *
 * 데이터는 엔진 출력에서 만든다(A2 buildSajuCard) — 이 컴포넌트는 아무것도 계산하지 않는다.
 * 문구: 타입 라벨은 SAJU_TYPE_LABEL(결정 2 — 타입은 사주만으로 계산되므로 '사주 타입'),
 * 정체성 판정은 TONE_LABEL, 머리말 도메인은 lib/share/site. 서버·클라이언트 공용.
 */

import KkachiMark from '@/components/branding/KkachiMark'
import { SAJU_TYPE_LABEL } from '@/lib/report/viralArchetype'
import { cardBackRing, yearRingIndex } from '@/lib/v9/ring'
import { shareDomain } from '@/lib/share/site'
import ElementTile from './ElementTile'
import { Glyph } from './Glyph'
import { AgreeLine } from './Tally'
import {
  CARD,
  ELEMENT,
  PROVENANCE,
  SYSTEMS,
  TONE_TO_VERDICT,
  VERDICT,
  pick,
  type Lang,
} from './v9Copy'
import type { CardPillar, SajuCardData } from '@/lib/card/types'
import s from './SajuCard.module.css'

// 데이터 모양은 lib/card/types(엔진 빌더 buildSajuCardData 와 공용) — 여기서 다시 내보낸다.
export type { CardPillar, SajuCardData }

export type SajuCardVariant = 'full' | 'mini' | 'export'

interface SajuCardProps {
  data: SajuCardData
  variant?: SajuCardVariant
  locale: Lang
  /** 타입 라벨 — 'plain'(SAJU TYPE, 기본) · 'mine'(My Saju type). */
  typeLabel?: keyof typeof SAJU_TYPE_LABEL
  className?: string
}

type ColKey = 'hour' | 'day' | 'month' | 'year'
const COLS: ColKey[] = ['hour', 'day', 'month', 'year']

function Header({ locale, variant }: { locale: Lang; variant: SajuCardVariant }) {
  const domain = shareDomain()
  return (
    <div className={`${s.strip} ${s.ch}`} data-card-header="">
      <span className={s.cwm}>
        <KkachiMark size={variant === 'mini' ? 12 : 16} />
        {variant === 'mini' ? 'destinypal' : domain}
      </span>
      <span className={s.chr}>
        {variant === 'mini' ? null : <span className={s.hook}>{pick(CARD.hook, locale)}</span>}
        <span className={s.seal} role="img" aria-label={pick(PROVENANCE.seal, locale)}>
          算
        </span>
      </span>
    </div>
  )
}

/** 기둥 타일 — 캡션은 아래 띠(PillarCaptions), mini 는 캡션 없이 타일만. */
function Pillars({ data, variant }: { data: SajuCardData; variant: SajuCardVariant }) {
  const tileSize = variant === 'mini' ? 'xs' : 'card'
  return (
    <div className={s.pil} data-card-pillars="">
      {COLS.map((k) => {
        const p = data.pillars[k]
        const hidden = k === 'hour' && (data.hourHidden || !p)
        const you = k === 'day'
        return (
          <div
            key={k}
            className={[s.col, you ? s.you : ''].filter(Boolean).join(' ')}
            data-col={k}
            data-hidden={hidden ? '' : undefined}
          >
            {hidden || !p ? (
              <>
                <ElementTile hidden size={tileSize} />
                <ElementTile hidden size={tileSize} />
              </>
            ) : (
              <>
                <ElementTile char={p.stem} element={p.element.stem} size={tileSize} />
                <ElementTile char={p.branch} element={p.element.branch} size={tileSize} />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function PillarCaptions({ data, locale }: { data: SajuCardData; locale: Lang }) {
  return (
    <div className={`${s.strip} ${s.pc}`} data-card-captions="">
      {COLS.map((k) => {
        const p = data.pillars[k]
        const hidden = k === 'hour' && (data.hourHidden || !p)
        const you = k === 'day'
        const head = you
          ? `${pick(CARD.day, locale)} · ${pick(CARD.you, locale)}`
          : pick(CARD[k], locale)
        const reading =
          hidden || !p ? pick(CARD.hidden, locale) : locale === 'ko' ? p.hangul : p.roman
        return (
          <span key={k} className={you ? s.pcYou : hidden ? s.pcHid : undefined} data-caption={k}>
            <b>{head}</b>
            {reading}
          </span>
        )
      })}
    </div>
  )
}

function DayMasterBigThree({ data, locale }: { data: SajuCardData; locale: Lang }) {
  const { sun, moon, asc } = data.bigThree
  return (
    <div className={`${s.strip} ${s.dmb}`} data-card-daymaster="">
      <span className={s.c}>
        <span className={s.cl}>{pick(CARD.dayMaster, locale)}</span>
        <span className={s.v}>
          <ElementTile char={data.dayMaster.stem} element={data.dayMaster.element} size="xs" />
          {pick(ELEMENT[data.dayMaster.element].name, locale)}
        </span>
      </span>
      <span className={s.c}>
        <span className={s.cl}>{pick(CARD.bigThree, locale)}</span>
        {/* 셋을 한 줄에, 좁으면(한국어 별자리 이름) 항목 단위로 줄바꿈 — 글자를 자르지 않는다. */}
        <span className={`${s.v} ${s.b3}`} data-big-three="">
          <span className={s.it}>
            <Glyph name="sun" className={s.pg} />
            <span className={s.sr}>{pick(CARD.sun, locale)} </span>
            {pick(sun, locale)}
          </span>
          <span className={s.it}>
            <span className={s.dot} aria-hidden="true">
              ·
            </span>
            <Glyph name="moon" className={s.pg} />
            <span className={s.sr}>{pick(CARD.moon, locale)} </span>
            {pick(moon, locale)}
          </span>
          <span className={s.it}>
            <span className={s.dot} aria-hidden="true">
              ·
            </span>
            <span className={s.ascTag}>{pick(CARD.asc, locale)}</span>
            <span data-asc={asc ? '' : 'unknown'}>{asc ? pick(asc, locale) : '—'}</span>
          </span>
        </span>
      </span>
    </div>
  )
}

function TypeStrip({
  data,
  locale,
  typeLabel,
}: {
  data: SajuCardData
  locale: Lang
  typeLabel: keyof typeof SAJU_TYPE_LABEL
}) {
  return (
    <div className={`${s.strip} ${s.tn}`} data-card-type="">
      <span className={s.k}>
        <span>{SAJU_TYPE_LABEL[typeLabel][locale]}</span>
      </span>
      <p className={s.nm} data-type-name="">
        {pick(data.typeName, locale)}
      </p>
      {data.lifeShape ? (
        <span className={s.ls} data-life-shape="">
          <span className={s.cl}>{pick(CARD.lifeShape, locale)}</span>
          <span className={s.v}>{pick(data.lifeShape, locale)}</span>
        </span>
      ) : null}
    </div>
  )
}

function IdentityAgree({ data, locale }: { data: SajuCardData; locale: Lang }) {
  const { identity, agree } = data
  if (!identity && !agree) return null
  return (
    <div className={`${s.strip} ${s.ia}`} data-card-identity="">
      {identity ? (
        <div className={s.idl}>
          <span className={s.cl}>{pick(CARD.identity, locale)}</span>
          <span>
            {pick(ELEMENT[identity.saju].name, locale)} ×{' '}
            {pick(ELEMENT[identity.astro].name, locale)}
          </span>
          <span className={s.s} aria-hidden="true">
            —
          </span>
          <span data-verdict={TONE_TO_VERDICT[identity.verdictKey]}>
            {pick(VERDICT[TONE_TO_VERDICT[identity.verdictKey]].long, locale)}
          </span>
        </div>
      ) : null}
      {agree ? (
        <AgreeLine
          lineUp={agree.lineUp}
          total={agree.total}
          locale={locale}
          className={identity ? s.agree : undefined}
        />
      ) : null}
    </div>
  )
}

function CardBack({ backYear }: { backYear: { ganji: string; year: number } }) {
  // 12시 = 그 세운. 연도 산술만 쓴다(절입 표를 카드 번들에 끌고 오지 않게 — lib/v9/ring).
  const ring = cardBackRing(yearRingIndex(backYear.year))
  return (
    <div className={s.back} aria-hidden="true" data-card-back="">
      <div className={s.bt}>
        <span>destinypal</span>
        <span>
          {backYear.ganji} · {backYear.year}
        </span>
      </div>
      <svg viewBox={ring.viewBox} width={300} height={323}>
        {ring.circles.map((c, i) => (
          <circle
            key={i}
            cx={c.cx}
            cy={c.cy}
            r={c.r}
            fill="none"
            stroke="currentColor"
            strokeOpacity={c.opacity}
            strokeWidth={c.width}
          />
        ))}
        {ring.ticks.map((t) => (
          <line
            key={t.n}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="currentColor"
            strokeOpacity={t.yang ? 0.8 : 0.42}
            strokeWidth={t.yang ? 1.7 : 1}
            strokeLinecap="round"
          />
        ))}
        {ring.dots.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={1.7} fill="currentColor" fillOpacity={0.45} />
        ))}
      </svg>
    </div>
  )
}

export default function SajuCard({
  data,
  variant = 'full',
  locale,
  typeLabel = 'plain',
  className,
}: SajuCardProps) {
  const cardClass = [s.card, variant === 'mini' ? s.mini : '', variant === 'export' ? s.export : '']
    .filter(Boolean)
    .join(' ')
  const label = `${pick(CARD.aria, locale)} · ${pick(SYSTEMS.pair, locale)}`

  const front = (
    <article
      className={[cardClass, data.backYear && variant === 'full' ? '' : className]
        .filter(Boolean)
        .join(' ')}
      aria-label={label}
      data-variant={variant}
    >
      <div className={s.in}>
        <Header locale={locale} variant={variant} />
        {variant === 'export' ? null : (
          <>
            <Pillars data={data} variant={variant} />
            {variant === 'full' ? <PillarCaptions data={data} locale={locale} /> : null}
          </>
        )}
        {variant === 'full' ? <DayMasterBigThree data={data} locale={locale} /> : null}
        <TypeStrip data={data} locale={locale} typeLabel={typeLabel} />
        {variant === 'full' ? <IdentityAgree data={data} locale={locale} /> : null}
      </div>
    </article>
  )

  if (variant === 'full' && data.backYear) {
    return (
      <div className={[s.stage, className].filter(Boolean).join(' ')} data-card-stage="">
        <CardBack backYear={data.backYear} />
        {front}
      </div>
    )
  }
  return front
}

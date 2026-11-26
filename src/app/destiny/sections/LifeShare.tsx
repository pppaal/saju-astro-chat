'use client'

/**
 * 공유 블록 — 'What's your friend's type?' + 사주 카드 mini(사주 타입 · 인생 모양 · 화면용 연 · 월 ·
 * 일주) + [이미지 카드로 공유] · [링크 공유].
 *
 * 개인정보(오너 결정): 공유 이미지와 공유 링크엔 사주 타입과 인생 모양만 담는다.
 *  - 이미지: 화면 밖 1080×1350 틀 안의 SajuCard 'export'(머리말 + 타입 띠 — 기둥 · 별자리 · 연도
 *    없음)를 useShareCardImage 로 캡처.
 *  - 링크: POST /api/life/share v2 { v: 2, isKo, crossType, lifeShape } — 날짜 · 기둥 · 곡선 없음.
 * 화면의 mini 카드 기둥은 보는 사람 자신의 화면에만 그린다.
 */

import { useRef } from 'react'
import SajuCard from '@/components/v9/SajuCard'
import { ShareImageModal } from '@/components/share/ShareImageModal'
import { useShareCardImage } from '@/lib/share/useShareCardImage'
import { useShareLink } from '@/lib/share/useShareLink'
import { trackFunnel } from '@/lib/metrics/trackFunnel'
import { fill, pick, type Lang } from '@/components/v9/v9Copy'
import type { CardPillar, SajuCardData } from '@/lib/card/types'
import { LIFE_COPY } from '../lifeCopy'
import { CardIcon, LinkIcon } from './icons'
import s from '../LifeFlow.module.css'

export interface LifeShareProps {
  locale: Lang
  /** 사주 타입 이름(보는 사람의 언어). */
  typeName: string
  /** 인생 모양 이름 — 없으면 null. */
  lifeShape: string | null
  /** 화면 mini 카드의 연 · 월 · 일주(공유 이미지 · 링크엔 넣지 않는다). */
  pillars: CardPillar[]
}

/** 공유 PNG 크기 — 4:5 세로(인스타 피드 · 스토리 · 카톡). */
const EXPORT_W = 1080
const EXPORT_H = 1350

const same = (t: string) => ({ ko: t, en: t })
const NO_SIGN = { ko: '', en: '' }

/** 카드 데이터 — mini 는 기둥을 그리고, export 는 같은 데이터에서 머리말 + 타입 띠만 그린다. */
function cardData(props: LifeShareProps): SajuCardData {
  const [year, month, day] = props.pillars
  return {
    pillars: { hour: null, day, month, year },
    hourHidden: true,
    dayMaster: { stem: day?.stem ?? '', element: day?.element.stem ?? 'water' },
    // mini · export 는 일간 · 빅 쓰리 띠를 그리지 않는다 — 빈 값.
    bigThree: { sun: NO_SIGN, moon: NO_SIGN, asc: null },
    typeName: same(props.typeName),
    lifeShape: props.lifeShape ? same(props.lifeShape) : null,
    identity: null,
    agree: null,
  }
}

export default function LifeShare(props: LifeShareProps) {
  const { locale, typeName, lifeShape } = props
  const isKo = locale === 'ko'
  const frameRef = useRef<HTMLDivElement>(null)
  const title = pick(LIFE_COPY.shareSheetTitle, locale)
  const text = fill(pick(LIFE_COPY.shareSheetText, locale), { type: typeName })

  const card = cardData(props)

  const link = useShareLink({
    endpoint: '/api/life/share',
    body: { v: 2, isKo, crossType: typeName, lifeShape: lifeShape ?? undefined },
    title,
    text,
    isKo,
    onStart: () => trackFunnel('destiny.share_link'),
    logTag: '[ShareLife]',
  })

  const image = useShareCardImage(frameRef, {
    width: EXPORT_W,
    height: EXPORT_H,
    backgroundColor: '#F3EFE7',
    filename: 'destinypal-saju-type.png',
    title,
    text,
    isKo,
    logTag: '[ShareLife]',
  })

  const onImage = () => {
    trackFunnel('destiny.share_image')
    image.render()
  }

  return (
    <section
      className={`${s.panel} ${s.share}`}
      data-life-section="share"
      aria-labelledby="life-share"
    >
      <div className={s.shh}>
        <div>
          <span className={s.eyebrow}>{pick(LIFE_COPY.shareEyebrow, locale)}</span>
          <h2 id="life-share" className={s.h2}>
            {pick(LIFE_COPY.shareTitleA, locale)}
            <br />
            {pick(LIFE_COPY.shareTitleB, locale)}
          </h2>
        </div>
        <div className={s.miniSlot}>
          <SajuCard data={card} variant="mini" locale={locale} />
        </div>
      </div>
      <div className={s.shr}>
        <button
          type="button"
          className={`${s.btnLine} ${s.grow}`}
          onClick={onImage}
          disabled={image.phase === 'rendering'}
          data-share="image"
        >
          <CardIcon />
          {image.phase === 'rendering'
            ? pick(LIFE_COPY.shareMaking, locale)
            : pick(LIFE_COPY.shareImage, locale)}
        </button>
        <button
          type="button"
          className={s.btnLine}
          onClick={() => void link.share()}
          disabled={link.phase === 'creating'}
          data-share="link"
        >
          <LinkIcon />
          {link.phase === 'copied'
            ? pick(LIFE_COPY.shareCopied, locale)
            : pick(LIFE_COPY.shareLink, locale)}
        </button>
      </div>
      {link.error || image.error ? (
        <p className={s.shareErr} role="status">
          {link.error ?? image.error}
        </p>
      ) : null}

      {/* 화면 밖 캡처 틀 — 렌더 중일 때만. 머리말 + 타입 띠만(기둥 · 연도 없음). */}
      {image.phase !== 'idle' ? (
        <div className={s.exportHost} aria-hidden="true">
          <div ref={frameRef} className={s.exportFrame} data-share-export="">
            <div className={s.exportCard}>
              <SajuCard data={card} variant="export" locale={locale} />
            </div>
          </div>
        </div>
      ) : null}

      {image.phase === 'preview' && image.previewUrl ? (
        <ShareImageModal
          isKo={isKo}
          previewUrl={image.previewUrl}
          onClose={image.close}
          onNativeShare={() => void image.nativeShare()}
          onDownload={image.download}
          canNativeShare={image.canNativeShare}
          link={{ phase: link.phase, error: link.error, onShare: () => void link.share() }}
          aspectRatio="4 / 5"
          hint={pick(LIFE_COPY.shareImageHint, locale)}
        />
      ) : null}
    </section>
  )
}

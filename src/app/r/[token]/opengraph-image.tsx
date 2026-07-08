// src/app/r/[token]/opengraph-image.tsx
//
// 공개 공유 리딩의 동적 OG 이미지(1200×630) — 카톡/엑스/슬랙 등에서 링크를
// 펼칠 때 보이는 미리보기. 후크(펀치라인)를 크게 박고, 하루/인생 공유는 "운
// 흐름 곡선"을 같이 그려 링크 자체가 클릭을 부르게 한다. Redis 조회가
// 필요하므로 nodejs 런타임.
//
// 곡선은 buildCurveSvg 로 SVG 문자열 → data-URI <img> 로 박는다(satori 의
// inline <svg> 한계 우회). 한글은 loadOgFonts 로 서브셋 폰트를 끼운다(없으면
// 라틴/숫자만 — best-effort).

import { ImageResponse } from 'next/og'
import {
  getShareLink,
  isCompatShare,
  isCalendarShare,
  isDayShare,
  isLifeShare,
  isReportShare,
  siteBaseUrl,
  type ShareLinkPayload,
} from '@/lib/tarot/shareLink'
import { buildCurveSvg, curveSvgDataUri, buildGaugeSvg } from '@/lib/share/curveSvg'
import { loadOgFonts } from '@/lib/share/ogFont'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'DestinyPal'

function clamp(text: string, max: number): string {
  const s = (text || '').trim()
  return s.length > max ? `${s.slice(0, max - 1).trim()}…` : s
}

const BG = 'linear-gradient(155deg, #14101c 0%, #0b0812 56%, #120a14 100%)'

// 톤별 강조색.
const TONE_ACCENT: Record<string, { line: string; soft: string }> = {
  positive: { line: '#ffd24d', soft: 'rgba(255,210,77,0.16)' },
  mixed: { line: '#e8a24d', soft: 'rgba(232,162,77,0.16)' },
  caution: { line: '#ff6b8a', soft: 'rgba(255,107,138,0.16)' },
}

function dayCurveImg(curve: number[], markerIndex: number, accent: string): string | null {
  if (!curve || curve.length < 2) return null
  const svg = buildCurveSvg({
    scores: curve,
    markerIndex,
    width: 1056,
    height: 200,
    strokeWidth: 5,
    theme: {
      stroke: accent,
      fill: accent,
      dotGood: accent,
      dotMid: 'rgba(255,255,255,0.5)',
      dotLow: '#ff6b8a',
      marker: '#ffffff',
      dotStroke: '#14101c',
    },
  })
  return svg ? curveSvgDataUri(svg) : null
}

function lifeCurveImg(curve: number[], markerIndex: number, peakIndex: number): string | null {
  if (!curve || curve.length < 2) return null
  const svg = buildCurveSvg({
    scores: curve,
    markerIndex,
    peakIndex,
    width: 1056,
    height: 240,
    strokeWidth: 5,
    theme: {
      stroke: '#ffb454',
      fill: '#ffb454',
      dotGood: '#ffd24d',
      dotMid: 'rgba(255,255,255,0.55)',
      dotLow: '#e88a5a',
      marker: '#ffffff',
      dotStroke: '#120a14',
    },
  })
  return svg ? curveSvgDataUri(svg) : null
}

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const reading: ShareLinkPayload | null = await getShareLink(token)
  const isKo = reading?.isKo ?? true
  const displayDomain = siteBaseUrl()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')

  // ── 하루(일진) — 점수 + 한 줄 + 이달 흐름 곡선 ──
  if (reading && isDayShare(reading)) {
    const accent = (TONE_ACCENT[reading.tone] ?? TONE_ACCENT.positive).line
    const soft = (TONE_ACCENT[reading.tone] ?? TONE_ACCENT.positive).soft
    const headline = clamp(reading.headline, 46)
    const subline = reading.subline ? clamp(reading.subline, 60) : ''
    const cta = isKo
      ? `내 점수도 무료로 · ${displayDomain}`
      : `Get your score free · ${displayDomain}`
    const curve = dayCurveImg(reading.curve ?? [], reading.markerIndex ?? -1, accent)
    const fonts = await loadOgFonts(reading.dateLabel, headline, subline, cta)
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: BG,
          color: '#f3eee6',
          fontFamily: 'NotoKR, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 28, letterSpacing: 2, color: accent }}>
            {clamp(reading.dateLabel, 28)}
          </div>
          <div style={{ fontSize: 26, color: '#8a8398', letterSpacing: 2 }}>DestinyPal</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: soft,
              borderRadius: 28,
              padding: '18px 30px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', color: accent }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: 132,
                  fontWeight: 800,
                  fontFamily: 'HeavyKR, sans-serif',
                  lineHeight: 1,
                }}
              >
                {reading.score}
              </div>
              <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, marginLeft: 6 }}>
                {isKo ? '점' : ''}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            <div
              style={{
                fontSize: 62,
                fontWeight: 800,
                lineHeight: 1.16,
                fontFamily: 'HeavyKR, sans-serif',
                color: '#fbf7ef',
              }}
            >
              {headline}
            </div>
            {subline ? (
              <div style={{ fontSize: 30, color: '#b6aec0', lineHeight: 1.4 }}>{subline}</div>
            ) : null}
          </div>
        </div>

        {curve ? (
          <img src={curve} alt="" width={1056} height={176} style={{ objectFit: 'contain' }} />
        ) : (
          <div style={{ display: 'flex' }} />
        )}

        <div style={{ fontSize: 26, color: '#8a8398' }}>{cta}</div>
      </div>,
      { ...size, fonts: fonts.length ? fonts : undefined }
    )
  }

  // ── 인생/대운 곡선 — 큰 그림 + 곡선 ──
  if (reading && isLifeShare(reading)) {
    // 인생유형 별명(대기만성형 등)이 있으면 그게 카드 주인공(MBTI 풍 배지) — 사람들이
    // 공유하는 건 곡선이 아니라 "나 대기만성형이래" 정체성이다. 없으면(레거시 링크)
    // 후크 헤드라인을 주인공으로.
    const typeName = reading.typeName ? clamp(reading.typeName, 20) : ''
    const headline = clamp(reading.headline, typeName ? 52 : 40)
    const subline = reading.subline ? clamp(reading.subline, 64) : ''
    const eyebrow = typeName
      ? isKo
        ? '사주 × 별자리 · 인생유형'
        : 'Korean Astrology × Zodiac · Life type'
      : reading.rangeLabel
        ? clamp(reading.rangeLabel, 32)
        : isKo
          ? '사주 × 별자리'
          : 'Korean Astrology × Zodiac'
    const cta = isKo
      ? `내 인생유형도 무료로 · ${displayDomain}`
      : `See your life type free · ${displayDomain}`
    const curve = lifeCurveImg(reading.curve, reading.markerIndex ?? -1, reading.peakIndex ?? -1)
    const axis = (reading.axisLabels ?? []).slice(0, 4)
    const fonts = await loadOgFonts(eyebrow, typeName, headline, subline, cta, axis.join(' '))
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: 'linear-gradient(160deg, #1c0f0a 0%, #2c130f 48%, #0c0708 100%)',
          color: '#f6ece0',
          fontFamily: 'NotoKR, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 27, letterSpacing: 4, color: '#e8a05a' }}>{eyebrow}</div>
          <div style={{ fontSize: 26, color: '#a98c74', letterSpacing: 2 }}>DestinyPal</div>
        </div>

        {typeName ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                fontSize: 108,
                fontWeight: 800,
                lineHeight: 1.05,
                fontFamily: 'HeavyKR, sans-serif',
                color: '#ffd9a3',
              }}
            >
              {typeName}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 40,
                fontWeight: 700,
                lineHeight: 1.3,
                fontFamily: 'HeavyKR, sans-serif',
                color: '#f6ece0',
              }}
            >
              {headline}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                fontSize: 70,
                fontWeight: 800,
                lineHeight: 1.2,
                fontFamily: 'HeavyKR, sans-serif',
                color: '#ffe9cf',
              }}
            >
              {headline}
            </div>
            {subline ? (
              <div style={{ display: 'flex', fontSize: 30, color: '#d8b89a', lineHeight: 1.45 }}>
                {subline}
              </div>
            ) : null}
          </div>
        )}

        {curve ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <img src={curve} alt="" width={1056} height={210} style={{ objectFit: 'contain' }} />
            {axis.length ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 4,
                  padding: '0 12px',
                }}
              >
                {axis.map((a, i) => (
                  <div key={i} style={{ fontSize: 22, color: '#c79a7a' }}>
                    {clamp(a, 14)}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div style={{ display: 'flex' }} />
        )}

        <div style={{ fontSize: 26, color: '#a98c74' }}>{cta}</div>
      </div>,
      { ...size, fonts: fonts.length ? fonts : undefined }
    )
  }

  // ── 캘린더(이달 흐름 곡선 있음) — 점수 카드처럼 곡선을 주인공으로 ──
  if (reading && isCalendarShare(reading) && reading.curve && reading.curve.length >= 2) {
    const headline = clamp(reading.headline, 56)
    const eyebrow = clamp(reading.periodLabel, 32)
    const hl = reading.highlights?.length ? clamp(reading.highlights[0], 60) : ''
    const cta = isKo
      ? `내 운흐름도 무료로 · ${displayDomain}`
      : `See your timing free · ${displayDomain}`
    const curve = dayCurveImg(reading.curve, reading.markerIndex ?? -1, '#e8cc8a')
    const fonts = await loadOgFonts(eyebrow, headline, hl, cta)
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: BG,
          color: '#f3eee6',
          fontFamily: 'NotoKR, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 28, letterSpacing: 3, color: '#e8cc8a' }}>{eyebrow}</div>
          <div style={{ fontSize: 26, color: '#8a8398', letterSpacing: 2 }}>DestinyPal</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              fontSize: 62,
              fontWeight: 800,
              lineHeight: 1.18,
              fontFamily: 'HeavyKR, sans-serif',
              color: '#f6efdd',
            }}
          >
            {headline}
          </div>
          {hl ? <div style={{ fontSize: 30, color: '#b6aec0', lineHeight: 1.4 }}>{hl}</div> : null}
        </div>

        {curve ? (
          <img src={curve} alt="" width={1056} height={196} style={{ objectFit: 'contain' }} />
        ) : (
          <div style={{ display: 'flex' }} />
        )}

        <div style={{ fontSize: 26, color: '#8a8398' }}>{cta}</div>
      </div>,
      { ...size, fonts: fonts.length ? fonts : undefined }
    )
  }

  // ── 궁합(점수 있음) — 점수 게이지가 주인공. 다운로드 1080 카드와 "한 얼굴" ──
  // 링크 미리보기(카톡·X)에서 곡선처럼 게이지를 박아, 텍스트만이던 밋밋함을 없애고
  // 클릭을 부른다. 게이지는 satori 비호환 필터 없이 그라데이션 stroke 만(카드와 동일 결).
  if (reading && isCompatShare(reading) && typeof reading.score === 'number') {
    const eyebrow = `${reading.nameA}   ♥   ${reading.nameB}`
    const grade = reading.grade ? clamp(reading.grade, 22) : ''
    const verdict = clamp(reading.verdict, 72)
    // 족집게 한 줄 — 이름+구체 신호. 링크 미리보기에서 "이거 우리 얘기?" 를 만든다.
    const proof = reading.headline ? clamp(reading.headline, 66) : ''
    const cta = isKo
      ? `우리 궁합도 무료로 · ${displayDomain}`
      : `Check your match free · ${displayDomain}`
    const gauge = curveSvgDataUri(
      buildGaugeSvg({
        score: reading.score,
        size: 300,
        strokeWidth: 20,
        theme: {
          track: 'rgba(255,255,255,0.09)',
          gradFrom: '#fff2cf',
          gradMid: '#e8c88c',
          gradTo: '#ff7e9d',
        },
      })
    )
    const fonts = await loadOgFonts(eyebrow, `${reading.score}`, grade, verdict, proof, cta)
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background:
            'radial-gradient(900px 620px at 20% 8%, rgba(124,92,255,0.24), transparent 58%),' +
            'radial-gradient(820px 640px at 88% 96%, rgba(232,180,120,0.18), transparent 60%),' +
            'linear-gradient(160deg, #0b0a1f 0%, #0a0817 56%, #0c0a1d 100%)',
          color: '#f3f0ff',
          fontFamily: 'NotoKR, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 30, letterSpacing: 3 }}>
            <span style={{ color: '#fff', fontWeight: 700 }}>{clamp(reading.nameA, 14)}</span>
            <span style={{ color: '#ff6f97', margin: '0 16px', fontSize: 30 }}>♥</span>
            <span style={{ color: '#fff', fontWeight: 700 }}>{clamp(reading.nameB, 14)}</span>
          </div>
          <div style={{ fontSize: 26, color: '#8d85b0', letterSpacing: 2 }}>DestinyPal</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 56 }}>
          <div style={{ display: 'flex', width: 300, height: 300, position: 'relative' }}>
            <img src={gauge} width={300} height={300} alt="" />
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 300,
                height: 300,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: 132,
                  fontWeight: 800,
                  lineHeight: 1,
                  color: '#e8c88c',
                  fontFamily: 'HeavyKR, sans-serif',
                }}
              >
                {reading.score}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 24,
                  color: '#b9a8e6',
                  letterSpacing: 3,
                  marginTop: 2,
                }}
              >
                /100
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
            {grade ? (
              <div
                style={{
                  display: 'flex',
                  alignSelf: 'flex-start',
                  padding: '8px 22px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,143,174,0.45)',
                  background: 'rgba(255,94,138,0.10)',
                  color: '#ff8fae',
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                {grade}
              </div>
            ) : null}
            <div
              style={{
                fontSize: 42,
                fontWeight: 800,
                lineHeight: 1.26,
                color: '#f6efdd',
                fontFamily: 'HeavyKR, sans-serif',
              }}
            >
              {verdict}
            </div>
            {proof ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  fontSize: 26,
                  lineHeight: 1.4,
                  color: '#c9bff0',
                }}
              >
                {/* satori 는 ✦ 같은 딩벳을 못 그릴 수 있어 도형(점)으로 대신한다. */}
                <span
                  style={{
                    display: 'flex',
                    width: 11,
                    height: 11,
                    borderRadius: 999,
                    background: '#e8c88c',
                    marginRight: 13,
                    marginTop: 12,
                  }}
                />
                {proof}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ fontSize: 27, color: '#8d85b0' }}>{cta}</div>
      </div>,
      { ...size, fonts: fonts.length ? fonts : undefined }
    )
  }

  // ── 궁합(점수 없는 구버전) / 캘린더 / 타로(레거시) — 텍스트 후크 중심 ──
  let eyebrow: string
  let headline: string
  let context: string
  let cta: string
  if (reading && isCompatShare(reading)) {
    eyebrow = `${reading.nameA}  ♥  ${reading.nameB}`
    // 점수가 있으면 큰 숫자+등급을 헤드라인으로(극적 후크), verdict 는 보조로.
    // 없으면(구버전 링크) 기존대로 verdict 를 헤드라인으로.
    if (typeof reading.score === 'number') {
      const scoreLabel = isKo ? `${reading.score}점` : `${reading.score}/100`
      headline = clamp(reading.grade ? `${scoreLabel} · ${reading.grade}` : scoreLabel, 40)
      context = clamp(reading.verdict, 70)
    } else {
      headline = clamp(reading.verdict, 80)
      context = reading.headline ? clamp(reading.headline, 70) : ''
    }
    cta = isKo
      ? `우리 궁합도 무료로 · ${displayDomain}`
      : `Check your match free · ${displayDomain}`
  } else if (reading && isCalendarShare(reading)) {
    eyebrow = clamp(reading.periodLabel, 40)
    headline = clamp(reading.headline, 72)
    context = reading.highlights?.length ? clamp(reading.highlights[0], 70) : ''
    cta = isKo ? `내 운흐름도 무료로 · ${displayDomain}` : `See your timing free · ${displayDomain}`
  } else if (reading && isReportShare(reading)) {
    // resonant(동·서양이 둘 다 가리키는 주제 수)가 2개 이상이면 eyebrow 를 "일치"
    // 훅으로 — 링크 미리보기에서 typeName 만 있던 밋밋함을 신뢰/호기심 신호로 보강.
    const rc = reading.resonant?.length ?? 0
    eyebrow =
      rc >= 2
        ? isKo
          ? `🔮 사주 × 별자리가 ${rc}가지에서 일치`
          : `🔮 Korean astrology × zodiac agree on ${rc} things`
        : `${reading.emoji}  ${isKo ? '사주 × 별자리 유형' : 'KOREAN ASTROLOGY × ZODIAC'}`
    headline = clamp(reading.typeName, 40)
    // 엇갈림(clash)이 있으면 그게 가장 차트-고유한 클릭 훅 — oneLiner 보다 우선.
    context = reading.clash
      ? clamp(
          isKo
            ? `⚡ ${reading.clash.category}에선 갈렸어 — 사주 "${reading.clash.saju}" vs 별자리 "${reading.clash.astro}"`
            : `⚡ Split on ${reading.clash.category} — Saju "${reading.clash.saju}" vs stars "${reading.clash.astro}"`,
          80
        )
      : clamp(reading.oneLiner, 72)
    cta = isKo ? `내 유형도 무료로 · ${displayDomain}` : `See your own type free · ${displayDomain}`
  } else {
    eyebrow = isKo ? '타로 리딩' : 'TAROT READING'
    headline = reading?.keyMessage
      ? clamp(reading.keyMessage, 64)
      : reading
        ? clamp(reading.question, 64)
        : isKo
          ? '타로 리딩'
          : 'Tarot Reading'
    context = reading?.keyMessage ? clamp(reading.question, 70) : ''
    cta = isKo ? `나도 카드 뽑아보기 · ${displayDomain}` : `Pull your own cards · ${displayDomain}`
  }

  const fonts = await loadOgFonts(eyebrow, headline, context, cta)
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: BG,
        color: '#f1f3f9',
        fontFamily: 'NotoKR, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          color: '#e8cc8a',
          fontSize: 32,
          fontWeight: 700,
        }}
      >
        DestinyPal
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ fontSize: 26, letterSpacing: 6, color: '#d4b572' }}>{eyebrow}</div>
        <div
          style={{
            fontSize: 66,
            fontWeight: 800,
            lineHeight: 1.18,
            fontFamily: 'HeavyKR, sans-serif',
            color: '#e8cc8a',
          }}
        >
          {headline}
        </div>
        {context ? (
          <div style={{ fontSize: 32, color: '#aab2c6', lineHeight: 1.4 }}>{context}</div>
        ) : null}
      </div>

      <div style={{ fontSize: 28, color: '#9aa3b8' }}>{cta}</div>
    </div>,
    { ...size, fonts: fonts.length ? fonts : undefined }
  )
}

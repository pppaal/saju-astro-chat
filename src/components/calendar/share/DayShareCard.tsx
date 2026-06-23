'use client'

/**
 * DayShareCard — 오늘의 운세(1일 티어)를 SNS(인스타/카톡) 공유용 1080×1080
 * 정사각 카드로 그린다. html-to-image 로 이 DOM 노드를 그대로 PNG 캡처한다
 * (ShareDayButton).
 *
 * 디자인: 캘린더 본체와 같은 **한지(韓紙) 먹 아키텍처** — 베이지 한지 바탕 +
 * 먹(墨) 글자 + 朱(주·vermilion) 강조 + 藍/쪽빛 보조. 색은 calendar
 * variables.module.css 의 --dp-* 토큰 실측값을 그대로 박는다(아래 상수).
 * (직전엔 타로 카드의 다크 네이비/골드 우주 테마를 그대로 써서 캘린더 한지
 *  톤과 충돌했다 — "카드는 왜 한지가 아니냐" 피드백 반영.)
 *
 * 캡처 호환성:
 *  - CSS 변수 대신 명시 hex 색 사용(html-to-image 가 커스텀 프로퍼티 인라인 불안정).
 *  - next/image 가 아니라 평범한 <img> 로 로고 렌더(srcset/lazy 회피).
 *  - 한자(일진)는 CJK 세리프(한국어 명조) 스택으로 — Georgia 폴백은 한자를 못 그린다.
 *
 * 개인정보: DestinyDay 에는 사용자 이름이 없다(운세 산문·일진·점수뿐). 그래도
 * 출생정보·이름은 카드에 싣지 않는다 — 날짜·일진·톤·한줄·사유만 노출.
 *
 * 부모가 화면 밖(off-screen)에 1080×1080 으로 렌더해 두고 ref 로 캡처한다.
 */

import React from 'react'

export interface DayShareData {
  isKo: boolean
  /** 표시용 날짜 — ko 는 '2026년 6월 15일', en 은 '2026-06-15'. */
  dateLabel: string
  /** 일진 천간+지지 한자 — '庚申'. */
  iljinHanja: string
  /** 일진 한글 — '경신'. */
  iljinKr: string
  /** 일간 기준 십신 라벨(이미 로케일 반영). */
  sibsinLabel: string
  /** 톤 단어 — 순풍/평이/역풍 · Tailwind/Steady/Headwind. */
  toneWord: string
  tone: 'positive' | 'mixed' | 'caution'
  /** 한 줄 결론(이미 로케일 반영). */
  oneLine: string
  /** 상위 우호 사유(최대 3, 로케일 반영·화살표 제거). */
  goods: string[]
  /** 상위 주의 사유(최대 3, 로케일 반영·화살표 제거). */
  cautions: string[]
}

// ── 한지 먹 팔레트 (calendar styles/variables.module.css --dp-* 실측값) ──
const PAPER = '#ece2cd' // --dp-bg
const PAPER_HI = '#f3ecdc' // --dp-void
const PAPER_LO = '#ddcfb1' // --dp-bg-3
const INK = '#2a2318' // --dp-ink
const INK_DIM = '#4d4334' // --dp-ink-dim
const INK_MUTE = '#82745c' // --dp-ink-mute
const EMBER = '#b03a22' // --dp-ember (朱)
const EMBER_2 = '#c8492c' // --dp-ember-2
const LINE = 'rgba(58, 46, 28, 0.20)' // --dp-line (먹 기반)
const SEAL_TEXT = '#f6ecd9' // 朱 인장 위 글자(크림) — DayTier .iljinBig .han 과 동일
const PANEL = 'rgba(255, 251, 242, 0.55)' // --dp-panel (크림 lift)

const SERIF_KO =
  "'Gowun Batang', 'Noto Serif KR', 'Noto Serif CJK KR', 'Apple SD Gothic Neo', serif"
const SERIF = "'Newsreader', 'Gowun Batang', Georgia, serif"
const SANS = "'Gowun Dodum', 'Noto Sans KR', 'Apple SD Gothic Neo', system-ui, sans-serif"

// 톤별 강조색 — 한지 네이티브 3색으로 구분(순풍=쪽빛초록 / 평이=흙금 / 역풍=朱).
const TONE_COLOR: Record<DayShareData['tone'], string> = {
  positive: '#2f7d5b', // --dp-pos (초록)
  mixed: '#b3873a', // --dp-el-earth (흙·금빛 — 중립)
  caution: '#b03a22', // --dp-ember/neg (朱)
}

export const SHARE_CARD_SIZE = 1080

export const DayShareCard = React.forwardRef<HTMLDivElement, { data: DayShareData }>(
  function DayShareCard({ data }, ref) {
    const {
      isKo,
      dateLabel,
      iljinHanja,
      iljinKr,
      sibsinLabel,
      toneWord,
      tone,
      oneLine,
      goods,
      cautions,
    } = data
    const toneCol = TONE_COLOR[tone]
    const goodsShown = goods.slice(0, 3)
    const cautionsShown = cautions.slice(0, 3)

    return (
      <div
        ref={ref}
        style={{
          width: SHARE_CARD_SIZE,
          height: SHARE_CARD_SIZE,
          boxSizing: 'border-box',
          padding: 64,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          // 한지 바탕 — 크림 그라데이션 위에 朱/藍 글로우를 아주 옅게.
          background:
            'radial-gradient(900px 620px at 25% 8%, rgba(52,64,111,0.10), transparent 60%),' +
            'radial-gradient(820px 700px at 85% 100%, rgba(176,58,34,0.10), transparent 60%),' +
            `linear-gradient(160deg, ${PAPER_HI} 0%, ${PAPER} 55%, ${PAPER_LO} 100%)`,
          color: INK,
          fontFamily: SANS,
        }}
      >
        {/* 먹선 내부 프레임 (한지 낙관 테두리) */}
        <div
          style={{
            position: 'absolute',
            inset: 28,
            border: `1px solid ${LINE}`,
            borderRadius: 10,
            pointerEvents: 'none',
          }}
        />

        {/* 헤더 — 브랜드 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, zIndex: 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/logo.png"
            alt="DestinyPal"
            width={44}
            height={44}
            style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 8 }}
          />
          <span
            style={{
              fontFamily: SERIF,
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: EMBER,
            }}
          >
            DestinyPal
          </span>
        </div>

        {/* 날짜 + 일진 + 톤 */}
        <div style={{ zIndex: 1, textAlign: 'center', maxWidth: 900 }}>
          <div
            style={{
              fontFamily: SANS,
              fontSize: 22,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: INK_MUTE,
              marginBottom: 18,
            }}
          >
            {isKo ? '오늘의 운세' : "TODAY'S FORTUNE"}
          </div>
          <div style={{ fontSize: 28, color: INK_DIM, marginBottom: 26 }}>{dateLabel}</div>

          {/* 일진 — 朱 인장(낙관) 블록 + 한글 독음 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontFamily: SERIF_KO,
                fontSize: 110,
                lineHeight: 1,
                fontWeight: 700,
                color: SEAL_TEXT,
                background: EMBER,
                padding: '16px 24px',
                borderRadius: 8,
              }}
            >
              {iljinHanja}
            </span>
            <span style={{ fontFamily: SERIF_KO, fontSize: 40, color: INK_DIM }}>{iljinKr}</span>
          </div>
          <div style={{ fontSize: 24, color: EMBER_2, marginBottom: 26 }}>{sibsinLabel}</div>

          {/* 톤 배지 */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 28px',
              borderRadius: 999,
              border: `1.5px solid ${toneCol}`,
              background: PANEL,
            }}
          >
            <span style={{ width: 14, height: 14, borderRadius: 999, background: toneCol }} />
            <span style={{ fontFamily: SERIF_KO, fontSize: 30, fontWeight: 700, color: toneCol }}>
              {toneWord}
            </span>
          </div>
        </div>

        {/* 한 줄 결론 */}
        <div style={{ zIndex: 1, maxWidth: 900, textAlign: 'center' }}>
          {oneLine ? (
            <div
              style={{
                fontFamily: SERIF_KO,
                fontSize: 34,
                lineHeight: 1.55,
                color: INK,
                wordBreak: 'keep-all',
                whiteSpace: 'pre-wrap',
              }}
            >
              <span style={{ color: EMBER, fontWeight: 700 }}>“</span>
              {oneLine}
              <span style={{ color: EMBER, fontWeight: 700 }}>”</span>
            </div>
          ) : null}
        </div>

        {/* 좋은 흐름 / 조심 */}
        <div
          style={{
            zIndex: 1,
            width: '100%',
            maxWidth: 880,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {goodsShown.map((g, i) => (
            <div
              key={`g-${i}`}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 24 }}
            >
              <span style={{ color: TONE_COLOR.positive, fontWeight: 700 }}>↑</span>
              <span style={{ color: INK, wordBreak: 'keep-all', textAlign: 'left' }}>{g}</span>
            </div>
          ))}
          {cautionsShown.map((c, i) => (
            <div
              key={`c-${i}`}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 24 }}
            >
              <span style={{ color: TONE_COLOR.caution, fontWeight: 700 }}>↓</span>
              <span style={{ color: INK, wordBreak: 'keep-all', textAlign: 'left' }}>{c}</span>
            </div>
          ))}
        </div>

        {/* 푸터 */}
        <div
          style={{
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 20,
            color: INK_MUTE,
          }}
        >
          <span style={{ color: EMBER_2 }}>✦</span>
          <span>{isKo ? '사주 × 점성 운흐름 캘린더' : 'Saju × Astrology timing'}</span>
          <span style={{ color: INK_MUTE }}>·</span>
          <span>destinypal.com</span>
        </div>
      </div>
    )
  }
)

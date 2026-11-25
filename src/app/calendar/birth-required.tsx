/* ============================================================
   /calendar — BirthRequiredFallback
   ───────────────────────────────────────────────────────────
   본명(생년월일·시·좌표) 정보가 부족할 때 보여주는 안내 카드.

   두 가지 케이스 (비로그인 익명은 로더가 BirthGate 로 보낸다 — 여기 안 옴):
     · reason="no-birth"     → 로그인 OK, 본명 미입력 — /profile 안내
     · reason="rate-limited" → 익명 override 빌드 IP 한도 초과 — 재시도 안내

   둘 다 destinypal-ink 톤 (라이트 베이지 + 주사 + 쪽빛) 으로
   동일 카드 레이아웃을 공유. no-birth 는 "샘플 먼저 보기"(/calendar/preview)
   링크를 노출(실데이터가 없어도 디자인을 미리 보고 싶은 사용자 배려).
   ============================================================ */

import Link from 'next/link'
import styles from './birth-required.module.css'

export type BirthRequiredReason = 'no-birth' | 'rate-limited'

export interface BirthRequiredFallbackProps {
  reason: BirthRequiredReason
  /** rate-limited 안내 문구 로케일. 기본 ko. */
  locale?: 'ko' | 'en'
}

export default function BirthRequiredFallback({
  reason,
  locale = 'ko',
}: BirthRequiredFallbackProps) {
  if (reason === 'rate-limited') {
    return (
      <div className={styles.page}>
        <article className={styles.card}>
          <span className={styles.seal}>命 · 본명</span>
          <h1 className={styles.title}>
            {locale === 'en' ? 'Too many requests' : '요청이 많아요'}
          </h1>
          <p className={styles.subtitle}>
            {locale === 'en'
              ? 'This chart view is being requested too quickly. Please wait a moment and try again.'
              : '잠시 사이에 너무 많은 차트 요청이 들어왔어요. 잠깐 기다렸다 다시 시도해 주세요.'}
          </p>
        </article>
      </div>
    )
  }

  // reason === 'no-birth'
  return (
    <div className={styles.page}>
      <article className={styles.card}>
        <span className={styles.seal}>命 · 본명</span>
        <h1 className={styles.title}>본명을 입력하면 시작됩니다</h1>
        <p className={styles.subtitle}>
          계정은 확인했어요. 다만 사주를 세우려면 <strong>생년월일</strong>,
          <strong> 출생 시각</strong>, <strong>출생지 좌표</strong> 가 필요합니다. 프로필에서 한
          번만 저장해두면 destinypal 의 모든 tier 가 자동으로 연결됩니다.
        </p>

        <hr className={styles.hr} />
        <p className={styles.helper}>필요한 정보</p>
        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            fontSize: 14,
            lineHeight: 1.75,
            color: '#4d4334',
          }}
        >
          <li>생년월일 (YYYY-MM-DD)</li>
          <li>출생 시각 (HH:mm) — 모르면 12:00 으로 우선 진행 가능</li>
          <li>출생지 — 도시 자동완성에서 선택 (좌표·시간대 자동 채움)</li>
        </ul>

        <div className={styles.actions} style={{ marginTop: 22 }}>
          <Link href="/profile" className={styles.btnPrimary}>
            프로필에서 본명 입력하기
          </Link>
          <Link href="/calendar/preview" className={styles.btnSecondary}>
            샘플 먼저 보기
          </Link>
        </div>

        <p className={styles.note}>
          본명은 진태양시(진경도) 보정에 사용되며, destinypal·calendar·counselor 전체에서 동일하게
          재사용됩니다.
        </p>
      </article>
    </div>
  )
}

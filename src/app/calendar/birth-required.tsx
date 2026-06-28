/* ============================================================
   /calendar — BirthRequiredFallback
   ───────────────────────────────────────────────────────────
   본명(생년월일·시·좌표) 정보가 부족할 때 보여주는 안내 카드.

   두 가지 케이스:
     · reason="login"     → 비로그인 — 로그인 안내 + signIn CTA
     · reason="no-birth"  → 로그인 OK, 본명 미입력 — /profile 안내

   둘 다 destinypal-ink 톤 (라이트 베이지 + 주사 + 쪽빛) 으로
   동일 카드 레이아웃을 공유.  "1995 sample 보기" 링크는 항상 노출
   (실데이터가 없어도 디자인을 미리 보고 싶은 사용자 배려).
   ============================================================ */

import Link from 'next/link'
import styles from './birth-required.module.css'

export type BirthRequiredReason = 'login' | 'no-birth' | 'rate-limited'

export interface BirthRequiredFallbackProps {
  reason: BirthRequiredReason
  /** 비로그인 시 signIn 후 돌아올 경로. 기본 /calendar */
  callbackUrl?: string
  /** rate-limited 안내 문구 로케일. 기본 ko. */
  locale?: 'ko' | 'en'
}

export default function BirthRequiredFallback({
  reason,
  callbackUrl = '/calendar',
  locale = 'ko',
}: BirthRequiredFallbackProps) {
  // signIn 진입 URL — buildSignInUrl 은 client only(window 의존) 라
  // 서버에서 직접 만들지 못한다. 수동 구성.
  const signinHref = `/auth/signin?callbackUrl=${encodeURIComponent(
    `${callbackUrl}?authRefresh=1`
  )}`

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

  if (reason === 'login') {
    return (
      <div className={styles.page}>
        <article className={styles.card}>
          <span className={styles.seal}>命 · 본명</span>
          <h1 className={styles.title}>본명 정보가 필요합니다</h1>
          <p className={styles.subtitle}>
            destinypal 은 사용자의 사주 본명(생년월일·시·출생지) 을 기반으로 평생·연·월·일·대운 5
            tier 흐름을 짜드립니다. 먼저 로그인하여 저장된 본명을 불러오세요.
          </p>

          <div className={styles.actions}>
            <Link href={signinHref} className={styles.btnPrimary}>
              로그인하고 본명 불러오기
            </Link>
            <Link href="/calendar/preview" className={styles.btnSecondary}>
              1995 sample 미리보기
            </Link>
          </div>

          <p className={styles.note}>
            샘플은 1995-02-09 06:40 서울 출생 (남) 기준 — 디자인과 정보 구조를 그대로 둘러볼 수
            있습니다.
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
            1995 sample 먼저 보기
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

/* ============================================================
   /calendar · /destiny — BirthRequiredFallback (v9.2 종이 안내)
   ───────────────────────────────────────────────────────────
   본명(생년월일·시·출생지)이 부족할 때 보여주는 안내. 두 경우
   (비로그인 익명은 로더가 BirthGate 로 보낸다 — 여기 안 옴):
     · reason="no-birth"     → 로그인 OK, 본명 미입력 — /profile 안내
     · reason="rate-limited" → 익명 override 빌드 IP 한도 초과 — 재시도 안내

   두 라우트 모두 V9Root(layout) 안이라 v9 토큰을 쓴다. 문구는 ko/en 한 쌍 — locale 을
   안 넘기면 서버 로케일(detectServerLocale)을 읽는다. no-birth 는 공개 샘플
   (/calendar/preview) 링크를 함께 둔다.
   ============================================================ */

import Link from 'next/link'
import { detectServerLocale } from '@/i18n/server'
import type { Bi } from '@/lib/i18n/bi'
import styles from './birth-required.module.css'

export type BirthRequiredReason = 'no-birth' | 'rate-limited'

export interface BirthRequiredFallbackProps {
  reason: BirthRequiredReason
  /** 문구 로케일 — 없으면 서버 로케일. */
  locale?: 'ko' | 'en'
}

const COPY = {
  corner: { ko: '출생 정보', en: 'Birth details' },
  limitedCorner: { ko: '잠시 후 다시', en: 'Try again shortly' },
  limitedTitle: { ko: '요청이 많아요', en: 'Too many requests' },
  limitedBody: {
    ko: '잠시 사이에 너무 많은 차트 요청이 들어왔어요. 잠깐 기다렸다 다시 시도해 주세요.',
    en: 'This chart view is being requested too quickly. Please wait a moment and try again.',
  },
  title: { ko: '출생 정보를 넣으면 시작돼요', en: 'Start with your birth details' },
  body: {
    ko: '계정은 확인했어요. 차트를 계산하려면 생년월일, 태어난 시각, 태어난 곳이 필요해요. 프로필에 한 번 저장해 두면 운세 달력 · 인생 흐름 · 상담사가 모두 같은 정보로 이어져요.',
    en: 'We found your account. To compute your chart we need your date of birth, birth time and birthplace. Save them once in your profile and the calendar, Life flow and counselor all use the same details.',
  },
  needLabel: { ko: '필요한 정보', en: 'What we need' },
  needDate: { ko: '생년월일 (YYYY-MM-DD)', en: 'Date of birth (YYYY-MM-DD)' },
  needTime: {
    ko: '태어난 시각 (HH:mm) — 모르면 비워 두세요. 세 기둥으로 읽어요',
    en: 'Birth time (HH:mm) — leave it blank if unknown; we read three pillars',
  },
  needPlace: {
    ko: '태어난 곳 — 도시를 고르면 좌표 · 시간대가 채워져요',
    en: 'Birthplace — pick a city and the coordinates and time zone fill in',
  },
  toProfile: { ko: '프로필에서 출생 정보 넣기', en: 'Add birth details in my profile' },
  toSample: { ko: '샘플 먼저 보기', en: 'See a sample first' },
  note: {
    ko: '태어난 시각은 태어난 곳의 태양시로 바꿔 시주에만 써요. 같은 정보를 운세 달력 · 인생 흐름 · 상담사가 함께 써요.',
    en: 'Your birth time is converted to the local solar time of your birthplace for the hour pillar only. The calendar, Life flow and counselor share the same details.',
  },
} as const satisfies Record<string, Bi>

export default async function BirthRequiredFallback({
  reason,
  locale,
}: BirthRequiredFallbackProps) {
  const lang = locale ?? (await detectServerLocale())
  const t = (b: Bi) => b[lang]

  if (reason === 'rate-limited') {
    return (
      <div className={styles.page} lang={lang} data-birth-required="rate-limited">
        <article className={styles.card}>
          <div className={styles.lr}>
            <span>{t(COPY.limitedCorner)}</span>
          </div>
          <h1 className={styles.title}>{t(COPY.limitedTitle)}</h1>
          <p className={styles.body}>{t(COPY.limitedBody)}</p>
        </article>
      </div>
    )
  }

  return (
    <div className={styles.page} lang={lang} data-birth-required="no-birth">
      <article className={styles.card}>
        <div className={styles.lr}>
          <span>{t(COPY.corner)}</span>
        </div>
        <h1 className={styles.title}>{t(COPY.title)}</h1>
        <p className={styles.body}>{t(COPY.body)}</p>

        <p className={styles.needLabel}>{t(COPY.needLabel)}</p>
        <ul className={styles.need}>
          <li>{t(COPY.needDate)}</li>
          <li>{t(COPY.needTime)}</li>
          <li>{t(COPY.needPlace)}</li>
        </ul>

        <div className={styles.actions}>
          <Link href="/profile" className={styles.btnDark}>
            {t(COPY.toProfile)}
          </Link>
          <Link href="/calendar/preview" className={styles.btnLine}>
            {t(COPY.toSample)}
          </Link>
        </div>

        <p className={styles.note}>{t(COPY.note)}</p>
      </article>
    </div>
  )
}

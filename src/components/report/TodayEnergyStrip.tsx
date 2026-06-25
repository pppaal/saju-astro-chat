/**
 * TodayEnergyStrip — 무료 리포트(정적 명식) 아래 "오늘의 기운" 한 줄.
 * 매일 바뀌는 결정론 메시지(일진 × 내 일간)라, 한 번 보고 끝인 명식 리포트에
 * 다시 들어올 이유(재방문 훅)를 더한다. 서버 컴포넌트(순수 계산, LLM 0).
 *
 * 날짜는 KST 기준(한국 사용자 "오늘"과 어긋나지 않게 UTC+9 보정). 푸시 알림과
 * 같은 buildDailyFortuneMessage 를 재사용해 문구가 갈라지지 않는다.
 */

import { buildDailyFortuneMessage } from '@/lib/push/dailyFortuneMessage'

const GOLD = '#a9833b'

export default function TodayEnergyStrip({
  birthDate,
  lang,
}: {
  birthDate: string
  lang: 'ko' | 'en'
}) {
  // KST 보정 — getUTC* 가 한국 벽시계 날짜를 읽도록 +9h.
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const msg = buildDailyFortuneMessage({ birthDate, date: kst, locale: lang })
  const label =
    lang === 'ko'
      ? `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일`
      : kst.toISOString().slice(0, 10)

  return (
    <div style={{ maxWidth: 660, margin: '4px auto 0', padding: '0 20px' }}>
      <div
        style={{
          borderRadius: 14,
          border: '1px solid rgba(169,131,59,0.3)',
          background: 'rgba(212,181,114,0.1)',
          padding: '13px 16px',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: GOLD,
          }}
        >
          🌙 {lang === 'ko' ? '오늘의 기운' : "Today's energy"} · {label}
        </span>
        <p
          style={{
            margin: '5px 0 0',
            fontSize: 14.5,
            lineHeight: 1.65,
            color: '#4a453d',
            wordBreak: 'keep-all',
          }}
        >
          {msg.body}
        </p>
      </div>
    </div>
  )
}

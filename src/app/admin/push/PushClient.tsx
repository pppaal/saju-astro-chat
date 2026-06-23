'use client'

// 푸시 진단 콘솔 — "알림이 안 와요"의 원인을 세 칸(설정/구독/크론)으로 좁히고,
// 이 브라우저에서 알림을 켜고, 본인에게 테스트를 즉시 쏴 본다.

import { useCallback, useEffect, useState } from 'react'
import { subscribeToDailyFortunePush } from '@/lib/push/subscribe'

interface MySub {
  id: string
  locale: string
  lastSentAt: string | null
  failCount: number
  createdAt: string
}
interface Diagnostics {
  vapidConfigured: boolean
  cronSecretSet: boolean
  subscriptions: { total: number; active: number }
  mine: MySub[]
}

function Row({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-stone-100 py-3 last:border-0">
      <div>
        <p className="text-sm font-medium text-stone-800">{label}</p>
        {detail ? <p className="mt-0.5 text-xs text-stone-500">{detail}</p> : null}
      </div>
      <span
        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
        }`}
      >
        {ok ? 'OK' : '확인 필요'}
      </span>
    </div>
  )
}

export default function PushClient() {
  const [diag, setDiag] = useState<Diagnostics | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/push', { cache: 'no-store' })
      const json = (await res.json().catch(() => null)) as { data?: Diagnostics } | null
      setDiag(json?.data ?? null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const enable = async () => {
    setBusy('enable')
    setMsg(null)
    try {
      const result = await subscribeToDailyFortunePush('ko')
      const map: Record<string, string> = {
        subscribed: '이 브라우저에서 알림을 켰어요. 이제 테스트를 보내보세요.',
        denied: '브라우저가 알림을 차단했어요. 사이트 권한에서 알림을 허용해주세요.',
        unsupported:
          '이 브라우저는 웹푸시를 지원하지 않아요. (iOS는 홈 화면에 설치한 PWA에서만 가능)',
        not_configured: 'VAPID 키가 설정되지 않았어요(서버 환경변수 확인).',
        error: '서비스워커 준비가 안 됐어요. 페이지를 새로고침한 뒤 다시 눌러주세요.',
      }
      setMsg(map[result.status] ?? result.status)
      await load()
    } finally {
      setBusy(null)
    }
  }

  const sendTest = async () => {
    setBusy('test')
    setMsg(null)
    try {
      const res = await fetch('/api/admin/push', { method: 'POST' })
      const json = (await res.json().catch(() => null)) as {
        data?: { summary?: { sent: number; failed: number; pruned: number } }
        error?: { message?: string }
      } | null
      if (!res.ok) {
        const code = json?.error?.message || 'error'
        const map: Record<string, string> = {
          no_subscription:
            '이 계정에 등록된 구독이 없어요. 먼저 “이 브라우저에서 알림 켜기”를 누르세요.',
          vapid_not_configured: 'VAPID 키가 설정되지 않았어요(서버 환경변수 확인).',
        }
        setMsg(map[code] ?? `발송 실패: ${code}`)
        return
      }
      const s = json?.data?.summary
      setMsg(
        s
          ? `발송 완료 — 성공 ${s.sent} · 실패 ${s.failed} · 정리 ${s.pruned}. 알림이 떴는지 확인하세요.`
          : '발송 요청됨.'
      )
      await load()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-900">푸시 진단</h1>
        <p className="mt-1 text-sm text-stone-500">
          알림이 안 오면 아래 세 가지(설정·구독·크론) 중 하나가 끊긴 거예요. 켜고, 본인에게 테스트를
          보내 확인하세요.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-stone-400">불러오는 중…</div>
      ) : !diag ? (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          진단 정보를 불러오지 못했어요.
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <Row
              ok={diag.vapidConfigured}
              label="① VAPID 키 설정"
              detail={
                diag.vapidConfigured
                  ? '서버 푸시 키가 설정됨'
                  : 'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT 환경변수가 필요해요'
              }
            />
            <Row
              ok={diag.mine.length > 0}
              label="② 내 브라우저 구독"
              detail={
                diag.mine.length > 0
                  ? `이 계정에 구독 ${diag.mine.length}개 (마지막 발송: ${
                      diag.mine[0].lastSentAt
                        ? new Date(diag.mine[0].lastSentAt).toLocaleString('ko-KR')
                        : '없음'
                    })`
                  : '이 계정엔 구독이 없어요 — 아래에서 알림을 켜세요 (가장 흔한 원인)'
              }
            />
            <Row
              ok={diag.cronSecretSet}
              label="③ 크론 시크릿"
              detail={
                diag.cronSecretSet
                  ? '일일 자동 발송용 CRON_SECRET 설정됨'
                  : 'CRON_SECRET 미설정 — 자동(매일) 발송이 동작하지 않아요'
              }
            />
            <div className="mt-3 text-xs text-stone-500">
              전체 구독 {diag.subscriptions.total}개 · 활성 {diag.subscriptions.active}개
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void enable()}
              disabled={busy !== null}
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
            >
              {busy === 'enable' ? '켜는 중…' : '이 브라우저에서 알림 켜기'}
            </button>
            <button
              type="button"
              onClick={() => void sendTest()}
              disabled={busy !== null || diag.mine.length === 0}
              className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {busy === 'test' ? '발송 중…' : '나에게 테스트 발송'}
            </button>
          </div>

          {msg ? (
            <div className="mt-4 rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">
              {msg}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

'use client'

// 자동화 상태 표 — 각 자동화의 on/partial/off 와 이유를 운영 런타임 기준으로 표시.

import { useEffect, useState } from 'react'

type Health = 'on' | 'partial' | 'off'
interface AutomationStatus {
  id: string
  label: string
  kind: 'cron' | 'webhook' | 'manual'
  schedule?: string
  health: Health
  detail: string
}

const HEALTH_STYLE: Record<Health, string> = {
  on: 'bg-emerald-100 text-emerald-800',
  partial: 'bg-amber-100 text-amber-800',
  off: 'bg-stone-200 text-stone-600',
}
const HEALTH_LABEL: Record<Health, string> = { on: '켜짐', partial: '부분', off: '꺼짐' }
const KIND_LABEL: Record<AutomationStatus['kind'], string> = {
  cron: '정기',
  webhook: '이벤트',
  manual: '반자동',
}

export default function AutomationClient() {
  const [rows, setRows] = useState<AutomationStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/admin/automation-status', { cache: 'no-store' })
        const json = (await res.json().catch(() => null)) as {
          data?: { automations?: AutomationStatus[] }
        } | null
        setRows(json?.data?.automations ?? [])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const counts = rows.reduce(
    (a, r) => ({ ...a, [r.health]: (a[r.health] ?? 0) + 1 }),
    {} as Record<Health, number>
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-900">자동화 상태</h1>
        <p className="mt-1 text-sm text-stone-500">
          각 자동화가 지금 운영에서 실제로 켜졌는지(런타임 설정 기준)예요. 비밀값은 표시하지 않아요.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-stone-400">불러오는 중…</div>
      ) : (
        <>
          <div className="mb-4 flex gap-2 text-xs">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-800">
              켜짐 {counts.on ?? 0}
            </span>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-800">
              부분 {counts.partial ?? 0}
            </span>
            <span className="rounded-full bg-stone-200 px-2.5 py-1 font-medium text-stone-600">
              꺼짐 {counts.off ?? 0}
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-medium">자동화</th>
                  <th className="px-4 py-3 font-medium">유형</th>
                  <th className="px-4 py-3 font-medium">주기</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 font-medium">설명</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-stone-800">{r.label}</td>
                    <td className="px-4 py-3 text-stone-500">{KIND_LABEL[r.kind]}</td>
                    <td className="px-4 py-3 text-stone-500">{r.schedule ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${HEALTH_STYLE[r.health]}`}
                      >
                        {HEALTH_LABEL[r.health]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-600">{r.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-stone-400">
            “부분”은 핵심은 동작하나 일부 기능이 키 미설정으로 빠진 상태예요. 푸시 세부 진단은
            모니터링 › 푸시 진단에서.
          </p>
        </>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'

interface AutopostResponse {
  posted?: boolean
  dryRun?: boolean
  slug?: string
  text?: string
  externalId?: string
  reason?: string
  credsConfigured?: boolean
}

const REASON_LABEL: Record<string, string> = {
  no_base_url: '사이트 URL(NEXT_PUBLIC_SITE_URL) 미설정',
  no_new_post: '아직 안 올린 새 글이 없음',
  not_configured: 'Threads 토큰 미설정 (THREADS_USER_ID / THREADS_ACCESS_TOKEN)',
  create_failed: '게시 컨테이너 생성 실패 (토큰/권한 확인)',
  publish_failed: '게시 단계 실패 (토큰/권한 확인)',
  error: '알 수 없는 오류',
}

export default function SocialClient() {
  const [loading, setLoading] = useState<'preview' | 'post' | null>(null)
  const [result, setResult] = useState<AutopostResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [force, setForce] = useState(false)

  const run = async (mode: 'preview' | 'post') => {
    setLoading(mode)
    setError(null)
    setResult(null)
    try {
      const qs = new URLSearchParams()
      if (mode === 'preview') qs.set('dryRun', '1')
      if (force) qs.set('force', '1')
      const res = await fetch(`/api/admin/social/test-post?${qs.toString()}`, {
        method: 'POST',
        cache: 'no-store',
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || '요청 실패')
        return
      }
      setResult((json?.data ?? json) as AutopostResponse)
    } catch (e) {
      setError(e instanceof Error ? e.message : '네트워크 오류')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="text-lg font-semibold text-stone-900">Threads 자동게시</h1>
      <p className="mt-1 text-sm text-stone-500">
        매일 아침, 아직 안 올린 최신 블로그 글 1편을 Threads 에 자동으로 올립니다. 아래 버튼으로
        지금 바로 미리보기·게시할 수 있습니다.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => run('preview')}
          disabled={loading !== null}
          className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-50 disabled:opacity-50"
        >
          {loading === 'preview' ? '불러오는 중…' : '미리보기'}
        </button>
        <button
          onClick={() => run('post')}
          disabled={loading !== null}
          className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-50"
        >
          {loading === 'post' ? '게시 중…' : '지금 올리기'}
        </button>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
          이미 올린 글도 강제로 (테스트용)
        </label>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 text-sm">
          {result.posted ? (
            <div className="text-green-700">
              ✅ 게시 완료 — <span className="font-mono">{result.slug}</span>
              {result.externalId && (
                <span className="text-stone-500"> (id: {result.externalId})</span>
              )}
            </div>
          ) : result.dryRun ? (
            <div>
              <div className="mb-2 text-stone-500">
                미리보기 — 글: <span className="font-mono text-stone-700">{result.slug}</span> ·
                토큰: {result.credsConfigured ? '설정됨 ✅' : '미설정 ⚠️'}
              </div>
              <pre className="whitespace-pre-wrap rounded-lg bg-stone-50 p-4 text-[13px] text-stone-800">
                {result.text}
              </pre>
            </div>
          ) : (
            <div className="text-amber-700">
              게시되지 않음 — {REASON_LABEL[result.reason ?? ''] ?? result.reason}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

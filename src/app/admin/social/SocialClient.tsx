'use client'

// 소셜 초안 검토 콘솔 — 날짜별 초안을 불러와 플랫폼별로 편집/복사/승인/반려.
// 발행 어댑터(Meta/YouTube API)는 키 확보 후 연결 — 그 전까진 "복사"로 수동
// 게시하고 승인 상태만 기록한다(승인 큐 = 발행 대기열).

import { useCallback, useEffect, useState } from 'react'
import type {
  SocialPostDraft,
  SocialVariant,
  SocialPlatform,
  SocialDraftStatus,
} from '@/lib/social/types'

interface PublishResult {
  ok: boolean
  platform: SocialPlatform
  url?: string
  error?: string
  skipped?: string
}

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  threads: 'Threads',
  youtube: 'YouTube Shorts',
}

const STATUS_STYLE: Record<SocialDraftStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-stone-200 text-stone-600',
  published: 'bg-sky-100 text-sky-800',
}
const STATUS_LABEL: Record<SocialDraftStatus, string> = {
  pending: '검토 대기',
  approved: '승인됨',
  rejected: '반려됨',
  published: '발행됨',
}

function todayKST(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export default function SocialClient() {
  const [date, setDate] = useState(todayKST())
  const [drafts, setDrafts] = useState<SocialPostDraft[]>([])
  const [dates, setDates] = useState<string[]>([])
  const [publishConfigured, setPublishConfigured] = useState<SocialPlatform[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (d: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/social/drafts?date=${d}`, { cache: 'no-store' })
      const json = (await res.json().catch(() => null)) as {
        data?: {
          drafts?: SocialPostDraft[]
          dates?: string[]
          publishConfigured?: SocialPlatform[]
        }
      } | null
      setDrafts(json?.data?.drafts ?? [])
      setDates(json?.data?.dates ?? [])
      setPublishConfigured(json?.data?.publishConfigured ?? [])
    } catch {
      setError('초안을 불러오지 못했어요.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(date)
  }, [date, load])

  const generate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/social/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      const json = (await res.json().catch(() => null)) as {
        data?: { drafts?: SocialPostDraft[] }
      } | null
      if (!res.ok) {
        setError('생성에 실패했어요 (Claude 키/네트워크 확인).')
        return
      }
      setDrafts(json?.data?.drafts ?? [])
      await load(date)
    } catch {
      setError('생성 중 오류가 발생했어요.')
    } finally {
      setGenerating(false)
    }
  }

  const persist = useCallback(
    async (id: string, patch: Partial<Pick<SocialPostDraft, 'variants' | 'status' | 'hook'>>) => {
      const res = await fetch(`/api/admin/social/drafts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, ...patch }),
      })
      const json = (await res.json().catch(() => null)) as {
        data?: { draft?: SocialPostDraft }
      } | null
      const updated = json?.data?.draft
      if (res.ok && updated) {
        setDrafts((prev) => prev.map((d) => (d.id === id ? updated : d)))
      }
    },
    [date]
  )

  const publish = useCallback(
    async (id: string): Promise<PublishResult[]> => {
      const res = await fetch(`/api/admin/social/publish/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      const json = (await res.json().catch(() => null)) as {
        data?: { draft?: SocialPostDraft; results?: PublishResult[] }
      } | null
      const updated = json?.data?.draft
      if (res.ok && updated) {
        setDrafts((prev) => prev.map((d) => (d.id === id ? updated : d)))
      }
      return json?.data?.results ?? []
    },
    [date]
  )

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">소셜 자동화</h1>
          <p className="mt-1 text-sm text-stone-500">
            매일 “오늘의 카드” 초안을 검토·편집한 뒤 승인하세요. 승인된 글은 발행 대기열이 됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={generating}
          className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-50"
        >
          {generating ? '생성 중…' : '이 날짜 초안 생성'}
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value || todayKST())}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
        />
        {dates.slice(0, 7).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDate(d)}
            className={
              d === date
                ? 'rounded-full bg-stone-900 px-3 py-1 text-xs font-medium text-white'
                : 'rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600 hover:bg-stone-200'
            }
          >
            {d.slice(5)}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="py-16 text-center text-sm text-stone-400">불러오는 중…</div>
      ) : drafts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 py-16 text-center text-sm text-stone-500">
          이 날짜의 초안이 없어요. 상단 “이 날짜 초안 생성”을 눌러 만드세요.
        </div>
      ) : (
        <div className="space-y-6">
          {drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onPersist={persist}
              onPublish={publish}
              publishConfigured={publishConfigured}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DraftCard({
  draft,
  onPersist,
  onPublish,
  publishConfigured,
}: {
  draft: SocialPostDraft
  onPersist: (
    id: string,
    patch: Partial<Pick<SocialPostDraft, 'variants' | 'status' | 'hook'>>
  ) => Promise<void>
  onPublish: (id: string) => Promise<PublishResult[]>
  publishConfigured: SocialPlatform[]
}) {
  const [variants, setVariants] = useState<SocialVariant[]>(draft.variants)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishMsg, setPublishMsg] = useState<string | null>(null)

  useEffect(() => {
    setVariants(draft.variants)
    setDirty(false)
  }, [draft.variants])

  const editCaption = (platform: SocialPlatform, caption: string) => {
    setVariants((prev) => prev.map((v) => (v.platform === platform ? { ...v, caption } : v)))
    setDirty(true)
  }

  const save = async () => {
    setSaving(true)
    await onPersist(draft.id, { variants })
    setSaving(false)
    setDirty(false)
  }

  const setStatus = (status: SocialDraftStatus) => void onPersist(draft.id, { status })

  const doPublish = async () => {
    setPublishing(true)
    setPublishMsg(null)
    const results = await onPublish(draft.id)
    setPublishing(false)
    const ok = results.filter((r) => r.ok).map((r) => r.platform)
    const failed = results.filter((r) => !r.ok && r.skipped !== 'not_configured')
    setPublishMsg(
      [
        ok.length ? `발행됨: ${ok.join(', ')}` : '',
        failed.length
          ? `실패: ${failed.map((r) => `${r.platform}(${r.error || r.skipped})`).join(', ')}`
          : '',
      ]
        .filter(Boolean)
        .join(' · ') || '발행 가능한 플랫폼이 없어요.'
    )
  }

  const fullText = (v: SocialVariant) =>
    [
      v.caption,
      v.script ? `\n\n${v.script}` : '',
      v.hashtags.length ? `\n\n${v.hashtags.join(' ')}` : '',
    ]
      .join('')
      .trim()

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={draft.cardImage}
            alt={draft.cardName}
            width={44}
            height={70}
            className="rounded-md border border-stone-200"
            style={{ transform: draft.isReversed ? 'rotate(180deg)' : 'none', objectFit: 'cover' }}
          />
          <div>
            <p className="text-sm font-semibold text-stone-900">
              {draft.cardName}
              {draft.isReversed ? ' (역방향)' : ''}
              <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-500">
                {draft.locale.toUpperCase()}
              </span>
            </p>
            {draft.hook ? <p className="mt-0.5 text-sm text-stone-500">{draft.hook}</p> : null}
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLE[draft.status]}`}
        >
          {STATUS_LABEL[draft.status]}
        </span>
      </div>

      <div className="space-y-4">
        {variants.map((v) => (
          <div key={v.platform} className="rounded-xl bg-stone-50 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">{PLATFORM_LABEL[v.platform]}</span>
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(fullText(v))}
                className="rounded-md bg-stone-200 px-2 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-300"
              >
                복사
              </button>
            </div>
            <textarea
              value={v.caption}
              onChange={(e) => editCaption(v.platform, e.target.value)}
              rows={v.platform === 'youtube' ? 3 : 4}
              className="w-full resize-y rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800"
            />
            {v.script ? (
              <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white px-3 py-2 text-xs text-stone-600">
                <span className="font-semibold text-stone-500">대본: </span>
                {v.script}
              </p>
            ) : null}
            {v.hashtags.length ? (
              <p className="mt-2 text-xs text-sky-700">{v.hashtags.join(' ')}</p>
            ) : null}
            {v.publishedUrl ? (
              <a
                href={v.publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs font-medium text-emerald-700 underline"
              >
                ✓ 발행된 게시물 보기
              </a>
            ) : v.publishError ? (
              <p className="mt-2 text-xs text-rose-600">발행 실패: {v.publishError}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {dirty ? (
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-full bg-stone-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {saving ? '저장 중…' : '편집 저장'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setStatus('approved')}
          className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
        >
          승인
        </button>
        <button
          type="button"
          onClick={() => setStatus('rejected')}
          className="rounded-full bg-stone-100 px-4 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-200"
        >
          반려
        </button>
        {publishConfigured.length > 0 ? (
          <button
            type="button"
            onClick={() => void doPublish()}
            disabled={publishing}
            className="rounded-full bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            title={`자동 발행: ${publishConfigured.join(', ')}`}
          >
            {publishing ? '발행 중…' : `자동 발행 (${publishConfigured.join(', ')})`}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setStatus('published')}
          className="rounded-full bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-500"
        >
          발행 완료 표시
        </button>
      </div>
      {publishMsg ? <p className="mt-2 text-xs text-stone-500">{publishMsg}</p> : null}
    </div>
  )
}

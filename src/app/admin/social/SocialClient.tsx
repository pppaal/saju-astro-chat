'use client'

// 소셜 콘텐츠 콘솔 — 상단 성과 대시보드(발행 수·조회수·베스트 글) + 카테고리
// 탭(타로/사주/점성/궁합/캘린더) + 날짜별 초안 검토/편집/발행. 발행된 Threads
// 게시물은 insights API 로 조회수·좋아요를 수집해 카드에 표시한다.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CATEGORY_META,
  SOCIAL_CATEGORIES,
  SOCIAL_PLATFORMS,
  draftCategory,
  type SocialCategory,
  type SocialPostDraft,
  type SocialVariant,
  type SocialPlatform,
  type SocialDraftStatus,
} from '@/lib/social/types'
import type { SocialSummary } from '@/lib/social/insights'

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

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

type CategoryFilter = SocialCategory | 'all'

export default function SocialClient() {
  const [date, setDate] = useState(todayKST())
  const [drafts, setDrafts] = useState<SocialPostDraft[]>([])
  const [dates, setDates] = useState<string[]>([])
  const [publishConfigured, setPublishConfigured] = useState<SocialPlatform[]>([])
  const [autoPublish, setAutoPublish] = useState<string[]>([])
  const [summary, setSummary] = useState<SocialSummary | null>(null)
  const [category, setCategory] = useState<CategoryFilter>('all')
  // 플랫폼 필터 — 체크된 플랫폼의 캡션만 카드에 표시 (기본: 전부).
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([...SOCIAL_PLATFORMS])
  const togglePlatform = (p: SocialPlatform) =>
    setPlatforms((prev) => {
      const next = prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
      // 전부 끄면 아무것도 안 보여 혼란 — 최소 1개는 유지.
      return next.length === 0 ? prev : next
    })
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

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
          autoPublish?: string[]
        }
      } | null
      setDrafts(json?.data?.drafts ?? [])
      setDates(json?.data?.dates ?? [])
      setPublishConfigured(json?.data?.publishConfigured ?? [])
      setAutoPublish(json?.data?.autoPublish ?? [])
    } catch {
      setError('초안을 불러오지 못했어요.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/social/insights', { cache: 'no-store' })
      const json = (await res.json().catch(() => null)) as {
        data?: { summary?: SocialSummary }
      } | null
      if (json?.data?.summary) setSummary(json.data.summary)
    } catch {
      /* 요약 실패는 치명적이지 않음 — 조용히 스킵 */
    }
  }, [])

  useEffect(() => {
    void load(date)
  }, [date, load])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  const generate = async (force = false) => {
    if (
      force &&
      !window.confirm(
        '이 날짜의 미발행 초안을 버리고 새로 생성합니다 (발행된 초안·조회수 기록은 보존). 계속할까요?'
      )
    ) {
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/social/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, ...(force ? { force: true } : {}) }),
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

  // 이 날짜의 발행된 Threads 게시물 조회수 재수집.
  const refreshInsights = async () => {
    setRefreshing(true)
    setNotice(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/social/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      const json = (await res.json().catch(() => null)) as {
        data?: { drafts?: SocialPostDraft[]; updated?: number; firstError?: string | null }
      } | null
      if (!res.ok) {
        setError('조회수 수집 실패 — THREADS_ACCESS_TOKEN 설정을 확인하세요.')
        return
      }
      if (json?.data?.drafts) setDrafts(json.data.drafts)
      const updated = json?.data?.updated ?? 0
      const firstError = json?.data?.firstError
      if (firstError) {
        setError(
          firstError.toLowerCase().includes('permission')
            ? '조회수 수집에 threads_manage_insights 권한이 필요해요 — Meta 앱에서 권한 추가 후 토큰을 재발급하세요.'
            : `일부 수집 실패: ${firstError}`
        )
      }
      setNotice(
        updated > 0 ? `게시물 ${updated}건의 조회수를 갱신했어요.` : '갱신할 발행 게시물이 없어요.'
      )
      await loadSummary()
    } finally {
      setRefreshing(false)
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

  const visibleDrafts = useMemo(
    () => (category === 'all' ? drafts : drafts.filter((d) => draftCategory(d) === category)),
    [drafts, category]
  )

  // 이 날짜에 카테고리별 초안이 몇 건인지 (탭 뱃지).
  const categoryCounts = useMemo(() => {
    const counts = new Map<SocialCategory, number>()
    for (const d of drafts) {
      const c = draftCategory(d)
      counts.set(c, (counts.get(c) || 0) + 1)
    }
    return counts
  }, [drafts])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">소셜 콘텐츠 스튜디오</h1>
          <p className="mt-1 text-sm text-stone-500">
            타로·사주·점성·궁합·캘린더 5개 버티컬 초안을 매일 자동 생성 — 검토 후 원클릭 발행, 발행
            후 조회수까지 한 화면에서.
          </p>
          {autoPublish.length > 0 ? (
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
              ⚡ 완전 자동 발행 켜짐 ({autoPublish.join(', ').toUpperCase()}) — 매일 아침 승인 없이
              게시됩니다
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refreshInsights()}
            disabled={refreshing}
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
          >
            {refreshing ? '수집 중…' : '📊 조회수 새로고침'}
          </button>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={generating}
            className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-50"
          >
            {generating ? '생성 중… (최대 30초)' : '이 날짜 초안 생성'}
          </button>
          <button
            type="button"
            onClick={() => void generate(true)}
            disabled={generating}
            title="미발행 초안을 버리고 현재 프롬프트로 새로 생성 (발행분 보존)"
            className="rounded-full border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
          >
            {generating ? '생성 중…' : '🔄 다시 생성 (덮어쓰기)'}
          </button>
        </div>
      </div>

      {/* ===== 성과 대시보드 ===== */}
      {summary ? (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="발행 게시물" value={formatCount(summary.publishedPosts)} icon="🚀" />
          <StatCard label="총 조회수" value={formatCount(summary.totalViews)} icon="👁️" />
          <StatCard label="좋아요" value={formatCount(summary.totalLikes)} icon="❤️" />
          <StatCard
            label="답글·리포스트"
            value={formatCount(summary.totalReplies + summary.totalReposts)}
            icon="💬"
          />
          {Object.keys(summary.byCategory).length > 0 ? (
            <div className="col-span-2 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm md:col-span-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                📈 카테고리별 성과 (Threads)
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                {SOCIAL_CATEGORIES.filter((c) => summary.byCategory[c]).map((c) => {
                  const b = summary.byCategory[c]
                  const avg = b.posts > 0 ? Math.round(b.views / b.posts) : 0
                  return (
                    <div key={c} className="rounded-lg bg-stone-50 px-3 py-2">
                      <p className="text-xs font-semibold text-stone-700">
                        {CATEGORY_META[c].emoji} {CATEGORY_META[c].labelKo}
                        <span className="ml-1 font-normal text-stone-400">{b.posts}건</span>
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-stone-900">
                        👁️ {formatCount(b.views)}
                        <span className="ml-1.5 text-[11px] font-medium text-stone-500">
                          평균 {formatCount(avg)}
                        </span>
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
          {summary.best ? (
            <div className="col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 md:col-span-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                🏆 베스트 게시물 — 조회수 {formatCount(summary.best.views)}
              </p>
              <p className="mt-0.5 truncate text-sm text-stone-800">
                {CATEGORY_META[summary.best.category as SocialCategory]?.emoji} {summary.best.hook}
                {summary.best.url ? (
                  <a
                    href={summary.best.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-xs font-medium text-sky-700 underline"
                  >
                    보기 ↗
                  </a>
                ) : null}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ===== 날짜 + 카테고리 탭 ===== */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
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

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <CategoryTab
          active={category === 'all'}
          onClick={() => setCategory('all')}
          label={`전체 ${drafts.length ? `(${drafts.length})` : ''}`}
        />
        {SOCIAL_CATEGORIES.map((c) => {
          const n = categoryCounts.get(c) || 0
          return (
            <CategoryTab
              key={c}
              active={category === c}
              onClick={() => setCategory(c)}
              label={`${CATEGORY_META[c].emoji} ${CATEGORY_META[c].labelKo}${n ? ` (${n})` : ''}`}
              dim={n === 0}
            />
          )
        })}
      </div>

      {/* 플랫폼 필터 — 어느 플랫폼용 캡션을 볼지 체크 (기본 전부) */}
      <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-stone-700">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
          플랫폼
        </span>
        {SOCIAL_PLATFORMS.map((p) => (
          <label key={p} className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={platforms.includes(p)}
              onChange={() => togglePlatform(p)}
              className="h-3.5 w-3.5 cursor-pointer accent-stone-900"
            />
            {PLATFORM_LABEL[p]}
          </label>
        ))}
      </div>

      {error ? (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}
      {notice ? (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      {loading ? (
        <div className="py-16 text-center text-sm text-stone-400">불러오는 중…</div>
      ) : visibleDrafts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 py-16 text-center text-sm text-stone-500">
          {drafts.length === 0
            ? '이 날짜의 초안이 없어요. 상단 "이 날짜 초안 생성"을 눌러 5개 버티컬 초안을 만드세요.'
            : '이 카테고리의 초안이 없어요. (구버전 초안은 타로로 분류됩니다)'}
        </div>
      ) : (
        <div className="space-y-6">
          {visibleDrafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onPersist={persist}
              onPublish={publish}
              publishConfigured={publishConfigured}
              visiblePlatforms={platforms}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
        {icon} {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-stone-900">{value}</p>
    </div>
  )
}

function CategoryTab({
  active,
  onClick,
  label,
  dim,
}: {
  active: boolean
  onClick: () => void
  label: string
  dim?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-full bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white'
          : `rounded-full bg-stone-100 px-3.5 py-1.5 text-xs font-medium hover:bg-stone-200 ${
              dim ? 'text-stone-400' : 'text-stone-700'
            }`
      }
    >
      {label}
    </button>
  )
}

function MetricsChips({ metrics }: { metrics: NonNullable<SocialVariant['metrics']> }) {
  const chips: Array<[string, number]> = [
    ['👁️', metrics.views],
    ['❤️', metrics.likes],
    ['💬', metrics.replies],
    ['🔁', metrics.reposts + metrics.quotes],
  ]
  return (
    <span className="ml-2 inline-flex items-center gap-2 rounded-full bg-stone-900 px-2.5 py-0.5 text-[11px] font-medium text-white">
      {chips.map(([icon, n]) => (
        <span key={icon}>
          {icon} {formatCount(n)}
        </span>
      ))}
    </span>
  )
}

function DraftCard({
  draft,
  onPersist,
  onPublish,
  publishConfigured,
  visiblePlatforms,
}: {
  draft: SocialPostDraft
  onPersist: (
    id: string,
    patch: Partial<Pick<SocialPostDraft, 'variants' | 'status' | 'hook'>>
  ) => Promise<void>
  onPublish: (id: string) => Promise<PublishResult[]>
  publishConfigured: SocialPlatform[]
  visiblePlatforms: SocialPlatform[]
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

  const cat = draftCategory(draft)
  const meta = CATEGORY_META[cat]

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
    // already_published = 재시도 시 성공분 스킵(중복 방지) — 실패가 아니다.
    const failed = results.filter(
      (r) => !r.ok && r.skipped !== 'not_configured' && r.skipped !== 'already_published'
    )
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
          {draft.cardImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.cardImage}
              alt={draft.cardName}
              width={44}
              height={70}
              className="rounded-md border border-stone-200"
              style={{
                transform: draft.isReversed ? 'rotate(180deg)' : 'none',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div className="flex h-[70px] w-[44px] items-center justify-center rounded-md border border-stone-200 bg-stone-50 text-2xl">
              {meta.emoji}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-stone-900">
              <span className="mr-1.5 rounded bg-stone-900 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                {meta.emoji} {meta.labelKo}
              </span>
              {draft.cardName}
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
        {variants
          .filter((v) => visiblePlatforms.includes(v.platform))
          .map((v) => (
            <div key={v.platform} className="rounded-xl bg-stone-50 p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">
                  {PLATFORM_LABEL[v.platform]}
                  {v.metrics ? <MetricsChips metrics={v.metrics} /> : null}
                </span>
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

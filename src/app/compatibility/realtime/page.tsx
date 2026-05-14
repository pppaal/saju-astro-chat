'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Send, Sparkles, Trash2, Users } from 'lucide-react'
import { RELATION_OPTIONS, type RelationKey } from '@/lib/compatibility/counselor'
import { runQuickCoupleTarot } from '@/lib/compatibility/counselor/runQuickCoupleTarot'
import { logger } from '@/lib/logger'

const VALID_RELATION_KEYS = new Set<RelationKey>(
  RELATION_OPTIONS.map((r) => r.key)
)
function asRelationKey(value: string | null | undefined): RelationKey {
  if (value && VALID_RELATION_KEYS.has(value as RelationKey)) return value as RelationKey
  return 'partner'
}

function normalizeGender(value: unknown): 'male' | 'female' {
  const s = String(value || '').toLowerCase()
  return s === 'female' || s === 'f' ? 'female' : 'male'
}

type PersonForm = {
  name: string
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  birthCity: string
}

const emptyPerson = (name = ''): PersonForm => ({
  name,
  birthDate: '',
  birthTime: '',
  gender: 'female',
  birthCity: '',
})

type ChatMessage = { role: 'user' | 'assistant'; content: string }

interface QuotaState {
  mode: 'guest' | 'free' | 'paid'
  freeRemaining: number
  freeLimit: number
  paidRemaining: number
}

export default function CompatibilityRealtimePage() {
  const searchParams = useSearchParams()
  const circlePersonId = searchParams.get('circlePersonId')

  const [personA, setPersonA] = useState<PersonForm>(emptyPerson(''))
  const [personB, setPersonB] = useState<PersonForm>(emptyPerson(''))
  const [relation, setRelation] = useState<RelationKey>('partner')
  const [relationNote, setRelationNote] = useState('')

  const [prefilling, setPrefilling] = useState(Boolean(circlePersonId))
  const [prefillError, setPrefillError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [missingLocation, setMissingLocation] = useState<string[]>([])
  const [streaming, setStreaming] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [quotaBlock, setQuotaBlock] = useState<{ reason: string; message: string } | null>(null)
  const [quota, setQuota] = useState<QuotaState | null>(null)

  // Saju + astro raw responses, prefetched after chat starts so the Quick
  // Couple Tarot button can stream a 5-card reading inline.
  const [person1Saju, setPerson1Saju] = useState<Record<string, unknown> | null>(null)
  const [person2Saju, setPerson2Saju] = useState<Record<string, unknown> | null>(null)
  const [person1Astro, setPerson1Astro] = useState<Record<string, unknown> | null>(null)
  const [person2Astro, setPerson2Astro] = useState<Record<string, unknown> | null>(null)

  const refreshQuota = async () => {
    try {
      const res = await fetch('/api/compatibility/realtime/quota', { cache: 'no-store' })
      if (res.ok) {
        const data = (await res.json()) as QuotaState
        setQuota(data)
      }
    } catch {
      // best-effort — counter just hides
    }
  }

  useEffect(() => {
    void refreshQuota()
  }, [])

  // Prefill from a "saved person" card click on /profile.
  // The URL carries `circlePersonId`; we hydrate Partner B from that and
  // Partner A from the user's own profile, then auto-start the chat.
  useEffect(() => {
    if (!circlePersonId) return
    let cancelled = false
    const load = async () => {
      try {
        const [profileRes, circleRes] = await Promise.all([
          fetch('/api/me/profile', { cache: 'no-store' }).then((r) =>
            r.ok ? r.json() : null
          ),
          fetch('/api/me/circle?limit=100', { cache: 'no-store' }).then((r) =>
            r.ok ? r.json() : null
          ),
        ])
        if (cancelled) return

        const meRaw = profileRes?.user
        const peopleRaw = circleRes?.data?.people || circleRes?.people || []
        const target = (peopleRaw as Array<Record<string, unknown>>).find(
          (p) => p.id === circlePersonId
        )

        if (!target || !target.birthDate) {
          setPrefillError('이 인연은 생년월일이 비어있어 상담을 시작할 수 없어요.')
          setPrefilling(false)
          return
        }
        if (!meRaw?.birthDate) {
          setPrefillError(
            '내 사주 정보가 없어요. 프로필에서 먼저 입력해주세요.'
          )
          setPrefilling(false)
          return
        }

        const prefilledA: PersonForm = {
          name: String(meRaw.name || '나'),
          birthDate: String(meRaw.birthDate),
          birthTime: String(meRaw.birthTime || ''),
          gender: normalizeGender(meRaw.gender),
          birthCity: String(meRaw.birthCity || ''),
        }
        const prefilledB: PersonForm = {
          name: String(target.name || '상대'),
          birthDate: String(target.birthDate || ''),
          birthTime: String(target.birthTime || ''),
          gender: normalizeGender(target.gender),
          birthCity: String(target.birthCity || ''),
        }
        const prefilledRel = asRelationKey(
          typeof target.relation === 'string' ? target.relation : null
        )
        setPersonA(prefilledA)
        setPersonB(prefilledB)
        setRelation(prefilledRel)
        setPrefilling(false)
        // Open chat immediately with the prefilled values (we pass them
        // explicitly so we don't depend on async state propagation).
        await startSession(prefilledA, prefilledB, prefilledRel, '')
      } catch {
        setPrefillError('인연 정보를 불러오지 못했어요.')
        setPrefilling(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circlePersonId])

  const canStart = useMemo(() => {
    return (
      personA.name.trim().length > 0 &&
      personB.name.trim().length > 0 &&
      /^\d{4}-\d{2}-\d{2}$/.test(personA.birthDate) &&
      /^\d{4}-\d{2}-\d{2}$/.test(personB.birthDate)
    )
  }, [personA, personB])

  const scrollRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, streaming])

  const send = async (firstTurn: boolean, contentOverride?: string) => {
    const userContent = firstTurn ? '__start__' : (contentOverride ?? input).trim()
    if (!userContent || streaming) return

    const nextMessages: ChatMessage[] = firstTurn
      ? [{ role: 'user', content: '__start__' }]
      : [...messages, { role: 'user', content: userContent }]
    setMessages(nextMessages)
    setInput('')
    setStreaming(true)
    setError(null)
    setQuotaBlock(null)

    try {
      const res = await fetch('/api/compatibility/realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personA: toApiPerson(personA),
          personB: toApiPerson(personB),
          relation,
          relationNote: relationNote.trim() || null,
          messages: nextMessages,
          sessionId,
        }),
      })

      if (res.status === 402) {
        const payload = (await res.json().catch(() => null)) as {
          reason?: string
          message?: string
        } | null
        setQuotaBlock({
          reason: payload?.reason || 'no_credits',
          message:
            payload?.message ||
            (payload?.reason === 'login_required'
              ? '이 기기에선 무료 상담을 다 쓰셨어요. 로그인하면 2회 더 무료예요.'
              : '무료 상담을 모두 쓰셨어요. 크레딧 1개로 한 번 더 이어갈 수 있어요.'),
        })
        setStreaming(false)
        return
      }

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '')
        setError(`서버 오류: ${res.status} ${text.slice(0, 120)}`)
        setStreaming(false)
        return
      }

      // Append a placeholder assistant message and stream into it.
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let assistantBuf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let idx
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const block = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          const dataLine = block.split('\n').find((l) => l.startsWith('data: '))
          if (!dataLine) continue
          const json = dataLine.slice(6).trim()
          try {
            const event = JSON.parse(json) as {
              type?: string
              missingLocation?: string[]
              content?: string
              done?: boolean
            }
            if (event.type === 'meta' && Array.isArray(event.missingLocation)) {
              setMissingLocation(event.missingLocation)
              continue
            }
            if (event.content) {
              assistantBuf += event.content
              setMessages((prev) => {
                const next = [...prev]
                const last = next[next.length - 1]
                if (last && last.role === 'assistant') {
                  next[next.length - 1] = { ...last, content: assistantBuf }
                }
                return next
              })
            }
            if (event.done) break
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setStreaming(false)
      // Refresh quota counter so the user sees the new remaining count.
      void refreshQuota()
    }
  }

  const startSession = async (
    a: PersonForm,
    b: PersonForm,
    rel: RelationKey,
    note: string
  ) => {
    setStarted(true)

    // Fire-and-forget prefetch of saju + astrology so the Quick Couple Tarot
    // button has the data ready when the user clicks it. We don't await —
    // the tarot button shows a disabled state until both land.
    void prefetchCouplePayload(a, b)

    // Try to fetch or create a persistent session (logged-in users only).
    // Guests fall through with sessionId=null and start fresh.
    let resumed = false
    try {
      const res = await fetch('/api/compatibility/realtime/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personA: toApiPerson(a),
          personB: toApiPerson(b),
          relation: rel,
          relationNote: note.trim() || null,
        }),
      })
      if (res.ok) {
        const data = (await res.json()) as {
          sessionId: string | null
          messages: Array<{ role: 'user' | 'assistant'; content: string }>
          isResumed: boolean
        }
        if (data.sessionId) setSessionId(data.sessionId)
        if (data.isResumed && data.messages.length > 0) {
          setMessages(data.messages.map((m) => ({ role: m.role, content: m.content })))
          resumed = true
        }
      }
    } catch {
      // Continue without persistence — falls back to ephemeral chat
    }

    if (!resumed) {
      void send(true)
    }
  }

  const handleStart = async () => {
    if (!canStart || streaming) return
    await startSession(personA, personB, relation, relationNote)
  }

  const prefetchCouplePayload = async (a: PersonForm, b: PersonForm) => {
    const buildSajuBody = (p: PersonForm) => ({
      date: p.birthDate,
      time: p.birthTime || '00:00',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    })
    const buildAstroBody = (p: PersonForm) => ({
      date: p.birthDate,
      time: p.birthTime || '00:00',
      latitude: 37.5665,
      longitude: 126.978,
    })
    const fire = async (
      url: string,
      body: Record<string, unknown>
    ): Promise<Record<string, unknown> | null> => {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) return null
        return (await res.json()) as Record<string, unknown>
      } catch {
        return null
      }
    }
    const [s1, s2, a1, a2] = await Promise.all([
      fire('/api/saju', buildSajuBody(a)),
      fire('/api/saju', buildSajuBody(b)),
      fire('/api/astrology', buildAstroBody(a)),
      fire('/api/astrology', buildAstroBody(b)),
    ])
    setPerson1Saju(s1)
    setPerson2Saju(s2)
    setPerson1Astro(a1)
    setPerson2Astro(a2)
  }

  const tarotReady = Boolean(person1Saju && person2Saju && person1Astro && person2Astro)
  const [tarotPending, setTarotPending] = useState(false)

  const handleQuickCoupleTarot = async () => {
    if (!tarotReady || tarotPending || streaming) return
    setTarotPending(true)
    const userBubble: ChatMessage = { role: 'user', content: '둘 궁합 타로 5장 펼쳐줘' }
    setMessages((prev) => [...prev, userBubble, { role: 'assistant', content: '' }])
    try {
      const { markdown } = await runQuickCoupleTarot({
        persons: [
          { name: personA.name, date: personA.birthDate, time: personA.birthTime || '00:00', city: personA.birthCity },
          { name: personB.name, date: personB.birthDate, time: personB.birthTime || '00:00', city: personB.birthCity },
        ],
        person1Saju,
        person2Saju,
        person1Astro,
        person2Astro,
        language: 'ko',
        onChunk: (partial) => {
          setMessages((prev) => {
            const copy = [...prev]
            const lastIdx = copy.length - 1
            if (lastIdx >= 0 && copy[lastIdx].role === 'assistant') {
              copy[lastIdx] = { role: 'assistant', content: partial }
            }
            return copy
          })
        },
      })
      setMessages((prev) => {
        const copy = [...prev]
        const lastIdx = copy.length - 1
        if (lastIdx >= 0 && copy[lastIdx].role === 'assistant') {
          copy[lastIdx] = { role: 'assistant', content: markdown }
        }
        return copy
      })
    } catch (err) {
      logger.warn('[compat/realtime] quick couple tarot failed', err)
      setMessages((prev) => {
        const copy = [...prev]
        const lastIdx = copy.length - 1
        if (lastIdx >= 0 && copy[lastIdx].role === 'assistant' && !copy[lastIdx].content) {
          copy.pop()
        }
        return copy
      })
      setError('타로 카드를 펼치지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setTarotPending(false)
    }
  }

  const handleSend = (e?: FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || streaming) return
    void send(false)
  }

  const handleDeleteSession = async () => {
    if (!sessionId) return
    if (!window.confirm('이 대화를 삭제할까요? 되돌릴 수 없어요.')) return
    try {
      await fetch(`/api/compatibility/realtime/session?id=${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
      })
    } catch {
      // best-effort
    }
    // Reset back to the setup form regardless of server outcome.
    setSessionId(null)
    setMessages([])
    setStarted(false)
    setQuotaBlock(null)
  }

  const handleQuickChip = (text: string) => {
    if (streaming) return
    void send(false, text)
  }

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-[#03060d] text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-[-180px] h-[420px] w-[420px] rounded-full bg-gradient-to-br from-violet-500/16 to-fuchsia-500/0 blur-3xl" />
        <div className="absolute bottom-[-220px] right-[-110px] h-[460px] w-[460px] rounded-full bg-gradient-to-br from-cyan-400/14 to-blue-500/0 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(18,28,44,0.52)_0%,rgba(3,6,13,0.96)_58%,rgba(3,6,13,1)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-2xl flex-col px-5 pt-20 pb-6 sm:px-6">
        <header className="mb-6 flex items-center gap-2">
          <Users size={18} className="text-violet-300" />
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-200/70">
            궁합 카운슬러
          </span>
        </header>

        {prefilling ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            <Sparkles size={16} className="mr-2 animate-pulse text-violet-300" />
            인연 정보를 불러오는 중...
          </div>
        ) : prefillError ? (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5 text-[13px] text-amber-100">
            <p className="leading-relaxed">{prefillError}</p>
            <Link
              href="/profile"
              className="mt-3 inline-block rounded-xl bg-violet-500 px-4 py-2 text-[13px] font-semibold text-white"
            >
              프로필로 이동
            </Link>
          </div>
        ) : !started ? (
          <SetupForm
            personA={personA}
            personB={personB}
            setPersonA={setPersonA}
            setPersonB={setPersonB}
            relation={relation}
            setRelation={setRelation}
            relationNote={relationNote}
            setRelationNote={setRelationNote}
            canStart={canStart}
            onStart={handleStart}
            quota={quota}
          />
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[12px] text-slate-300">
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-white">
                  {personA.name} × {personB.name}
                </span>{' '}
                <span className="text-slate-500">·</span>{' '}
                <span className="text-violet-300">
                  {RELATION_OPTIONS.find((r) => r.key === relation)?.label}
                </span>
                {missingLocation.length > 0 && (
                  <p className="mt-1 text-[11px] text-amber-300/80">
                    ⚠ 출생지 미상: {missingLocation.join(', ')} — 위치 기반 결론은 제외돼요.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <QuotaBadge quota={quota} />
                {sessionId && (
                  <button
                    type="button"
                    onClick={handleDeleteSession}
                    className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                    aria-label="이 대화 삭제"
                    title="이 대화 삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-md"
            >
              {messages
                .filter((m) => !(m.role === 'user' && m.content === '__start__'))
                .map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-violet-500/20 text-white'
                          : 'bg-white/[0.05] text-slate-100'
                      }`}
                    >
                      {m.content || (streaming ? '…' : '')}
                    </div>
                  </motion.div>
                ))}
              {streaming && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-white/[0.05] px-4 py-2.5 text-[14px] text-slate-400">
                    <span className="inline-block animate-pulse">…</span>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <p className="mt-2 text-xs text-red-400">{error}</p>
            )}

            {quotaBlock && (
              <div className="mt-3 rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4 text-[13px] text-violet-100">
                <p className="leading-relaxed">{quotaBlock.message}</p>
                <div className="mt-3 flex gap-2">
                  {quotaBlock.reason === 'login_required' ? (
                    <Link
                      href="/auth/signin"
                      className="rounded-xl bg-gradient-to-tr from-violet-500 to-fuchsia-500 px-4 py-2 text-[13px] font-semibold text-white shadow"
                    >
                      로그인하기
                    </Link>
                  ) : (
                    <Link
                      href="/pricing"
                      className="rounded-xl bg-gradient-to-tr from-violet-500 to-fuchsia-500 px-4 py-2 text-[13px] font-semibold text-white shadow"
                    >
                      크레딧 충전
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => setQuotaBlock(null)}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] text-slate-300 hover:bg-white/[0.08]"
                  >
                    닫기
                  </button>
                </div>
              </div>
            )}

            {messages.length >= 2 && !streaming && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {getQuickChips(relation).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleQuickChip(q)}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-slate-300 transition hover:bg-white/[0.08]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={handleQuickCoupleTarot}
                disabled={!tarotReady || tarotPending || streaming}
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-gradient-to-r from-indigo-500/15 to-violet-500/20 px-4 py-1.5 text-[12px] font-medium text-violet-100 shadow-[0_0_18px_rgba(99,102,241,0.18)] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                title="두 사람 관계를 5장 관계 크로스로 즉시 봐요"
              >
                <span>🎴</span>
                {tarotPending ? '카드를 펼치는 중...' : '둘 궁합 타로 즉시 보기'}
              </button>
            </div>

            <form
              onSubmit={handleSend}
              className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 backdrop-blur-md"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={streaming ? '답변을 작성하는 중...' : '궁금한 점을 물어보세요'}
                disabled={streaming}
                className="flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="rounded-xl bg-violet-500 p-2 text-white transition hover:bg-violet-600 disabled:opacity-40"
                aria-label="보내기"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

function toApiPerson(p: PersonForm) {
  return {
    name: p.name.trim(),
    birthDate: p.birthDate,
    birthTime: p.birthTime || '00:00',
    gender: p.gender,
    birthCity: p.birthCity.trim() || null,
    latitude: null,
    longitude: null,
    tzId: null,
  }
}

function getQuickChips(relation: RelationKey): string[] {
  const romanticChips = ['끌림과 케미는?', '갈등 포인트는?', '결혼·장기 약속은?', '만나기 좋은 시기는?']
  const platonicChips = ['함께하는 결은?', '마찰 줄이는 길은?', '신뢰의 자리는?', '도움이 되는 흐름은?']
  const opt = RELATION_OPTIONS.find((r) => r.key === relation)
  return opt?.romantic ? romanticChips : platonicChips
}

function SetupForm({
  personA,
  personB,
  setPersonA,
  setPersonB,
  relation,
  setRelation,
  relationNote,
  setRelationNote,
  canStart,
  onStart,
  quota,
}: {
  personA: PersonForm
  personB: PersonForm
  setPersonA: (p: PersonForm) => void
  setPersonB: (p: PersonForm) => void
  relation: RelationKey
  setRelation: (k: RelationKey) => void
  relationNote: string
  setRelationNote: (s: string) => void
  canStart: boolean
  onStart: () => void
  quota: QuotaState | null
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={14} className="text-violet-300" />
          <h1 className="text-sm font-bold text-white">두 분의 정보</h1>
        </div>
        <p className="mb-4 text-[12px] text-slate-400">
          사주와 점성 raw 데이터를 옆에 두고 실시간으로 상담해드려요. 점수는 따로 매기지 않아요.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PersonBlock label="Partner A" person={personA} setPerson={setPersonA} />
          <PersonBlock label="Partner B" person={personB} setPerson={setPersonB} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
        <h2 className="mb-3 text-sm font-bold text-white">관계</h2>
        <div className="flex flex-wrap gap-1.5">
          {RELATION_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setRelation(opt.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                relation === opt.key
                  ? 'bg-violet-500 text-white'
                  : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <textarea
          value={relationNote}
          onChange={(e) => setRelationNote(e.target.value)}
          maxLength={200}
          placeholder="관계 메모 (선택) — 예: 초딩때부터 베프, 결혼 5년차"
          className="mt-3 h-16 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white outline-none ring-violet-400/40 placeholder:text-slate-500 focus:ring-2"
        />
      </div>

      <div className="space-y-2">
        {quota && (
          <p className="text-center text-[11px] text-slate-400">
            {quota.freeRemaining > 0
              ? `남은 무료 답변 ${quota.freeRemaining}/${quota.freeLimit}`
              : quota.mode === 'guest'
                ? '무료 답변을 다 쓰셨어요. 로그인하면 2회 더 무료예요.'
                : `보유 크레딧 ${quota.paidRemaining}개 — 답변마다 1개씩 차감돼요.`}
          </p>
        )}
        <button
          type="button"
          onClick={onStart}
          disabled={!canStart}
          className="w-full rounded-2xl bg-[linear-gradient(135deg,#7c5cff_0%,#9b7fff_100%)] py-3 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(124,92,255,0.35)] transition hover:opacity-90 disabled:opacity-40"
        >
          상담 시작
        </button>
      </div>
    </div>
  )
}

function QuotaBadge({ quota }: { quota: QuotaState | null }) {
  if (!quota) return null
  const isFree = quota.freeRemaining > 0
  if (isFree) {
    return (
      <div className="shrink-0 rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-violet-200">
        무료 {quota.freeRemaining}/{quota.freeLimit}
      </div>
    )
  }
  if (quota.mode === 'guest') {
    return (
      <div className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-amber-200">
        로그인 필요
      </div>
    )
  }
  return (
    <div className="shrink-0 rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-fuchsia-200">
      크레딧 {quota.paidRemaining}
    </div>
  )
}

function PersonBlock({
  label,
  person,
  setPerson,
}: {
  label: string
  person: PersonForm
  setPerson: (p: PersonForm) => void
}) {
  return (
    <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <input
        type="text"
        value={person.name}
        onChange={(e) => setPerson({ ...person, name: e.target.value })}
        placeholder="이름"
        maxLength={50}
        className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white outline-none ring-violet-400/40 placeholder:text-slate-500 focus:ring-2"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={person.birthDate}
          onChange={(e) => setPerson({ ...person, birthDate: e.target.value })}
          min="1900-01-01"
          max="2100-12-31"
          className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-[13px] text-white outline-none ring-violet-400/40 [color-scheme:dark] focus:ring-2"
        />
        <input
          type="time"
          value={person.birthTime}
          onChange={(e) => setPerson({ ...person, birthTime: e.target.value })}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-[13px] text-white outline-none ring-violet-400/40 [color-scheme:dark] focus:ring-2"
        />
      </div>
      <div className="flex gap-2">
        {(['female', 'male'] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setPerson({ ...person, gender: g })}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[12px] font-medium transition-colors ${
              person.gender === g
                ? 'bg-violet-500 text-white'
                : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]'
            }`}
          >
            {g === 'female' ? '여' : '남'}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={person.birthCity}
        onChange={(e) => setPerson({ ...person, birthCity: e.target.value })}
        placeholder="출생 도시 (선택)"
        maxLength={120}
        className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white outline-none ring-violet-400/40 placeholder:text-slate-500 focus:ring-2"
      />
    </div>
  )
}

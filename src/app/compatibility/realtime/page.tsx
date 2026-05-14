'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Send, Sparkles, Users } from 'lucide-react'
import { RELATION_OPTIONS, type RelationKey } from '@/lib/compatibility/counselor'

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

export default function CompatibilityRealtimePage() {
  const [personA, setPersonA] = useState<PersonForm>(emptyPerson(''))
  const [personB, setPersonB] = useState<PersonForm>(emptyPerson(''))
  const [relation, setRelation] = useState<RelationKey>('partner')
  const [relationNote, setRelationNote] = useState('')

  const [started, setStarted] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [missingLocation, setMissingLocation] = useState<string[]>([])
  const [streaming, setStreaming] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [quotaBlock, setQuotaBlock] = useState<{ reason: string; message: string } | null>(null)

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
    }
  }

  const handleStart = () => {
    if (!canStart || streaming) return
    setStarted(true)
    void send(true)
  }

  const handleSend = (e?: FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || streaming) return
    void send(false)
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
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-violet-300" />
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-200/70">
              궁합 카운슬러
            </span>
          </div>
          <Link
            href="/compatibility"
            className="text-xs text-slate-400 transition-colors hover:text-violet-200"
          >
            기존 궁합 →
          </Link>
        </header>

        {!started ? (
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
          />
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[12px] text-slate-300">
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

            <form
              onSubmit={handleSend}
              className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 backdrop-blur-md"
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

      <button
        type="button"
        onClick={onStart}
        disabled={!canStart}
        className="w-full rounded-2xl bg-[linear-gradient(135deg,#7c5cff_0%,#9b7fff_100%)] py-3 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(124,92,255,0.35)] transition hover:opacity-90 disabled:opacity-40"
      >
        상담 시작
      </button>
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

'use client'

// 타로 서비스 메인페이지 — 채팅 스타일 (하단 입력 + 덱/스프레드 모달)
// 우리 코드베이스의 DECK_STYLE_INFO + tarotThemes 와 직접 연결.

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Send,
  Layers,
  X,
  MoonStar,
  ChevronRight,
  ChevronDown,
  Plus,
  Check,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '@/i18n/I18nProvider'
import { DECK_STYLES, DECK_STYLE_INFO, type DeckStyle } from '@/lib/tarot/tarot.types'
import { tarotThemes } from '@/lib/tarot/tarot-spreads-data'
import type { Spread } from '@/lib/tarot/tarot.types'
import {
  getStoredBirthInfo,
  buildBirthQuery,
  type StoredBirthInfo,
} from '@/app/(main)/birthInfoStorage'

// 카테고리(테마) 안의 모든 spread 를 flat 하게 펼침 — chip 1개로 선택
const ALL_SPREADS: Array<{ spread: Spread; categoryKo: string; categoryId: string }> = []
for (const theme of tarotThemes) {
  for (const s of theme.spreads) {
    ALL_SPREADS.push({ spread: s, categoryKo: theme.categoryKo ?? theme.category, categoryId: theme.id })
  }
}

const DEFAULT_DECK: DeckStyle = DECK_STYLES[0] // celestial
const DEFAULT_SPREAD = ALL_SPREADS.find((s) => s.spread.id === 'past-present-future') ?? ALL_SPREADS[0]

export default function TarotChatScreen() {
  const router = useRouter()
  const { locale } = useI18n()
  const isKo = locale === 'ko'

  const [question, setQuestion] = useState('')
  const [selectedDeck, setSelectedDeck] = useState<DeckStyle>(DEFAULT_DECK)
  const [selectedSpread, setSelectedSpread] = useState(DEFAULT_SPREAD)
  const [includeSaju, setIncludeSaju] = useState(true)
  const [includeAstrology, setIncludeAstrology] = useState(true)
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false)
  const [isSpreadModalOpen, setIsSpreadModalOpen] = useState(false)
  const [isAddonsOpen, setIsAddonsOpen] = useState(false)
  const [expandedSpreadId, setExpandedSpreadId] = useState<string | null>(null)
  const [birthInfo, setBirthInfo] = useState<StoredBirthInfo | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const addonsRef = useRef<HTMLDivElement>(null)

  // 홈에서 저장된 생년월일을 끌어와 타로 결과 페이지로 propagate. URL params
  // 가 있으면 그것을 우선 (홈 chip → tarot chip 경로), 없으면 localStorage
  // fallback (직접 /tarot 진입 케이스).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    const qBirthDate = sp.get('birthDate')
    if (qBirthDate) {
      const qBirthTime = sp.get('birthTime') || '12:00'
      const qGenderRaw = (sp.get('gender') || 'M').toUpperCase()
      const gender = qGenderRaw === 'F' || qGenderRaw === 'FEMALE' ? 'female' : 'male'
      setBirthInfo({
        birthDate: qBirthDate,
        birthTime: qBirthTime,
        birthTimeUnknown: sp.get('birthTimeUnknown') === '1' || qBirthTime === '00:00',
        gender,
        city: sp.get('birthCity') || sp.get('city') || undefined,
        savedAt: new Date().toISOString(),
      })
      return
    }
    setBirthInfo(getStoredBirthInfo())
  }, [])

  // addons 팝오버 바깥 클릭 시 닫기
  useEffect(() => {
    if (!isAddonsOpen) return
    const onClick = (e: MouseEvent) => {
      if (addonsRef.current && !addonsRef.current.contains(e.target as Node)) {
        setIsAddonsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [isAddonsOpen])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // 덱 모달 열릴 때 1초 lag 해결 — 페이지 로드 직후 6개 덱 backImage 를 미리 prefetch
  useEffect(() => {
    if (typeof window === 'undefined') return
    DECK_STYLES.forEach((id) => {
      const img = new window.Image()
      img.src = DECK_STYLE_INFO[id].backImage
    })
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    const q = encodeURIComponent(question.trim())
    const sajuQ = includeSaju ? '' : '&saju=0'
    const astroQ = includeAstrology ? '' : '&astro=0'
    // birthInfo가 있으면 결과 페이지로 전달해 saju/astro cross에 즉시 쓸 수 있게.
    const birthQ = birthInfo ? `&${buildBirthQuery(birthInfo)}` : ''
    const path = `/tarot/${selectedSpread.categoryId}/${selectedSpread.spread.id}?question=${q}&deck=${selectedDeck}${sajuQ}${astroQ}${birthQ}`
    router.push(path)
  }

  const deckInfo = DECK_STYLE_INFO[selectedDeck]
  const spreadTitle = isKo
    ? selectedSpread.spread.titleKo ?? selectedSpread.spread.title
    : selectedSpread.spread.title

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex justify-center items-center">
        <div className="w-96 h-96 bg-indigo-900 rounded-full blur-3xl opacity-20"></div>
      </div>

      {/* 메인 — 환영 영역 + 예시 질문 */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 pb-44 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-4 w-full max-w-xl"
        >
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-indigo-500/10 rounded-full border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
              <MoonStar className="w-12 h-12 text-indigo-400" />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-100">
            {isKo ? '타로 마스터가 기다리고 있습니다' : 'The Tarot Master Awaits'}
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-md mx-auto">
            {isKo
              ? '하단 입력창에 고민을 적어주세요.\n선택하신 덱과 스프레드에 맞춰 카드를 펼칩니다.'
              : 'Type your question below.\nThe cards will be drawn from your selected deck and spread.'}
          </p>

          {/* 홈에서 입력한 생일 정보가 있으면 cross context 적용된다고 알려주기 */}
          {birthInfo && (
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-300">
                ✓ {birthInfo.birthDate} {birthInfo.birthTime} ·{' '}
                {birthInfo.gender === 'male' ? (isKo ? '남성' : 'Male') : isKo ? '여성' : 'Female'}
              </span>
            </div>
          )}

          {/* 예시 질문 chip — 클릭하면 textarea 에 채워서 첫 사용자 ramp-up */}
          {question.trim().length === 0 && (
            <div className="pt-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">
                {isKo ? '이런 걸 물어볼 수 있어요' : 'Try asking'}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {(isKo
                  ? ['오늘 컨디션 어때?', '그 사람 마음이 궁금해', '이직해도 될까?', '내일 어떻게 보낼까?']
                  : [
                      'How is my day looking?',
                      "What's on their mind?",
                      'Should I switch jobs?',
                      'How should I spend tomorrow?',
                    ]
                ).map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => {
                      setQuestion(sample)
                      setTimeout(() => {
                        textareaRef.current?.focus()
                        textareaRef.current?.setSelectionRange(sample.length, sample.length)
                      }, 50)
                    }}
                    className="px-3 py-1.5 rounded-full bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-slate-100 transition-colors"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* 하단 입력창 */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        <div className="max-w-3xl mx-auto p-3 md:p-4 flex flex-col gap-3">
          {/* 덱·스프레드 chips + 추가(+) 버튼 */}
          <div className="flex items-center gap-2 px-1 overflow-x-auto">
            <button
              onClick={() => setIsDeckModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-xs text-slate-300 transition-colors whitespace-nowrap"
            >
              <Layers className="w-3.5 h-3.5" style={{ color: deckInfo.accent }} />
              <span>{isKo ? deckInfo.nameKo : deckInfo.name}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </button>

            <button
              onClick={() => setIsSpreadModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-xs text-slate-300 transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {spreadTitle} ({selectedSpread.spread.cardCount})
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </button>

            {/* + 추가 — 사주·점성 cross 단일 토글 (한 박스 안에서 둘 다 ON/OFF) */}
            <div className="relative" ref={addonsRef}>
              <button
                type="button"
                onClick={() => setIsAddonsOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={isAddonsOpen}
                title={isKo ? '사주·점성 cross 추가' : 'Add Saju × Astrology cross'}
                className={`flex items-center gap-1 px-3 py-1.5 border rounded-full text-xs transition-colors whitespace-nowrap ${
                  includeSaju && includeAstrology
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-100'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-slate-100'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                {isKo ? '추가' : 'Add'}
                {includeSaju && includeAstrology && (
                  <Check className="w-3 h-3 text-indigo-200" />
                )}
              </button>

              {isAddonsOpen && (
                <div
                  className="absolute bottom-full mb-3 right-0 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 p-3 z-30"
                  role="dialog"
                  aria-label={isKo ? '사주·점성 cross 추가' : 'Saju × Astrology cross add-on'}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={includeSaju && includeAstrology}
                    onClick={() => {
                      const next = !(includeSaju && includeAstrology)
                      setIncludeSaju(next)
                      setIncludeAstrology(next)
                    }}
                    className="w-full flex items-start gap-3 px-2 py-2.5 rounded-xl hover:bg-slate-800/60 transition-colors text-left"
                  >
                    <span
                      className={`flex items-center justify-center w-6 h-6 rounded-md border-2 shrink-0 mt-0.5 transition-colors ${
                        includeSaju && includeAstrology
                          ? 'bg-indigo-500 border-indigo-400 text-white'
                          : 'bg-slate-950 border-slate-500 text-transparent'
                      }`}
                    >
                      <Check className="w-4 h-4" strokeWidth={3} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-slate-100">
                        {isKo ? '사주 · 점성 cross 추가' : 'Add Saju × Astrology cross'}
                      </span>
                      <span className="block text-[11px] text-slate-400 leading-snug mt-0.5">
                        {isKo
                          ? '내 사주 · 점성 흐름을 카드 해석에 같이 엮습니다'
                          : 'Weaves your saju & astrology flow into the card reading'}
                      </span>
                    </span>
                  </button>
                  <p className="px-2 pt-1 text-[10px] text-slate-500 leading-tight">
                    {isKo
                      ? '로그인 + 생년월일이 있어야 cross 해석이 적용돼요'
                      : 'Sign in + birthday required for cross reading'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 텍스트 입력 + 전송 */}
          <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={isKo ? '어떤 고민이 있으신가요?' : 'What is on your mind?'}
              className="w-full bg-slate-800 border border-slate-700 focus:border-indigo-500 rounded-2xl p-4 pr-14 text-slate-100 placeholder-slate-500 resize-none outline-none text-base min-h-16 max-h-32 transition-colors"
              rows={1}
            />
            <button
              type="submit"
              disabled={!question.trim()}
              className={`absolute right-2 bottom-2 p-2 rounded-xl transition-all ${
                question.trim()
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
              aria-label="Send"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* 덱 선택 모달 — 우리 8개 덱 (celestial · classic · cyber · egyptian · elegant · ethereal · sacred · minimal) */}
      <AnimatePresence>
        {isDeckModalOpen && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[10005] bg-slate-950 flex flex-col"
          >
            <div className="flex items-center justify-between gap-3 px-4 pl-16 pt-[max(env(safe-area-inset-top),1rem)] pb-4 border-b border-slate-800 bg-slate-900/50">
              <h2 className="text-lg font-semibold flex items-center gap-2 min-w-0">
                <Layers className="w-5 h-5 text-indigo-400 shrink-0" />
                <span className="truncate">{isKo ? '타로 덱 선택' : 'Choose a Deck'}</span>
              </h2>
              <button
                onClick={() => setIsDeckModalOpen(false)}
                className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4">
                {DECK_STYLES.map((id) => {
                  const info = DECK_STYLE_INFO[id]
                  const selected = selectedDeck === id
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setSelectedDeck(id)
                        setIsDeckModalOpen(false)
                        setTimeout(() => textareaRef.current?.focus(), 100)
                      }}
                      className={`flex flex-col items-center text-center p-3 rounded-2xl border transition-all ${
                        selected
                          ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                          : 'border-slate-800 hover:border-slate-600'
                      }`}
                      style={{ background: info.gradient }}
                    >
                      <div className="relative w-24 h-36 md:w-28 md:h-44 rounded-lg overflow-hidden mb-3 ring-1 ring-white/10">
                        <Image
                          src={info.backImage}
                          alt={info.name}
                          fill
                          sizes="(max-width: 768px) 30vw, 15vw"
                          className="object-cover"
                          priority
                          loading="eager"
                        />
                      </div>
                      <span
                        className="text-sm font-medium mb-1"
                        style={{ color: selected ? info.accent : '#e2e8f0' }}
                      >
                        {isKo ? info.nameKo : info.name}
                      </span>
                      <span className="text-[11px] text-slate-400 line-clamp-2 leading-tight">
                        {isKo ? info.descriptionKo : info.description}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 스프레드 선택 모달 — 카테고리별 grouping */}
      <AnimatePresence>
        {isSpreadModalOpen && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[10005] bg-slate-950 flex flex-col"
          >
            <div className="flex items-center justify-between gap-3 px-4 pl-16 pt-[max(env(safe-area-inset-top),1rem)] pb-4 border-b border-slate-800 bg-slate-900/50">
              <h2 className="text-lg font-semibold flex items-center gap-2 min-w-0">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="truncate">{isKo ? '스프레드 선택' : 'Choose a Spread'}</span>
              </h2>
              <button
                onClick={() => setIsSpreadModalOpen(false)}
                className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="max-w-3xl mx-auto space-y-6">
                {tarotThemes.map((theme) => (
                  <div key={theme.id}>
                    <h3 className="text-sm font-semibold text-amber-400/90 mb-2 px-1">
                      {isKo ? theme.categoryKo : theme.category}
                    </h3>
                    <ul className="rounded-2xl bg-slate-900 border border-slate-800 divide-y divide-slate-800 overflow-hidden">
                      {theme.spreads.map((sp) => {
                        const selected = selectedSpread.spread.id === sp.id
                        const expanded = expandedSpreadId === sp.id
                        const title = isKo ? sp.titleKo ?? sp.title : sp.title
                        const desc = isKo ? sp.descriptionKo ?? sp.description : sp.description
                        return (
                          <li key={sp.id} className={selected ? 'bg-amber-500/5' : ''}>
                            <div className="flex items-center gap-2 px-3 py-2.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSpread({
                                    spread: sp,
                                    categoryKo: theme.categoryKo ?? theme.category,
                                    categoryId: theme.id,
                                  })
                                  setIsSpreadModalOpen(false)
                                  setTimeout(() => textareaRef.current?.focus(), 100)
                                }}
                                className="flex-1 flex items-center gap-3 text-left min-w-0"
                              >
                                <span
                                  className={`inline-flex items-center justify-center min-w-12 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${
                                    selected
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                                  }`}
                                >
                                  {sp.cardCount}장
                                </span>
                                <span
                                  className={`truncate text-[15px] font-medium ${
                                    selected ? 'text-amber-300' : 'text-slate-100'
                                  }`}
                                >
                                  {title}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setExpandedSpreadId(expanded ? null : sp.id)
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/60 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-400 transition-colors whitespace-nowrap"
                                aria-expanded={expanded}
                                aria-label={isKo ? '자세히 보기' : 'See details'}
                              >
                                {isKo ? '자세히' : 'Details'}
                                <ChevronDown
                                  className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
                                />
                              </button>
                            </div>
                            <AnimatePresence initial={false}>
                              {expanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-4 pb-4 pt-1 space-y-3 bg-slate-900/40">
                                    <p className="text-sm text-slate-300 leading-relaxed">{desc}</p>
                                    {sp.positions?.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5">
                                        {sp.positions.map((pos, i) => (
                                          <span
                                            key={i}
                                            className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-slate-400"
                                          >
                                            {i + 1}. {isKo ? pos.titleKo ?? pos.title : pos.title}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedSpread({
                                          spread: sp,
                                          categoryKo: theme.categoryKo ?? theme.category,
                                          categoryId: theme.id,
                                        })
                                        setIsSpreadModalOpen(false)
                                        setTimeout(() => textareaRef.current?.focus(), 100)
                                      }}
                                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-xs font-medium transition-colors"
                                    >
                                      {isKo ? '이걸로 시작하기' : 'Start with this'}
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

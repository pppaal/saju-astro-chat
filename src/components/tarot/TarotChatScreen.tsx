'use client'

// 타로 서비스 메인페이지 — 채팅 스타일 (하단 입력 + 덱/스프레드 모달)
// 우리 코드베이스의 DECK_STYLE_INFO + tarotThemes 와 직접 연결.

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Sparkles, Send, Layers, X, MoonStar, ChevronRight, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '@/i18n/I18nProvider'
import {
  DECK_STYLES,
  DECK_STYLE_INFO,
  getCardImagePath,
  type DeckStyle,
} from '@/lib/tarot/tarot.types'
import { tarotThemes, tarotCreditCostFor } from '@/lib/tarot/tarot-spreads-data'
import type { Spread } from '@/lib/tarot/tarot.types'

// 카테고리(테마) 안의 모든 spread 를 flat 하게 펼침 — chip 1개로 선택
const ALL_SPREADS: Array<{ spread: Spread; categoryKo: string; categoryId: string }> = []
for (const theme of tarotThemes) {
  for (const s of theme.spreads) {
    ALL_SPREADS.push({
      spread: s,
      categoryKo: theme.categoryKo ?? theme.category,
      categoryId: theme.id,
    })
  }
}

const DEFAULT_DECK: DeckStyle = DECK_STYLES[0] // celestial
const DEFAULT_SPREAD =
  ALL_SPREADS.find((s) => s.spread.id === 'past-present-future') ?? ALL_SPREADS[0]

export default function TarotChatScreen() {
  const router = useRouter()
  const { locale } = useI18n()
  const isKo = locale === 'ko'

  const [question, setQuestion] = useState('')
  const [selectedDeck, setSelectedDeck] = useState<DeckStyle>(DEFAULT_DECK)
  const [selectedSpread, setSelectedSpread] = useState(DEFAULT_SPREAD)
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false)
  const [isSpreadModalOpen, setIsSpreadModalOpen] = useState(false)
  const [expandedSpreadId, setExpandedSpreadId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // 덱 뒷면 8장 — 마운트 즉시 프리로드. 작은 이미지(각 ~30KB)라
  // 부담 없고, 모달을 빨리 열어도 천체의 빛(기본 덱) 등이 그제서
  // 로드되며 ~1초 lag 가 생기던 문제를 없앤다. (idle 로 미루면 모달이
  // 먼저 열려 캐시 미스 발생)
  useEffect(() => {
    if (typeof window === 'undefined') return
    DECK_STYLES.forEach((id) => {
      const img = new window.Image()
      img.src = DECK_STYLE_INFO[id].backImage
    })
  }, [])

  // 78장 카드 앞면 (결과 화면 첫 진입 1-2초 lag 방지) — 무거우므로
  // requestIdleCallback 으로 메인 thread 안 막고 백그라운드 처리.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const prefetch = () => {
      // 0..77 카드 ID 전체. getCardImagePath 가 webp 경로 반환.
      for (let cardId = 0; cardId < 78; cardId++) {
        const img = new window.Image()
        img.src = getCardImagePath(cardId, selectedDeck)
      }
    }
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(prefetch, { timeout: 2000 })
      return () => window.cancelIdleCallback?.(handle)
    }
    const t = window.setTimeout(prefetch, 400)
    return () => window.clearTimeout(t)
  }, [selectedDeck])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    const q = encodeURIComponent(question.trim())
    // birthInfo 는 더 이상 타로 cross 에 쓰이지 않음 — 순수 타로만 읽음.
    const path = `/tarot/${selectedSpread.categoryId}/${selectedSpread.spread.id}?question=${q}&deck=${selectedDeck}`
    router.push(path)
  }

  const deckInfo = DECK_STYLE_INFO[selectedDeck]
  const spreadTitle = isKo
    ? (selectedSpread.spread.titleKo ?? selectedSpread.spread.title)
    : selectedSpread.spread.title

  return (
    <div className="relative min-h-screen bg-[#07091a] text-slate-100 font-sans flex flex-col">
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

          {/* 선택한 덱·스프레드 카드백 부채꼴 미리보기 — 빈 공간을 채우고
              현재 선택(덱/카드 수)을 시각화. 덱·스프레드 바꾸면 실시간 갱신. */}
          <div className="pt-6 flex flex-col items-center gap-2.5">
            <div className="relative h-36 w-full max-w-xs mx-auto" aria-hidden>
              {Array.from({ length: Math.min(selectedSpread.spread.cardCount, 5) }).map(
                (_, i, arr) => {
                  const n = arr.length
                  const mid = (n - 1) / 2
                  const rot = (i - mid) * 7
                  const tx = (i - mid) * 24
                  const ty = Math.abs(i - mid) * 5
                  return (
                    <div
                      key={i}
                      className="absolute left-1/2 top-3 w-16 h-24 md:w-20 md:h-32 rounded-lg overflow-hidden ring-1 ring-white/15 shadow-xl shadow-black/40"
                      style={{
                        transform: `translateX(calc(-50% + ${tx}px)) translateY(${ty}px) rotate(${rot}deg)`,
                        zIndex: 10 - Math.abs(i - mid),
                      }}
                    >
                      <Image
                        src={deckInfo.backImage}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                  )
                }
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {isKo
                ? `${deckInfo.nameKo} · ${spreadTitle} ${selectedSpread.spread.cardCount}장 준비됨`
                : `${deckInfo.name} · ${spreadTitle} (${selectedSpread.spread.cardCount})`}
            </p>
          </div>
        </motion.div>
      </div>

      {/* 하단 입력창 */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        <div className="max-w-3xl mx-auto p-3 md:p-4 flex flex-col gap-3">
          {/* 덱·카드 매수 chips */}
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
          </div>

          {/* 텍스트 입력 + 전송 */}
          <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={isKo ? '어떤 고민이 있으신가요?' : 'What is on your mind?'}
              className="w-full bg-slate-800 border border-slate-700 focus:border-[#d4b572] rounded-2xl p-4 pr-14 text-slate-100 placeholder-slate-500 resize-none outline-none text-base min-h-16 max-h-32 transition-colors"
              rows={1}
            />
            <button
              type="submit"
              disabled={!question.trim()}
              className={`absolute right-2 bottom-2 p-2 rounded-xl transition-all ${
                question.trim()
                  ? 'bg-[#d4b572] hover:bg-[#e8cc8a] text-[#1c1917] shadow-lg shadow-[rgba(212,181,114,0.25)]'
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
            className="fixed inset-0 z-[10005] bg-[#07091a] flex flex-col"
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
                          ? 'border-[#d4b572] shadow-[0_0_20px_rgba(212,181,114,0.3)]'
                          : 'border-slate-800 hover:border-slate-600'
                      }`}
                      style={{ background: info.gradient }}
                    >
                      <div className="relative w-24 h-36 md:w-28 md:h-44 rounded-lg overflow-hidden mb-3 ring-1 ring-white/10">
                        <Image
                          src={info.backImage}
                          alt={info.name}
                          fill
                          // 컨테이너가 w-24 (96px) md:w-28 (112px) 로 고정 — sizes 도
                          // 그에 맞춰 줘야 next/image 가 적정 해상도 소스를 고른다
                          // (이전 30vw/15vw 는 모바일 풀폭 가정이라 768px 에서 ~230px
                          // 짜리 소스를 받아 2배 낭비).
                          sizes="(max-width: 768px) 96px, 112px"
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
            className="fixed inset-0 z-[10005] bg-[#07091a] flex flex-col"
          >
            <div className="flex items-center justify-between gap-3 px-4 pl-16 pt-[max(env(safe-area-inset-top),1rem)] pb-4 border-b border-slate-800 bg-slate-900/50">
              <h2 className="text-lg font-semibold flex items-center gap-2 min-w-0">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="truncate">{isKo ? '카드 매수 선택' : 'Choose Card Count'}</span>
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
                    <ul className="rounded-2xl bg-slate-900 border border-slate-800 divide-y divide-slate-800 overflow-hidden">
                      {theme.spreads.map((sp) => {
                        const selected = selectedSpread.spread.id === sp.id
                        const expanded = expandedSpreadId === sp.id
                        const title = isKo ? (sp.titleKo ?? sp.title) : sp.title
                        const desc = isKo ? (sp.descriptionKo ?? sp.description) : sp.description
                        const cost = tarotCreditCostFor(sp.cardCount)
                        const costLabel = isKo
                          ? `${cost} 크레딧`
                          : `${cost} ${cost === 1 ? 'credit' : 'credits'}`
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
                                  {isKo
                                    ? `${sp.cardCount}장`
                                    : `${sp.cardCount} ${sp.cardCount === 1 ? 'Card' : 'Cards'}`}
                                </span>
                                <span className="flex min-w-0 flex-1 items-baseline gap-2">
                                  <span
                                    className={`truncate text-[15px] font-medium ${
                                      selected ? 'text-amber-300' : 'text-slate-100'
                                    }`}
                                  >
                                    {title}
                                  </span>
                                  <span
                                    className={`shrink-0 text-[11px] tracking-wide ${
                                      selected ? 'text-amber-300/80' : 'text-slate-400'
                                    }`}
                                  >
                                    · {costLabel}
                                  </span>
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
                                    {/* 자리(positions) 라벨은 LLM 이 사용자
                                        질문 맥락에 맞춰 직접 명명 — 고정
                                        라벨 미리보기 제거됨. */}
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

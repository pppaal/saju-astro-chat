'use client'

// 타로 서비스 메인페이지 — 채팅 스타일 (하단 입력 + 덱/스프레드 모달)
// 우리 코드베이스의 DECK_STYLE_INFO + tarotThemes 와 직접 연결.

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Sparkles, Send, Layers, X, MoonStar, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '@/i18n/I18nProvider'
import { DECK_STYLES, DECK_STYLE_INFO, type DeckStyle } from '@/lib/tarot/tarot.types'
import { tarotThemes } from '@/lib/tarot/tarot-spreads-data'
import type { Spread } from '@/lib/tarot/tarot.types'

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
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false)
  const [isSpreadModalOpen, setIsSpreadModalOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    const q = encodeURIComponent(question.trim())
    const path = `/tarot/${selectedSpread.categoryId}/${selectedSpread.spread.id}?topic=${q}&deck=${selectedDeck}`
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

      {/* 메인 — 환영 영역 */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 pb-44 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-4"
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
        </motion.div>
      </div>

      {/* 하단 입력창 */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        <div className="max-w-3xl mx-auto p-3 md:p-4 flex flex-col gap-3">
          {/* 덱·스프레드 chips */}
          <div className="flex items-center gap-2 px-1 overflow-x-auto">
            <button
              onClick={() => setIsDeckModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-xs text-slate-300 transition-colors whitespace-nowrap"
            >
              <Layers className="w-3.5 h-3.5" style={{ color: deckInfo.accent }} />
              <span className="truncate max-w-28">{isKo ? deckInfo.nameKo : deckInfo.name}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </button>

            <button
              onClick={() => setIsSpreadModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-xs text-slate-300 transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="truncate max-w-36">
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
            className="fixed inset-0 z-50 bg-slate-950 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                {isKo ? '타로 덱 선택' : 'Choose a Deck'}
              </h2>
              <button
                onClick={() => setIsDeckModalOpen(false)}
                className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"
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
            className="fixed inset-0 z-50 bg-slate-950 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                {isKo ? '스프레드(배열법) 선택' : 'Choose a Spread'}
              </h2>
              <button
                onClick={() => setIsSpreadModalOpen(false)}
                className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {theme.spreads.map((sp) => {
                        const selected = selectedSpread.spread.id === sp.id
                        return (
                          <button
                            key={sp.id}
                            onClick={() => {
                              setSelectedSpread({
                                spread: sp,
                                categoryKo: theme.categoryKo ?? theme.category,
                                categoryId: theme.id,
                              })
                              setIsSpreadModalOpen(false)
                              setTimeout(() => textareaRef.current?.focus(), 100)
                            }}
                            className={`flex flex-col text-left p-4 rounded-2xl border transition-all ${
                              selected
                                ? 'bg-amber-500/10 border-amber-500/50'
                                : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className={`text-base font-medium ${
                                  selected ? 'text-amber-400' : 'text-slate-200'
                                }`}
                              >
                                {isKo ? sp.titleKo ?? sp.title : sp.title}
                              </span>
                              <span className="text-[11px] text-slate-500 ml-2 whitespace-nowrap">
                                {sp.cardCount}장
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 leading-snug">
                              {isKo ? sp.descriptionKo ?? sp.description : sp.description}
                            </span>
                          </button>
                        )
                      })}
                    </div>
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

'use client'

// 타로 서비스 메인페이지 — 공용 AppShell 위에 타로 골드 톤 + 덱·스프레드
// 콘텐츠가 얹힌 구조. 셸(cosmic backdrop / AppHeader / MenuDrawerPanel /
// body 컨테이너)은 AppShell 이 책임지고, 페이지는 액센트 레이어(골드 후광)
// 와 본문(히어로 + ChatInputArea + 모달)만 신경쓴다.

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Sparkles, Layers, X, MoonStar, ChevronRight, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '@/i18n/I18nProvider'
import { apiFetch } from '@/lib/api'
import { savePendingChat, loadPendingChat, clearPendingChat } from '@/lib/chat/pendingChat'
import {
  DECK_STYLES,
  DECK_STYLE_INFO,
  getCardImagePath,
  type DeckStyle,
} from '@/lib/tarot/tarot.types'
import { tarotThemes, tarotCreditCostFor } from '@/lib/tarot/tarot-spreads-data'
import type { Spread } from '@/lib/tarot/tarot.types'
import { AppShell } from '@/components/ui/AppShell'
import { ChatInputArea } from '@/components/destiny-map/chat-panels'

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

const DEFAULT_DECK: DeckStyle = DECK_STYLES[0]
const DEFAULT_SPREAD =
  ALL_SPREADS.find((s) => s.spread.id === 'past-present-future') ?? ALL_SPREADS[0]

// 유도 질문(추천 질문) — 입력창 위 가로 스크롤 칩. 클릭 = 그 질문으로 바로
// 리딩 시작. 빈 입력창 앞에서 멈칫하는 사용자를 첫 리딩까지 한 번에 데려간다.
const SEED_QUESTIONS: Array<{ ko: string; en: string }> = [
  { ko: '헤어진 그 사람, 다시 연락 올까요?', en: 'Will my ex reach out again?' },
  { ko: '지금 이 사람과 잘 될 수 있을까요?', en: 'Will it work out with this person?' },
  { ko: '썸 타는 그 사람 속마음이 궁금해요', en: 'What are they really feeling about me?' },
  { ko: '이직, 지금이 타이밍일까요?', en: 'Is now the time to change jobs?' },
  { ko: '이번 달 금전운은 어떤가요?', en: "How's my money luck this month?" },
  { ko: '고민 중인 이 선택, 어디로 가야 할까요?', en: 'Which way on this choice?' },
  { ko: '올해 나에게 올 가장 큰 변화는?', en: 'My biggest change this year?' },
  { ko: '지금 내 연애운 흐름은?', en: "Where's my love life headed?" },
]

// 타로 페이지의 골드 후광 — AppShell 의 accentLayer 슬롯으로 주입. 부모
// 컨테이너가 absolute inset-0/overflow-hidden/pointer-events-none 을 이미
// 잡아주므로 안쪽은 flex 가운데 정렬만 신경쓰면 된다.
function TarotGoldHalo() {
  return (
    <div className="flex justify-center items-center w-full h-full">
      <div className="w-96 h-96 bg-[#a07a3c] rounded-full blur-3xl opacity-20" />
    </div>
  )
}

export default function TarotChatScreen() {
  const router = useRouter()
  const { status: authStatus } = useSession()
  const { locale } = useI18n()
  const isKo = locale === 'ko'
  // 로그인 후 복귀 시 직전에 물어본 리딩을 자동으로 이어가기 위한 1회 가드.
  const tarotResumeDoneRef = useRef(false)

  const [question, setQuestion] = useState('')
  const [selectedDeck, setSelectedDeck] = useState<DeckStyle>(DEFAULT_DECK)
  const [selectedSpread, setSelectedSpread] = useState(DEFAULT_SPREAD)
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false)
  const [isSpreadModalOpen, setIsSpreadModalOpen] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const optionsRef = useRef<HTMLDivElement>(null)
  const [expandedSpreadId, setExpandedSpreadId] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  // 덱·스프레드 칩 팝오버 — 바깥 클릭/Esc 로 닫기.
  useEffect(() => {
    if (!optionsOpen) return
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setOptionsOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOptionsOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [optionsOpen])

  // 덱 뒷면 8장 — 마운트 즉시 프리로드.
  useEffect(() => {
    if (typeof window === 'undefined') return
    DECK_STYLES.forEach((id) => {
      const img = new window.Image()
      img.src = DECK_STYLE_INFO[id].backImage
    })
  }, [])

  // 78장 카드 앞면 — idle 시 백그라운드 프리페치.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const prefetch = () => {
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

  // 실제 리딩 시작 로직 — 질문을 *명시 인자* 로 받는다. 입력창 전송과 추천
  // 칩이 같은 경로를 타되, handleSend 는 인자 없이(이벤트 무시) 호출되고 칩은
  // startReading(질문) 으로 호출한다. (이전 회귀: handleSend 가 질문을 첫 인자로
  // 받게 바꿨더니 ChatInputArea 의 onClick={onSend} 가 넘기는 이벤트가 질문 자리에
  // 들어가 .trim() 에서 터졌음 → 그 구멍을 닫기 위해 분리.)
  const startReading = async (rawQuestion: string) => {
    const q0 = rawQuestion.trim()
    if (!q0 || isChecking) return
    setIsChecking(true)
    try {
      const res = await apiFetch('/api/tarot/prefetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedSpread.categoryId,
          spreadId: selectedSpread.spread.id,
        }),
      })
      if (!res.ok) {
        // 401 = 비로그인 → apiFetch 가 전역 로그인 모달을 띄운다. 이때 질문/덱/
        // 스프레드를 저장해 두면, 로그인(풀 리로드) 후 아래 restore effect 가
        // 같은 리딩을 autostart 로 자동 이어간다. 안 그러면 question 은 state 라
        // 리로드 때 날아가 사용자가 처음부터 다시 골라야 한다.
        if (res.status === 401) {
          savePendingChat('tarot', {
            question: q0,
            deck: selectedDeck,
            categoryId: selectedSpread.categoryId,
            spreadId: selectedSpread.spread.id,
          })
        }
        setIsChecking(false)
        return
      }
    } catch {
      // prefetch 실패는 차단 사유 아님 — reading 단계에서 재게이팅.
    }

    const q = encodeURIComponent(q0)
    const path = `/tarot/${selectedSpread.categoryId}/${selectedSpread.spread.id}?question=${q}&deck=${selectedDeck}`
    router.push(path)
    // isChecking 은 라우트 전환 후 페이지 언마운트되며 자연 해제.
  }

  // 입력창 전송 — 인자 없음(onSend/onClick 이벤트는 무시). 현재 입력값으로 시작.
  const handleSend = () => {
    void startReading(question)
  }

  // 로그인 후 복귀 — 401 로 막히기 직전 저장해둔 질문/덱/스프레드가 있으면,
  // 인증이 확인되는 즉시 리딩 페이지로 자동 이동(autostart=1)해 "물어본 게
  // 바로 이어지게" 한다. 1회만 실행하고 draft 는 즉시 정리.
  useEffect(() => {
    if (tarotResumeDoneRef.current) return
    if (authStatus !== 'authenticated') return
    const draft = loadPendingChat<{
      question: string
      deck: string
      categoryId: string
      spreadId: string
    }>('tarot')
    if (!draft?.question || !draft.categoryId || !draft.spreadId) return
    tarotResumeDoneRef.current = true
    clearPendingChat('tarot')
    const q = encodeURIComponent(draft.question.trim())
    router.push(
      `/tarot/${draft.categoryId}/${draft.spreadId}?question=${q}&deck=${draft.deck || DEFAULT_DECK}&autostart=1`
    )
  }, [authStatus, router])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter → submit. Shift+Enter → newline. IME 한글 조합 중 skip.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault()
      if (question.trim()) void handleSend()
    }
  }

  const deckInfo = DECK_STYLE_INFO[selectedDeck]
  const spreadTitle = isKo
    ? (selectedSpread.spread.titleKo ?? selectedSpread.spread.title)
    : selectedSpread.spread.title

  return (
    <>
      <AppShell accentLayer={<TarotGoldHalo />}>
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-center space-y-4 w-full max-w-xl"
          >
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-[rgba(212,181,114,0.1)] rounded-full border border-[rgba(212,181,114,0.2)] shadow-[0_0_30px_rgba(212,181,114,0.2)]">
                <MoonStar className="w-12 h-12 text-[#d4b572]" />
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-100">
              {isKo ? '타로 마스터가 기다리고 있습니다' : 'The Tarot Master Awaits'}
            </h1>
            <p className="text-sm text-slate-400">
              {isKo
                ? '아래에서 덱과 스프레드를 골라 질문을 입력하세요'
                : 'Pick a deck and spread below, then type your question'}
            </p>

            <div className="pt-6 flex flex-col items-center gap-2.5">
              {/* z-0: 카드 인라인 zIndex(8~10)를 이 컨테이너 stacking context 안에
                  가둬, 위로 열리는 덱·스프레드 메뉴(입력창 z-index:6 안)가 카드에
                  가려지지 않게 한다. */}
              <div className="relative z-0 h-36 w-full max-w-xs mx-auto" aria-hidden>
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

        {/* 유도 질문 칩 — 입력창 바로 위. 한 줄 가로 스크롤이라 카드 일러스트와
            겹치지 않고, 클릭 = 그 질문으로 바로 리딩 시작(startReading). */}
        <div className="w-full max-w-xl mx-auto px-3 mb-2">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SEED_QUESTIONS.map((seed) => (
              <button
                key={seed.en}
                type="button"
                disabled={isChecking}
                onClick={() => void startReading(isKo ? seed.ko : seed.en)}
                className="shrink-0 whitespace-nowrap text-xs px-3.5 py-2 rounded-full text-[#e8cc8a] bg-[rgba(212,181,114,0.1)] border border-[rgba(212,181,114,0.28)] hover:bg-[rgba(212,181,114,0.2)] active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isKo ? seed.ko : seed.en}
              </button>
            ))}
          </div>
        </div>

        {/* 공용 ChatInputArea — 메인/운명/궁합과 동일한 컴포넌트. 덱·스프레드
            칩은 topSlot 으로 입력박스 안쪽 상단에 끼움. ⋮ 도구 메뉴는 핸들러
            미지정 → 자동 숨김. */}
        <ChatInputArea
          input={question}
          loading={isChecking}
          cvName=""
          parsingPdf={false}
          usedFallback={false}
          labels={{
            placeholder: isKo ? '어떤 고민이 있으신가요?' : 'What is on your mind?',
            send: isKo ? '리딩 시작' : 'Start reading',
            uploadCv: '',
            parsingPdf: '',
          }}
          lang={isKo ? 'ko' : 'en'}
          onInputChange={setQuestion}
          onKeyDown={handleKeyDown}
          onSend={handleSend}
          theme="dark"
          topSlot={
            <div className="relative" ref={optionsRef}>
              <button
                type="button"
                onClick={() => setOptionsOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={optionsOpen}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/60 hover:bg-slate-700/70 border border-slate-700 rounded-full text-[11px] text-slate-300 transition-colors whitespace-nowrap"
              >
                <Layers className="w-3 h-3" style={{ color: deckInfo.accent }} />
                <span>{isKo ? '덱·스프레드 선택' : 'Deck & Spread'}</span>
                <ChevronDown
                  className={`w-3 h-3 opacity-50 transition-transform ${optionsOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {optionsOpen && (
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, scale: 0.96, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 6 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    style={{ transformOrigin: 'bottom left' }}
                    className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-xl shadow-black/50 z-30"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOptionsOpen(false)
                        setIsDeckModalOpen(true)
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left"
                    >
                      <Layers className="w-4 h-4 shrink-0" style={{ color: deckInfo.accent }} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm text-slate-100">
                          {isKo ? '덱 선택' : 'Deck'}
                        </span>
                        <span className="block text-xs text-slate-400 truncate">
                          {isKo ? deckInfo.nameKo : deckInfo.name}
                        </span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOptionsOpen(false)
                        setIsSpreadModalOpen(true)
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left"
                    >
                      <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm text-slate-100">
                          {isKo ? '스프레드 선택' : 'Spread'}
                        </span>
                        <span className="block text-xs text-slate-400 truncate">
                          {spreadTitle} ({selectedSpread.spread.cardCount})
                        </span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          }
        />
      </AppShell>

      {/* 덱 선택 모달 — AppShell 형제로 렌더(fixed inset-0 자체 포지셔닝) */}
      <AnimatePresence>
        {isDeckModalOpen && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[var(--z-modal)] bg-[#07091a] flex flex-col"
          >
            <div className="flex items-center justify-between gap-3 px-4 pl-16 pt-[max(env(safe-area-inset-top),1rem)] pb-4 border-b border-slate-800 bg-slate-900/50">
              <h2 className="text-lg font-semibold flex items-center gap-2 min-w-0">
                <Layers className="w-5 h-5 text-[#d4b572] shrink-0" />
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
            className="fixed inset-0 z-[var(--z-modal)] bg-[#07091a] flex flex-col"
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
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedSpread({
                                          spread: sp,
                                          categoryKo: theme.categoryKo ?? theme.category,
                                          categoryId: theme.id,
                                        })
                                        setIsSpreadModalOpen(false)
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
    </>
  )
}

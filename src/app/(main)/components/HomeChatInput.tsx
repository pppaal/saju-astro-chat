'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import styles from '../main-page.module.css'
import type { StoredBirthInfo } from '../birthInfoStorage'
import { buildCounselorHref } from '../birthInfoStorage'
import { ChatInputArea } from '@/components/destiny-map/chat-panels'

interface HomeChatInputProps {
  birthInfo: StoredBirthInfo | null
  // 생일 없이 질문을 입력하고 엔터한 경우 호출 — 부모가 생일 모달을 띄우고,
  // 저장되면 그 질문을 들고 운명상담사로 이동시킨다.
  onRequireBirth: (question: string) => void
  // 그냥 생일 모달만 열기 — 입력/수정용(자동 이동 없음). 초록 CTA 탭,
  // 또는 질문 없이 엔터쳤을 때.
  onOpenBirth: () => void
  locale: 'en' | 'ko'
  // 메인 배경(흰/어두운)에 맞춰 입력창 테마 — 어두운 코스믹 메인에선 dark 유지.
  lightMode?: boolean
}

// 메인 입력창 타이프라이터 — 운명/궁합 상담사와 동일한 공용 ChatInputArea 에
// placeholderPrompts 로 주입. (상담사들도 같은 컴포넌트라 입력창 모양 통일.)
const TYPEWRITER_PROMPTS_KO = [
  '무엇이든 물어보세요',
  '올해 이직 시기 어때?',
  '요즘 너무 답답해요',
  '결혼 시기는?',
  '이 사람과 잘 맞을까?',
  '돈은 언제 들어와?',
]
const TYPEWRITER_PROMPTS_EN = [
  'Ask anything',
  'When should I change jobs?',
  'I feel stuck lately',
  'When will I get married?',
  'Are we a good match?',
  'When will money come in?',
]

export default function HomeChatInput({
  birthInfo,
  onRequireBirth,
  onOpenBirth,
  locale,
  lightMode = false,
}: HomeChatInputProps) {
  const router = useRouter()
  const [text, setText] = useState('')
  // 운명상담사로 넘어가기 직전, 입력창에 "떠오르는" 모션을 살짝 주기 위한 상태.
  // 시각적 시작과 View Transition morph 가 겹치면서 morph 가 사용자에게 "툭
  // 늘어나는 순간"이 아니라 "입력창이 흐름을 타고 다음 페이지로 흘러간" 한
  // 동작으로 읽히게 한다.
  const [submitting, setSubmitting] = useState(false)
  const reduceMotion = useReducedMotion()
  const isKo = locale === 'ko'

  // 메인 페이지 = 운명상담사 한 흐름.
  // - 생일 있음 → 바로 운명 상담사로 (질문 전달 → 자동 답변)
  // - 생일 없고 질문 있음 → 생일 모달, 저장하면 그 질문 들고 운명상담사
  // - 생일 없고 질문 비었음 → 생일 모달만 (자동 이동 X)
  const goCounselor = () => {
    const trimmed = text.trim()
    if (!birthInfo) {
      if (trimmed) onRequireBirth(trimmed)
      else onOpenBirth()
      return
    }
    // 입력박스 폭이 두 페이지에서 동일해진 뒤부턴 View Transition + root
    // 크로스페이드만으로 충분히 부드럽다 — Framer 모션은 "눌렀다"는 시각
    // 피드백용으로 짧게 켜고, 라우터는 같은 프레임에 바로 넘긴다(딜레이 0).
    if (!reduceMotion) setSubmitting(true)
    router.push(buildCounselorHref(birthInfo, trimmed, locale))
  }

  // 엔터(Shift 제외)로 바로 운명 상담사에게 전송. Shift+Enter 는 줄바꿈.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      goCounselor()
    }
  }

  return (
    <motion.div
      className={styles.homeChatBar}
      animate={submitting ? { scale: 0.99 } : { scale: 1 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={styles.homeChatBarInner}>
        {/* 입력창이 곧 "운명 상담사"라는 걸 명시 — 라벨이 없으면 사용자가 이
            입력창이 어떤 서비스인지 모른다(타로/궁합/리포트는 아래 버튼으로
            보이지만 운명 상담사는 입력창 자체라 라벨 필요). 입력창은 하단 고정
            이라 라벨을 컴포넌트 안에 둬서 함께 붙어 따라다닌다. */}
        <p className={styles.homeCounselorLabel}>
          <span aria-hidden="true">🗺️</span> {isKo ? 'AI 운명 상담사' : 'AI Destiny Counselor'}
          <span className={styles.homeCounselorNow}>
            <span className={styles.homeCounselorNowDot} aria-hidden="true" />
            {isKo ? '현재 서비스' : 'Current'}
          </span>
        </p>
        {/* 운명/궁합 상담사와 동일한 공용 입력창. 메인은 첨부/타로/차트 도구가
            없어 ⋮ 메뉴는 자동으로 숨겨지고, 보내기=상담사로 네비게이트.
            생년월일은 입력창 밖 상단 바(MainPageClient)로 분리됨. */}
        <ChatInputArea
          input={text}
          loading={false}
          cvName=""
          parsingPdf={false}
          usedFallback={false}
          labels={{
            placeholder: isKo ? '무엇이든 물어보세요' : 'Ask anything',
            send: isKo ? '운명 상담사에게 질문하기' : 'Ask the destiny counselor',
            uploadCv: '',
            parsingPdf: '',
          }}
          lang={isKo ? 'ko' : 'en'}
          onInputChange={setText}
          onKeyDown={handleKeyDown}
          onSend={goCounselor}
          placeholderPrompts={isKo ? TYPEWRITER_PROMPTS_KO : TYPEWRITER_PROMPTS_EN}
          loopPlaceholder
          theme={lightMode ? 'light' : 'dark'}
          // viewTransitionName 제거 — morph 가 폭이 다른 두 입력창 사이에서
          // "툭 늘어나는" 인상을 줘서, root 크로스페이드만으로 잇기로 한다.
          // 두 페이지 입력창은 각자 자기 페이지의 일부로 자연스럽게 사라지고
          // 나타난다.
        />
      </div>
    </motion.div>
  )
}

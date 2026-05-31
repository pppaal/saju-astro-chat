'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  'When will I marry?',
  'Are we a good match?',
  'When will money flow?',
]

// 칩 표시용 — "1995년 2월 9일 6:40am (남)" 형식. 시(hour)는 앞 0 없이(4am),
// 분(minute)만 2자리 유지(4:05am).
function formatSubject(info: StoredBirthInfo, isKo: boolean): string {
  const [y, m, d] = info.birthDate.split('-').map((n) => parseInt(n, 10))
  const datePart = isKo
    ? `${y}년 ${m}월 ${d}일`
    : `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  let timePart = ''
  if (!info.birthTimeUnknown && info.birthTime && info.birthTime !== '00:00') {
    const [hh, mm] = info.birthTime.split(':').map((n) => parseInt(n, 10))
    const ampm = hh < 12 ? 'am' : 'pm'
    const h12 = hh % 12 === 0 ? 12 : hh % 12
    timePart = ` ${h12}:${String(mm).padStart(2, '0')}${ampm}`
  }
  const g = info.gender === 'male' ? (isKo ? '남' : 'M') : isKo ? '여' : 'F'
  return `${datePart}${timePart} (${g})`
}

export default function HomeChatInput({
  birthInfo,
  onRequireBirth,
  onOpenBirth,
  locale,
}: HomeChatInputProps) {
  const router = useRouter()
  const [text, setText] = useState('')
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
    <div className={styles.homeChatBar}>
      <div className={styles.homeChatBarInner}>
        {/* 초록 생일 CTA — 출발점이 생일임을 보여주고, 저장된 뒤엔 수정 버튼이 된다. */}
        {birthInfo ? (
          <button
            type="button"
            className={styles.homeBirthChip}
            onClick={onOpenBirth}
            aria-label={isKo ? '생년월일 정보 수정' : 'Edit birth info'}
          >
            {isKo ? '상담자: ' : 'Subject: '}
            {formatSubject(birthInfo, isKo)}
            <span className={styles.homeBirthChipEdit}>{isKo ? '정보 변경' : 'Edit'}</span>
          </button>
        ) : (
          <button type="button" className={styles.homeBirthCta} onClick={onOpenBirth}>
            <span aria-hidden="true">📅</span>
            {isKo ? '먼저 생년월일을 입력하세요' : 'Start by entering your birth date'}
          </button>
        )}

        {/* 운명/궁합 상담사와 동일한 공용 입력창. 메인은 첨부/타로/차트 도구가
            없어 ⋮ 메뉴는 자동으로 숨겨지고, 보내기=상담사로 네비게이트. */}
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
          theme="light"
        />
      </div>
    </div>
  )
}

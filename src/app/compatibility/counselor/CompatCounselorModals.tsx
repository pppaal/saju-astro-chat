'use client'

// 궁합 상담사 모달 묶음 — 타로 / 클래리파이어 / 인물 피커 / 궁합 차트 /
// ⋮ 메뉴(Rename·Delete). page.tsx 분해로 추출 — 마크업/문구는 원본 그대로.

import dynamic from 'next/dynamic'
// InlineTarotModal 은 dynamic 이 아니라 직접 import — 이전엔 dynamic ssr:false
// 였는데 첫 클릭 시 chunk download 로 모달이 "지지직" 거리며 늦게 떴음.
// 직접 import 로 즉시 열리게. (~50KB 초기 번들 증가는 수용 — UX 우선.)
import InlineTarotModal, {
  type TarotResultSummary,
} from '@/components/destiny-map/InlineTarotModal'
import ChatActionModals from '@/components/counselor/ChatActionModals'
import type { useChatActions } from '@/lib/counselor/useChatActions'
import type { useClarifierCard } from '@/hooks/useClarifierCard'
import { CompatChartModal } from './CompatChartModal'
import { CompatPersonPickerModal, type PickedPersonData } from './CompatPersonPickerModal'
import type { PersonData } from './types'

const ClarifierCardModal = dynamic(() => import('@/components/tarot/ClarifierCardModal'), {
  ssr: false,
})

interface CompatCounselorModalsProps {
  isKo: boolean
  locale: 'ko' | 'en'
  persons: PersonData[]
  // 🃏 타로
  showTarotModal: boolean
  onCloseTarot: () => void
  onTarotComplete: (result: TarotResultSummary) => void
  // 🃏 클래리파이어
  clarifierModalProps: ReturnType<typeof useClarifierCard>['modalProps']
  // 인물 피커
  showPicker: boolean
  onPickerSubmit: (picked: PickedPersonData[]) => void
  // 궁합 차트
  showChartModal: boolean
  onCloseChart: () => void
  person1Saju: Record<string, unknown> | null
  person2Saju: Record<string, unknown> | null
  person1Astro: Record<string, unknown> | null
  person2Astro: Record<string, unknown> | null
  // ⋮ 메뉴 Rename / Delete
  chatTitle: string | null
  chatActions: ReturnType<typeof useChatActions>
}

export function CompatCounselorModals({
  isKo,
  locale,
  persons,
  showTarotModal,
  onCloseTarot,
  onTarotComplete,
  clarifierModalProps,
  showPicker,
  onPickerSubmit,
  showChartModal,
  onCloseChart,
  person1Saju,
  person2Saju,
  person1Astro,
  person2Astro,
  chatTitle,
  chatActions,
}: CompatCounselorModalsProps) {
  return (
    <>
      <InlineTarotModal
        isOpen={showTarotModal}
        onClose={onCloseTarot}
        onComplete={onTarotComplete}
        lang={isKo ? 'ko' : 'en'}
        profile={{
          name: persons[0]?.name,
          birthDate: persons[0]?.date,
          birthTime: persons[0]?.time,
          city: persons[0]?.city,
          // 궁합 모달이라 단일 profile 만 받는 InlineTarotModal 시그니처 한계
          // — 두 번째 사람 컨텍스트는 결과 카드가 채팅으로 들어간 후
          // 본 채팅의 LLM 호출이 자동으로 커플 컨텍스트로 follow-up.
        }}
        initialConcern={
          isKo
            ? `${persons[0]?.name || '나'}와 ${persons[1]?.name || '상대'}, 우리 관계는 어떻게 흘러갈까?`
            : `${persons[0]?.name || 'Me'} and ${persons[1]?.name || 'partner'} — where is our relationship heading?`
        }
        origin="compat"
      />

      <ClarifierCardModal {...clarifierModalProps} />

      {showPicker && (
        <CompatPersonPickerModal
          onSubmit={onPickerSubmit}
          subtitle={
            isKo ? '두 사람의 정보로 채팅을 시작해요.' : 'Enter two profiles to start chatting.'
          }
        />
      )}

      <CompatChartModal
        open={showChartModal}
        onClose={onCloseChart}
        person1Saju={person1Saju}
        person2Saju={person2Saju}
        person1Astro={person1Astro}
        person2Astro={person2Astro}
        // 시각 미상 — 서버 라우트(isTimeUnknown)와 동일 규칙(누락/00:00). 차트가
        // 상담사처럼 날조된 子시 시주 cross 를 만들지 않게 facts 경로에 전달.
        timeUnknownA={!persons[0]?.time || persons[0]?.time === '00:00'}
        timeUnknownB={!persons[1]?.time || persons[1]?.time === '00:00'}
        nameA={persons[0]?.name || ''}
        nameB={persons[1]?.name || ''}
        lang={isKo ? 'ko' : 'en'}
      />

      {/* ⋮ 메뉴 Rename / Delete 모달 — 공용 ChatActionModals. window.prompt/
          window.confirm 에서 인앱 PromptModal 로 마이그레이션(인앱 웹뷰 호환). */}
      <ChatActionModals
        lang={locale}
        currentTitle={chatTitle}
        renameOpen={chatActions.renameModalOpen}
        onCloseRename={chatActions.closeRenameModal}
        onConfirmRename={chatActions.handleRenameConfirm}
        deleteOpen={chatActions.deleteModalOpen}
        onCloseDelete={chatActions.closeDeleteModal}
        onConfirmDelete={chatActions.handleDeleteConfirm}
      />
    </>
  )
}

'use client'

import PromptModal from '@/components/ui/PromptModal'

/**
 * 운명 / 궁합 상담사 헤더 ⋮ 메뉴의 Rename / Delete 모달 두 개를 한 컴포넌트로
 * 묶음. 이전엔 페이지마다 동일 JSX 두 블록을 복붙해 두던 회귀를 제거.
 *
 * `useChatActions` hook 이 반환하는 state/handlers 를 그대로 받아 렌더만 한다.
 * compat 페이지가 이전까지 쓰던 `window.prompt`/`window.confirm` 도 이 모달로
 * 자동 마이그레이션 — 인앱 웹뷰(카카오톡 브라우저 등)에서 native dialog 가
 * 막혀 이름 변경/삭제가 안 되던 회귀 해소.
 */

type ChatActionModalsProps = {
  /** 'ko' | 'en' — 모달 라벨/문구 분기 */
  lang: 'ko' | 'en'
  /** 현재 활성 세션 제목 — Rename 모달 초기값 */
  currentTitle?: string | null

  // Rename 모달
  renameOpen: boolean
  onCloseRename: () => void
  onConfirmRename: (title: string) => void

  // Delete 모달
  deleteOpen: boolean
  onCloseDelete: () => void
  onConfirmDelete: () => void
}

export default function ChatActionModals({
  lang,
  currentTitle,
  renameOpen,
  onCloseRename,
  onConfirmRename,
  deleteOpen,
  onCloseDelete,
  onConfirmDelete,
}: ChatActionModalsProps) {
  const isKo = lang === 'ko'

  return (
    <>
      {/* 대화 이름 변경 — 네이티브 window.prompt 대체(인앱 모달, 텍스트 입력). */}
      <PromptModal
        mode="prompt"
        open={renameOpen}
        title={isKo ? '대화 이름 변경' : 'Rename chat'}
        inputLabel={isKo ? '대화 이름' : 'Chat name'}
        initialValue={currentTitle ?? ''}
        confirmLabel={isKo ? '저장' : 'Save'}
        cancelLabel={isKo ? '취소' : 'Cancel'}
        onClose={onCloseRename}
        onConfirm={onConfirmRename}
      />

      {/* 대화 삭제 — 네이티브 window.confirm 대체(인앱 모달, 확인). */}
      <PromptModal
        mode="confirm"
        open={deleteOpen}
        title={isKo ? '대화 삭제' : 'Delete chat'}
        message={
          isKo
            ? '이 대화를 삭제할까요? 되돌릴 수 없어요.'
            : 'Delete this chat? Cannot be undone.'
        }
        confirmLabel={isKo ? '삭제' : 'Delete'}
        cancelLabel={isKo ? '취소' : 'Cancel'}
        danger
        onClose={onCloseDelete}
        onConfirm={onConfirmDelete}
      />
    </>
  )
}

// tests/components/share/ShareImageModal.test.tsx
//
// 이미지 공유 미리보기 모달 — 미리보기 이미지, [이미지 공유]는 Web Share 지원 시에만,
// [링크로 공유]는 link 를 줄 때만, 막 클릭·Esc·X 로 닫힘.

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ShareImageModal } from '@/components/share/ShareImageModal'

function setup(over: Partial<React.ComponentProps<typeof ShareImageModal>> = {}) {
  const props = {
    isKo: true,
    previewUrl: 'blob:preview-1',
    onClose: vi.fn(),
    onNativeShare: vi.fn(),
    onDownload: vi.fn(),
    canNativeShare: true,
    ...over,
  }
  render(<ShareImageModal {...props} />)
  return props
}

describe('ShareImageModal', () => {
  it('미리보기 이미지와 공유·저장 버튼', () => {
    const p = setup()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByAltText('공유 카드 미리보기')).toHaveAttribute('src', 'blob:preview-1')
    fireEvent.click(screen.getByRole('button', { name: '이미지 공유' }))
    fireEvent.click(screen.getByRole('button', { name: '이미지 저장' }))
    expect(p.onNativeShare).toHaveBeenCalledTimes(1)
    expect(p.onDownload).toHaveBeenCalledTimes(1)
  })

  it('Web Share 미지원이면 [이미지 공유] 를 숨긴다', () => {
    setup({ canNativeShare: false, isKo: false })
    expect(screen.queryByRole('button', { name: 'Share image' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Save image' })).toBeInTheDocument()
  })

  it('link 가 있으면 [링크로 공유] + 상태 라벨 + 에러', () => {
    const onShare = vi.fn()
    setup({ link: { phase: 'copied', error: '링크: https://x/r/1', onShare } })
    fireEvent.click(screen.getByRole('button', { name: '링크 복사됨!' }))
    expect(onShare).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status')).toHaveTextContent('링크: https://x/r/1')
  })

  it('link 가 없으면 링크 버튼이 없다', () => {
    setup()
    expect(screen.queryByRole('button', { name: '링크로 공유' })).toBeNull()
  })

  it('X · 막 클릭 · Esc 로 닫히고, 패널 안 클릭은 닫지 않는다', () => {
    const p = setup()
    fireEvent.click(screen.getByAltText('공유 카드 미리보기'))
    expect(p.onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    fireEvent.click(screen.getByRole('dialog'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(p.onClose).toHaveBeenCalledTimes(3)
  })
})

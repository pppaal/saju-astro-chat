'use client'

import React from 'react'

/**
 * 탭별 에러 바운더리. 한 탭(섹션)이 렌더 중 throw 해도 상세지표 페이지
 * 전체가 admin error.tsx 로 날아가지 않게, 그 탭 자리에만 에러를 표시한다.
 * resetKey(=activeTab)가 바뀌면 에러 상태를 초기화해 다른 탭은 정상 렌더.
 */
export class TabErrorBoundary extends React.Component<
  {
    resetKey: string
    styles: Record<string, string>
    children: React.ReactNode
  },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    // 탭을 바꾸면 이전 탭의 에러를 비워 새 탭이 정상 렌더되게 한다.
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    const { error } = this.state
    const { styles, children } = this.props
    if (error) {
      return (
        <div className={styles.errorState}>
          이 섹션을 표시하는 중 오류가 발생했습니다.
          <div className="mt-2 font-mono text-[12px] opacity-80">
            {error.message || '(메시지 없음)'}
          </div>
          <button className={styles.errorStateRetry} onClick={() => this.setState({ error: null })}>
            다시 시도
          </button>
        </div>
      )
    }
    return children
  }
}

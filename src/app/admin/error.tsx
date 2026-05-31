'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'

// 어드민 전용 에러 바운더리. 루트 error.tsx 의 "문제가 발생했어요" 로
// 뭉개지 말고, admin 페이지(특히 dashboard)에서 렌더 중 throw 된 실제
// 에러 메시지·스택을 화면에 그대로 노출한다. admin 은 인증된 내부 경로라
// 진단 정보 노출이 안전하고, 이게 있어야 무엇이 터지는지 알 수 있다.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error('[admin] page error', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h1 className="text-lg font-semibold text-rose-800">어드민 페이지 오류</h1>
        <p className="mt-2 text-sm text-rose-700">
          이 페이지를 렌더링하는 중 오류가 발생했어요. 아래 메시지를 개발자에게 전달하세요.
        </p>

        <div className="mt-4 rounded-lg border border-rose-200 bg-white p-3">
          <div className="text-[12px] font-medium uppercase tracking-wide text-rose-400">
            에러 메시지
          </div>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[13px] text-stone-800">
            {error.message || '(메시지 없음)'}
          </pre>
        </div>

        {error.digest && (
          <div className="mt-3 text-[12px] text-rose-500">
            digest: <span className="font-mono">{error.digest}</span>
          </div>
        )}

        {error.stack && (
          <details className="mt-3">
            <summary className="cursor-pointer text-[13px] text-rose-600">스택 트레이스 보기</summary>
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-stone-200 bg-stone-50 p-3 font-mono text-[11px] text-stone-600">
              {error.stack}
            </pre>
          </details>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={reset}
            className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
          >
            다시 시도
          </button>
          <a
            href="/admin"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
          >
            개요로
          </a>
        </div>
      </div>
    </div>
  )
}

'use client'

/**
 * Deprecated — destiny-map 안의 counselor는 /destiny-counselor로 통합.
 * 기존 URL 보존을 위한 redirect.
 */

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function CounselorRedirectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const params = searchParams?.toString()
    router.replace(params ? `/destiny-counselor?${params}` : '/destiny-counselor')
  }, [router, searchParams])

  return null
}

export default function CounselorPage() {
  return (
    <Suspense fallback={null}>
      <CounselorRedirectContent />
    </Suspense>
  )
}

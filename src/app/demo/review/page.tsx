import type { Metadata } from 'next'
import { requireDemoReviewTokenForPage } from '@/lib/demo/requireDemoToken'
import DemoReviewClient from './review-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Demo Review',
  robots: {
    index: false,
    follow: false,
  },
}

interface DemoReviewPageProps {
  searchParams?:
    | { demo_token?: string | string[]; token?: string | string[] }
    | Promise<{ demo_token?: string | string[]; token?: string | string[] }>
}

export default async function DemoReviewPage({ searchParams }: DemoReviewPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams)
  const token = requireDemoReviewTokenForPage(resolvedSearchParams)

  return <DemoReviewClient token={token} />
}

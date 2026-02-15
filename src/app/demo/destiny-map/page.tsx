import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchDemoJson } from '@/lib/demo/pageFetch'
import { requireDemoTokenOr404 } from '@/lib/demo/requireDemoToken'
import type { DemoDestinyMapPayload } from '@/lib/demo/demoPipelines'

export const dynamic = 'force-dynamic'

interface DemoPageProps {
  searchParams?: { token?: string | string[] } | Promise<{ token?: string | string[] }>
}

export default async function DemoDestinyMapPage({ searchParams }: DemoPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams)
  const rawToken = resolvedSearchParams?.token
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken
  requireDemoTokenOr404(token)

  let data: DemoDestinyMapPayload
  try {
    data = await fetchDemoJson<DemoDestinyMapPayload>(
      `/api/demo/destiny-map?token=${encodeURIComponent(token || '')}`,
      token
    )
  } catch {
    notFound()
  }

  return (
    <main style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
      <h1>Destiny Map Demo Review</h1>
      <p>
        Input: {data.input.user_name}, {data.input.birth.date} {data.input.birth.time} (
        {data.input.birth.city})
      </p>

      <section>
        <h2>Main Text</h2>
        <p>{data.main_text}</p>
      </section>

      <section>
        <h2>Top Themes</h2>
        {data.top_themes.map((item) => (
          <p key={item}>- {item}</p>
        ))}
      </section>

      <section>
        <h2>Cross Insights</h2>
        {data.cross_insights.map((item, idx) => (
          <p key={`${idx}-${item}`}>- {item}</p>
        ))}
      </section>

      <section>
        <h2>Evidence</h2>
        {data.evidence.map((item) => (
          <p key={item.id}>
            {item.id} | {item.title} | {item.reason}
          </p>
        ))}
      </section>

      <section>
        <h2>Action Plan</h2>
        {data.action_plan.map((item) => (
          <p key={item}>- {item}</p>
        ))}
      </section>

      <div style={{ marginTop: 20 }}>
        <Link href={`/demo/combined.pdf?token=${encodeURIComponent(token || '')}`}>Download PDF</Link>
      </div>
    </main>
  )
}

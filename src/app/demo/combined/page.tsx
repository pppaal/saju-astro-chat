import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchDemoJson } from '@/lib/demo/pageFetch'
import { requireDemoTokenOr404 } from '@/lib/demo/requireDemoToken'
import type { DemoCombinedPayload } from '@/lib/demo/demoPipelines'

export const dynamic = 'force-dynamic'

interface DemoPageProps {
  searchParams?: { token?: string | string[] } | Promise<{ token?: string | string[] }>
}

export default async function DemoCombinedPage({ searchParams }: DemoPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams)
  const rawToken = resolvedSearchParams?.token
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken
  requireDemoTokenOr404(token)

  let data: DemoCombinedPayload
  try {
    data = await fetchDemoJson<DemoCombinedPayload>(
      `/api/demo/combined?token=${encodeURIComponent(token || '')}`,
      token
    )
  } catch {
    notFound()
  }

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1>Combined Demo Review</h1>
      <p>Reviewer mode for external quality check. User: {data.user_name}</p>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <article style={{ border: '1px solid #ddd', padding: 12 }}>
          <h2>ICP Snapshot</h2>
          <p>{data.icp.narrative.main_text}</p>
          <p>
            Style: {data.icp.scores.primary_style}
            {data.icp.scores.secondary_style ? ` / ${data.icp.scores.secondary_style}` : ''}
          </p>
        </article>
        <article style={{ border: '1px solid #ddd', padding: 12 }}>
          <h2>Personality Snapshot</h2>
          <p>{data.personality.narrative.main_text}</p>
          <p>
            Type: {data.personality.traits.persona_name} ({data.personality.traits.type_code})
          </p>
        </article>
      </section>

      <section>
        <h2>Combined</h2>
        <p>
          Hybrid: {data.hybrid.name} ({data.hybrid.id})
        </p>
        <p>{data.hybrid.description}</p>
        <h3>Top 5 Insights</h3>
        {data.combined_summary.map((item, idx) => (
          <article
            key={`${idx}-${item.insight}`}
            style={{ padding: 10, borderBottom: '1px solid #eee' }}
          >
            <p>{item.insight}</p>
            <p>References: {item.based_on.join(', ')}</p>
          </article>
        ))}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <article>
          <h3>Strengths</h3>
          {data.strengths.map((item) => (
            <p key={item}>- {item}</p>
          ))}
          <h3>Risks</h3>
          {data.risks.map((item) => (
            <p key={item}>- {item}</p>
          ))}
        </article>
        <article>
          <h3>Best-fit Roles</h3>
          {data.best_fit.roles.map((item) => (
            <p key={item}>- {item}</p>
          ))}
          <h3>Best-fit Markets</h3>
          {data.best_fit.markets.map((item) => (
            <p key={item}>- {item}</p>
          ))}
        </article>
      </section>

      <section>
        <h3>Recommended ICP Segments + Messaging</h3>
        {data.recommended_icp_segments.map((segment) => (
          <article
            key={segment.segment}
            style={{ padding: 10, border: '1px solid #ddd', marginBottom: 8 }}
          >
            <p>
              <strong>{segment.segment}</strong>
            </p>
            <p>Why: {segment.reason}</p>
            <p>Messaging style: {segment.messaging_style}</p>
          </article>
        ))}
      </section>

      <section>
        <h3>Action Plan</h3>
        <p>7-day</p>
        {data.action_plan.seven_day.map((item) => (
          <p key={item}>- {item}</p>
        ))}
        <p>30-day</p>
        {data.action_plan.thirty_day.map((item) => (
          <p key={item}>- {item}</p>
        ))}
      </section>

      <div style={{ marginTop: 24 }}>
        <Link href={`/demo/combined.pdf?token=${encodeURIComponent(token || '')}`}>Download PDF</Link>
      </div>
    </main>
  )
}

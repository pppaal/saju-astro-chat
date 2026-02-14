import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchDemoJson } from '@/lib/demo/pageFetch'
import { requireDemoTokenForPage } from '@/lib/demo/requireDemoToken'
import type { DemoIcpPayload } from '@/lib/demo/demoPipelines'

export const dynamic = 'force-dynamic'

interface DemoPageProps {
  searchParams?: Promise<{ token?: string | string[] }>
}

export default async function DemoIcpPage({ searchParams }: DemoPageProps) {
  const resolvedSearchParams = await searchParams
  const token = requireDemoTokenForPage(resolvedSearchParams)

  let data: DemoIcpPayload
  try {
    data = await fetchDemoJson<DemoIcpPayload>(`/api/demo/icp?token=${encodeURIComponent(token)}`)
  } catch {
    notFound()
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1>ICP Demo Review</h1>
      <p>Reviewer mode for external quality check. User: {data.user_name}</p>

      <section>
        <h2>Question Quality</h2>
        {Object.entries(data.questionsByDimension).map(([dimension, items]) => (
          <div key={dimension} style={{ marginBottom: 20 }}>
            <h3>{dimension}</h3>
            {items.map((q) => (
              <article
                key={q.id}
                style={{ padding: 10, border: '1px solid #ddd', marginBottom: 8 }}
              >
                <strong>{q.id}</strong>
                <p>{q.text}</p>
                <p>Choices: {q.choices.map((c) => `${c.id}: ${c.text}`).join(' | ')}</p>
              </article>
            ))}
          </div>
        ))}
      </section>

      <section>
        <h2>Result</h2>
        <p>{data.narrative.main_text}</p>
        {data.narrative.bullet_takeaways.map((item) => (
          <p key={item}>- {item}</p>
        ))}
        <p>
          Style: {data.scores.primary_style}
          {data.scores.secondary_style ? ` / ${data.scores.secondary_style}` : ''}
        </p>
        <p>
          D:{data.scores.dominance} A:{data.scores.affiliation} B:{data.scores.boundary} R:
          {data.scores.resilience} Confidence:{data.scores.confidence}
        </p>
        {data.explainability && (
          <>
            <h3>Explainability</h3>
            {data.explainability.topAxes.map((axis) => (
              <p key={axis.axis}>
                {axis.axis} {axis.score}% - {axis.interpretation}
              </p>
            ))}
          </>
        )}
      </section>

      <div style={{ marginTop: 24 }}>
        <Link href={`/demo/combined.pdf?token=${encodeURIComponent(token)}`}>Download PDF</Link>
      </div>
    </main>
  )
}

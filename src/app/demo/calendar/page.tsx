import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchDemoJson } from '@/lib/demo/pageFetch'
import { requireDemoTokenOr404 } from '@/lib/demo/requireDemoToken'
import type { DemoCalendarPayload } from '@/lib/demo/demoPipelines'

export const dynamic = 'force-dynamic'

interface DemoPageProps {
  searchParams?: { token?: string | string[] } | Promise<{ token?: string | string[] }>
}

export default async function DemoCalendarPage({ searchParams }: DemoPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams)
  const rawToken = resolvedSearchParams?.token
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken
  requireDemoTokenOr404(token)

  let data: DemoCalendarPayload
  try {
    data = await fetchDemoJson<DemoCalendarPayload>(
      `/api/demo/calendar?token=${encodeURIComponent(token || '')}`,
      token
    )
  } catch {
    notFound()
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1>Calendar Demo Review</h1>
      <p>
        Input: {data.input.user_name}, {data.input.birth.date} {data.input.birth.time} (
        {data.input.birth.city})
      </p>
      <p>Month: {data.month}</p>
      <p>{data.main_text}</p>

      <section>
        <h2>Highlights</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Date</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Label</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Score</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {data.highlights.map((item) => (
              <tr key={`${item.date}-${item.label}`}>
                <td style={{ padding: '6px 4px' }}>{item.date}</td>
                <td style={{ padding: '6px 4px' }}>{item.label}</td>
                <td style={{ padding: '6px 4px' }}>{item.score}</td>
                <td style={{ padding: '6px 4px' }}>
                  {item.reason} ({item.evidence.map((e) => `${e.id}:${e.title}`).join(' | ')})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>12-Month Timeline</h2>
        {data.timeline.map((item) => (
          <p key={item.month}>
            {item.month}: {item.keyword}
          </p>
        ))}
      </section>

      <div style={{ marginTop: 20 }}>
        <Link href={`/demo/combined.pdf?token=${encodeURIComponent(token || '')}`}>Download PDF</Link>
      </div>
    </main>
  )
}

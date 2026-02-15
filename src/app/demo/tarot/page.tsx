import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchDemoJson } from '@/lib/demo/pageFetch'
import { requireDemoTokenOr404 } from '@/lib/demo/requireDemoToken'
import type { DemoTarotPayload } from '@/lib/demo/demoPipelines'

export const dynamic = 'force-dynamic'

interface DemoPageProps {
  searchParams?: { token?: string | string[] } | Promise<{ token?: string | string[] }>
}

export default async function DemoTarotPage({ searchParams }: DemoPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams)
  const rawToken = resolvedSearchParams?.token
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken
  requireDemoTokenOr404(token)

  let data: DemoTarotPayload
  try {
    data = await fetchDemoJson<DemoTarotPayload>(
      `/api/demo/tarot?token=${encodeURIComponent(token || '')}`,
      token
    )
  } catch {
    notFound()
  }

  return (
    <main style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
      <h1>Tarot Demo Review</h1>
      <p>
        Input: {data.input.user_name}, {data.input.birth.date} {data.input.birth.time} (
        {data.input.birth.city})
      </p>
      <p>Question: {data.input.question}</p>

      <section>
        <h2>Main Text</h2>
        <p>{data.main_text}</p>
      </section>

      <section>
        <h2>Takeaways</h2>
        {data.bullet_takeaways.map((item) => (
          <p key={item}>- {item}</p>
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
        <h2>Cards</h2>
        {data.cards.map((card) => (
          <p key={card.id}>
            #{card.id} {card.name} {card.isReversed ? '(reversed)' : '(upright)'} -{' '}
            {card.keywords.join(', ')}
          </p>
        ))}
      </section>

      <div style={{ marginTop: 20 }}>
        <Link href={`/demo/combined.pdf?token=${encodeURIComponent(token || '')}`}>Download PDF</Link>
      </div>
    </main>
  )
}
